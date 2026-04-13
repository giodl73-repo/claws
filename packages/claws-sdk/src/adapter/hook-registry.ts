/**
 * Hook registry — maps GovernanceIR concepts to OC Gateway event names.
 *
 * The OC Gateway uses `api.on(eventName, handler)` for hook registration.
 * This registry provides the canonical mapping from governance concepts
 * (tool gating, elicitation, A2A firewall, etc.) to the OC event names.
 *
 * @module claws-sdk/adapter/hook-registry
 */

/**
 * A governance concept that requires a hook registration.
 */
export type GovernanceConcept =
  | 'tool-gate'
  | 'elicitation-gate'
  | 'a2a-firewall'
  | 'audit-tap'
  | 'context-assembly'
  | 'lifecycle-start'
  | 'lifecycle-stop';

/**
 * An OC Gateway event name.
 */
export type OCEventName =
  | 'before_tool_call'
  | 'after_tool_call'
  | 'before_elicitation'
  | 'before_agent_handoff'
  | 'on_audit'
  | 'before_context_assembly'
  | 'on_start'
  | 'on_stop';

/**
 * A single hook mapping entry.
 */
export interface HookMapping {
  /** The governance concept being mapped. */
  readonly concept: GovernanceConcept;
  /** The OC event name to register on. */
  readonly ocEvent: OCEventName;
  /** Whether this hook is mandatory (must be registered). */
  readonly required: boolean;
  /** Execution priority (lower = earlier). */
  readonly priority: number;
}

/**
 * Canonical mapping from governance concepts to OC event names.
 *
 * This is the single source of truth for how GovernanceIR concepts
 * translate to OC runtime hook registrations.
 */
const HOOK_MAPPINGS: readonly HookMapping[] = [
  {
    concept: 'tool-gate',
    ocEvent: 'before_tool_call',
    required: true,
    priority: 10,
  },
  {
    concept: 'elicitation-gate',
    ocEvent: 'before_elicitation',
    required: false,
    priority: 20,
  },
  {
    concept: 'a2a-firewall',
    ocEvent: 'before_agent_handoff',
    required: false,
    priority: 15,
  },
  {
    concept: 'audit-tap',
    ocEvent: 'on_audit',
    required: false,
    priority: 50,
  },
  {
    concept: 'context-assembly',
    ocEvent: 'before_context_assembly',
    required: false,
    priority: 30,
  },
  {
    concept: 'lifecycle-start',
    ocEvent: 'on_start',
    required: false,
    priority: 1,
  },
  {
    concept: 'lifecycle-stop',
    ocEvent: 'on_stop',
    required: false,
    priority: 99,
  },
] as const;

/**
 * Get all hook mappings.
 */
export function getAllMappings(): readonly HookMapping[] {
  return HOOK_MAPPINGS;
}

/**
 * Get the OC event name for a governance concept.
 *
 * @param concept - The governance concept to look up
 * @returns The OC event name, or undefined if not mapped
 */
export function getOCEvent(concept: GovernanceConcept): OCEventName | undefined {
  const mapping = HOOK_MAPPINGS.find((m) => m.concept === concept);
  return mapping?.ocEvent;
}

/**
 * Get the hook mapping for a governance concept.
 *
 * @param concept - The governance concept to look up
 * @returns The full mapping entry, or undefined if not mapped
 */
export function getMapping(concept: GovernanceConcept): HookMapping | undefined {
  return HOOK_MAPPINGS.find((m) => m.concept === concept);
}

/**
 * Get all required hook mappings (must be registered for enforcement).
 */
export function getRequiredMappings(): readonly HookMapping[] {
  return HOOK_MAPPINGS.filter((m) => m.required);
}

/**
 * All governance concepts defined in the registry.
 */
export const ALL_CONCEPTS: readonly GovernanceConcept[] = HOOK_MAPPINGS.map(
  (m) => m.concept,
);
