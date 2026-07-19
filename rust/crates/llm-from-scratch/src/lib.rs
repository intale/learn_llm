//! Cumulative, from-scratch implementations introduced by the course chapters.
//!
//! The crate intentionally starts without model concepts. Each chapter adds one
//! tested building block after its behavior has been established by a runnable
//! demo.

pub mod corpus;

/// Tokenizer construction and application taught in Chapters 3 and 4.
pub mod tokenizer {
    #[path = "bpe_trainer.rs"]
    pub mod bpe_trainer;
}
