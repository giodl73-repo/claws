# claws How-To Guides

Getting-started guides for the claws governance compiler. Each guide is a
self-contained task you can complete in minutes.

## Guides

| Guide                                               | What you do                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Initialize a workspace](initialize-workspace.md)   | Run `claws init` to bootstrap governance in an existing agent workspace      |
| [Run your first build](first-build.md)              | Run `claws build` and interpret the compiled artifacts and diagnostics       |
| [Write a governance rule](write-governance-rule.md) | Create a custom policy rule with severity, scope, and three-ring composition |
| [Publish a governance skill](publish-skill.md)      | Package a governed skill, test it, and publish to ClawHub                    |
| [Set up three-ring security](three-ring-setup.md)   | Configure inner, middle, and outer ring governance enforcement               |

## Prerequisites

- claws installed
- An agent workspace (OpenClaw, Cursor, Claude Code, or any supported platform)

## Conventions

All guides use imperative voice and assume you are running commands from your
workspace root directory. Code blocks show actual CLI output; governance rules
and configurations match what the concept guides describe.

## Related

- [Concept guides](../concepts/) -- deeper explanations of architecture and design
- [claws.json reference](../concepts/claws-json.md) -- all configuration options
