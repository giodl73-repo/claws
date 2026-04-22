/**
 * Pulse 47.6 — end-to-end smoke via the real `claws` binary.
 *
 * This is the CP-5.5 exit proof. Every policy + snap + top-level verb
 * wired in pulses 47.1–47.5 is exercised through the shipping
 * `packages/claws/bin/claws.js` against all 4 CP-5 fixtures. No stubs,
 * no mocks, no library-direct imports — the same binary users invoke.
 *
 * Scope (D1 of the pulse plan):
 *   - 9 policy verbs  : check, generate, watch, comply, test, sim,
 *                       report, verify, diff
 *   - 9 snap verbs    : status, stage (on+off), upload, list-http, diff
 *                       (staged), checkout, promote, rollback,
 *                       discard-stage
 *   - 2 top-level     : doctor, upgrade
 *   - 4 fixtures      : allow-r1-public, deny-soul-rule,
 *                       review-r5-restricted, modify-arg-redaction
 *
 * Assertion philosophy: wiring, not outcome. Our CP-5 fixtures are
 * scenario-shaped (verb-behavior probes), not compliance-clean policy
 * workspaces. `comply` on SOC2 will fail predicates; `doctor` exits
 * healthy because policy-ir + audit-chain verify pass. Each assertion
 * verifies the handler loaded the library, produced a well-formed
 * result, and returned a documented exit code — which is what proves
 * the pulse 47.1–47.5 wiring is end-to-end correct.
 *
 * D7 dual-spawn: the full suite runs twice — once via `node bin/claws.js`
 * (dist build), once via `tsx src/cli.ts` (source). A dist/source
 * divergence would surface as differing exit codes or stdout shapes
 * between the two passes.
 *
 * @module test/e2e/accept/cli-roundtrip.accept.test.ts
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { copyFixture, teardownHttpProcess, trackPid } from '#harness';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const CLAWS_BIN = resolve(REPO_ROOT, 'packages', 'claws', 'bin', 'claws.js');
// `packages/claws/src/cli.ts` only exports `createProgram()`; production
// entry is `bin/claws.js` which wraps it. The dual-spawn gate uses a
// dedicated source-mode wrapper (`cli-source-entry.ts`) that imports
// the source `createProgram` and invokes `parseAsync` so tsx runs hit
// the source tree without the compiled dist.
const CLAWS_SRC = resolve(HERE, 'cli-source-entry.ts');
const TSX_BIN = process.env['TSX_BIN'] ?? 'tsx';
const FIXTURES_ROOT = resolve(HERE, '..', 'fixtures');
const FAILURES_DIR = resolve(HERE, '..', '.failures');

const FIXTURES = [
  'allow-r1-public',
  'deny-soul-rule',
  'review-r5-restricted',
  'modify-arg-redaction',
] as const;
type FixtureId = (typeof FIXTURES)[number];

const SPAWN_MODES = ['node-bin', 'tsx-src'] as const;
type SpawnMode = (typeof SPAWN_MODES)[number];

interface SpawnResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function spawnClaws(
  mode: SpawnMode,
  args: readonly string[],
  cwd: string,
  env?: Record<string, string>,
): Promise<SpawnResult> {
  const baseEnv = {
    ...process.env,
    NO_COLOR: '1',
    ...env,
  } as Record<string, string>;
  const [cmd, cmdArgs] =
    mode === 'node-bin'
      ? [process.execPath, [CLAWS_BIN, ...args]]
      : [TSX_BIN, [CLAWS_SRC, ...args]];
  // shell:false avoids the "C:\Program is not recognized" trap on Windows
  // when process.execPath contains a space — spawn quotes per-arg natively.
  // tsx-src mode uses the tsx global (on PATH), so shell:true is required
  // there to resolve the shim.
  const useShell = mode === 'tsx-src' && process.platform === 'win32';
  return new Promise((resolveP) => {
    const child = spawn(cmd, cmdArgs, {
      cwd,
      env: baseEnv,
      shell: useShell,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout?.on('data', (c: Buffer) => out.push(c));
    child.stderr?.on('data', (c: Buffer) => err.push(c));
    child.on('close', (code) => {
      resolveP({
        exitCode: code ?? 1,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      });
    });
    child.on('error', () => {
      resolveP({
        exitCode: 1,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      });
    });
  });
}

interface ServerHandle {
  readonly pid: number;
  readonly port: number;
  readonly url: string;
  kill(): Promise<void>;
}

function spawnSnapServer(mode: SpawnMode, cwd: string): Promise<ServerHandle> {
  const [cmd, cmdArgs] =
    mode === 'node-bin'
      ? [process.execPath, [CLAWS_BIN, '--json', 'snap', 'serve', '--port', '0', '--host', '127.0.0.1']]
      : [TSX_BIN, [CLAWS_SRC, '--json', 'snap', 'serve', '--port', '0', '--host', '127.0.0.1']];
  const useShell = mode === 'tsx-src' && process.platform === 'win32';
  return new Promise((resolveP, rejectP) => {
    const child: ChildProcess = spawn(cmd, cmdArgs, {
      cwd,
      // OPENCLAW_SNAP_REQUIRE_POLICY_IR=false lets promote run on a
      // snapshot that doesn't embed `.openclaw/policy/policy-ir.json`.
      // Upload reads the workspace through `readStagedOrCanonical`,
      // which skips any segment starting with `.`, so the policy tree
      // never enters the snapshot. Disabling the gate matches the
      // local-trusted server posture used by the accept suite.
      env: {
        ...process.env,
        NO_COLOR: '1',
        OPENCLAW_SNAP_REQUIRE_POLICY_IR: 'false',
      } as Record<string, string>,
      shell: useShell,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // best-effort
      }
      rejectP(
        new Error(
          `snap serve did not emit listening JSON within 15s. stderr=${stderrChunks.join('')}`,
        ),
      );
    }, 15_000);
    child.stdout?.on('data', (b: Buffer) => {
      if (settled) return;
      stdoutChunks.push(b.toString('utf8'));
      const joined = stdoutChunks.join('');
      const lines = joined.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        try {
          const parsed = JSON.parse(trimmed) as { status?: string; port?: number; url?: string };
          if (parsed.status === 'listening' && typeof parsed.port === 'number') {
            settled = true;
            clearTimeout(timer);
            const pid = child.pid!;
            trackPid(pid, { label: `cli-roundtrip-snap:${parsed.port}` });
            resolveP({
              pid,
              port: parsed.port,
              url: parsed.url ?? `http://127.0.0.1:${parsed.port}`,
              async kill() {
                await teardownHttpProcess(pid, {
                  shutdownMs: 500,
                  sigtermMs: 1_500,
                });
              },
            });
            return;
          }
        } catch {
          // not JSON yet; keep accumulating
        }
      }
    });
    child.stderr?.on('data', (b: Buffer) => {
      stderrChunks.push(b.toString('utf8'));
    });
    child.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rejectP(
        new Error(
          `snap serve exited before listening: code=${String(code)} signal=${String(signal)} stderr=${stderrChunks.join('')}`,
        ),
      );
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rejectP(err);
    });
  });
}

async function recordFailure(
  fixture: FixtureId,
  step: string,
  mode: SpawnMode,
  result: SpawnResult,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    mkdirSync(FAILURES_DIR, { recursive: true });
    const file = join(FAILURES_DIR, `cp55-${fixture}-${mode}-${step}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          fixture,
          step,
          mode,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          ...(extra ?? {}),
        },
        null,
        2,
      ),
      'utf8',
    );
  } catch {
    // Failure artifact is best-effort — never mask the actual test failure.
  }
}

// Per-mode timing collected for CP-5.5 close-out reporting.
interface FixtureTiming {
  readonly fixture: FixtureId;
  readonly mode: SpawnMode;
  readonly durationMs: number;
}
const timings: FixtureTiming[] = [];

// D8: a fresh dist build is required so stale dist never masks source
// changes. The build runs in `test/e2e/global-setup.ts` — once, before
// any vitest project starts — rather than in a `beforeAll` here. The
// previous beforeAll raced the integration project: while accept
// rebuilt dist (tsup `clean: true` briefly removes dist/cli.js),
// integration tests spawning `node packages/claws/bin/claws.js` hit
// ERR_MODULE_NOT_FOUND for the missing cli.js. globalSetup blocks all
// projects until the build completes.

afterAll(() => {
  if (timings.length === 0) return;
  const lines: string[] = ['cp55-smoke timings:'];
  for (const t of timings) {
    lines.push(`  ${t.mode} ${t.fixture}: ${String(t.durationMs)}ms`);
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
});

const tmpDirs: string[] = [];
afterEach(async () => {
  while (tmpDirs.length > 0) {
    const d = tmpDirs.pop()!;
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
});

describe.each(SPAWN_MODES)('cli-roundtrip via %s', (mode) => {
  describe.each(FIXTURES)('fixture=%s', (fixture) => {
    it(
      'exercises all 22 verbs end-to-end',
      async () => {
        const started = Date.now();
        const tmp = await copyFixture(
          join(FIXTURES_ROOT, fixture),
          `cp55-smoke-${fixture}-${mode}-${String(started)}`,
        );
        tmpDirs.push(tmp);

        // 1) policy generate — primary build; writes 3 artifacts.
        const gen = await spawnClaws(mode, ['policy', 'generate'], tmp);
        if (gen.exitCode !== 0) {
          await recordFailure(fixture, 'policy-generate', mode, gen);
        }
        expect(gen.exitCode, `generate stderr=${gen.stderr}`).toBe(0);
        expect(gen.stdout).toContain('files=3');
        expect(gen.stdout).toContain('scope=@bic/openclaw');
        const policyDir = join(tmp, '.openclaw', 'policy');
        expect(readFileSync(join(policyDir, 'policy-ir.json'), 'utf8').length).toBeGreaterThan(0);
        expect(readFileSync(join(policyDir, 'gateway-plugin.ts'), 'utf8').length).toBeGreaterThan(0);
        expect(readFileSync(join(policyDir, 'audit-manifest.json'), 'utf8').length).toBeGreaterThan(0);
        const policyIrRaw = readFileSync(join(policyDir, 'policy-ir.json'), 'utf8');
        expect(JSON.parse(policyIrRaw).policyId).toMatch(/^sha256-/);

        // 1a) generate byte-identical on re-run (D1 re-emit).
        const gen2 = await spawnClaws(mode, ['policy', 'generate'], tmp);
        expect(gen2.exitCode).toBe(0);
        expect(readFileSync(join(policyDir, 'policy-ir.json'), 'utf8')).toBe(policyIrRaw);

        // 2) policy check — expects policy-ir.json present.
        const check = await spawnClaws(mode, ['policy', 'check'], tmp);
        if (check.exitCode !== 0) {
          await recordFailure(fixture, 'policy-check', mode, check);
        }
        expect(check.exitCode, `check stderr=${check.stderr}`).toBe(0);
        expect(check.stdout).toMatch(/diagnostic\(s\), (fatal|ok)/);

        // 3) policy verify — audit chain on generated manifest.
        const verify = await spawnClaws(
          mode,
          ['policy', 'verify', '--manifest', join('.openclaw', 'policy', 'audit-manifest.json')],
          tmp,
        );
        if (verify.exitCode !== 0) {
          await recordFailure(fixture, 'policy-verify', mode, verify);
        }
        expect(verify.exitCode, `verify stderr=${verify.stderr}`).toBe(0);
        expect(verify.stdout).toContain('audit-chain ok');

        // 3a) D2 negative: corrupt the manifest hash, verify must fail
        //     with a chain-invalid diagnostic.
        const manifestPath = join(policyDir, 'audit-manifest.json');
        const manifestRaw = readFileSync(manifestPath, 'utf8');
        const manifestParsed = JSON.parse(manifestRaw) as {
          chain?: Array<Record<string, unknown>>;
        };
        if (Array.isArray(manifestParsed.chain) && manifestParsed.chain.length > 0) {
          // Swap out the stored `hash` field on the first entry so the
          // recomputed chain hash no longer matches. `verifyAudit` reports
          // `brokenAt=0` and sets `valid=false`, which the handler maps to
          // exit 1 + a message containing the word "chain".
          const corrupted = { ...manifestParsed };
          const firstEntry = manifestParsed.chain[0] as Record<string, unknown>;
          corrupted.chain = [
            { ...firstEntry, hash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' },
            ...manifestParsed.chain.slice(1),
          ];
          writeFileSync(manifestPath, JSON.stringify(corrupted, null, 2), 'utf8');
          const verifyBad = await spawnClaws(
            mode,
            ['policy', 'verify', '--manifest', join('.openclaw', 'policy', 'audit-manifest.json')],
            tmp,
          );
          expect(verifyBad.exitCode).toBe(1);
          expect(verifyBad.stderr).toContain('chain');
          // Restore for downstream verbs that read the manifest (doctor).
          writeFileSync(manifestPath, manifestRaw, 'utf8');
        }

        // 4) policy watch --once — one-shot arm/close cycle.
        const watch = await spawnClaws(mode, ['policy', 'watch', '--once'], tmp);
        expect(watch.exitCode).toBe(0);
        expect(watch.stdout).toContain('watch: stopped');

        // 5) policy comply — wire check. Our fixtures aren't SOC2-clean, so
        //    the handler may return exit 1 (summary.fail > 0). We assert
        //    the wiring: rubric header rendered, summary totals present.
        const comply = await spawnClaws(
          mode,
          [
            'policy',
            'comply',
            '--rubric',
            'soc2',
            '--snapshot',
            `s-${fixture}`,
            '--policy-ir',
            join('.openclaw', 'policy', 'policy-ir.json'),
          ],
          tmp,
        );
        expect([0, 1]).toContain(comply.exitCode);
        expect(comply.stdout).toContain('soc2-type-ii');
        expect(comply.stdout).toMatch(/total:\s+\d+/);

        // 5a) comply --json emits parseable ComplianceReport.
        const complyJson = await spawnClaws(
          mode,
          [
            '--json',
            'policy',
            'comply',
            '--rubric',
            'soc2',
            '--snapshot',
            `s-${fixture}`,
            '--policy-ir',
            join('.openclaw', 'policy', 'policy-ir.json'),
          ],
          tmp,
        );
        expect([0, 1]).toContain(complyJson.exitCode);
        const complyReport = JSON.parse(complyJson.stdout) as {
          rubric?: { id?: string };
          summary?: Record<string, number>;
          signature?: { algorithm?: string; value?: string };
        };
        expect(complyReport.rubric?.id).toBe('soc2-type-ii');
        expect(complyReport.summary).toBeDefined();
        expect(typeof complyReport.signature?.value).toBe('string');

        // 6) policy test — scenarios/*.yaml, in-memory gateway path (D1).
        mkdirSync(join(tmp, 'test', 'scenarios'), { recursive: true });
        // Parse the generated policyIR to discover a tool name for the
        // scenario. The scenario YAML parser doesn't support quoted
        // strings with colons, so we keep it minimal.
        const policyIR = JSON.parse(policyIrRaw) as { tools?: Array<{ name?: string }> };
        const firstTool =
          policyIR.tools && policyIR.tools.length > 0 ? (policyIR.tools[0]!.name ?? 'example') : 'example';
        const scenarioYaml = [
          `snapshot: s-${fixture}`,
          'given:',
          '  tool_call:',
          `    tool: ${firstTool}`,
          '    args: {}',
          'expect:',
          '  decision: allow',
          '',
        ].join('\n');
        writeFileSync(join(tmp, 'test', 'scenarios', 'probe.yaml'), scenarioYaml, 'utf8');
        const testRun = await spawnClaws(
          mode,
          [
            'policy',
            'test',
            '--policy-ir',
            join('.openclaw', 'policy', 'policy-ir.json'),
          ],
          tmp,
        );
        // Decision may be allow/deny/review/modify depending on the
        // fixture — we only require the handler to report a scenario ran.
        expect([0, 1]).toContain(testRun.exitCode);
        expect(testRun.stdout).toMatch(/total=\d+/);

        // 7) policy sim — start mock gateway on ephemeral port, hit /healthz,
        //    then shut down via lifecycle.ts.
        await exerciseSim(mode, tmp, fixture);

        // 8) policy report — audit kind against the generated manifest.
        const report = await spawnClaws(
          mode,
          [
            'policy',
            'report',
            '--kind',
            'audit',
            '--format',
            'json',
            '--input',
            join('.openclaw', 'policy', 'audit-manifest.json'),
          ],
          tmp,
        );
        expect(report.exitCode).toBe(0);
        const reportJson = JSON.parse(report.stdout) as { kind?: string };
        expect(reportJson.kind).toBe('audit');

        // 9) policy diff — identical IR (current vs itself via direct path).
        const diff = await spawnClaws(
          mode,
          [
            'policy',
            'diff',
            'current',
            join('.openclaw', 'policy', 'policy-ir.json'),
          ],
          tmp,
        );
        expect(diff.exitCode).toBe(0);
        expect(diff.stdout).toContain('identical');

        // 10) snap verbs via a real snap serve on ephemeral port.
        await exerciseSnap(mode, tmp, fixture);

        // 11) claws doctor — policy-aware probe on a workspace with
        //     policy-ir.json + audit-manifest.json present.
        const doctor = await spawnClaws(mode, ['doctor'], tmp);
        if (doctor.exitCode !== 0) {
          await recordFailure(fixture, 'doctor', mode, doctor);
        }
        expect(doctor.exitCode, `doctor stderr=${doctor.stderr}`).toBe(0);
        expect(doctor.stdout).toContain('policy-ir.json present');
        expect(doctor.stdout).toContain('audit-chain verify passes');

        // 12) claws upgrade --check — dry-run inspector.
        const upgrade = await spawnClaws(mode, ['upgrade', '--check'], tmp);
        expect(upgrade.exitCode).toBe(0);
        expect(upgrade.stdout).toContain('upgrade');

        // Fixture integrity: the copy under $tmp/.openclaw/policy/ exists,
        // but the source fixture at $FIXTURES_ROOT/$fixture must not have
        // been mutated. Spot-check: AGENTS.md bytes at source match the
        // per-scenario tmp copy (both inherited from pulse-35 fixture).
        const sourceAgents = readFileSync(join(FIXTURES_ROOT, fixture, 'AGENTS.md'), 'utf8');
        const tmpAgents = readFileSync(join(tmp, 'AGENTS.md'), 'utf8');
        expect(tmpAgents).toBe(sourceAgents);

        timings.push({ fixture, mode, durationMs: Date.now() - started });
      },
      180_000,
    );
  });
});

async function exerciseSim(mode: SpawnMode, tmp: string, _fixture: FixtureId): Promise<void> {
  const simLog: string[] = [];
  const [cmd, cmdArgs] =
    mode === 'node-bin'
      ? [
          process.execPath,
          [
            CLAWS_BIN,
            'policy',
            'sim',
            '--policy-ir',
            join('.openclaw', 'policy', 'policy-ir.json'),
            '--port',
            '0',
          ],
        ]
      : [
          TSX_BIN,
          [
            CLAWS_SRC,
            'policy',
            'sim',
            '--policy-ir',
            join('.openclaw', 'policy', 'policy-ir.json'),
            '--port',
            '0',
          ],
        ];
  const useShell = mode === 'tsx-src' && process.platform === 'win32';
  const child = spawn(cmd, cmdArgs, {
    cwd: tmp,
    env: { ...process.env, NO_COLOR: '1' } as Record<string, string>,
    shell: useShell,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const pid = child.pid!;
  trackPid(pid, { label: `cli-roundtrip-sim` });
  let url = '';
  const watcher = new Promise<void>((resolveP, rejectP) => {
    const timer = setTimeout(() => rejectP(new Error(`sim did not announce within 10s: ${simLog.join('')}`)), 10_000);
    child.stdout?.on('data', (b: Buffer) => {
      const chunk = b.toString('utf8');
      simLog.push(chunk);
      const match = /listening on (http:\/\/\S+)/.exec(simLog.join(''));
      if (match) {
        clearTimeout(timer);
        url = match[1]!;
        resolveP();
      }
    });
    child.stderr?.on('data', (b: Buffer) => simLog.push(b.toString('utf8')));
    child.once('exit', () => {
      clearTimeout(timer);
      if (url === '') rejectP(new Error(`sim exited before announce: ${simLog.join('')}`));
    });
  });
  await watcher;
  try {
    // Policy sim mock-gateway exposes /v1/health (snap-serve uses the
    // /v1/healthz spelling). Both are liveness endpoints; we probe the
    // one sim actually answers.
    const health = await fetch(`${url}/v1/health`);
    expect(health.status).toBe(200);
  } finally {
    await teardownHttpProcess(pid, { shutdownMs: 300, sigtermMs: 1_000 });
  }
}

async function exerciseSnap(mode: SpawnMode, tmp: string, fixture: FixtureId): Promise<void> {
  const server = await spawnSnapServer(mode, tmp);
  try {
    // Give the server a short grace period for /v1/healthz readiness.
    // `snap serve` announces listening before its handler table is fully
    // armed on some Windows runs; a 50ms yield is sufficient.
    await delay(50);

    // snap status — empty list on fresh server.
    const status = await spawnClaws(mode, ['snap', 'status', '--endpoint', server.url], tmp);
    expect(status.exitCode, `snap status stderr=${status.stderr}`).toBe(0);
    expect(status.stdout).toContain('[');

    // snap stage on — handler is a thin echo today; asserts wiring.
    const stageOn = await spawnClaws(mode, ['snap', 'stage', 'on', '--endpoint', server.url], tmp);
    expect(stageOn.exitCode).toBe(0);
    expect(stageOn.stdout).toContain('stage on');

    // snap upload — commit working-tree as a new draft snapshot.
    const upload = await spawnClaws(
      mode,
      ['snap', 'upload', '--endpoint', server.url, '--files', tmp],
      tmp,
    );
    if (upload.exitCode !== 0) {
      await recordFailure(fixture, 'snap-upload', mode, upload);
    }
    expect(upload.exitCode, `snap upload stderr=${upload.stderr}`).toBe(0);
    const uploaded = JSON.parse(upload.stdout) as { id?: string; status?: string };
    expect(typeof uploaded.id).toBe('string');
    expect(uploaded.id!).toMatch(/^sha256-/);
    const snapshotId = uploaded.id!;

    // A second upload gives us a second id for diff coverage.
    writeFileSync(join(tmp, 'EXTRA.md'), '# added after first upload\n', 'utf8');
    const upload2 = await spawnClaws(
      mode,
      ['snap', 'upload', '--endpoint', server.url, '--files', tmp],
      tmp,
    );
    expect(upload2.exitCode).toBe(0);
    const uploaded2 = JSON.parse(upload2.stdout) as { id?: string };
    expect(typeof uploaded2.id).toBe('string');
    const snapshotId2 = uploaded2.id!;

    // snap list-http — both snapshots present.
    const list = await spawnClaws(
      mode,
      ['snap', 'list-http', '--endpoint', server.url],
      tmp,
    );
    expect(list.exitCode).toBe(0);
    const listed = JSON.parse(list.stdout) as Array<{ id?: string }>;
    expect(listed.map((s) => s.id)).toContain(snapshotId);
    expect(listed.map((s) => s.id)).toContain(snapshotId2);

    // snap diff <id1> <id2> — semantic diff falls back to file diff
    // when @bic/openclaw-policy dynamic import resolves; both branches
    // emit valid JSON.
    const diffIds = await spawnClaws(
      mode,
      [
        'snap',
        'diff',
        snapshotId,
        snapshotId2,
        '--level',
        'file',
        '--endpoint',
        server.url,
      ],
      tmp,
    );
    expect(diffIds.exitCode).toBe(0);
    const diffBody = JSON.parse(diffIds.stdout) as Record<string, unknown>;
    expect(diffBody).toBeDefined();

    // snap diff --staged — thin stub (documented in pulse 47.4).
    const diffStaged = await spawnClaws(
      mode,
      ['snap', 'diff', '--staged', '--endpoint', server.url],
      tmp,
    );
    expect(diffStaged.exitCode).toBe(0);

    // snap checkout — reset working tree to the first snapshot id. Use
    //   --keep-stage so the rollback-checkout-rollback cycle doesn't
    //   stomp on in-flight state.
    const checkoutTmp = await copyFixture(
      join(FIXTURES_ROOT, fixture),
      `cp55-smoke-checkout-${fixture}-${mode}-${String(Date.now())}`,
    );
    tmpDirs.push(checkoutTmp);
    const checkout = await spawnClaws(
      mode,
      [
        'snap',
        'checkout',
        snapshotId,
        '--root',
        checkoutTmp,
        '--keep-stage',
        '--endpoint',
        server.url,
      ],
      checkoutTmp,
    );
    if (checkout.exitCode !== 0) {
      await recordFailure(fixture, 'snap-checkout', mode, checkout);
    }
    expect(checkout.exitCode, `snap checkout stderr=${checkout.stderr}`).toBe(0);

    // snap promote — mark snapshot current. Hitting the snap server via
    // curl first to read the structured 4xx body on failure; this makes
    // the assertion diff actionable instead of just "exit 1".
    const promote = await spawnClaws(
      mode,
      ['snap', 'promote', snapshotId, '--endpoint', server.url],
      tmp,
    );
    if (promote.exitCode !== 0) {
      const raw = await fetch(`${server.url}/v1/snapshots/${encodeURIComponent(snapshotId)}/promote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': `debug-${String(Date.now())}` },
        body: '{}',
      });
      await recordFailure(fixture, 'snap-promote', mode, promote, {
        serverStatus: raw.status,
        serverBody: await raw.text(),
      });
    }
    expect(promote.exitCode, `snap promote stderr=${promote.stderr}`).toBe(0);

    // snap rollback — re-promote prior (second) snapshot.
    const rollback = await spawnClaws(
      mode,
      ['snap', 'rollback', snapshotId2, '--endpoint', server.url],
      tmp,
    );
    expect(rollback.exitCode, `snap rollback stderr=${rollback.stderr}`).toBe(0);

    // snap discard-stage — thin-stub echo.
    const discard = await spawnClaws(
      mode,
      ['snap', 'discard-stage', '--endpoint', server.url],
      tmp,
    );
    expect(discard.exitCode).toBe(0);

    // snap stage off — toggle back.
    const stageOff = await spawnClaws(
      mode,
      ['snap', 'stage', 'off', '--endpoint', server.url],
      tmp,
    );
    expect(stageOff.exitCode).toBe(0);
    expect(stageOff.stdout).toContain('stage off');
  } finally {
    await server.kill();
  }
}
