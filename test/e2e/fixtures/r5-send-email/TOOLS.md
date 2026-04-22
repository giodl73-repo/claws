# r5-send-email fixture — TOOLS

## tool: send-email

- declaredTier: R5
- capability: IRREVERSIBLE_EXTERNAL
- sensitivity: PUBLIC
- failOpen: false
- action: review (review-required)

R5 IRREVERSIBLE_EXTERNAL tool. Every invocation emits a pending-conjunctive
DecisionEntry and waits for a companion-signed approvalHandle before the host
admits the call. The handle-binding validator (pulse 49) checks all 7 bound
fields + HMAC signature pre-check; any failure flips the ApprovalEntry to
outcome=rejected with invalidReason set.

Used by SC-16 (positive), SC-17 (providerId mismatch), SC-18..SC-24 (other
binding negatives), and SC-01/SC-02/SC-03 (R5 approve/deny/timeout).
