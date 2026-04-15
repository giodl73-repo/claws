/**
 * `claws keys` command — generate, list, rotate, and revoke governance keys.
 *
 * Thin CLI adapter: calls SDK key management functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/keys
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  generateKey,
  createStorage,
  registerKey,
  listKeys,
  rotateKey,
  revokeKey,
  shamirReconstruct,
  recordParticipant,
  deriveSingleDevKey,
  initCeremony,
  recordCeremonyInitiated,
  recordShareDistributed,
  recordKeyReconstructed,
} from '@bic/claws-sdk/keys';
import type { KeyAlgorithm, StorageTier, CeremonyShare } from '@bic/claws-sdk/keys';

/**
 * Options for the keys generate subcommand.
 */
export interface KeysGenerateOptions {
  readonly json: boolean;
  readonly algorithm: KeyAlgorithm;
  readonly storage: StorageTier;
}

/**
 * Options for the keys list subcommand.
 */
export interface KeysListOptions {
  readonly json: boolean;
}

/**
 * Run `claws keys generate`.
 *
 * Generates a key, persists it to the selected storage tier,
 * and registers metadata in the key registry.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param opts - Command options
 * @returns Exit code (0=success, 1=error)
 */
export async function runKeysGenerate(
  workspaceRoot: string,
  opts: KeysGenerateOptions,
): Promise<number> {
  try {
    const generated = generateKey(opts.algorithm);
    const storage = createStorage(opts.storage, workspaceRoot);

    // Register in the metadata registry first to get the key ID
    const entry = await registerKey(workspaceRoot, {
      algorithm: opts.algorithm,
      storageTier: opts.storage,
    });

    // Persist key material to the storage backend
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    if (opts.json) {
      console.log(JSON.stringify({
        status: 'created',
        id: entry.id,
        algorithm: entry.algorithm,
        storageTier: entry.storageTier,
        createdAt: entry.createdAt,
      }));
    } else {
      console.log(`Key generated: ${entry.id}`);
      console.log(`  algorithm: ${entry.algorithm}`);
      console.log(`  storage:   ${entry.storageTier}`);
      console.log(`  created:   ${entry.createdAt}`);
    }

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}

/**
 * Run `claws keys list`.
 *
 * Lists all keys from the registry with metadata columns.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param opts - Command options
 * @returns Exit code (0=success, 1=error)
 */
export async function runKeysList(
  workspaceRoot: string,
  opts: KeysListOptions,
): Promise<number> {
  try {
    const result = await listKeys(workspaceRoot);

    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok', keys: result.keys }));
    } else {
      console.log(result.table);
    }

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}

/**
 * Options for the keys rotate subcommand.
 */
export interface KeysRotateOptions {
  readonly json: boolean;
}

/**
 * Run `claws keys rotate [keyId]`.
 *
 * Rotates a key: generates new version, re-signs compiled artifacts,
 * and archives the old key.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param keyId - ID of the key to rotate
 * @param opts - Command options
 * @returns Exit code (0=success, 1=error)
 */
export async function runKeysRotate(
  workspaceRoot: string,
  keyId: string,
  opts: KeysRotateOptions,
): Promise<number> {
  try {
    const result = await rotateKey(workspaceRoot, keyId);

    if (opts.json) {
      console.log(JSON.stringify({
        status: 'rotated',
        id: result.entry.id,
        version: result.entry.version,
        previousVersion: result.previousVersion,
        artifactsReSigned: result.artifactsReSigned,
        rotatedAt: result.entry.rotatedAt,
      }));
    } else {
      console.log(`Key rotated: ${result.entry.id}`);
      console.log(`  version:    ${result.previousVersion} → ${result.entry.version}`);
      console.log(`  re-signed:  ${result.artifactsReSigned} artifact(s)`);
      console.log(`  rotated at: ${result.entry.rotatedAt}`);
    }

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}

/**
 * Options for the keys revoke subcommand.
 */
export interface KeysRevokeOptions {
  readonly json: boolean;
  readonly reason: string;
}

/**
 * Run `claws keys revoke [keyId]`.
 *
 * Revokes a key: marks as revoked in the registry and appends
 * a REVOKE event to the audit chain.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param keyId - ID of the key to revoke
 * @param opts - Command options
 * @returns Exit code (0=success, 1=error)
 */
export async function runKeysRevoke(
  workspaceRoot: string,
  keyId: string,
  opts: KeysRevokeOptions,
): Promise<number> {
  try {
    const result = await revokeKey(workspaceRoot, keyId, opts.reason);

    if (opts.json) {
      console.log(JSON.stringify({
        status: 'revoked',
        id: result.entry.id,
        revokedAt: result.revokedAt,
        reason: opts.reason,
      }));
    } else {
      console.log(`Key revoked: ${result.entry.id}`);
      console.log(`  revoked at: ${result.revokedAt}`);
      console.log(`  reason:     ${opts.reason}`);
    }

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}

/**
 * Options for the keys ceremony init subcommand.
 */
export interface KeysCeremonyInitOptions {
  readonly json: boolean;
  readonly shares?: number | undefined;
  readonly threshold?: number | undefined;
  readonly outputDir?: string | undefined;
  readonly singleDev?: boolean | undefined;
  readonly passphrase?: string | undefined;
  readonly salt?: string | undefined;
  readonly participants?: readonly string[] | undefined;
}

/**
 * Run `claws keys ceremony init --shares N --threshold M`.
 *
 * Generates key material internally (via SDK), splits into N shares with
 * threshold M, and writes each share to a separate file in --output-dir.
 * Share data is NEVER printed to stdout — only file paths and indices.
 * In single-dev mode, derives a key from a passphrase instead.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param opts - Command options
 * @returns Exit code (0=success, 1=error)
 */
export async function runKeysCeremonyInit(
  workspaceRoot: string,
  opts: KeysCeremonyInitOptions,
): Promise<number> {
  try {
    // Single-developer bypass
    if (opts.singleDev) {
      if (!opts.passphrase) {
        throw new Error('--passphrase is required in single-dev mode');
      }
      const result = deriveSingleDevKey(opts.passphrase, opts.salt ?? workspaceRoot);

      if (opts.json) {
        console.log(JSON.stringify({
          status: 'derived',
          mode: 'single-dev',
          algorithm: result.algorithm,
        }));
      } else {
        console.log('Single-developer key derived');
        console.log(`  algorithm: ${result.algorithm}`);
      }
      return 0;
    }

    // Validate M-of-N options
    if (opts.shares == null || opts.threshold == null) {
      throw new Error('--shares and --threshold are required for M-of-N ceremony');
    }

    // M-of-N ceremony — key material generated internally by SDK
    const result = await initCeremony(workspaceRoot, {
      totalShares: opts.shares,
      threshold: opts.threshold,
    });

    // Record ceremony initiation to audit chain
    await recordCeremonyInitiated(workspaceRoot, result.ceremonyId, result.totalShares, result.threshold);

    // Write each share to a separate file — NEVER print share data to stdout
    const outputDir = opts.outputDir ?? join(workspaceRoot, '.claws', 'ceremony');
    await mkdir(outputDir, { recursive: true });

    const shareFiles: Array<{ index: number; path: string }> = [];
    const participants = opts.participants ?? [];
    for (let i = 0; i < result.shares.length; i++) {
      const share = result.shares[i]!;
      const identity = participants[i] ?? `participant-${share.index}`;
      const participant = recordParticipant(identity, share.index);
      await recordShareDistributed(workspaceRoot, result.ceremonyId, participant);

      // Write share to file
      const sharePath = join(outputDir, `share-${share.index}.json`);
      await writeFile(sharePath, JSON.stringify({
        ceremonyId: result.ceremonyId,
        index: share.index,
        data: share.data,
        keyHash: result.keyHash,
        participant: identity,
      }, null, 2), 'utf-8');
      shareFiles.push({ index: share.index, path: sharePath });
    }

    if (opts.json) {
      console.log(JSON.stringify({
        status: 'split',
        ceremonyId: result.ceremonyId,
        keyId: result.keyId,
        totalShares: result.totalShares,
        threshold: result.threshold,
        keyHash: result.keyHash,
        shares: shareFiles.map((s) => ({ index: s.index, path: s.path })),
      }));
    } else {
      console.log(`Ceremony initialized: ${result.ceremonyId}`);
      console.log(`  key ID:    ${result.keyId}`);
      console.log(`  shares:    ${result.totalShares}`);
      console.log(`  threshold: ${result.threshold}`);
      console.log(`  key hash:  ${result.keyHash}`);
      console.log(`  output:    ${outputDir}`);
      for (const sf of shareFiles) {
        console.log(`  share ${sf.index}: ${sf.path}`);
      }
    }

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}

/**
 * Options for the keys ceremony reconstruct subcommand.
 */
export interface KeysCeremonyReconstructOptions {
  readonly json: boolean;
  readonly shares: readonly CeremonyShare[];
  readonly expectedHash: string;
  readonly ceremonyId: string;
}

/**
 * Run `claws keys ceremony reconstruct`.
 *
 * Reconstructs a root key from M or more shares and verifies integrity.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param opts - Command options
 * @returns Exit code (0=success, 1=error)
 */
export async function runKeysCeremonyReconstruct(
  workspaceRoot: string,
  opts: KeysCeremonyReconstructOptions,
): Promise<number> {
  try {
    const result = shamirReconstruct(opts.shares, opts.expectedHash);

    // Record reconstruction event to audit chain
    await recordKeyReconstructed(
      workspaceRoot,
      opts.ceremonyId,
      opts.shares.length,
      result.verified,
    );

    if (opts.json) {
      console.log(JSON.stringify({
        status: result.verified ? 'reconstructed' : 'mismatch',
        verified: result.verified,
        ceremonyId: opts.ceremonyId,
      }));
    } else {
      if (result.verified) {
        console.log('Key reconstructed and verified');
      } else {
        console.log('Key reconstructed but hash mismatch — verification failed');
      }
      console.log(`  ceremony: ${opts.ceremonyId}`);
      console.log(`  shares:   ${opts.shares.length}`);
      console.log(`  verified: ${result.verified}`);
    }

    return result.verified ? 0 : 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}
