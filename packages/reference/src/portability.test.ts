import { describe, expect, it } from "vitest";
import { isClawPackageManagerArtifactPinned } from "./portability.js";

describe("portable package-manager commands", () => {
  it("accepts exact npm exec package selections", () => {
    expect(
      isClawPackageManagerArtifactPinned("npm", [
        "exec",
        "--package=@example/server@1.2.3",
        "--",
        "server",
      ]),
    ).toBe(true);
    expect(isClawPackageManagerArtifactPinned("npm.cmd", ["x", "server@1.2.3"])).toBe(true);
  });

  it("rejects mutable npm exec package selections", () => {
    expect(
      isClawPackageManagerArtifactPinned("npm", [
        "exec",
        "--package=@example/server@latest",
        "--",
        "server",
      ]),
    ).toBe(false);
    expect(isClawPackageManagerArtifactPinned("npm", ["x", "server"])).toBe(false);
    expect(
      isClawPackageManagerArtifactPinned("npm", [
        "exec",
        "server@1.2.3",
        "--package=other@latest",
        "--",
        "server",
      ]),
    ).toBe(false);
  });

  it("rejects non-registry package sources with semver-shaped suffixes", () => {
    expect(isClawPackageManagerArtifactPinned("npx", ["github:user/repo@1.2.3"])).toBe(false);
    expect(isClawPackageManagerArtifactPinned("npx", ["owner/repo@1.2.3"])).toBe(false);
    expect(isClawPackageManagerArtifactPinned("npx", ["https://example.test/server@1.2.3"])).toBe(
      false,
    );
  });

  it("leaves non-execution npm commands outside the package rule", () => {
    expect(isClawPackageManagerArtifactPinned("npm", ["run", "server"])).toBeUndefined();
  });

  it("applies the same rule through Corepack dispatch", () => {
    expect(isClawPackageManagerArtifactPinned("corepack", ["pnpm", "dlx", "server@1.2.3"])).toBe(
      true,
    );
    expect(isClawPackageManagerArtifactPinned("corepack", ["yarn", "dlx", "server@latest"])).toBe(
      false,
    );
    expect(
      isClawPackageManagerArtifactPinned("corepack", [
        "npm",
        "exec",
        "--package=server@latest",
        "--",
        "server",
      ]),
    ).toBe(false);
  });
});
