#!/usr/bin/env node
/**
 * gen-adversarial.mjs — generate fixtures designed to BREAK the substrate train.
 *
 * Each fixture is a small, targeted "what if this happened" scenario. The
 * substrate should ideally produce a clear, non-crashing diagnostic; if it
 * crashes / hangs / silently swallows / produces a misleading message, that's
 * a finding worth pinning.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const FIX_DIR = join(root, "fixtures", "synthetic");

const SENTINEL = "__OPENCLAW_REDACTED__";

/**
 * Each entry: [slug, files-mapping]. files-mapping is { 'AGENTS.md': '...', 'TOOLS.md': '...' }.
 * Empty values produce empty files. Buffer values write bytes verbatim.
 */
const RECIPES = [
  // -- manifest shape attacks ---------------------------------------------
  [
    "adversarial-manifest-malformed-json",
    {
      "AGENTS.md": "# Agent\n\nBroken manifest JSON below.\n",
      "manifest.json":
        '{ "name": "broken-plugin", "version": "0.1.0", "contributes": { tools: [unquoted, missing-quotes }',
    },
    "Manifest JSON is intentionally malformed; substrate should not crash on parse.",
  ],
  [
    "adversarial-manifest-references-missing-skill",
    {
      "AGENTS.md": "# Agent\n\nManifest claims a skill that does not exist on disk.\n",
      "manifest.json":
        '{\n  "name": "ghost-plugin",\n  "version": "0.1.0",\n  "contributes": {\n    "skills": ["ghost-plugin/this-skill-doesnt-exist"]\n  }\n}\n',
      "TOOLS.md": "# Tools\n\n## Tools\n\n### ghost-plugin/foo # R1, READ\nA tool.\n",
    },
    "Manifest references a skills/<name>/SKILL.md path that does not exist; cross-reference check should flag.",
  ],

  // -- tool-shape attacks -------------------------------------------------
  [
    "adversarial-tools-sentinel-injection",
    {
      "AGENTS.md": "# Agent\n\nA TOOLS.md value contains the redaction sentinel literal.\n",
      "TOOLS.md": `# Tools\n\n## Tools\n\n### sentinel-tool # R3, WRITE, sensitivity:internal\nDescription contains ${SENTINEL} literal — emit-time guard MUST refuse to write back.\n`,
    },
    "Bytes contain __OPENCLAW_REDACTED__ literal; emit-time guard should refuse to write back / round-trip should fail.",
  ],
  [
    "adversarial-tools-shell-metacharacter-id",
    {
      "AGENTS.md": "# Agent\n\nTool ID contains shell metacharacters.\n",
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### `; rm -rf /` # R5, IRREVERSIBLE_EXTERNAL\nTool ID contains shell injection. Substrate should reject or sanitize.\n",
    },
    "Tool ID has `; rm -rf /` — anything that pipes the ID into a shell pipeline is at risk. Substrate should reject the ID.",
  ],
  [
    "adversarial-tools-emoji-id",
    {
      "AGENTS.md": "# Agent\n\nTool ID contains emoji.\n",
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### 🚀rocket-tool # R3, WRITE, sensitivity:internal\nUnicode in tool ID — should round-trip without mojibake.\n",
    },
    "Tool ID contains emoji codepoint; round-trip should preserve UTF-8.",
  ],
  [
    "adversarial-tools-very-long-id",
    {
      "AGENTS.md": "# Agent\n\nTool ID is 512 chars long.\n",
      "TOOLS.md": `# Tools\n\n## Tools\n\n### ${"a".repeat(512)} # R1, READ\nVery long ID; should not OOM or hang.\n`,
    },
    "Tool ID is 512 characters; should not crash parser or hang regex matching.",
  ],
  [
    "adversarial-tools-duplicate-id",
    {
      "AGENTS.md": "# Agent\n\nDuplicate tool IDs.\n",
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### dup-tool # R1, READ\nFirst declaration.\n\n### dup-tool # R5, IRREVERSIBLE_EXTERNAL\nSecond declaration with conflicting risk. Substrate should flag the collision.\n",
    },
    "Same tool id declared twice with different risk — second silently overrides; lint should flag.",
  ],
  [
    "adversarial-tools-r1-with-irreversible",
    {
      "AGENTS.md": "# Agent\n\nMismatched risk/cap combo.\n",
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### dangerous-but-marked-low # R1, IRREVERSIBLE_EXTERNAL, sensitivity:public\nR1 (low) marked with IRREVERSIBLE_EXTERNAL — semantically wrong; lint should flag the mismatch.\n",
    },
    "R1 risk + IRREVERSIBLE_EXTERNAL cap is semantically inconsistent; policy lint should catch.",
  ],
  [
    "adversarial-tools-bogus-sensitivity",
    {
      "AGENTS.md": "# Agent\n\nUnknown sensitivity value.\n",
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### tool-with-bad-sensitivity # R3, WRITE, sensitivity:bogus-tier-7\nUnknown sensitivity token; should fall back to default + lint should flag.\n",
    },
    "sensitivity:bogus-tier-7 is not in the allowed set (public/internal/confidential/restricted).",
  ],

  // -- frontmatter attacks ------------------------------------------------
  [
    "adversarial-frontmatter-malformed-yaml",
    {
      "AGENTS.md":
        "---\nname: malformed\ntrust: [ unclosed\nlist: yes,\n   indentation: way too random\n---\n\n# Agent\n\nBroken YAML frontmatter; parse should not crash workspace walk.\n",
      "TOOLS.md": "# Tools\n\n## Tools\n\n### tool # R1, READ\n",
    },
    "YAML frontmatter is malformed; AGENTS.md parse should produce a graceful error not crash the manifest walker.",
  ],
  [
    "adversarial-skill-tier-out-of-range",
    {
      "AGENTS.md": "# Agent\n\nSkill with tier:T99.\n",
      "skills/bad-skill/SKILL.md":
        "---\nname: bad-skill\ndescription: out-of-range tier\ntier: T99\n---\n\n# Bad skill\n\nT99 is not in the allowed set (T1/T2/T3); lint should flag.\n",
    },
    "SKILL.md frontmatter has tier:T99 — outside allowed T1/T2/T3 range.",
  ],
  [
    "adversarial-memory-bogus-scope",
    {
      "AGENTS.md": "# Agent\n",
      "MEMORY.md":
        "---\nscope: bogus-scope-name\n---\n\n# Memory\n\nscope:bogus is not in the allowed set (default/global/project/session).\n",
    },
    "Already covered by memory-invalid-scope but pinned in adversarial set as a baseline.",
  ],

  // -- jsonc attacks ------------------------------------------------------
  [
    "adversarial-jsonc-utf8-bom",
    {
      "AGENTS.md": "# Agent\n\nGateway.jsonc has UTF-8 BOM.\n",
      "gateway.jsonc": '﻿{ "version": "0.1.0", "plugins": { "entries": {} } }\n',
    },
    "gateway.jsonc starts with UTF-8 BOM (\\uFEFF); parser should handle gracefully.",
  ],
  [
    "adversarial-jsonc-circular-deep",
    {
      "AGENTS.md": "# Agent\n",
      "gateway.jsonc":
        '{\n  "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": "stop here" } } } } } } } } } } } } } } } }\n}\n',
    },
    "Deep nesting; should not blow stack or hang.",
  ],
  [
    "adversarial-jsonc-secret-zero-hash",
    {
      "AGENTS.md":
        "# Agent\n\nPolicy.jsonc has zero-filled placeholder hashes that LOOK like hex secrets.\n",
      "policy.jsonc":
        '{\n  "version": "0.1.0",\n  "tools": [],\n  "denyRules": [],\n  "generatedFrom": {\n    "hash": "0000000000000000000000000000000000000000000000000000000000000000",\n    "bytes": 0,\n    "observedAt": "2026-01-01T00:00:00.000Z"\n  },\n  "policyId": "0000000000000000000000000000000000000000000000000000000000000000",\n  "generatedAt": "2026-01-01T00:00:00.000Z"\n}\n',
    },
    "F-005: secret-as-literal rule false-positives on all-zero hashes. Pin it.",
  ],

  // -- session.jsonl attacks ----------------------------------------------
  [
    "adversarial-session-malformed-line",
    {
      "AGENTS.md": "# Agent\n",
      "sessions/session-broken.jsonl":
        '{"event":"start","ts":"2026-05-05T10:00:00Z"}\nthis is not valid JSON\n{"event":"end","ts":"2026-05-05T10:00:01Z"}\n',
    },
    "Session log has a non-JSON line; jsonl-starter rule should flag malformed-line.",
  ],
  [
    "adversarial-session-empty",
    {
      "AGENTS.md": "# Agent\n",
      "sessions/session-empty.jsonl": "",
    },
    "Session log is empty (0 bytes); jsonl-starter empty-log rule should flag.",
  ],

  // -- lobster workflow attacks -------------------------------------------
  [
    "adversarial-lobster-mutually-exclusive-body",
    {
      "AGENTS.md": "# Agent\n",
      "pipeline.lobster":
        "name: bad-flow\nsteps:\n  - id: step1\n    command: echo hello\n    pipeline: llm.invoke\n    out: result\n",
    },
    "Step has both `command:` and `pipeline:` — mutually exclusive; lint should flag.",
  ],
  [
    "adversarial-lobster-undefined-stdin-ref",
    {
      "AGENTS.md": "# Agent\n",
      "pipeline.lobster":
        "name: bad-flow\nsteps:\n  - id: step1\n    command: cat\n    in: nonexistent-step.stdout\n    out: result\n",
    },
    "`in:` references a step or output that does not exist in this workflow.",
  ],

  // -- file system / encoding edges ---------------------------------------
  [
    "adversarial-empty-canonical-files",
    {
      "AGENTS.md": "",
      "TOOLS.md": "",
      "SOUL.md": "",
      "IDENTITY.md": "",
      "MEMORY.md": "",
    },
    "All canonical files are 0 bytes; substrate should not crash on empty inputs.",
  ],

  // -- LKG attacks --------------------------------------------------------
  [
    "adversarial-lkg-state-malformed",
    {
      "AGENTS.md": "# Agent\n",
      ".openclaw/lkg-health.json": "{ this is not valid JSON [",
    },
    "lkg-health.json is invalid JSON; cage should produce LKG_STATE_FILE_CORRUPT error not crash.",
  ],
  [
    "adversarial-lkg-state-future-version",
    {
      "AGENTS.md": "# Agent\n",
      ".openclaw/lkg-health.json": '{\n  "version": "9.9.9",\n  "entries": {}\n}\n',
    },
    "lkg-health.json declares a future schema version; cage should produce LKG_STATE_FILE_VERSION_MISMATCH.",
  ],

  // -- workspace.json attacks ---------------------------------------------
  [
    "adversarial-workspace-json-malformed",
    {
      "AGENTS.md": "# Agent\n",
      "workspace.json": '{ "lint": { "skip": missing-quotes ] }',
    },
    "workspace.json is invalid; substrate should fall back to defaults rather than crash.",
  ],
  [
    "adversarial-workspace-json-skip-everything",
    {
      "AGENTS.md": "# Agent\n",
      "workspace.json":
        '{\n  "lint": { "skip": ["*"], "skipPaths": ["**"] },\n  "lkg": { "skip": ["*"] },\n  "policy": { "generators": [] }\n}\n',
    },
    "workspace.json skips literally everything via wildcards; substrate behavior should be observable (zero work) not silent.",
  ],

  // -- encoding & line-ending edges --------------------------------------
  [
    "adversarial-md-utf16-le-bom",
    {
      // UTF-16 LE BOM = FF FE, then 'A' = 41 00, '\n' = 0A 00, ...
      "AGENTS.md": Buffer.from([
        0xff, 0xfe, 0x23, 0x00, 0x20, 0x00, 0x41, 0x00, 0x67, 0x00, 0x65, 0x00, 0x6e, 0x00, 0x74,
        0x00, 0x0a, 0x00,
      ]),
    },
    "AGENTS.md saved in UTF-16 LE with BOM; parser should detect or fail gracefully (most expect UTF-8).",
  ],
  [
    "adversarial-md-mixed-line-endings",
    {
      "AGENTS.md": "# Agent\r\n\n## Tools\r\n- foo\n- bar\r\n## Boundaries\n\r\n",
      "TOOLS.md": "# Tools\r\n\n## Tools\n\n### foo # R1, READ\r\n\n### bar # R1, READ\n",
    },
    "Mixed CRLF / LF / CR-only line endings within one file; line-counting + parsing should not desync.",
  ],
  [
    "adversarial-md-trailing-crs",
    {
      "AGENTS.md": "# Agent\r\r\r\r\n\r## Boundaries\r\r\r\n",
    },
    "Lone-CR runs as fake newlines (legacy macOS); md parser should treat consistently.",
  ],
  [
    "adversarial-tools-nfc-vs-nfd-collision",
    {
      "AGENTS.md":
        "# Agent\n\nTwo tools that look identical but use different unicode normalization.\n",
      // First "café" = NFC: c-a-f-é (single composed char)
      // Second "café" = NFD: c-a-f-e + combining acute accent
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### café-tool # R1, READ\nNFC composed form.\n\n### café-tool # R1, READ\nNFD decomposed form — visually identical, byte-different.\n",
    },
    "Unicode NFC vs NFD collision: two visually-identical IDs that the substrate may treat as duplicates or distinct depending on normalization policy.",
  ],
  [
    "adversarial-tools-rtl-override",
    {
      "AGENTS.md": "# Agent\n\nTool ID with right-to-left override (security: visual spoofing).\n",
      // U+202E = RIGHT-TO-LEFT OVERRIDE — common in spoofing attacks
      "TOOLS.md":
        '# Tools\n\n## Tools\n\n### evil‮gpj.tool # R3, WRITE\nID contains RLO; UI rendering will show "eviltool.jpg" but it is in fact "evilgpj.tool".\n',
    },
    "Tool ID contains U+202E (right-to-left override); spoofing-class issue. Substrate should flag or strip.",
  ],
  [
    "adversarial-tools-zero-width-space",
    {
      "AGENTS.md": "# Agent\n\nTool ID contains zero-width space — looks like one ID but is two.\n",
      "TOOLS.md":
        '# Tools\n\n## Tools\n\n### foo # R1, READ\nFirst.\n\n### foo​tool # R1, READ\nSecond — visually "footool" but contains a zero-width space breaking it.\n',
    },
    "ZWSP in tool ID; visually identical but distinct from another tool id; collision-class issue.",
  ],
  [
    "adversarial-tools-homoglyph-cyrillic",
    {
      "AGENTS.md": '# Agent\n\nLatin "a" vs Cyrillic "а" homoglyph.\n',
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### apple-tool # R1, READ\nLatin a.\n\n### аpple-tool # R1, READ\nCyrillic а — visually identical, distinct codepoint.\n",
    },
    "Cyrillic а (U+0430) vs Latin a homoglyph; classic phishing/impersonation pattern.",
  ],

  // -- path traversal in IDs / refs ---------------------------------------
  [
    "adversarial-tools-path-traversal-id",
    {
      "AGENTS.md": "# Agent\n",
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### ../../../etc/passwd # R5, READ\nID is a path-traversal pattern; if any code uses the ID as a filename it leaks.\n",
    },
    "Tool ID is a path-traversal pattern. Substrate must not concatenate raw IDs into FS paths.",
  ],
  [
    "adversarial-skill-name-path-traversal",
    {
      "AGENTS.md": "# Agent\n",
      "manifest.json":
        '{\n  "name": "trav",\n  "version": "0.1.0",\n  "contributes": {\n    "skills": ["trav/../../../escape"]\n  }\n}\n',
    },
    "manifest.json skill name contains parent-directory traversal in the namespace separator.",
  ],
  [
    "adversarial-workflow-absolute-path-ref",
    {
      "AGENTS.md": "# Agent\n",
      "pipeline.lobster":
        "name: bad-flow\nsteps:\n  - id: leak\n    command: cat\n    in: /etc/passwd\n    out: stolen\n",
    },
    "lobster step references absolute system path. Sandbox boundaries should reject.",
  ],

  // -- gateway / URL edges ------------------------------------------------
  [
    "adversarial-gateway-localhost-url",
    {
      "AGENTS.md": "# Agent\n",
      "gateway.jsonc":
        '{\n  "version": "0.1.0",\n  "plugins": {\n    "entries": {\n      "rogue": { "endpoint": "http://localhost:31337/admin" }\n    }\n  }\n}\n',
    },
    "gateway endpoint points at localhost — common SSRF / misconfiguration pattern.",
  ],
  [
    "adversarial-gateway-file-uri",
    {
      "AGENTS.md": "# Agent\n",
      "gateway.jsonc":
        '{\n  "version": "0.1.0",\n  "plugins": {\n    "entries": {\n      "leak": { "endpoint": "file:///etc/shadow" }\n    }\n  }\n}\n',
    },
    "gateway endpoint is a file:// URI — protocol smuggling.",
  ],
  [
    "adversarial-gateway-data-uri",
    {
      "AGENTS.md": "# Agent\n",
      "gateway.jsonc":
        '{\n  "version": "0.1.0",\n  "plugins": {\n    "entries": {\n      "weird": { "endpoint": "data:text/plain;base64,SGVsbG8=" }\n    }\n  }\n}\n',
    },
    "gateway endpoint is a data: URI — should not be accepted as a network endpoint.",
  ],

  // -- unfilled placeholders / template rot -------------------------------
  [
    "adversarial-tools-template-todo",
    {
      "AGENTS.md": "# Agent\n\n<TODO: fill in agent description before shipping>\n",
      "TOOLS.md":
        "# Tools\n\n## Tools\n\n### <TODO> # R<N>, <CAPS>\n<TODO: fill in tool description>\n",
    },
    "AGENTS.md/TOOLS.md scaffolded from template but never customized. Lint should flag <TODO> placeholders.",
  ],
  [
    "adversarial-tools-xxx-marker",
    {
      "AGENTS.md": "# Agent\n\nXXX needs review\n",
      "TOOLS.md": "# Tools\n\n## Tools\n\n### XXX-tool # R3, WRITE\nXXX placeholder description.\n",
    },
    "XXX/FIXME markers leaked into shipped artifact.",
  ],
  [
    "adversarial-policy-unfilled-version",
    {
      "AGENTS.md": "# Agent\n",
      "policy.jsonc":
        '{\n  "version": "{{VERSION}}",\n  "tools": [],\n  "denyRules": [],\n  "policyId": "{{HASH_PLACEHOLDER}}"\n}\n',
    },
    "policy.jsonc has unfilled mustache template placeholders.",
  ],

  // -- LKG edge cases beyond malformed ------------------------------------
  [
    "adversarial-lkg-state-future-timestamp",
    {
      "AGENTS.md": "# Agent\n",
      ".openclaw/lkg-health.json":
        '{\n  "version": "0.1.0",\n  "entries": {\n    "AGENTS.md": {\n      "fingerprint": "abc",\n      "promotedAt": "2099-01-01T00:00:00.000Z",\n      "outcome": "promoted"\n    }\n  }\n}\n',
    },
    "lkg-health.json entry has a far-future promotedAt timestamp; clock-skew handling.",
  ],
  [
    "adversarial-lkg-state-empty-entries",
    {
      "AGENTS.md": "# Agent\n",
      ".openclaw/lkg-health.json": '{ "version": "0.1.0", "entries": {} }\n',
    },
    "Valid but empty lkg-health.json — should report tracked=0, no error.",
  ],
  [
    "adversarial-lkg-state-stale-fingerprint",
    {
      "AGENTS.md": "# Agent\n\nThis content has changed since LKG was promoted.\n",
      ".openclaw/lkg-health.json":
        '{\n  "version": "0.1.0",\n  "entries": {\n    "AGENTS.md": {\n      "fingerprint": "0000000000000000000000000000000000000000000000000000000000000000",\n      "promotedAt": "2026-01-01T00:00:00.000Z",\n      "outcome": "promoted"\n    }\n  }\n}\n',
    },
    "Stale fingerprint mismatch — typical post-edit recovery scenario; cage status should report drift.",
  ],
  [
    "adversarial-lkg-state-missing-tracker",
    {
      "AGENTS.md": "# Agent\n",
      ".openclaw/lkg-health.json":
        '{\n  "version": "0.1.0",\n  "entries": {\n    "FILE_THAT_DOES_NOT_EXIST.md": {\n      "fingerprint": "abc",\n      "promotedAt": "2026-01-01T00:00:00.000Z",\n      "outcome": "promoted"\n    }\n  }\n}\n',
    },
    "lkg state references a path that no longer exists on disk; should not crash, should report orphan.",
  ],

  // -- session.jsonl deeper edges -----------------------------------------
  [
    "adversarial-session-very-large-line",
    {
      "AGENTS.md": "# Agent\n",
      // 64KB single line
      "sessions/session-huge.jsonl": '{"event":"start","data":"' + "x".repeat(64 * 1024) + '"}\n',
    },
    "A single jsonl line exceeds 64KB; parsers using line-buffered scanners may truncate.",
  ],
  [
    "adversarial-session-only-newlines",
    {
      "AGENTS.md": "# Agent\n",
      "sessions/session-blank.jsonl": "\n\n\n\n\n",
    },
    "Session log is only newlines; should not be flagged as malformed-line N times.",
  ],
  [
    "adversarial-session-trailing-data",
    {
      "AGENTS.md": "# Agent\n",
      // last line has no trailing newline
      "sessions/session-untermdata.jsonl":
        '{"event":"start"}\n{"event":"middle"}\n{"event":"end-but-no-newline"}',
    },
    "Last line has no trailing newline (POSIX-imperfect); jsonl reader should still emit it.",
  ],

  // -- workspace.json deeper edges ----------------------------------------
  [
    "adversarial-workspace-json-empty-file",
    {
      "AGENTS.md": "# Agent\n",
      "workspace.json": "",
    },
    "workspace.json is 0 bytes; loader treats as empty config (per LWC-06) — verify substrate plumbing.",
  ],
  [
    "adversarial-workspace-json-array-root",
    {
      "AGENTS.md": "# Agent\n",
      "workspace.json": "[1, 2, 3]",
    },
    "workspace.json root is an array, not object; should produce WORKSPACE_CONFIG_NOT_OBJECT (LWC-09).",
  ],
  [
    "adversarial-workspace-json-string-root",
    {
      "AGENTS.md": "# Agent\n",
      "workspace.json": '"just a string"',
    },
    "workspace.json root is a bare string; same WORKSPACE_CONFIG_NOT_OBJECT path.",
  ],
  [
    "adversarial-workspace-json-deeply-nested-skip",
    {
      "AGENTS.md": "# Agent\n",
      "workspace.json": '{ "lint": { "skip": ' + "[".repeat(100) + '"x"' + "]".repeat(100) + " } }",
    },
    "workspace.json has 100-deep array nesting in lint.skip; jsonc parser should not blow stack.",
  ],

  // -- manifest cross-references ------------------------------------------
  [
    "adversarial-manifest-empty-contributes",
    {
      "AGENTS.md": "# Agent\n",
      "manifest.json": '{ "name": "empty", "version": "0.1.0", "contributes": {} }\n',
    },
    "Plugin with empty contributes — degenerate but valid; should not crash.",
  ],
  [
    "adversarial-manifest-circular-skill-tool-ref",
    {
      "AGENTS.md": "# Agent\n",
      "manifest.json":
        '{\n  "name": "circ",\n  "version": "0.1.0",\n  "contributes": {\n    "tools": ["circ/skill-a"],\n    "skills": ["circ/tool-a"]\n  }\n}\n',
    },
    "Manifest swaps tool/skill IDs — they reference each other under the wrong category.",
  ],
  [
    "adversarial-manifest-leading-junk",
    {
      "AGENTS.md": "# Agent\n",
      "manifest.json": '   {\n  "name": "junk",\n  "version": "0.1.0"\n}\n',
    },
    "Leading non-breaking-space whitespace before the JSON document; some parsers reject.",
  ],
];

async function generateAll() {
  let generated = 0;
  let skipped = 0;
  const manifestEntries = [];
  for (const [slug, files, notes] of RECIPES) {
    const fixtureDir = join(FIX_DIR, slug);
    if (existsSync(fixtureDir)) {
      skipped++;
      continue;
    }
    await mkdir(fixtureDir, { recursive: true });
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = join(fixtureDir, relPath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
    }
    manifestEntries.push({
      slug,
      kind: "synthetic",
      shapeFiles: Object.keys(files),
      notes: `adversarial: ${notes}`,
    });
    generated++;
  }
  // append manifest
  const manifestPath = join(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const existing = new Set(manifest.fixtures.map((f) => f.slug));
  for (const entry of manifestEntries) {
    if (!existing.has(entry.slug)) manifest.fixtures.push(entry);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `adversarial fixtures: generated=${generated}, skipped=${skipped}, manifest size=${manifest.fixtures.length}`,
  );
}

await generateAll();
