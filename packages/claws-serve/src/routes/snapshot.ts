/**
 * POST /snapshot — save a named governance snapshot.
 * GET /diff — compare two named snapshots by name.
 *
 * Snapshot names are validated: alphanumeric + hyphens + underscores only,
 * max 128 chars. Names containing `/`, `\`, `..`, or null bytes are rejected.
 *
 * @module claws-serve/routes/snapshot
 */

import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import { serialize, type GovernanceIR, type GovViolation } from '../../../claws-sdk/src/index.js';
import type { CompilationHost } from '../compilation-host.js';
import type { ClientManager } from '../ws/events.js';
import { createEvent } from '../ws/events.js';

/**
 * A stored snapshot: serialized GovernanceIR with name and timestamp.
 */
export interface Snapshot {
  readonly name: string;
  readonly timestamp: string;
  readonly ir: GovernanceIR;
}

/**
 * Diff result between two snapshots.
 */
export interface SnapshotDiff {
  readonly from: string;
  readonly to: string;
  readonly violations: {
    readonly added: readonly GovViolation[];
    readonly removed: readonly GovViolation[];
    readonly changed: readonly { readonly ruleId: string; readonly from: number; readonly to: number }[];
  };
  readonly tensions: {
    readonly before: number;
    readonly after: number;
    readonly delta: number;
  };
  readonly riskShifts: readonly {
    readonly toolName: string;
    readonly from: string;
    readonly to: string;
  }[];
}

/** Snapshot name validation regex: alphanumeric, hyphens, underscores. */
const VALID_NAME = /^[a-zA-Z0-9_-]+$/;
const MAX_NAME_LENGTH = 128;

/**
 * Validate a snapshot name. Returns an error message or undefined if valid.
 */
export function validateSnapshotName(name: unknown): string | undefined {
  if (typeof name !== 'string' || name === '') {
    return 'Snapshot name is required and must be a non-empty string.';
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Snapshot name exceeds ${String(MAX_NAME_LENGTH)} characters.`;
  }
  if (name.includes('\0')) {
    return 'Snapshot name must not contain null bytes.';
  }
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    return 'Snapshot name must not contain path separators or traversal sequences.';
  }
  if (!VALID_NAME.test(name)) {
    return 'Snapshot name must contain only alphanumeric characters, hyphens, and underscores.';
  }
  return undefined;
}

/**
 * Verify that a resolved path is within the expected base directory.
 */
function isWithinDir(base: string, resolved: string): boolean {
  const normalizedBase = path.resolve(base) + path.sep;
  const normalizedResolved = path.resolve(resolved);
  return normalizedResolved.startsWith(normalizedBase) || normalizedResolved === path.resolve(base);
}

/**
 * Compare violations between two IRs.
 */
function diffViolations(
  fromIR: GovernanceIR,
  toIR: GovernanceIR,
): SnapshotDiff['violations'] {
  const fromRuleIds = new Set(fromIR.analysis.violations.map((v) => v.ruleId));
  const toRuleIds = new Set(toIR.analysis.violations.map((v) => v.ruleId));

  const added = toIR.analysis.violations.filter((v) => !fromRuleIds.has(v.ruleId));
  const removed = fromIR.analysis.violations.filter((v) => !toRuleIds.has(v.ruleId));

  const changed: { ruleId: string; from: number; to: number }[] = [];
  for (const toV of toIR.analysis.violations) {
    if (fromRuleIds.has(toV.ruleId)) {
      const fromV = fromIR.analysis.violations.find((v) => v.ruleId === toV.ruleId)!;
      if (fromV.level !== toV.level) {
        changed.push({ ruleId: toV.ruleId, from: fromV.level, to: toV.level });
      }
    }
  }

  return { added, removed, changed };
}

/**
 * Compare tensions (conflict counts) between two IRs.
 */
function diffTensions(
  fromIR: GovernanceIR,
  toIR: GovernanceIR,
): SnapshotDiff['tensions'] {
  const before = fromIR.conflicts.totalConflicts;
  const after = toIR.conflicts.totalConflicts;
  return { before, after, delta: after - before };
}

/**
 * Compare risk level shifts between two IRs.
 */
function diffRiskLevels(
  fromIR: GovernanceIR,
  toIR: GovernanceIR,
): SnapshotDiff['riskShifts'] {
  const fromTools = new Map(
    fromIR.capabilities.tools.map((t) => [t.name, t.riskLevel]),
  );
  const shifts: { toolName: string; from: string; to: string }[] = [];

  for (const tool of toIR.capabilities.tools) {
    const fromRisk = fromTools.get(tool.name);
    if (fromRisk !== undefined && fromRisk !== tool.riskLevel) {
      shifts.push({ toolName: tool.name, from: fromRisk, to: tool.riskLevel });
    }
  }

  return shifts;
}

/**
 * In-memory snapshot store. Keyed by name.
 */
export type SnapshotStore = Map<string, Snapshot>;

export function snapshotRouter(
  host: CompilationHost,
  store: SnapshotStore = new Map(),
  clientManager?: ClientManager | undefined,
): Router {
  const router = Router();
  const snapshotBaseDir = path.resolve('/snapshots');

  router.post('/snapshot', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    const name = body?.['name'];

    const validationError = validateSnapshotName(name);
    if (validationError !== undefined) {
      res.status(400).json({ error: validationError });
      return;
    }

    // Path traversal check via path.resolve
    const resolved = path.resolve(snapshotBaseDir, name as string);
    if (!isWithinDir(snapshotBaseDir, resolved)) {
      res.status(400).json({ error: 'Snapshot name must not contain path traversal sequences.' });
      return;
    }

    const ir = host.getCachedIR();
    if (ir === undefined) {
      res.status(404).json({ error: 'No compiled IR available. POST /compile first.' });
      return;
    }

    // Serialize using claws-sdk's deterministic serializer to verify format
    serialize(ir);

    const snapshot: Snapshot = {
      name: name as string,
      timestamp: new Date().toISOString(),
      ir,
    };

    store.set(name as string, snapshot);

    clientManager?.broadcast(createEvent('snapshot:saved', {
      name: snapshot.name,
      timestamp: snapshot.timestamp,
    }));

    res.status(201).json({
      name: snapshot.name,
      timestamp: snapshot.timestamp,
    });
  });

  router.get('/diff', (req: Request, res: Response) => {
    const from = req.query['from'] as string | undefined;
    const to = req.query['to'] as string | undefined;

    if (from === undefined || to === undefined) {
      res.status(400).json({ error: 'Query parameters "from" and "to" are required.' });
      return;
    }

    const fromValidationError = validateSnapshotName(from);
    if (fromValidationError !== undefined) {
      res.status(400).json({ error: fromValidationError });
      return;
    }

    const toValidationError = validateSnapshotName(to);
    if (toValidationError !== undefined) {
      res.status(400).json({ error: toValidationError });
      return;
    }

    const fromSnapshot = store.get(from);
    if (fromSnapshot === undefined) {
      res.status(404).json({ error: `Snapshot "${from}" not found.` });
      return;
    }

    const toSnapshot = store.get(to);
    if (toSnapshot === undefined) {
      res.status(404).json({ error: `Snapshot "${to}" not found.` });
      return;
    }

    const diff: SnapshotDiff = {
      from,
      to,
      violations: diffViolations(fromSnapshot.ir, toSnapshot.ir),
      tensions: diffTensions(fromSnapshot.ir, toSnapshot.ir),
      riskShifts: diffRiskLevels(fromSnapshot.ir, toSnapshot.ir),
    };

    res.status(200).json(diff);
  });

  return router;
}
