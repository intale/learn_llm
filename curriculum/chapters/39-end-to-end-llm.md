---
{
  "chapter_id": "39-end-to-end-llm",
  "concept_id": "end-to-end-llm",
  "content_revision": 1,
  "order": 39,
  "objective": {
    "en": "Run one deterministic bilingual decoder-only LLM from frozen document partitions through training-only BPE, validation selection, one-time test evaluation, checkpoint reload, and cached text generation."
  },
  "worked_inputs": {
    "en": "Use the checked-in eight/two/two bilingual document split, learn eight BPE merges from training only, train a one-block 1,188-parameter decoder for 32 updates, select validation loss 3.889531885, beat the frozen bigram on 1,744 test targets, reload bitwise-equal logits, and continue prompt A with token IDs 260, 34, 34 as the text т followed by two spaces."
  },
  "formula": {
    "latex": "P_\\theta(z_{1:T})=\\prod_{t=1}^{T}P_\\theta(z_t\\mid z_{<t})",
    "symbols": [
      {
        "symbol": "P_\\theta",
        "en": "the probability distribution defined by the decoder parameters"
      },
      {
        "symbol": "\\theta",
        "en": "all learned decoder parameter values selected by validation loss"
      },
      {
        "symbol": "z_{1:T}",
        "en": "one token sequence from its first token through its final token"
      },
      {
        "symbol": "T",
        "en": "the number of tokens in the sequence being assigned probability"
      },
      {
        "symbol": "\\prod_{t=1}^{T}",
        "en": "multiplication of one next-token conditional probability at every sequence position"
      },
      {
        "symbol": "t",
        "en": "the current token position"
      },
      {
        "symbol": "z_t",
        "en": "the observed token at position t"
      },
      {
        "symbol": "z_{<t}",
        "en": "all tokens before position t that form the causal context"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "A count-based bigram estimates the next token from one preceding token and cannot share statistical strength through learned features or use the longer causal prefix."
      },
      "later_advance": {
        "en": "Neural language models learned distributed token features and longer-context probability functions; the Transformer supplied masked self-attention, and later autoregressive Transformer language models scaled that training objective."
      },
      "modern_llm_role": {
        "en": "The capstone joins the complete evidence boundary used by an autoregressive decoder: data isolation, tokenizer learning, causal next-token updates, validation-only selection, untouched final evaluation, persistence, and stateful generation."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio and colleagues describe traditional n-gram generalization through short overlapping sequences and show a neural probability function that learns distributed word representations and benefits from longer contexts; their model is not a Transformer or this course pipeline."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani and colleagues define the Transformer and mask decoder self-attention so a position cannot read later positions; their published architecture is an encoder-decoder model and does not define this course data, checkpoint, or generation policy."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "Language Models are Few-Shot Learners",
          "source_url": "https://arxiv.org/pdf/2005.14165",
          "claim": {
            "en": "Brown and colleagues report GPT-3 as a scaled autoregressive language model and evaluate its task behavior without parameter updates at use time; scale and capability claims from that model do not transfer to this tiny teaching run."
          }
        }
      ]
    },
    "approach": {
      "en": "Return to the training-only alpha-one bigram as the frozen short-context baseline, then compare it with the validation-selected causal decoder on exactly the same previously unopened test targets."
    },
    "summary": {
      "en": "Count n-grams provided a strong short-context baseline; learned distributed features and masked self-attention made longer learned computation possible, and scaled autoregressive Transformers became modern LLMs. This capstone demonstrates the same end-to-end responsibility boundaries at inspectable scale without treating one tiny loss win as a general quality claim."
    },
    "rust_contrast": "Score the one-token-context alpha-one bigram and four-token causal decoder on the identical 1,744 final targets: the frozen run reports mean losses 3.981342714 and 3.866087547, respectively, while keeping the test gate unavailable during both same-seed training replays."
  },
  "rust": {
    "package": "ch39-end-to-end-llm",
    "sources": [
      "rust/crates/llm-from-scratch/src/pipeline.rs",
      "rust/demos/ch39-end-to-end-llm/src/lib.rs",
      "rust/demos/ch39-end-to-end-llm/src/main.rs"
    ],
    "expected_output": "chapter=39-end-to-end-llm\ndata=checksum:fnv1a64:04786e7303f1dfd6 split:fixed-paired-document-holdout-v1 documents:8/2/2 train_ids:[en-river-dawn,ru-river-dawn,en-clock-shop,ru-clock-shop,en-rain-library,ru-rain-library,en-bee-garden,ru-bee-garden] validation_ids:[en-night-station,ru-night-station] test_ids:[en-winter-window,ru-winter-window]\ntokenizer=layout:1 requested:8 learned:8 training_only:true vocabulary:266 encoded_tokens:[1852,471,444]\nmodel=layers:1 heads:1 width:4 feed_forward:4 context:4 parameters:1188 windows:[1820,463,436] batches:[15,4,4]\ntraining=updates:32 seed:39 checkpoints:0:5.621745486/5.628342353/candidate;32:3.855502695/3.889531885/selected selected:32 validation:3.889531885 optimizer:32 replay_bitwise:true\ntest=access:1 documents:[en-winter-window,ru-winter-window] windows:436 batches:4 targets:1744 fingerprint:fnv1a64:77b836869f848986 decoder:3.866087547 bigram:3.981342714 gap:0.115255167 decoder_wins:true no_grad:true unchanged:true\ncheckpoint=bytes:30994 header:2418 records:34 checksum:fnv1a64:67aeaaea603b291f selected:32 optimizer:32 rng:0x0000000000000026 tokenizer_exact:true logits_bitwise:true\ngeneration=prompt:A prompt_ids:[67] generated:[260,34,34] text:\"т  \" stop:token-limit final_cache:3 cached_scores:6 complete_prefix_scores:14 tokens_exact:true decisions_bitwise:true rng_exact:true\nhistory=bigram_context:1 decoder_context:4 distributed_features:true causal_transformer:true scaled_autoregressive:true local_pipeline:true\nnext=inspect, modify, test, and extend the complete decoder\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "end-to-end-llm",
    "rationale": {
      "en": "One left-to-right pipeline makes the information boundary visible: test evidence appears only after training and validation selection, then the exact selected state crosses save/reload before cached generation."
    }
  },
  "decoder_connection": {
    "en": "Every course component now participates in one functional program: frozen bilingual data becomes BPE tokens and causal batches, the decoder trains and is selected without test access, the held-out report beats its frozen bigram, the checkpoint restores exact state, and cached generation returns decoded text."
  },
  "terminology": [
    {
      "concept_id": "end-to-end-llm",
      "en": "end-to-end LLM"
    },
    {
      "concept_id": "training-only-tokenizer",
      "en": "training-only tokenizer"
    },
    {
      "concept_id": "validation-selected-state",
      "en": "validation-selected state"
    },
    {
      "concept_id": "one-time-final-evaluation",
      "en": "one-time final evaluation"
    },
    {
      "concept_id": "frozen-bigram-baseline",
      "en": "frozen bigram baseline"
    },
    {
      "concept_id": "bitwise-replay",
      "en": "bitwise deterministic replay"
    },
    {
      "concept_id": "cached-continuation",
      "en": "cached continuation"
    }
  ],
  "translation_notes": [
    "Russian is registered but inactive for Chapter 39, so no Russian lesson or placeholder route is published.",
    "Preserve BPE, LLM, AdamW, BOS, EOS, KV, RNG, token IDs, hashes, shapes, losses, source titles, and exact trace fields.",
    "The generated Cyrillic т demonstrates that one shared byte tokenizer can decode both scripts; it is not a translation or a quality claim.",
    "Keep the test boundary one-way: training and validation choose the state before the FinalEvaluator consumes test evidence once.",
    "Describe Rust only as the executable implementation language; keep the historical progression about language models, learned representations, causal attention, and autoregressive scaling."
  ],
  "acceptance_examples": [
    {
      "input": "Parse rust/data/tiny-bilingual-corpus.txt with rust/data/splits.json",
      "expected": "The checksum is fnv1a64:04786e7303f1dfd6 and the immutable split contains eight training, two validation, and two test documents."
    },
    {
      "input": "Learn eight BPE merges and encode every partition",
      "expected": "Only the eight training document IDs supply pair counts; vocabulary size is 266 and encoded token counts are 1852, 471, and 444."
    },
    {
      "input": "Run both seed-39 training replays",
      "expected": "Both execute 32 updates and reproduce every checkpoint and parameter bit; validation selects step 32 at loss 3.889531885."
    },
    {
      "input": "Open the context-four final evaluator after selection",
      "expected": "One access scores 1,744 identical targets; decoder loss 3.866087547 is lower than frozen bigram loss 3.981342714 by 0.115255167."
    },
    {
      "input": "Save and reload the selected state",
      "expected": "The 30,994-byte, 34-record checkpoint restores the exact BPE tokenizer, step-32 optimizer, RNG state 0x26, and bitwise-equal logits."
    },
    {
      "input": "Generate three tokens from prompt A with top-k four and seed 38",
      "expected": "Cached and complete-prefix paths both select [260,34,34], decode т followed by two spaces, stop at the token limit, and finish with equal decisions and RNG state."
    },
    {
      "input": "cargo run --quiet --locked -p ch39-end-to-end-llm",
      "expected": "stdout equals rust/demos/ch39-end-to-end-llm/expected.txt byte for byte, including the final newline."
    }
  ]
}
---

