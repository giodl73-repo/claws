# cp-1 Review · claws-repo-steward · R2

**Date**: 2026-04-28
**R1 verdict**: REQUEST-CHANGES (3 HC-BLOCK)
**R2 verdict**: APPROVE

## R1 BLOCKers — verification

| # | Title | Status | Notes |
|---|---|---|---|
| B1 | PR-numbering inconsistency | CLOSED | UG-upstream.amend.md §8 (lines 263-268) lists 4 sub-waves matching pulses (Wave A=PR-1+PR-2, Wave B=PR-3+PR-4, Wave C=PR-5+PR-6, Wave D=PR-7); §9 line 278 lists the four package PRs as PR-1, PR-4, PR-6, PR-7 explicitly and labels PR-2/PR-3/PR-5 as the three surgical PRs. PROGRESS.md lines 57-60 enumerate cp-2..cp-5 with the same scheme; cp-5 row added. All three guide frontmatters reconciled: bot-preempt-checklist.md lines 5-11 list PR-1..PR-7 in pulse order; post-merge-verification.md lines 5-11 likewise with H-mapping; adapter-audits.md lines 5-6 narrowed to PR-4 + PR-6 (the two consumers) with PR-5 referenced only as a hard-dependency cite. Inline body references grepped clean — bot-preempt §3.1/§4 cite PR-1 + PR-4 + PR-6 correctly; post-merge §3.1-§3.5 map H1=PR-1/PR-2, H2=PR-4, H3=PR-6, H4=PR-7, H5=PR-3/PR-5 (matches pulses); adapter-audits §2-§3 cite PR-4 / PR-5 / PR-6 consistently with the new scheme. |
| B2 | FINDINGS.md tally off by 50 | CLOSED | Headline lines 13-20 now read 6/39/72 = **117**. Methodology note at line 22 explains the 6 cross-reference rows (F-17, F-22, F-26, F-38, F-76, F-113) and cites the verification grep. Ran `grep -cE '^\| F-[0-9]+ \| HC-' FINDINGS.md` myself: returns **117**. Tier-split greps return 6 / 39 / 72 — exact match. PROGRESS.md line 168 echoes 117 (6/39/72) and line 185 records the B2 fix. |
| B3 | v0.3 frontmatter half-extends v0.2 | CLOSED | UG-upstream.amend.md line 17 title now "Amendment v0.3 (DRAFT)". Reader's guide at lines 24-49 rewritten as "what changed in v0.2 + v0.3" with explicit §12 + §13 enumeration at lines 36-39. Material changes list at lines 41-49 has **7 items**: #1 OC-PR roadmap, #2 bot-reviewer constraints, #3 enforcement-model shift, #4 trust-set lifecycle, #5 approval/audit/temporal triplet, #6 lint catalog (v0.3), #7 fixer roadmap (v0.3). §11 (open items) and §11.1 (companion-guide flag) flagged "remain in force" at line 39. |

## New findings (if any)

None of repo-discipline character. The fixes are surgical and don't introduce frontmatter drift, atom-registry mismatches, or new file:line citation rot. PROGRESS.md line 184 documents the B1 reconciliation across all five touched files in plain language; line 186 notes the v0.3 reader's guide expansion to 7 changes. The cp-1 closure narrative in PROGRESS.md lines 178-197 is internally consistent with the panel files I reviewed.

## R2 verdict reasoning

From the repo-steward lens, all three discipline BLOCKers are cleanly closed. B1 is the most consequential of the three — PR-numbering drift across pulses + pr-drafts + UG-upstream + PROGRESS + 3 guides was a six-file consistency hazard, and the wave authors picked the right ground truth (pulse filenames + pr-draft filenames) and propagated it everywhere. The frontmatter `applies_to` blocks are now accurate, the inline body references match, and the §8/§9 sub-wave decomposition lines up with what cp-2..cp-5 actually plans to ship. B2 is verified by independent grep — the tally is now arithmetically correct AND carries methodology-note traceability so a future reviewer can re-derive it. B3 is a clean version-bump: title, reader's guide, and material-changes list all now consistently reflect v0.3.

The wave is ready for cp-2 from a repo-discipline standpoint. The cp-1 prep guides are landed at `docs/upstream/guides/`, frontmatters are honest about what they apply to, the spec amendment is internally consistent, the findings ledger is recountable, and PROGRESS.md tells a coherent narrative of the R1→remediation→R2 cycle. No re-litigation of R1 findings; no new discipline gaps introduced by the fixes.
