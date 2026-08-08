# Cap-Integration v2 Scenario Findings -- Applied

**Scenarios**: 30 (S01-S30)
**Total findings**: 364 (10-13 per scenario)
**Finding depth**: 10-13 per scenario, meeting 5-15 target
**Severity breakdown**: 34 critical, 96 major, 146 warning, 88 note

## Pitfalls Extracted (P-283 through P-308)

Cross-cutting findings that apply beyond their individual scenario. Continues from v1 series (P-270 through P-282).

### Pitfall Identification Criteria

A finding qualifies as a pitfall if it:

- Affects multiple scenarios (same issue in 2+ scenarios)
- Affects the architectural model (not just one endpoint)
- Has security implications (R5, fleet, trust)
- Affects the oc:// path syntax design
- Affects the write path validation layer

### Pitfall Table

| Pitfall   | Source Scenarios                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Spec Impact                                                                                                                                                                                           | Pulse Impact                                                                                                                                       |
| --------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P-283** | S01-F01, S01-F02, S21-F11          | **oc:// path encoding is ambiguous for special characters.** Fragment delimiter (#) conflicts with section names containing #. Slashes in item names conflict with path depth. Percent-encoding rules are undefined. Without canonical encoding, roundtrip fidelity breaks: a path read from GET cannot be used directly in PATCH.                                                                                                                                                  | CL-03: define canonical oc:// encoding (first # is fragment, slashes in names percent-encoded, canonical casing in echo); CL-10: PATCH must accept the same path format returned by GET               | Pulse implementing oc:// parser must handle encoding edge cases from day one; add fuzz test corpus for special chars                               |
| **P-284** | S01-F05, S05-F03, S24-F04, S29-F01 | **Stale compilation data served as authoritative after file changes.** When a file is modified (externally or via API) but not yet recompiled, the IR is stale. Multiple scenarios expose the same gap: deleted files return phantom 200s, chunks contain outdated risk levels, external edits bypass governance. The resolver must stat files before returning cached IR.                                                                                                          | CL-10: every GET must check file mtime vs compilation timestamp; include stale_since when stale; CL-14: watcher triggers recompile within 500ms                                                       | Stale-detection utility must be a shared module used by all read paths (Layer 1, Layer 2, chunk assembly)                                          |
| **P-285** | S04-F02, S18-F01, S30-F01, S30-F04 | **Workspace-wide ETag creates false conflicts for item-level edits and must be consistent across layers.** File-level ETags cause 412 on unrelated same-file edits. Different API layers returning different ETags break cross-layer concurrency. Batch operations must increment version once. The ETag must be workspace-wide, atomic, and shared across all endpoints.                                                                                                           | CL-10: single workspace-wide version counter; atomic CAS; batch increments once; version survives restart; shared across Layer 1/2/3                                                                  | ETag implementation must be in shared infrastructure (not per-route); workspace version persisted to disk; covered in earliest write-path pulse    |
| **P-286** | S04-F03, S20-F01, S20-F08, S29-F03 | **Write-then-compile risks leaving workspace in dirty state on failure.** If the file is written before compilation, a compile failure or crash leaves uncompiled changes on disk. Multiple scenarios expose this: compile failure rollback, crash mid-PATCH, WAL atomicity for multi-file ops. The write path must use write-to-temp, compile from temp, rename on success.                                                                                                        | CL-10: write-ahead architecture (write-to-temp, compile, rename on success); WAL for multi-file atomic ops; startup health detects write-without-compile                                              | Critical path: temp-file write + atomic rename must be implemented before any PATCH endpoint ships; WAL needed for batch endpoint                  |
| **P-287** | S05-F01, S05-F02, S19-F04, S30-F06 | **File watcher and API write path race on the same file.** External edit and API PATCH arriving simultaneously can corrupt the file. Watcher-triggered recompile and PATCH-triggered recompile can run concurrently. The debounce window must coordinate with the per-file write lock. Writes add to a dirty set; compilation runs async on the accumulated dirty set.                                                                                                              | CL-14: file-level lock coordination between watcher and API; watcher defers recompile while PATCH lock held; CL-06: dirty-set-based compilation queue                                                 | File watcher and write-path must share a lock manager; compilation queue is a separate goroutine/worker consuming the dirty set                    |
| **P-288** | S07-F04, S08-F03, S21-F01, S22-F01 | **R5 lock enforcement must be a single shared codepath across all API surfaces.** Layer 1 (OC path), Layer 2 (chunk), Loop sync, and batch endpoints all need R5 validation. If these are separate implementations, a fix in one does not propagate. The R5 validator must be a shared module. Error precedence: 404 before 403.                                                                                                                                                    | CL-10: shared R5 validator module; CL-12: GovernanceIR is sole R5 source of truth; error precedence 404 > 403                                                                                         | R5 validator goes into claws-sdk/src/validators/r5.ts; imported by all route handlers; tested via cross-layer parity assertion                     |
| **P-289** | S06-F03, S08-F03, S06-F10          | **Lock precedence across multiple sources is undefined.** A tool can be locked by R5, fleet, and governance simultaneously. The lock.source field must show highest precedence; lock.precedence must list all sources. Chunk ETag must be composite across all contributing sources. Without precedence, removing one lock source appears to unlock the tool when another still applies.                                                                                            | CL-10: lock.precedence ordered array [r5, fleet, governance, none]; lock.source is highest; chunk ETag is composite hash of all data sources                                                          | Lock model type (LockResolution) defined in claws-sdk schema; all lock checks use this model                                                       |
| **P-290** | S08-F01, S08-F04, S28-F01, S28-F02 | **Fleet policy fail-closed, atomic reload, and real-time state merge.** Fleet policy unreachable = block all edits (not allow). Reload must be atomic (shadow cache swap). Syntax error retains previous policy. Chunks must merge real-time fleet state at read time, not just at compilation. Cache TTL < 60s or webhook invalidation.                                                                                                                                            | CL-08: fail-closed FLEET_POLICY_UNAVAILABLE; atomic shadow-cache swap on reload; CL-10: chunks merge real-time fleet at read time                                                                     | Fleet policy module needs: loader with validation, shadow-cache swap, health check for unreachable state, merge-at-read for chunk assembly         |
| **P-291** | S09-F04, S09-F05, S17-F01, S20-F07 | **Batch/allow-all operations must trigger exactly one recompilation and single version increment.** Multiple findings expose the same issue: allow-all with 7 tools must not run 7 recompiles; batch with 5 operations increments version once; the write path must coalesce file mutations before invoking the compiler.                                                                                                                                                           | CL-10: batch writes coalesced into single recompile; single version increment for atomic operations; compilation fires only after all mutations complete                                              | Batch endpoint must collect all file mutations in memory, write atomically, then invoke single compile pass                                        |
| **P-292** | S10-F01, S10-F09, S19-F01, S19-F05 | **Snapshot consistency for multi-file chunk assembly (extends P-271).** The P-271 mechanism must verify compilation_ids across ALL contributing files. Retry must re-read ALL files (not partial). IR cache must be locked or snapshotted during assembly. Global workspace compilation_id preferred over per-file IDs for scalability.                                                                                                                                             | CL-10: P-271 snapshot verification with full re-read on mismatch; max 3 retries with exponential backoff; 503 with files_in_conflict on exhaustion; consider global compilation_id                    | Snapshot verifier is a utility wrapping all chunk assembly calls; exponential backoff configurable                                                 |
| **P-293** | S02-F01, S02-F07, S13-F03, S25-F03 | **Session-scoped governance is a layered permission model that must be explicit.** Session ceiling filters tools, but manifest overrides exist. Delegated sessions inherit parent ceiling transitively. Workspace-level vs session-level permissions must both appear in responses. Fleet locks override both. The layering must be documented and computed correctly.                                                                                                              | CL-07: explicit permission layering (R5 > fleet > workspace > session); CL-08: delegated session ceiling <= parent; CL-10: session tools include workspacePermission alongside effectivePermission    | Session tools computation must be a pure function of (GovernanceIR, sessionConfig, fleetPolicy); cached per-session with invalidation on IR change |
| **P-294** | S14-F01 through S14-F05            | **Trust escalation JWT must pass 5 verification checks (extends P-279).** Signature, expiry, audience (workspace-scoped), issuer (tenant-scoped), and nonce (JTI replay prevention). Clock skew configurable. Short-lived tokens preferred. Nonce store persisted. Key rotation supported. Each failed check has a distinct error code without leaking server state.                                                                                                                | CL-10: 5-check JWT verification for trust escalation; per-check error codes; nonce persistence; key rotation; configurable clock skew                                                                 | JWT verification module in claws-sdk; nonce store backed by audit chain for persistence; key rotation support from day one                         |
| **P-295** | S22-F01, S22-F02, S22-F03          | **Deny-rule detection must use GovernanceIR registry, not regex, across all API surfaces (extends P-276/P-277).** Provenance tagging (compiler vs user) at compile time. Detection by rule ID, not pattern match. Loop sync and generic OC API share the same validator. Code blocks excluded from registry. Missing provenance defaults to compiler (fail-closed).                                                                                                                 | CL-12: provenance source field on deny rules, default compiler; CL-10: validation by rule ID from GovernanceIR; shared validator for Loop and OC API                                                  | Deny-rule registry built during compilation phase; validator is shared module; code-block exclusion in GovernanceIR parser                         |
| **P-296** | S23-F01, S23-F03, S23-F04          | **OBO detection must scan structured fields AND free text, with elicitation gate as cross-file dependency.** OBO in capabilities array is explicit. OBO in description is implicit and requires semantic analysis (not keyword match). Elicitation state lives in USER.md but enforcement applies to TOOLS.md edits. Missing USER.md = fail-closed. Allow all never covers R5+OBO.                                                                                                  | CL-12: OBO detection from capabilities + description; semantic tagger in GovernanceIR; CL-06: cross-file elicitation gate from compiled IR; CL-10: Allow all excludes R5+OBO via alwaysDenyRiskLevels | OBO tagger in GovernanceIR compilation; cross-file dependency resolution in validator; elicitation state checked from IR not raw file              |
| **P-297** | S24-F01, S24-F02, S13-F08          | **Pre-authorization invalidation on risk level change must be atomic and Allow all must re-evaluate dynamically.** When a tool upgrades from R3 to R5, pre-auths are revoked atomically with IR update. Allow all coverage re-evaluated at invocation time, not cached at grant time. Risk downgrade does not auto-restore pre-auth.                                                                                                                                                | CL-12: pre-auth invalidation atomic with IR update; Allow all dynamic evaluation at invocation; no auto-restore after risk change; explicit re-grant required                                         | Pre-auth lifecycle module tracks invalidation_reason; Allow all evaluator reads current risk_level at call time                                    |
| **P-298** | S25-F01, S25-F02, S25-F04, S27-F02 | **Unattended session fail-mode and delegation trust tier must be non-bypassable.** Cron/agent sessions force failMode: deny regardless of config. R5 never enters approval queue (immediate deny). Approval queue persisted to disk. Effective trust tier in delegation chain is min(chain). User-configured failMode overridable only for R1.                                                                                                                                      | CL-12: failMode hierarchy (alwaysDeny > unattended_policy > user_config); CL-08: approval queue persisted; agent sessions always unattended; delegation trust = min(chain)                            | failMode resolver is a hierarchical evaluator; approval queue persistence via atomic file writes; delegation chain carries trust tiers             |
| **P-299** | S15-F01, S15-F05, S26-F04          | **Audit chain must support efficient queries, retention, and correct chain anchoring.** Large chains need secondary indexes (not full-scan). Filtered queries break chain verification (use cached chainVerifiedAt). Tombstone deletion for retention. Onboard event is chain root. SARIF export validates against schema.                                                                                                                                                          | CL-10: audit with secondary indexes; cached integrity; tombstone deletion; SARIF 2.1.0 validation; CL-07: onboard event as chain root with workspace_id                                               | Audit subsystem needs index builder, periodic integrity verifier, SARIF exporter, tombstone support                                                |
| **P-300** | S16-F01, S16-F03, S07-F06, S09-F12 | **Dry-run must produce identical validation errors but zero side effects.** Same error shape as real PATCH (byte-identical except dryRun marker). No file writes, no recompile, no audit event. Read-only pipeline mode. Governance preview includes diff (current vs proposed). Supported on batch endpoint. DryRun excluded from rate limits.                                                                                                                                     | CL-10: dryRun mode -- read-only pipeline; identical errors; governance preview diff; batch support; excluded from rate limits                                                                         | DryRun flag propagated through the entire validation pipeline; all write operations gated on !dryRun check                                         |
| **P-301** | S17-F01, S17-F05, S17-F08          | **Batch atomicity requires write-ahead staging with cross-operation validation.** All-or-nothing semantics. Write-ahead staging (not sequential apply-and-hope). Conflicting same-file operations detected and rejected. Operations validated in array order against cumulative state. Single audit event for atomic batch. Max 20 operations.                                                                                                                                      | CL-10: batch endpoint -- staged validation, all-or-nothing, conflict detection, cumulative state, single audit event, max 20 ops                                                                      | Batch handler stages all mutations in memory, validates sequentially, writes atomically, compiles once                                             |
| **P-302** | S21-F04, S21-F05, S21-F07, S07-F09 | **R5 lock scope must be field-granular, not tool-granular.** R5 locks specific fields (enabled, approval_required, risk_level) not the entire tool. Non-locked fields (description, display_name) remain editable on R5 tools. Mixed locked/unlocked field PATCHes must define strategy (all-or-nothing vs partial). Section-level writes must diff against IR to enforce per-tool locks within bulk edits. Rename of R5 tool = bypass attempt (lock keyed to stable ID, not name). | CL-12: field-granular R5 lock; stable tool ID (not name); CL-10: mixed-field PATCH strategy (recommend all-or-nothing); section-level diff against IR                                                 | R5 lock model defines locked_fields per risk level; tool identity by stable ID; section-level PATCH validator diffs proposed content against IR    |
| **P-303** | S03-F01, S03-F02, S03-F05          | **Workspace schema must be self-describing and governance-aware.** Files array always 9 entries from canonical set (missing files show exists: false). Type discriminator (file vs directory) for skills/. Editable computed from governance + fleet + existence. Empty workspace returns valid 200. Schema versioned for backward compatibility.                                                                                                                                   | CL-10: GET /api/oc/ -- canonical 9-file array; type field; editable from governance; schema_version; valid 200 for empty workspace                                                                    | Workspace schema endpoint is foundational; implement before any partner integration testing                                                        |
| **P-304** | S26-F01, S26-F02, S26-F06, S29-F06 | **Cold-cache first compilation and startup health are critical first-run paths.** No prior IR, no delta, no cache. Cold-cache codepath must be explicitly tested. Schema validation of seed content before write prevents unrecoverable first-boot failures. Secret scan all seeded files. Startup health check: mtime comparison, full cache invalidation, ordered recovery sequence.                                                                                              | CL-06: explicit cold-cache codepath; startup health with mtime check; full cache invalidation before recovery recompile; CL-10: onboard validates schema + secret scan before write                   | Cold-cache path must be a distinct test scenario in the compiler test suite; startup health module is shared infrastructure                        |
| **P-305** | S27-F01, S27-F03, S27-F04          | **Delegation chain must carry full context, enforce depth limits, and detect cycles.** ApprovalRequestEvent includes ordered delegation_chain array with per-hop trust tier and reason. Cycle detection at delegation time by agent_id. Max depth 5 enforced at delegation time. Approval routes directly to human (not hop-by-hop) to survive suspended intermediate agents.                                                                                                       | CL-08: delegation chain in ApprovalRequestEvent; cycle detection at delegation time; max_depth limit; direct-to-human approval routing                                                                | Delegation module in agent-sdk; chain validation at delegation time; approval routing bypasses intermediate agents                                 |
| **P-306** | S05-F05, S04-F09, S21-F02, S07-F02 | **Error responses must consistently use oc:// paths, not API paths or chunk IDs, across all endpoints.** Every 4xx/5xx must include oc_path in oc:// format. Layer 1 and Layer 2 errors include both oc_path and chunk_id for cross-layer compatibility. Path consistency between success and error responses. Watcher SSE events use oc:// paths, not filesystem paths.                                                                                                            | CL-03: all responses use oc:// path format; CL-10: error responses include both oc_path and chunk_id                                                                                                  | Error response builder is a shared utility that always includes oc_path; path-mapping module for watcher events                                    |
| **P-307** | S11-F09, S12-F12, S15-F10, S26-F12 | **Timestamp and ID format standardization across all API surfaces.** ISO 8601 UTC for all timestamps. ULID or equivalent for run/event IDs (sortable, restart-safe). Content-addressed compilation_id (hash of IR). Opaque ETag format. Consistent across sessions, audit, runs, and workspace metadata.                                                                                                                                                                            | CL-10: ISO 8601 UTC mandatory; ULID for run/event IDs; content-addressed compilation_id; consistent format contract                                                                                   | Define a shared ApiFormats module with timestamp serializer, ID generator, and ETag formatter; all endpoints import it                             |
| **P-308** | S22-F09, S05-F07, S28-F09, S28-F10 | **File watcher must filter OC files, handle atomic rename patterns, and detect deletions.** Whitelist filter for known OC file names. Path-based watching (not inode-based) to survive editor rename-and-replace. Deletion detection with fail-closed (retain last policy). Non-OC files ignored. Platform-specific validation (Windows ReadDirectoryChangesW vs Linux inotify).                                                                                                    | CL-14: OC file whitelist; path-based watching; deletion detection with fail-closed; cross-platform validation                                                                                         | File watcher module is cross-platform infrastructure; must be tested on Windows, macOS, Linux in CI                                                |

