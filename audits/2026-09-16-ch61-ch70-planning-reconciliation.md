# Chapters 61–70 planning-state reconciliation

Status: internal provenance and status findings only. This note is not a chapter
packet, an English/Russian publication judgment, permission to execute the course
extension, or a request to repair completed artifacts.

Recording step: `reconcile-ch61-ch70-planning-history-20260916`.
Run: `.build/runs/20260916T154833Z-reconcile-ch61-ch70-planning-history-20260916-01/`.

## Scope and evidence boundary

The user requested a separate commit preserving the findings from reconciliation
of supplied historical records with the live repository. The evidence baseline
is Git commit `f9554cdc9fb1ce756984c70c3f59b7e335808d64`, after the Chapter 70
planning commit. Later documentation bookkeeping must not be confused with that
baseline's state.

Repository observations and supplied chat excerpts are different evidence classes.
The supplied excerpts are useful historical context, but their stated timestamps,
statuses and hashes do not override the checked-out ledger or authenticate an
artifact's exact bytes. No missing text was reconstructed from memory.

## Findings

### 1. Historical status reports are not current checkpoints

At the checked baseline, Chapters 61–70 have completed planning checkpoints,
Chapter 71 is pending and unclaimed, and no step or run is running. The planning
build's recorded expenditure is 29 at that baseline. The worktree was clean.

The supplied `fa7a6f4` README/decision/ledger excerpts end at Chapter 60. The
later supplied `e448a1a` claim describes the start of Chapter 62. These are not
the final batch state. Repeating their pending/running labels as current would
incorrectly reopen completed work.

### 2. Chapter 62's failed extraction and successful correction are separate runs

The preserved run `20260916T111606Z-detail-ch62-laptop-hardware-admission-01`
failed input validation. It extracted the planning record
`detail-ch62-laptop-hardware-admission` (two outputs, three planning commands),
not the intended implementation record. It is failed evidence, not a resumable
successful chapter draft.

The separate run `20260916T112210Z-detail-ch62-laptop-hardware-admission-02`
succeeded. Its selected implementation build is
`extend-course-to-functional-laptop-llm-20260810`; its implementation step is
`implement-ch62-laptop-hardware-admission`, with 26 implementation outputs and
six outer implementation validation commands. The Chapter 62 planning packet was published in
`1e73168496bed79ca5701c7759b669ae5636086d`. The two runs must not be merged,
overwritten, relabeled or resumed from the historical running claim.

| Run / artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `.01/inputs.json` | 27075 | `034921b97d5179b1353687b9726db40c7cc6594c15de0c0ca57ca7320e39f24f` |
| `.01/preflight.md` | 2105 | `4b82fce55484788784f5b6e5afc1c660906e24a1388b3801afbe7e938d3835c3` |
| `.02/inputs.json` | 41985 | `614d7d034cec37f11851e5f39fff84dd7a7407ea06cd53a0a3bcf4e461ec4df0` |
| `.02/preflight.md` | 1742 | `a02d2e32888cc0917ed5299a059096baaed982c231d4f7d246013ab7a1ecd8f5` |

Full run directories are under `.build/runs/` with the run IDs above.

### 3. The eight ancillary placeholders are not missing authoritative bindings

The eight prospective placeholders in corrected `.02/inputs.json` are confined
to `$.planning_step_record.runs[1]`:

- `input_fingerprint.inputs_json_sha256` and `input_fingerprint.inputs_json_bytes`;
- `input_fingerprint.preflight_sha256` and `input_fingerprint.preflight_bytes`;
- `artifacts[0].sha256` and `artifacts[0].bytes`;
- `artifacts[1].sha256` and `artifacts[1].bytes`.

The four placeholder spellings are `__INPUTS_SHA__`, `__INPUTS_BYTES__`,
`__PREFLIGHT_SHA__` and `__PREFLIGHT_BYTES__`, each appearing twice.
They are part of a captured planning-ledger projection, not the selected
implementation record or the external bindings of the completed run.

The actual input/preflight file hashes and sizes are concrete, as are the
implementation build/step identities and their recorded ledger bindings.
Consumers must not substitute the ancillary planning projection for the selected
implementation record. No rewrite is warranted solely to replace these
self-referential snapshot placeholders; doing so would change completed,
hash-bound evidence.

### 4. Pasted text is not byte-level artifact evidence

The first supplied packet rendering omitted literal IDs, all nine prerequisite
values, formula text and hashes. That rendering could not support a faithful
content comparison; the cause of the omissions was not established.

The two corrected supplied parts contain all ten numbered section headings.
That is a structural observation only. Their claimed whole-packet stage hash is
`5d8149caeffbcdf235c4cce58cae1617badb00aa8760745c4ee319c377a823b0`.
That hash was supplied in chat, not independently established for an available
local artifact by this reconciliation.

The verified canonical Chapter 62 packet and its completed `.02` staged copy
are 35453 bytes with SHA-256
`e7c8e77845d89eb6de996abea429f51941a67a96d1afc4f14a1701945099f1ff`.
The distinct supplied hash may describe an intermediate revision, but its exact
bytes and revision provenance are not established here. It must not replace the
completed packet or be treated as evidence of corruption merely because the two
hash claims differ.

### 5. Existing decision-history formatting/order anomaly

At the evidence baseline, `DECISIONS.md` contains the literal line
`+## Chapter 69 detailed planning: bounded request lifecycle` after the
Chapter 67 entry, followed by the Chapter 68 entry and then Chapter 70.
The leading plus prevents that line from being a Markdown heading; the entry
order also differs from the verified Chapter 68-before-69 commit sequence.

This is an observed documentation-history anomaly, not a demonstrated change to
the chapter packets or their run hashes. It is recorded here without removing
the plus, moving entries, or changing a completed checkpoint. Any future
clarification must respect the append-only history rules and the existing repair
hold; this report does not authorize a cleanup.

### 6. Limits of these findings

These checks establish recorded status, selected-record identity, artifact
integrity, and the distinction between supplied excerpts and local evidence.
They do not establish new technical correctness, pedagogy, language quality,
hardware admission, or publication approval. Ten headings and matching hashes
are not substitutes for substantive review.

No course implementation, hardware probe, acquisition, training, localization,
publication review or repair was started. Completed run artifacts and Chapter
61–70 packets remain unchanged. Chapter 71 remains pending; this documentation
commit does not release any implementation or repair hold.

## Evidence locations and reproduction

- `BUILD_STATE.yaml`: build `detail-future-chapter-execution-plans-20260915`,
  steps `detail-ch61-quantized-gguf-artifacts` through
  `detail-ch70-loopback-serving-metrics`, and both Chapter 62 run records.
- `DECISIONS.md`: the Chapter 62 input-selection correction and Chapter 70
  planning-only batch boundary.
- `curriculum/future-chapter-plans/62-laptop-hardware-admission.md` and the
  completed `.02` staged packet.
- `curriculum/future-chapter-plans/README.md` and `index.json`: completed
  planning inventory and unchanged execution hold.

Use `git show f9554cdc9fb1ce756984c70c3f59b7e335808d64:BUILD_STATE.yaml`
to inspect the ledger at the named baseline. Recompute local artifact hashes
with `sha256sum` and byte counts with `wc -c`; inspect the complete parsed
input records, not a grep match that might select the planning record.
The dedicated reconciliation run records exact validation commands and results.
