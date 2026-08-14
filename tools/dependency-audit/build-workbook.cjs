const fs = require("node:fs");
const ExcelJS = require("exceljs");
const path = require("node:path");

const [inventoryPath, pilotPath, reviewsPath, moderateReviewsPath, outputPath] = process.argv.slice(2);
if (!inventoryPath || !pilotPath || !reviewsPath || !moderateReviewsPath || !outputPath) {
  throw new Error("usage: build-workbook.cjs <inventory.json> <pilot.json> <reviews.json> <moderate-reviews.json> <output.xlsx>");
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const pilots = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
const controlsPath = path.join(path.dirname(moderateReviewsPath), "microsoft-controls.json");
const microsoftControls = JSON.parse(fs.readFileSync(controlsPath, "utf8"));
const reviewGroups = [
  ...JSON.parse(fs.readFileSync(reviewsPath, "utf8")),
  ...JSON.parse(fs.readFileSync(moderateReviewsPath, "utf8")),
];
const pilotMap = new Map(pilots.map((row) => [`${row.package}@${row.version}`, row]));
const reviewMap = new Map();
for (const review of reviewGroups) {
  const identities = review.packages || [`${review.package}@${review.version}`];
  for (const identity of identities) {
    reviewMap.set(`${review.ecosystem}:${identity}`, review);
  }
}
for (const row of inventory.inventory) {
  const pilot = row.ecosystem === "npm" ? pilotMap.get(`${row.package}@${row.version}`) : undefined;
  if (pilot) {
    row.technical_risk = pilot.technical_risk;
    row.blast_radius = pilot.blast_radius;
    row.rating_basis = pilot.risk_reason;
    row.security_evidence = pilot.security_evidence;
    row.recommended_action = pilot.recommended_action;
    row.review_status = "Reviewed";
    row.evidence_date ||= "2026-08-13";
    row.evidence_source ||= pilot.sources;
    row.notes = [row.notes, `Pilot: ${pilot.risk_reason}`].filter(Boolean).join(" ");
  }
  const review = reviewMap.get(`${row.ecosystem}:${row.package}@${row.version}`);
  if (review) {
    for (const field of [
      "technical_risk",
      "blast_radius",
      "rating_basis",
      "security_evidence",
      "microsoft_disposition",
      "microsoft_evidence",
      "cfs_admission",
      "cg_status",
      "remediation_target",
      "recommended_action",
      "review_status",
      "evidence_date",
      "evidence_source",
    ]) {
      if (review[field]) row[field] = review[field];
    }
    row.review_status ||= "Reviewed";
    row.evidence_date ||= "2026-08-13";
    if (row.source_files.startsWith(".github/release/")) {
      if (!review.microsoft_disposition) row.microsoft_disposition = "Review required";
      if (!review.microsoft_evidence) row.microsoft_evidence = "Exact version is CFS-admitted; no authoritative component decision or OpenClaw CG result was established.";
      if (!review.cfs_admission) row.cfs_admission = "Available";
      if (!review.cg_status) row.cg_status = "Not checked for OpenClaw";
      if (!review.evidence_source) row.evidence_source = "CFS exact-version query; OSV; release package-lock parent trace";
    }
    row.notes = [row.notes, `Exact review completed ${review.evidence_date || "2026-08-13"}.`]
      .filter(Boolean)
      .join(" ");
  }
}
const wb = new ExcelJS.Workbook();
wb.creator = "OpenClaw dependency governance";
wb.created = new Date();

const navy = "FF17324D";
const blue = "FF2F75B5";
const lightBlue = "FFD9EAF7";
const amber = "FFFFE699";
const red = "FFF4CCCC";
const green = "FFD9EAD3";
const gray = "FFE7E6E6";

const npmFeedGapCount = inventory.inventory.filter(
  (row) =>
    row.ecosystem === "npm" &&
    (row.cfs_admission === "Unavailable" || row.cfs_admission === "Exact version unavailable"),
).length;
const criticalCount = inventory.inventory.filter((row) => row.technical_risk === "Critical").length;
const unknownCount = inventory.inventory.filter((row) => row.technical_risk === "Unknown").length;
const highReviewRequiredCount = inventory.inventory.filter(
  (row) => row.technical_risk === "High" && row.microsoft_disposition === "Review required",
).length;
const reviewRequiredCount = inventory.inventory.filter(
  (row) => row.microsoft_disposition === "Review required",
).length;
const reviewedCount = inventory.inventory.filter((row) => row.review_status === "Reviewed").length;

function resolveControl(control) {
  switch (control.metric) {
    case "all-reviewed":
      return {
        status: {
          formula: 'IF(COUNTIF(Inventory!W:W,"Reviewed")=COUNTA(Inventory!B:B)-1,"Satisfied","Gap")',
          result: reviewedCount === inventory.inventory.length ? "Satisfied" : "Gap",
        },
        current_evidence: `${reviewedCount} of ${inventory.inventory.length} exact identities are Reviewed.`,
      };
    case "npm-cfs":
      return {
        status: {
          formula:
            'IF(COUNTIFS(Inventory!A:A,"npm",Inventory!X:X,"Unavailable")+COUNTIFS(Inventory!A:A,"npm",Inventory!X:X,"Exact version unavailable")=0,"Satisfied","Gap")',
          result: npmFeedGapCount === 0 ? "Satisfied" : "Gap",
        },
        current_evidence: `${npmFeedGapCount} exact npm identities are unavailable from CFS.`,
      };
    case "no-critical":
      return {
        status: {
          formula: 'IF(COUNTIF(Inventory!N:N,"Critical")=0,"Satisfied","Gap")',
          result: criticalCount === 0 ? "Satisfied" : "Gap",
        },
        current_evidence: `${criticalCount} Critical technical-risk rows.`,
      };
    case "no-unknown":
      return {
        status: {
          formula: 'IF(COUNTIF(Inventory!N:N,"Unknown")=0,"Satisfied","Gap")',
          result: unknownCount === 0 ? "Satisfied" : "Gap",
        },
        current_evidence: `${unknownCount} technical-risk rows remain Unknown.`,
      };
    case "high-decisions":
      return {
        status: {
          formula:
            'IF(COUNTIFS(Inventory!N:N,"High",Inventory!U:U,"Review required")=0,"Satisfied","Gap")',
          result: highReviewRequiredCount === 0 ? "Satisfied" : "Gap",
        },
        current_evidence: `${highReviewRequiredCount} High-risk rows still require an authoritative decision.`,
      };
    case "resolved-dispositions":
      return {
        status: {
          formula: 'IF(COUNTIF(Inventory!U:U,"Review required")=0,"Satisfied","Gap")',
          result: reviewRequiredCount === 0 ? "Satisfied" : "Gap",
        },
        current_evidence: `${reviewRequiredCount} rows remain Review required.`,
      };
    default:
      return { status: control.status, current_evidence: control.current_evidence };
  }
}

function styleSheet(ws) {
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: ws.getCell("A1"), to: ws.getCell(1, ws.columnCount) };
  ws.getRow(1).height = 30;
  ws.getRow(1).eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  ws.eachRow((row, index) => {
    if (index > 1) {
      row.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10 };
        cell.alignment = { vertical: "top", wrapText: true };
      });
    }
  });
}

