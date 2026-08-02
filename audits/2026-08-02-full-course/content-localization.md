# Course content and localization audit

Audited product revision: `2b24a50d86609445ed19aa33a4162414904dc4ca`

Scope: all 40 curriculum contracts; 40 English and 40 Russian lessons; all 39
English and 39 Russian cheat sheets; catalogs, locale policy, formulas,
historical evidence, code/trace literals, links, diagram labels, exercises, and
accessibility copy. English was treated as the sole semantic source for Russian.

## Finding

### Medium: Russian Chapter 0 gives obsolete locale availability instructions

`site/src/content/chapters/ru/00-llm-parts.mdx:283-286` tells learners that only
Chapters 1-7 open Russian pages and that an `EN` badge means the Russian chapter
is unavailable. The checked locale projection publishes Russian versions of
every Chapter 0-39, and the diagram now resolves all of its chapter links to
Russian. The paragraph is therefore false and can mislead a learner about the
course map.

The neighboring course-path overview at lines 301-305 is current and correctly
describes the complete Chapter 1-39 sequence. The dormant label values
`referenceLocaleBadge` and `referenceLocaleDestination` at lines 201-202 are not
rendered while every destination has a Russian page, so the confirmed defect is
the visible explanatory paragraph, not a broken route.

## Verified passes

- `node scripts/check-course-plan.mjs`: 40 chapters, 111 scheduled steps, and
  40 implemented contracts through Chapter 39 are valid.
- Complete content and parity gates: 80 localized lesson sources form 40 exact
  publishable locale sets; 32 catalog keys and 42 registered shared-full-view
  diagram components pass.
- Focused source suite: 7 test files and 181 tests passed, including chapter
  publication, locale policy, all 78 cheat sheets, formula markup, MathML
  compatibility, localized contracts, and catalog behavior.
- Formula review: Chapter 0 correctly has no lesson formula; Chapters 1-39 have
  identical canonical frontmatter notation and symbols in English and Russian.
  Learner-facing formulas use the math pipeline. Differences in supplementary
  body notation were examined as localized explanatory choices rather than
  mechanically requiring equal expression counts.
- Historical thread: implementation chapters describe an LLM, model-training,
  evaluation, inference, or correctness predecessor and connect the mechanism
  to the cumulative decoder. The source scan found no visible TypeScript,
  Python, JavaScript, framework, deployment, or authoring-instruction narrative
  standing in for the LLM history.
- Meaning and evidence parity: all 40 locale pairs retain the same chapter ID,
  revision, formula contract, Rust source declarations, diagram registrations,
  ordered section obligations, and direct external evidence links. External URL
  sets are exact for every pair. Numeric and code/trace differences were checked
  as localized labels, localized prose examples, or additional explanations;
  fixed identifiers, commands, byte/token values, and observable commitments
  remain intact.
- Russian language integrity: no suspicious Unicode replacement/control line
  was found. Systematic anti-calque and monolingual review found no additional
  confirmed mistranslation; established technical abbreviations and source-paper
  titles remain intentionally non-Cyrillic where appropriate.
- Cheat sheets: exactly 39 sheets per locale cover the same 409 chapter-specific
  LLM concepts; Chapter 0 remains excluded. Terms are chapter-relevant rather
  than general programming vocabulary, Russian records are direct translations
  of the matching English records, and pagination is content-driven rather than
  capped at ten total terms.
- Learner-facing source scan found no TODO, placeholder, build-instruction, test
  requirement, or presentation-framework explanation that supplants teaching.

## Evidence and limitations

Complete deterministic logs and full-pair review digests are preserved under
`.build/runs/20260802T095110Z-audit-course-content-localization-01/`, including
`course-plan.log`, `content.log`, `parity.log`, `content-tests.log`,
`chapter-pair-digest.log`, `cheat-sheet-pair-digest.log`,
`formula-parity-manual.log`, `numeric-literal-parity.log`,
`code-trace-parity.log`, `external-link-parity.log`, and the targeted leakage,
rollout, Unicode, and Latin-run scans.

This fragment records source-level semantic and linguistic review. It does not
infer Russian layout safety from English; desktop/narrow containment, every
registered figure's full view, no-JavaScript surfaces, and both browser engines
are evaluated in the separate rendered-course audit.
