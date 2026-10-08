"""Contract tests for library-owned JSONL I/O and supplied-policy metadata joins.

No mocked result is evidence that NeMo's GPU workflow ran.
"""

import json
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from prepare_corpus import assign_splits, read_input, read_split_policy


class PreparedExportTests(unittest.TestCase):
    def test_supplied_policy_keeps_a_group_in_one_role(self):
        group_field, roles = read_split_policy(Path(__file__).parent / "fixtures/splits.json")
        frame = pd.DataFrame([
            {"id": "a", "text": "one text", "source_group": "family-a"},
            {"id": "b", "text": "another text", "source_group": "family-a"},
            {"id": "c", "text": "held out", "source_group": "family-b"},
        ])
        selected = assign_splits(frame, group_field, roles)
        self.assertEqual(selected["split"].tolist(), ["train", "train", "validation"])
        self.assertNotIn("split", frame.columns)
        self.assertEqual(selected["text"].tolist(), frame["text"].tolist())

    def test_unassigned_or_missing_group_refuses(self):
        roles = pd.Series({"known": "train"})
        for frame in (
            pd.DataFrame([{"id": "a", "text": "text", "source_group": "unknown"}]),
            pd.DataFrame([{"id": "a", "text": "text"}]),
            pd.DataFrame([{"id": "a", "text": "text", "source_group": None}]),
        ):
            with self.subTest(columns=frame.columns.tolist()):
                with self.assertRaises(ValueError):
                    assign_splits(frame, "source_group", roles)

    def test_prior_split_is_not_overwritten(self):
        frame = pd.DataFrame([{"id": "a", "text": "text", "source_group": "known", "split": "test"}])
        with self.assertRaises(ValueError):
            assign_splits(frame, "source_group", pd.Series({"known": "train"}))
        self.assertEqual(frame["split"].tolist(), ["test"])

    def test_duplicate_or_unknown_role_policy_refuses(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "policy.json"
            for assignments in (
                [{"group": "a", "role": "train"}, {"group": "a", "role": "test"}],
                [{"group": "a", "role": "evaluation"}],
            ):
                with self.subTest(assignments=assignments):
                    path.write_text(json.dumps({"schema_version": 1, "group_field": "source_group", "assignments": assignments}), encoding="utf-8")
                    with self.assertRaises(ValueError):
                        read_split_policy(path)

    def test_empty_input_and_split_export_are_empty(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "empty.jsonl"
            path.touch()
            frame = read_input(path, 1, 1)
            selected = assign_splits(frame, "source_group", pd.Series({"a": "train"}))
            self.assertTrue(selected.empty)
            self.assertIn("split", selected.columns)

    def test_input_shape_and_caps_are_not_curation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.jsonl"
            path.write_text('{"id":"a","text":"same"}\n{"id":"b","text":"same"}\n', encoding="utf-8")
            self.assertEqual(len(read_input(path, path.stat().st_size, 2)), 2)
            with self.assertRaises(ValueError):
                read_input(path, path.stat().st_size - 1, 2)
            with self.assertRaises(ValueError):
                read_input(path, path.stat().st_size, 1)


if __name__ == "__main__":
    unittest.main()
