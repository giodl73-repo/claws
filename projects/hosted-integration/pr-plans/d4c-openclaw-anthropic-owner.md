# D4c: OpenClaw Direct Anthropic Owner Adoption

## Outcome

Keep attachment-body transformation and Anthropic response semantics with the
model owner while adding typed hosted selections.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: D2a

## Change

- Prepare the final request after bounded attachment rewriting.
- Declare the `x-api-key` slot and origins.
- Reuse policy and dispatcher interfaces.

## Proof And Exit

- Attachment and streaming fixtures agree locally and hosted.
- One-shot bodies are never silently replayed.
- Credential material remains outside adapter output.
