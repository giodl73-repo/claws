import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import JSZip from "jszip";
import { create as createTar } from "tar";
import { describe, expect, it, vi } from "vitest";
import { inspectClawSource, parseExactClawHubCoordinate } from "./remote-source.js";

const registry = "https://registry.example";
const coordinate = "clawhub:@example/incident-triage-claw@1.0.0";
const packageName = "@example/incident-triage-claw";
const version = "1.0.0";
const fixtureRoot = resolve("packages", "cli", "test", "fixtures", "valid");
const fixtureFiles = [
  "package.json",
  "CLAW.md",
  "profiles/openclaw.yml",
  "workspace/AGENTS.md",
  "workspace/SOUL.md",
];

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function makeZip(extra?: (zip: JSZip) => void): Promise<Buffer> {
  const zip = new JSZip();
  for (const path of fixtureFiles) {
    zip.file(path, await readFile(resolve(fixtureRoot, ...path.split("/"))));
  }
  extra?.(zip);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function makeConventionalZip(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("README.txt", "compatibility metadata");
  for (const path of fixtureFiles) {
    zip.file(`package/${path}`, await readFile(resolve(fixtureRoot, ...path.split("/"))));
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

async function makeNpmPack(): Promise<Buffer> {
  const root = await mkdtemp(join(tmpdir(), "claws-npm-pack-test-"));
  try {
    await cp(fixtureRoot, join(root, "package"), { recursive: true });
    const archive = join(root, "package.tgz");
    await createTar({ cwd: root, file: archive, gzip: true, portable: true }, ["package"]);
    return await readFile(archive);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function feed(integrity: string, expiresAt = "2030-01-02T00:00:00.000Z") {
  return {
    schemaVersion: 1,
    id: "clawhub-official-claws",
    generatedAt: "2030-01-01T00:00:00.000Z",
    expiresAt,
    sequence: 1,
    entries: [
      {
        type: "claw",
        id: packageName,
        title: "Incident triage",
        version,
        state: "available",
        publisher: { id: "example", trust: "official" },
        clawManifestSummary: {},
        install: {
          candidates: [{ sourceRef: "public-clawhub", package: packageName, version, integrity }],
        },
      },
    ],
  };
}

function artifact(kind: "legacy-zip" | "npm-pack", bytes: Buffer, downloadUrl?: string) {
  return {
    package: { name: packageName, displayName: "Incident triage", family: "claw" },
    version,
    artifact: {
      kind,
      sha256: sha256(bytes),
      size: bytes.byteLength,
      format: kind === "npm-pack" ? "tgz" : "zip",
      downloadUrl: downloadUrl ?? `${registry}/artifacts/incident-triage`,
    },
  };
}

function mockRegistry(input: {
  bytes: Buffer;
  kind?: "legacy-zip" | "npm-pack";
  integrity?: string;
  expiresAt?: string;
  downloadUrl?: string;
}) {
  const integrity = input.integrity ?? `sha256:${sha256(input.bytes)}`;
  const kind = input.kind ?? "legacy-zip";
  return vi.fn<typeof fetch>(async (request) => {
    const url = new URL(request instanceof Request ? request.url : String(request));
    if (url.pathname === "/api/v1/feeds/claws") {
      return Response.json(feed(integrity, input.expiresAt));
    }
    if (url.pathname.endsWith("/versions/1.0.0/artifact")) {
      return Response.json(artifact(kind, input.bytes, input.downloadUrl));
    }
    if (url.pathname === "/artifacts/incident-triage") {
      return new Response(Uint8Array.from(input.bytes), {
        headers: { "content-length": String(input.bytes.byteLength) },
      });
    }
    return new Response("not found", { status: 404 });
  });
}

describe("exact ClawHub sources", () => {
  it("requires an exact canonical coordinate", () => {
    expect(parseExactClawHubCoordinate("./local")).toBeUndefined();
    expect(parseExactClawHubCoordinate(coordinate)).toEqual({
      ref: coordinate,
      packageName,
      version,
    });
    expect(() => parseExactClawHubCoordinate(`clawhub:${packageName}@latest`)).toThrowError(
      expect.objectContaining({
        diagnostics: [expect.objectContaining({ code: "invalid_clawhub_coordinate" })],
      }),
    );
  });

  it("requires an explicit registry while the experimental feed is undeployed", async () => {
    await expect(inspectClawSource(coordinate, { env: {} })).rejects.toMatchObject({
      diagnostics: [{ code: "clawhub_registry_required", phase: "source" }],
    });
  });

  it("classifies response-body failures as ClawHub request failures", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.error(new Error("connection reset"));
        },
      });
      return new Response(body, { status: 200 });
    });

    await expect(
      inspectClawSource(coordinate, {
        env: { CLAWHUB_REGISTRY_URL: registry },
        fetch,
      }),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "clawhub_request_failed", phase: "source" }],
    });
  });

  it("resolves and verifies an exact legacy ZIP candidate", async () => {
    const bytes = await makeZip();
    const fetch = mockRegistry({ bytes });

    const result = await inspectClawSource(coordinate, {
      env: { CLAWHUB_REGISTRY_URL: registry },
      fetch,
      now: () => Date.parse("2030-01-01T12:00:00.000Z"),
    });

    expect(result.source).toMatchObject({
      kind: "clawhub-package",
      ref: coordinate,
      registry,
      packageName,
      packageVersion: version,
      artifactKind: "legacy-zip",
      artifactIntegrity: `sha256:${sha256(bytes)}`,
    });
    expect(result.summary.agent.id).toBe("incident-triage");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("accepts the conventional package root alongside safe compatibility files", async () => {
    const bytes = await makeConventionalZip();

    const result = await inspectClawSource(coordinate, {
      env: { CLAWHUB_REGISTRY_URL: registry },
      fetch: mockRegistry({ bytes }),
      now: () => Date.parse("2030-01-01T12:00:00.000Z"),
    });

    expect(result.source).toMatchObject({
      kind: "clawhub-package",
      artifactKind: "legacy-zip",
      packageName,
    });
    expect(result.summary.agent.id).toBe("incident-triage");
  });

  it("resolves and strips the package root from npm-pack TGZ artifacts", async () => {
    const bytes = await makeNpmPack();

    const result = await inspectClawSource(coordinate, {
      env: { CLAWHUB_REGISTRY_URL: registry },
      fetch: mockRegistry({ bytes, kind: "npm-pack" }),
      now: () => Date.parse("2030-01-01T12:00:00.000Z"),
    });

    expect(result.source).toMatchObject({
      kind: "clawhub-package",
      artifactKind: "npm-pack",
      artifactIntegrity: `sha256:${sha256(bytes)}`,
    });
  });

  it("rejects downloaded bytes that do not match the feed", async () => {
    const bytes = await makeZip();
    await expect(
      inspectClawSource(coordinate, {
        env: { CLAWHUB_REGISTRY_URL: registry },
        fetch: mockRegistry({ bytes, integrity: `sha256:${"0".repeat(64)}` }),
        now: () => Date.parse("2030-01-01T12:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "clawhub_integrity_mismatch", phase: "source" }],
    });
  });

  it("rejects expired feeds before downloading an artifact", async () => {
    const bytes = await makeZip();
    const fetch = mockRegistry({ bytes, expiresAt: "2030-01-01T06:00:00.000Z" });
    await expect(
      inspectClawSource(coordinate, {
        env: { CLAWHUB_REGISTRY_URL: registry },
        fetch,
        now: () => Date.parse("2030-01-01T12:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "expired_clawhub_feed", phase: "source" }],
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects feeds generated beyond the clock-skew allowance", async () => {
    const bytes = await makeZip();
    const fetch = mockRegistry({ bytes });
    await expect(
      inspectClawSource(coordinate, {
        env: { CLAWHUB_REGISTRY_URL: registry },
        fetch,
        now: () => Date.parse("2029-12-31T22:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "future_clawhub_feed", phase: "source" }],
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects off-origin artifact URLs", async () => {
    const bytes = await makeZip();
    await expect(
      inspectClawSource(coordinate, {
        env: { CLAWHUB_REGISTRY_URL: registry },
        fetch: mockRegistry({ bytes, downloadUrl: "https://attacker.example/claw.zip" }),
        now: () => Date.parse("2030-01-01T12:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "untrusted_clawhub_url", phase: "source" }],
    });
  });

  it("preserves a path-prefixed registry for relative artifact URLs", async () => {
    const bytes = await makeZip();
    const prefixedRegistry = `${registry}/clawhub`;
    const integrity = `sha256:${sha256(bytes)}`;
    const fetch = vi.fn<typeof globalThis.fetch>(async (request) => {
      const url = new URL(request instanceof Request ? request.url : String(request));
      if (url.pathname === "/clawhub/api/v1/feeds/claws") {
        return Response.json(feed(integrity));
      }
      if (url.pathname.endsWith("/versions/1.0.0/artifact")) {
        return Response.json(artifact("legacy-zip", bytes, "artifacts/incident-triage"));
      }
      if (url.pathname === "/clawhub/artifacts/incident-triage") {
        return new Response(Uint8Array.from(bytes));
      }
      return new Response("not found", { status: 404 });
    });

    const result = await inspectClawSource(coordinate, {
      env: { CLAWHUB_REGISTRY_URL: prefixedRegistry },
      fetch,
      now: () => Date.parse("2030-01-01T12:00:00.000Z"),
    });

    expect(result.source).toMatchObject({
      kind: "clawhub-package",
      registry: prefixedRegistry,
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("rejects traversal entries during safe extraction", async () => {
    const bytes = await makeZip((zip) => zip.file("../escape.txt", "escape"));
    await expect(
      inspectClawSource(coordinate, {
        env: { CLAWHUB_REGISTRY_URL: registry },
        fetch: mockRegistry({ bytes }),
        now: () => Date.parse("2030-01-01T12:00:00.000Z"),
      }),
    ).rejects.toMatchObject({
      diagnostics: [{ code: "unsafe_clawhub_archive", phase: "source" }],
    });
  });
});
