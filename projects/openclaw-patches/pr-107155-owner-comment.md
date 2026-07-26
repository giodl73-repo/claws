Current-main contract audit for the remaining P1:

Gateway already has the validated plugin manifest registry before secrets
activation and already passes it into the startup fast-path helper. The missing
surface is therefore narrower than a runtime SDK hook: installed plugin
manifests declare `contracts.webSearchProviders`, but they cannot statically
declare when a selected provider does **not** require an OpenClaw-held
credential.

WebIQ is conditional, so an unconditional `requiresCredential: false` bit would
be wrong: normal mode accepts an API key; Lobster's proxy mode uses
`webSearch.omitAuth: true` and the runtime proxy injects auth.

Could plugin/secrets owners choose between these two directions?

1. Approve conditional, manifest-owned web-search credential metadata. The
   semantics would be: exact relative config path + exact JSON-literal match;
   unique enabled/allowed provider owner; missing/malformed/ambiguous metadata
   falls back to the full resolver; existing whole-config/auth-store SecretRef
   and credential scans remain mandatory. This declaration would only mean
   “OpenClaw need not materialize this provider credential during startup”; it
   would not grant egress or assert upstream authentication.
2. Keep the conservative full resolver and decline the startup optimization.

This lets us delete core's direct interpretation of the opaque `omitAuth` key.
I have not implemented a new manifest field pending this decision. The branch
is also now 4,057 current-main commits behind, so after approval I would rebuild
the change on current `main` and rerun the focused tests plus the exact
Lobster-shaped Gateway startup proof rather than mechanically rebase first.