## Spec Amendments Needed for CL-10

### Write Path

| Amendment                                                     | Source Pitfall | Section                     |
| ------------------------------------------------------------- | -------------- | --------------------------- |
| Write-ahead architecture (temp file, compile, rename)         | P-286          | Write-Time Validation Layer |
| Per-file write lock; different-file PATCHes parallel          | P-287, P-285   | Concurrent Write Handling   |
| Single workspace-wide version counter with atomic CAS         | P-285          | Workspace Versioning        |
| Version increment after successful compile only               | P-286, P-291   | Version Lifecycle           |
| Batch writes coalesced into single recompile                  | P-291          | Batch Endpoint              |
| Batch atomicity via write-ahead staging                       | P-301          | Batch Endpoint              |
| Batch max 20 operations, EMPTY_BATCH = 400                    | P-301          | Batch Endpoint              |
| DryRun: read-only pipeline, identical errors, no side effects | P-300          | Dry-Run Mode                |
| 428 Precondition Required when If-Match absent                | P-285          | ETag Enforcement            |
| PATCH during fleet reload held in queue                       | P-290          | Fleet Policy Interaction    |

### Read Path

| Amendment                                                       | Source Pitfall | Section             |
| --------------------------------------------------------------- | -------------- | ------------------- |
| Every GET checks file mtime vs compilation timestamp            | P-284          | Staleness Detection |
| Stale responses include stale_since field                       | P-284          | Response Schema     |
| P-271 snapshot verification with full re-read, max 3 retries    | P-292          | Chunk Assembly      |
| 503 with files_in_conflict on retry exhaustion                  | P-292          | Chunk Assembly      |
| Canonical 9-file workspace schema with type discriminator       | P-303          | GET /api/oc/        |
| Chunk assembly merges real-time fleet state at read time        | P-290          | Chunk Assembly      |
| Lock.precedence ordered array in chunk responses                | P-289          | Chunk Schema        |
| Composite ETag covering all data sources                        | P-289          | ETag Computation    |
| Session tools include workspacePermission + effectivePermission | P-293          | Session Tools       |