# Chapter 39: Run the whole tiny LLM

<!-- contract-section:scope -->
## Scope

This capstone calls the existing document partition, BPE, causal-window,
decoder, AdamW, selection, final-evaluation, checkpoint, sampler, and KV-cache
APIs as one program. It adds orchestration and evidence, not a second
implementation of any model concept.

The fixture remains deliberately small: eight BPE merges, one block, width four,
one head, feed-forward width four, four-token context, 1,188 parameters, and 32
updates. It does not claim useful prose quality, broad generalization, production
throughput, distributed training, or the scale of a deployed LLM.

<!-- contract-section:worked-inputs -->
## Worked inputs

The checked corpus freezes paired English and Russian documents into eight
training documents, two validation documents, and two test documents. BPE sees
only training text and produces a 266-token vocabulary. Four-token causal
windows yield 1,820 training, 463 validation, and 436 test windows.

Seed 39 initializes and orders two complete training replays. Both select step
32 at validation loss 3.889531885. Only then does one final evaluator expose
1,744 test targets. The selected decoder reaches loss 3.866087547; the alpha-one
bigram fitted to the same training partition reaches 3.981342714.

The selected state is saved and reloaded. Prompt A encodes as token 67. Top-k
four sampling from seed 38 selects tokens 260, 34, and 34. The tokenizer decodes
them as Cyrillic т followed by two spaces, and cached and complete-prefix
generation agree on every decision and final random state.

