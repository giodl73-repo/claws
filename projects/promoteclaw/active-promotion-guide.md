# Promote an OpenClaw Candidate build to Active

Use this guide after exact-user Candidate flighting and soak have succeeded.
Promotion means deploying the **same immutable Official build and digest** to
the Active 301 and 302 release rings. It does not mean editing the image role
map.

## Promotion decision record

Before deployment, record:

- exact `Lobster-OpenClaw-Official` run ID and build number;
- source commit on `refs/heads/main`;
- verified ACR digest;
- Candidate 301 and 302 deployment receipts;
- exact-user flight list and soak results;
- Gateway, Teams, cron, workspace, recycle, and rollback-compatibility results;
- approver and rollback owner;
- the previously successful Active build number and digest.

Block promotion if any identity or digest differs.

## 1. Freeze and stop Candidate admission

1. Stop adding users.
2. Publish a newer flight generation with
   `lobster.openclaw_candidate_flight_enabled=false`.
3. Confirm new route resolution selects Active.
4. Remove exact-user eligibility after convergence:

   ```text
   lobster.openclaw_candidate_user_enabled = false
   ```

Keep the Candidate image deployed until Active promotion and rollback checks
finish.

## 2. Resolve the exact Active image

From the Lobster checkout:

```powershell
$buildId = '<successful Lobster-OpenClaw-Official run id>'
$build = '<YY.DDD.RR-openclaw-official>'
$digest = '<sha256:64-lowercase-hex>'
```

The helper verifies the run is successful, comes from `refs/heads/main`, has
the Active EV2 artifact, and still resolves to the supplied ACR digest.
Authenticate Azure CLI first with read access to `csbuildartifactsacr`.

All commands are plans until `--execute` is supplied.

## 3. Validate and deploy Active 301

```powershell
node scripts/promoteclaw/promote-image.mjs `
  --official-build-id $buildId `
  --official-build $build `
  --image-digest $digest `
  --island 301

node scripts/promoteclaw/promote-image.mjs `
  --official-build-id $buildId `
  --official-build $build `
  --image-digest $digest `
  --island 301 `
  --execute
```

After the validation-only run succeeds:

```powershell
$validation301 = '<successful 301 validation run id>'

node scripts/promoteclaw/promote-image.mjs `
  --official-build-id $buildId `
  --official-build $build `
  --image-digest $digest `
  --island 301 `
  --mode deploy `
  --validation-run $validation301

node scripts/promoteclaw/promote-image.mjs `
  --official-build-id $buildId `
  --official-build $build `
  --image-digest $digest `
  --island 301 `
  --mode deploy `
  --validation-run $validation301 `
  --execute
```

Record the printed run URLs. Verify Active 301 health before touching 302.

## 4. Validate and deploy Active 302

The 302 flow requires the successful 301 deployment receipt:

```powershell
$deploy301 = '<successful 301 deployment run id>'

node scripts/promoteclaw/promote-image.mjs `
  --official-build-id $buildId `
  --official-build $build `
  --image-digest $digest `
  --island 302 `
  --prior-island-run $deploy301

node scripts/promoteclaw/promote-image.mjs `
  --official-build-id $buildId `
  --official-build $build `
  --image-digest $digest `
  --island 302 `
  --prior-island-run $deploy301 `
  --execute
```

After 302 validation succeeds:

```powershell
$validation302 = '<successful 302 validation run id>'

node scripts/promoteclaw/promote-image.mjs `
  --official-build-id $buildId `
  --official-build $build `
  --image-digest $digest `
  --island 302 `
  --prior-island-run $deploy301 `
  --mode deploy `
  --validation-run $validation302

node scripts/promoteclaw/promote-image.mjs `
  --official-build-id $buildId `
  --official-build $build `
  --image-digest $digest `
  --island 302 `
  --prior-island-run $deploy301 `
  --mode deploy `
  --validation-run $validation302 `
  --execute
```

Verify Active 302 health and record the run URL.

## 5. Confirm Active convergence

1. Confirm new routes report the promoted OpenClaw version/build.
2. Verify Gateway, chat, streaming, Teams, tools, cron, and persistence.
3. Confirm no new Candidate assignments are occurring.
4. Allow existing claims to expire or drain them through the governed operator
   path before declaring complete fleet convergence.
5. Retain the previous Active build and digest for the rollback window.

## Roll back Active

Use the same guarded 301-then-302 procedure with the previously recorded
successful Official build number and digest:

1. validate previous build on 301;
2. deploy previous build on 301 and verify health;
3. validate previous build on 302 using the 301 deployment receipt;
4. deploy previous build on 302 and verify health.

Keep Candidate flighting disabled during rollback. Do not turn the failed build
into a rollback target by changing `openclaw_image_roles`.

## Completion record

Promotion is complete only when the record contains:

- four successful Active run URLs: 301 validate/deploy and 302 validate/deploy;
- exact build, source commit, and digest;
- application health and version evidence from both islands;
- Candidate flight disabled and exact-user entries removed;
- convergence status;
- rollback build/digest and owner.
