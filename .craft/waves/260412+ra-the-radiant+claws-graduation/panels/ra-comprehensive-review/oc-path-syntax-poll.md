## oc:// Path Syntax — # vs / Consensus Poll

**Question**: Should the `oc://` URI scheme use `#` to delimit sections within a file, or use `/` throughout?

```
oc://TOOLS.md#Tools/send-email     ← current design (# for sections)
oc://TOOLS.md/Tools/send-email     ← alternative (/ throughout)
```

The HTTP API always uses `/` regardless: `GET /api/oc/TOOLS.md/Tools/send-email`

---

### Founder (claws)

The `#` is an unnecessary cleverness that will confuse contributors. OpenClaw's strength is that things work like developers expect — a folder with markdown files IS the agent. When a skill author sees `oc://TOOLS.md#Tools/send-email` they will try to paste it into a browser or curl it and get nothing. The `/` form looks like every other path developers already know. Simplicity is how we got to 346K stars; adding URI-scheme arcana works against that.

**Vote**: DROP #

### CISO (claws)

From a security perspective, parsing ambiguity is attack surface. Two different representations of the same resource (`#` in oc://, `/` in HTTP) means two code paths, two sets of validation logic, and two places where an injection or traversal bug could hide. I want one canonical form that audit trails reference consistently. If a governance event log contains `oc://TOOLS.md#Tools/send-email` but the HTTP access log shows `/api/oc/TOOLS.md/Tools/send-email`, correlating them during incident response requires a normalization step — that is a gap a sophisticated attacker can exploit.

**Vote**: DROP #

### Gateway Engineer (claws)

The Gateway routes requests using path segments. If the `oc://` scheme uses `#`, the Gateway needs a parser that translates fragment syntax into path segments for every internal lookup, plus the reverse for every diagnostic message. That is two serialization paths to maintain, two sets of edge cases (`#` inside heading text, double `#`, trailing `#`), and two places to introduce regression bugs. Using `/` everywhere means one parser, one canonical form, one set of tests. The 50ms latency budget is better spent on governance hooks than on URI normalization.

**Vote**: DROP #

### Platform Engineer (claws)

Fleet tooling means pushing paths through `claws broadcast`, `claws drift`, CI/CD pipelines, GitHub Actions, shell scripts, JSON configs, and SIEM exports. The `#` character is special in shell (comment), YAML (comment), URLs (fragment), and many logging frameworks (truncation). Every tool in the chain that touches an `oc://` path with `#` is a potential breakage point that requires quoting or escaping. With 47 workspaces and a dozen integration surfaces, using `/` eliminates an entire class of operational incidents.

**Vote**: DROP #

### Skill Author (claws)

When I write a skill and reference an OC path in my SKILL.md or TypeScript handler, I want to type it once and have it work everywhere — logs, tests, API calls, documentation. If I have to remember "use `#` in oc:// but `/` in HTTP" that is cognitive overhead that produces zero value for my skill. I will get it wrong, my tests will pass locally because `parseOcPath()` accepts both, and it will break in some enterprise fleet where the normalization is stricter. Just use `/` and let me get back to building.

**Vote**: DROP #

### New Hire (claws)

I just started. I am reading the claws docs and I see `oc://TOOLS.md#Tools/send-email`. I think the `#` means an anchor like in HTML. I try `curl http://localhost:8080/api/oc/TOOLS.md#Tools/send-email` and get a 404 because curl strips the fragment. I spend 30 minutes debugging before someone tells me "oh, the API uses slashes." That is 30 minutes of my first day wasted on a syntax distinction that exists for semantic purity, not practical value. Paths should look like paths.

**Vote**: DROP #

### Power User (claws)

I maintain 5 agents, I write shell scripts to automate governance checks, and I pipe `oc://` paths through `grep`, `jq`, `sed`, and custom tooling daily. The `#` character in a URI that I need to embed in shell scripts, YAML files, and JSON payloads is a quoting nightmare. Every time I forget to escape it, my script silently treats everything after `#` as a comment. I already have 8 patches to re-apply every upgrade — I do not need a 9th for URI quoting. Give me `/` and let my scripts work without defensive quoting.

**Vote**: DROP #

### Compliance Officer (claws)

Audit trails must be unambiguous. When I hand a compliance evidence package to a Big 4 auditor, every OC path reference must be consistent across all artifacts — the audit chain, the SIEM export, the compliance report, and the API access logs. Two representations of the same resource (`#` vs `/`) create ambiguity that auditors will flag. "Is `oc://TOOLS.md#Tools/send-email` the same resource as `/api/oc/TOOLS.md/Tools/send-email`?" is a question I never want to answer during an audit. One canonical form eliminates the question.

**Vote**: DROP #

### Dragon (craft)

The argument for `#` rests on RFC 3986 fragment semantics: the fragment identifies a secondary resource within the primary resource. This is semantically correct — `TOOLS.md` is the document and `Tools/send-email` is a location within it. However, the invariant that matters here is not URI purity; it is **parse determinism**. Every system that processes `oc://` paths must produce identical results. Two canonical forms (one with `#`, one with `/`) means `parseOcPath()` must normalize both, which means the invariant "equal strings reference equal resources" is violated — `oc://TOOLS.md#Tools/send-email !== oc://TOOLS.md/Tools/send-email` even though they resolve to the same target. That is an invariant violation. Use `/` and enforce one canonical form.

**Vote**: DROP #

---

## Tally

KEEP #: 0 votes
DROP #: 9 votes

## Recommendation

The consensus is unanimous: **drop `#` and use `/` throughout**. The arguments converge from every direction — security (one parse path, one validation surface), operations (no shell/YAML comment collisions), developer experience (one form to learn), compliance (one canonical representation in audit trails), and invariant rigor (string equality implies resource equality). The RFC 3986 fragment argument is semantically elegant but practically harmful: it creates two representations of one resource, doubles parsing complexity, and introduces an entire class of quoting and correlation bugs across every integration surface. The `oc://` scheme should use `/` as its only delimiter, matching the HTTP API form exactly.
