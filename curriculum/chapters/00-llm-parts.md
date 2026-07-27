---
{
  "chapter_id": "00-llm-parts",
  "concept_id": "llm-parts",
  "content_revision": 1,
  "order": 0,
  "objective": {
    "en": "Identify the major parts of a decoder-only LLM, state each part's purpose, and follow the course links that build it."
  },
  "worked_inputs": {
    "en": "Trace the prompt text A through tokenization, token embeddings, one repeated pre-norm decoder block, the tied vocabulary head, and temperature/top-k sampling; then reuse that forward path for an observed next-token target and follow its loss, gradients, AdamW update, validation selection, final evaluation, checkpointing, and cached generation."
  },
  "formula": {
    "latex": "P_\\theta(z_{1:T})=\\prod_{t=1}^{T}P_\\theta(z_t\\mid z_{<t})",
    "symbols": [
      {
        "symbol": "P_\\theta",
        "en": "the probability model defined by all learned parameters; its arguments specify a sequence or conditional event"
      },
      {
        "symbol": "\\theta",
        "en": "the collection of learned embeddings, normalization gains, attention weights, and feed-forward weights"
      },
      {
        "symbol": "z_{1:T}",
        "en": "one complete sequence of token IDs"
      },
      {
        "symbol": "T",
        "en": "the number of tokens in the sequence"
      },
      {
        "symbol": "t",
        "en": "the current token position"
      },
      {
        "symbol": "z_t",
        "en": "the observed token at the current position"
      },
      {
        "symbol": "z_{<t}",
        "en": "all earlier tokens available as causal context"
      },
      {
        "symbol": "\\prod_{t=1}^{T}",
        "en": "multiplication of one conditional next-token probability at every position"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Count n-grams condition on a fixed short context and cannot learn reusable distributed features or content-dependent access to a longer prefix."
      },
      "later_advance": {
        "en": "Neural language models learned distributed token representations, the Transformer supplied masked self-attention over the prefix, and later autoregressive Transformer language models scaled the same next-token objective."
      },
      "modern_llm_role": {
        "en": "A modern decoder-only LLM repeatedly transforms token features with normalized causal attention and gated feed-forward branches, then projects the result to a next-token distribution used by training or generation."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio and colleagues contrast n-gram generalization with a neural probability function that learns distributed word representations; their model predates the Transformer and this course's decoder block."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues define the Transformer and mask decoder self-attention against later positions; their published system is an encoder-decoder model, not this course's decoder-only topology."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Language Models are Few-Shot Learners",
          "source_url": "https://arxiv.org/pdf/2005.14165",
          "claim": {
            "en": "Brown and colleagues describe GPT-3 as a scaled autoregressive language model; its scale and measured capabilities do not transfer to the tiny reference model used here."
          }
        }
      ]
    },
    "approach": {
      "en": "Begin with a count-based short-context language model, then place learned representations, masked self-attention, decoder blocks, optimization, and autoregressive generation on one road to the modern decoder-only LLM."
    },
    "summary": {
      "en": "The useful mental model is not one mysterious intelligence box: it is a text interface, a learned feature pipeline repeated across decoder blocks, a vocabulary prediction head, and a learning process that adjusts those weights from next-token evidence."
    },
    "rust_contrast": "The Rust topology fixture lists every implementation chapter from 01 through 39 and makes the shared forward prefix, inference-only sampler, and post-logit learning branch explicit."
  },
  "rust": {
    "package": "ch00-llm-parts",
    "sources": [
      "rust/demos/ch00-llm-parts/src/lib.rs",
      "rust/demos/ch00-llm-parts/src/main.rs"
    ],
    "expected_output": "LLM_PARTS_TRACE_V1\nPART|id=input-text|path=both|purpose=Supply prompt text and preserve document boundaries for causal training examples.|chapters=02-corpus-partitions,05-autoregressive-examples,21-mini-batches\nPART|id=tokenizer|path=both|purpose=Convert text to stable token IDs and convert generated IDs back to text.|chapters=01-text-units,03-learn-bpe-merges,04-apply-bpe-tokenizer\nPART|id=numeric-core|path=both|purpose=Execute tensor operations on both paths and record gradients only during learning.|chapters=08-tensor-storage,09-tensor-views,10-broadcasting-reductions,11-matrix-multiplication,12-stable-softmax,13-gradient-checking,14-scalar-autodiff,15-tensor-autodiff-core,16-model-autodiff-ops,17-parameter-initialization,18-token-embeddings,19-linear-layers\nPART|id=embeddings|path=both|purpose=Look up a learned feature vector for each token ID.|chapters=18-token-embeddings\nPART|id=decoder-block|path=both|purpose=Repeat attention and feed-forward transformations while preserving a residual stream.|chapters=31-decoder-block\nPART|id=rmsnorm|path=both|purpose=Control feature scale before each learned branch.|chapters=25-rmsnorm\nPART|id=causal-attention|path=both|purpose=Mix information from the allowed prefix through multiple learned heads.|chapters=26-qkv-projections,27-self-attention,28-causal-masking,29-rope,30-multi-head-attention\nPART|id=residual-stream|path=both|purpose=Carry the current representation around each learned branch and add its update.|chapters=24-residual-connections\nPART|id=swiglu|path=both|purpose=Transform features independently at each position through a gated feed-forward branch.|chapters=20-swiglu-feed-forward\nPART|id=vocabulary-head|path=both|purpose=Normalize final features and project each position to one logit per vocabulary item.|chapters=32-decoder-model\nPART|id=sampler|path=inference|purpose=Turn logits into probabilities and choose the next token under a decoding policy.|chapters=12-stable-softmax,36-temperature-top-k\nPART|id=kv-cache|path=inference|purpose=Retain earlier attention keys and values so generation need not recompute them.|chapters=37-incremental-attention,38-cached-generation\nPART|id=loss|path=learning|purpose=Measure how much probability the model assigned to the observed next token.|chapters=06-bigram-baseline,07-language-model-metrics,23-neural-ngram\nPART|id=optimizer|path=learning|purpose=Use gradients to update parameters and select a trained state with validation data.|chapters=22-adamw,33-training-selection\nPART|id=evaluation|path=learning|purpose=Score the frozen selected model once on previously unopened test examples.|chapters=34-final-evaluation\nPART|id=checkpoint|path=integration|purpose=Save and restore the exact tokenizer, configuration, parameters, and training state.|chapters=35-checkpoints\nPART|id=capstone|path=integration|purpose=Connect training, evaluation, persistence, and cached generation in one program.|chapters=39-end-to-end-llm\nFLOW|name=inference|parts=input-text,tokenizer,embeddings,decoder-block,vocabulary-head,sampler\nFLOW|name=decoder-block|parts=rmsnorm,causal-attention,residual-stream,rmsnorm,swiglu,residual-stream\nFLOW|name=learning|parts=input-text,tokenizer,embeddings,decoder-block,vocabulary-head,loss,optimizer,evaluation,checkpoint\nEND|chapter=39-end-to-end-llm\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "llm-parts-map",
    "rationale": {
      "en": "A linked block schema makes nesting, repeated decoder computation, the next-token feedback loop, and the learning branch from the shared forward path easier to understand than a flat list of chapter titles."
    }
  },
  "decoder_connection": {
    "en": "The map previews the complete decoder: token IDs become feature vectors, repeated pre-norm blocks mix causal context and transform features, a tied head produces logits, sampling chooses a token, and training changes the same weights through loss, gradients, and AdamW."
  },
  "terminology": [
    {
      "concept_id": "llm-parts",
      "en": "LLM parts"
    },
    {
      "concept_id": "inference-path",
      "en": "inference path"
    },
    {
      "concept_id": "learning-path",
      "en": "learning path"
    },
    {
      "concept_id": "decoder-block",
      "en": "decoder block"
    },
    {
      "concept_id": "vocabulary-head",
      "en": "vocabulary head"
    },
    {
      "concept_id": "kv-cache",
      "en": "key-value cache"
    }
  ],
  "translation_notes": [
    "English is the sole active locale for Chapter 0; publish no Russian lesson or placeholder route.",
    "Keep LLM, BPE, RMSNorm, SwiGLU, Q/K/V, RoPE, AdamW, KV, BOS, EOS, logits, softmax, token IDs, and source titles stable when a later Russian revision is approved.",
    "Describe Rust only as the executable topology evidence; keep the historical road about language models and learned architecture."
  ],
  "acceptance_examples": [
    {
      "input": "Follow prompt text into the model",
      "expected": "Text becomes token IDs, embeddings become hidden features, repeated decoder blocks transform the residual stream, the vocabulary head emits logits, and the sampler chooses a next token."
    },
    {
      "input": "Open the decoder block",
      "expected": "Each pre-norm block contains an RMSNorm-attention-residual branch followed by an RMSNorm-SwiGLU-residual branch."
    },
    {
      "input": "Ask what changes during learning",
      "expected": "The shared tokenizer, embeddings, decoder, and vocabulary head produce logits; observed next tokens then define loss, autodiff supplies gradients, AdamW updates weights, validation selects a state, and final evaluation measures the already frozen choice."
    },
    {
      "input": "Ask what changes during cached generation",
      "expected": "The learned weights remain fixed while each attention layer appends reusable keys and values and the selected token returns to the input sequence."
    },
    {
      "input": "Inspect all chapter destinations in the Rust map",
      "expected": "Every implementation chapter from 01-text-units through 39-end-to-end-llm is linked by at least one named part."
    }
  ]
}
---

