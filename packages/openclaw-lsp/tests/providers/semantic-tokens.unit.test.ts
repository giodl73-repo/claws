/**
 * L0 unit tests for SemanticTokenProvider.
 *
 * 2 tests:
 *   1. R5 tool gets governance.risk.r5 token
 *   2. OBO declaration gets underline modifier
 */

import { describe, it, expect } from 'vitest';
import {
  TOKEN_TYPES,
  TOKEN_TYPE_INDEX,
  TOKEN_MODIFIERS,
  TOKEN_MODIFIER_MASK,
  RISK_LEVEL_TOKEN,
  RISK_LEVEL_COLORS,
  buildTokenLegend,
  encodeTokens,
  extractSemanticTokens,
  provideSemanticTokens,
  type RawSemanticToken,
} from '../../src/providers/semantic-tokens.js';

describe('SemanticTokenProvider', () => {
  it('assigns governance.risk.r5 token to a critical/R5 tool', () => {
    const content = '# Tools\nshell-exec: critical tool\nother-tool: safe';
    const tools = [
      { name: 'shell-exec', riskLevel: 'critical' },
    ];

    const tokens = extractSemanticTokens(content, tools, []);

    // Should find at least one token for shell-exec
    expect(tokens.length).toBeGreaterThanOrEqual(1);
    const r5Token = tokens.find((t) => t.tokenType === 'governance.risk.r5');
    expect(r5Token).toBeDefined();
    expect(r5Token!.line).toBe(1); // "shell-exec" on line 2 (0-based: 1)
    expect(r5Token!.startChar).toBe(0);
    expect(r5Token!.length).toBe('shell-exec'.length);
    expect(r5Token!.modifiers).toHaveLength(0);

    // Verify encoding produces valid LSP data
    const encoded = encodeTokens(tokens);
    expect(encoded.data.length).toBe(tokens.length * 5);
    // First token: deltaLine=1, deltaChar=0, length=10, typeIdx=4 (r5), modBits=0
    expect(encoded.data[0]).toBe(1); // deltaLine
    expect(encoded.data[1]).toBe(0); // deltaChar
    expect(encoded.data[2]).toBe(10); // length
    expect(encoded.data[3]).toBe(4); // token type index for r5
    expect(encoded.data[4]).toBe(0); // no modifiers
  });

  it('assigns governance.obo token with underline modifier to delegation targets', () => {
    const content = '# Delegation\ndelegate: sub-agent\nother line';
    const delegationMap = [
      { ruleId: 'DEL-01', target: 'sub-agent' },
    ];

    const tokens = extractSemanticTokens(content, [], delegationMap);

    // Should find at least one OBO token
    expect(tokens.length).toBeGreaterThanOrEqual(1);
    const oboToken = tokens.find((t) => t.tokenType === 'governance.obo');
    expect(oboToken).toBeDefined();
    expect(oboToken!.line).toBe(1); // "sub-agent" on line 2 (0-based: 1)
    expect(oboToken!.startChar).toBe(content.split('\n')[1]!.indexOf('sub-agent'));
    expect(oboToken!.length).toBe('sub-agent'.length);
    expect(oboToken!.modifiers).toContain('underline');

    // Verify encoding produces underline bitmask
    const encoded = encodeTokens(tokens);
    // Token modifier bits: underline = idx 1 → bitmask 0b10 = 2
    expect(encoded.data[4]).toBe(2); // underline modifier bit
  });

  it('registers all 5 risk-level token types plus OBO', () => {
    expect(TOKEN_TYPES).toHaveLength(6);
    expect(TOKEN_TYPES[0]).toBe('governance.risk.r1');
    expect(TOKEN_TYPES[1]).toBe('governance.risk.r2');
    expect(TOKEN_TYPES[2]).toBe('governance.risk.r3');
    expect(TOKEN_TYPES[3]).toBe('governance.risk.r4');
    expect(TOKEN_TYPES[4]).toBe('governance.risk.r5');
    expect(TOKEN_TYPES[5]).toBe('governance.obo');
  });

  it('token type indices are correct', () => {
    expect(TOKEN_TYPE_INDEX['governance.risk.r1']).toBe(0);
    expect(TOKEN_TYPE_INDEX['governance.risk.r2']).toBe(1);
    expect(TOKEN_TYPE_INDEX['governance.risk.r3']).toBe(2);
    expect(TOKEN_TYPE_INDEX['governance.risk.r4']).toBe(3);
    expect(TOKEN_TYPE_INDEX['governance.risk.r5']).toBe(4);
    expect(TOKEN_TYPE_INDEX['governance.obo']).toBe(5);
  });

  it('modifier bitmasks are correct', () => {
    expect(TOKEN_MODIFIER_MASK['declaration']).toBe(1);
    expect(TOKEN_MODIFIER_MASK['underline']).toBe(2);
  });

  it('risk level token mapping covers r1-r5', () => {
    expect(RISK_LEVEL_TOKEN[1]).toBe('governance.risk.r1');
    expect(RISK_LEVEL_TOKEN[2]).toBe('governance.risk.r2');
    expect(RISK_LEVEL_TOKEN[3]).toBe('governance.risk.r3');
    expect(RISK_LEVEL_TOKEN[4]).toBe('governance.risk.r4');
    expect(RISK_LEVEL_TOKEN[5]).toBe('governance.risk.r5');
  });

  it('risk level colors follow green/blue/yellow/orange/red progression', () => {
    expect(RISK_LEVEL_COLORS[1]).toBe('green');
    expect(RISK_LEVEL_COLORS[2]).toBe('blue');
    expect(RISK_LEVEL_COLORS[3]).toBe('yellow');
    expect(RISK_LEVEL_COLORS[4]).toBe('orange');
    expect(RISK_LEVEL_COLORS[5]).toBe('red');
  });

  it('buildTokenLegend returns correct legend structure', () => {
    const legend = buildTokenLegend();
    expect(legend.tokenTypes).toHaveLength(6);
    expect(legend.tokenModifiers).toHaveLength(2);
    expect(legend.tokenTypes).toEqual([...TOKEN_TYPES]);
    expect(legend.tokenModifiers).toEqual([...TOKEN_MODIFIERS]);
  });

  it('encodeTokens uses relative encoding correctly', () => {
    const tokens: RawSemanticToken[] = [
      { line: 1, startChar: 5, length: 8, tokenType: 'governance.risk.r3', modifiers: [] },
      { line: 1, startChar: 20, length: 6, tokenType: 'governance.risk.r1', modifiers: ['declaration'] },
      { line: 3, startChar: 0, length: 10, tokenType: 'governance.obo', modifiers: ['underline'] },
    ];

    const encoded = encodeTokens(tokens);
    expect(encoded.data).toHaveLength(15); // 3 tokens * 5 values

    // Token 1: deltaLine=1, deltaChar=5, len=8, type=2 (r3), mod=0
    expect(encoded.data[0]).toBe(1);
    expect(encoded.data[1]).toBe(5);
    expect(encoded.data[2]).toBe(8);
    expect(encoded.data[3]).toBe(2);
    expect(encoded.data[4]).toBe(0);

    // Token 2: deltaLine=0, deltaChar=15 (20-5), len=6, type=0 (r1), mod=1 (declaration)
    expect(encoded.data[5]).toBe(0);
    expect(encoded.data[6]).toBe(15);
    expect(encoded.data[7]).toBe(6);
    expect(encoded.data[8]).toBe(0);
    expect(encoded.data[9]).toBe(1);

    // Token 3: deltaLine=2, deltaChar=0, len=10, type=5 (obo), mod=2 (underline)
    expect(encoded.data[10]).toBe(2);
    expect(encoded.data[11]).toBe(0);
    expect(encoded.data[12]).toBe(10);
    expect(encoded.data[13]).toBe(5);
    expect(encoded.data[14]).toBe(2);
  });

  it('encodeTokens sorts tokens by line then character', () => {
    // Provide tokens out of order
    const tokens: RawSemanticToken[] = [
      { line: 3, startChar: 0, length: 5, tokenType: 'governance.risk.r1', modifiers: [] },
      { line: 1, startChar: 10, length: 5, tokenType: 'governance.risk.r2', modifiers: [] },
      { line: 1, startChar: 0, length: 5, tokenType: 'governance.risk.r3', modifiers: [] },
    ];

    const encoded = encodeTokens(tokens);
    // Should be sorted: (1,0), (1,10), (3,0)
    expect(encoded.data[0]).toBe(1);  // deltaLine from 0 to 1
    expect(encoded.data[1]).toBe(0);  // startChar 0
    expect(encoded.data[3]).toBe(2);  // r3

    expect(encoded.data[5]).toBe(0);  // same line
    expect(encoded.data[6]).toBe(10); // deltaChar from 0 to 10
    expect(encoded.data[8]).toBe(1);  // r2

    expect(encoded.data[10]).toBe(2); // deltaLine from 1 to 3
    expect(encoded.data[11]).toBe(0); // startChar 0
    expect(encoded.data[13]).toBe(0); // r1
  });

  it('encodeTokens skips unknown token types', () => {
    const tokens: RawSemanticToken[] = [
      { line: 0, startChar: 0, length: 5, tokenType: 'governance.risk.r1', modifiers: [] },
      { line: 1, startChar: 0, length: 5, tokenType: 'unknown.type', modifiers: [] },
    ];

    const encoded = encodeTokens(tokens);
    // Only the first token should be encoded
    expect(encoded.data).toHaveLength(5);
  });

  it('encodeTokens handles unknown modifier names gracefully', () => {
    const tokens: RawSemanticToken[] = [
      { line: 0, startChar: 0, length: 5, tokenType: 'governance.risk.r1', modifiers: ['unknown-mod'] },
    ];

    const encoded = encodeTokens(tokens);
    // Unknown modifier contributes 0 to the bitmask
    expect(encoded.data[4]).toBe(0);
  });

  it('extractSemanticTokens maps risk level strings correctly', () => {
    const content = 'toolA\ntoolB\ntoolC\ntoolD\ntoolE';
    const tools = [
      { name: 'toolA', riskLevel: 'low' },
      { name: 'toolB', riskLevel: 'r2' },
      { name: 'toolC', riskLevel: 'medium' },
      { name: 'toolD', riskLevel: 'high' },
      { name: 'toolE', riskLevel: '5' },
    ];

    const tokens = extractSemanticTokens(content, tools, []);
    expect(tokens).toHaveLength(5);

    expect(tokens.find((t) => t.line === 0)!.tokenType).toBe('governance.risk.r2'); // low → r2
    expect(tokens.find((t) => t.line === 1)!.tokenType).toBe('governance.risk.r2'); // r2 → r2
    expect(tokens.find((t) => t.line === 2)!.tokenType).toBe('governance.risk.r3'); // medium → r3
    expect(tokens.find((t) => t.line === 3)!.tokenType).toBe('governance.risk.r4'); // high → r4
    expect(tokens.find((t) => t.line === 4)!.tokenType).toBe('governance.risk.r5'); // 5 → r5
  });

  it('extractSemanticTokens finds multiple occurrences of a tool name', () => {
    const content = 'shell is used here\nshell is used again';
    const tools = [{ name: 'shell', riskLevel: 'critical' }];

    const tokens = extractSemanticTokens(content, tools, []);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]!.line).toBe(0);
    expect(tokens[1]!.line).toBe(1);
  });

  it('extractSemanticTokens skips unknown risk levels', () => {
    const content = 'unknownTool';
    const tools = [{ name: 'unknownTool', riskLevel: 'exotic' }];

    const tokens = extractSemanticTokens(content, tools, []);
    expect(tokens).toHaveLength(0);
  });

  it('extractSemanticTokens skips delegation entries without target', () => {
    const content = 'some content';
    const delegationMap: unknown[] = [
      'not-an-object',
      { ruleId: 'DEL-01' }, // no target
      null,
    ];

    const tokens = extractSemanticTokens(content, [], delegationMap);
    expect(tokens).toHaveLength(0);
  });

  it('provideSemanticTokens returns fully encoded result', () => {
    const content = '# Tools\ndanger-tool is R5\ndelegate: bot-agent';
    const tools = [{ name: 'danger-tool', riskLevel: 'r5' }];
    const delegationMap = [{ ruleId: 'DEL-01', target: 'bot-agent' }];

    const result = provideSemanticTokens(content, tools, delegationMap);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.length % 5).toBe(0);
  });

  it('encodeTokens handles empty input', () => {
    const encoded = encodeTokens([]);
    expect(encoded.data).toHaveLength(0);
  });

  it('encodeTokens combines multiple modifiers', () => {
    const tokens: RawSemanticToken[] = [
      { line: 0, startChar: 0, length: 5, tokenType: 'governance.obo', modifiers: ['declaration', 'underline'] },
    ];

    const encoded = encodeTokens(tokens);
    // declaration = 0b01 = 1, underline = 0b10 = 2, combined = 0b11 = 3
    expect(encoded.data[4]).toBe(3);
  });
});
