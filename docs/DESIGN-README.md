# claws — The Claw Compiler

A governance compiler for OpenClaw agents. Reads 9 workspace files, emits executable TypeScript enforcement skills, and provides the .NET for OpenClaw.

## The Product in One Sentence

> claws compiles your OpenClaw workspace files into executable TypeScript governance skills that run inside your Gateway.

## Directory Structure

```
design/claws/
├── CLAUDE.md              ← Session driver
├── README.md              ← This file
├── SPECS.md               ← Spec index (CL-01 through CL-07)
├── DCR.md                 ← Design change records
├── specs/                 ← Individual spec files
│   ├── CL-01-cli-surface.md
│   ├── CL-02-security-model.md
│   ├── CL-03-runtime-enforcement.md
│   ├── CL-04-compilation-pipeline.md
│   ├── CL-05-developer-experience.md
│   ├── CL-06-platform-ecosystem.md
│   └── CL-07-deep-integration.md
└── scenarios/             ← Scenario validation (pending)

Related:
  design/claws/focus/Q01-Q18    ← 18 research questions
  design/suite/GLINT-MAP.md       ← Command surface (39 commands)
  design/suite/GLINT-PITFALLS.md  ← 35 pitfalls + HITL map
  .craft/roles/claws/             ← 8 stakeholder roles
  .craft/pipelines/claws.yaml     ← Spec pipeline
  docs/presentations/why-claws.md ← Product pitch
```

## Research Foundation

18 research questions (all Proposed) spanning the complete product design:

| Phase | Questions | What they resolved |
|-------|-----------|-------------------|
| Surface | Q12a-d | One CLI, `claws`, 39 commands, pinch + snap |
| Experience | Q12e-f | Three rings, upgrade flow, CI/CD pipeline |
| Schema | Q12g | GlintConfig v2 (three-layer, 7 platforms) |
| Security | Q12h-i | 4 security layers, 5 runtime insertion points |
| Compiler | Q12j-k | 5-phase pipeline, three-tier packages |
| Platform | Q12l-m | .NET for OpenClaw, claws-sdk sibling architecture |
| Ecosystem | Q12n-o | 5,198 skills mapped, maker experience |
| Deep | Q12p-r | Atoms reuse, VS Code, runtime contracts |

## Review Panel

8 roles in `.craft/roles/claws/`:

| Layer | Role | Key question |
|-------|------|-------------|
| Platform | founder | "Can the user uninstall this?" |
| Platform | gateway-eng | "50ms budget per hook?" |
| Platform | skill-author | "Can I adopt this in 5 minutes?" |
| Enterprise | ciso | "Can I show this to an auditor?" |
| Enterprise | platform-eng | "47 workspaces in 10 minutes?" |
| Enterprise | compliance | "Hand this to a Big 4 auditor?" |
| User | power-user | "Does this replace my scripts?" |
| User | new-hire | "4 commands in 5 minutes?" |
