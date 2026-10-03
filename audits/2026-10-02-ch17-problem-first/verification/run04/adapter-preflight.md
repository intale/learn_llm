# Current-byte verification adapter

Run04 verifies actual new staged/built bytes against the unchanged approved
English r6 rather than overwriting its old run paths or verification reports.
The adapter copies exact schemas and immutable candidate records into a private
temporary verifier root, checks every actual source/projection/HTML byte, then
maps those byte-identical actual products to the frozen logical publication paths.
It never changes a semantic record or supplies a new language judgment.

Three initial adapter attempts stopped before producing a report:

1. The isolated root lacked the bound `.agents` schema files (`ENOENT`).
2. The verifier refused a nonempty report parent (`report-parent`).
3. The verifier refused a missing report parent (`output-parent`).

The final wrapper copies only the four exact English/localization schema files
and creates a fresh empty role/phase report directory. The unchanged executable
then verifies all review/adjudication receipts and actual English publication
bytes under binding `253b1f5886453cbf7c0fbc63ea5c783c41e2676851fdd0399bf1881365c17048`.
Its report is byte-identical to the earlier passing report. Previous frozen
candidate, raw responses, receipts and prior-run artifacts remain untouched.

Russian verification uses the same current-byte approach only after both fresh
language records exist. Publication and post-publication verification remain
separate gates. This note records deterministic wrapper failures, not candidate
language failures or repaired semantic evidence.
