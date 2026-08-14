---
name: teams-clipboard-html
description: Create concise, attractive Teams update cards and copy them as sanitizer-safe CF_HTML with a readable linked plain-text fallback.
---

# Teams Clipboard HTML

Use when the user wants a polished project update, executive summary, status
card, or linked technical brief pasted into Microsoft Teams.

The primary design target is the **sanitized Teams paste**, not the browser
preview. Teams may remove `<style>`, classes, layout containers, JavaScript,
and margins. The message must still read correctly after all styling is gone.

## Message Shape

Default to one chat-screen:

1. one outcome-led headline;
2. a short **why this exists** section naming the problem and operating model;
3. one sentence explaining the mission;
4. one primary concept, such as readiness;
5. three or four plain-language outcomes;
6. a short tangible-delivery block with direct links;
7. one restrained proof line; and
8. one next action.

Keep the visible message around 250-450 words. Put exhaustive inventories in a
linked browser artifact, not the Teams paste.

## Sanitizer-Safe HTML Rules

- Use semantic headings and paragraphs: `<h1>`, `<h2>`, `<h3>`, and `<p>`.
- Use explicit `<br>` elements inside each linked capability.
- Never rely on default paragraph margins for vertical spacing. Teams commonly
  strips them and runs adjacent `<p>` blocks together visually. Use adjacent
  `<p>` blocks without hand-authored separators; the copier normalizes the
  boundary to one explicit `<br>`. Existing whitespace or `<br>` tags between
  paragraphs are collapsed rather than accumulated.
- Put visible separators between adjacent links, for example
  `&nbsp; · &nbsp;`.
- Never depend on `<div>`, CSS `display`, grid, flex, margins, or tables to
  create whitespace or reading order.
- Never depend on color alone to convey status.
- Keep anchor text descriptive: `RFC #33`, `source #104018`, `fork proof #208`.
- Link the concept to its RFC, then link the implementation or proof separately.
- Keep `<!--StartFragment-->` and `<!--EndFragment-->` around only the content
  intended for paste.
- A browser version may use richer styling, but the fragment must remain
  understandable with every `style` and `class` attribute removed.

Use this durable pattern for each tangible:

```html
<p>
  <strong>Canonical owner readiness</strong>
  <br>One Gateway readiness contract plus core owner observations.
  <br><a href="https://example.test/rfc">RFC #33</a>&nbsp; · &nbsp;
  <a href="https://example.test/source">source #104018</a>&nbsp; · &nbsp;
  <a href="https://example.test/proof">fork proof #209</a>
</p>
```

Do not use this pattern:

```html
<div class="capability">
  <strong>Canonical owner readiness</strong>
  <span>Description</span>
  <a href="...">RFC</a><a href="...">source</a>
</div>
```

Teams can flatten that entire `<div>` into one unreadable line.

## Content Rules

- Lead with concepts and user/operator outcomes, not commit counts.
- For a fork, staging surface, or patch program, explain its governance value
  before its features: what it inventories, how it rebuilds, how items enter,
  and how carries are retired.
- Name tangibles immediately after the concept:
  RFC, implementation PR, fork proof, fixture, release, or exact artifact.
- Distinguish proposal, admitted source, executable evidence, and shipped
  behavior.
- Do not imply that an RFC is implementation or that evidence-only code has
  runtime authority.
- Keep numbers in one proof line near the end.
- Verify every linked PR/RFC before copying.

## Visual Rules

For a styled companion artifact, use the Clawpilot theme and the
`web-artifacts-builder` skill. The Teams fragment still needs semantic fallback
structure because Teams may discard that theme.

Prefer:

- one accent header;
- large body text;
- full-width stacked sections;
- generous whitespace;
- no more than four tangible capability entries; and
- no dashboards, dense matrices, six-column metrics, or tiny labels.

## Copy as CF_HTML

From the `claws-hapi` repository root:

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass `
  -File .agents\skills\teams-clipboard-html\scripts\copy-cf-html.ps1 `
  -HtmlPath projects\enterpriseclaw\artifacts\enterpriseclaw-teams-executive-card-2026-08-11.html
```

To provide a hand-authored fallback:

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass `
  -File .agents\skills\teams-clipboard-html\scripts\copy-cf-html.ps1 `
  -HtmlPath path\to\card.html `
  -PlainTextPath path\to\card.txt
```

The script:

- validates fragment markers;
- normalizes adjacent paragraph boundaries to one explicit line break so Teams
  does not depend on stripped CSS margins or accumulate duplicate blank lines;
- calculates CF_HTML offsets in UTF-8 bytes, not PowerShell characters;
- places HTML, Unicode text, and ANSI text on the clipboard;
- derives readable plain text with line breaks and expanded link URLs when no
  fallback file is supplied; and
- confirms all clipboard formats were set.

## Verification

1. Render the HTML locally at a narrow width.
2. Check that it fits roughly one vertical chat screen.
3. Inspect the fragment with styling mentally removed.
4. Confirm adjacent prose sections retain a visible blank line without CSS.
5. Confirm each item still has:
   - a heading;
   - a description;
   - a line break;
   - visibly separated links.
6. Run the copier.
7. Paste into a Teams compose box before sending.

If Teams still flattens content, simplify the HTML further. Do not compensate
with more CSS.
