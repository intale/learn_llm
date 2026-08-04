# Tiny bilingual corpus

`tiny-bilingual-corpus.json` is an original teaching fixture written for this
repository on 2026-07-18. It does not copy or derive text from an external
dataset. Six short scenes are represented as twelve documents: one independently
reviewed English document and one Russian document share each `pair-*` provenance
group.

The fixture is intentionally small enough to inspect by hand. Later chapters use
it to teach the complete data path, not to claim useful real-world language-model
quality.

## Document format

The file is one ordinary JSON array. Each item has four required fields:

```json
{
  "id": "en-river-dawn",
  "language": "en",
  "provenance_group": "pair-river-dawn",
  "text": "At dawn, Mira carries a blue notebook to the river."
}
```

`Corpus::from_json` receives the JSON text as `&str`, so Rust guarantees valid
UTF-8 before the loader runs. `serde_json::from_str` handles JSON syntax and typed
deserialization. The course code separately checks the data invariants used by
the split: IDs, language tags, and provenance groups begin with a lowercase ASCII
letter and otherwise contain only lowercase ASCII letters or digits in nonempty
hyphen-separated segments; text contains at least one non-whitespace character;
document IDs and decoded text are unique; and array order is the canonical source
order.

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

The manifest records the FNV-1a 64-bit checksum of the canonical JSON text's UTF-8
bytes. `include_str!` supplies the exact checked-in text, and `source.as_bytes()`
hashes that representation without normalization. FNV is used only as a small
deterministic drift detector; it is not a cryptographic integrity guarantee. Any
content or line-ending change requires an explicit new manifest and content
revision rather than silently reusing the old split.

Document counts are a fixed property of this teaching fixture, not a recommended
universal split ratio. The important invariant is the unit of assignment: split
stable source documents (and related provenance groups) first, then learn all
tokenizer and model state from the training partition only.
