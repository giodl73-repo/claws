import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectLocalPackage } from "./source.js";
import { formatClawSummary, formatHarnessPlan } from "./tui.js";

const validFixture = resolve("packages", "cli", "test", "fixtures", "valid");

describe("terminal presentation", () => {
  it("summarizes a Claw without rendering workspace contents", async () => {
    const summary = formatClawSummary(await inspectLocalPackage(validFixture));

    expect(summary).toContain("Incident triage");
    expect(summary).toContain("Agent       incident-triage");
    expect(summary).toContain("Persona     workspace files only");
    expect(summary).toContain("Integrity   sha256:");
    expect(summary).not.toContain("Review incoming incidents");
  });

  it("renders the complete harness-native plan", () => {
    const plan = { ready: true, actions: [{ kind: "agent.create", target: "analyst" }] };

    expect(formatHarnessPlan(plan)).toBe(JSON.stringify(plan, null, 2));
  });
});
