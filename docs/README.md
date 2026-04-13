# claws — The Governance Compiler

claws reads OpenClaw workspace files and compiles governance rules into executable enforcement code. Unlike linters that report violations, claws generates the runtime — a TypeScript Gateway plugin that intercepts every tool call and enforces risk classification, elicitation gates, delegation boundaries, injection defense, and bounded reasoning limits.

**The moat is code generation.** Any tool can check policy. claws emits the code that enforces it.

---

## Understand It

The [concept guides](concepts/README.md) cover the full product: architecture (three-engine model for parse→analyze→emit, three-ring security for inner/middle/outer boundaries, lossless round-trip guarantee), governance (tool classification with R1-R5 risk levels, OBO boundary for agent delegation, fail modes, elicitation gates), platforms (7 compilation targets from OpenClaw to CrewAI), and operations (fleet compliance, snapshots, kill switch, incident response).

Start with [claws-init](how-to/initialize-workspace.md) to see it in action, then read the architecture concepts.

## Do It

The [how-to guides](how-to/) walk through the complete developer journey: initialize a workspace, run your first build, write governance rules, publish a skill via the skill-kit, and set up three-ring security. Imperative voice, code blocks, no theory.

## Learn It Step by Step

The [tutorials](tutorials/) are the guided path — a multi-part series from init through three-ring security to governance plugins and lossless round-trip. Each lesson builds on the previous one.

## Trace It

The [traces](traces/) follow governance compilation end-to-end. See how 9 workspace files become a typed GovernanceIR, how rules compose through the three rings, how the gateway plugin gets emitted, and how fleet compliance rolls out across a workspace fleet.

## See It

[Examples](examples/) show claws configurations, governance rules, and compiled output. See what the compiler reads and what it produces.

## Present It

The [why-claws presentation](presentations/why-claws.md) is the product pitch — the problem, the approach, the three-tier adoption funnel. The visual story for anyone evaluating governance tooling.

## Hear How We Built It

The [build stories](stories/) tell the claws origin story — why code generation matters, how the three rings emerged, the design decisions that shaped the product.
