//! A deterministic topology map for the course's decoder-only LLM.

/// One named block in the inference path or in the process that learns it.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LlmPart {
    pub id: &'static str,
    pub path: &'static str,
    pub purpose: &'static str,
    pub chapters: &'static [&'static str],
}

const PARTS: &[LlmPart] = &[
    LlmPart {
        id: "input-text",
        path: "both",
        purpose: "Supply prompt text and preserve document boundaries for causal training examples.",
        chapters: &[
            "02-corpus-partitions",
            "05-autoregressive-examples",
            "21-mini-batches",
        ],
    },
    LlmPart {
        id: "tokenizer",
        path: "both",
        purpose: "Convert text to stable token IDs and convert generated IDs back to text.",
        chapters: &[
            "01-text-units",
            "03-learn-bpe-merges",
            "04-apply-bpe-tokenizer",
        ],
    },
    LlmPart {
        id: "numeric-core",
        path: "both",
        purpose: "Execute tensor operations on both paths and record gradients only during learning.",
        chapters: &[
            "08-tensor-storage",
            "09-tensor-views",
            "10-broadcasting-reductions",
            "11-matrix-multiplication",
            "12-stable-softmax",
            "13-gradient-checking",
            "14-scalar-autodiff",
            "15-tensor-autodiff-core",
            "16-model-autodiff-ops",
            "17-parameter-initialization",
            "18-token-embeddings",
            "19-linear-layers",
        ],
    },
    LlmPart {
        id: "embeddings",
        path: "both",
        purpose: "Look up a learned feature vector for each token ID.",
        chapters: &["18-token-embeddings"],
    },
    LlmPart {
        id: "decoder-block",
        path: "both",
        purpose: "Repeat attention and feed-forward transformations while preserving a residual stream.",
        chapters: &["31-decoder-block"],
    },
    LlmPart {
        id: "rmsnorm",
        path: "both",
        purpose: "Control feature scale before each learned branch.",
        chapters: &["25-rmsnorm"],
    },
    LlmPart {
        id: "causal-attention",
        path: "both",
        purpose: "Mix information from the allowed prefix through multiple learned heads.",
        chapters: &[
            "26-qkv-projections",
            "27-self-attention",
            "28-causal-masking",
            "29-rope",
            "30-multi-head-attention",
        ],
    },
    LlmPart {
        id: "residual-stream",
        path: "both",
        purpose: "Carry the current representation around each learned branch and add its update.",
        chapters: &["24-residual-connections"],
    },
    LlmPart {
        id: "swiglu",
        path: "both",
        purpose: "Transform features independently at each position through a gated feed-forward branch.",
        chapters: &["20-swiglu-feed-forward"],
    },
    LlmPart {
        id: "vocabulary-head",
        path: "both",
        purpose: "Normalize final features and project each position to one logit per vocabulary item.",
        chapters: &["32-decoder-model"],
    },
    LlmPart {
        id: "sampler",
        path: "inference",
        purpose: "Turn logits into probabilities and choose the next token under a decoding policy.",
        chapters: &["12-stable-softmax", "36-temperature-top-k"],
    },
    LlmPart {
        id: "kv-cache",
        path: "inference",
        purpose: "Retain earlier attention keys and values so generation need not recompute them.",
        chapters: &["37-incremental-attention", "38-cached-generation"],
    },
    LlmPart {
        id: "loss",
        path: "learning",
        purpose: "Measure how much probability the model assigned to the observed next token.",
        chapters: &[
            "06-bigram-baseline",
            "07-language-model-metrics",
            "23-neural-ngram",
        ],
    },
    LlmPart {
        id: "optimizer",
        path: "learning",
        purpose: "Use gradients to update parameters and select a trained state with validation data.",
        chapters: &["22-adamw", "33-training-selection"],
    },
    LlmPart {
        id: "evaluation",
        path: "learning",
        purpose: "Score the frozen selected model once on previously unopened test examples.",
        chapters: &["34-final-evaluation"],
    },
    LlmPart {
        id: "checkpoint",
        path: "integration",
        purpose: "Save and restore the exact tokenizer, configuration, parameters, and training state.",
        chapters: &["35-checkpoints"],
    },
    LlmPart {
        id: "capstone",
        path: "integration",
        purpose: "Connect training, evaluation, persistence, and cached generation in one program.",
        chapters: &["39-end-to-end-llm"],
    },
];

