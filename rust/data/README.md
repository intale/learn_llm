# Tiny bilingual corpus

`tiny-bilingual-corpus.txt` is an original teaching fixture written for this
repository on 2026-07-18. It does not copy or derive text from an external
dataset. Six short scenes are represented as twelve documents: one independently
reviewed English document and one Russian document share each `pair-*` provenance
group.

The fixture is intentionally small enough to inspect by hand. Later chapters use
it to teach the complete data path, not to claim useful real-world language-model
quality.

## Document format

Every document has an explicit opening marker, UTF-8 body, and closing marker:

```text
%% document <document-id> <language> <provenance-group>
<one or more body lines>
%% end
```

IDs, language tags, and provenance groups use lowercase ASCII kebab case. Blank
lines may occur inside a document, but body lines may not begin with the reserved
`%% ` prefix. The parser rejects malformed markers, invalid UTF-8, empty bodies,
and duplicate document IDs. It preserves source order and body line boundaries.

## Frozen split manifest

`splits.json` assigns whole document IDs before any tokenizer or model statistic
is learned:

- train: 8 documents / 4 bilingual provenance groups;
- validation: 2 documents / 1 bilingual provenance group;
- test: 2 documents / 1 bilingual provenance group.

The validator requires nonempty, pairwise-disjoint partitions that cover every
corpus document exactly once. It also keeps both translations in a provenance
group in the same partition, so a translated counterpart cannot leak across the
holdout boundary.

The manifest records the FNV-1a 64-bit checksum of the exact corpus bytes. FNV is
used only as a small deterministic drift detector; it is not a cryptographic
integrity guarantee. Any content or line-ending change requires an explicit new
manifest and content revision rather than silently reusing the old split.

Document counts are a fixed property of this teaching fixture, not a recommended
universal split ratio. The important invariant is the unit of assignment: split
stable source documents (and related provenance groups) first, then learn all
tokenizer and model state from the training partition only.