### oc:// Path Syntax

| Amendment                                                 | Source Pitfall | Section             |
| --------------------------------------------------------- | -------------- | ------------------- |
| First # is fragment delimiter; subsequent # literal       | P-283          | oc:// Parser        |
| Slashes in item names percent-encoded (%2F)               | P-283          | oc:// Encoding      |
| Canonical casing in response echo                         | P-283          | oc:// Normalization |
| meta.oc_path directly usable in PATCH without re-encoding | P-283          | Roundtrip Fidelity  |
| All error responses include oc_path in oc:// format       | P-306          | Error Responses     |
| oc:// for directories uses trailing slash                 | P-303          | Directory Paths     |

### Security and Governance

| Amendment                                                        | Source Pitfall | Section              |
| ---------------------------------------------------------------- | -------------- | -------------------- |
| Shared R5 validator across Layer 1, Layer 2, Loop, batch         | P-288          | R5 Enforcement       |
| R5 lock field-granular; stable tool ID, not name                 | P-302          | R5 Lock Model        |
| Section-level PATCH diffs against IR for per-tool R5 locks       | P-302          | Bulk Edit Validation |
| GovernanceIR deny-rule provenance (compiler vs user)             | P-295          | Deny Rule Model      |
| Deny-rule validation by rule ID, not regex                       | P-295          | Deny Rule Validation |
| OBO detection from capabilities + description; semantic analysis | P-296          | OBO Governance       |
| Cross-file elicitation gate from compiled IR                     | P-296          | Elicitation Gates    |
| Allow all excludes R5+OBO via alwaysDenyRiskLevels               | P-296          | Allow All Scope      |
| Pre-auth invalidation atomic with IR risk_level update           | P-297          | Pre-Auth Lifecycle   |
| Allow all dynamic evaluation at invocation time                  | P-297          | Allow All Evaluation |

