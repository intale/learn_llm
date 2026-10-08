"""A bounded, inspectable NeMo Curator corpus-preparation example.

NeMo implements the filter and duplicate-removal operations. Pandas implements
JSONL input/output and table operations; hashlib supplies standard hashing. This
recipe does not download data or models. The Rust language model only consumes
the prepared JSONL, not these Python dependencies.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path

import pandas as pd

CURATOR_VERSION = "1.3.0"
DEFAULT_MAX_INPUT_BYTES = 4_194_304
DEFAULT_MAX_DOCUMENTS = 4_096
RMM_POOL_BYTES = 536_870_912
SPILL_LIMIT_BYTES = 268_435_456
INPUT_BLOCK_BYTES = 65_536
MAX_SPLIT_POLICY_BYTES = 65_536
SPLIT_ROLES = ("train", "validation", "test")


def sha256_file(path: Path) -> str:
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def read_input(path: Path, max_bytes: int, max_documents: int) -> pd.DataFrame:
    """Validate the bounded exercise's input shape, not its training suitability."""
    if not path.is_file():
        raise ValueError(f"input is not a local JSONL file: {path}")
    if path.stat().st_size > max_bytes:
        raise ValueError(f"input exceeds the declared {max_bytes}-byte exercise limit")
    if path.stat().st_size == 0:
        return pd.DataFrame(columns=["id", "text"])
    frame = pd.read_json(path, lines=True, dtype=False, convert_dates=False)
    if len(frame) > max_documents:
        raise ValueError(f"input exceeds the declared {max_documents}-document exercise limit")
    if not {"id", "text"}.issubset(frame.columns):
        raise ValueError("input records require id and text columns")
    for field in ("id", "text"):
        if not frame[field].map(lambda value: isinstance(value, str)).all():
            raise ValueError(f"every {field} must be a JSON string")
    if frame["id"].str.strip().eq("").any():
        raise ValueError("input document IDs must not be blank")
    if not pd.Index(frame["id"]).is_unique:
        raise ValueError("input document IDs must be unique for duplicate-ID removal")
    return frame


def read_parts(directory: Path) -> pd.DataFrame:
    """Read the bounded recipe's NeMo-written JSONL shards using Pandas."""
    paths = sorted(directory.glob("*.jsonl"))
    frames = [pd.read_json(path, lines=True, dtype=False, convert_dates=False) for path in paths]
    if not frames:
        return pd.DataFrame(columns=["id", "text"])
    return pd.concat(frames, ignore_index=True)


def read_split_policy(path: Path) -> tuple[str, pd.Series]:
    """Read a caller-supplied assignment, not an outcome-dependent split rule."""
    if not path.is_file() or not 0 < path.stat().st_size <= MAX_SPLIT_POLICY_BYTES:
        raise ValueError("split policy must be a nonempty local JSON file of at most 65536 bytes")
    with path.open(encoding="utf-8") as source:
        policy = json.load(source)
    if not isinstance(policy, dict) or set(policy) != {"schema_version", "group_field", "assignments"}:
        raise ValueError("split policy requires schema_version, group_field and assignments")
    if type(policy["schema_version"]) is not int or policy["schema_version"] != 1:
        raise ValueError("unsupported split-policy schema version")
    group_field = policy["group_field"]
    if not isinstance(group_field, str) or not group_field.strip() or group_field in {"id", "text", "split"}:
        raise ValueError("group_field must name a metadata column, not id, text or split")
    assignments = policy["assignments"]
    if not isinstance(assignments, list) or not 0 < len(assignments) <= DEFAULT_MAX_DOCUMENTS:
        raise ValueError("provide between 1 and 4096 group assignments")
    if any(not isinstance(row, dict) or set(row) != {"group", "role"} for row in assignments):
        raise ValueError("each group assignment requires exactly group and role")
    frame = pd.DataFrame(assignments)
    if not frame["group"].map(lambda value: isinstance(value, str) and bool(value.strip())).all():
        raise ValueError("group identities must be nonblank strings")
    if not frame["role"].isin(SPLIT_ROLES).all() or not pd.Index(frame["group"]).is_unique:
        raise ValueError("each group must have one unique train, validation or test assignment")
    return group_field, frame.set_index("group")["role"]


def assign_splits(frame: pd.DataFrame, group_field: str, roles: pd.Series) -> pd.DataFrame:
    """Join the supplied policy with Pandas; never infer roles from scores."""
    if "split" in frame.columns:
        raise ValueError("input already contains split metadata; do not overwrite an earlier assignment")
    if frame.empty:
        return frame.assign(split=pd.Series(dtype="str"))
    if group_field not in frame.columns:
        raise ValueError(f"input lacks the declared source-group field: {group_field}")
    if not frame[group_field].map(lambda value: isinstance(value, str) and bool(value.strip())).all():
        raise ValueError("source-group identities must be nonblank strings")
    assigned = frame[group_field].map(roles)
    if assigned.isna().any():
        raise ValueError("every input group needs a predeclared split assignment")
    return frame.assign(split=assigned)


