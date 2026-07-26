import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { create as createTar } from "tar";
import { describe, expect, it, vi } from "vitest";
import { parseExactGitHubCoordinate } from "./github-source.js";
import { inspectClawSource } from "./source-providers.js";

const commit = "a".repeat(40);
const coordinate = `github:example/awesome-claws@${commit}#claws/incident-triage`;
const fixtureRoot = resolve("packages", "cli", "test", "fixtures", "valid");

async function makeRepositoryArchive(): Promise<Buffer> {
  const root = await mkdtemp(join(tmpdir(), "claws-github-source-test-"));
  try {
    const repositoryRoot = join(root, `example-awesome-claws-${commit}`);
    await cp(fixtureRoot, join(repositoryRoot, "claws", "incident-triage"), { recursive: true });
    const archive = join(root, "repository.tgz");
    await createTar({ cwd: root, file: archive, gzip: true, portable: true }, [
      `example-awesome-claws-${commit}`,
    ]);
    return await readFile(archive);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("immutable GitHub Claw sources", () => {
  it("requires an exact commit and safe package path", () => {
    expect(parseExactGitHubCoordinate("./local")).toBeUndefined();
    expect(parseExactGitHubCoordinate(coordinate)).toEqual({
      ref: coordinate,
      owner: "example",
      repository: "awesome-claws",
      commit,
      packagePath: "claws/incident-triage",
    });
    expect(() =>
      parseExactGitHubCoordinate("github:example/awesome-claws@main#claws/incident-triage"),
    ).toThrowError(
      expect.objectContaining({
        diagnostics: [expect.objectContaining({ code: "invalid_github_coordinate" })],
      }),
    );
    expect(() =>
      parseExactGitHubCoordinate(`github:example/awesome-claws@${commit}#../incident-triage`),
    ).toThrowError(
      expect.objectContaining({
        diagnostics: [expect.objectContaining({ code: "invalid_github_coordinate" })],
      }),
    );
  });

  it("resolves a commit-pinned package and records both archive and package integrity", async () => {
    const archive = await makeRepositoryArchive();
    const fetch = vi.fn<typeof globalThis.fetch>(async (request, init) => {
      const url = new URL(request instanceof Request ? request.url : String(request));
      if (url.origin === "https://api.github.com") {
        expect(init?.headers).toMatchObject({ authorization: "Bearer secret" });
        return new Response(null, {
          status: 302,
          headers: {
            location: `https://codeload.github.com/example/awesome-claws/tar.gz/${commit}`,
          },
        });
      }
      expect(url.origin).toBe("https://codeload.github.com");
      expect(init?.headers).not.toMatchObject({ authorization: expect.anything() });
      return new Response(Uint8Array.from(archive), {
        headers: { "content-length": String(archive.byteLength) },
      });
    });

    const result = await inspectClawSource(coordinate, {
      env: { GITHUB_TOKEN: "secret" },
      fetch,
    });

    expect(result.source).toMatchObject({
      kind: "github-package",
      ref: coordinate,
      repository: "example/awesome-claws",
      commit,
      packagePath: "claws/incident-triage",
      packageName: "@example/incident-triage-claw",
      packageVersion: "1.0.0",
      artifactIntegrity: `sha256:${createHash("sha256").update(archive).digest("hex")}`,
    });
    expect(result.summary.agent.id).toBe("incident-triage");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects archive redirects outside GitHub's codeload origin", async () => {
    await expect(
      inspectClawSource(coordinate, {
        fetch: vi.fn(
          async () =>
            new Response(null, {
              status: 302,
              headers: { location: "https://attacker.example/repository.tgz" },
            }),
        ),
      }),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "untrusted_github_url", phase: "source" }],
    });
  });
});
