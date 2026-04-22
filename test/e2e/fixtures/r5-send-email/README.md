# r5-send-email fixture

R5 IRREVERSIBLE_EXTERNAL email-send tool used by handle-binding + R5 approval
scenarios:

| Scenario | Pulse | Purpose |
|----------|-------|---------|
| SC-01    | 51    | R5 approved end-to-end |
| SC-02    | 51    | R5 explicit deny |
| SC-03    | 51    | R5 TTL timeout (trivial fail-closed) |
| SC-16    | 57    | Handle binding — all fields correct accepted |
| SC-17    | 57    | Handle binding — providerId mismatch |
| SC-18..21| 58    | Content-hash, sequence, principal, keyId mismatches |
| SC-22..24| 59    | TTL, nonce, interaction matrix |

The fixture's declaredTier: R5 + `IRREVERSIBLE_EXTERNAL` capability forces the
review verb on every invocation. The handle-binding validator (pulse 49) is
exercised against the companion's signed approvalHandle.