### Fleet Policy

| Amendment                                                  | Source Pitfall | Section              |
| ---------------------------------------------------------- | -------------- | -------------------- |
| Fail-closed FLEET_POLICY_UNAVAILABLE on unreachable server | P-290          | Fleet Policy Loading |
| Atomic shadow-cache swap on reload                         | P-290          | Fleet Hot Reload     |
| Retain previous valid policy on syntax error               | P-290          | Fleet Error Handling |
| Fleet policy deletion = fail-closed                        | P-308          | Fleet File Watcher   |
| Cache TTL < 60s or webhook invalidation                    | P-290          | Fleet Freshness      |

### Sessions and Trust

| Amendment                                                   | Source Pitfall | Section                 |
| ----------------------------------------------------------- | -------------- | ----------------------- |
| 5-check JWT verification with per-check error codes         | P-294          | Trust Escalation        |
| Nonce (JTI) persistence across restarts                     | P-294          | Trust Replay Prevention |
| Sequential tier promotion (no skipping)                     | P-294          | Trust Tier Model        |
| Unattended sessions force failMode: deny (non-configurable) | P-298          | Unattended Policy       |
| R5 never enters approval queue (immediate deny)             | P-298          | Approval Queue          |
| Approval queue persisted to disk                            | P-298          | Approval Persistence    |
| Agent sessions always unattended regardless of parent       | P-298          | Session Classification  |
| Delegation trust = min(chain)                               | P-298, P-305   | Delegation Model        |
| Delegation chain depth limit (max 5)                        | P-305          | Delegation Limits       |
| Delegation cycle detection at delegation time               | P-305          | Delegation Validation   |

