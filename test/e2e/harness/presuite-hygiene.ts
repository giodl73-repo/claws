/**
 * test/e2e/harness/presuite-hygiene — kill stale `claws` processes + sweep
 * abandoned `claws-harness-*` tmp dirs at suite start.
 *
 * The e2e harness spawns long-lived `claws` CLI + snap processes; when a
 * previous run aborts (Ctrl-C, timeout, crash), children can survive and hold
 * ports / tmp dirs. Running the hygiene sweep at suite start keeps each suite
 * from inheriting ambient residuals that would otherwise mask real failures.
 *
 * Two sweeps compose the contract:
 *
 *   - `killStaleClawsProcesses()` — enumerates OS processes whose command-line
 *     matches `claws`/`claws.js`/`claws-snap` and kills any whose lifetime
 *     exceeds `olderThanMs` (default 1h). In-flight processes — those younger
 *     than the threshold — are left alone so concurrent suites can share a
 *     host.
 *   - `sweepHarnessTmpDirs()` — enumerates `os.tmpdir()/claws-harness-*` and
 *     removes any whose mtime is older than `olderThanMs`. Younger dirs are
 *     left alone (another suite may be mid-run).
 *
 * Both helpers log what they cleaned — stdout lines tagged `presuite-hygiene:`
 * so a CI reader can grep them. Returns the set of actions taken so the caller
 * can assert on them in an integration test.
 *
 * @module test/e2e/harness/presuite-hygiene
 */
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execCb);

const DEFAULT_OLDER_THAN_MS = 60 * 60 * 1000;
const HARNESS_TMP_PREFIX = 'claws-harness-';

export interface PresuiteHygieneOptions {
  readonly olderThanMs?: number;
  /** Clock injection for tests; defaults to `Date.now`. */
  readonly now?: () => number;
  /** Platform override for tests; defaults to `process.platform`. */
  readonly platform?: NodeJS.Platform;
  /** Tmp root override for tests; defaults to `os.tmpdir()`. */
  readonly tmpRoot?: string;
  /** Logger sink (defaults to console.log). */
  readonly log?: (msg: string) => void;
  /** Process enumerator injection for tests. */
  readonly listProcesses?: () => Promise<readonly PresuiteProcess[]>;
  /** Kill function injection for tests. Returns true iff kill succeeded. */
  readonly killProcess?: (pid: number) => Promise<boolean>;
}

export interface PresuiteProcess {
  readonly pid: number;
  /** Milliseconds elapsed since the process started (epoch-lag). */
  readonly ageMs: number;
  /** Command line with executable path; matched case-insensitively. */
  readonly commandLine: string;
}

export interface PresuiteHygieneResult {
  readonly killedPids: readonly number[];
  readonly skippedPids: readonly number[];
  readonly sweptDirs: readonly string[];
  readonly keptDirs: readonly string[];
}

/**
 * Run the full presuite hygiene sweep: stale-process kill + tmp-dir removal.
 */
export async function runPresuiteHygiene(
  opts: PresuiteHygieneOptions = {},
): Promise<PresuiteHygieneResult> {
  const log = opts.log ?? ((msg: string): void => console.log(msg));
  const olderThanMs = opts.olderThanMs ?? DEFAULT_OLDER_THAN_MS;

  const procResult = await killStaleClawsProcesses({ ...opts, olderThanMs, log });
  const dirResult = await sweepHarnessTmpDirs({ ...opts, olderThanMs, log });

  return {
    killedPids: procResult.killedPids,
    skippedPids: procResult.skippedPids,
    sweptDirs: dirResult.sweptDirs,
    keptDirs: dirResult.keptDirs,
  };
}

interface ProcSweepResult {
  readonly killedPids: readonly number[];
  readonly skippedPids: readonly number[];
}

/**
 * Enumerate running processes whose command-line references `claws` and kill
 * any that exceed the age threshold. Younger processes are skipped.
 */
export async function killStaleClawsProcesses(
  opts: PresuiteHygieneOptions & { olderThanMs: number; log: (msg: string) => void },
): Promise<ProcSweepResult> {
  const listProcs = opts.listProcesses ?? defaultListProcesses(opts.platform ?? process.platform);
  const kill = opts.killProcess ?? defaultKillProcess;

  const all = await listProcs();
  const candidates = all.filter((p) => matchesClawsCommand(p.commandLine));
  const killedPids: number[] = [];
  const skippedPids: number[] = [];

  for (const p of candidates) {
    if (p.ageMs < opts.olderThanMs) {
      skippedPids.push(p.pid);
      continue;
    }
    const ok = await kill(p.pid);
    if (ok) {
      killedPids.push(p.pid);
      opts.log(`presuite-hygiene: killed stale pid=${String(p.pid)} age=${String(p.ageMs)}ms cmd=${p.commandLine}`);
    } else {
      skippedPids.push(p.pid);
    }
  }

  return { killedPids, skippedPids };
}

