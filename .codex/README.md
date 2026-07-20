# Codex orchestration for course delivery

This project uses a bounded hierarchy so one lead remains accountable for a
whole chapter or future locale activation while specialist work stays narrow and
independently reviewable.
`AGENTS.md` remains authoritative for scheduling, checkpoints, publication, and
commits. `SKILLS.md` remains authoritative for chapter content and localization.

## Topology

```text
root session — depth 0, repository orchestrator
├── chapter_lead — depth 1, candidate integrator for one claimed chapter run
│   ├── learning_researcher — depth 2, sources and teaching outline
│   ├── content_author — depth 2, contract and reference lesson phases
│   ├── rust_implementer — depth 2, executable Rust evidence
│   ├── site_visualization_implementer — depth 2, static site projection
│   ├── localization_author — depth 2, one non-reference locale and phase
│   ├── learning_reviewer — depth 2, pedagogy and reference-render audit
│   ├── localization_reviewer — depth 2, one locale's render and parity audit
│   └── validation_runner — depth 2, Docker gates and render evidence
└── locale_activation_lead — depth 1, one future cross-cutting locale run
    ├── localization_author — depth 2, disjoint locale bundles
    ├── content_author — depth 2, serialized localized contract fields
    ├── site_visualization_implementer — depth 2, registry/routes/layout/tests
    ├── localization_reviewer — depth 2, rendered language audits
    └── validation_runner — depth 2, complete activation gates
```

`agents.max_depth = 2` prevents recursive fan-out below the specialists.
`agents.max_threads = 4` caps concurrently open threads. As an operational rule,
a depth-1 lead schedules no more than two independent specialists while the root
and lead threads are open. Ordinary spawned turns have no configured timeout;
every failure, timeout supplied by a caller, and interruption follows the
fail-closed recovery below.

## Ownership contract

The root session is the only actor allowed to:

- select or claim a `BUILD_STATE.yaml` step;
- edit `BUILD_STATE.yaml` or `DECISIONS.md`;
- publish staged files to canonical paths;
- control the Git index or create the step commit; and
- declare a step complete.

The root is the durable step owner. A depth-1 lead is the candidate-integration
owner for one already-claimed run. Its prompt names the step ID, run ID, staging
directory, declared inputs and outputs, acceptance, validation, cost boundary,
and human approval gates. It writes only below that run's staging directory and
cannot publish or claim completion.

Before dispatch, the lead writes a path-complete ownership manifest and artifact
DAG under the run. Every declared product path, shared integration path, evidence
record, review record, validation log, and publication manifest has exactly one
writer. Every artifact lists its phase, owner, prerequisites, and prerequisite
SHA-256 checksums. A missing, duplicate, or stale entry blocks dispatch.

Write specialists receive an isolated
`.build/runs/<run-id>/agents/<assignment-id>/` tree. They never write directly to
`publish/`; after they stop and return a checksum manifest, the lead integrates
released assignments into `publish/` serially. An assigned path is write-locked
until its owner stops and explicitly releases it. The lead verifies Git status
and canonical hashes before and after each writer because a role's sandbox mode
does not provide dynamic path-level containment.

Depth-2 specialists do not edit the ledger, decisions, canonical sources, another
assignment, the run publication tree, or Git state; they do not publish, claim
completion, or spawn more agents. The root does not directly spawn write
specialists for a lead-owned run. A documented emergency read-only audit is the
only direct specialist exception.

## Scheduling work

Path disjointness is not dependency independence. Dependent work starts only when
the ownership manifest names the prerequisite artifacts and their current
checksums. Read-only work and independent isolated assignment trees may run in
parallel within the thread cap. Integration into `publish/` is always serialized.
Stop and return to the root if a dependency changes scope, cost, outputs, or
acceptance.

Any changed artifact invalidates every transitive DAG descendant, not only its
reviews. No final manifest may contain an artifact whose recorded prerequisite
checksum differs from the current prerequisite. When dependency scope is
uncertain, invalidate and rerun the broader branch.

A typical chapter proceeds as follows:

1. Root selects the first eligible step, performs preflight, creates the run, and
   checkpoints `running`.
2. Root delegates the claimed run to `chapter_lead` with the full contract above.
3. The lead enumerates every configured locale, closes path ownership, and asks
   `learning_researcher` for a primary-source claim map and teaching outline.
4. `content_author` freezes the locale-neutral contract core, meaning lock,
   expected behavior, evidence specification, and visualization decision. Every
   non-reference locale then receives a terminology pass; `content_author` alone
   integrates accepted localized contract fields and freezes the complete
   contract before implementation.
5. `rust_implementer` creates exact executable evidence. If the visualization is
   useful, Rust emits a deterministic trace and the site specialist's component
   phase owns the Astro component, parser, and focused unit tests. If it is not
   useful, no diagram trace, component, parser, or diagram test is required.