### SSE and Events

| Amendment                                                             | Source Pitfall | Section            |
| --------------------------------------------------------------------- | -------------- | ------------------ |
| SSE events use oc:// paths, not filesystem paths                      | P-306          | SSE Event Schema   |
| Per-file OC_FILE_UPDATED on write; COMPILATION_COMPLETE after compile | P-287          | SSE Event Types    |
| SSE during recovery: available immediately for RECOVERY_IN_PROGRESS   | P-304          | SSE Availability   |
| FLEET_POLICY_UPDATED includes changed_rules diff and affected_tools   | P-290          | Fleet SSE Events   |
| RISK_LEVEL_CHANGED as first-class SSE event type                      | P-297          | Risk Change Events |

### Startup and Recovery

| Amendment                                                                 | Source Pitfall | Section          |
| ------------------------------------------------------------------------- | -------------- | ---------------- |
| Startup mtime check all OC files vs last compilation                      | P-304          | Startup Health   |
| Full cache invalidation before recovery recompile                         | P-304          | Cache Recovery   |
| Ordered startup: WAL -> integrity -> cache -> recompile -> queue -> ready | P-304          | Startup Sequence |
| 503 with Retry-After on ALL endpoints during recovery                     | P-304          | Recovery Mode    |
| Recovery timeout 30s then degraded mode                                   | P-304          | Recovery Timeout |
| Work queue persistence via atomic file writes                             | P-298          | Work Queue       |

