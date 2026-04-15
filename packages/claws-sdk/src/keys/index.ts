/**
 * Key management module — generate, store, register, list, rotate, revoke,
 * and schedule governance keys.
 *
 * @module claws-sdk/keys
 */

export type { KeyAlgorithm, StorageTier, RotationSchedule, KeyEntry, KeyPurpose } from './types.js';
export { generateKey, generateEd25519, generateHmac } from './generate.js';
export type { GeneratedKey } from './generate.js';
export { FileStorage, EnvStorage, KMSStorage, createStorage } from './storage.js';
export type { KeyStorage } from './storage.js';
export { readRegistry, registerKey, getKey, generateKeyId, updateKey } from './registry.js';
export type { RegisterKeyOptions } from './registry.js';
export { listKeys, formatKeysTable } from './list.js';
export type { ListKeysResult } from './list.js';
export { rotateKey } from './rotate.js';
export type { RotateResult } from './rotate.js';
export { revokeKey, assertKeyNotRevoked } from './revoke.js';
export type { RevokeResult } from './revoke.js';
export {
  defaultSchedule,
  computeDeadline,
  daysUntil,
  getScheduleStatus,
  getAllScheduleStatuses,
  getAlertKeys,
  formatScheduleTable,
  DEFAULT_ROTATION_INTERVALS,
} from './schedule.js';
export type { ScheduleStatus } from './schedule.js';
export {
  shamirSplit,
  shamirReconstruct,
  recordParticipant,
  deriveSingleDevKey,
  initCeremony,
} from './ceremony.js';
export type {
  CeremonyShare,
  ShareParticipant,
  CeremonyInitResult,
  CeremonyReconstructResult,
  SingleDevKeyResult,
  InitCeremonyOptions,
  InitCeremonyResult,
} from './ceremony.js';
export {
  recordCeremonyInitiated,
  recordShareDistributed,
  recordKeyReconstructed,
} from './ceremony-audit.js';
