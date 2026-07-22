//! Cumulative, from-scratch implementations introduced by the course chapters.
//!
//! The crate intentionally starts without model concepts. Each chapter adds one
//! tested building block after its behavior has been established by a runnable
//! demo.

pub mod bigram;
pub mod corpus;
pub mod data;
pub mod metrics;

/// Numerical gradient checks introduced before automatic differentiation.
pub mod autograd {
    pub mod gradcheck;
}

/// Numerically stable neural-network building blocks.
pub mod nn {
    #[path = "probability.rs"]
    pub mod probability;
}

/// Contiguous storage, borrowed views, and checked tensor operations.
pub mod tensor {
    pub mod matmul;
    pub mod ops;
    pub mod storage;
    pub mod view;
}

/// Tokenizer construction and application taught in Chapters 3 and 4.
pub mod tokenizer {
    #[path = "bpe.rs"]
    pub mod bpe;
    #[path = "bpe_trainer.rs"]
    pub mod bpe_trainer;
}