<!-- contract-section:formula -->
## Formula and symbols

An autoregressive language model assigns a sequence probability by multiplying
the probability of each observed token given only its earlier context:

$$
P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t}).
$$

Here $P_\theta$ is the distribution defined by learned parameters $\theta$;
$z_{1:T}$ is a sequence of $T$ tokens; $t$ is one position; $z_t$ is its
observed token; $z_{<t}$ is the earlier causal prefix; and
$\prod_{t=1}^{T}$ multiplies the conditional terms.

Training minimizes the negative logarithm of those next-token probabilities.
Validation chooses among trained states. Test loss checks the already frozen
choice; it does not feed another update or selection.

<!-- contract-section:history -->
## From count contexts to autoregressive Transformer LLMs

[Bengio and colleagues](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
describe successful n-gram models as generalizing through short overlapping
sequences, then learn distributed word representations jointly with a neural
probability function. Their experiments show an advantage from longer context.
That model predates the Transformer and does not specify this course pipeline.

[Vaswani and colleagues](https://arxiv.org/pdf/1706.03762) replace recurrence and
convolution with the Transformer. Their decoder masks self-attention so a
position cannot read later positions. The paper presents an encoder-decoder
translation system; it does not prescribe this course split, checkpoint, or
cache API.

[Brown and colleagues](https://arxiv.org/pdf/2005.14165) report GPT-3 as a
scaled autoregressive language model. That establishes the later LLM context,
not permission to transfer its scale or capability claims to a 1,188-parameter
teaching model.

The executable contrast is intentionally narrower. The frozen bigram reads one
previous token; the decoder can compute over four causal positions with learned
features and attention. Both score the same final targets, where this one
selected run reports a lower decoder loss. That observation verifies the
capstone fixture, not universal Transformer superiority.

<!-- contract-section:rust-behavior -->
## Rust behavior

CapstoneConfig freezes every bounded choice before test evaluation. run_capstone
parses and verifies the corpus split, learns BPE from training only, encodes
documents separately, fits the alpha-one bigram, and constructs deterministic
causal mini-batches. It trains the one-block decoder twice from the same seed and
requires identical steps, checkpoints, optimizer state, and parameter bits.

The primary validation-selected state enters FinalEvaluator only after both
replays complete. The evaluator consumes its local test permission once and
scores the selected decoder and frozen bigram on identical targets without a
graph or mutation.

Checkpoint save/load must preserve exact bytes, tokenizer ranks, model values,
optimizer step, and RNG state. Cached generation and the complete-prefix
reference then consume identical sampling draws and must agree on tokens,
intervals, stopping, and final RNG state. Invalid corpus input fails before
training or file creation.

<!-- contract-section:visualization -->
## Visualization

One semantic figure follows the exact Rust trace through data, tokenizer,
batches, decoder training, validation selection, the one-way test gate,
checkpoint reload, and cached generation. The test card appears after the
selected-state boundary rather than beside training.

Solid arrows mark ordinary transformations, a double boundary marks the
one-time final evaluation, and an equality cue joins saved and loaded state plus
cached and reference generation. The pipeline reflows into stacked stages at
narrow widths; no private script or chapter-specific expansion tree is needed.

<!-- contract-section:exercises -->
## Prediction checks

1. Which documents may contribute BPE pair counts?
2. How many model parameters are trained?
3. Can test loss change the selected step?
4. How many targets do the decoder and bigram each score?
5. Which loss is lower, and by how much?
6. What must remain exact across checkpoint reload?
7. Which three token IDs follow prompt A?
8. Why is the generated Cyrillic character not evidence of translation quality?
9. What does the second training replay prove?

Checks: training documents only; 1,188 parameters; no, selection finishes before
test access; 1,744 identical targets each; decoder 3.866087547 is lower than
bigram 3.981342714 by 0.115255167; tokenizer, model logits, optimizer step, and
RNG state; 260, 34, and 34; it is one deterministic sample from a tiny bilingual
corpus; and exact same-seed reproducibility.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The course now ends with one functioning decoder-only language-model program.
Text is partitioned before tokenizer learning; BPE tokens become causal batches;
the decoder trains with reverse-mode gradients and AdamW; validation selects;
test evidence is consumed once; versioned bytes restore the selected model; and
the model generates through one KV cache per block.

The handoff is now the learner’s: inspect a component, change one bounded choice,
rerun the exact evidence, and explain which data, mathematical, or inference
contract changed.

<!-- contract-section:localization -->
## Localization notes

English is the sole active locale. Preserve source titles, BPE and model
abbreviations, symbols, hashes, token IDs, exact losses, and trace grammar.
Cyrillic т is learner-visible exact output, not a translated label. Keep the
history on the road from n-gram language models through learned representations
and causal Transformers to scaled autoregressive LLMs. Name Rust only when
identifying the executable evidence.

<!-- contract-section:acceptance -->
## Acceptance examples

The frontmatter freezes corpus and split identities, training-only tokenizer
provenance, architecture and parameter count, batch shapes, same-seed replay,
validation selection, one-time test losses, checkpoint bytes, generated token
IDs, decoded text, and cached/reference equality. The declared Rust, content,
formula, SEO, static-link, Chromium, and Firefox gates must all pass before this
final chapter is published.
