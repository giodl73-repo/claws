# Governance Decision Vocabulary

**What this guide is**: the 4-verb vocabulary that `GuardrailProvider` and `FileIngestProvider` return, the composition rule, and the safety invariants (redirectPath canonicalization, OC-7 envelope stickiness, risk tier × sensitivity). Read this before implementing either provider interface.

## The 4 verbs

Every provider decision lands in one of four verbs. Both `GuardrailProvider.preAuthorize` and `FileIngestProvider.beforeIngest` return an `AuthorizationDecision` whose `decision` field is one of these.

| Verb     | Meaning                                              | Example                                                                  | When to use                                                                                                              |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `allow`  | Proceed as-is.                                       | `{ decision: 'allow' }`                                                  | The call is safe under this policy. Optional `requiresExternalApproval: true` still escalates for belt-and-braces audit. |
| `deny`   | Reject with a reason. No further processing.         | `{ decision: 'deny', reason: 'R5 tool blocked in PUBLIC workspace' }`    | Hard policy violation. The tool never runs; the file never writes. Audited as a `DecisionEntry` with `decision: 'deny'`. |
| `review` | Route to supervisor with a signed `approvalHandle`.  | `{ decision: 'review', approvalHandle, requiresExternalApproval: true }` | Human judgement required. The call stalls until companion app responds with a signed verdict.                            |
| `modify` | Rewrite args (tool call) or `redirectPath` (ingest). | `{ decision: 'modify', modifiedArgs: { to: 'sanitized@...' } }`          | The call can proceed with safer inputs. Use sparingly — `modify` is powerful and audit-visible.                          |

`modify` differs between interfaces:

- **GuardrailProvider.modify** returns `modifiedArgs: unknown` — the arguments the tool receives are replaced.
- **FileIngestProvider.modify** may return `redirectPath: string` — the file is written to a different path (e.g., quarantined into `.openclaw/.stage/quarantine/{original}`).

## The composition rule

```
  deny > review > modify > allow
```

When multiple providers register against the same hook, their decisions merge. The strictest verb wins. `deny` from any provider blocks regardless of what others returned. `review` from any provider stalls regardless of allows. `modify` takes precedence over `allow`. Two `modify` decisions from different providers are a **conflict** — the host escalates to `review` with a conflict descriptor.

```ts
function merge(decisions: AuthorizationDecision[]): AuthorizationDecision {
  if (decisions.some((d) => d.decision === "deny")) return pickDeny(decisions);
  if (decisions.some((d) => d.decision === "review")) return mergeReview(decisions);
  const modifies = decisions.filter((d) => d.decision === "modify");
  if (modifies.length > 1) return escalateConflict(modifies);
  if (modifies.length === 1) return modifies[0];
  return { decision: "allow" };
}
```

This is the OC-7 merger shape — see the OC-7 section below for the `requireApproval` stickiness that layers on top.

## `modify.redirectPath` — FileIngest-only safety invariant

When a `FileIngestProvider` returns `modify` with `redirectPath`, the host enforces a strict canonicalization rule **before** writing:

```ts
const canonical = canonicalize(workspaceRoot, redirectPath);
if (!canonical.startsWith(join(workspaceRoot, ".openclaw", ".stage"))) {
  return reject({ invalidReason: "redirect-path-escape" });
}
```

Three specific escapes are rejected:

- Path traversal: `../outside/escape.txt` — canonicalizer resolves `..` segments.
- Absolute path: `/etc/passwd`, `C:\Windows\...` — absolute paths never satisfy the `.openclaw/.stage/` prefix check.
- Symlink traversal: `redirected-via-symlink.txt` where the final resolved target sits outside `.openclaw/.stage/`. The canonicalizer follows symlinks to their target before the prefix check.

The file is not written; an `ApprovalEntry` with `outcome: 'rejected'` and `invalidReason: 'redirect-path-escape'` is emitted. This closes the CL-07 §1a safety invariant: a malicious or buggy provider cannot use `modify` to write outside the stage sandbox. The rule is FileIngest-only because GuardrailProvider's `modifiedArgs` is a data rewrite with no filesystem side-effect.

## OC-7 envelope stickiness

OC-7 makes `requireApproval` non-downgradable for the decision lifetime — once any provider sets it, the flag sticks and its `ApprovalDescriptor`s accumulate conjunctively across the merge. A later `allow` cannot clear it. OC-7 latches the approval **flag**, not the sensitivity label.

