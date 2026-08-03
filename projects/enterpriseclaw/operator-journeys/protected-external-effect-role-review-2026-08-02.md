# Protected External Effect Role Review - 2026-08-02

## Scope

Review of `protected-external-effect.md` through the Gateway/runtime,
power-user/operator, CISO/security, founder/community, and skeptical-maintainer
lenses.

## Findings Applied

### Gateway/runtime owner

- **Risk:** synchronous evidence, remote policy, or approval orchestration could
  add latency or destabilize the Gateway.
- **Correction:** protected dispatch consumes a bounded local/cached decision;
  durable evidence export remains outside the hot path.
- **Proof required:** measure decision and revalidation latency and prove
  exporter failure cannot crash or reverse an owner-settled result.

### Power user/operator

- **Risk:** contract vocabulary and generic “operation failed” text would force
  log archaeology.
- **Correction:** the primary experience states recipient, account, message,
  reason, and safe next action in human language. Technical IDs are hidden
  behind details.
- **Proof required:** an operator can distinguish not-sent from maybe-sent and
  cannot accidentally trigger a duplicate retry.

### CISO/security

- **Risk:** approval could be replayed after target/content/policy change, or
  evidence could leak secrets.
- **Correction:** approval binds the normalized intent and relevant
  generations; changed intent requires review; evidence contains references
  and digests only.
- **Proof required:** stale approval blocks before dispatch and every protected
  terminal denial produces a durable reason.

### Founder/community

- **Risk:** a simple local message send could require enterprise identity,
  remote policy, or an audit service.
- **Correction:** local owners remain complete. Managed policy and attestation
  are optional profiles; the same human states work locally.
- **Proof required:** removing managed services leaves ordinary local sending
  intact without bypassing explicitly enabled local protection.

### Skeptical maintainer

- **Risk:** policy could approve one target while dispatch resolves another;
  cancellation could leave a stale prompt; handler failure could be
  misclassified as policy denial.
- **Correction:** resolve decision-relevant values once and reuse them for
  classification, display, dispatch, evidence, and saved decisions. Approval
  cancellation/expiry dismisses the prompt without a fake human verdict.
  Gate denial, dispatch failure, and unknown post-dispatch effect remain
  distinct.
- **Proof required:** target alias/reroute, content change, approval timeout,
  cancellation-before-dispatch, handler failure, and timeout-after-dispatch
  each have separate fixtures.

## Remaining Blocking Slice

The dependency-free fork simulation now carries:

```text
normalized intent
  -> approval decision
  -> credential/runtime binding
  -> delivery/effect operation
  -> provider receipt or unknown effect
  -> durable evidence reference
```

Five contract fixtures cover provider acceptance, changed intent, changed
credential generation, missing generation, and timeout-after-dispatch. The
fork test suite also proves attachment reorder invalidates approval. The next
slice should adapt one existing message-tool/channel test seam with the same
fake provider/effect owner rather than create a parallel effect runtime or send
a real external message.