def curate(input_path: Path, output_path: Path, min_words: int, max_words: int) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """Use the pinned library's public workflows, never a substitute deduplicator."""
    from nemo_curator.backends.ray_actor_pool import RayActorPoolExecutor
    from nemo_curator.core.client import RayClient
    from nemo_curator.pipeline import Pipeline
    from nemo_curator.stages.deduplication.exact.workflow import ExactDeduplicationWorkflow
    from nemo_curator.stages.text.deduplication.removal_workflow import TextDuplicatesRemovalWorkflow
    from nemo_curator.stages.text.filters import ScoreFilter
    from nemo_curator.stages.text.filters.heuristic import WordCountFilter
    from nemo_curator.stages.text.io.reader import JsonlReader
    from nemo_curator.stages.text.io.writer import JsonlWriter

    quality_path = output_path / "quality"
    duplicate_path = output_path / "exact"
    deduplicated_path = output_path / "deduplicated"
    read_kwargs = {"dtype": {"id": "str"}, "convert_dates": False}
    with RayClient(
        num_cpus=2,
        num_gpus=1,
        include_dashboard=False,
        object_store_memory=536_870_912,
    ):
        executor = RayActorPoolExecutor()
        # region:nemo-quality-pipeline
        Pipeline(
            name="course_corpus_quality",
            stages=[
                JsonlReader(file_paths=str(input_path), read_kwargs=read_kwargs),
                ScoreFilter(
                    filter_obj=WordCountFilter(min_words=min_words, max_words=max_words, lang="en"),
                    score_field="word_count",
                ),
                JsonlWriter(path=str(quality_path), mode="error"),
            ],
        ).run(executor=executor)
        # endregion:nemo-quality-pipeline
        quality = read_parts(quality_path)
        if quality.empty:
            return quality, quality.copy(), {"exact_identification_executed": False}

        # region:nemo-exact-identification
        identification = ExactDeduplicationWorkflow(
            input_path=str(quality_path),
            output_path=str(duplicate_path),
            input_filetype="jsonl",
            input_blocksize=INPUT_BLOCK_BYTES,
            assign_id=False,
            id_field="id",
            text_field="text",
            perform_removal=False,
            total_nparts=1,
            rmm_pool_size=RMM_POOL_BYTES,
            spill_memory_limit=SPILL_LIMIT_BYTES,
        ).run(executor=executor)
        # endregion:nemo-exact-identification

        # region:nemo-duplicate-removal
        removal = TextDuplicatesRemovalWorkflow(
            input_path=str(quality_path),
            ids_to_remove_path=str(duplicate_path / "ExactDuplicateIds"),
            output_path=str(deduplicated_path),
            input_filetype="jsonl",
            id_field="id",
            duplicate_id_field="id",
            input_kwargs=read_kwargs,
            output_filetype="jsonl",
            output_mode="error",
        ).run(executor=executor)
        # endregion:nemo-duplicate-removal
        prepared = read_parts(deduplicated_path)
        return quality, prepared, {
            "exact_identification_executed": True,
            "identification": identification.metadata,
            "removal": removal.metadata,
        }


