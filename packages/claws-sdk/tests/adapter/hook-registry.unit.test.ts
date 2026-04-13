/**
 * L0: Hook registry — maps all GovernanceIR concepts to OC event names.
 *
 * 1 unit test:
 * 1. Hook registry maps all GovernanceIR concepts to OC event names
 */

import { describe, it, expect } from 'vitest';
import {
  getAllMappings,
  getOCEvent,
  getMapping,
  getRequiredMappings,
  ALL_CONCEPTS,
  type GovernanceConcept,
} from '../../src/adapter/hook-registry.js';

describe('HookRegistry', () => {
  it('maps all GovernanceIR concepts to OC event names', () => {
    const mappings = getAllMappings();

    // Every concept must have a mapping
    expect(mappings.length).toBe(ALL_CONCEPTS.length);

    // Verify each known concept maps to a valid OC event
    const expectedMappings: Record<GovernanceConcept, string> = {
      'tool-gate': 'before_tool_call',
      'elicitation-gate': 'before_elicitation',
      'a2a-firewall': 'before_agent_handoff',
      'audit-tap': 'on_audit',
      'context-assembly': 'before_context_assembly',
      'lifecycle-start': 'on_start',
      'lifecycle-stop': 'on_stop',
    };

    for (const [concept, expectedEvent] of Object.entries(expectedMappings)) {
      const event = getOCEvent(concept as GovernanceConcept);
      expect(event, `Missing mapping for ${concept}`).toBe(expectedEvent);
    }
  });

  it('getMapping returns full mapping entry for each concept', () => {
    for (const concept of ALL_CONCEPTS) {
      const mapping = getMapping(concept);
      expect(mapping).toBeDefined();
      expect(mapping!.concept).toBe(concept);
      expect(typeof mapping!.ocEvent).toBe('string');
      expect(typeof mapping!.required).toBe('boolean');
      expect(typeof mapping!.priority).toBe('number');
    }
  });

  it('has at least one required mapping (tool-gate)', () => {
    const required = getRequiredMappings();
    expect(required.length).toBeGreaterThan(0);

    const toolGate = required.find((m) => m.concept === 'tool-gate');
    expect(toolGate).toBeDefined();
    expect(toolGate!.ocEvent).toBe('before_tool_call');
  });

  it('concepts are unique (no duplicates)', () => {
    const concepts = getAllMappings().map((m) => m.concept);
    const unique = new Set(concepts);
    expect(unique.size).toBe(concepts.length);
  });

  it('OC event names are valid format', () => {
    const mappings = getAllMappings();
    for (const mapping of mappings) {
      // OC events use snake_case
      expect(mapping.ocEvent).toMatch(/^[a-z][a-z_]+$/);
    }
  });
});
