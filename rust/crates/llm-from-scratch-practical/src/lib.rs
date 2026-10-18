//! The practical course's independent copy of the completed Rust language model.
//!
//! Chapters extend the existing tokenizer, tensors, decoder, training and
//! inference mechanisms. The first course retains its original crate.

pub mod artifact_identity;
pub mod bigram;
pub mod checkpoint;
pub mod config;
pub mod corpus;
pub mod data;
pub mod evaluation;
pub mod generation;
pub mod metrics;
pub mod pipeline;
pub mod reference_source_identity;

/// Source-preserving failures at model-operation boundaries.
pub mod support {
    pub mod functional_error;
}

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
    pub mod causal_decoder_core;
    pub mod decoder;
    pub mod decoder_block;
    pub mod neural_ngram;
    pub mod prepared_decoder_input;
    pub mod text_input;
}

/// Deterministic data ordering and training updates.
pub mod training {
    pub mod adamw;
    pub mod batch;
    pub mod loss_scaling;
    pub mod packed_batch;
    pub mod packer;
    pub mod sequence_example;
    pub mod trainer;
    pub mod variable_batch;
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
    pub mod depth_health;
    pub mod depth_init;
    pub mod dropout;
    pub mod embedding;
    pub mod init;
    pub mod linear;
    #[path = "probability.rs"]
    pub mod probability;
    pub mod residual;
    pub mod residual_scale;
    pub mod rmsnorm;
    pub mod swiglu;
}

/// Contiguous storage, borrowed views, and checked tensor operations.
pub mod tensor {
    pub mod execution;
    pub mod matmul;
    pub mod ops;
    pub mod precision;
    pub mod storage;
    pub mod view;
}

/// Tokenizer construction and application retained from the first course.
pub mod tokenizer {
    pub mod artifact;
    #[path = "bpe.rs"]
    pub mod bpe;
    #[path = "bpe_trainer.rs"]
    pub mod bpe_trainer;
    mod encoding;
    mod incremental;
    pub mod policy;
}
