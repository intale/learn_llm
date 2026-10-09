//! The practical course's independent copy of the completed Rust language model.
//!
//! Chapters extend the existing tokenizer, tensors, decoder, training and
//! inference mechanisms. The first course retains its original crate.

pub mod artifact_identity;
pub mod bigram;
pub mod checkpoint;
pub mod corpus;
pub mod data;
pub mod evaluation;
pub mod generation;
pub mod metrics;
pub mod pipeline;
pub mod reference_source_identity;

/// Learned feature views and weighted mixtures used by self-attention.
pub mod attention {
    pub mod causal_mask;
    pub mod incremental;
    pub mod multi_head;
    pub mod qkv;
    pub mod rope;
    pub mod self_attention;
}

/// Complete decoder models assembled from the chapter-by-chapter primitives.
pub mod models {
    pub mod decoder;
    pub mod decoder_block;
    pub mod neural_ngram;
}

/// Deterministic data ordering and training updates.
pub mod training {
    pub mod adamw;
    pub mod batch;
    pub mod trainer;
}

/// Numerical gradient checks and reverse-mode differentiation.
pub mod autograd {
    pub mod gradcheck;
    pub mod model_ops;
    pub mod scalar;
    pub mod tensor_core;
}

/// Numerically stable neural-network building blocks.
pub mod nn {
    pub mod embedding;
    pub mod init;
    pub mod linear;
    #[path = "probability.rs"]
    pub mod probability;
    pub mod residual;
    pub mod rmsnorm;
    pub mod swiglu;
}

/// Contiguous storage, borrowed views, and checked tensor operations.
pub mod tensor {
    pub mod matmul;
    pub mod ops;
    pub mod storage;
    pub mod view;
}

/// Tokenizer construction and application retained from the first course.
pub mod tokenizer {
    #[path = "bpe.rs"]
    pub mod bpe;
    #[path = "bpe_trainer.rs"]
    pub mod bpe_trainer;
}