# Chapter 0: A map of a modern LLM

<!-- contract-section:scope -->
## Scope

This chapter supplies a map before the course starts building individual pieces.
It names the major blocks in a small decoder-only LLM, states what each block is
for, and shows how inference and learning branch after reusing the same forward
path through logits.

The map is deliberately structural. It does not pre-teach tensor operations,
gradient derivations, optimizer details, production serving, retrieval, mixture
of experts, instruction tuning, or any claim that one small model represents
every modern LLM system.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with prompt text `A`. The tokenizer maps text to token IDs. Embedding lookup
maps each ID to a learned feature vector. A stack repeats the same block shape:
normalize, mix the allowed decoder-input prefix through the current query position
with causal attention, add the result, normalize, apply a gated feed-forward
transformation, and add again. Shifted targets keep the predicted token outside
that allowed prefix. Final normalization and the tied vocabulary head produce one
logit for each vocabulary item at every sequence position. A decoding policy
chooses a token ID and appends it to the token-ID sequence.

During learning, the observed next token supplies the target. Loss measures the
prediction, reverse mode computes gradients, and AdamW updates the same weights
used by inference. Validation selects a state; test evaluation checks that frozen
choice. Checkpoints preserve it, and KV caches avoid repeating earlier attention
work during generation.

Tensor operations form the numeric foundation of both inference and learning.
Only graph recording and reverse-mode gradient propagation are learning-specific.

