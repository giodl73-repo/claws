/**
 * `claws publish` command — publish a skill to the registry.
 *
 * Thin CLI adapter: calls publish SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/publish
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  detectManifestState,
  evaluateFleetPolicy,
  readFleetPublishPolicy,
  executeTransaction,
  resolveSigningKey,
  readFreshBadge,
  writeBadgeVersion,
} from '@bic/claws-sdk/publish';
import type {
  RegistryClient,
  StagedArtifact,
} from '@bic/claws-sdk/publish';
import { loadConfig } from '@bic/claws-sdk/config';

/**
 * Options for the publish command.
 */
export interface PublishOptions {
  readonly json: boolean;
  readonly dryRun: boolean;
  readonly registry?: string | undefined;
}

/**
 * Default registry URL.
 */
const DEFAULT_REGISTRY = 'https://registry.claws.dev/v1/publish';

/**
 * Create a registry client for the given URL.
 *
 * In dry-run mode, returns a no-op client that always succeeds.
 */
function createRegistryClient(registryUrl: string, dryRun: boolean): RegistryClient {
  /* istanbul ignore next -- dry-run path returns before createRegistryClient is called */
  if (dryRun) {
    return {
      async submit(_txId: string, _artifacts: readonly StagedArtifact[]): Promise<number> {
        return 200;
      },
    };
  }

  return {
    async submit(txId: string, artifacts: readonly StagedArtifact[]): Promise<number> {
      const body = JSON.stringify({ txId, artifacts });
      const response = await fetch(registryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      return response.status;
    },
  };
}

/**
 * Run the `claws publish` command.
 *
 * Pipeline:
 * 1. Resolve signing key
 * 2. Detect manifest state
 * 3. Evaluate fleet policy
 * 4. Read fresh badge data
 * 5. Execute two-phase publish transaction (or report dry-run)
 * 6. Write badge version
 *
 * @param workspaceRoot - Workspace root
 * @param skillDir - Skill directory to publish
 * @param opts - Command options
 * @returns Exit code (0=success, 1=error, 2=policy blocked)
 */
export async function runPublish(
  workspaceRoot: string,
  skillDir: string,
  opts: PublishOptions,
): Promise<number> {
  const registryUrl = opts.registry ?? DEFAULT_REGISTRY;

  try {
    // Step 1: Resolve signing key
    const keyResult = await resolveSigningKey(workspaceRoot);
    if (!keyResult) {
      const msg = 'No signing key found. Generate one with `claws keys generate`.';
      if (opts.json) {
        console.log(JSON.stringify({ status: 'error', message: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      return 1;
    }

    // Step 2: Detect manifest state
    const manifestResult = await detectManifestState(skillDir, keyResult.keyMaterial);
    const tier = manifestResult.manifest?.tier ?? 'declared';

    // Step 3: Load fleet publish policy from workspace config
    const configResult = await loadConfig(workspaceRoot);
    const fleetPublishConfig = configResult.config.fleet.publish;
    const policy = readFleetPublishPolicy(fleetPublishConfig);
    const policyResult = evaluateFleetPolicy(tier, policy, opts.dryRun);

    if (!policyResult.allowed) {
      if (opts.json) {
        console.log(JSON.stringify({
          status: 'blocked',
          reason: policyResult.reason,
          tier,
          policy: policyResult.policy,
        }));
      } else {
        console.error(`Blocked: ${policyResult.reason}`);
      }
      return 2;
    }

    // Step 4: Read fresh badge data
    const version = `1.0.0-${Date.now()}`;
    const badge = await readFreshBadge(skillDir, version);

    // Step 5: Build artifacts and execute transaction
    let manifestContent: string;
    try {
      manifestContent = await readFile(join(skillDir, 'skill.yaml'), 'utf-8');
    } catch {
      const msg = 'No skill.yaml found in skill directory.';
      if (opts.json) {
        console.log(JSON.stringify({ status: 'error', message: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      return 1;
    }

    const artifacts: StagedArtifact[] = [
      { name: 'skill.yaml', content: manifestContent },
    ];

    if (badge) {
      artifacts.push({ name: 'badge.json', content: JSON.stringify(badge, null, 2) });
    }

    if (opts.dryRun) {
      // Dry-run: report what would happen
      if (opts.json) {
        console.log(JSON.stringify({
          status: 'dry-run',
          manifestState: manifestResult.state,
          tier,
          keySource: keyResult.source,
          keyId: keyResult.keyId,
          policyAllowed: policyResult.allowed,
          dryRunBypass: policyResult.dryRunBypass,
          registry: registryUrl,
          artifacts: artifacts.map((a) => a.name),
          badge: badge ?? null,
        }));
      } else {
        console.log('Dry-run publish report:');
        console.log(`  Manifest state: ${manifestResult.state}`);
        console.log(`  Tier: ${tier}`);
        console.log(`  Signing key: ${keyResult.keyId} (${keyResult.source})`);
        console.log(`  Policy: ${policyResult.allowed ? 'allowed' : 'blocked'}${policyResult.dryRunBypass ? ' (dry-run bypass)' : ''}`);
        console.log(`  Registry: ${registryUrl}`);
        console.log(`  Artifacts: ${artifacts.map((a) => a.name).join(', ')}`);
        if (badge) {
          console.log(`  Badge: ${badge.risk} (${badge.tier})`);
        }
      }
      return 0;
    }

    // Real publish
    const client = createRegistryClient(registryUrl, false);
    const txResult = await executeTransaction(workspaceRoot, artifacts, client);

    // Step 6: Write badge version on success
    if (txResult.state === 'committed' && badge) {
      await writeBadgeVersion(skillDir, badge);
    }

    if (opts.json) {
      console.log(JSON.stringify({
        status: txResult.state,
        txId: txResult.txId,
        manifestState: manifestResult.state,
        tier,
        keySource: keyResult.source,
        artifactCount: txResult.artifactCount,
        remoteStatus: txResult.remoteStatus,
        summary: txResult.summary,
      }));
    } else {
      if (txResult.state === 'committed') {
        console.log(`Published successfully: ${txResult.txId}`);
        console.log(`  Artifacts: ${txResult.artifactCount}`);
        console.log(`  Key: ${keyResult.keyId} (${keyResult.source})`);
        console.log(`  Registry: ${registryUrl}`);
      } else {
        console.error(`Publish failed: ${txResult.summary}`);
      }
    }

    return txResult.state === 'committed' ? 0 : 1;
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
