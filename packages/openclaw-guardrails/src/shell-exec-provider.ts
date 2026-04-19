/**
 * @bic/openclaw-guardrails — ShellExecProvider reference implementation.
 *
 * Wraps an exec-approvals.json file as a GuardrailProvider. Reference
 * implementation demonstrating how pre-existing OC governance files can
 * be wrapped in the new peer-interface without changing behavior.
 *
 * Unknown tools fail-closed: require external approval, classified R5.
 */

import { readFileSync } from 'node:fs';
import type {
  AuthorizationDecision,
  GuardrailCapabilities,
  GuardrailProvider,
  ToolCallEvent,
} from './types.js';

interface ExecApprovalsDoc {
  tools: Array<{
    tool_name: string;
    requires_approval: boolean;
  }>;
}

export class ShellExecProvider implements GuardrailProvider {
  readonly name = 'exec-approvals';

  private readonly approvals: Map<string, boolean>;

  constructor(execApprovalsPath: string) {
    const raw = readFileSync(execApprovalsPath, 'utf-8');
    const doc = JSON.parse(raw) as ExecApprovalsDoc;
    this.approvals = new Map();
    for (const entry of doc.tools) {
      this.approvals.set(entry.tool_name, entry.requires_approval);
    }
  }

  static fromMap(approvals: Map<string, boolean>): ShellExecProvider {
    const instance = Object.create(ShellExecProvider.prototype) as ShellExecProvider;
    Object.defineProperty(instance, 'name', { value: 'exec-approvals' });
    (instance as unknown as { approvals: Map<string, boolean> }).approvals = new Map(approvals);
    return instance;
  }

  async preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision> {
    const requiresApproval = this.approvals.get(event.tool);

    if (requiresApproval === undefined) {
      return {
        decision: 'allow',
        requiresExternalApproval: true,
        riskLevel: 5,
      };
    }

    return {
      decision: 'allow',
      requiresExternalApproval: requiresApproval,
    };
  }

  async postAudit(_event: ToolCallEvent, _decision: AuthorizationDecision): Promise<void> {
    // exec-approvals.json has no audit capability — no-op
  }

  getCapabilities(): GuardrailCapabilities {
    return {
      description: 'Wraps exec-approvals.json as a GuardrailProvider',
      version: '1.0.0',
      riskClassification: false,
      auditTrail: false,
      externalApproval: true,
      argumentModification: false,
    };
  }
}
