import type { InvalidReason } from '../types.js';

export interface ApproverPrincipalInput {
  readonly handleApproverPrincipal: string;
  readonly expectedApproverPrincipal: string;
}

export function checkApproverPrincipal(
  input: ApproverPrincipalInput,
): InvalidReason | null {
  return input.handleApproverPrincipal === input.expectedApproverPrincipal
    ? null
    : 'principal-mismatch';
}
