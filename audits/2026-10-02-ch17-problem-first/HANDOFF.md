# Chapter 17 rewrite: interrupted capacity handoff

Checkpoint: 2026-10-02 11:07:17 UTC. This is incomplete work, not publication
approval. The step is blocked because normal fresh-role provisioning repeatedly
returns `collab spawn failed: agent thread limit reached` after existing roles
completed. Root and dedicated-author child provisioning both encountered it.
No existing judgment context was reused and no alternate model API/CLI invoked.

## Completed, reusable work

- The dedicated English author rewrote the whole lesson, English contract
  fields and quick reference, then corrected actual review findings in r2/r3.
  The original formula/math literals, Rust, lockfile, stdout, trace and figure
  implementation remain protected. Revision 5 is staged, not canonical.
- `english-r1/` is a complete frozen failed review/adjudication chain.
- `english-r2/` contains both sealed reviews and prepared adjudication routes.
  Its technical adjudication raw response is complete and untouched:
  `d4cbc89f6c85b0fd518709c80cc5ea3a8a3987095914be7ff866e82c948fe04d`,
  32,098 bytes. Its separate isolated adjudication is not yet created.
- `english-r3/frozen/lesson.en.mdx` is the corrected full English draft:
  `9c0e9630845bf6e5eb17adf8fd51f20af4637db1d8c7cf832f63f85492bb3334`.
  Its built HTML is
  `67ef60d18c322db06629a408fe72d5a704a7c033b08cbab07672bae0cd61070f`.
  The immutable package binding is
  `83f7df8438774f026d6bcc357be2e84e0a142f016f1f7f156f262dba0d5eb628`.
  There are 129 isolated surfaces and 135 technical units. No r3 reviewer has
  started or produced a record.
- The r3 production build passes: 85 pages, 2,939 local references and 169
  artifacts. The unchanged Rust demo's five tests and byte-identical stdout/
  diagram trace passed offline. These checks are not language approval.

All run staging is under
`.build/runs/20261002T081053Z-rewrite-ch17-problem-first-content-02/`.
Author notes, protected input hashes, frozen baselines and helper scripts remain
there. Preserve the interrupted run and every frozen artifact; do not overwrite
them. Canonical Chapter 17 content/test files are still the baseline revision.

## Remaining work, in order

1. Start with repository recovery/preflight. Confirm fresh role capacity, exact
   baseline and artifact hashes, working-tree ownership and remaining resource
   allowance. Record a new attempt or explicitly documented fingerprint-matching
   safe continuation; do not relabel the stopped attempt as completed.
2. Finish the r2 isolated adjudication using its prepared canonical prompt,
   four-artifact context and same-role bundle, then seal both untouched r2
   adjudication responses. Preserve its failed candidate verdict regardless of
   adjudicator approval of the review.
3. Route r3's two unused reviewer IDs, `ch17_v5_r3_technical` and
   `ch17_v5_r3_isolated`, through their exact prepared prompts with `fork none`,
   inherited user-selected settings and only the four authorized artifacts.
   Do not reveal earlier findings. Obtain two additional fresh same-role
   adjudicators after both reviews are sealed. Preserve exact raw bytes and
   receipts; invalid records require fresh replacement contexts, not repair.
4. Require all four r3 verdicts passing and staged English verification before
   a fresh dedicated Russian author translates the entire lesson, quick
   reference and Russian contract fields directly from those English bytes.
   Keep the English projection unchanged; no routine screenshots/image checks.
5. Update copy/revision/source-order expectations only; run protected-literal,
   contract, locale/parity/content/type/unit/build/link and sole-Firefox checks.
   Freeze exact final English/Russian HTML and 133 localization surfaces, then
   obtain fresh bilingual and source-blind target-only Russian reviews.
6. Verify the same reviewed bytes, publish the coherent eight-file set, rerun
   scoped canonical validation and verify all review/publication hashes.
   Only then complete the ledger and create the dedicated stable-step-ID commit.

The `.02` helper scripts are execution aids, not authority or review evidence
unless explicitly frozen. Reconcile any new attempt's staging/publication paths
before use without editing old bound artifacts. The separately held functional
checker diagnostic and unrelated ignored host `target/` cache remain untouched.