### API Format Standards

| Amendment                                       | Source Pitfall | Section              |
| ----------------------------------------------- | -------------- | -------------------- |
| ISO 8601 UTC for all timestamps                 | P-307          | Timestamp Format     |
| ULID for run/event IDs (sortable, restart-safe) | P-307          | ID Format            |
| Content-addressed compilation_id (hash of IR)   | P-307          | Compilation Identity |
| Opaque ETag format (quoted strong ETag)         | P-285          | ETag Format          |

### Audit Trail

| Amendment                                            | Source Pitfall | Section         |
| ---------------------------------------------------- | -------------- | --------------- |
| Secondary index for category + sessionId queries     | P-299          | Audit Query     |
| Cached integrity with chainVerifiedAt in response    | P-299          | Audit Integrity |
| Tombstone deletion for retention compliance          | P-299          | Audit Retention |
| SARIF 2.1.0 export validates against JSON schema     | P-299          | SARIF Export    |
| RISK_LEVEL_CHANGED as first-class audit event type   | P-297          | Audit Events    |
| R5_BYPASS_ATTEMPT unified event schema across layers | P-288          | Audit Events    |
| Single audit event for atomic batch                  | P-301          | Batch Audit     |

## Pulse Amendments

Cross-cutting infrastructure modules identified from pitfalls that must be built as shared foundations before endpoint-specific pulses.