def run(args: argparse.Namespace) -> dict:
    version = importlib.metadata.version("nemo-curator")
    if version != CURATOR_VERSION:
        raise RuntimeError(f"this recipe requires NeMo Curator {CURATOR_VERSION}; found {version}")
    if args.min_words < 1 or args.max_words < args.min_words:
        raise ValueError("word limits require 1 <= min_words <= max_words")
    if args.max_input_bytes < 1 or args.max_documents < 1:
        raise ValueError("input byte and document capacities must be positive")
    source = args.input.resolve(strict=True)
    input_frame = read_input(source, args.max_input_bytes, args.max_documents)
    split_policy = None
    if args.split_policy is not None:
        policy_path = args.split_policy.resolve(strict=True)
        group_field, roles = read_split_policy(policy_path)
        # Reject incomplete input-group assignments before creating output or
        # dispatching NeMo work, including assignments for later exclusions.
        assign_splits(input_frame, group_field, roles)
        split_policy = {
            "sha256": sha256_file(policy_path),
            "group_field": group_field,
            "method": "caller-predeclared known source groups; Pandas metadata join",
        }
    output = args.output.resolve()
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise FileExistsError("use an empty output directory; earlier attempts are never overwritten")
    output.mkdir(parents=True, exist_ok=True)
    input_digest = sha256_file(source)

    if input_frame.empty:
        quality, prepared = input_frame.copy(), input_frame.copy()
        workflow = {"exact_identification_executed": False}
    else:
        quality, prepared, workflow = curate(source, output, args.min_words, args.max_words)
    if not prepared.empty:
        if not {"id", "text"}.issubset(prepared.columns):
            raise RuntimeError("NeMo output lacks the required prepared-document columns")
        if not prepared["id"].map(lambda value: isinstance(value, str)).all():
            raise RuntimeError("NeMo output IDs do not satisfy the string interchange contract")
        if not prepared["text"].map(lambda value: isinstance(value, str) and bool(value.strip())).all():
            raise RuntimeError("NeMo output text does not satisfy the nonblank string interchange contract")
        # This is only bounded export ordering, not a promised dedup representative.
        prepared = prepared.sort_values("id", kind="stable")
    if split_policy is not None:
        prepared = assign_splits(prepared, group_field, roles)

    prepared_stage = output / "prepared.pending.jsonl"
    prepared.to_json(prepared_stage, orient="records", lines=True, force_ascii=False)
    report = {
        "schema_version": 1,
        "scope": "bounded-supplied-jsonl-preparation",
        "tool": {"name": "nemo-curator", "version": version},
        "input": {"bytes": source.stat().st_size, "sha256": input_digest},
        "policy": {
            "language": "en",
            "min_words": args.min_words,
            "max_words": args.max_words,
            "max_input_bytes": args.max_input_bytes,
            "max_documents": args.max_documents,
            "exact_duplicates": "NeMo MD5 text-hash grouping; one representative per group",
            "split_assignment": split_policy,
            "rmm_pool_bytes": RMM_POOL_BYTES,
            "spill_limit_bytes": SPILL_LIMIT_BYTES,
            "input_block_bytes": INPUT_BLOCK_BYTES,
        },
        "documents": {
            "input": len(input_frame),
            "after_quality": len(quality),
            "prepared": len(prepared),
        },
        "prepared": {
            "file": "prepared.jsonl",
            "bytes": prepared_stage.stat().st_size,
            "sha256": sha256_file(prepared_stage),
            "decoded_text_utf8_bytes": sum(len(text.encode("utf-8")) for text in prepared["text"]),
        },
        "workflow": workflow,
        "not_established": [
            "rights or redistribution permission",
            "privacy clearance",
            "near-duplicate removal",
            "completeness or correctness of supplied related-source groups",
            "protected evaluation decontamination",
            "trained-model quality",
            "bulk-corpus resource feasibility",
        ],
    }
    staged_exports = [(prepared_stage, output / "prepared.jsonl")]
    if split_policy is not None:
        report["splits"] = {}
        for role in SPLIT_ROLES:
            selected = prepared.loc[prepared["split"].eq(role)]
            stage = output / f"{role}.pending.jsonl"
            selected.to_json(stage, orient="records", lines=True, force_ascii=False)
            report["splits"][role] = {
                "file": f"{role}.jsonl",
                "documents": len(selected),
                "decoded_text_utf8_bytes": sum(len(text.encode("utf-8")) for text in selected["text"]),
                "bytes": stage.stat().st_size,
                "sha256": sha256_file(stage),
            }
            staged_exports.append((stage, output / f"{role}.jsonl"))
    else:
        report["not_established"].append("train/validation/test assignment; no split policy was supplied")
    report_stage = output / "report.pending.json"
    with report_stage.open("w", encoding="utf-8") as destination:
        json.dump(report, destination, ensure_ascii=False, sort_keys=True, indent=2)
        destination.write("\n")
    # Each final file is complete before exposure. This is not a multi-file crash
    # transaction: after interruption, the caller must not adopt an incomplete
    # attempt. Successful exit plus every report-listed file is the boundary.
    for stage, destination in staged_exports:
        os.replace(stage, destination)
    os.replace(report_stage, output / "report.json")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="caller-supplied local UTF-8 JSONL file")
    parser.add_argument("--output", type=Path, required=True, help="empty directory for this attempt")
    parser.add_argument("--split-policy", type=Path, help="optional predeclared known-source-group assignments")
    parser.add_argument("--min-words", type=int, default=3)
    parser.add_argument("--max-words", type=int, default=20)
    parser.add_argument("--max-input-bytes", type=int, default=DEFAULT_MAX_INPUT_BYTES)
    parser.add_argument("--max-documents", type=int, default=DEFAULT_MAX_DOCUMENTS)
    report = run(parser.parse_args())
    print(json.dumps(report["documents"], sort_keys=True))


if __name__ == "__main__":
    main()
