/**
 * L0: LangGraph marker detection — langgraph.json, JS/Python variant.
 */

import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectLangGraph, getLangGraphVariant } from '../../../src/detect/markers/langgraph.js';

describe('detectLangGraph', () => {
  it('detects langgraph.json and identifies Python variant', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-langgraph-'));
    try {
      await writeFile(join(tmp, 'langgraph.json'), JSON.stringify({ language: 'python' }));
      const result = await detectLangGraph(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('langgraph');
      expect(result!.confidence).toBe(1.0);
      expect(result!.enforcement).toBe('full');
      expect(result!.defaultTrustTier).toBe(2);
      expect(result!.variant).toBe('Python');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('identifies JS variant', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-langgraph-js-'));
    try {
      await writeFile(join(tmp, 'langgraph.json'), JSON.stringify({ language: 'javascript' }));
      const result = await detectLangGraph(tmp);
      expect(result).not.toBeNull();
      expect(result!.variant).toBe('JS');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects without variant when language field is absent', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-langgraph-nolang-'));
    try {
      await writeFile(join(tmp, 'langgraph.json'), JSON.stringify({ graphs: [] }));
      const result = await detectLangGraph(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('langgraph');
      expect(result!.variant).toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects even when JSON is malformed', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-langgraph-bad-'));
    try {
      await writeFile(join(tmp, 'langgraph.json'), 'not valid json');
      const result = await detectLangGraph(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('langgraph');
      expect(result!.variant).toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns null when langgraph.json does not exist', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-langgraph-empty-'));
    try {
      const result = await detectLangGraph(tmp);
      expect(result).toBeNull();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('getLangGraphVariant', () => {
  it('returns Python variant from file', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-lgv-'));
    try {
      await writeFile(join(tmp, 'langgraph.json'), JSON.stringify({ language: 'python' }));
      const variant = await getLangGraphVariant(tmp);
      expect(variant).toBe('Python variant');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns JS variant from pre-read content', async () => {
    const variant = await getLangGraphVariant('/nonexistent', JSON.stringify({ language: 'javascript' }));
    expect(variant).toBe('JS variant');
  });

  it('returns undefined when no language field', async () => {
    const variant = await getLangGraphVariant('/nonexistent', JSON.stringify({ graphs: [] }));
    expect(variant).toBeUndefined();
  });

  it('returns undefined for invalid JSON content', async () => {
    const variant = await getLangGraphVariant('/nonexistent', 'not json');
    expect(variant).toBeUndefined();
  });

  it('returns undefined when file does not exist', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-lgv-empty-'));
    try {
      const variant = await getLangGraphVariant(tmp);
      expect(variant).toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