See [governance--approval-flow.md § OC-7 envelope stickiness](./approval-flow.md) for the authoritative definition, the widened `requireApproval` type, the merger shape, and why latching the flag (not OC-9's sensitivity stickiness) is what Horus ships.

## Risk tier × sensitivity interaction

Two orthogonal axes. Both must be satisfied.

```
  Effective tier = max(declared tier, provenance-derived tier)

  RESTRICTED × any tier              → requiresExternalApproval = true (forced)
  R5 × any failOpen: true declaration → generator REJECTS at compile time
  IRREVERSIBLE_EXTERNAL capability   → clamps to R5 minimum
```

`IRREVERSIBLE_EXTERNAL` is a capability declared in `TOOLS.md` for tools that have side effects the world cannot undo (`send_email`, `execute_payment`, `delete_cloud_resource`). Any tool carrying it is pinned to R5 regardless of what the nominal tier field says.

Per the CL-07 amendment, effective tier enforcement runs on **two paths** because some provenance is knowable at compile time and some only at runtime:

**Generator (compile time)**. `claws policy generate` reads `args_from` chains in `TOOLS.md`, computes effective tier across the chain, and embeds the result into `policy-ir.json`. An R1 tool whose args flow from a RESTRICTED classifier compiles down to R5 in the generated plugin's decision table. This is G-CHAIN propagation — see [governance--approval-flow.md § G-CHAIN propagation](./approval-flow.md) for the authoritative walkthrough and the OC-9 distinction.

**Runtime (plugin)**. Provenance knowable only at runtime — e.g., the actual tool-chain output classifier resolved per-call — escalates at `preAuthorize` time. The emitted provider evaluates the observed provenance sources and re-computes `effectiveTier`. `DecisionEntry.effectiveTier` reflects the escalated value; `DecisionEntry.declaredTier` preserves the TOOLS.md-declared baseline for audit.

**R5 never fail-open**. The generator rejects any R5 tool declared with `failOpen: true` at compile time. The emitted plugin additionally refuses to emit `{ decision: 'allow', requiresExternalApproval: false }` for any call whose effectiveTier is R5 — even if TOOLS.md lies, the runtime backstop holds.

## Putting it together — a `deny` example

```ts
class NoPIIGuardrail implements GuardrailProvider {
  providerId = "no-pii";

  async preAuthorize(call: ToolCall, ctx: AuthorizationContext): Promise<AuthorizationDecision> {
    if (ctx.effectiveSensitivity === "RESTRICTED" && call.toolName === "post_to_public_blog") {
      return {
        decision: "deny",
        reason: "RESTRICTED data cannot flow to public-blog tool",
      };
    }
    return { decision: "allow" };
  }
}
```

And a `modify` with `redirectPath`:

```ts
class QuarantineIngress implements FileIngestProvider {
  providerId = "quarantine";

  async beforeIngest(
    event: FileIngestEvent,
    ctx: AuthorizationContext,
  ): Promise<AuthorizationDecision> {
    if (ctx.contentClassifier === "untrusted") {
      return {
        decision: "modify",
        redirectPath: ".openclaw/.stage/quarantine/" + basename(event.path),
      };
    }
    return { decision: "allow" };
  }
}
```

The host canonicalizes the `redirectPath`, confirms it sits inside `.openclaw/.stage/`, writes there, and emits a `DecisionEntry` with `decision: 'modify'` + `modifiedArgsHash` capturing the redirect for audit.

## Cross-references

- [governance--approval-flow.md](./approval-flow.md) — the `review` path end-to-end: 8-field approvalHandle, OC-7 merger, companion signing
- [governance--file-ingest-review.md](./file-ingest-review.md) — FileIngestProvider full walk-through with stage lifecycle
- [host-presets--openclaw.md](../host-presets/openclaw.md), [host-presets--lobster.md](../host-presets/lobster.md), [host-presets--aether.md](../host-presets/aether.md) — how each preset composes providers under these rules
- `docs/specs/CL-07-deep-integration.md` — canonical peer-interface types, `modify.redirectPath` invariant, effective-tier 2-path split, G-CHAIN generator-compiled form
- Proposal `openclaw-upstream-spec.md` §1.5 (async review), §1.6 (risk × sensitivity), §5 (security properties), §6 (OC-7 envelope stickiness)
