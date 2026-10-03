# Git persistence checks

The initial ordinary staging attempt could not create `.git/index.lock` because
repository metadata is read-only in the sandbox. The same exact scoped `git add`
completed with the narrowly approved Git-metadata write permission. No product
or evidence bytes changed for that retry.

The staged whitespace check initially reported generator whitespace in frozen
built-HTML snapshots (including `.txt` copies) and exact command-output logs.
These are hash-bound raw evidence, not newly authored source. They must not be
normalized to satisfy a whitespace formatter.

The staged check passes for every other file with only audit `.html`, `.txt` and
`.log` evidence excluded. All canonical chapter/test/plan/state/decision source
is included, as are audit Markdown, executable helpers, JSON manifests and exact
JSON response records. Canonical `git diff --check` also passes. Publication,
review and archive verification separately check immutable evidence bytes.

The index owns only the ten declared chapter/integration paths, this audit and
the completed state/decision records. No `.build/runs/`, unrelated chapter,
Rust, diagram implementation, skill, environment or secret/config path is staged.
