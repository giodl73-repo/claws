import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClawPackage } from "./create.js";

const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "claws-create-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Claw construction", () => {
  it("constructs a readable package from persona files and selected components", async () => {
    const root = await tempRoot();
    const skill = join(root, "research-skill");
    await mkdir(join(skill, "references"), { recursive: true });
    await writeFile(
      join(skill, "SKILL.md"),
      "---\nname: research\ndescription: Research carefully.\n---\n\n# Research\n",
    );
    await writeFile(join(skill, "references", "sources.md"), "# Sources\n");
    await writeFile(join(root, "SOUL.md"), "# Financial analyst\n\nBe precise.\n");
    await writeFile(join(root, "AGENTS.md"), "Use the supplied research skill.\n");
    const output = join(root, "financial-analyst");

    const result = await createClawPackage({
      output,
      agentId: "financial-analyst",
      name: "Financial Analyst",
      description: "Analyzes a company from primary sources.",
      soulPath: join(root, "SOUL.md"),
      agentsPath: join(root, "AGENTS.md"),
      skills: [skill, "clawhub:@example/market-data@1.2.3"],
      plugins: ["clawhub:@example/sec-filings@2.0.0"],
    });

    expect(result.summary).toMatchObject({
      agent: { id: "financial-analyst" },
      hasPortablePrompt: true,
      bootstrapFiles: ["AGENTS.md", "SOUL.md"],
      workspaceFileCount: 2,
      skillCount: 2,
      pluginCount: 1,
    });
    expect(result.manifest.packages).toEqual([
      { kind: "skill", source: "clawhub", ref: "@example/market-data", version: "1.2.3" },
      { kind: "plugin", source: "clawhub", ref: "@example/sec-filings", version: "2.0.0" },
    ]);
    expect(result.manifest.workspace.files).toEqual([
      {
        source: "components/skills/research/SKILL.md",
        path: "skills/research/SKILL.md",
      },
      {
        source: "components/skills/research/references/sources.md",
        path: "skills/research/references/sources.md",
      },
    ]);
    expect(await readFile(join(output, "CLAW.md"), "utf8")).toContain(
      "# Financial analyst\n\nBe precise.",
    );
    expect(
      await readFile(join(output, "components", "skills", "research", "SKILL.md"), "utf8"),
    ).toContain("name: research");
  });

  it("does not overwrite an existing destination", async () => {
    const root = await tempRoot();
    const output = join(root, "existing");
    await mkdir(output);
    await writeFile(join(output, "keep.txt"), "keep");
    await writeFile(join(root, "SOUL.md"), "Keep it simple.\n");

    await expect(
      createClawPackage({
        output,
        agentId: "example",
        name: "Example",
        description: "Example Claw.",
        soulPath: join(root, "SOUL.md"),
      }),
    ).rejects.toMatchObject({ diagnostics: [{ code: "create_destination_exists" }] });
    expect(await readFile(join(output, "keep.txt"), "utf8")).toBe("keep");
  });

  it("allows only one concurrent creator to reserve a destination", async () => {
    const root = await tempRoot();
    const output = join(root, "contended");
    await writeFile(join(root, "SOUL.md"), "Example.\n");
    const options = {
      output,
      agentId: "example",
      name: "Example",
      description: "Example Claw.",
      soulPath: join(root, "SOUL.md"),
    };

    const outcomes = await Promise.allSettled([
      createClawPackage(options),
      createClawPackage(options),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: { diagnostics: [{ code: "create_destination_exists" }] },
    });
  });

  it("rejects mutable package coordinates and invalid skill text", async () => {
    const root = await tempRoot();
    await writeFile(join(root, "SOUL.md"), "Example.\n");
    const skill = join(root, "bad-skill");
    await mkdir(skill);
    await writeFile(join(skill, "SKILL.md"), Buffer.from([0xff, 0xfe]));

    await expect(
      createClawPackage({
        output: join(root, "mutable"),
        agentId: "example",
        name: "Example",
        description: "Example Claw.",
        soulPath: join(root, "SOUL.md"),
        plugins: ["clawhub:@example/plugin@latest"],
      }),
    ).rejects.toMatchObject({ diagnostics: [{ code: "invalid_clawhub_coordinate" }] });
    await expect(
      createClawPackage({
        output: join(root, "invalid-skill"),
        agentId: "example",
        name: "Example",
        description: "Example Claw.",
        soulPath: join(root, "SOUL.md"),
        skills: [skill],
      }),
    ).rejects.toMatchObject({ diagnostics: [{ code: "invalid_skill" }] });
  });

  it("rejects a whitespace-only portable prompt", async () => {
    const root = await tempRoot();
    await writeFile(join(root, "SOUL.md"), " \r\n\t\n");

    await expect(
      createClawPackage({
        output: join(root, "empty-soul"),
        agentId: "example",
        name: "Example",
        description: "Example Claw.",
        soulPath: join(root, "SOUL.md"),
      }),
    ).rejects.toMatchObject({ diagnostics: [{ code: "invalid_create_input" }] });
  });

  it("enforces input bounds while reading", async () => {
    const root = await tempRoot();
    await writeFile(join(root, "SOUL.md"), Buffer.alloc(1024 * 1024 + 1, "x"));
    await expect(
      createClawPackage({
        output: join(root, "large-prompt"),
        agentId: "example",
        name: "Example",
        description: "Example Claw.",
        soulPath: join(root, "SOUL.md"),
      }),
    ).rejects.toMatchObject({ diagnostics: [{ code: "invalid_create_input" }] });

    await writeFile(join(root, "SOUL.md"), "Example.\n");
    const skill = join(root, "large-skill");
    await mkdir(skill);
    await writeFile(join(skill, "SKILL.md"), "---\nname: large\n---\n");
    await Promise.all(
      Array.from({ length: 256 }, (_, index) =>
        writeFile(join(skill, `file-${String(index).padStart(3, "0")}.txt`), "x"),
      ),
    );
    await expect(
      createClawPackage({
        output: join(root, "large-skill-claw"),
        agentId: "example",
        name: "Example",
        description: "Example Claw.",
        soulPath: join(root, "SOUL.md"),
        skills: [skill],
      }),
    ).rejects.toMatchObject({ diagnostics: [{ code: "unsafe_skill" }] });
  });

  it.skipIf(process.platform === "win32")(
    "does not replace a dangling destination symlink",
    async () => {
      const root = await tempRoot();
      const output = join(root, "dangling");
      await symlink(join(root, "missing"), output, "dir");
      await writeFile(join(root, "SOUL.md"), "Example.\n");

      await expect(
        createClawPackage({
          output,
          agentId: "example",
          name: "Example",
          description: "Example Claw.",
          soulPath: join(root, "SOUL.md"),
        }),
      ).rejects.toMatchObject({ diagnostics: [{ code: "create_destination_exists" }] });
    },
  );
});