### Shared Infrastructure (must land in earliest pulses)

| Module                        | Source Pitfalls | Description                                                                                                                                                          |
| ----------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **oc:// parser + encoder**    | P-283           | Fragment delimiter rules, percent-encoding, canonical casing, roundtrip fidelity. All read/write endpoints depend on this.                                           |
| **Workspace version counter** | P-285           | Atomic CAS, persisted to disk, shared across all endpoints, survives restart. Write path and ETag computation depend on this.                                        |
| **Write-ahead file manager**  | P-286           | Temp-file write, compile-from-temp, atomic rename. Backup/WAL for multi-file ops. All PATCH endpoints depend on this.                                                |
| **R5 validator (shared)**     | P-288           | Single codepath for R5 enforcement. Field-granular locking. Imported by Layer 1, Layer 2, Loop, and batch handlers.                                                  |
| **Lock resolver**             | P-289           | Precedence hierarchy (r5 > fleet > governance > none). Returns LockResolution with source, precedence array, scope. Used by chunk assembly and all write validators. |
| **Stale-detection utility**   | P-284           | Checks file mtime vs compilation timestamp. Returns stale_since. Used by all GET endpoints and chunk assembly.                                                       |
| **Error response builder**    | P-306           | Ensures every 4xx/5xx includes oc_path, chunk_id, and consistent error shape. Used by all route handlers.                                                            |
| **ApiFormats module**         | P-307           | ISO 8601 serializer, ULID generator, ETag formatter, compilation_id hasher. Used everywhere.                                                                         |
| **File watcher**              | P-308, P-287    | OC file whitelist, path-based watching, deletion detection, debounce, coordination with write-path locks. Cross-platform.                                            |

### Compilation Queue (must land before any write endpoint)

| Module                    | Source Pitfalls     | Description                                                                                                                               |
| ------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Dirty-set accumulator** | P-287, P-291, P-292 | Concurrent writes add to dirty set; compilation runs async on accumulated set. Coalescing window configurable (default 100ms).            |
| **Snapshot verifier**     | P-292               | Wraps chunk assembly. Checks compilation_id consistency across all contributing files. Retry with exponential backoff. 503 on exhaustion. |
| **Cold-cache codepath**   | P-304               | Explicit first-run path: no prior IR, full build, no delta. Startup health check triggers this on mtime mismatch.                         |

### Security Modules (must land before security-sensitive endpoints)

| Module                       | Source Pitfalls | Description                                                                                                                                |
| ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Deny-rule registry**       | P-295           | Built during compilation. Provenance tags. Rule ID-based lookup. Code-block exclusion. Shared validator for all API surfaces.              |
| **OBO tagger**               | P-296           | Semantic analysis of capabilities + description. Tags obo_detected in GovernanceIR. Handles negation, conditional, passive phrasing.       |
| **Elicitation gate checker** | P-296           | Cross-file: reads USER.md elicitation state from IR. Missing USER.md = fail-closed. Re-evaluates on every capabilities/description change. |
| **JWT verifier**             | P-294           | 5-check verification. Per-check error codes. Nonce store persisted via audit chain. Key rotation. Configurable clock skew.                 |
| **Pre-auth lifecycle**       | P-297           | Invalidation atomic with risk_level change. No auto-restore on downgrade. Tracks invalidation_reason.                                      |

