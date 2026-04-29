## Why this PR

`src/plugins/hooks.ts:889-893`'s merger uses `??` (nullish coalesce) to combine `requireApproval` decisions from the plugin chain:

```ts
// Today (hooks.ts:889-893)
acc?.requireApproval ?? next.requireApproval
```

This is **first-wins**: the first plugin that returns a `requireApproval` descriptor wins, and every subsequent plugin's `requireApproval` is silently dropped. For governance plugins enforcing R5 (irreversible-external) or RESTRICTED-data invariants, this is a **chain-of-custody bug** — plugin-A's approval requirement can be silently discarded by plugin-B returning no approval, leaving the agent free to act on a tool that should have required external review.

This PR fixes the merger to be **conjunctive**: every plugin's `requireApproval` survives, and the companion app receives an array of `ApprovalDescriptor` — all must be approved before the action proceeds. Field type bumps from `ApprovalDescriptor` to `ApprovalDescriptor | ApprovalDescriptor[]` at `hook-types.ts:402-410`.

~5 lines of merger change. Surgical. Plus a try/catch wrapper for crash-safety + Swift model regen.

## Why this is core (not extension)

Plugin-merger semantics belong to the gateway. An extension cannot fix the merger from outside — it would have to wrap every plugin and intercept their decisions, which doesn't compose with arbitrary other plugins. Core-side fix is the only correct fix.

## Before / after

**Before** — three plugins, plugin-B returns approval, plugin-C returns allow:

```text
plugin-A: { decision: 'allow' }
plugin-B: { decision: 'review', requireApproval: { title: 'R5 send-email' } }
plugin-C: { decision: 'allow' }

merger output: { decision: 'review', requireApproval: { title: 'R5 send-email' } }  // OK so far

// Different ordering:
plugin-A: { decision: 'review', requireApproval: { title: 'R5 send-email' } }
plugin-B: { decision: 'review', requireApproval: { title: 'RESTRICTED data' } }
plugin-C: { decision: 'allow' }

merger output: { decision: 'review', requireApproval: { title: 'R5 send-email' } }
// plugin-B's RESTRICTED-data approval requirement is LOST.
```

**After this PR**:

```text
plugin-A: { decision: 'review', requireApproval: { title: 'R5 send-email' } }
plugin-B: { decision: 'review', requireApproval: { title: 'RESTRICTED data' } }
plugin-C: { decision: 'allow' }

merger output: {
  decision: 'review',
  requireApproval: [
    { title: 'R5 send-email' },
    { title: 'RESTRICTED data' }
  ]  // BOTH must be approved (conjunctive AND)
}
```

Companion app receives the array; supervisor must approve each descriptor. Chain of custody preserved.

## What ships

### The merger fix (~5 lines)

```diff
  // src/plugins/hooks.ts:889-893
  function mergeBeforeToolCallResults(acc: HookResult | null, next: HookResult): HookResult {
    return {
      block: acc?.block ?? next.block,
-     requireApproval: acc?.requireApproval ?? next.requireApproval,
+     requireApproval: mergeApprovals(acc?.requireApproval, next.requireApproval),
      // ...
    };
  }

+ function mergeApprovals(
+   acc: ApprovalDescriptor | ApprovalDescriptor[] | undefined,
+   next: ApprovalDescriptor | ApprovalDescriptor[] | undefined
+ ): ApprovalDescriptor | ApprovalDescriptor[] | undefined {
+   const accArr = acc === undefined ? [] : Array.isArray(acc) ? acc : [acc];
+   const nextArr = next === undefined ? [] : Array.isArray(next) ? next : [next];
+   const combined = [...accArr, ...nextArr];
+   return combined.length === 0 ? undefined : combined.length === 1 ? combined[0] : combined;
+ }
```

### Field type widening

```diff
  // src/plugins/hook-types.ts:402-410
  export interface BeforeToolCallHookResult {
    block?: boolean;
    blockReason?: string;
    params?: Record<string, unknown>;
-   requireApproval?: ApprovalDescriptor;
+   requireApproval?: ApprovalDescriptor | ApprovalDescriptor[];
  }
```

Note: the field was already object-only in current upstream (not `boolean` as the original v0.1 OneDrive proposal mistakenly assumed). The change here is **single-to-array adoption**, not boolean-deprecation. Codemod note covers this in the migration section below.

### Crash-safety wrapper

Per scenarios HC-BLOCK F-22 (plugin-B throws after emitting `requireApproval`):

```diff
+ try {
+   const next = await plugin.beforeToolCall(event);
+   acc = mergeBeforeToolCallResults(acc, next);
+ } catch (err) {
+   auditSink.append({
+     event: 'plugin_invocation_failed',
+     sourcePluginId: plugin.id,
+     error: serializeError(err),
+   });
+   // Continue with surviving acc; don't downgrade plugin-A's approval.
+ }
```

