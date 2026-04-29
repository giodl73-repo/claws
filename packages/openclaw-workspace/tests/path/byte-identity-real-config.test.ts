/**
 * Byte-identity test against `JSON.stringify(_, null, 2)`-shaped configs.
 *
 * Replicates the input shape that io.write-config.test.ts uses (lines
 * 525, 544, 598, 624 do byte-compare assertions of the form
 * `expect(fs.readFile(...)).toBe(${JSON.stringify(cfg, null, 2)}\n)`).
 *
 * If our `emitJsoncWithMutation` doesn't produce byte-identical output
 * to today's `JSON.stringify(cfg, null, 2).trimEnd().concat("\n")` for
 * a no-op mutation on plain JSON, the upstream tests will fail and the
 * PR can't claim F-83/F-84 backward compat.
 *
 * Three scenarios:
 *
 * 1. **No-op mutation**: input was produced by `JSON.stringify`, no
 *    leaves change. Our `emitJsoncWithMutation(doc, () => undefined)`
 *    must return the input verbatim.
 *
 * 2. **Leaf-value update**: input is `JSON.stringify(prev, null, 2)`,
 *    mutator changes one leaf. Output must equal
 *    `JSON.stringify(next, null, 2)` byte-for-byte.
 *
 * 3. **Add new key**: input is the prev config; new config has a key
 *    not in prev. THIS IS NOT SUPPORTED by our current emit. We assert
 *    the limitation and document the scope.
 */

import { describe, it, expect } from 'vitest';
import { parseJsonc } from '../../src/ast/jsonc/parse.js';
import { emitJsonc, emitJsoncWithMutation } from '../../src/ast/jsonc/emit.js';

// Shape modeled after io.write-config.test.ts:519-520 + :337
const sampleConfigA = {
  $schema: 'https://openclaw.ai/config.json',
  gateway: { mode: 'local', port: 18789 },
  agents: { list: [{ id: 'main', default: true }, { id: 'discord-dm' }] },
  channels: { telegram: { enabled: true, dmPolicy: 'pairing' } },
};

const sampleConfigB = {
  $schema: 'https://openclaw.ai/config.json',
  gateway: { mode: 'local', port: 18790 }, // port changed
  agents: { list: [{ id: 'main', default: true }, { id: 'discord-dm' }] },
  channels: { telegram: { enabled: true, dmPolicy: 'pairing' } },
};

describe('byte-identity against JSON.stringify-shape input', () => {
  it('no-op mutation returns input verbatim (parse → emit pristine)', () => {
    const stringified = JSON.stringify(sampleConfigA, null, 2);
    const onDisk = `${stringified}\n`; // io.test shape
    const doc = parseJsonc(onDisk);
    const out = emitJsonc(doc);
    expect(out).toBe(onDisk);
  });

  it('emitJsoncWithMutation no-op returns input verbatim', () => {
    const onDisk = `${JSON.stringify(sampleConfigA, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    const out = emitJsoncWithMutation(doc, () => undefined);
    expect(out).toBe(onDisk);
  });

  it('leaf-value mutation: changing gateway.port produces byte-identical output to stringify(next)', () => {
    const onDisk = `${JSON.stringify(sampleConfigA, null, 2)}\n`;
    const expectedAfter = `${JSON.stringify(sampleConfigB, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    // Mutator returns 18790 for the gateway.port leaf.
    const out = emitJsoncWithMutation(doc, (path, current) => {
      if (path.length === 2 && path[0] === 'gateway' && path[1] === 'port' && current === 18789) {
        return 18790;
      }
      return undefined;
    });
    if (out !== expectedAfter) {
      // Print first divergence for debugging
      const minLen = Math.min(out.length, expectedAfter.length);
      let firstDiff = -1;
      for (let i = 0; i < minLen; i++) {
        if (out[i] !== expectedAfter[i]) {
          firstDiff = i;
          break;
        }
      }
      console.error(`First diff at offset ${firstDiff}:`);
      console.error(`  ours:     ${JSON.stringify(out.slice(Math.max(0, firstDiff - 10), firstDiff + 30))}`);
      console.error(`  expected: ${JSON.stringify(expectedAfter.slice(Math.max(0, firstDiff - 10), firstDiff + 30))}`);
    }
    expect(out).toBe(expectedAfter);
  });

  it('LIMITATION DOCUMENTED: adding a new key is not supported by leaf-mutator', () => {
    // Input has no `agents.defaultAgent` field
    const prev = { gateway: { mode: 'local' }, agents: { list: [] } };
    const onDisk = `${JSON.stringify(prev, null, 2)}\n`;
    const doc = parseJsonc(onDisk);
    // Our mutator can change existing leaves, NOT add new keys.
    const out = emitJsoncWithMutation(doc, () => undefined);
    // Because no leaf changed, output is the input verbatim. This is
    // correct for the leaf-mutation API — but the API can't represent
    // "add a new key" today. Documenting the gap; structural-mutation
    // emit would be a follow-up addition (~150 LOC) if upstream needs
    // it for full `replaceConfigFile` parity.
    expect(out).toBe(onDisk);
  });

  it('JSONC with comments: round-trip preserves user comments', () => {
    const jsonc = `{
  // bumped from beta to stable
  "gateway": {
    "mode": "local",
    "port": 18789
  }
}
`;
    const doc = parseJsonc(jsonc);
    const out = emitJsonc(doc);
    expect(out).toBe(jsonc);
  });

  it('JSONC with comments + leaf mutation: comments survive', () => {
    const jsonc = `{
  // bumped from beta to stable
  "gateway": {
    "mode": "local",
    "port": 18789
  }
}
`;
    const doc = parseJsonc(jsonc);
    const out = emitJsoncWithMutation(doc, (path) => {
      if (path.length === 2 && path[0] === 'gateway' && path[1] === 'port') {
        return 18790;
      }
      return undefined;
    });
    const expected = jsonc.replace('18789', '18790');
    expect(out).toBe(expected);
  });
});
