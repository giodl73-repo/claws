import { PrototypeError } from "./errors.js";
import type { InspectedPackage } from "./source.js";

export type PreviewContext = {
  package: InspectedPackage;
  dryRun: true;
};

export type HarnessAdapter = {
  id: string;
  preview(context: PreviewContext): Promise<never>;
};

const openClawAdapter: HarnessAdapter = {
  id: "openclaw",
  async preview() {
    throw new PrototypeError(
      "adapter_not_implemented",
      "adapter",
      "OpenClaw preview delegation is planned for private slice 2.",
      "openclaw",
    );
  },
};

const adapters = new Map([[openClawAdapter.id, openClawAdapter]]);

export function getHarnessAdapter(id: string): HarnessAdapter {
  const adapter = adapters.get(id);
  if (!adapter) {
    throw new PrototypeError(
      "unknown_adapter",
      "adapter",
      `Unknown agent harness adapter: ${id}.`,
      id,
    );
  }
  return adapter;
}