const summary = wb.addWorksheet("Summary");
summary.columns = [
  { header: "OpenClaw Dependency Governance", key: "label", width: 42 },
  { header: "Value", key: "value", width: 24 },
  { header: "Notes", key: "notes", width: 78 },
];
summary.addRows([
  { label: "Baseline commit", value: inventory.baseline.commit, notes: "Exact upstream-main snapshot" },
  { label: "Inventory rows", value: { formula: "COUNTA(Inventory!B:B)-1", result: inventory.inventory.length }, notes: "Unique ecosystem, package, and version records" },
  { label: "Pilot ratings", value: { formula: "COUNTA('Pilot Ratings'!A:A)-1", result: pilots.length }, notes: "Fully reviewed public-evidence sample" },
  { label: "Current high risk", value: { formula: 'COUNTIF(Inventory!N:N,"High")', result: inventory.inventory.filter((row) => row.technical_risk === "High").length }, notes: "Reviewed privileged, shipped-unmaintained, mutable-image, or serious release-tool risk" },
  { label: "Current unknown risk", value: { formula: 'COUNTIF(Inventory!N:N,"Unknown")', result: inventory.inventory.filter((row) => row.technical_risk === "Unknown").length }, notes: "Explicit unresolved license, procurement, or exact-image evidence" },
  { label: "Microsoft approved", value: { formula: 'COUNTIF(Inventory!U:U,"Approved")', result: inventory.inventory.filter((row) => row.microsoft_disposition === "Approved").length }, notes: "Requires authoritative Microsoft evidence" },
  { label: "Microsoft review required", value: { formula: 'COUNTIF(Inventory!U:U,"Review required")', result: inventory.inventory.filter((row) => row.microsoft_disposition === "Review required").length }, notes: "Bounded discovery completed without an authoritative component decision" },
  { label: "Exact reviews complete", value: { formula: 'COUNTIF(Inventory!W:W,"Reviewed")', result: inventory.inventory.filter((row) => row.review_status === "Reviewed").length }, notes: "High queue plus formerly Unknown ecosystem records with evidence and actions" },
  { label: "Microsoft controls satisfied", value: { formula: 'COUNTIF(\'Microsoft Controls\'!C:C,"Satisfied")', result: microsoftControls.map(resolveControl).filter((row) => row.status?.result === "Satisfied" || row.status === "Satisfied").length }, notes: "Control ledger gates satisfied for this exact baseline" },
  { label: "Production pnpm audit", value: "0 advisories", notes: "pnpm audit --json --prod at the baseline commit; 1,293 dependencies evaluated" },
]);
summary.getRow(1).font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
summary.getColumn(2).font = { name: "Arial", color: { argb: blue } };
summary.eachRow((row) => row.eachCell((cell) => (cell.alignment = { vertical: "top", wrapText: true })));