// region:model-map
pub const INFERENCE_FLOW: &[&str] = &[
    "input-text",
    "tokenizer",
    "embeddings",
    "decoder-block",
    "vocabulary-head",
    "sampler",
];

pub const DECODER_BLOCK_FLOW: &[&str] = &[
    "rmsnorm",
    "causal-attention",
    "residual-stream",
    "rmsnorm",
    "swiglu",
    "residual-stream",
];

pub const LEARNING_FLOW: &[&str] = &[
    "input-text",
    "tokenizer",
    "embeddings",
    "decoder-block",
    "vocabulary-head",
    "loss",
    "optimizer",
    "evaluation",
    "checkpoint",
];
// endregion:model-map

#[must_use]
pub fn parts() -> &'static [LlmPart] {
    PARTS
}

#[must_use]
pub fn render_trace() -> String {
    let mut output = String::from("LLM_PARTS_TRACE_V1\n");
    for part in PARTS {
        output.push_str("PART|id=");
        output.push_str(part.id);
        output.push_str("|path=");
        output.push_str(part.path);
        output.push_str("|purpose=");
        output.push_str(part.purpose);
        output.push_str("|chapters=");
        output.push_str(&part.chapters.join(","));
        output.push('\n');
    }
    for (name, flow) in [
        ("inference", INFERENCE_FLOW),
        ("decoder-block", DECODER_BLOCK_FLOW),
        ("learning", LEARNING_FLOW),
    ] {
        output.push_str("FLOW|name=");
        output.push_str(name);
        output.push_str("|parts=");
        output.push_str(&flow.join(","));
        output.push('\n');
    }
    output.push_str("END|chapter=39-end-to-end-llm\n");
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;

    #[test]
    fn every_implementation_chapter_is_reachable_from_the_map() {
        let linked = PARTS
            .iter()
            .flat_map(|part| part.chapters.iter().copied())
            .collect::<BTreeSet<_>>();
        let expected = (1..=39)
            .map(|order| format!("{order:02}-"))
            .collect::<Vec<_>>();

        assert_eq!(linked.len(), 39);
        for prefix in expected {
            assert!(
                linked.iter().any(|chapter| chapter.starts_with(&prefix)),
                "missing chapter {prefix}"
            );
        }
    }

    #[test]
    fn every_flow_names_a_declared_part() {
        let ids = PARTS.iter().map(|part| part.id).collect::<BTreeSet<_>>();
        for flow in [INFERENCE_FLOW, DECODER_BLOCK_FLOW, LEARNING_FLOW] {
            assert!(flow.iter().all(|id| ids.contains(id)));
        }
    }

    #[test]
    fn numeric_core_is_a_shared_foundation_not_a_sequential_stage() {
        let numeric_core = PARTS
            .iter()
            .find(|part| part.id == "numeric-core")
            .expect("numeric core must be declared");
        assert_eq!(numeric_core.path, "both");
        assert!(numeric_core.purpose.contains("both paths"));
        assert!(numeric_core.purpose.contains("only during learning"));
        for flow in [INFERENCE_FLOW, DECODER_BLOCK_FLOW, LEARNING_FLOW] {
            assert!(!flow.contains(&numeric_core.id));
        }
    }

    #[test]
    fn learning_reuses_the_forward_path_before_branching_to_loss() {
        let prediction_length = INFERENCE_FLOW.len() - 1;
        assert_eq!(
            &LEARNING_FLOW[..prediction_length],
            &INFERENCE_FLOW[..prediction_length]
        );
        assert_eq!(LEARNING_FLOW[prediction_length], "loss");
        assert!(!LEARNING_FLOW.contains(&"sampler"));
        assert!(!LEARNING_FLOW.contains(&"numeric-core"));
    }

    #[test]
    fn trace_is_stable_and_complete() {
        let trace = render_trace();
        assert!(trace.starts_with("LLM_PARTS_TRACE_V1\n"));
        assert_eq!(trace.matches("PART|").count(), PARTS.len());
        assert_eq!(trace.matches("FLOW|").count(), 3);
        assert!(trace.ends_with("END|chapter=39-end-to-end-llm\n"));
    }
}
