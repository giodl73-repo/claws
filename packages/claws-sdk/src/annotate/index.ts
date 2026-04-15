/**
 * Heuristic annotation engine for `claws annotate`.
 *
 * Infers governance metadata from skill source code using
 * keyword-anchored pattern matching.
 *
 * @module claws-sdk/annotate
 */

export {
  analyzeHeuristics,
  formatAnnotation,
  toFrontmatterAnnotations,
} from './heuristics.js';

export type {
  HeuristicAnnotation,
  AnnotateResult,
  DataClassification,
} from './heuristics.js';

export {
  combineConfidence,
} from './confidence.js';

export type {
  ConfidenceEvidence,
  ConfidenceResult,
} from './confidence.js';

export {
  detectObo,
} from './obo-detect.js';

export type {
  OboDetectionResult,
} from './obo-detect.js';

export {
  disambiguateYamlNone,
  normalizeRiskLabel,
  levenshteinDistance,
  suggestClosestRiskLabel,
} from './yaml-edge.js';

export type {
  YamlDisambiguationResult,
  NormalizeResult,
  LevenshteinSuggestion,
} from './yaml-edge.js';

export {
  ACCURACY_THRESHOLD,
  OBO_FALSE_NEGATIVE_MAX,
  OBO_FALSE_POSITIVE_MAX,
  runCorpusSkill,
  runAccuracyValidation,
  formatAccuracyReport,
} from './accuracy.js';

export type {
  CorpusRunResult,
  AccuracyReport,
} from './accuracy.js';

export {
  buildDocUrl,
  getClawsVersion,
  remediateInvalidRiskLabel,
  remediateMissingGovernance,
  formatRemediation,
  injectRemediation,
} from './remediation.js';

export type {
  RemediationHint,
} from './remediation.js';

export {
  TEST_CORPUS,
  getCorpusByRisk,
  validateCorpusDistribution,
} from './corpus/index.js';

export type {
  CorpusSkill,
} from './corpus/index.js';

export {
  annotateDirectory,
  parseSkillFrontmatter,
  injectAnnotations,
} from './orchestrator.js';

export type {
  AnnotateDirectoryOptions,
} from './orchestrator.js';