### Session and Delegation (must land before session-aware endpoints)

| Module                          | Source Pitfalls | Description                                                                                                                                             |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Session permission computer** | P-293           | Pure function of (GovernanceIR, sessionConfig, fleetPolicy). Layered: R5 > fleet > workspace > session. Cached per-session with IR-change invalidation. |
| **Unattended policy enforcer**  | P-298           | failMode hierarchy. R5 = immediate deny. R3+ = queue. R1 = session failMode. Agent sessions always unattended.                                          |
| **Delegation chain validator**  | P-305           | Cycle detection by agent_id. Depth limit. Chain context per-delegation (not per-agent singleton). Direct-to-human approval routing.                     |
| **Approval queue**              | P-298           | File-based persistence. Per-tool timeout (default 8h). Coalescing identical requests. Relay results to subsequent runs.                                 |

### Fleet Policy (must land before fleet-aware endpoints)

| Module                     | Source Pitfalls | Description                                                                                               |
| -------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| **Fleet policy loader**    | P-290           | Parse, validate, shadow-cache swap. Fail-closed on error. Retain previous on syntax error. Atomic reload. |
| **Fleet read-time merger** | P-290           | Chunks merge real-time fleet state. Not just compilation-time. Cache TTL < 60s.                           |
| **Fleet file watcher**     | P-308           | Path-based. Handles rename-and-replace. Deletion = fail-closed. Sequential reload queue.                  |

## Severity Distribution by Scenario

| Scenario                     | Critical | Major | Warning | Note | Total |
| ---------------------------- | -------- | ----- | ------- | ---- | ----- |
| S01 oc-path-resolution       | 0        | 5     | 5       | 2    | 12    |
| S02 session-scoped-query     | 0        | 4     | 5       | 2    | 11    |
| S03 workspace-schema         | 0        | 5     | 4       | 2    | 11    |
| S04 layer1-patch             | 0        | 5     | 5       | 2    | 12    |
| S05 external-edit-detection  | 0        | 5     | 5       | 2    | 12    |
| S06 chunk-read-connections   | 0        | 5     | 5       | 2    | 12    |
| S07 chunk-patch-r5-rejection | 0        | 5     | 5       | 1    | 11    |
| S08 chunk-fleet-lock         | 0        | 5     | 5       | 1    | 11    |
| S09 allow-all-r5-exclusion   | 0        | 5     | 5       | 2    | 12    |
| S10 chunk-assembly-atomic    | 0        | 5     | 5       | 2    | 12    |
| S11 session-list             | 0        | 4     | 4       | 4    | 12    |
| S12 cron-run-history         | 0        | 5     | 5       | 2    | 12    |
| S13 session-tools            | 0        | 4     | 5       | 2    | 11    |
| S14 trust-escalation         | 0        | 7     | 4       | 2    | 13    |
| S15 audit-query              | 0        | 5     | 5       | 2    | 12    |
| S16 dry-run-patch            | 0        | 4     | 5       | 3    | 12    |
| S17 batch-edits              | 0        | 5     | 5       | 2    | 12    |
| S18 workspace-versioning     | 0        | 5     | 5       | 2    | 12    |
| S19 incremental-recompile    | 0        | 5     | 5       | 2    | 12    |
| S20 atomic-rollback          | 0        | 5     | 5       | 2    | 12    |
| S21 r5-bypass-layer1         | 3        | 5     | 3       | 1    | 12    |
| S22 deny-rule-removal        | 3        | 5     | 4       | 1    | 13    |
| S23 obo-without-elicitation  | 4        | 5     | 3       | 1    | 13    |
| S24 risk-level-drift         | 4        | 4     | 3       | 1    | 12    |
| S25 cron-unattended-approval | 4        | 4     | 4       | 1    | 13    |
| S26 onboard-to-first-task    | 4        | 4     | 3       | 1    | 12    |
| S27 multi-agent-delegation   | 4        | 4     | 3       | 1    | 12    |
| S28 fleet-policy-hot-reload  | 3        | 5     | 3       | 1    | 12    |
| S29 crash-recovery           | 4        | 4     | 3       | 1    | 12    |
| S30 concurrent-multi-tab     | 4        | 4     | 3       | 1    | 12    |