interface DirSweepResult {
  readonly sweptDirs: readonly string[];
  readonly keptDirs: readonly string[];
}

/**
 * Remove `claws-harness-*` directories under `tmpRoot` older than threshold.
 */
export async function sweepHarnessTmpDirs(
  opts: PresuiteHygieneOptions & { olderThanMs: number; log: (msg: string) => void },
): Promise<DirSweepResult> {
  const root = opts.tmpRoot ?? tmpdir();
  const now = (opts.now ?? Date.now)();

  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return { sweptDirs: [], keptDirs: [] };
  }

  const sweptDirs: string[] = [];
  const keptDirs: string[] = [];

  for (const name of entries) {
    if (!name.startsWith(HARNESS_TMP_PREFIX)) continue;
    const full = join(root, name);
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    const ageMs = now - stat.mtimeMs;
    if (ageMs < opts.olderThanMs) {
      keptDirs.push(full);
      continue;
    }
    try {
      await fs.rm(full, { recursive: true, force: true });
      sweptDirs.push(full);
      opts.log(`presuite-hygiene: removed stale dir=${full} age=${String(ageMs)}ms`);
    } catch {
      keptDirs.push(full);
    }
  }

  return { sweptDirs, keptDirs };
}

function matchesClawsCommand(cmd: string): boolean {
  const lower = cmd.toLowerCase();
  return (
    lower.includes('claws') &&
    (lower.includes('claws.js') || lower.includes('claws-snap') || /\bclaws\b/.test(lower))
  );
}

function defaultListProcesses(
  platform: NodeJS.Platform,
): () => Promise<readonly PresuiteProcess[]> {
  if (platform === 'win32') {
    return async (): Promise<readonly PresuiteProcess[]> => {
      try {
        const { stdout } = await exec(
          'wmic process get ProcessId,CreationDate,CommandLine /FORMAT:CSV',
          { maxBuffer: 16 * 1024 * 1024, windowsHide: true },
        );
        return parseWmicCsv(stdout);
      } catch {
        return [];
      }
    };
  }
  return async (): Promise<readonly PresuiteProcess[]> => {
    try {
      const { stdout } = await exec('ps -eo pid,etimes,command', {
        maxBuffer: 16 * 1024 * 1024,
      });
      return parsePsOutput(stdout);
    } catch {
      return [];
    }
  };
}

export function parseWmicCsv(stdout: string): readonly PresuiteProcess[] {
  const out: PresuiteProcess[] = [];
  const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // First meaningful line is the header.
  let headers: string[] | null = null;
  for (const line of lines) {
    const cols = line.split(',');
    if (headers === null) {
      if (cols.some((c) => c.toLowerCase() === 'processid')) {
        headers = cols.map((c) => c.toLowerCase());
      }
      continue;
    }
    const idxPid = headers.indexOf('processid');
    const idxCd = headers.indexOf('creationdate');
    const idxCmd = headers.indexOf('commandline');
    if (idxPid < 0 || idxCd < 0 || idxCmd < 0) continue;
    const pidCol = cols[idxPid];
    const cdCol = cols[idxCd];
    const cmdCol = cols[idxCmd];
    if (pidCol === undefined || cdCol === undefined || cmdCol === undefined) continue;
    const pid = Number.parseInt(pidCol.trim(), 10);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const createdMs = parseWmicDate(cdCol.trim());
    if (createdMs === null) continue;
    out.push({
      pid,
      ageMs: Date.now() - createdMs,
      commandLine: cmdCol.trim(),
    });
  }
  return out;
}

function parseWmicDate(s: string): number | null {
  // Format: YYYYMMDDHHMMSS.mmmmmm+UUU
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (m === null) return null;
  const [, y, mo, d, h, mi, se] = m;
  const iso = `${y!}-${mo!}-${d!}T${h!}:${mi!}:${se!}Z`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export function parsePsOutput(stdout: string): readonly PresuiteProcess[] {
  const out: PresuiteProcess[] = [];
  const lines = stdout.split('\n').slice(1);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;
    const m = line.match(/^(\d+)\s+(\d+)\s+(.*)$/);
    if (m === null) continue;
    const pid = Number.parseInt(m[1]!, 10);
    const etimes = Number.parseInt(m[2]!, 10);
    const commandLine = m[3]!;
    if (!Number.isInteger(pid) || pid <= 0) continue;
    out.push({ pid, ageMs: etimes * 1000, commandLine });
  }
  return out;
}

async function defaultKillProcess(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}