const inventorySheet = wb.addWorksheet("Inventory");
const columns = [
  ["Ecosystem", "ecosystem", 16],
  ["Package", "package", 42],
  ["Version", "version", 28],
  ["Direct", "direct", 10],
  ["Optional", "optional", 10],
  ["Development", "development", 12],
  ["Usage", "usage", 30],
  ["Blast radius", "blast_radius", 13],
  ["Workspaces", "workspaces", 34],
  ["Source files", "source_files", 42],
  ["Integrity", "integrity", 48],
  ["License", "license", 18],
  ["Repository", "repository", 44],
  ["Technical risk", "technical_risk", 16],
  ["Rating basis", "rating_basis", 48],
  ["Security evidence", "security_evidence", 34],
  ["Vulnerability IDs", "vulnerability_ids", 30],
  ["Deprecated", "deprecated", 30],
  ["Maintainers", "maintainers", 12],
  ["Lifecycle scripts", "lifecycle_scripts", 46],
  ["Microsoft disposition", "microsoft_disposition", 22],
  ["Microsoft evidence", "microsoft_evidence", 38],
  ["Review status", "review_status", 16],
  ["CFS admission", "cfs_admission", 20],
  ["CG status", "cg_status", 22],
  ["Remediation target", "remediation_target", 34],
  ["Evidence date", "evidence_date", 16],
  ["Evidence source", "evidence_source", 54],
  ["Recommended action", "recommended_action", 24],
  ["Notes", "notes", 50],
];
inventorySheet.columns = columns.map(([header, key, width]) => ({ header, key, width }));
inventorySheet.addRows(
  inventory.inventory.map((row) => ({
    ...row,
    security_evidence: row.security_evidence || "Not yet enriched",
    microsoft_disposition: row.microsoft_disposition || "Unknown",
    microsoft_evidence: row.microsoft_evidence || "Pending governance lookup",
    review_status: row.review_status || "Automated triage",
    cfs_admission: row.cfs_admission || "Not checked",
    cg_status: row.cg_status || "Not checked",
  })),
);
styleSheet(inventorySheet);
inventorySheet.getColumn("N").eachCell((cell, row) => {
  if (row > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: amber } };
});
inventorySheet.getColumn("U").eachCell((cell, row) => {
  if (row > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: amber } };
});

const controlsSheet = wb.addWorksheet("Microsoft Controls");
controlsSheet.columns = [
  { header: "Control", key: "id", width: 16 },
  { header: "Microsoft expectation", key: "expectation", width: 52 },
  { header: "Status", key: "status", width: 18 },
  { header: "Current evidence", key: "current_evidence", width: 62 },
  { header: "Completion criteria", key: "completion_criteria", width: 62 },
  { header: "Authority", key: "authority", width: 40 },
  { header: "Owner", key: "owner", width: 34 },
  { header: "Depends on", key: "depends_on", width: 34 },
];
controlsSheet.addRows(
  microsoftControls.map((control) => {
    const resolved = resolveControl(control);
    return { ...control, ...resolved };
  }),
);
styleSheet(controlsSheet);
controlsSheet.getColumn("C").eachCell((cell, row) => {
  if (row === 1) return;
  const value =
    cell.value && typeof cell.value === "object" && "result" in cell.value
      ? cell.value.result
      : cell.value;
  const color = value === "Satisfied" ? green : value === "Blocked" ? red : amber;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
});

