# Rust node-runtime feedback resolution

Live review state checked 2026-07-30. There are no human inline review threads
on the four draft PRs. The remaining feedback is from ClawSweeper/Codex.

| Surface | Feedback | Resolution | Status |
| --- | --- | --- | --- |
| RFC [#54](https://github.com/openclaw/rfcs/pull/54) | Link the maintainer acceptance discussion and distinguish ownership from release commitments. | The RFC now identifies #54 as the decision record and asks one technical question: whether two unpublished crates should incubate as an OpenClaw core surface with canonical Gateway/security authority and cross-language conformance. It explicitly leaves individual maintainership to normal project practice. Publication, an official binary, platform support, broader parity, and release policy remain separate gates. | Author work complete; architectural acceptance still required. |
| Foundation [#116050](https://github.com/openclaw/openclaw/pull/116050) | Do not accidentally establish a supported public crate/binary contract before ownership is accepted. | Both manifests already set `publish = false`. The PR body now says the foreground binary is repository-local proof, not a packaged/supported deliverable, and that merge incubates rather than stabilizes the API. | Author work complete; fresh ClawSweeper review requested. Maintainer acceptance still required. |
| Follow-up [#116450](https://github.com/openclaw/openclaw/pull/116450) | Prove trust/admission equivalence and review only the isolated follow-up after the foundation lands. | No code finding exists. Shared TypeScript/Rust fixtures and current tests provide pre-landing evidence. The definitive isolated diff and post-foundation equivalence check cannot exist until #116050 lands. | Correctly gated on #116050; no author repair available now. |
| Windows adopter [#1068](https://github.com/openclaw/openclaw-windows-node/pull/1068) | Make current-head live MXC proof inspectable and obtain ownership approval for the runtime seam. | The PR body now contains a redacted transcript for both live Gateway/MXC cases, including success, denied write, containment, test counts, and teardown. | Proof gap complete; fresh ClawSweeper review requested. Maintainer seam approval still required. |

## Maintainer decisions remaining

These cannot be manufactured by another code or documentation change:

1. On RFC #54, accept or reject the bounded unpublished monorepo foundation as
   an OpenClaw core technical surface.
2. If accepted, land #116050 before reviewing #116450 as an isolated diff.
3. Have the Windows-node owner accept #1068 as the preparatory seam; C# remains
   the production default.

Everything else identified in the live feedback is either resolved or an
explicit later adoption/release gate.
