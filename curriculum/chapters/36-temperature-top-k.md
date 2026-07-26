---
{
  "chapter_id": "36-temperature-top-k",
  "concept_id": "temperature-top-k",
  "content_revision": 1,
  "order": 36,
  "objective": {
    "en": "Sample one next token reproducibly after positive-temperature scaling and stable top-k filtering, then repeat that choice in an uncached autoregressive loop."
  },
  "worked_inputs": {
    "en": "Rank logits [0,1,1,2] by descending value and ascending token ID, compare temperatures 0.5, 1, and 2, keep two tokens across the tied boundary, and replay eight top-three draws from SplitMix64 seed 36 before loading the Chapter 35 checkpoint."
  },
  "formula": {
    "latex": "q_i^{(\\tau,k)}=\\frac{\\mathbf{1}[i\\in K_k]\\exp(\\ell_i/\\tau)}{\\sum_j\\mathbf{1}[j\\in K_k]\\exp(\\ell_j/\\tau)}",
    "symbols": [
      {
        "symbol": "q_i^{(\\tau,k)}",
        "en": "the final probability assigned to token i after temperature scaling, top-k filtering, and renormalization"
      },
      {
        "symbol": "\\tau",
        "en": "a finite positive temperature; smaller values sharpen differences and larger values flatten them"
      },
      {
        "symbol": "k",
        "en": "the exact number of ranked token IDs retained for stochastic sampling"
      },
      {
        "symbol": "V",
        "en": "the vocabulary size, which bounds the retained candidate count k"
      },
      {
        "symbol": "K_k",
        "en": "the retained set of k highest logits, with equal logits ordered by ascending token ID in this implementation"
      },
      {
        "symbol": "\\mathbf{1}[i\\in K_k]",
        "en": "the indicator that is one for a retained token and zero for a filtered token"
      },
      {
        "symbol": "\\ell_i",
        "en": "the decoder logit for candidate token i at the current final prefix position"
      },
      {
        "symbol": "i",
        "en": "the candidate token ID whose final probability is being computed"
      },
      {
        "symbol": "j",
        "en": "the denominator index ranging across the vocabulary, where filtered terms contribute zero"
      },
      {
        "symbol": "\\exp",
        "en": "the exponential used by softmax after subtracting the retained maximum for numerical stability"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": {
        "en": "Likelihood-maximizing beam decoding is useful when a source tightly constrains the target, but open-ended continuation admits many plausible futures; beam output can become generic or repetitive, while unrestricted sampling can admit an unreliable low-probability tail."
      },
      "later_advance": {
        "en": "Open-ended story systems combined softmax temperature with top-k sampling, GPT-2 used top-k for summaries and long continuations, and later GPT-2 analysis made the truncation and renormalization trade-off explicit while showing why one fixed $k$ cannot fit every context."
      },
      "modern_llm_role": {
        "en": "Controlled stochastic decoding turns an autoregressive LLM distribution into repeatable choices while exposing an adjustable diversity-versus-concentration boundary; later methods can replace the fixed candidate count without changing the decoder logits."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2018,
          "name": "Hierarchical Neural Story Generation",
          "source_url": "https://arxiv.org/pdf/1805.04833",
          "claim": {
            "en": "Fan, Lewis, and Dauphin sample at each step from the ten most likely words, tune a generation-time softmax temperature, and report that this task-bounded strategy works better for their open-ended stories than beam search, while unrestricted random sampling can introduce damaging unlikely words."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Language Models are Unsupervised Multitask Learners",
          "source_url": "https://cdn.openai.com/better-language-models/language-models.pdf",
          "claim": {
            "en": "The GPT-2 report uses top-k random sampling with $k=2$ for one summarization setup and $k=40$ for open WebText continuations, showing truncated stochastic decoding in large Transformer language-model practice without claiming one $k$ is universal."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "The Curious Case of Neural Text Degeneration",
          "source_url": "https://arxiv.org/pdf/1904.09751",
          "claim": {
            "en": "Holtzman and colleagues compare maximization and stochastic decoders on GPT-2, define top-k as sampling from the $k$ highest-probability tokens after renormalization, give the temperature-scaled softmax, and show why flat and peaked contexts make a fixed $k$ an imperfect compromise."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from choosing one high-likelihood continuation toward controlled stochastic decoding for open-ended language-model continuations, while keeping greedy selection as an explicit deterministic policy."
    },
    "summary": {
      "en": "The road to modern LLM generation distinguishes constrained search from open-ended continuation, truncates unreliable tails before sampling, and treats temperature and candidate-set policy as visible inference choices. Stable token-ID ties, seed replay, error precedence, and stop rules are course-specific reproducibility decisions."
    },
    "rust_contrast": "Compare one explicit greedy choice with positive-temperature top-k sampling over the same logits, then load the Chapter 35 checkpoint and audit every full-prefix call, saved RNG continuation, EOS stop, and context stop."
  },
  "rust": {
    "package": "ch36-temperature-top-k",
    "sources": [
      "rust/crates/llm-from-scratch/src/generation/sampling.rs",
      "rust/demos/ch36-temperature-top-k/src/lib.rs",
      "rust/demos/ch36-temperature-top-k/src/main.rs"
    ],
    "expected_output": "chapter=36-temperature-top-k\ninput=logits:[0.000000,1.000000,1.000000,2.000000] stable_rank:[3,1,2,0]\ntemperature=tau:0.500000 probabilities:[0.014209336619,0.104993585404,0.104993585404,0.775803492574] tau:1.000000 probabilities:[0.072329488129,0.196611933241,0.196611933241,0.534446645389] tau:2.000000 probabilities:[0.142536956597,0.235003712202,0.235003712202,0.387455619000]\ntop_k=k:2 survivors:[3,1] tied_boundary:keep:1 remove:2 sum:1.000000000000\nsample=seed:36 top_k:3 sequence:[3,2,2,2,3,3,3,3] draws:8 greedy_token:3 greedy_draw:none\ncheckpoint=loaded_bytes:6330 rng_state:0x9e3779b97f4a7c38 vocabulary:5 context:2 eos:none max_new_tokens:4 prompt:[0] generated:[4,4] prefixes:[1,2] stop:context-limit full_prefix_calls:2 replay_identical:true\neos=vocabulary:5 context:2 eos_token:4 max_new_tokens:4 generated:[4] stop:eos full_prefix_calls:1\nerrors=temperature_zero:true top_k_zero:true nonfinite_logit:true rng_unchanged:true\nhistory=beam_constrained:true open_ended_many_valid:true top_k_limits_tail:true fixed_k_context_insensitive:true\nnext=cache one attention layer while preserving its newest-position output\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "temperature-top-k",
    "rationale": {
      "en": "Aligned probability bars make temperature sharpening and flattening visible, while one tied-boundary table and seeded interval list show exactly which candidates survive, how they are renormalized, and where one random draw lands."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder can now load its selected checkpoint, turn each final-position logit row into a reproducible next token, stop at EOS or context capacity, and expose the uncached reference sequence that Chapter 37 will preserve incrementally."
  },
  "terminology": [
    {
      "concept_id": "temperature-top-k",
      "en": "temperature and top-k sampling"
    },
    {
      "concept_id": "greedy-decoding",
      "en": "greedy decoding"
    },
    {
      "concept_id": "temperature",
      "en": "sampling temperature"
    },
    {
      "concept_id": "top-k-set",
      "en": "stable top-k set"
    },
    {
      "concept_id": "categorical-sampling",
      "en": "seeded categorical sampling"
    },
    {
      "concept_id": "uncached-generation",
      "en": "uncached full-prefix generation"
    }
  ],
  "translation_notes": [
    "Russian is registered but inactive for Chapter 36, so no Russian lesson or placeholder route is published.",
    "Preserve tau, k, K_k, ell_i, q_i, token IDs, seeds, logits, probabilities, half-open intervals, and exact trace tokens.",
    "Greedy is a separate valid mode; tau equals zero is only a mathematical limit and is rejected as a stochastic setting.",
    "Top-k is a useful controlled decoder but not a universal quality guarantee, hallucination defense, or endpoint of decoding research.",
    "The history must remain about language-model decoding from constrained search to open-ended sampling, not programming languages."
  ],
  "acceptance_examples": [
    {
      "input": "Rank logits [0,1,1,2] with k equal to 2",
      "expected": "Token 3 ranks first; equal-logit tokens 1 and 2 are ordered by ID, so token 1 survives and token 2 receives exactly zero probability."
    },
    {
      "input": "Use temperature 1 and k equal to 2",
      "expected": "The retained token-ID probabilities are q_1 approximately 0.268941421370 and q_3 approximately 0.731058578630, and they sum to one within 1e-12."
    },
    {
      "input": "Replay eight draws from SplitMix64 seed 36 with temperature 1 and k equal to 3",
      "expected": "Both runs select [3,2,2,2,3,3,3,3] and finish with identical RNG state."
    },
    {
      "input": "Choose greedy and then stochastic k equal to 1 on the same logits",
      "expected": "Both choose token 3; greedy consumes no draw, while the stochastic policy consumes exactly one draw."
    },
    {
      "input": "Load the Chapter 35 checkpoint, resume its RNG, and generate from prompt [0] without EOS",
      "expected": "The decoder emits [4,4] from complete prefixes of lengths [1,2], performs two full-prefix calls, and stops before any third call would exceed context capacity."
    },
    {
      "input": "Repeat the loaded run with token 4 configured as EOS",
      "expected": "The generated sequence includes [4], reports an EOS stop, and performs exactly one full-prefix call."
    },
    {
      "input": "Pass temperature zero, k zero, or a nonfinite logit",
      "expected": "A typed error is returned before SplitMix64 state advances."
    },
    {
      "input": "cargo run --quiet --locked -p ch36-temperature-top-k",
      "expected": "stdout equals rust/demos/ch36-temperature-top-k/expected.txt byte for byte, including the final newline."
    }
  ]
}
---

# Chapter 36: Shape the choices, then draw once

<!-- contract-section:scope -->
## Scope

This chapter teaches one inference boundary: turn the decoder's final-position
logits into one reproducible token using explicit greedy selection or
positive-temperature top-k sampling. It covers stable ties, numerical
renormalization, one seeded categorical draw, EOS, token and context limits,
invalid settings, and an uncached full-prefix loop.

The implementation retains the entire prefix and recomputes it for every next
token. It does not slide a full context window, search multiple sequences, claim
that top-k guarantees quality, or cache attention keys and values. Chapter 37
makes one attention layer incremental; Chapter 38 owns model-wide cached
generation.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use token-ID-ordered logits $[0,1,1,2]$. Stable descending rank is
$[3,1,2,0]$: token $3$ has the largest logit, and equal-logit tokens $1$ and
$2$ keep ascending ID order. With $\tau=1$ and $k=2$, only IDs $3$ and $1$
survive. The renormalized probabilities are approximately
$q_1=0.268941421370$ and $q_3=0.731058578630$; IDs $0$ and $2$ receive exact
zero.

At $k=3$, seed $36$ produces the eight-token sequence
$[3,2,2,2,3,3,3,3]$. Every selection traverses positive-probability intervals
in ascending token-ID order. The same seed repeats the same draws, intervals,
tokens, and final RNG state.

The loaded Chapter 35 decoder has context capacity $2$. Prompt $[0]$ therefore
supports full-prefix calls at lengths $1$ and $2$, producing $[4,4]$, after
which another call would exceed capacity. Configuring token $4$ as EOS stops
after the first emitted token.

<!-- contract-section:formula -->
## Formula and symbols

For finite logits and positive temperature, filter and renormalize with

$$
q_i^{(\tau,k)}=\frac{\mathbf{1}[i\in K_k]\exp(\ell_i/\tau)}{\sum_j\mathbf{1}[j\in K_k]\exp(\ell_j/\tau)}.
$$

$\ell_i$ is token $i$'s final-position logit. $K_k$ contains exactly the $k$
highest ranked IDs, where $V$ is the vocabulary size and $1\le k\le V$. The
indicator $\mathbf{1}[i\in K_k]$ makes a retained term
$1$ and a filtered term $0$. The denominator sums over vocabulary index $j$ and
renormalizes the survivors, so $\sum_i q_i^{(\tau,k)}=1$.

$\tau>0$ controls shape without changing rank. As $\tau\to0^+$, a unique
maximum concentrates toward one greedy choice; increasing $\tau$ flattens the
retained probabilities. The API does not divide by literal zero: greedy is a
separate mode. With $k=1$, stochastic top-k selects the greedy token but still
consumes one categorical draw by contract.

<!-- contract-section:history -->
## Before controlled open-ended LLM sampling

[Fan, Lewis, and Dauphin](https://arxiv.org/pdf/1805.04833) make the open-ended
distinction concrete: their story system samples from the ten most likely next
words, tunes a softmax temperature, and reports that beam search is too common
and repetitive for that task while unrestricted sampling can admit damaging
unlikely words.

The [GPT-2 report](https://cdn.openai.com/better-language-models/language-models.pdf)
then documents top-k random sampling with $k=2$ for one summarization setup and
$k=40$ for long open continuations. Those choices show top-k in large
Transformer language-model practice; they do not establish $40$ as optimal or
specify this course's seed and tie rules.

[Holtzman and colleagues](https://arxiv.org/pdf/1904.09751) analyze GPT-2
decoding directly. They contrast repetitive maximization, incoherent unrestricted
tail sampling, temperature shaping, and truncated sampling; define top-k as
sampling from the $k$ highest-probability tokens after renormalization; and show
why one fixed $k$ is context-insensitive when distributions vary from flat to
peaked. Their nucleus method is a later response to that limitation. This
chapter keeps top-k because it is the smallest controlled stochastic decoder
that exposes every decision clearly, not because it ends the history.

<!-- contract-section:rust-behavior -->
## Rust behavior

`SamplingMode::Greedy` validates finite nonempty logits, chooses the lowest ID
among maxima, and leaves RNG state untouched. `TemperatureTopK` additionally
requires finite $\tau>0$ and $1\le k\le V$, keeps exactly $k$ stable ranks,
uses max-shifted exponentials, stores exact zero for removed IDs, and consumes
one SplitMix64 draw only after validation succeeds.

`generate_uncached` validates prompt and EOS IDs, runs the complete decoder
prefix under the no-gradient boundary, extracts the last vocabulary row, and
records each selection. The result includes emitted IDs, per-step prefix lengths,
the stop reason, and full-prefix call count. EOS remains in the emitted sequence.

The demo loads bytes produced by the Chapter 35 checkpoint fixture and restores
its saved RNG state. Its standard output and separate diagram trace are exact,
deterministic Rust evidence.

<!-- contract-section:visualization -->
## Visualization

One locale-neutral figure consumes the exact Rust trace. Three aligned bar groups
show the same four logits at $\tau=0.5$, $\tau=1$, and $\tau=2$. A semantic
top-k table shows stable rank, retained versus removed status, and renormalized
probability. The figure labels the change from that $k=2$ boundary to the
$\tau=1$, $k=3$, seed-$36$ draw policy before showing its half-open intervals.
It then labels the fixture change from synthetic $V=4$ logits to the loaded
$V=5$ decoder and displays the context-stop run's absent EOS policy beside the
EOS-token-$4$ run. Text, double versus dashed borders, and kept/removed words
repeat every distinction so color is never the only cue.

The reading order is temperature comparison, tied boundary, seeded draw, then
loaded generation proof. The smallest wide table is the only named keyboard
region on a narrow screen.

<!-- contract-section:exercises -->
## Prediction checks

1. Which ID wins greedy when IDs $1$ and $2$ have equal logits but ID $3$ has
   logit $2$?
2. Which equal-logit ID survives the $k=2$ boundary?
3. Does raising $\tau$ change stable rank?
4. Why is literal $\tau=0$ rejected even though the zero-temperature limit is
   useful?
5. Does stochastic $k=1$ consume a draw?
6. Which interval contains unit draw $0.338833394523$ for the $k=3$ fixture?
7. Is EOS included in emitted token IDs?
8. Why may a capacity-two prefix still emit one token before a context stop?

Checks: greedy selects $3$; the lower tied ID $1$ survives; temperature changes
probability ratios but not rank; division by zero is undefined, so greedy owns
that deterministic policy; stochastic $k=1$ consumes one draw; the stated draw
falls in token $2$'s half-open interval; EOS is included; and a valid capacity-two
prefix predicts one next token even though the resulting sequence cannot be fed
back for another uncached call.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The selected checkpoint now produces reproducible next-token choices and one
auditable uncached reference sequence. Chapter 37 will append one position's key
and value vectors inside one attention layer and prove that its newest-position
result matches this full-prefix computation.

<!-- contract-section:localization -->
## Localization notes

English is the sole active locale. Keep mathematical symbols and exact trace
values language-neutral. Distinguish greedy selection, the limit
$\tau\to0^+$, and the invalid setting $\tau=0$. Translate top-k as a candidate
set of fixed cardinality, not a probability threshold. A later Russian
activation must receive native technical review before a route is published.

<!-- contract-section:acceptance -->
## Acceptance examples

The acceptance examples in frontmatter freeze the tied boundary, normalized
probabilities, seed-$36$ sequence, greedy and stochastic draw behavior, loaded
checkpoint sequence, EOS and context stops, and transactional errors. The
declared Rust, content, static-build, link, Chromium, and Firefox commands must
all pass before publication.
