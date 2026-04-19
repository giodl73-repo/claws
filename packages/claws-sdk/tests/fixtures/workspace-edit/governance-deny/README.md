# governance-deny fixture

Workspace whose compiled GovernanceIR contains a compiler-injected deny
intent against `delete_database`. Validation layer tests use this
fixture to exercise the governance deny rule + provenance tagging
(P-276, P-277).
