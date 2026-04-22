/**
 * Manifest-runner — reads `accept/manifest.yaml`, discovers fixtures by
 * marker file, dispatches each to its declared runner. Emits one vitest
 * `describe` per series and one `it` per fixture.
 *
 * See pulse 47 D2 + D3: every fixture under `test/e2e/fixtures/{id}` whose
 * series matches a manifest entry runs through the runner in that entry.
 *
 * Series `min` is a floor on fixture count — the manifest runner asserts
 * the discovered set is at least that large so we can't silently degrade
 * acceptance coverage by dropping a fixture.yaml.
 *
 * @module test/e2e/accept/manifest-runner
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { runE2eLoopSim, type FixtureManifest } from './runners/e2e-loop-sim.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(HERE, '..', 'fixtures');

interface SeriesSpec {
  readonly runners: readonly string[];
  readonly min: number;
  readonly marker: string;
}

interface TopManifest {
  readonly series: Readonly<Record<string, SeriesSpec>>;
}

export function runFromManifest(manifestPath: string): void {
  const top = parseYaml(readFileSync(manifestPath, 'utf8')) as TopManifest;

  for (const [seriesName, spec] of Object.entries(top.series)) {
    const discovered = discoverFixturesForSeries(seriesName, spec.marker);

    describe(`accept series ${seriesName}`, () => {
      it(`discovers at least ${spec.min} fixtures`, () => {
        expect(discovered.length).toBeGreaterThanOrEqual(spec.min);
      });

      for (const fixture of discovered) {
        it(`[${fixture.scenarioCode}] ${fixture.fixtureId} via ${spec.runners[0]}`, async () => {
          const runner = spec.runners[0];
          if (runner !== 'e2e-loop-sim') {
            throw new Error(`unknown runner: ${runner ?? '(missing)'}`);
          }
          const report = await runE2eLoopSim(fixture);
          expect(report.ok).toBe(true);
        });
      }
    });
  }
}

function discoverFixturesForSeries(
  seriesName: string,
  markerFile: string,
): readonly FixtureManifest[] {
  const fixtures: FixtureManifest[] = [];
  for (const entry of readdirSync(FIXTURES_ROOT)) {
    const dir = join(FIXTURES_ROOT, entry);
    if (!statSync(dir).isDirectory()) continue;
    const marker = join(dir, markerFile);
    let raw: string;
    try {
      raw = readFileSync(marker, 'utf8');
    } catch {
      continue;
    }
    const parsed = parseYaml(raw) as FixtureManifest & {
      readonly series?: string;
    };
    if (parsed.series !== seriesName) continue;
    fixtures.push({ ...parsed, fixtureDir: dir });
  }
  return fixtures.sort((a, b) => a.scenarioCode.localeCompare(b.scenarioCode));
}
