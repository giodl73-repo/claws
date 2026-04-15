/**
 * L0 unit tests for OBO auto-suggestion in scaffold.
 *
 * P32: OBO hint detection reuses annotate heuristics from P31.
 */

import { describe, it, expect } from 'vitest';

import { detectOboFromName } from '@bic/claws-sdk/scaffold';

describe('detectOboFromName', () => {
  it('detects OBO for "send-invoice" (send keyword)', () => {
    const result = detectOboFromName('send-invoice');

    expect(result.detected).toBe(true);
    expect(result.matchedKeywords).toContain('send');
    expect(result.hints.length).toBeGreaterThan(0);
    expect(result.hints.some(h => h.includes('send'))).toBe(true);
    expect(result.hints.some(h => h.includes('@Obo()'))).toBe(true);
  });

  it('detects OBO for "email-report" (email keyword)', () => {
    const result = detectOboFromName('email-report');

    expect(result.detected).toBe(true);
    expect(result.matchedKeywords).toContain('email');
  });

  it('detects OBO for "purchase-item" (purchase keyword)', () => {
    const result = detectOboFromName('purchase-item');

    expect(result.detected).toBe(true);
    expect(result.matchedKeywords).toContain('purchase');
  });

  it('detects OBO for "schedule-meeting" (schedule keyword)', () => {
    const result = detectOboFromName('schedule-meeting');

    expect(result.detected).toBe(true);
    expect(result.matchedKeywords).toContain('schedule');
  });

  it('does NOT detect OBO for "search-docs"', () => {
    const result = detectOboFromName('search-docs');

    expect(result.detected).toBe(false);
    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.hints).toHaveLength(0);
  });

  it('does NOT detect OBO for "list-items"', () => {
    const result = detectOboFromName('list-items');

    expect(result.detected).toBe(false);
  });

  it('produces governance hints when detected', () => {
    const result = detectOboFromName('send-email');

    expect(result.detected).toBe(true);
    expect(result.hints.some(h => h.includes('obo: true'))).toBe(true);
    expect(result.hints.some(h => h.includes('@Obo()'))).toBe(true);
  });

  it('detects OBO from annotate heuristics patterns (proxy)', () => {
    // "proxy" triggers detectObo from the annotate engine but is not in our keyword list
    const result = detectOboFromName('proxy-service');

    expect(result.detected).toBe(true);
    expect(result.matchedKeywords).toHaveLength(0); // no keyword match
    expect(result.hints.some(h => h.includes('OBO patterns'))).toBe(true);
    expect(result.hints.some(h => h.includes('proxy'))).toBe(true);
  });

  it('detects OBO from annotate heuristics patterns (behalf)', () => {
    const result = detectOboFromName('behalf-action');

    expect(result.detected).toBe(true);
    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.hints.some(h => h.includes('OBO patterns'))).toBe(true);
  });

  it('detects both keyword and annotate patterns for send-on-behalf', () => {
    // "send" matches keyword, "behalf" matches annotate
    const result = detectOboFromName('send-on-behalf');

    expect(result.detected).toBe(true);
    expect(result.matchedKeywords).toContain('send');
    expect(result.hints.some(h => h.includes('OBO keywords'))).toBe(true);
    expect(result.hints.some(h => h.includes('OBO patterns'))).toBe(true);
  });
});
