/**
 * Conflict detectors — barrel exports.
 *
 * @module claws-sdk/compile/conflicts
 */

export { detectDenyVsTool } from './deny-vs-tool.js';
export { detectTrustEscalation } from './trust-escalation.js';
export { detectOboWithoutElicit } from './obo-without-elicit.js';
export { detectDataLabelMismatch } from './data-label-mismatch.js';
export { detectCircularDelegation } from './circular-delegation.js';
export { detectSkillToolGhost } from './skill-tool-ghost.js';
export { detectScheduleNoApproval } from './schedule-no-approval.js';
