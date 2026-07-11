# MOS3 personal publish/feed API confirmation

Date: 2026-07-10

## Goal

Scout/Lobster wants the personal skill publish and personal feed experience to be
MOS3-owned end to end:

1. A signed-in Scout user publishes a personal skill.
2. Scout sends the package to MOS3 using the user's Scout/runtime auth context.
3. Scout reads the user's personal feed from MOS3.
4. The just-published skill appears in that MOS3 personal feed and can be
   discovered/searched/installed through integrated Scout.

We do **not** want a separate device-code auth flow for this proof. The desired
path is the integrated Scout web/runtime token provider.

## Current Lobster implementation shape

Lobster already has two MOS3 integrations in runtime code:

### Personal feed read

Used by `GET /v1/scout/feeds/personal.json` when
`LOBSTER_SCOUT_PERSONAL_FEED_MOS3_ENV` is configured.

Runtime flow:

- Acquire a MOS3-scoped delegated token through the existing runtime
  `TokenProvider`.
- Call MOS3 live acquisitions.
- Convert the MOS3 acquisition response into a Scout feed document.

Expected MOS3 API:

```text
POST {titlesBaseUrl}/catalog/v1/users/acquisitions/get
Authorization: Bearer <MOS3 scoped delegated user token>
Accept: application/json
Content-Type: application/json

{
  "Filter": {
    "supportedElementTypes": ["AgentSkills", "AgentConnectors"]
  },
  "SubstituteIds": [],
  "ClientCacheEnabled": false
}
```

Known base URLs/scopes in Lobster:

| Environment | Base URL | Scope |
| --- | --- | --- |
| MSIT | `https://titles.msit.mos.microsoft.com` | `https://titles.msit.mos.microsoft.com/.default` |
| Prod | `https://titles.prod.mos.microsoft.com` | `https://titles.prod.mos.microsoft.com/.default` |
| MSIT private | `https://titles.msitprv.mos.microsoft.com` | `https://titles.msitprv.mos.microsoft.com/.default` |

Lobster can optionally call:

```text
GET {titlesBaseUrl}/config/v1/environment
```

and use `titlesServiceUrl` from the response, if returned.

### Personal publish

Current Lobster code packages `SKILL.md` into a zip, then calls MOS3 package
publish:

```text
POST {titlesBaseUrl}/builder/v1/users/packages?scope=personal&shouldBlock=false&titleFormat=Preview
Authorization: Bearer <MOS3 scoped delegated user token>
Accept: application/json
Content-Type: multipart/form-data

file=<zip package>
```

Current response handling expects:

```json
{
  "TitleId": "title-id",
  "AppId": "app-id",
  "Version": "1.0.0",
  "UnifiedStoreLink": "https://..."
}
```

or camelCase equivalents:

```json
{
  "titleId": "title-id",
  "appId": "app-id",
  "version": "1.0.0",
  "unifiedStoreLink": "https://..."
}
```

For async publish, Lobster expects HTTP 202 with:

```json
{
  "statusId": "status-id"
}
```

and may read `Retry-After`.

For 400/403, Lobster expects an error envelope:

```json
{
  "error": {
    "code": "SomeCode",
    "message": "Human readable message"
  }
}
```

## Current gap

Lobster's current publish route is hybrid:

- It publishes the package to MOS3.
- Then it writes a local Lobster personal feed/artifact overlay.

That overlay requires:

- `LOBSTER_SCOUT_PERSONAL_FEED_DIR`
- `LOBSTER_SCOUT_PERSONAL_ARTIFACT_DIR`
- `LOBSTER_SCOUT_PERSONAL_ARTIFACT_BASE_URL`
- `LOBSTER_SCOUT_PERSONAL_STORAGE_DURABLE=true`

This is not the working-group target if MOS3 should own personal publish/feed.
We want to remove the file-overlay requirement for the MOS3 publish path and
rely on MOS3 acquisitions/personal feed as the source of truth after publish.

## Proposed MOS3-owned Scout behavior

For `POST /v1/scout/feeds/personal/publish`:

1. Validate the incoming skill metadata and package locally.
2. Acquire a MOS3 token through the runtime token provider using the signed-in
   Scout user's bearer token/OBO cache.
3. Call:

   ```text
   POST /builder/v1/users/packages?scope=personal&shouldBlock=false&titleFormat=Preview
   ```

4. If MOS3 returns `Published`, return the publish outcome and, if possible,
   reload the user's personal feed via:

   ```text
   POST /catalog/v1/users/acquisitions/get
   ```

5. If MOS3 returns `Pending`, return the pending status and avoid pretending the
   feed already contains the new package unless MOS3 guarantees immediate
   acquisition visibility.
6. Do not write Lobster file-backed feed/artifact state for the MOS3-owned path.

For `GET /v1/scout/feeds/personal.json`:

- Use `/catalog/v1/users/acquisitions/get` as the product source.
- Return the normalized MOS3 personal feed.

## Questions for MOS3

1. **Is `/builder/v1/users/packages?scope=personal` the right publish endpoint**
   for a Scout user publishing a personal skill?
2. **Is `scope=personal` the right value**, or should Scout send a different
   scope such as `PersonalSource`?
3. **What value should `titleFormat` use** for this scenario: `Preview`,
   `LaunchInfo`, or something else?
4. **Should Scout use `shouldBlock=false` or `shouldBlock=true`** for a live
   publish proof where we need to verify the package appears in the personal
   feed?
5. After a successful HTTP 201 publish, **should the package appear in
   `/catalog/v1/users/acquisitions/get` for the same user immediately**, or is
   there an expected propagation delay?
6. If publish returns HTTP 202 with `statusId`, **what polling endpoint should
   Scout use** to observe completion?
7. Does the acquisitions response include enough install metadata for a skill,
   especially a stable public skill URL/path? Lobster currently looks for:
   - `microsoftmatter.public_skill_path`
   - `microsoftMatter.publicSkillPath`
   - `public_skill_path`
   - `publicSkillPath`
8. Is `/config/v1/environment` the recommended way to discover the concrete
   Titles service URL before both publish and acquisitions calls?
9. Are the delegated scopes above correct for Scout web/runtime OBO:
   - `https://titles.msit.mos.microsoft.com/.default`
   - `https://titles.prod.mos.microsoft.com/.default`
10. Are there required headers beyond `Authorization`, `Accept`,
    `Content-Type`, and `client-request-id`?
11. Are there package constraints Scout should enforce before upload besides:
    - package is zip
    - contains `SKILL.md`
    - no unsafe symlink/top-level path tricks
    - bounded metadata/field lengths
12. For a personal skill that has already been published, should Scout update
    the same MOS3 title, create a new version, or create a new title?

## Validation already run in 301/302

Live 301/302 Scout validation showed:

- Integrated Scout browser auth works.
- Marketplace feed is MOS3-configured.
- `GET /v1/scout/feeds/marketplace.json` returns HTTP 200 with `feedId:
  mos3-root`.
- Marketplace search works in both 301 and 302.
- 302 marketplace install succeeded for `billing-info-lookup`.
- Personal feed/publish were not configured in 301/302 at that time.

We also opened Lobster PR #4344 to project
`LOBSTER_SCOUT_PERSONAL_FEED_MOS3_ENV` through deployment config so personal
feed read can use MOS3 via integrated Scout auth. The next implementation step
is making personal publish MOS3-owned instead of requiring Lobster file overlay
state.