const pilotSheet = wb.addWorksheet("Pilot Ratings");
pilotSheet.columns = [
  { header: "Package", key: "package", width: 28 },
  { header: "Version", key: "version", width: 20 },
  { header: "Usage", key: "usage", width: 34 },
  { header: "Blast radius", key: "blast_radius", width: 13 },
  { header: "Technical risk", key: "technical_risk", width: 16 },
  { header: "Why", key: "risk_reason", width: 68 },
  { header: "License", key: "license", width: 14 },
  { header: "Public security evidence", key: "security_evidence", width: 42 },
  { header: "Microsoft disposition", key: "microsoft_disposition", width: 22 },
  { header: "WorkIQ query", key: "workiq_query", width: 48 },
  { header: "Recommended action", key: "recommended_action", width: 26 },
  { header: "Sources", key: "sources", width: 58 },
];
pilotSheet.addRows(pilots);
styleSheet(pilotSheet);
pilotSheet.getColumn("E").eachCell((cell, row) => {
  if (row === 1) return;
  const color = cell.value === "High" ? red : cell.value === "Moderate" ? amber : green;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
});
pilotSheet.getColumn("I").eachCell((cell, row) => {
  if (row > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: gray } };
});

const guide = wb.addWorksheet("Rating Guide");
guide.columns = [
  { header: "Axis", key: "axis", width: 28 },
  { header: "Value", key: "value", width: 25 },
  { header: "Meaning", key: "meaning", width: 90 },
];
guide.addRows([
  ["Technical risk", "Low", "Maintained, normal provenance, compatible license, no material reachable advisory, narrow exposure"],
  ["Technical risk", "Moderate", "Acceptable with tracked exposure, lifecycle-script, maintenance, or provenance weaknesses"],
  ["Technical risk", "High", "Privileged or network-facing use combined with weak maintenance/provenance or serious reachable risk"],
  ["Technical risk", "Critical", "Exploitable blocker, prohibited legal condition, compromised provenance, or unacceptable privileged behavior"],
  ["Technical risk", "Unknown", "Required evidence is missing; never treat as Low"],
  ["Microsoft", "Approved", "Authoritative record covers the exact component or range and intended usage"],
  ["Microsoft", "Conditional", "Authoritative record names required controls, scope, version, or exception"],
  ["Microsoft", "Internal precedent", "Internal usage exists, but approval authority has not been established"],
  ["Microsoft", "Review required", "Route to the owning governance process"],
  ["Microsoft", "Blocked", "Authoritative policy disallows the component or intended use"],
  ["Blast radius", "R4", "Privileged core runtime, auth, secrets, process execution, or update/install path"],
  ["Blast radius", "R3", "Network-facing parser, channel/provider runtime, state, or default shipped feature"],
  ["Blast radius", "R2", "Optional plugin or bounded runtime feature"],
  ["Blast radius", "R1", "Build/release tooling that cannot enter the shipped artifact"],
  ["Blast radius", "R0", "Test, fixture, docs, or local development only"],
].map(([axis, value, meaning]) => ({ axis, value, meaning })));
styleSheet(guide);

const gaps = wb.addWorksheet("Evidence Gaps");
gaps.columns = [
  { header: "Gap", key: "gap", width: 40 },
  { header: "Status", key: "status", width: 22 },
  { header: "Next evidence", key: "next", width: 88 },
];
gaps.addRows([
  { gap: "Microsoft governance model", status: "Established", next: "Keep CFS admission, CG status, intended-use decision, and technical risk as separate evidence fields" },
  { gap: "Exact inventory review", status: "Complete", next: "All 2,624 exact identities are reviewed; rerun only on dependency delta" },
  { gap: "Exact npm CFS admission", status: `${npmFeedGapCount} gaps`, next: "Wait for the minimum-release hold or use the governed CFS support path; do not bypass CFS" },
  { gap: "OpenClaw CG coverage", status: "Gap", next: "Register the exact lock/SBOM and built-image inventory when authorized, then reconcile the CG manifest to this workbook" },
  { gap: "CG alert enforcement", status: "Gap", next: "Enable blocking alerts instead of cg.failOnAlert: false and produce a successful governed run" },
  { gap: "Remaining Unknown rows", status: "6", next: "Resolve four Blacksmith action procurement/license records, replace or clear rx.mini, and supply the Cloudflare image digest" },
  { gap: "Authoritative dispositions", status: "2,623 Review required", next: "Use a reconciled clean governed run for ordinary OSS controls and individual owner/exception records only for residual High or exceptional usage" },
  { gap: "Release attestation", status: "Blocked", next: "Record commit, lock/SBOM digest, CFS result, CG correlation and manifest, exceptions, image digests, and release identifier" },
]);
styleSheet(gaps);

for (const ws of wb.worksheets) {
  ws.properties.defaultRowHeight = 18;
  ws.eachRow((row) => row.eachCell((cell) => {
    cell.font = { ...(cell.font || {}), name: "Arial" };
  }));
}

wb.calcProperties.fullCalcOnLoad = true;
fs.mkdirSync(require("node:path").dirname(outputPath), { recursive: true });
wb.xlsx.writeFile(outputPath).then(() => console.log(outputPath));
