# Separate NeMo Curator environment

This external tool prepares documents. It is not linked into the Rust LLM and
does not change the Rust/site Docker image. The thin
[Dockerfile](../../docker/nemo-curator.Dockerfile) derives from the official
NeMo 26.07 image by digest. The recipe requires its NeMo Curator 1.3.0 APIs.
No corpus or model is included in the derived image; inputs and output are mounts.

## Run the supplied example

Run from the repository root on Linux with Docker, a compatible NVIDIA GPU and
driver, and the NVIDIA Container Toolkit. Image construction can use network
access for the official environment. Every runtime command disables networking.

```sh
docker build --file docker/nemo-curator.Dockerfile \
  --tag learn-llm-nemo-curator:26.07 .
mkdir -p .build/corpus/ch41-exact-fixture
docker run --rm --network none --gpus all --memory=8g --cpus=2 --shm-size=1g \
  --hostname course-nemo --add-host course-nemo:127.0.0.1 \
  --mount type=bind,source="$PWD/tools/nemo-curator",target=/course,readonly \
  --mount type=bind,source="$PWD/.build/corpus/ch41-exact-fixture",target=/output \
  learn-llm-nemo-curator:26.07 /course/prepare_corpus.py \
    --input /course/fixtures/raw.jsonl --output /output \
    --split-policy /course/fixtures/splits.json
```

The output directory must be empty. Choose a fresh path after an earlier run;
never overwrite a completed or failed attempt. The hostname maps local Ray to
loopback only; it does not enable outbound connectivity.

The actual stage counts for the supplied fixture are 6 input documents, 4 after
word-count filtering and 3 after exact duplicate removal. The provided group policy assigns
one survivor each to train/validation/test. Decoded text bytes are 11/11/17,
39 across all roles. Either cat-story ID may be retained. `report.json` records
configuration, input/output hashes, workflow evidence and scope limitations.
All-role `prepared.jsonl` is for inspection; feed `train.jsonl` to tokenizer
learning. A role label is not complete related-source or benchmark clearance.

The recipe uses NeMo workflows for word-count filtering, exact identification
and removal, Pandas for JSONL/table/export operations, standard JSON for the
provided split policy and standard hashlib for checksums. It does not acquire
data/models, detect all sensitive text or run fuzzy deduplication. Default input
limits are 4 MiB and 4096 records. Configured RMM/spill pools are not total device
memory admission and do not prove bulk-corpus feasibility.

After successful exit, require the report and every file it lists. Each file is
written completely before renaming, but publication is not a multi-file crash
transaction. Do not adopt an interrupted partial directory. The separately
scheduled full-corpus job owns its complete immutable publication and release
protocol; the Rust loader does not verify that producer protocol.

## Check the helper contract

With the same image built, run from the repository root:

```sh
docker run --rm --network none \
  --mount type=bind,source="$PWD/tools/nemo-curator",target=/course,readonly \
  learn-llm-nemo-curator:26.07 -m unittest -v test_prepared_export
```

This selects six tests. They check input limits and the caller-predeclared group
join, including unknown groups and prior split metadata. They do not mock or
certify a NeMo GPU result. The GPU command above separately exercises the real
library path.

## Load the prepared training selection

With the repository Rust workspace image available, run from the repository root:

```sh
COURSE_CORPUS=false ./course run cargo run --offline --locked \
  -p ch41-corpus-preparation < .build/corpus/ch41-exact-fixture/train.jsonl
```

The summary contains 1 document and 11 decoded UTF-8 text bytes for this fixture. The
reader accepts any caller-supplied buffered I/O stream; the file redirect is a
demo adapter, not a hardcoded source or destination in the library. The wrapper
forwards standard input without allocating a terminal and runs without network.

## Change or extend the preparation workflow

Pin a new supported official image/API before changing the recipe. Use the
tool's mature operations and standard input/output libraries, not substitute
filters, parsers or deduplicators in the Rust LLM. Use caller-supplied inputs and
predeclared policies. The current full-corpus lifecycle plan owns raw-format
ingress, near-duplicate/group replay, privacy/rights release, protected evaluation
checks and resource admission. Do not lift this example's word range or tiny
memory settings into that job without validating the actual dataset and workload.