6. `content_author` receives a lesson-phase follow-up, verifies the frozen
   contract against exact Rust and optional site evidence, and authors the
   complete reference lesson. A needed contract correction invalidates and
   restarts every transitive descendant.
7. Locale authors draft target lessons from the frozen contract and complete
   reference lesson. The site specialist's integrated-route phase then owns
   assigned browser tests and checks localized labels, layouts, desktop/narrow
   behavior, and RTL behavior after all lessons exist.
8. The lead freezes the complete candidate manifest. `validation_runner` builds
   and captures every locale route at desktop and narrow widths, including
   direction-sensitive evidence for a configured RTL locale.
9. `learning_reviewer` qualitatively inspects the primary-source claims,
   reference source, and render, including whether a not-useful visualization
   decision is justified.
   One `localization_reviewer` per non-reference locale first inspects the target
   render monolingually and only then compares it with the meaning lock and
   reference. Automated checks and screenshots do not replace these reviews.
10. Corrections create a new freeze and rerun every invalidated transitive
    descendant and review. After the final deterministic Docker gate, the lead
    returns the manifest-ready candidate and evidence. Root verifies it, records
    human approvals, publishes, reruns all canonical gates, finalizes the
    checkpoint, and commits the step alone.

## Milestones, failure, and recovery

After any expensive or non-repeatable operation, the specialist returns its
command, outcome, artifact path, and checksum, then pauses dependent work. The
lead forwards the milestone immediately; the root records it in
`BUILD_STATE.yaml` before continuation. A validation log is not a substitute for
the required ledger checkpoint.

If a specialist fails, times out, or is interrupted, the lead stops dependent
dispatch, interrupts or settles affected siblings, records every child status,
inventories partial paths and checksums, verifies canonical hashes and Git state,
and returns to the root. The root confirms that no prior owner remains active and
records the run as failed or interrupted with the step pending or blocked as
AGENTS.md requires. Resume only a documented restart-safe operation whose input
fingerprint still matches; otherwise retain the old attempt and create a new run.
An implicit retry or silent reuse is forbidden.

## Models and permissions

Content-critical roles use the official `gpt-5.6` family alias with maximum
reasoning. Rust and site implementation use `gpt-5.6` with high reasoning.
Deterministic validation uses `gpt-5.6-terra` with high reasoning. Runtime model
availability still depends on the active account and client catalog.

Role files request read-only or workspace-write defaults. Parent-turn live
sandbox and approval overrides are reapplied to children and take precedence.
Role instructions, isolated assignment trees, ownership locks, and canonical
hash checks remain required safeguards; do not rely on `sandbox_mode` alone to
enforce boundaries. Approval and network policy inherit from the parent; no
project role deliberately weakens them.

Localization roles are language-generic. For a chapter, their prompt names one
configured locale from `site/src/i18n/locales.json`. For locale activation, it
names the claimed target metadata and checksum-frozen proposed registry entry;
the locale need not be canonical yet. Their workflow follows the meaning-lock,
terminology, native-draft, critical-claim, anti-calque, monolingual,
accessible-language, parity, and rendered passes in `SKILLS.md`. Agent review
cannot replace fluent-human approval. An approval record names the locale,
complete `content_revision` set, frozen manifest checksum, exact rendered routes,
reviewed lessons, catalogs, navigation, and label surfaces, and reviewer or
approval reference. Any later content or label change invalidates it.

For a future locale activation, the root delegates the separately claimed
cross-cutting step to `locale_activation_lead`, not `chapter_lead`. That lead
covers every implemented chapter plus catalogs, chooser, home, course, switcher,
navigation, alternate links, language and direction metadata, and local links as
one fail-closed publication set. A manifest-only or partially reviewed activation
cannot be published. It prepares the frozen review package; only the root records
the human response and authorizes publication. Locale authors first propose each
chapter's terminology and localized fields; content authors alone integrate
assigned staged contracts and freeze their checksums before target prose begins.
Later contract changes transitively invalidate dependent lessons and evidence.

## Activation and validation

Codex loads project `.codex/` configuration only for a trusted repository. Start
a new Codex session after changing these files; an already-running session is not
evidence that the new hierarchy was loaded.

From the repository root, validate the configuration with:

```sh
.codex/check-orchestration.sh
```

The checker verifies the declared topology and role invariants, then asks the
installed Codex CLI to load the trusted project configuration in strict mode.
That CLI integration check parses TOML and referenced role layers; it reports but
does not confuse unrelated provider or historical-session doctor failures with a
configuration failure. It cannot prove account-specific model availability or
that the already-running parent session hot-reloaded the new files.

For an offline structure-and-policy check that does not invoke Codex Doctor, run:

```sh
.codex/check-orchestration.sh --structural
```

The default strict check may attempt provider reachability diagnostics because
they are part of Doctor; only its parsed `config.load` result decides whether this
configuration check passes.
