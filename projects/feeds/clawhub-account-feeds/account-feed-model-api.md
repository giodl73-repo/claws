# Account Feed Model And API

## Goal

Define the stable ClawHub account and publisher model that every later account
feed feature depends on.

## Product Behavior

- ClawHub exposes account-backed feeds for people, organizations, and publisher
  identities.
- Each feed has a stable account id and publisher id suitable for downstream
  clients to cache, display, and filter.
- Feed URLs are stable and do not encode mutable display names as authority.
- Feed bodies are signed by ClawHub-owned keys, not by remote clients.

## API Shape

Draft endpoints:

- `GET /v1/accounts/{accountId}`
- `GET /v1/accounts/{accountId}/feed`
- `GET /v1/publishers/{publisherId}`
- `GET /v1/publishers/{publisherId}/feed`

Draft feed metadata:

```json
{
  "schemaVersion": 1,
  "feedId": "clawhub.account.<stable-id>",
  "publisherId": "pub_<stable-id>",
  "accountId": "acct_<stable-id>",
  "displayName": "Example Publisher",
  "generatedAt": "2026-07-01T00:00:00.000Z",
  "sequence": 1,
  "entries": []
}
```

## Trust Boundaries

- Account feed authenticity comes from the signed ClawHub feed envelope.
- Account ownership and publisher identity are ClawHub product facts.
- The feed does not grant install eligibility by itself.
- Remote feed content cannot introduce new trust roots or source registries.

## Role Review Requirements

- Keep stable ids opaque and immutable so display-name changes do not break
  followers, registry exports, cached feed state, or audit history.
- Include pagination or continuation semantics before this becomes a public API;
  a popular publisher should not require clients to fetch an unbounded feed.
- Include envelope key id, feed revision, previous revision, and generated time
  in the signed material so clients and auditors can reason about replay and
  rollback.
- Define error responses for missing accounts, private accounts, suspended
  publishers, revoked publishers, and stale feed revisions.
- Keep the first publisher setup path simple enough for a skill author to
  complete in ClawHub without understanding OpenClaw review policy.

## Open Questions

- Are account ids and publisher ids already distinct in ClawHub?
- Should feeds be account-scoped, publisher-scoped, or both?
- Which feed endpoint should OpenClaw consume first?
- What is the public/private visibility model for account metadata?
