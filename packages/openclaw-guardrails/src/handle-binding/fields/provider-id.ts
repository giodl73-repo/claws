import type { InvalidReason } from "../types.js";

export interface ProviderIdInput {
  readonly handleProviderId: string;
  readonly expectedProviderId: string;
}

export function checkProviderId(input: ProviderIdInput): InvalidReason | null {
  return input.handleProviderId === input.expectedProviderId ? null : "provider-id-mismatch";
}
