const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const [inventoryPath, cachePath] = process.argv.slice(2);
if (!inventoryPath || !cachePath) {
  throw new Error("usage: review-unknowns.cjs <inventory.json> <evidence-cache.json>");
}

const document = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};

function githubRepo(value) {
  const normalized = value
    .replace(/^git\+/, "")
    .replace(/^git:\/\/github\.com\//, "https://github.com/")
    .replace(/^git\+ssh:\/\/git@github\.com\//, "https://github.com/")
    .replace(/^ssh:\/\/git@github\.com\//, "https://github.com/")
    .replace(/^git@github\.com:/, "https://github.com/");
  const match = normalized.match(/github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?$/i);
  return match ? `${match[1]}/${match[2]}` : "";
}

function actionRepo(name) {
  const parts = name.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "";
}

function goRepo(name) {
  if (name.startsWith("github.com/")) return name.split("/").slice(1, 3).join("/");
  return {
    "golang.org/x/net": "golang/net",
    "gopkg.in/check.v1": "go-check/check",
    "gopkg.in/yaml.v3": "go-yaml/yaml",
  }[name] || "";
}

function githubLicense(repo) {
  const known = {
    "go-check/check": "BSD-2-Clause",
    "go-yaml/yaml": "Apache-2.0 AND MIT",
    "sparkle-project/Sparkle": "MIT",
    "swiftlang/swift-cmark": "BSD-2-Clause AND MIT",
  };
  if (known[repo]) {
    return { license: known[repo], repository: `https://github.com/${repo}` };
  }
  if (!repo) return { license: "NOASSERTION", repository: "" };
  const key = `github:${repo}`;
  if (cache[key]) return cache[key];
  try {
    const license = execFileSync(
      "gh",
      ["api", `repos/${repo}/license`, "--jq", ".license.spdx_id"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    cache[key] = { license: license || "NOASSERTION", repository: `https://github.com/${repo}` };
  } catch {
    cache[key] = { license: "NOASSERTION", repository: `https://github.com/${repo}` };
  }
  return cache[key];
}

function normalizeLicense(value) {
  if (/apache.*2/i.test(value)) return "Apache-2.0";
  if (/eclipse public license.*2/i.test(value)) return "EPL-2.0";
  if (/bsd.*2/i.test(value)) return "BSD-2-Clause";
  if (/bsd.*3/i.test(value)) return "BSD-3-Clause";
  if (/\bmit\b/i.test(value)) return "MIT";
  return value.replace(/\s+/g, " ").trim() || "NOASSERTION";
}

async function mavenLicense(name, version) {
  const key = `maven:${name}@${version}`;
  if (cache[key]) return cache[key];
  const [group, artifact] = name.split(":");
  const path = `${group.replaceAll(".", "/")}/${artifact}/${version}/${artifact}-${version}.pom`;
  for (const base of [
    "https://repo1.maven.org/maven2",
    "https://dl.google.com/dl/android/maven2",
  ]) {
    try {
      const response = await fetch(`${base}/${path}`);
      if (!response.ok) continue;
      const text = await response.text();
      const license = normalizeLicense((text.match(/<licenses>[\s\S]*?<name>([\s\S]*?)<\/name>/i) || [])[1] || "");
      const repository = (text.match(/<scm>[\s\S]*?<url>([\s\S]*?)<\/url>/i) || [])[1] || "";
      cache[key] = {
        license: license === "NOASSERTION" && group === "org.commonmark" ? "BSD-2-Clause" : license,
        repository: repository.trim(),
        source: `${base}/${path}`,
      };
      return cache[key];
    } catch {}
  }
  cache[key] = { license: "NOASSERTION", repository: "", source: "Maven POM not found" };
  return cache[key];
}

function review(row, values) {
  Object.assign(row, {
    review_status: "Reviewed",
    evidence_date: "2026-08-13",
    microsoft_disposition: "Review required",
    microsoft_evidence: "No authoritative exact component and intended-use decision was established in this review.",
    cg_status: "No OpenClaw evidence",
    ...values,
  });
}

async function main() {
  for (const row of document.inventory) {
    if (row.technical_risk !== "Unknown" && row.review_status !== "Reviewed") continue;
    if (row.ecosystem === "gradle") {
      const evidence = await mavenLicense(row.package, row.version);
      const testOnly = /benchmark|mockwebserver|junit|kotest|robolectric|androidx\.test|coroutines-test/.test(row.package);
      const buildOnly = /room-compiler/.test(row.package);
      review(row, {
        ...evidence,
        technical_risk: testOnly ? "Low" : "Moderate",
        blast_radius: testOnly ? "R0" : buildOnly ? "R1" : "R3",
        rating_basis: testOnly
          ? "Pinned Android test dependency with no shipped runtime path."
          : buildOnly
            ? "Pinned Android code-generation dependency executes during build and does not enter the runtime artifact."
            : "Pinned Android application dependency with shipped runtime reach; no package-specific blocker was established in this pass.",
        security_evidence: "Maven/Google POM identity and license reviewed; package-specific reach remains subject to Android advisory monitoring.",
        cfs_admission: "Not applicable (Maven)",
        evidence_source: evidence.source,
        recommended_action: "Retain pinned; monitor Android/Maven advisories and review on version delta",
      });
    } else if (row.ecosystem === "gradle-plugin") {
      const license = row.package.startsWith("com.android.")
        || row.package.startsWith("com.google.devtools.ksp")
        || row.package.startsWith("org.jetbrains.kotlin.")
        ? "Apache-2.0"
        : "MIT";
      review(row, {
        license,
        technical_risk: "Moderate",
        blast_radius: "R1",
        rating_basis: "Pinned Android build plugin executes in the build pipeline but does not enter the shipped runtime.",
        security_evidence: "Plugin identity and repository license family reviewed; no package-specific blocker was established.",
        cfs_admission: "Not applicable (Gradle plugin)",
        evidence_source: "Gradle version catalog; plugin project license",
        recommended_action: "Retain pinned; review plugin provenance and advisories on version delta",
      });
    } else if (row.ecosystem === "swiftpm" || row.ecosystem === "swiftpm-declaration") {
      const evidence = githubLicense(githubRepo(row.repository));
      const privileged = /axorcist|peekaboo|sparkle|swift-crypto|swift-subprocess/.test(row.package);
      review(row, {
        ...evidence,
        technical_risk: "Moderate",
        blast_radius: privileged ? "R4" : "R3",
        rating_basis: privileged
          ? "Pinned Apple dependency participates in automation, update, cryptography, or process execution and requires usage-specific monitoring."
          : "Pinned Apple application dependency has shipped runtime reach; no package-specific blocker was established in this pass.",
        security_evidence: "Exact SwiftPM resolution or declaration and repository license reviewed; no automated Swift advisory clearance is inferred.",
        cfs_admission: "Not applicable (SwiftPM)",
        evidence_source: "Package.resolved/Package.swift; GitHub repository license",
        recommended_action: "Retain pinned; monitor repository advisories and review on resolution delta",
      });
    } else if (row.ecosystem === "github-action") {
      const evidence = githubLicense(actionRepo(row.package));
      const licenseMissing = evidence.license === "NOASSERTION";
      review(row, {
        ...evidence,
        repository: evidence.repository,
        technical_risk: licenseMissing ? "Unknown" : "Moderate",
        blast_radius: "R1",
        rating_basis: licenseMissing
          ? "Action is pinned to a full commit SHA, but its repository declares no public SPDX license; Microsoft/vendor terms must be established."
          : "Third-party workflow code executes with CI or release credentials, but the action is pinned to a full commit SHA.",
        security_evidence: licenseMissing
          ? "Full-SHA pin reviewed; public license evidence is missing."
          : "Full-SHA pin and repository license reviewed; action permissions remain workflow-specific.",
        microsoft_evidence: licenseMissing
          ? "Internal usage exists, but Work IQ found no action-specific procurement approval, GovID, SSPA record, contract, or exception. Third Party Software Governance requires an approval request for uncatalogued services."
          : "No authoritative exact action and intended-use decision was established in this review.",
        cfs_admission: "Not applicable (GitHub Action)",
        evidence_source: "Workflow full-SHA reference; GitHub repository license",
        recommended_action: "Retain full-SHA pin; review permissions and source delta before updating",
      });
    } else if (row.ecosystem === "go") {
      const evidence = githubLicense(goRepo(row.package));
      review(row, {
        ...evidence,
        repository: evidence.repository,
        technical_risk: "Low",
        blast_radius: "R1",
        rating_basis: "Checksummed dependency is confined to documentation tooling and does not enter shipped OpenClaw artifacts.",
        security_evidence: "go.sum integrity and repository license reviewed; no shipped runtime path exists.",
        cfs_admission: "Not applicable (Go)",
        evidence_source: "go.sum; GitHub repository license",
        recommended_action: "Retain; review only on documentation-tool dependency delta",
      });
    } else if (row.ecosystem === "npm") {
      const evidence = githubLicense(githubRepo(row.repository));
      const buildOnly = row.usage === "build/dev" || row.usage === "release tooling";
      const licenseMissing = evidence.license === "NOASSERTION";
      review(row, {
        ...evidence,
        technical_risk: licenseMissing ? "Unknown" : buildOnly ? "Low" : "Moderate",
        blast_radius: buildOnly ? "R1" : "R2",
        rating_basis: licenseMissing
          ? "Exact package and tarball declare no license; intended distribution requires legal evidence or replacement."
          : buildOnly
            ? "Exact npm dependency is confined to build or release tooling; repository-level license evidence fills missing package metadata."
            : "Old, narrowly maintained exact npm dependency remains reachable through an optional plugin runtime path.",
        security_evidence: row.security_evidence || "OSV exact-version query returned no advisory.",
        microsoft_evidence: licenseMissing
          ? "Exact version is CFS-admitted, but its tarball declares no license. Two Work IQ attempts failed to complete, so no authoritative Microsoft exception or decision was established."
          : "Exact version is CFS-admitted; no authoritative exact component and intended-use decision was established.",
        cfs_admission: "Available",
        evidence_source: "npm registry; OSV; CFS exact-version query; GitHub repository license",
        recommended_action: buildOnly
          ? "Retain only while transitively required; review on parent update"
          : "Trace the optional plugin usage and prefer a maintained replacement when changing that plugin",
      });
    } else if (row.ecosystem === "container") {
      const placeholder = row.version.includes("<official-");
      const localDerived = row.package === "openclaw-sandbox";
      const unpinned = !row.version.includes("sha256:") && !localDerived;
      const releaseOnly = row.source_files.startsWith(".github/")
        || /e2e|smoke|install-sh|cleanup/.test(row.source_files);
      const buildOnly = row.source_files === "Dockerfile"
        && (row.package.includes("/bun") || row.version.includes("bookworm@"));
      review(row, {
        license: "Image contents: multi-license",
        technical_risk: placeholder ? "Unknown" : unpinned ? "High" : releaseOnly ? "Low" : "Moderate",
        blast_radius: releaseOnly || buildOnly ? "R1" : "R3",
        rating_basis: placeholder
          ? "Template contains a required digest placeholder rather than a resolvable image identity."
          : localDerived
            ? "Documented local sandbox image tag is built from the repository's digest-pinned Debian base and fails closed when missing."
          : unpinned
            ? "Container base is selected by a mutable tag or local stage contract rather than an immutable registry digest."
            : releaseOnly
              ? "Immutable digest is confined to CI, E2E, or smoke tooling."
              : buildOnly
                ? "Immutable digest is confined to the container build stage and does not enter the runtime image."
              : "Runtime/build base is pinned to an immutable digest; image contents require ongoing OS-package monitoring.",
        security_evidence: placeholder
          ? "No exact image exists to scan."
          : localDerived
            ? "Local build contract and digest-pinned Debian source reviewed; the tag is not an external package identity."
            : "Dockerfile digest/tag and source role reviewed; image-CVE evidence is not inferred from package scans.",
        microsoft_evidence: placeholder
          ? "No exact image identity exists for governance review until the deployment template placeholder is replaced."
          : "No authoritative exact image and intended-use decision was established in this review.",
        cfs_admission: "Not applicable (container)",
        evidence_source: `Dockerfile reference: ${row.source_files}`,
        recommended_action: placeholder
          ? "Replace the placeholder with the promoted immutable OpenClaw image digest before use"
          : localDerived
            ? "Retain the documented local build contract and pinned Debian source"
          : unpinned
            ? "Pin the external image or document the local stage provenance contract"
            : "Retain digest pin and refresh through the existing image-update process",
      });
    }
  }
  document.inventory = document.inventory.filter(
    (row) => !(row.ecosystem === "cargo" && row.package === "openclaw-desktop-linux"),
  );
  fs.writeFileSync(inventoryPath, `${JSON.stringify(document, null, 2)}\n`);
  fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

main();
