import type { Diagnostic, DiagnosticPhase } from "./types.js";

export class PrototypeError extends Error {
  readonly diagnostic: Diagnostic;

  constructor(code: string, phase: DiagnosticPhase, message: string, path?: string) {
    super(message);
    this.name = "PrototypeError";
    this.diagnostic = { code, phase, message, ...(path ? { path } : {}) };
  }
}

export class PrototypeDiagnosticsError extends Error {
  readonly diagnostics: Diagnostic[];

  constructor(message: string, diagnostics: Diagnostic[]) {
    super(message);
    this.name = "PrototypeDiagnosticsError";
    this.diagnostics = diagnostics;
  }
}
