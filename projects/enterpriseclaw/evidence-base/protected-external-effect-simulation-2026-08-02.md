# Protected External Effect Fork Simulation - 2026-08-02

## Result

A dependency-free fork simulation now executes the first EnterpriseClaw golden
journey without using the OpenClaw runtime, network, provider credentials, a
real recipient, or an external side effect.

## Baseline

- Worktree: `C:\src\openclaw-protected-effect-sim`
- Branch: `user/giodl/ec-protected-effect-sim`
- Base revision: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`
- Artifact:
  `experiments/protected-effect-simulation/`
- Status: untracked fork-only experiment
- Runtime: Node.js built-ins only

The TypeScript OpenClaw message runtime remains authoritative.

## Simulated Contract Path

```text
message action/target/content
  -> canonical normalized-intent digest
  -> approval reference and outcome
  -> capability, credential, runtime, risk, and policy binding
  -> pre-dispatch intent/generation fence
  -> fake provider effect owner
  -> provider-accepted or timeout-after-dispatch settlement
  -> human projection
  -> redacted evidence record
```

The fake provider supports only:

- synthetic provider acceptance; and
- synthetic timeout after dispatch.

It contains no network or channel-plugin implementation.

## Executed Cases

| Case | Result |
| --- | --- |
| Provider accepts | Projects `sent`, records synthetic provider message ID, effect certainty `effected`, and no retry |
| Recipient/content changes after approval | Blocks before dispatch with `not_effected` |
| Credential generation changes after approval | Blocks before dispatch and preserves approved versus observed binding generations |
| Required generation is absent | Fails closed before dispatch with `binding_incomplete` |
| Attachment order changes | Invalidates the approved intent and blocks before dispatch |
| Timeout after dispatch | Projects `needs_attention`, effect certainty `unknown`, `retryAuthorized=false`, and `reconcile_before_replay` |

The built-in Node test suite reports six passing tests.

## Safety Proof

- The experiment imports only Node cryptography, filesystem, path, assertion,
  URL, and test modules.
- It does not import OpenClaw channel plugins, configuration, credentials,
  Gateway runtime, HTTP clients, sockets, or provider SDKs.
- Provider receipts are deterministic strings prefixed with
  `fake-provider:`.
- Evidence records references and generations and explicitly reports
  `containsSecretMaterial=false`.

## Contract Contribution

The simulation provides bounded fork evidence across:

- EC-003 credential/runtime binding;
- EC-004 approval decisions;
- EC-013 capability generation;
- EC-014 authority-to-effect correlation;
- EC-016 delivery/effect settlement;
- EC-023 replay posture;
- EC-033 redacted evidence; and
- the human EC-001 projection.

It demonstrates that the retained contracts can compose behind a human
`sent`, `not sent`, or `needs attention` experience.

## Limits

This is not evidence that:

- current `message` tool approval carries the complete envelope;
- a current channel adapter consumes the simulated binding;
- provider acceptance, timeout, or reconciliation has changed upstream;
- durable restart recovery exists for the simulated operation;
- EC-033 evidence is persisted or cryptographically verified; or
- any real external effect occurred.

## Closure

The protected-effect simulation is complete as a standalone contract proof.
Per operator direction, no OpenClaw message-tool or channel integration is
planned for this slice. Any live effect or upstream behavior change requires
separate explicit authorization.
