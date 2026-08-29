# Agent catalog competitive review

## Conclusion

Awesome Claws is unusually strong on portable packaging, admission discipline,
authority boundaries, and deterministic catalog-wide proof. Its closest direct
competitor is [Google ADK Recipes](https://github.com/google/adk-samples), not a
general agent framework.

The next gains should improve ownership, operability, and discoverability
without turning Awesome Claws into a framework-specific code gallery.

## Comparison

| Repository | Kind | Strongest precedent | Important limitation |
| --- | --- | --- | --- |
| [Google ADK Recipes](https://github.com/google/adk-samples) | Direct catalog competitor | Separate curated `core/` and community `contrib/`; required ownership metadata; one-page checklist; generated manifests; structural validation; runnability smoke; dependency policy; canary; three advisory AI review lenses | Framework-specific; runnability is primarily import/smoke proof; recipes are explicitly not production-supported |
| [Awesome AI Apps](https://github.com/Arindam200/awesome-ai-apps) | Broad runnable-app gallery | 131 projects; strong category browsing; one project per PR; issue-first contribution; per-project README template | Tests are encouraged rather than required; heterogeneous stacks weaken uniform lifecycle and authority proof |
| [CrewAI Examples](https://github.com/crewAIInc/crewAI-examples) | Full-application example suite | Clear split between complete applications and feature cookbook; standalone runnable projects; beginner/intermediate/advanced path | Framework/version-specific; contribution and validation contracts are comparatively light |
| [OpenAI Agents Python examples](https://github.com/openai/openai-agents-python/tree/main/examples) | Framework example suite | One repository runner; filters; background lifecycle; per-example logs; explicit inclusion for server, audio, interactive, and external examples | Teaches SDK behavior rather than curating portable application contracts |
| [Microsoft Agent Framework](https://github.com/microsoft/agent-framework) | Production agent framework and samples | Progressive sample hierarchy; provider breadth; declarative agents; hosting, observability, evaluation, durability, and human-in-loop examples | Framework surface, not an application catalog; owners must still supply use-case safety and quality controls |
| [LangGraph](https://github.com/langchain-ai/langgraph) | Stateful orchestration framework | Durable execution, interrupts, memory, tracing, deployment, and reusable agent sharing | Low-level framework; LangSmith-backed eval and operations are not portable catalog contracts |
| [Amazon Bedrock Samples](https://github.com/aws-samples/amazon-bedrock-samples) | Cloud service sample collection | Generated website; broad use-case navigation; explicit IAM and responsible-AI sections; observability/evaluation area | AWS-specific and heterogeneous; sample IAM guidance includes broad access unsuitable as a Claw default |
| [AI Agents for Beginners](https://github.com/microsoft/ai-agents-for-beginners) | Educational course | Excellent learning progression, production/security lessons, and multilingual reach | Lesson-first, Azure-dependent course rather than reusable starter applications |

## What Awesome Claws already does better

1. One portable Claw contract instead of one language/framework project shape.
2. Proposal-first admission with explicit new/improve/variant/product-decision
   outcomes and nearest-catalog comparison.
3. Consent-bounded capabilities, exact pins, visible fallback, and accountable
   human authority.
4. Complete Experience coverage and deterministic regression contracts for
   every catalog entry.
5. Installed lifecycle, visual, dependency, capability-class, upgrade,
   rollback, and capstone proof beyond ordinary example repositories.
6. Generated package drift checks across Windows, macOS, and Linux.

## Ranked improvements

### 1. Add durable per-Claw ownership and maintenance state

Adopt the useful part of ADK's `manifest.ownership`: accountable maintainer,
review backup, last verified date, and maintenance state. Keep it catalog-owned
and generated rather than adding another package manifest.

This is the clearest real gap. Contribution records preserve admission history,
but they do not name the current maintainer or communicate whether a Claw is
active, needs help, or is headed for retirement.

### 2. Add a scheduled catalog canary with freshness reporting

Keep required PR proof pinned and deterministic. Separately run scheduled
current-OpenClaw and dependency canaries, then publish freshness by Claw and
capability class. The OpenClaw `main` Data Analyst drift found during PR #28 is
the motivating example.

Do not make moving upstream state a required pull-request gate.

### 3. Improve contributor ergonomics with one prepare command

ADK's `prepare-python-recipe` is a good interaction model. Add an Awesome Claws
equivalent that runs proposal validation, scaffolding checks, build, regression
snapshot review, package validation, and a proof-plan summary without silently
accepting behavior changes.

The existing commands are strong but require contributors to understand their
order.

### 4. Add filterable proof execution and per-Claw logs

Borrow OpenAI's example-runner ergonomics:

- `--id` or substring filtering;
- explicit inclusion of expensive/live lanes;
- one summary plus per-Claw logs;
- status/tail commands only if background proof becomes necessary.

This should wrap existing proof owners, not introduce a second runner.

### 5. Generate a richer catalog site or static explorer

Borrow category navigation from Awesome AI Apps and the repo-backed website
pattern from Bedrock Samples. Generate it from `catalog.json`,
`experience-cases.json`, regression metadata, and maintenance state.

Useful filters: job, setup burden, proof tier, capability, external dependency,
authority attention, maintenance state, and last verified date.

Do not hand-maintain another gallery or optimize for raw catalog count.

### 6. Separate copyable starters from advanced reference applications

CrewAI's full-app versus cookbook distinction is useful. Awesome Claws already
has a copyable reference and Golden example; make this a first-class generated
learning path:

- start here;
- dependency-free;
- capability-bearing;
- visual/dashboard;
- durable/delegated execution;
- governance and high-risk.

This is documentation and discovery, not a new package tier.

### 7. Add bounded live/model evaluations only where deterministic proof stops

Do not create a universal LLM grading corpus. Add opt-in evals for a small set of
high-value semantic properties that static contracts cannot establish, such as
evidence citation fidelity, refusal wording under adversarial pressure, and
handoff usefulness.

Each eval needs a named owner, stable rubric, budget, provider/model identity,
and non-blocking calibration period before it can become a gate.

## Avoid

- Framework-specific source trees per Claw.
- Admission based on popularity or category gaps.
- Optional tests for contributed Claws.
- A moving provider/runtime dependency in required PR checks.
- Broad cloud IAM examples as defaults.
- Duplicating Experience, installed lifecycle, or capability proof inside the
  regression runner.
- Inflating the catalog merely to match larger galleries.

## Primary sources

- [ADK Recipes README](https://github.com/google/adk-samples/blob/main/README.md)
- [ADK recipe checklist](https://github.com/google/adk-samples/blob/main/docs/recipe-checklist.md)
- [ADK recipe handbook](https://github.com/google/adk-samples/blob/main/docs/recipe-handbook/README.md)
- [ADK workflows](https://github.com/google/adk-samples/tree/main/.github/workflows)
- [Awesome AI Apps README](https://github.com/Arindam200/awesome-ai-apps/blob/main/README.md)
- [Awesome AI Apps contribution guide](https://github.com/Arindam200/awesome-ai-apps/blob/main/CONTRIBUTING.md)
- [CrewAI Examples README](https://github.com/crewAIInc/crewAI-examples/blob/main/README.md)
- [OpenAI Agents example runner](https://github.com/openai/openai-agents-python/blob/main/examples/README.md)
- [Microsoft Agent Framework README](https://github.com/microsoft/agent-framework/blob/main/README.md)
- [LangGraph README](https://github.com/langchain-ai/langgraph/blob/main/README.md)
- [Amazon Bedrock Samples README](https://github.com/aws-samples/amazon-bedrock-samples/blob/main/README.md)
- [AI Agents for Beginners README](https://github.com/microsoft/ai-agents-for-beginners/blob/main/README.md)