<!-- contract-section:formula -->
## Formula and symbols

All the blocks serve one causal factorization:

$$
P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t})
$$

Here $P_\theta$ is the probability model defined by learned parameters $\theta$;
its arguments specify either the complete sequence or a next-token conditional.
$z_{1:T}$ is a sequence of $T$ token IDs; $t$ is one position; $z_t$ is the token
observed there; $z_{<t}$ is the earlier causal prefix; and $\prod_{t=1}^{T}$
multiplies the conditional probabilities for the sequence.

<!-- contract-section:history -->
## From short count contexts to decoder-only LLMs

[Bengio and colleagues](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
describe traditional n-gram language models as relying on short overlapping
contexts, then learn distributed word representations jointly with a neural
probability function. That model predates the Transformer and lacks this decoder
block, but it establishes the move from counts toward learned features.

[Vaswani and colleagues](https://arxiv.org/pdf/1706.03762) introduce the
Transformer and mask decoder self-attention so a position cannot read later
positions. Their paper presents an encoder-decoder translation system, so the
decoder-only map here is a later architectural specialization, not a diagram
copied from that system.

[Brown and colleagues](https://arxiv.org/pdf/2005.14165) describe GPT-3 as a
scaled autoregressive language model. That places the same causal prediction
objective in the modern LLM lineage, but its scale and task results do not transfer
to this tiny reference implementation.

<!-- contract-section:rust-behavior -->
## Rust behavior

The dependency-free Rust package declares one `LlmPart` record per named block.
Each record owns a stable ID, its role in inference or learning, a short purpose,
and the exact implementation chapters that teach it. Three explicit arrays freeze
the outer inference flow, the two branches inside a decoder block, and the learning
flow.

Tests prove that every Chapter 1 through Chapter 39 destination is reachable, every
flow names a declared part, and the serialized trace remains exact. The fixture is
a topology and navigation example; it does not duplicate the tensor, attention,
optimizer, or generation implementations taught later.

<!-- contract-section:visualization -->
## Visualization

One block schema follows prompt text across the inference spine and places the
repeated decoder block around its six internal operations. A cache note attaches
to attention because keys and values belong to each layer. The selected token loops
back as an ID to embedding lookup for the next cached decode. The tokenizer handles
the prompt once; generation does not detokenize and retokenize the whole prefix on
each step.

A supporting learning section shows where data, numeric operations, loss,
optimization, evaluation, checkpointing, and the final capstone belong. Keeping
that section separate prevents a common misconception: loss and AdamW train an LLM,
but they are not extra blocks traversed for every generated token.

<!-- contract-section:exercises -->
## Prediction checks

1. Which block first turns a token ID into learned features?
2. Which branch lets a query use its current decoder input and earlier inputs without reading its prediction target?
3. Why are there two residual additions in one decoder block?
4. Which block emits one score for every vocabulary token?
5. Does AdamW run while an already trained model generates text?
6. What does a KV cache retain, and which block owns that state?
7. Where does the chosen next token go?
8. Which chapter joins all the parts into one program?

Checks: embedding lookup; causal attention over the allowed decoder-input prefix
through the query position, with shifted targets keeping the predicted token out;
one addition wraps attention and one
wraps the feed-forward branch; the tied vocabulary head; no; earlier keys and
values owned per attention layer; its ID joins the growing token-ID sequence and
the next cached step begins at embedding lookup; and the
Chapter 39 capstone.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

Every later lesson now has a visible home. Chapters 1 through 7 establish text,
tokenization, causal examples, a count baseline, and language-model metrics.
Chapters 8 through 23 build the numeric and learning foundation. Chapters 24
through 32 assemble the decoder. Chapters 33 through 38 train, evaluate, persist,
sample, and cache it. Chapter 39 proves the whole path end to end.

<!-- contract-section:localization -->
## Localization notes

English is the sole active locale for this revision. Preserve established model
names and abbreviations when a later reviewed Russian lesson is added. Keep the
historical sequence on the road to modern LLMs, and distinguish learner-facing
model parts from the Rust fixture that records their topology.

<!-- contract-section:acceptance -->
## Acceptance examples

The frontmatter freezes the formula, primary-source boundaries, topology trace,
English-only locale, visualization decision, exact chapter destinations, and
worked inference/learning paths. Validation must prove the Rust output, contract
and lesson parity, complete links, formula annotations, SEO and sitemap route,
semantic diagram containment, keyboard access, and the responsive expanded view.
