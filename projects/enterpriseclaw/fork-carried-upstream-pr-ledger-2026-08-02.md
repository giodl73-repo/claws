# EnterpriseClaw Carried Upstream PR Source Ledger

Status: source capture only; no entry is admitted or authoritative  
Captured: 2026-08-02  
Owner: `giodl73-repo`  
Repository: `openclaw/openclaw`

This ledger records the exact source heads for all 55 currently open owned
upstream PRs. Every entry starts as `source-only/quarantined`.

Before queue admission, PRE/BOOT must add:

- current upstream base SHA;
- PR base and merge-base SHA;
- ordered commit range and per-commit stable patch IDs;
- aggregate diff digest;
- review, CI, and mergeability state;
- changed-file and LOC counts;
- runtime/default-activation impact;
- targeted and queue-level tests;
- selected authority disposition;
- delete and retain inventories; and
- expiry or replacement.

A changed PR head invalidates the captured generation.

| PR | Phase | PR state | Exact head SHA | Source branch | Initial disposition |
| --- | --- | --- | --- | --- | --- |
| #81104 | C2 | Draft | `b11c171c80b1ccf4d6d825db403a3a27887905dc` | `policy-runtime-audit` | source-only/quarantined |
| #83991 | C1c | Non-draft | `3df494680c6dcde08adab2da6ceb59d2ef76a1e5` | `user/giodl/google-vertex-thinking-38327` | source-only/quarantined |
| #84472 | C2 | Draft | `b3563d3f3404c61c7c8409ba6eb5329c254cbbc0` | `doctor-dry-run-contribution-guard` | source-only/quarantined |
| #87471 | C1c | Draft | `6f37b5088088857ed407cafc1f111048554a927e` | `fix-87321-visible-tool-replay` | source-only/quarantined |
| #87774 | C1c | Draft | `245e28e44bc3a8d7bc774690dbd2bf84212b6b12` | `giodl73-repo/fix-58537-feishu-delivery-mirror` | source-only/quarantined |
| #90062 | C1c | Draft | `9906a4fe24ac9544edae50d05dd77f18ed4166ab` | `fix-fresh-agent-session` | source-only/quarantined |
| #90708 | C0 | Non-draft | `6c770202967a26d90c6927cb1ebc2dd4e5113a99` | `user/giodl/fix-local-baseline-prepare-gates-20260605c` | source-only/quarantined |
| #98869 | C2 | Draft | `9c44766ab51a5ba7fefa58960d1767020c6f3c6f` | `doctor-channel-plugin-blocker-dry-run-effects` | source-only/quarantined |
| #99255 | C2 | Draft | `3adfe2f2a1bb099c791f6aa6d0fd85ff8fe1878e` | `doctor-config-write-dry-run` | source-only/quarantined |
| #99619 | C2 | Draft | `12b3f07565d2756cbd089349cf33dd8448e8d5b2` | `user/giodl/doctor-model-ref-lint` | source-only/quarantined |
| #100960 | C1b | Non-draft | `37ca7c7668c2375803529d41b2f5cb6e02b75d41` | `user/giodl/cli-catalog-review-hardening` | source-only/quarantined |
| #101336 | C2 | Draft | `e065bd25fd567de7c371bfbf7d3930e7b0f46efe` | `policy-doctor-tools-agent-previews` | source-only/quarantined |
| #101916 | C2 | Draft | `e3ed8b5e531346c72ed9d5c436e7226b9448be26` | `policy-doctor-tools-also-allow-previews` | source-only/quarantined |
| #104018 | C1a | Non-draft | `2f131c6e220461f787ee7cb1a37bea096f4cbf6b` | `user/giodl/readiness-profiles-upstream` | source-only/quarantined |
| #104158 | C1b | Draft | `4a2d0ad06fee913b6ea398724d58efc7eacb0a80` | `user/giodl/commands-upstream-node` | source-only/quarantined |
| #104159 | C1b | Draft | `651cef48e4d333a80246b7785c040c2be774052b` | `user/giodl/commands-upstream-prompt` | source-only/quarantined |
| #104160 | C1b | Draft | `12320349d8003877212e72053f8b29875835df91` | `user/giodl/commands-upstream-docs` | source-only/quarantined |
| #107026 | C1a | Non-draft | `409fab999c4095c5b24a8d7ac23d495659738666` | `user/giodl/managed-config-upstream` | source-only/quarantined |
| #109305 | C3b | Non-draft | `fe1c662abb06d6629dc395c77d6694f28c4a8856` | `feat/publisher-feed-query-client` | source-only/quarantined |
| #109461 | C3b | Draft | `51417fe85eb64fa284142d3b8f1193e821b37812` | `feat/publisher-feed-control` | source-only/quarantined |
| #109584 | C3b | Draft | `d55dcab2c912849fef55fc2d7bd1bf54e9dc9b3e` | `feat/publisher-feed-profiles` | source-only/quarantined |
| #110250 | C3b | Non-draft | `64d6a2f19c5ec813312887731ed1eecff41a3c20` | `feat/catalog-feed-shard-consumer` | source-only/quarantined |
| #110438 | C3b | Draft | `3d7708f08466e5608f7a632d9312bec8b3ea51b7` | `feat/feed-local-watches` | source-only/quarantined |
| #111541 | C3a | Non-draft | `491a5df89666a7f808a50000ff4494ceb119a319` | `user/giodl/localization-bundle-foundation` | source-only/quarantined |
| #111542 | C3a | Non-draft | `00f37e291db8e80ee03d84693ef7729978060d05` | `user/giodl/localization-bundle-runtime` | source-only/quarantined |
| #111543 | C3a | Non-draft | `9f6a55cd2e3dfd2dd2aac607be56a7b437660f2e` | `user/giodl/localization-bundle-governance` | source-only/quarantined |
| #111544 | C3a | Non-draft | `08933a04b58888b2b934a3c1d646b65b30db78f1` | `user/giodl/localization-bundle-surfaces` | source-only/quarantined |
| #111545 | C3a | Non-draft | `bed80b5b3f5cc59b785b591da11633bffe1f2172` | `user/giodl/localization-bundle-readiness` | source-only/quarantined |
| #112385 | C1b | Non-draft | `062f4d937b3aef0aa5474a9fe214444b95b14b77` | `user/giodl/rfc-0013-recovery-points` | source-only/quarantined |
| #112473 | C3c | Draft | `3858833c38fded70713e18de4703c382cbbc3bbb` | `user/giodl/productivity-tool-profile` | source-only/quarantined |
| #112784 | C3b | Non-draft | `e5d59c96ee24c63d295b80380e933de3de46c6f5` | `user/giodl/localization-authoring-exemplar` | source-only/quarantined |
| #112801 | C3b | Non-draft | `af456740855268c39281fbb8c0d377b5e319545c` | `user/giodl/localization-surface-adoption-gate` | source-only/quarantined |
| #112808 | C4 | Draft | `d75678db771f2c2c0a96f0ddfb7de106ad361241` | `user/giodl/claws-pr15-control-ui-read` | source-only/quarantined |
| #112828 | C4 | Draft | `24764f024e8951bb2b43fbbb0f9998deb3745e90` | `user/giodl/claws-pr16-control-ui-lifecycle` | source-only/quarantined |
| #112865 | C1b | Non-draft | `50148f20782cb4b13eb3e3770a4e5c78d2394aca` | `user/giodl/rfc-0013-final-capture` | source-only/quarantined |
| #112896 | C1b | Non-draft | `5dc5e719e7a3ce3a6953cf3b0d89509543aa24ab` | `user/giodl/rfc-0013-restored-admission` | source-only/quarantined |
| #113333 | C3b | Draft | `1d09b84ad0bd06dd3ed9575e2d53357700b364e7` | `feat/catalog-feed-incremental-refresh` | source-only/quarantined |
| #113421 | C1a | Non-draft | `c1d7f394f866aad86c1818ab8bc10c7fca485045` | `user/giodl/readiness-core-owner-adoption` | source-only/quarantined |
| #113422 | C1a | Non-draft | `18c42a7f26ab19fac967f9e95064e3f6b0788ba0` | `user/giodl/standard-hosting-profiles-owner-adoption` | source-only/quarantined |
| #113427 | C3a | Draft | `a2a7084c8ef5fbec9793ce85e5c2fe22394b263f` | `user/giodl/localization-wizard-migration-offer` | source-only/quarantined |
| #114636 | C1a | Non-draft | `123bae7b876ee69fb96c35ca5fa02096f7a56a27` | `user/giodl/hosting-profile-conformance-artifact` | source-only/quarantined |
| #114773 | C3c | Draft | `48fab2d723d0a109ae58e7503e9a54a03ee7389e` | `user/giodl/o1-one-hop-dispatch-upstream` | source-only/quarantined |
| #114783 | C3c | Draft | `14bd05f569144932072b2f257c7f1a8f144a2680` | `user/giodl/o4-manifest-first-host-bundles-upstream` | source-only/quarantined |
| #115237 | C4 | Draft | `f530ce1cae7b476fcf5df34e5de30c2b2c8c3d9d` | `user/giodl/claws-setup-schema-v2` | source-only/quarantined |
| #115329 | C1b | Draft | `a2a894f5c0871085a2e6cf80c50ded32ee608c3b` | `user/giodl/memory-list-gateway` | source-only/quarantined |
| #115371 | C4 | Draft | `ce4fb74dce255cf2390d9aaf784cc33c695c5345` | `user/giodl/claws-guided-export-v2` | source-only/quarantined |
| #115390 | C1b | Draft | `7c8dc5f5f221ed4cc7238ad38ae04fec95de1584` | `feat/node-invoke-cancel-contract` | source-only/quarantined |
| #115408 | C2 | Draft | `6fba8ef36745794493266960efc063afacb0fcd1` | `user/giodl/control-ui-host-policy-main` | source-only/quarantined |
| #115962 | C4 | Draft | `9fed48bfc4623c5a0285ba8be9eca9bb03205225` | `user/giodl/claws-application-lifecycle` | source-only/quarantined |
| #116013 | C2 | Draft | `55e3c97ddc157c1ad167be60dcd2e497834536f5` | `user/giodl/control-ui-server-policy` | source-only/quarantined |
| #116050 | C5 | Draft | `41f4e705887704f5cd88278c6ffdfed406c88992` | `agent/rust-gateway-client` | source-only/quarantined |
| #116450 | C5 | Draft | `894d125ee76e5c153890e66f58d585bf5f239cb4` | `agent/rust-runtime-followup` | source-only/quarantined |
| #116462 | C4 | Draft | `6449cdf5466fa1a761278886ec8e209c497eabf7` | `user/giodl/claws-scoped-skill-lifecycle` | source-only/quarantined |
| #116863 | C5 | Draft | `8d0a1b013ea83b1726e284d71791002260eac3c6` | `agent/rust-sidecar-runtime-bridge` | source-only/quarantined |
| #117037 | C4 | Draft | `19b30687325c783a0b93a7d4666b0ae96f01c85c` | `user/giodl/claws-project-lifecycle` | source-only/quarantined |

