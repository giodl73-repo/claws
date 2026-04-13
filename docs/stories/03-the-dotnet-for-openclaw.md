# The .NET for OpenClaw

## Situation

The OpenClaw ecosystem was growing fast and building from scratch. Every workspace that needed typed expressions wrote its own expression parser. Every workspace that needed data validation wrote its own validator. Every workspace that needed budget tracking invented its own token counter. No shared libraries. No common infrastructure. The same problems solved differently in every workspace.

We'd seen this before. It's the early Java ecosystem -- before Apache Commons, before Spring, before anyone agreed on how to parse XML or manage database connections. Every project reinvented the same wheels, differently, incompatibly.

The question was: could claws provide the shared infrastructure layer that OpenClaw doesn't have yet?

## Attempt

The first instinct was to ship the governance compiler and let the libraries follow naturally. Governance is the headline feature -- that's what enterprises pay for. Libraries are nice-to-have.

This was backwards. Nobody adopts a governance compiler for a platform they barely use. Governance implies commitment. Libraries imply utility. The adoption funnel needs to start with something free, useful, and low-commitment. Something that makes OpenClaw developers' lives easier without asking them to change how they work.

## Result

The `.NET for OpenClaw` vision (`atom:dotnet-for-oc`) is 11+ shared libraries published as @claws/ packages. Not governance-specific. General-purpose platform infrastructure:

@claws/sift -- typed expression evaluation. The engine that powers RELAX expressions, made available as a standalone library. OpenClaw workspaces that need computed fields, dynamic filters, or conditional logic use sift instead of writing their own expression parser.

@claws/check -- policy evaluation. Not the full governance compiler, just the policy check engine. Define a policy as a typed rule, evaluate it against workspace state, get a pass/fail with diagnostics. Useful even without the compiler.

The three-tier package model (`atom:three-tier-packages`) defines the ecosystem layers. @openclaw/ packages are community-contributed -- anyone can publish, no verification required. @claws/ packages are the shared libraries -- verified, tested, maintained, backwards-compatible. @craftworks/ packages are internal infrastructure -- the compiler SDK, agent runtime, and platform internals that claws uses but doesn't expose.

The tier model is an adoption funnel. Start with @openclaw/ packages (community, free, easy). Graduate to @claws/ packages when you need reliability and maintenance. The governance compiler and fleet management build on @claws/ packages. Enterprise features build on the platform, not beside it.

Lossless round-trip (`atom:lossless-roundtrip`) is what makes the library strategy credible. Every @claws/ library that touches OpenClaw workspace files preserves them byte-for-byte. No reformatting. No reordering. No comment stripping. If a library modifies a workspace file in any way beyond its documented additions, that's a bug. This constraint is expensive to implement -- every read/write path must preserve the original AST including whitespace and comments. But it's the trust foundation. Developers who've been burned by tools that "helpfully" reformat their files need to know: claws doesn't touch your code.

The governance plugin (`atom:governance-plugin`) is the bridge between libraries and compiler. Install individual @claws/ libraries for standalone utility. Install the governance plugin for compiled enforcement. The plugin is built from the same libraries -- it's not a separate codebase, it's a composition of the shared packages. This means the libraries are battle-tested by the compiler itself.

## Lesson

Platform adoption is an infrastructure problem, not a features problem. Nobody adopts a governance compiler for a platform they don't have infrastructure for. The .NET for OpenClaw strategy inverts the funnel: ship the libraries first, earn trust through utility, then offer governance as the next tier. The three-tier package model (community, shared, internal) mirrors .NET's ecosystem structure -- NuGet packages built on a BCL built on a runtime. claws's @claws/ packages are the BCL. The compiler is the runtime. The governance features are the framework. Build the platform, and the product follows.
