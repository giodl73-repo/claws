---
marp: true
theme: default
paginate: true
size: 16:9
title: Scout Desktop, Cloud Tether, and Hosted OpenClaw
description: Visual discussion deck for Scout Desktop / Scout Cloud / Lobster architecture alignment
---

# Scout Desktop, Cloud Tether, and Hosted OpenClaw

One cloud tether/control plane. One Scout Desktop runtime. Zero, one, or many hosted OpenClaw agents available through routing.

June 25, 2026

---

## The Core Picture

![w:1130](deck-assets/single-tether-0n-agents.svg)

---

## Tier To Topology Alignment

![w:1130](deck-assets/tier-topology-alignment.svg)

---

## Agents As A First-Class Surface

![w:1130](deck-assets/agents-left-nav-node-mode.svg)

---

## Definitions

![w:1060](deck-assets/definitions.svg)

---

## Runtime Cardinality

![w:1100](deck-assets/zero-n-agents.svg)

---

## Team Of Claws, Local Desktop Gate

![w:1120](deck-assets/team-claws-desktop.svg)

---

## Scope Boundaries

![w:1120](deck-assets/swimlanes.svg)

---

## Permission Fanout

![w:1080](deck-assets/permission-fanout.svg)

---

## Local Capability Request

![w:1120](deck-assets/request-sequence.svg)

---

## Decisions Needed

| Question                                                                                       | Why it matters                                                          |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Is Cloud tether separate from hosted OpenClaw capacity?                                        | Lets Desktop stay managed even when hosted agents are unavailable.      |
| Can Desktop operate with 0, 1, or N hosted OpenClaw agents?                                    | Avoids assuming exactly one server-side agent.                          |
| Is Desktop a first-class enforcement layer?                                                    | Local files, shell, browser, clipboard, and apps need Desktop approval. |
| What fields identify `agentMemberId`, `agentBinding`, `executionTier`, and `cloudTetherState`? | Required for routing, audit, evals, and user-visible explanations.      |
| Which degraded modes fail closed, defer, retry, or reroute?                                    | Prevents ambiguous behavior during capacity, reset, or offline cases.   |