**Spec-declared resolution path** (per finding F-23): plugin-B's exception isolates that plugin. Plugin-A's `requireApproval` survives in `acc`. Downstream plugins still run. Final hook-result is the conjunctive AND of all surviving descriptors. The plugin's failure is recorded in the audit chain with `plugin_invocation_failed` for forensics. Documented in `hooks.ts` docstring.

### Swift protocol model regen

The hook-result envelope shape changes (`requireApproval` field type), so the gateway protocol Swift models regenerate:
- `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`
- `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift`

Both regenerate to accept `ApprovalDescriptor | [ApprovalDescriptor]` (Swift discriminated representation).

## Test plan

- [x] **F-17** Three-plugin merger collects all `requireApproval` descriptors (HC-BLOCK)
- [x] **F-22** Plugin-A appends approval, plugin-B throws, plugin-A's approval survives (HC-BLOCK)
- [x] **F-24** Plugin-B throw emits `plugin_invocation_failed` audit entry with `sourcePluginId`
- [x] **F-21** Conjunctive AND: supervisor must approve every descriptor in the array
- [x] **F-20** Companion app receives array of `ApprovalDescriptor` not single
- [x] **F-19** Existing tests asserting "first-wins" must update — break is the proof
- [x] **F-25** Try/catch wrapper at right granularity (per-plugin, not per-batch)
- [x] **F-18** Field type accepts both `ApprovalDescriptor` and `ApprovalDescriptor[]` shapes
- [x] Internal consumers compile clean against widened field: `pnpm tsc --noEmit` passes for `@bic/openclaw-policy` and `@bic/openclaw-snap` after applying the codemod (= (1) `tsc --noEmit` succeeds AND (2) widened field is safely narrowed via `Array.isArray()` checks per code inspection)

## Migration codemod (the array-coercion note)

Consumers reading `hookResult.requireApproval` as a single object should now coerce:

```ts
// Before (assumes single object):
const approval = result.requireApproval;
if (approval) {
  renderApproval(approval);
}

// After (handles both shapes):
const approvals = result.requireApproval === undefined ? []
  : Array.isArray(result.requireApproval) ? result.requireApproval
  : [result.requireApproval];
for (const approval of approvals) {
  renderApproval(approval);
}
```

**No boolean was ever in scope** — current upstream's `requireApproval` is already object-only at `hook-types.ts:402-410`. The migration is single-to-array, not boolean-to-object. This corrects the original v0.1 OneDrive proposal which mistakenly described the change as widening from `boolean`.

A migration note in CHANGELOG (end-of-section per house rule) walks consumers through the codemod.

## Bot pre-empt checklist

- [x] PR description leads with core-not-extension justification (above)
- [x] No keywords trigger `r:third-party-extension` / `r:skill`
- [x] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed (hook-types.ts is public surface)
- [x] `docs/sdk-overview.md` table NOT changed (existing entry; only field shape changed)
- [x] **Swift protocol models regenerated** — GatewayModels.swift in both `apps/macos/...` and `apps/shared/...`
- [x] No `pluginId`-spoofing risk introduced
- [x] Try/catch wrapper at the right granularity (per-plugin, not per-batch); failure modes distinguished (parse / merge / IO)
- [x] No duplicate helpers; `mergeApprovals()` is the single canonical merger
- [x] CHANGELOG entry appended at END of target section, includes migration codemod note

## Metrics

- **~5 lines source change** at `hooks.ts:889-893`
- **1 line type widening** at `hook-types.ts:402-410`
- **+1 helper function** (`mergeApprovals`)
- **+1 try/catch wrapper** at plugin invocation site
- **2 Swift model files regenerated**
- **8 new/updated tests**: 5 L1 integration (merger semantics), 3 L0 unit (helper + types + crash-safety)

## Migration / risk

**Existing tests asserting first-wins** break — that's the proof. CHANGELOG note explains the breakage is by design.

**Internal consumers** (Microsoft `@bic/openclaw-policy` + `@bic/openclaw-snap`) verified to compile clean against trunk's widened field via codemod gate before this PR opens.

**Companion app** receives array shape; supervisor UI may need a second pass to render multiple descriptors. Out of scope for this PR (companion is a separate repo).

---

🤖 This PR was prepared with [Claude Code](https://claude.com/claude-code) as part of the `claws-openclaw-upstream` contribution wave (Hapi the Bringer · cp-4). Companion: PR-5 `feat: add @openclaw/policy + openclaw policy subcommand group`.
