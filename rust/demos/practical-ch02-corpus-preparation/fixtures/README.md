# Prepared-corpus loader fixture

`prepared.jsonl` is manually prepared, course-authored text. It is not the output
of a recorded NeMo Curator run and contains no acquired TinyStories data.

The three documents contain 11, 11 and 17 decoded UTF-8 text bytes, respectively.
The Rust example reads those records as supplied and reports their 39-byte sum.
Additional `source_group` fields demonstrate retained, tool-neutral metadata.

The separate NeMo exercise has its own raw input, configuration, execution
evidence and generated output. Never replace its evidence with this fixture.
