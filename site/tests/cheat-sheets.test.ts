// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync, readdirSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runtime.
import { createHash } from "node:crypto";
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CHEAT_SHEET_PAGE_SIZE,
  getCheatSheetCopy,
  indexCheatSheets,
  paginateCheatSheetTerms,
  sortCheatSheetTerms,
  type CheatSheetData,
} from "../src/lib/cheat-sheets";

declare const process: { cwd(): string };

const root = process.cwd();
const contentRoot = resolve(root, "src/content/cheat-sheets");
const RUSSIAN_ROLLOUT_THROUGH_CHAPTER = 39;

const expectedSheets = {
  "01-text-units": {
    file: "01-text-units.json",
    lesson: "01-text-units.mdx",
    title: "Text units and vocabulary IDs",
    entries: [
      ["UTF-8 byte", "scalar occupies two UTF-8 bytes here"],
      ["Unicode scalar value", "Unicode scalar values"],
      [
        "Vocabulary",
        "The concrete `Vocabulary` type is a deliberately small Chapter 1 comparison",
      ],
      ["Token ID", "the token ID at sequence position"],
      ["Unknown token", "this tokenizer does not reuse Chapter 1's rule"],
      ["Reversible round trip", "round trip is reversible for known units"],
      ["Grapheme cluster", "user-perceived grapheme clusters"],
      ["Subword tokenizer", "appends learned merge tokens"],
    ],
  },
  "02-corpus-partitions": {
    file: "02-corpus-partitions.json",
    lesson: "02-corpus-partitions.mdx",
    title: "Corpus documents and frozen partitions",
    entries: [
      ["Corpus", "six-document corpus"],
      ["Whole document", "original whole document first"],
      ["Training partition", "Only the training set may"],
      ["Validation partition", "Validation may later guide choices"],
      ["Test partition", "Test neither fits nor selects"],
      ["Disjoint split", "three roles cover the entire corpus"],
      ["Holdout", "fixed holdouts developed"],
      ["Data leakage", "particular leakage path"],
      ["Provenance group", "provenance group remains within one role"],
    ],
  },
  "03-learn-bpe-merges": {
    file: "03-learn-bpe-merges.json",
    lesson: "03-learn-bpe-merges.mdx",
    title: "Learning deterministic BPE merges",
    entries: [
      ["Byte Pair Encoding (BPE)", "family of repeated-pair procedures"],
      ["Adjacent-pair candidate", "an ordered adjacent pair"],
      ["Candidate count", "two candidate positions"],
      ["Merge round", "For each round"],
      ["Merge rank", "Rank 0 therefore selects"],
      ["Deterministic tie-break", "smaller left and then smaller right"],
      ["Non-overlapping replacement", "without overlap"],
      ["Byte expansion", "byte expansions"],
      ["Document boundary", "across the boundary"],
    ],
  },
  "04-apply-bpe-tokenizer": {
    file: "04-apply-bpe-tokenizer.json",
    lesson: "04-apply-bpe-tokenizer.mdx",
    title: "Applying and reversing a BPE tokenizer",
    entries: [
      ["Byte-level BPE tokenizer", "base alphabet of only 256 symbols"],
      ["Frozen merge rank", "Rank is priority"],
      ["Canonical encoding", "canonical encoding"],
      ["Content token", "content token ID"],
      ["Control token", "Document controls are a structural layer"],
      ["BOS and EOS", "BOS and EOS appear only after encoding"],
      ["Content offset", "shifted by two"],
      ["Byte fallback", "One-byte fallback"],
      ["Byte-exact decoding", "Guarantee exact bytes in one direction"],
      ["Strict UTF-8 view", "separate strict view"],
    ],
  },
  "05-autoregressive-examples": {
    file: "05-autoregressive-examples.json",
    lesson: "05-autoregressive-examples.mdx",
    title: "Building autoregressive input–target pairs",
    entries: [
      [
        "Autoregressive language model",
        "An autoregressive language model predicts each token",
      ],
      ["Input–target pair", "input–target pairs that provide the correct"],
      ["One-token shift", "Express the one-token shift with slices"],
      ["Context length", "Choose context length"],
      ["Stride", "The stride selects candidate starts"],
      ["Overlapping pairs", "across overlapping pairs"],
      ["BOS and EOS boundary tokens", "BOS and EOS boundary tokens"],
      ["Causal computation", "causal computation may use only"],
      ["Causal mask", "needs an explicit causal mask"],
    ],
  },
  "06-bigram-baseline": {
    file: "06-bigram-baseline.json",
    lesson: "06-bigram-baseline.mdx",
    title: "From transition counts to a bigram model",
    entries: [
      ["Bigram model", "This is a **bigram** model"],
      ["Transition count", "number of observed transitions"],
      ["Context", "one current token"],
      ["Probability row", "probability distribution"],
      [
        "Maximum-likelihood estimate (MLE)",
        "maximum-likelihood estimate (MLE)",
      ],
      ["Unobserved successor", "unobserved successor after `A`"],
      ["Unseen context", "unseenContext"],
      ["Add-one smoothing", "Add-one smoothing"],
      ["Pseudocount", "positive pseudocount added"],
    ],
  },
  "07-language-model-metrics": {
    file: "07-language-model-metrics.json",
    lesson: "07-language-model-metrics.mdx",
    title: "From assigned probability to perplexity",
    entries: [
      ["Assigned probability", "Assigned probability"],
      ["Surprise", "define its **surprise**"],
      ["Sequence likelihood", "sequence likelihood"],
      ["Negative log-likelihood (NLL)", "negative log-likelihood"],
      ["Mean NLL", "mean negative log-likelihood (mean NLL)"],
      ["Length normalization", "length normalization missing"],
      ["Nat", "nats per target"],
      ["Perplexity", "Perplexity is"],
      ["Empirical cross-entropy", "empirical cross-entropy"],
      ["Argmax", "argmax alone"],
    ],
  },
  "08-tensor-storage": {
    file: "08-tensor-storage.json",
    lesson: "08-tensor-storage.mdx",
    title: "From tensor coordinates to one flat buffer",
    entries: [
      ["Tensor", "A tensor gives"],
      ["Shape", "For shape [2,2,3]"],
      ["Axis", "It has three axes"],
      ["Rank", "its **rank** is"],
      ["Extent", "Axis `1` has extent"],
      ["Coordinate", "coordinate `[1,0,2]`"],
      ["Row-major order", "In row-major order"],
      ["Element stride", "element stride"],
      ["Offset", "Offset `8` is"],
      ["Contiguous storage", "contiguous row-major buffer"],
    ],
  },
  "09-tensor-views": {
    file: "09-tensor-views.json",
    lesson: "09-tensor-views.mdx",
    title: "Shared views and explicit tensor copies",
    entries: [
      ["Tensor view", "shared tensor views"],
      ["Reshape", "First, reshape the view"],
      ["Transpose", "transpose axes `0` and `1`"],
      ["Axis permutation", "axis permutation"],
      ["Slice", "The frozen inner-axis slice"],
      ["Base offset", "base offset"],
      ["Row-major contiguity", "row-major contiguous"],
      ["Materialization", "Materialization is the operation"],
      ["Query, key, and value (Q/K/V)", "query, key, and value matrices"],
      ["Attention head", "parallel heads"],
    ],
  },
  "10-broadcasting-reductions": {
    file: "10-broadcasting-reductions.json",
    lesson: "10-broadcasting-reductions.mdx",
    title: "Align compatible shapes, reduce a named axis",
    entries: [
      ["Broadcasting", "Broadcasting and mean reduction"],
      ["Trailing-axis alignment", "trailing-axis alignment"],
      ["Singleton axis", "singleton and missing leading dimensions"],
      ["Elementwise operation", "elementwise operations"],
      ["Reduction", "A reduction is also not"],
      ["Reduction axis", "explicit zero-based reduction axis"],
      ["Keep dimension", "Keep dimension"],
      ["Feature axis", "final feature axis"],
      ["Attention softmax", "attention softmax"],
      ["Feature normalization", "feature normalization"],
    ],
  },
  "11-matrix-multiplication": {
    file: "11-matrix-multiplication.json",
    lesson: "11-matrix-multiplication.mdx",
    title: "Multiply rows by columns, then reuse batches",
    entries: [
      ["Matrix multiplication", "Checked matrix multiplication"],
      ["Activation matrix", "The activation matrix"],
      ["Projection weight", "projection weight"],
      ["Output cell", "One output cell"],
      ["Inner dimension", "inner dimension"],
      ["Contraction", "row-column contraction"],
      ["Batched matrix multiplication", "batched matrix multiplication"],
      ["Batch broadcasting", "batch broadcasting"],
      ["Logical transpose", "A transpose flag logically swaps only an operand"],
      ["Attention score", "attention scores"],
    ],
  },
  "12-stable-softmax": {
    file: "12-stable-softmax.json",
    lesson: "12-stable-softmax.mdx",
    title: "Turn extreme logits into stable probabilities",
    entries: [
      [
        "Logit",
        "These values are logits: scores before normalization, not probabilities.",
      ],
      ["Softmax", "The chapter's stable softmax formula is:"],
      ["Maximum shift", "The maximum shift removes a"],
      [
        "Normalization group",
        "An axis divides a tensor into independent normalization groups.",
      ],
      ["Class axis", "class axis gives group shape"],
      ["Log-sum-exp", "Log-sum-exp adds the maximum back"],
      ["Log-softmax", "Log-softmax keeps the safer shifted difference"],
      ["Indexed NLL", "Indexed NLL selects one target"],
      [
        "Overflow",
        "directly exponentiating unshifted large logits can overflow",
      ],
      ["Underflow", "negative extremes become zero divided by zero"],
    ],
  },
  "13-gradient-checking": {
    file: "13-gradient-checking.json",
    lesson: "13-gradient-checking.mdx",
    title: "Check gradients before trusting backpropagation",
    entries: [
      ["Gradient check", "Start with a small scalar gradient check:"],
      [
        "Central difference",
        "The unequal-spacing three-point formula combines the two one-sided slopes:",
      ],
      ["Numerical derivative", "predicts the numerical derivative"],
      ["Analytic gradient", "the analytic derivative is"],
      ["Requested step", "The requested step asks for"],
      ["Actual probe spacing", "requested and actual probe spacing"],
      ["Local smoothness", "Local smoothness is a caller precondition"],
      ["Truncation error", "truncation error of order"],
      ["Rounding error", "between truncation and rounding error"],
      [
        "Scale-aware error",
        "passes exactly when scaled error is no greater than",
      ],
      ["Tolerance", "declared finite nonnegative tolerance"],
      [
        "Deterministic coordinate sampling",
        "No random generator or hidden state is involved.",
      ],
    ],
  },
  "14-scalar-autodiff": {
    file: "14-scalar-autodiff.json",
    lesson: "14-scalar-autodiff.mdx",
    title: "Accumulate gradients through a scalar graph",
    entries: [
      [
        "Computation graph",
        "One tracked scalar node in the dependency subgraph traversed backward from",
      ],
      [
        "Reverse mode",
        "Baydin et al. describe reverse mode as recording dependencies",
      ],
      ["Adjoint", "pass-local adjoint"],
      ["Operand-use edge", "operand-use edges"],
      ["Local derivative", "local derivative"],
      ["Reverse topological order", "topological list is traversed in reverse"],
      ["Gradient accumulation", "Accumulation across separate backward calls"],
      ["Backward pass", "Every backward call computes a fresh pass"],
      ["Detach", "detached branch has no edge to the original"],
      ["Zeroing gradients", "clears every reachable tracked node"],
    ],
  },
  "15-tensor-autodiff-core": {
    file: "15-tensor-autodiff-core.json",
    lesson: "15-tensor-autodiff-core.mdx",
    title: "Reverse tensor operations with edge-local VJPs",
    entries: [
      ["Tensor autodiff tape", "reusable eight-node tensor tape"],
      [
        "Vector-Jacobian product (VJP)",
        "Apply one edge-local VJP instead of building a Jacobian",
      ],
      ["Jacobian", "The conceptual Jacobian"],
      ["Operand-use edge", "operand-use edge"],
      ["Upstream adjoint", "fresh upstream adjoint"],
      ["Parent adjoint", "fresh parent-adjoint accumulator"],
      ["Broadcast reversal", "Explicit broadcast sums missing"],
      [
        "Reduction VJP",
        "reductions save their axis, retained-dimension choice, and input extent",
      ],
      ["Non-scalar seed", "non-scalar seed"],
      [
        "Graph retention",
        "retained second pass recomputes fresh pass-local adjoints and contributions",
      ],
    ],
  },
  "16-model-autodiff-ops": {
    file: "16-model-autodiff-ops.json",
    lesson: "16-model-autodiff-ops.mdx",
    title: "Reverse the operations that turn token IDs into loss",
    entries: [
      ["Embedding table", "three-row embedding table"],
      ["Row gather", "Row gather materializes"],
      ["Token ID", "four token IDs"],
      ["Repeated selector", "Repeated selectors therefore accumulate"],
      ["Scatter-add", "embedding scatter-add"],
      ["Matrix VJP", "Matrix VJPs transpose"],
      ["SiLU", "SiLU's derivative at zero"],
      ["Log-softmax", "log-softmax produces"],
      ["Indexed mean NLL", "combined indexed mean NLL"],
      ["Loss-logit gradient", "target-logit gradient"],
    ],
  },
  "17-parameter-initialization": {
    file: "17-parameter-initialization.json",
    lesson: "17-parameter-initialization.mdx",
    title: "Initialize trainable weights reproducibly",
    entries: [
      ["Parameter initialization", "Initialize a projection of shape"],
      ["Hidden-unit symmetry", "preserves the hidden units' equality"],
      ["Fan-in", "fan-in"],
      ["Fan-out", "fan-out"],
      ["Xavier-style initialization", "Xavier-style rule"],
      ["Target variance", "target variance"],
      ["Uniform bound", "uniform bound"],
      ["Seed", "The seed is the raw state"],
      [
        "Reproducibility",
        "The same seed, shape, fan values, and construction order",
      ],
      ["Pseudorandom generator", "deterministic pseudorandom"],
    ],
  },
  "18-token-embeddings": {
    file: "18-token-embeddings.json",
    lesson: "18-token-embeddings.mdx",
    title: "Give token IDs trainable vectors",
    entries: [
      ["Token embedding", "Transformers keep learned token embeddings"],
      ["Embedding table", "trainable token table"],
      ["Vocabulary size", "vocabulary size"],
      ["Embedding width", "embedding width"],
      ["Token ID", "integer token ID"],
      ["Direct row lookup", "direct row lookup"],
      ["One-hot vector", "One-hot vectors make token identity explicit"],
      [
        "Gather operation",
        "The forward half copies one selected row into each output position",
      ],
      ["Repeated-token gradient", "repeated-token gradients add"],
      ["Scatter-add", "reverse scatter-add"],
    ],
  },
  "19-linear-layers": {
    file: "19-linear-layers.json",
    lesson: "19-linear-layers.mdx",
    title: "Mix each token's features with one learned projection",
    entries: [
      ["Linear layer", "linear layer"],
      ["Learned projection", "learned projection"],
      ["Input feature width", "input feature width"],
      ["Output feature width", "output feature width"],
      ["Leading axes", "leading axes"],
      ["Weight matrix", "trainable matrix"],
      ["Bias", "optional named bias"],
      ["Affine map", "affine rather than strictly linear"],
      ["Parameter sharing", "Because every position shares"],
      ["Bias-free projection", "bias-free policy"],
    ],
  },
  "20-swiglu-feed-forward": {
    file: "20-swiglu-feed-forward.json",
    lesson: "20-swiglu-feed-forward.mdx",
    title: "Let one learned branch gate another",
    entries: [
      ["SwiGLU", "bias-free SwiGLU sublayer"],
      [
        "Position-wise feed-forward network",
        "feed-forward network separately at every sequence position",
      ],
      ["Gate projection", "owns gate, up, and down"],
      ["Up projection", "second projection before the output projection"],
      ["Down projection", "down projection"],
      ["SiLU", "SiLU uses a sigmoid internally"],
      ["Sigmoid", "sigmoid internally"],
      [
        "Elementwise product",
        "two projected branches meet through elementwise multiplication",
      ],
      ["Feed-forward width", "input, branch, and output feature widths"],
      ["Position independence", "SwiGLU transforms positions independently"],
    ],
  },
  "21-mini-batches": {
    file: "21-mini-batches.json",
    lesson: "21-mini-batches.mdx",
    title: "Count real tokens in every mini-batch",
    entries: [
      ["Causal window", "separate causal windows"],
      ["Mini-batch", "mini-batches of fixed-length rows"],
      ["Requested batch capacity", "With requested capacity"],
      ["Smaller final batch", "The final batch stays smaller"],
      ["Target occurrence", "target occurrences"],
      ["Actual target-token denominator", "actual target-token denominator"],
      ["Token-mean gradient", "token-mean loss plus gradient coordinates"],
      ["Raw accumulator", "raw accumulators"],
      ["Token-weighted mean", "token-weighted mean"],
      ["No-padding batch", "no padding"],
    ],
  },
  "22-adamw": {
    file: "22-adamw.json",
    lesson: "22-adamw.mdx",
    title: "Keep decay out of the gradient moments",
    entries: [
      ["AdamW", "AdamW instead moves the shrinkage term outside"],
      ["First gradient moment", "first raw gradient moment"],
      [
        "Second gradient moment",
        "second raw moment tracks recent squared magnitude",
      ],
      ["Bias correction", "corrects their early zero-initialization bias"],
      ["Adaptive update", "adaptive delta"],
      [
        "Decoupled weight decay",
        "moves parameter-proportional decay outside the gradient",
      ],
      ["Learning rate", "is the learning rate"],
      ["Numerical stabilizer", "stabilizes the adaptive denominator"],
      ["Decay group", "decay-group parameter"],
      ["No-decay group", "no-decay parameter"],
    ],
  },
  "23-neural-ngram": {
    file: "23-neural-ngram.json",
    lesson: "23-neural-ngram.mdx",
    title: "Train a fixed-context neural language model",
    entries: [
      ["Neural n-gram", "The neural n-gram is"],
      ["Fixed context", "a concatenated fixed context"],
      ["Token embedding", "maps a token ID to"],
      [
        "Context concatenation",
        "concatenate those rows in chronological order",
      ],
      ["SwiGLU hidden layer", "SwiGLU receives"],
      [
        "Vocabulary projection",
        "a vocabulary projection for next-token prediction",
      ],
      ["Next-token logit", "next-token logits"],
      ["Indexed mean loss", "The indexed mean loss is"],
      ["Held-out validation loss", "held-out validation loss falls"],
      ["Greedy generation", "greedy generation"],
    ],
  },
  "24-residual-connections": {
    file: "24-residual-connections.json",
    lesson: "24-residual-connections.mdx",
    title: "Keep an identity path around each learned update",
    entries: [
      ["Residual connection", "The entire residual connection is"],
      ["Identity path", "identity path"],
      ["Residual branch", "learned branch mapping"],
      ["Residual stream", "residual stream"],
      ["Learned update", "learned update"],
      ["Exact-shape merge", "exact-shape merge"],
      ["Vector-Jacobian product", "vector-Jacobian product"],
      ["Upstream adjoint", "upstream output adjoint"],
      ["Gradient accumulation", "gradient contributions accumulate"],
      ["Branch Jacobian", "branch Jacobian"],
    ],
  },
  "25-rmsnorm": {
    file: "25-rmsnorm.json",
    lesson: "25-rmsnorm.mdx",
    title: "Normalize feature scale without centering",
    entries: [
      ["RMSNorm", "For one final-axis vector, RMSNorm is"],
      ["Mean square", "compute the mean square"],
      ["Reciprocal RMS", "The reciprocal RMS"],
      ["Root-mean-square scale", "root-mean-square scale"],
      ["Learned gain", "The learned gain"],
      ["Epsilon stabilizer", "stabilizes the reciprocal square root"],
      ["Final feature axis", "final feature axis"],
      ["Approximate scale invariance", "scale-invariant away from zero"],
      ["Pre-normalization", "A pre-normalized decoder"],
      ["LayerNorm", "LayerNorm centers the anchor"],
    ],
  },
  "26-qkv-projections": {
    file: "26-qkv-projections.json",
    lesson: "26-qkv-projections.mdx",
    title: "Create query, key, and value views",
    entries: [
      [
        "Query, key, and value projections",
        "query, key, and value projections",
      ],
      ["Hidden-state tensor", "hidden-state tensor entering self-attention"],
      ["Model width", "is the input feature width"],
      ["Head width", "is the output width for this one-head chapter"],
      ["Query view", "is the query view"],
      ["Key view", "is the key view"],
      ["Value view", "is the value view"],
      ["Self-attention", "define self-attention over one sequence"],
      ["Bias-free projection", "three independent bias-free projections"],
      ["Independent projection weights", "are independent learned weights"],
    ],
  },
  "27-self-attention": {
    file: "27-self-attention.json",
    lesson: "27-self-attention.mdx",
    title: "Compute one unmasked self-attention head",
    entries: [
      ["Scaled dot-product self-attention", "scaled dot-product attention"],
      ["Unmasked attention", "unmasked scaled dot-product attention head"],
      ["Query", "one query row per token position"],
      ["Key", "candidate key rows"],
      ["Value", "value rows whose content is mixed"],
      ["Attention score", "score row"],
      ["Query/key width", "shared query/key width"],
      ["Square-root scaling", "square-root scaling"],
      [
        "Row-wise softmax",
        "Softmax runs across key positions independently for each query",
      ],
      ["Attention weight", "a retrieval weight"],
      ["Weighted value mixture", "weighted value mixture"],
    ],
  },
  "28-causal-masking": {
    file: "28-causal-masking.json",
    lesson: "28-causal-masking.mdx",
    title: "Block future keys with a causal mask",
    entries: [
      ["Causal mask", "each query attends only to its available prefix"],
      ["Inclusive diagonal", "The diagonal is deliberately allowed"],
      ["Additive mask", "use the additive mask"],
      ["Query row", "For query row"],
      ["Key column", "key column"],
      ["Allowed prefix", "Each allowed prefix keeps the full"],
      ["Blocked future key", "after the future keys are excluded"],
      ["Causal softmax", "causal_softmax"],
      [
        "Shifted decoder input",
        "Decoder inputs are shifted by one target position",
      ],
      ["Prefix invariance", "prefix-invariance result"],
      ["Position signal", "absolute or relative position signal"],
    ],
  },
  "29-rope": {
    file: "29-rope.json",
    lesson: "29-rope.mdx",
    title: "Turn query and key pairs with RoPE",
    entries: [
      ["Rotary position embedding (RoPE)", "geometry to query-key scores"],
      ["Adjacent coordinate pair", "pairs coordinates"],
      ["Rotation matrix", "rotation matrix"],
      ["Pair frequency", "one adjacent coordinate pair and its frequency"],
      ["Frequency base", "positive finite base"],
      ["Absolute position", "rotations receive absolute positions"],
      [
        "Signed relative position",
        "signed position of the key relative to the query",
      ],
      ["Equal-shift invariance", "adding the same offset to both positions"],
      ["Orthogonal rotation", "preserves squared norm and therefore norm"],
      ["Query-key rotation", "values $V$ are not rotated here"],
      ["Causal mask", "mask still blocks future keys"],
    ],
  },
  "30-multi-head-attention": {
    file: "30-multi-head-attention.json",
    lesson: "30-multi-head-attention.mdx",
    title: "Keep attention head-local until output mixing",
    entries: [
      [
        "Multi-head causal self-attention",
        "complete multi-head causal self-attention layer",
      ],
      [
        "Packed Q/K/V projections",
        "first lets every $W_i^Q$, $W_i^K$, and $W_i^V$ read the whole input row",
      ],
      ["Model width", "input and output width of the complete layer"],
      ["Head count", "number of independently normalized attention heads"],
      ["Head width", "is the width of one head; it is even here"],
      ["Head split", "transpose then produce"],
      ["Per-head RoPE", "apply RoPE only to its query and key rows"],
      [
        "Per-head causal attention",
        "softmax runs separately over each head's key",
      ],
      ["Head output", "is head $i$'s weighted value mixture"],
      ["Head concatenation", "it does not normalize or mix them"],
      ["Output projection", "only multiplication by $W_O$ permits"],
    ],
  },
  "31-decoder-block": {
    file: "31-decoder-block.json",
    lesson: "31-decoder-block.mdx",
    title: "Compose a pre-norm decoder block in exact order",
    entries: [
      ["Pre-normalized decoder block", "pre-normalized decoder block"],
      ["Residual stream", "model-width residual stream entering the block"],
      ["Attention RMSNorm", "Attention RMSNorm input"],
      ["Causal multi-head attention", "causal multi-head attention"],
      ["First residual merge", "first residual merge"],
      ["Feed-forward RMSNorm", "feed-forward RMSNorm"],
      ["SwiGLU feed-forward branch", "SwiGLU feed-forward branch"],
      ["Second residual merge", "second residual merge"],
      ["Identity path", "identity path"],
      ["Post-norm order", "post-norm order"],
    ],
  },
  "32-decoder-model": {
    file: "32-decoder-model.json",
    lesson: "32-decoder-model.mdx",
    title: "Trace one tied table through a decoder stack",
    entries: [
      ["Decoder stack", "one decoder stack"],
      ["Decoder depth", "decoder depth"],
      ["Distinct decoder blocks", "Two distinct decoder blocks"],
      ["Embedding lookup", "Embedding lookup"],
      ["Final RMSNorm", "Final RMSNorm"],
      ["Weight tying", "Weight tying is stronger than equal initialization"],
      ["Tied projection", "Tied projection"],
      ["Vocabulary logits", "vocabulary logits"],
      [
        "Mean indexed negative log likelihood",
        "mean indexed negative log likelihood",
      ],
      ["Prefix invariance", "prefix invariance"],
      [
        "Tied gradient accumulation",
        "adds both contributions on the same leaf",
      ],
    ],
  },
  "33-training-selection": {
    file: "33-training-selection.json",
    lesson: "33-training-selection.mdx",
    title: "Select a decoder with validation checkpoints",
    entries: [
      ["Training mini-batch", "next-token loss for training mini-batch"],
      [
        "Partition roles",
        "only `Validation` may select a state, while `Test` is rejected here",
      ],
      [
        "Learning-rate schedule",
        "All eight steps execute. Validation does not stop the run early.",
      ],
      [
        "Raw gradient",
        "every finite named-parameter gradient coordinate before clipping",
      ],
      ["Global-norm clipping", "applies it to every coordinate"],
      [
        "Clipped gradient",
        "globally clipped gradient AdamW uses to update both moments",
      ],
      ["AdamW update", "parameter and moment states advance together"],
      [
        "Optimizer moment state",
        "continues the existing moments and step counter",
      ],
      [
        "Graph-free validation loss",
        "never differentiated and never updates the",
      ],
      ["Checkpoint set", "set of measured checkpoint indices"],
      ["Earliest validation minimum", "earliest measured validation minimum"],
      [
        "Token-weighted mean",
        "Validation averages by predicted-token count, not by number of batches",
      ],
    ],
  },
  "34-final-evaluation": {
    file: "34-final-evaluation.json",
    lesson: "34-final-evaluation.mdx",
    title: "Separate local test isolation from fixture evidence",
    entries: [
      [
        "Validation-selected checkpoint",
        "validation-selected checkpoint index",
      ],
      ["Frozen selected state", "frozen validation-selected decoder"],
      ["Single-use test evaluation boundary", "test-only gate"],
      ["Final test evaluation", "before test evaluation"],
      [
        "Fixed-fixture regression evidence",
        "fixed-fixture regression evidence",
      ],
      [
        "Token-weighted mean NLL",
        "token-weighted mean negative log-likelihood",
      ],
      ["Perplexity", "test perplexity"],
      ["Aligned target slot", "aligned target slots"],
      [
        "Evaluation provenance assertions",
        "caller-supplied provenance assertions",
      ],
      ["No-grad evaluation", "That call records no graph"],
      ["Frozen final evaluation report", "immutable report"],
      ["Frozen bigram", "Frozen bigram"],
      ["Like-for-like targets", "same inspected input/target order"],
    ],
  },
  "35-checkpoints": {
    file: "35-checkpoints.json",
    lesson: "35-checkpoints.mdx",
    title: "Save decoder state, replay one specified update",
    entries: [
      ["Versioned decoder checkpoint", "versioned decoder checkpoint"],
      [
        "Checkpoint schema",
        "application schema that names both stored component state",
      ],
      [
        "Trainer-issued selected state",
        "trainer-issued selected training state",
      ],
      ["AdamW optimizer state", "22 AdamW moment tensors"],
      ["Sampling RNG state", "SplitMix64 sampling state"],
      ["Checkpoint payload record", "ordered payload records"],
      [
        "Checkpoint record descriptor",
        "A descriptor stores role, name, dtype, shape, absolute offset, and byte length",
      ],
      ["Checkpoint payload offset", "absolute start offset of record"],
      [
        "Canonical checkpoint encoding",
        "Encoding the same state twice produces",
      ],
      [
        "Checkpoint integrity checksum (FNV-1a)",
        "FNV-1a detects accidental corruption; it does not authenticate",
      ],
      ["Exact round trip", "exact reload"],
      [
        "Matched caller-supplied update",
        "one caller-supplied component update",
      ],
      [
        "Atomic checkpoint replacement",
        "atomic replacement under the supported",
      ],
    ],
  },
  "36-temperature-top-k": {
    file: "36-temperature-top-k.json",
    lesson: "36-temperature-top-k.mdx",
    title: "Shape a stable top-k distribution, then draw once",
    entries: [
      ["Temperature", "finite positive temperature"],
      ["Stable ranking", "stable descending-logit order"],
      ["Top-k candidate set", "Filter the candidate set, then renormalize"],
      ["Tie-breaking rule", "equal logits ordered by ascending token ID"],
      ["Top-k renormalization", "after renormalization"],
      ["Max-shifted softmax", "max-shifted normalization"],
      ["Removed-token probability", "Removed IDs keep exact probability $0$"],
      ["Categorical draw", "categorical draw acts only after both decisions"],
      ["Half-open sampling interval", "half-open interval"],
      ["Greedy decoding", "Greedy decoding is therefore a separate policy"],
      ["Stochastic top-1", "Stochastic $k=1$"],
      ["RNG-state replay", "random-generator state"],
    ],
  },
  "37-incremental-attention": {
    file: "37-incremental-attention.json",
    lesson: "37-incremental-attention.mdx",
    title: "Keep the prefix, project only the new row",
    entries: [
      [
        "Incremental multi-head attention",
        "incremental multi-head self-attention",
      ],
      ["Layer-bound KV cache", "one layer-bound KV cache"],
      ["Absolute RoPE position", "absolute RoPE position $2$"],
      ["Rotated key", "one rotated key row"],
      ["Unrotated value", "one unrotated value row"],
      [
        "Current query",
        "this implementation does\nnot store them in the cache.",
      ],
      ["Logical cache length", "logical cache length"],
      ["Cache capacity", "cache capacity"],
      ["Candidate key/value pair", "one-row candidate pair"],
      ["Full-prefix reference", "full-prefix reference"],
      ["Projection reuse", "reuses $3$ earlier key rows"],
      [
        "Transactional cache update",
        "commit copies those rows into the next cache slot and increments logical length.",
      ],
    ],
  },
  "38-cached-generation": {
    file: "38-cached-generation.json",
    lesson: "38-cached-generation.mdx",
    title: "Prefill once, then decode one token at a time",
    entries: [
      [
        "Model-wide KV cache",
        "bind that model-wide state to one exact decoder for a session",
      ],
      ["Per-layer KV cache", "one logical K/V prefix per block"],
      [
        "Prompt prefill",
        "Prefill sends both prompt positions through both blocks",
      ],
      ["One-token decode", "one-token decoder calls"],
      ["Complete-prefix reference", "complete-prefix references"],
      [
        "Newest-logit equivalence",
        "newest-position logits agree with complete-prefix references within",
      ],
      ["Retained prefix length", "current retained prefix length"],
      ["Attention-score work", "attention-score work"],
      ["Context-limit stop", "context-limit stops before decoding it"],
      [
        "EOS stop",
        "EOS is returned as the selected token, and no later logits are needed.",
      ],
      ["Coherent cache commit", "commits them only after every block"],
      ["Cached-generation replay", "resets and replays"],
      [
        "Cache reset",
        "`DecoderKvSession::reset` clears logical length, phase, and work",
      ],
    ],
  },
  "39-end-to-end-llm": {
    file: "39-end-to-end-llm.json",
    lesson: "39-end-to-end-llm.mdx",
    title: "Run the whole tiny LLM",
    entries: [
      [
        "End-to-end LLM pipeline",
        "Every course component now participates in one functional program",
      ],
      ["Decoder-only LLM", "decoder-only language model"],
      [
        "Frozen document split",
        "checked-in eight/two/two bilingual document split",
      ],
      ["Training-only BPE", "training-only BPE"],
      [
        "Overlapping window-target slot",
        "A window-target slot is identified by its document, window start, and position inside the window",
      ],
      ["Bitwise training replay", "compares every training event"],
      [
        "Validation-selected state",
        "validation selects the decoder before the local final evaluator receives test batches",
      ],
      [
        "Selection-isolated final test evaluation",
        "locally isolated fixed-fixture evaluation",
      ],
      [
        "Frozen alpha-one bigram baseline",
        "alpha-one bigram from the same training tokens",
      ],
      [
        "Window-slot mean NLL and perplexity",
        "Their reported values are mean NLL in nats per slot",
      ],
      [
        "Fixed-fixture regression evidence",
        "fixed-fixture regression evidence",
      ],
      [
        "Exact checkpoint round trip",
        "checkpoint bytes and state round-trip exactly",
      ],
      [
        "Exact logit probe",
        "the separate At probe reproduces logits bit for bit",
      ],
      ["KV-cached generation", "cached and complete-prefix decisions match"],
      ["Joint sequence probability", "The sequence probability"],
      ["Autoregressive factorization", "The factorization is a causal promise"],
      [
        "Next-token conditional distribution",
        "generation samples one new $z_t$ from the conditional distribution",
      ],
    ],
  },
} as const;

const expectedRussianChapterIds = Object.keys(expectedSheets).slice(
  0,
  RUSSIAN_ROLLOUT_THROUGH_CHAPTER,
);

const exactDefinitions = {
  "01-text-units": {
    Vocabulary:
      "In this chapter, a demo-only fixed table from known Unicode scalar values to deterministic IDs; later tokenizers keep the mapping concept but replace its units and IDs.",
    "Unknown token":
      "Chapter 1's reserved marker for an unknown scalar value; replacing that value with the marker loses its identity, while the later byte-level tokenizer covers every input byte instead.",
    "Subword tokenizer":
      "A tokenizer whose learned units can represent several adjacent bytes to balance vocabulary size and sequence length; Chapters 3 and 4 build a new byte-level vocabulary rather than extending this scalar table.",
  },
  "02-corpus-partitions": {
    "Test partition":
      "Documents reserved for reporting after fitting and model selection. One course execution enforces that boundary locally; later executions reuse the known fixture as regression evidence, not a new independent estimate.",
  },
  "12-stable-softmax": {
    Underflow:
      "A finite-precision effect where a tiny magnitude becomes subnormal or rounds to zero.",
  },
  "14-scalar-autodiff": {
    Adjoint:
      "A pass-local sensitivity for one tracked node: the selected output's derivative with respect to that node, multiplied by the finite seed installed at the output.",
    "Backward pass":
      "One complete reverse traversal from a selected tracked scalar output after installing a finite seed there; the default operation uses seed 1.",
  },
  "15-tensor-autodiff-core": {
    "Reduction VJP":
      "A reverse rule that reinserts and broadcasts a reduced axis, dividing by its extent for a mean.",
  },
  "16-model-autodiff-ops": {
    "Indexed mean NLL":
      "Average negative log-likelihood over examples or token positions, selecting one target class in each row.",
    "Loss-logit gradient":
      "Gradient of mean token loss with respect to every class logit in each row.",
  },
  "19-linear-layers": {
    "Affine map":
      "A matrix transformation followed by addition of a fixed or trainable bias vector.",
  },
  "27-self-attention": {
    "Attention weight":
      "A normalized retrieval coefficient for one query-key pair, not confidence in correctness.",
  },
  "28-causal-masking": {
    "Causal mask":
      "An attention visibility rule allowing each query to use its own key and all earlier keys, but no later keys.",
    "Shifted decoder input":
      "A training input offset by one target position so the allowed diagonal contains an earlier known token, not the predicted target.",
    "Position signal":
      "Separate absolute or relative information that distinguishes token order; the causal mask provides visibility, not position.",
  },
  "29-rope": {
    "Absolute position":
      "The token index supplied to RoPE when determining each pair's local angle.",
    "Signed relative position":
      "The key position minus the query position, preserving direction rather than only distance.",
    "Query-key rotation":
      "RoPE rotates queries and keys while leaving value vectors unrotated in this lesson.",
    "Causal mask":
      "The separate visibility rule blocking future key positions independently of RoPE geometry.",
  },
  "30-multi-head-attention": {
    "Multi-head causal self-attention":
      "An attention layer that computes separately normalized causal attention in several projected head views before concatenation and output mixing.",
    "Packed Q/K/V projections":
      "Three dense model-width maps applied before the head split; every head's output columns can read and mix all input features.",
    "Model width":
      "The feature count of the complete layer's input and output, restored after all head outputs are concatenated.",
    "Head count":
      "The number of independently normalized attention heads, required here to be nonzero and divide model width exactly.",
    "Head width":
      "The feature count inside one head, equal to model width divided by head count and even for this RoPE design.",
    "Head split":
      "A reshape and transpose of projected queries, keys, and values into a head axis, performed only after their dense projections.",
    "Per-head RoPE":
      "Pairwise position rotations applied independently inside each head to queries and keys, while values remain unrotated.",
    "Per-head causal attention":
      "Each head's masked scaled-score table, row softmax over key positions, and weighted value mixture, normalized independently of other heads.",
    "Head output":
      "The weighted mixture of unrotated value rows produced by one head using that head's causal attention probabilities.",
    "Head concatenation":
      "A parameter-free join of completed head outputs along the final feature axis that restores model width without averaging or mixing.",
    "Output projection":
      "The learned map after concatenation that can recombine completed head features, while earlier dense query, key, and value maps may already mix input features.",
  },
  "31-decoder-block": {
    "Pre-normalized decoder block":
      "A block that normalizes each sublayer input, runs its transformation, then adds the result to that branch's entering residual stream.",
    "Residual stream":
      "A same-shaped model-width tensor updated by each branch while preserving a direct identity route.",
    "Attention RMSNorm":
      "The first independently parameterized normalization, applied to the block input before causal attention.",
    "Causal multi-head attention":
      "The token-mixing first branch that attends only to the current and earlier token positions.",
    "First residual merge":
      "The addition of causal-attention output to the unchanged block input, producing the intermediate stream.",
    "Feed-forward RMSNorm":
      "The second independently parameterized normalization, applied to the intermediate stream before SwiGLU.",
    "SwiGLU feed-forward branch":
      "The per-token feature transformation whose model-width output returns to the second residual merge.",
    "Second residual merge":
      "The addition of the SwiGLU output to the unchanged intermediate stream, producing the block output.",
    "Identity path":
      "A bypass that carries a branch's entering residual value unchanged around its learned transformation.",
    "Post-norm order":
      "The contrasting layout that performs a residual merge before applying LayerNorm to the merged value.",
  },
  "32-decoder-model": {
    "Decoder stack":
      "The ordered sequence of zero or more causal decoder blocks between token lookup and final normalization.",
    "Decoder depth":
      "The configured number of repeated decoder blocks; zero is valid and makes the empty block composition the identity.",
    "Distinct decoder blocks":
      "Repeated blocks with the same configuration but separately owned parameters, so matching structure does not imply shared weights.",
    "Embedding lookup":
      "Gathering one row from the vocabulary-by-feature table for each input token ID, producing model-width feature vectors.",
    "Final RMSNorm":
      "The independently parameterized learned-gain normalization applied after the entire block stack, including at zero depth.",
    "Weight tying":
      "Using one parameter table for both token lookup and vocabulary scoring, not two separate tables that merely start with equal values.",
    "Tied projection":
      "Multiplying final hidden states by a differentiable transpose view of the embedding table instead of a separate output-head parameter.",
    "Vocabulary logits":
      "The unnormalized output scores over every vocabulary item at each batch and token position, distinct from the scalar training loss.",
    "Mean indexed negative log likelihood":
      "The scalar loss formed by selecting each target token's negative log probability and averaging over all batch-position pairs.",
    "Prefix invariance":
      "The causal guarantee that changing only a later token leaves every earlier logit row bitwise unchanged.",
    "Tied gradient accumulation":
      "Reverse-mode addition of the table's lookup-role gradient and output-role gradient onto the one shared parameter leaf.",
  },
  "33-training-selection": {
    "Training mini-batch":
      "An ordered batch from the training partition whose next-token loss supplies one planned forward, backward, and optimizer update.",
    "Partition roles":
      "Training fits parameters, validation selects among measured checkpoints without updating or stopping the bounded run, and test remains excluded until later evaluation.",
    "Learning-rate schedule":
      "A predetermined finite positive rate for every planned update, with all updates executed even while validation is measured.",
    "Raw gradient":
      "The finite derivative of one training mini-batch loss at the pre-update parameter state, before any clipping.",
    "Global-norm clipping":
      "Computing one norm across every parameter gradient and applying one shared scale so the complete gradient respects a ceiling.",
    "Clipped gradient":
      "The raw gradient after the shared global scale: the globally clipped gradient AdamW uses to update both moments.",
    "AdamW update":
      "The scheduled optimizer operation that advances parameters and continuing moment state using the clipped training gradient.",
    "Optimizer moment state":
      "AdamW's persistent first moment, second moment, and step counter, continued across learning-rate schedule boundaries.",
    "Graph-free validation loss":
      "A token-weighted validation metric computed without a reverse graph or gradient mutation; it selects only, never updates or stops the bounded run.",
    "Checkpoint set":
      "The predetermined measured update indices, including initialized and final states, over which validation selection is allowed.",
    "Earliest validation minimum":
      "The measured checkpoint with minimum validation loss, with exact ties retained at the smallest update index by strict improvement.",
    "Token-weighted mean":
      "An epoch loss that weights each batch mean by its predicted-token count rather than giving every batch equal weight.",
  },
  "34-final-evaluation": {
    "Validation-selected checkpoint":
      "The planned model checkpoint chosen using validation evidence before the local evaluator receives test data in that execution.",
    "Frozen selected state":
      "The complete selected decoder snapshot that test scores cannot change inside the demonstrated execution.",
    "Single-use test evaluation boundary":
      "A local post-selection protocol that checks the epoch's Test label, caller-assertion consistency, and pre-open model constraints; its one-use count applies to one evaluator instance and cannot establish repository-wide uniqueness or independent generalization.",
    "Final test evaluation":
      "In an untouched protocol, a reporting-only pass after selection closes; this chapter's known and repeatedly checked fixture instead supplies regression evidence.",
    "Fixed-fixture regression evidence":
      "A reproducible result on checked-in test documents. Chapter 34's documents were selected to produce the decoder-lower-than-bigram loss ordering, which is retained to detect changes; the score is neither an independent estimate of generalization nor evidence of architecture superiority.",
    "Token-weighted mean NLL":
      "Total negative log likelihood divided by the number of aligned target tokens, so longer documents contribute in proportion to their targets.",
    Perplexity:
      "The exponential of mean negative log likelihood, expressing average multiplicative uncertainty per target token.",
    "Aligned target slot":
      "One causal input and observed next-token target at a stable document, window, and position, including repetitions from overlapping windows.",
    "Evaluation provenance assertions":
      "Three nonblank caller-supplied corpus, split, and tokenizer identifiers plus a positive context value; equality checks assertion consistency but does not derive or verify the underlying artifacts.",
    "No-grad evaluation":
      "Scoring with graph construction disabled and with decoder parameters and gradient bits verified unchanged afterward.",
    "Frozen final evaluation report":
      "A versioned record of caller-supplied identifiers, checked target evidence, scores, local gate facts, state-preservation checks, and evidence scope, fixed after selection closes; it proves neither external lineage nor independent generalization.",
    "Frozen bigram":
      "In this fixture, an add-one bigram fitted on Chapter 33's exact training token slices and sealed before test access; the generic wrapper itself checks only a Train assertion and a nonzero fitted-document count.",
    "Like-for-like targets":
      "A comparison where both models score the same ordered target slots, including every repetition from overlapping decoder windows; fairness within the fixture does not make the fixture independently held out.",
  },
  "35-checkpoints": {
    "Versioned decoder checkpoint":
      "A validated, schema-versioned artifact storing tokenizer layout, decoder configuration and parameter bits, trainer-paired AdamW state and shared step, plus a separate sampling RNG.",
    "Checkpoint schema":
      "The versioned application contract that defines stored tokenizer, decoder, optimizer, and sampling-RNG state, record roles, compatibility checks, and the continuation data left to the caller.",
    "Trainer-issued selected state":
      "The sealed model/AdamW capture required at checkpoint creation; version 1 stores both counters and validates equality but stores no independent model-lineage proof.",
    "AdamW optimizer state":
      "Named first and second moments, parameter groups, step, configuration, and exact accumulated beta powers; the caller still supplies update inputs, targets, and any learning-rate override.",
    "Sampling RNG state":
      "The saved raw SplitMix64 stream state used for later token sampling, distinct from the omitted batch-shuffle or other training RNG.",
    "Checkpoint payload record":
      "One ordered contiguous block of encoded tokenizer, decoder-parameter, or optimizer values in the checkpoint payload.",
    "Checkpoint record descriptor":
      "Metadata assigning one checkpoint payload record its role, name, dtype, shape, absolute offset, and byte length.",
    "Checkpoint payload offset":
      "The absolute file-byte position where one checkpoint payload record begins; the next offset advances by element byte width times shape product.",
    "Canonical checkpoint encoding":
      "The deterministic little-endian checkpoint representation with stable header fields, descriptor and payload order, and no implicit alignment padding.",
    "Checkpoint integrity checksum (FNV-1a)":
      "An accidental-corruption check over the complete canonical checkpoint with its checksum field treated as zero; FNV-1a does not authenticate the file.",
    "Exact round trip":
      "Loading and canonical re-encoding reproduce identical checkpoint bytes, logits bits, and the next sampling-RNG draw in the same arithmetic environment.",
    "Matched caller-supplied update":
      "Original and loaded branches given the same caller-supplied inputs, targets, and learning rate produce identical parameter bits, optimizer state, and post-update logits for one manual update; this is not a trainer restart.",
    "Atomic checkpoint replacement":
      "The supported Unix same-filesystem publication that synchronizes a complete same-directory temporary checkpoint, renames it over the destination, then synchronizes the directory.",
  },
  "36-temperature-top-k": {
    Temperature:
      "A finite strictly positive divisor applied to logits before softmax; lower values sharpen probability gaps and higher values flatten them without changing rank.",
    "Stable ranking":
      "Deterministic ordering by descending logit, with the configured tie rule resolving equal values before candidate filtering.",
    "Top-k candidate set":
      "The exact number of highest-ranked token IDs retained before sampling, bounded between one and the vocabulary size.",
    "Tie-breaking rule":
      "Equal logits are ordered by ascending token ID, making the retained boundary and greedy choice deterministic.",
    "Top-k renormalization":
      "Recomputing probabilities over only retained candidates after filtering, so their probabilities sum to one.",
    "Max-shifted softmax":
      "Softmax computed after subtracting the largest retained scaled logit, preserving probability ratios while avoiding overflow.",
    "Removed-token probability":
      "An exact zero assigned to every filtered token, so it owns no sampling interval and cannot be selected.",
    "Categorical draw":
      "One unit-interval random draw used after temperature scaling, filtering, and renormalization to select a retained token.",
    "Half-open sampling interval":
      "A cumulative probability range including its lower endpoint and excluding its upper endpoint, traversed here in ascending token-ID order.",
    "Greedy decoding":
      "The separate deterministic policy that chooses the first stable rank and leaves the random-generator state untouched.",
    "Stochastic top-1":
      "A sampling policy that retains one token and chooses the same ID as greedy but still consumes exactly one random draw.",
    "RNG-state replay":
      "Reproducing categorical choices by restoring the same generator state and preserving deterministic ranking, interval order, and sampling policy.",
  },
  "37-incremental-attention": {
    "Incremental multi-head attention":
      "A one-row attention path that projects the current row for every head, reads retained layer-local keys and values plus the candidate pair, and returns the newest output.",
    "Layer-bound KV cache":
      "Fixed key/value storage tied to one attention layer's parameter-node, RoPE, batch, model, head, capacity, and head-width identity.",
    "Absolute RoPE position":
      "The zero-based position used to rotate the current query and key, equal to the cache's old logical length before append.",
    "Rotated key":
      "A projected, head-split key after RoPE at its absolute position; this is the key representation retained in the cache.",
    "Unrotated value":
      "A projected and head-split value kept without RoPE; this is the value representation retained in the cache.",
    "Current query":
      "The newest projected, head-split, RoPE-rotated query used only for the current attention calculation and never cached.",
    "Logical cache length":
      "The number of retained positions currently exposed; reset sets it to zero without reallocating or clearing stored values.",
    "Cache capacity":
      "The fixed maximum number of positions backed by the physical buffers; logical reset does not change it.",
    "Candidate key/value pair":
      "The newest rotated-key and unrotated-value rows included with the retained prefix for calculation before any cache append is committed.",
    "Full-prefix reference":
      "Independent uncached attention over the complete prefix whose newest output is the correctness reference, matched within the lesson's tolerance.",
    "Projection reuse":
      "Reusing earlier cached key and value projections so only the newest rows are reprojected; the newest query still reads the retained prefix, so attention is not constant time.",
    "Transactional cache update":
      "A rule that copies the candidate key/value rows and increments logical length only after the complete incremental output, including output projection, succeeds.",
  },
  "38-cached-generation": {
    "Model-wide KV cache":
      "Mutable decoder-level state containing one per-layer KV cache plus the common length, phase, and work counters. A bound session proves which exact decoder may advance it, keeps that decoder’s parameter values borrowed for reading, and commits every block coherently.",
    "Per-layer KV cache":
      "One decoder block’s independent fixed-capacity K/V store, tied to that block’s attention geometry, RoPE configuration, parameter nodes, and captured value revisions; an equal-shaped cache from another block is not interchangeable.",
    "Prompt prefill":
      "The initial complete-prompt phase that fills every layer's cache and produces the logits used for the first generation decision.",
    "One-token decode":
      "A later generation phase that feeds only the newly selected token while reusing every layer's retained key/value prefix to produce later logits.",
    "Complete-prefix reference":
      "An uncached computation that reruns the entire known prefix and provides the correctness baseline for cached generation.",
    "Newest-logit equivalence":
      "Agreement within tolerance between cached and complete-prefix logits at the newest position, preserving the same next-token decision under the same policy.",
    "Retained prefix length":
      "The current number of token positions exposed by every coherent layer cache and therefore the number of keys read by the newest cached query.",
    "Attention-score work":
      "The count of query-key score values formed; cached decoding avoids earlier query rows but the newest query still scans the retained prefix.",
    "Context-limit stop":
      "A stop that keeps the token selected from logits at a full retained prefix, then ends before decoding it because the cache has reached capacity.",
    "EOS stop":
      "A stop that keeps the selected end-of-sequence token in the output and ends before decoding it because no later logits are needed.",
    "Coherent cache commit":
      "A transaction that advances every block cache, common length, phase, and work counters only after the full decoder row and vocabulary logits succeed, leaving committed state unchanged on error.",
    "Cached-generation replay":
      "Repeating cached generation from reset state with the same exact model, prompt, policy, and RNG state to reproduce selected tokens, draws, final RNG state, and stopping reason.",
    "Cache reset":
      "Within a live session, reset clears logical length, phase, and work counters for a fresh sequence while retaining backing allocations, capacity, stored values outside the empty logical prefix, and that session’s model/cache relationship. It does not refresh the cache’s recorded compatibility evidence; after the session ends and weights change, the old cache still cannot bind.",
  },
  "39-end-to-end-llm": {
    "End-to-end LLM pipeline":
      "The course path that turns frozen documents into BPE tokens and causal batches, trains and selects a decoder before one local fixed-fixture evaluation, restores it, and generates text.",
    "Decoder-only LLM":
      "An autoregressive language model with a causal decoder stack and no separate encoder, mapping a bounded earlier-token context to next-token logits.",
    "Frozen document split":
      "A fixed assignment of whole documents to training, validation, and test roles, preventing test-reserved text from influencing tokenizer learning, parameter updates, or selection.",
    "Training-only BPE":
      "A byte-pair tokenizer whose merge ranks are learned only from training documents, then frozen and applied unchanged to validation and test documents.",
    "Overlapping window-target slot":
      "One causal target position identified by document, stride-one window start, and position inside that window. The same within-document transition occurrence can appear in as many as four slots, with the decoder seeing one, two, three, or four in-window context tokens.",
    "Bitwise training replay":
      "A repeat of the frozen training run with identical data, initialization, batch order, and arithmetic environment that reproduces every recorded training event and gradient diagnostic, the selected checkpoint, every final model value, and the final optimizer state bit for bit.",
    "Validation-selected state":
      "The trained decoder state chosen by validation loss before test mini-batches are materialized.",
    "Selection-isolated final test evaluation":
      "One local post-selection pass whose test targets cannot update parameters or feed a result back into model selection inside that execution; the local access count does not establish repository-wide independence.",
    "Frozen alpha-one bigram baseline":
      "An add-one-smoothed, one-token-context model fitted only on training tokens and frozen before it scores the final ordered test slots.",
    "Window-slot mean NLL and perplexity":
      "Chapter 39 averages NLL over the same 1,744 overlapping window-target slots for both models, in nats per slot; exponentiating gives dimensionless window-slot perplexity. A separate metric would score each of 442 within-document transition occurrences once, give the decoder the longest available causal prefix capped at four tokens, and use only its newest-position distribution; its numeric mean NLL and perplexity are not reported.",
    "Fixed-fixture regression evidence":
      "A known result rerun to detect changes in checked behavior; later executions retain the lower decoder window-slot mean NLL as a regression condition, so the gap is neither an independent estimate of generalization nor evidence of architecture superiority.",
    "Exact checkpoint round trip":
      "Saving and loading the selected state so checkpoint bytes, model and optimizer bits, BPE ranks, selected step, and RNG state all reproduce exactly.",
    "Exact logit probe":
      "A deliberately narrow check that the restored decoder reproduces every logit bit for the fixed At input, without claiming that every possible input was compared.",
    "KV-cached generation":
      "In this fixture, generation after prompt prefill retains per-block key/value state and decodes only tokens needed for later logits, while matching the complete-prefix reference’s draws, token decisions, stopping, and final RNG state.",
    "Joint sequence probability":
      "The probability assigned to an entire token sequence, computed as the product of the observed next-token conditional probability at every position.",
    "Autoregressive factorization":
      "The causal decomposition of joint sequence probability into one next-token conditional factor per position, with each factor depending only on the earlier prefix.",
    "Next-token conditional distribution":
      "The decoder’s probability distribution over the next token given the allowed earlier prefix; training scores the observed token, while generation samples a new token from it.",
  },
} as const;

function readLocalizedSheet(locale: "en" | "ru", fileName: string) {
  return JSON.parse(
    readFileSync(resolve(contentRoot, locale, fileName), "utf8"),
  ) as CheatSheetData;
}

function localizedSheetSha256(locale: "en" | "ru", fileName: string) {
  return createHash("sha256")
    .update(readFileSync(resolve(contentRoot, locale, fileName), "utf8"))
    .digest("hex");
}

function readSheet(fileName: string) {
  return readLocalizedSheet("en", fileName);
}

describe("English chapter cheat-sheet content", () => {
  it("publishes exactly the independently checkpointed English records", () => {
    expect(readdirSync(resolve(contentRoot, "en")).sort()).toEqual(
      Object.values(expectedSheets)
        .map(({ file }) => file)
        .sort(),
    );
    expect(readdirSync(resolve(contentRoot, "ru")).sort()).toEqual(
      expectedRussianChapterIds.map((chapterId) => `${chapterId}.json`).sort(),
    );
    expect(
      expectedRussianChapterIds.map((chapterId) =>
        Number.parseInt(chapterId.slice(0, 2), 10),
      ),
    ).toEqual(
      Array.from(
        { length: RUSSIAN_ROLLOUT_THROUGH_CHAPTER },
        (_, index) => index + 1,
      ),
    );
  });

  it("freezes the Chapter 2 post-selection test-partition boundary in one nine-term page", () => {
    const english = readLocalizedSheet("en", "02-corpus-partitions.json");
    const russian = readLocalizedSheet("ru", "02-corpus-partitions.json");

    expect(localizedSheetSha256("en", "02-corpus-partitions.json")).toBe(
      "c535f561f5968ba0c0d5b654939adb439f421b40d163af49be43269ae39dcd64",
    );
    expect(localizedSheetSha256("ru", "02-corpus-partitions.json")).toBe(
      "655a023d47db59fd993a2c920c77946b1ce1fedf9d4294423de16e33bd61d1f2",
    );
    expect(english.terms.map(({ term }) => term)).toEqual([
      "Corpus",
      "Whole document",
      "Training partition",
      "Validation partition",
      "Test partition",
      "Disjoint split",
      "Holdout",
      "Data leakage",
      "Provenance group",
    ]);
    expect(russian.terms.map(({ term }) => term)).toEqual([
      "Корпус",
      "Целый документ",
      "Обучающая выборка",
      "Валидационная выборка",
      "Тестовая выборка",
      "Непересекающееся разбиение",
      "Отложенные данные",
      "Утечка данных",
      "Группа происхождения",
    ]);
    expect(
      english.terms.find(({ term }) => term === "Test partition")?.definition,
    ).toBe(
      "Documents reserved for reporting after fitting and model selection. One course execution enforces that boundary locally; later executions reuse the known fixture as regression evidence, not a new independent estimate.",
    );
    expect(
      russian.terms.find(({ term }) => term === "Тестовая выборка")?.definition,
    ).toBe(
      "Документы, предназначенные для оценки после завершения обучения и выбора модели. В пределах одного запуска программа обеспечивает эту границу локально; в последующих запусках известный фиксированный пример используют для регрессионной проверки, а не для новой независимой оценки.",
    );
    expect(
      paginateCheatSheetTerms(sortCheatSheetTerms(english.terms, "en")).map(
        (page) => page.length,
      ),
    ).toEqual([9]);
    expect(
      paginateCheatSheetTerms(sortCheatSheetTerms(russian.terms, "ru")).map(
        (page) => page.length,
      ),
    ).toEqual([9]);
  });

  it("freezes both Chapter 35 sheets and sorts each into exact ten-plus-three pages", () => {
    const english = readLocalizedSheet("en", "35-checkpoints.json");
    const russian = readLocalizedSheet("ru", "35-checkpoints.json");
    const englishDefinitions = exactDefinitions["35-checkpoints"] as Record<
      string,
      string
    >;
    const expectedEnglishTerms = expectedSheets["35-checkpoints"].entries.map(
      ([term]) => ({
        definition: englishDefinitions[term],
        term,
      }),
    );
    const expectedRussianTerms = [
      {
        term: "Контрольная точка декодера с версией формата",
        definition:
          "Проверенный артефакт с номером версии схемы, сохраняющий данные токенизатора, конфигурацию и биты параметров декодера, состояние AdamW из того же снимка цикла обучения, их общий номер шага и отдельный генератор для выбора токенов.",
      },
      {
        term: "Схема контрольной точки",
        definition:
          "Контракт приложения с номером версии, задающий сохраняемые состояния токенизатора, декодера, оптимизатора и генератора для выбора токенов, роли записей, проверки совместимости и данные, которые должен предоставить вызывающий код.",
      },
      {
        term: "Состояние, выбранное циклом обучения",
        definition:
          "Единый снимок модели и AdamW, обязательный при создании контрольной точки; версия 1 хранит оба счётчика и проверяет их равенство, но не сохраняет отдельного доказательства общего происхождения.",
      },
      {
        term: "Состояние оптимизатора AdamW",
        definition:
          "Именованные первые и вторые моменты, группы параметров, номер шага, конфигурация и точные накопленные степени коэффициентов бета; входы, цели и новое значение скорости обучения по-прежнему задаёт вызывающий код.",
      },
      {
        term: "Состояние генератора для выбора токенов",
        definition:
          "Сохранённое внутреннее состояние потока SplitMix64 для последующего выбора токенов, отличное от не сохранённого генератора перемешивания пакетов и других генераторов обучения.",
      },
      {
        term: "Запись данных контрольной точки",
        definition:
          "Один упорядоченный непрерывный блок закодированных данных токенизатора, параметров декодера или значений оптимизатора в области данных контрольной точки.",
      },
      {
        term: "Дескриптор записи контрольной точки",
        definition:
          "Метаданные, задающие для одной записи данных её роль, имя, тип данных, форму, абсолютное смещение и длину в байтах.",
      },
      {
        term: "Абсолютное смещение записи данных",
        definition:
          "Позиция байта от начала файла, с которой начинается запись данных; следующее смещение увеличивается на размер элемента в байтах, умноженный на произведение размеров формы.",
      },
      {
        term: "Каноническое кодирование контрольной точки",
        definition:
          "Детерминированное представление с порядком байтов от младшего к старшему, стабильными полями заголовка, порядком дескрипторов и данных и без неявных промежутков выравнивания.",
      },
      {
        term: "Контрольная сумма контрольной точки (FNV-1a)",
        definition:
          "Проверка случайных повреждений всего канонического файла, при которой поле контрольной суммы считается нулевым; FNV-1a не подтверждает подлинность файла.",
      },
      {
        term: "Точный цикл сохранения и загрузки",
        definition:
          "Загрузка и повторное каноническое кодирование воспроизводят идентичные байты контрольной точки, биты логитов и следующее значение генератора для выбора токенов в той же арифметической среде.",
      },
      {
        term: "Совпадение одного обновления с заданными извне данными",
        definition:
          "Если исходной и загруженной ветвям передать одинаковые входы, цели и скорость обучения, одно вручную выполненное обновление даст одинаковые биты параметров, состояние оптимизатора и логиты; это не возобновление всего процесса обучения.",
      },
      {
        term: "Атомарная замена контрольной точки",
        definition:
          "Поддерживаемая в Unix публикация в пределах одной файловой системы: полный временный файл в том же каталоге синхронизируется, переименовывается поверх целевого, после чего синхронизируется каталог.",
      },
    ];

    expect(localizedSheetSha256("en", "35-checkpoints.json")).toBe(
      "c18319acb80b65ca4703ae0cf25e401f9734673f5d7b6fef9dc782579766bfe6",
    );
    expect(localizedSheetSha256("ru", "35-checkpoints.json")).toBe(
      "d5aa75f9a4d00f5991dbe8f5aafec029a9362c188cf8f6588f34beb44f1377c1",
    );
    expect(english).toMatchObject({
      title: "Save decoder state, replay one specified update",
      description:
        "A quick reference for declared checkpoint state, caller obligations, canonical byte layout, exact component replay, integrity checks, and atomic publication.",
    });
    expect(russian).toMatchObject({
      title:
        "Сохраните состояние декодера и точно повторите одно заданное обновление",
      description:
        "Кратко о заявленном состоянии контрольной точки, обязанностях вызывающего кода, канонических байтах, точном повторе одного обновления, проверке целостности и атомарной замене.",
    });
    expect(english.terms).toEqual(expectedEnglishTerms);
    expect(russian.terms).toEqual(expectedRussianTerms);

    const pages = paginateCheatSheetTerms(
      sortCheatSheetTerms(english.terms, "en"),
    );
    const russianPages = paginateCheatSheetTerms(
      sortCheatSheetTerms(russian.terms, "ru"),
    );
    const expectedSortedTerms = [
      "AdamW optimizer state",
      "Atomic checkpoint replacement",
      "Canonical checkpoint encoding",
      "Checkpoint integrity checksum (FNV-1a)",
      "Checkpoint payload offset",
      "Checkpoint payload record",
      "Checkpoint record descriptor",
      "Checkpoint schema",
      "Exact round trip",
      "Matched caller-supplied update",
      "Sampling RNG state",
      "Trainer-issued selected state",
      "Versioned decoder checkpoint",
    ];

    expect(pages.map((page) => page.length)).toEqual([10, 3]);
    expect(russianPages.map((page) => page.length)).toEqual([10, 3]);
    expect(pages.flat().map(({ term }) => term)).toEqual(expectedSortedTerms);
    expect(new Set(pages.flat().map(({ term }) => term)).size).toBe(13);
    expect(JSON.stringify([english, russian])).not.toMatch(
      /Save every state, resume exactly|Continuation RNG state|Exact resumed update|Сохраните всё состояние и продолжите без расхождений|Точное продолжение обновления/,
    );
  });

  it("sorts all thirteen Chapter 38 concepts into exact ten-plus-three pages without loss", () => {
    const sheet = readSheet("38-cached-generation.json");
    const sorted = sortCheatSheetTerms(sheet.terms, "en");
    const pages = paginateCheatSheetTerms(sorted);
    const expectedSortedTerms = [
      "Attention-score work",
      "Cache reset",
      "Cached-generation replay",
      "Coherent cache commit",
      "Complete-prefix reference",
      "Context-limit stop",
      "EOS stop",
      "Model-wide KV cache",
      "Newest-logit equivalence",
      "One-token decode",
      "Per-layer KV cache",
      "Prompt prefill",
      "Retained prefix length",
    ];

    expect(pages.map((page) => page.length)).toEqual([10, 3]);
    expect(pages.flat().map(({ term }) => term)).toEqual(expectedSortedTerms);
    expect(new Set(pages.flat().map(({ term }) => term)).size).toBe(13);
  });

  it("sorts all seventeen Chapter 39 concepts into exact ten-plus-seven pages without loss", () => {
    const sheet = readSheet("39-end-to-end-llm.json");
    const sorted = sortCheatSheetTerms(sheet.terms, "en");
    const pages = paginateCheatSheetTerms(sorted);
    const expectedSortedTerms = [
      "Autoregressive factorization",
      "Bitwise training replay",
      "Decoder-only LLM",
      "End-to-end LLM pipeline",
      "Exact checkpoint round trip",
      "Exact logit probe",
      "Fixed-fixture regression evidence",
      "Frozen alpha-one bigram baseline",
      "Frozen document split",
      "Joint sequence probability",
      "KV-cached generation",
      "Next-token conditional distribution",
      "Overlapping window-target slot",
      "Selection-isolated final test evaluation",
      "Training-only BPE",
      "Validation-selected state",
      "Window-slot mean NLL and perplexity",
    ];

    expect(pages.map((page) => page.length)).toEqual([10, 7]);
    expect(pages.flat().map(({ term }) => term)).toEqual(expectedSortedTerms);
    expect(new Set(pages.flat().map(({ term }) => term)).size).toBe(17);
    expect(localizedSheetSha256("en", "39-end-to-end-llm.json")).toBe(
      "90b1610666270ef7a3cba38e1070f3d666080a6a8487515b4478c7917918b0b0",
    );
    expect(localizedSheetSha256("ru", "39-end-to-end-llm.json")).toBe(
      "21db369c97bdb443a17320b108b37e22b302d0a73c9da91ec85c1bcfb852a2fa",
    );
  });

  for (const [chapterId, expected] of Object.entries(expectedSheets)) {
    it(`${chapterId} contains concise terms grounded in its canonical lesson`, () => {
      const sheet = readSheet(expected.file);
      const lesson = readFileSync(
        resolve(root, "src/content/chapters/en", expected.lesson),
        "utf8",
      );
      const normalizedLesson = lesson
        .replace(/<\/?code>/g, "")
        .replace(/\s+/g, " ");

      expect(sheet.chapter_id).toBe(chapterId);
      expect(sheet.locale).toBe("en");
      expect(sheet.title).toBe(expected.title);
      expect(sheet.description.trim()).toBe(sheet.description);
      expect(sheet.description).toMatch(/\.$/);
      expect(sheet.terms.map(({ term }) => term)).toEqual(
        expected.entries.map(([term]) => term),
      );
      expect(
        new Set(sheet.terms.map(({ term }) => term.toLowerCase())).size,
      ).toBe(sheet.terms.length);

      expected.entries.forEach(([, evidence], index) => {
        expect(normalizedLesson).toContain(evidence.replace(/\s+/g, " "));
        expect(sheet.terms[index]?.definition.trim()).toBe(
          sheet.terms[index]?.definition,
        );
        expect(sheet.terms[index]?.definition).toMatch(/\.$/);
        expect(
          sheet.terms[index]?.definition.split(/\s+/).length,
        ).toBeGreaterThan(7);
      });

      expect(sheet.terms.map(({ term }) => term).join(" ")).not.toMatch(
        /\b(?:Vec|usize|Result|borrow checker|TypeScript|Python|Rust|JavaScript|HTML|CSS|Astro|browser|modal|dialog|web interface|build|deployment|Docker|Git)\b/i,
      );

      for (const [term, definition] of Object.entries(
        exactDefinitions[chapterId as keyof typeof exactDefinitions] ?? {},
      )) {
        expect(
          sheet.terms.find((entry) => entry.term === term)?.definition,
        ).toBe(definition);
      }
    });
  }

  it("describes Chapter 34 provenance as assertions, checked facts, and fixture evidence", () => {
    const sheet = readSheet("34-final-evaluation.json");
    expect(localizedSheetSha256("en", "34-final-evaluation.json")).toBe(
      "f2418a4615bcc7067379949fad18e3cbc5e02c33056016777d40a15aaad05674",
    );
    expect(localizedSheetSha256("ru", "34-final-evaluation.json")).toBe(
      "2ec2f61b14f8ddb2f0588a79d75800357eb2a1e7644466a1e1a8d10768018f1b",
    );
    expect(sheet.description).toBe(
      "A quick reference for validation-selected state, the local test gate, fair token weighting, fixed-fixture regression scope, caller-supplied provenance assertions, mechanically checked facts, and like-for-like comparison.",
    );
    const serialized = JSON.stringify(sheet);
    expect(serialized).not.toMatch(
      /verifies held-out test role and provenance/i,
    );
    expect(serialized).not.toMatch(/provenance cannot hide/i);
    expect(serialized).not.toMatch(/result cannot (?:choose|tune)/i);
    expect(serialized).not.toMatch(/verified lineage/i);
    expect(serialized).not.toMatch(
      /independent generalization estimate: true/i,
    );
    expect(serialized).not.toMatch(/architecture superiority evidence: true/i);
  });
});

describe("Russian chapter cheat-sheet localization", () => {
  const protectedLiterals =
    /<[^>]+>|UTF-8|Unicode|BPE|BOS|EOS|Q\/K\/V|RMSNorm|LayerNorm|RoPE|SwiGLU|AdamW|FNV-1a|KV|LLM|NLL|MLE|VJP|f64|SplitMix64|Unix|\bAt\b/g;
  const caseFoldedProtectedLiterals = /top-k|top-1|softmax/gi;

  for (const chapterId of expectedRussianChapterIds) {
    it(`${chapterId} preserves the English concepts in natural Russian`, () => {
      const english = readLocalizedSheet("en", `${chapterId}.json`);
      const russian = readLocalizedSheet("ru", `${chapterId}.json`);

      expect(russian.chapter_id).toBe(chapterId);
      expect(russian.locale).toBe("ru");
      expect(russian.title).not.toBe(english.title);
      expect(russian.title).toMatch(/[А-Яа-яЁё]/);
      expect(russian.description).not.toBe(english.description);
      expect(russian.description).toMatch(/[А-Яа-яЁё]/);
      expect(russian.terms).toHaveLength(english.terms.length);
      expect(
        new Set(russian.terms.map(({ term }) => term.toLocaleLowerCase("ru")))
          .size,
      ).toBe(russian.terms.length);

      russian.terms.forEach(({ term, definition }, index) => {
        // Locale records retain canonical concept order; display order is locale-sorted.
        const source = english.terms[index];
        expect(source).toBeDefined();
        expect(term.trim()).toBe(term);
        expect(definition.trim()).toBe(definition);
        expect(definition).toMatch(/[А-Яа-яЁё]/);
        expect(definition).toMatch(/\.$/);
        expect(definition).not.toBe(source?.definition);
        expect(definition).not.toMatch(
          /\b(?:the|this|that|when|while|using|used|each|from|with|without|before|after|into|only|and|or)\b/i,
        );

        const sourceLiterals = new Set(
          `${source?.term ?? ""} ${source?.definition ?? ""}`.match(
            protectedLiterals,
          ) ?? [],
        );
        const localizedText = `${term} ${definition}`;
        for (const literal of sourceLiterals) {
          expect(localizedText).toContain(literal);
        }

        const sourceCaseFoldedLiterals = new Set(
          (
            `${source?.term ?? ""} ${source?.definition ?? ""}`.match(
              caseFoldedProtectedLiterals,
            ) ?? []
          ).map((literal) => literal.toLocaleLowerCase("en")),
        );
        const localizedCaseFoldedText = localizedText.toLocaleLowerCase("en");
        for (const literal of sourceCaseFoldedLiterals) {
          expect(localizedCaseFoldedText).toContain(literal);
        }
      });
    });
  }

  it("keeps the Chapter 14 adjoint and backward-pass definitions seed-aware", () => {
    const sheet = readLocalizedSheet("ru", "14-scalar-autodiff.json");
    expect(
      sheet.terms.find((entry) => entry.term === "Сопряжённая величина")
        ?.definition,
    ).toBe(
      "Чувствительность отслеживаемого узла в текущем проходе: производная выбранного выхода по этому узлу, умноженная на конечную начальную сопряжённую величину, заданную для выхода.",
    );
    expect(
      sheet.terms.find((entry) => entry.term === "Обратный проход")?.definition,
    ).toBe(
      "Один полный обратный обход от выбранного отслеживаемого скалярного выхода после того, как для него задали конечную начальную сопряжённую величину; обычный вызов использует 1.",
    );
  });

  it("keeps the Chapter 34 assertion boundary explicit in Russian", () => {
    const sheet = readLocalizedSheet("ru", "34-final-evaluation.json");
    expect(sheet.title).toBe(
      "Отделите локальную изоляцию от результата фиксированного примера",
    );
    expect(sheet.description).toBe(
      "Краткая памятка о состоянии, выбранном по валидации, локальном доступе к тестовой выборке, весах целевых токенов, области применимости регрессионной проверки фиксированного примера, заявленных сведениях, проверяемых фактах и корректном сравнении.",
    );
    const expected = {
      "Контрольная точка, выбранная по валидации":
        "Заранее предусмотренное состояние модели, выбранное по результатам валидации до того, как локальный оценщик получает тестовые данные в этом запуске.",
      "Зафиксированное выбранное состояние":
        "Полный снимок выбранного декодера, который тестовые оценки не могут изменить в пределах показанного запуска.",
      "Граница однократной оценки на тестовой выборке":
        "Локальный протокол после выбора модели: он проверяет метку Test, согласованность заявленных сведений и ограничения модели; счётчик однократного доступа относится к одному экземпляру оценщика и не гарантирует единственность доступа в репозитории или независимость оценки способности модели обобщать.",
      "Итоговая оценка на тестовой выборке":
        "В протоколе с ранее не использованными данными — проход только для отчёта после завершения выбора; известный и постоянно проверяемый пример этой главы вместо этого служит регрессионной проверкой.",
      "Результат фиксированного примера для регрессионной проверки":
        "Воспроизводимый результат на сохранённых в репозитории тестовых документах. Документы главы 34 выбрали так, чтобы потери декодера были ниже потерь биграммной модели; этот порядок сохраняют для обнаружения изменений, поэтому результат не является независимой оценкой способности модели обобщать и не доказывает превосходства архитектуры.",
      "Заявленные сведения о происхождении данных и условиях оценки":
        "Три непустых идентификатора корпуса, разбиения и токенизатора, заданные вызывающим кодом, и положительное значение длины контекста; проверка совпадения показывает только согласованность строк и не устанавливает, какие корпус, способ разбиения и токенизатор стоят за ними.",
      "Неизменяемый итоговый отчёт об оценке":
        "Версионируемая запись заданных вызывающим кодом идентификаторов, проверенных целевых позиций, результатов, фактов локального доступа, сохранности состояния и области применимости, зафиксированная после завершения выбора; она не доказывает ни внешнее происхождение данных, ни независимость оценки способности модели обобщать.",
      "Зафиксированная биграммная модель":
        "В этом примере — биграммная модель с аддитивным сглаживанием с параметром один, обученная на точных срезах обучающих токенов главы 33 и зафиксированная до доступа к тестовой выборке; универсальная обёртка проверяет лишь заявленную метку Train и ненулевое число обработанных документов.",
      "Средняя NLL с весами по числу целевых токенов":
        "Суммарное отрицательное логарифмическое правдоподобие, делённое на число выровненных целевых токенов, поэтому вклад более длинных документов пропорционален числу их целей.",
      Перплексия:
        "Экспонента среднего отрицательного логарифмического правдоподобия, выражающая среднюю мультипликативную неопределённость на один целевой токен.",
      "Выровненная целевая позиция":
        "Одна пара «каузальный вход — наблюдаемый следующий токен», определённая документом, окном и позицией; учитываются и повторы из перекрывающихся окон.",
      "Оценка без записи графа вычислений":
        "Оценка с отключённой записью графа и последующей проверкой того, что параметры декодера и биты градиентов не изменились.",
      "Одни и те же целевые позиции":
        "Сравнение, в котором обе модели оценивают одинаковый упорядоченный набор целевых позиций, включая каждый повтор из перекрывающихся окон декодера; справедливость сравнения внутри примера не делает сами данные независимо отложенными.",
    } as const;
    expect(sheet.terms.map(({ term }) => term)).toEqual([
      "Контрольная точка, выбранная по валидации",
      "Зафиксированное выбранное состояние",
      "Граница однократной оценки на тестовой выборке",
      "Итоговая оценка на тестовой выборке",
      "Результат фиксированного примера для регрессионной проверки",
      "Средняя NLL с весами по числу целевых токенов",
      "Перплексия",
      "Выровненная целевая позиция",
      "Заявленные сведения о происхождении данных и условиях оценки",
      "Оценка без записи графа вычислений",
      "Неизменяемый итоговый отчёт об оценке",
      "Зафиксированная биграммная модель",
      "Одни и те же целевые позиции",
    ]);
    for (const [term, definition] of Object.entries(expected)) {
      expect(sheet.terms.find((entry) => entry.term === term)?.definition).toBe(
        definition,
      );
    }
    const serialized = JSON.stringify(sheet);
    expect(serialized).not.toMatch(/проверяет роль и происхождение/i);
    expect(serialized).not.toMatch(/происхождение должно совпадать/i);
    expect(serialized).not.toMatch(/фикстур/i);
  });

  it("keeps the Chapter 39 fixed-example regression scope explicit in Russian", () => {
    const sheet = readLocalizedSheet("ru", "39-end-to-end-llm.json");
    expect(sheet.description).toBe(
      "Краткая памятка о декодерной LLM: авторегрессионная вероятность, зафиксированные роли данных, метрика по целевым позициям перекрывающихся окон, побитовое воспроизведение обучения, регрессионная проверка фиксированного примера, точное восстановление и KV-кэш.",
    );
    const expected = {
      "Полный процесс работы LLM":
        "Путь курса превращает зафиксированные документы в BPE-токены и каузальные пакеты, обучает и выбирает декодер до одной локальной оценки фиксированного примера, восстанавливает его и генерирует текст.",
      "Итоговая тестовая оценка, изолированная от выбора":
        "Один локальный проход после завершения выбора, чьи тестовые цели не могут обновить параметры или повлиять на выбор модели в пределах этого запуска; локальный счётчик доступа не доказывает независимость на уровне всего репозитория.",
      "Целевая позиция перекрывающегося окна":
        "Одна каузальная целевая позиция, заданная документом, началом окна с шагом 1 и положением внутри окна. Один переход внутри документа может входить в результат до четырёх раз; в этих позициях декодеру доступны один, два, три или четыре токена контекста.",
      "Среднее NLL и перплексия по позициям окон":
        "В главе 39 обе модели оценивают одни и те же 1744 целевые позиции перекрывающихся окон: NLL усредняется в натах на позицию окна, а его экспонента даёт безразмерную перплексию. Отдельная метрика оценивала бы каждый из 442 переходов внутри документов один раз, передавала бы декодеру максимально доступный каузальный префикс не длиннее четырёх токенов и использовала бы только распределение в последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся.",
      "Результат фиксированного примера для регрессионной проверки":
        "Известный результат, который повторно запускают для обнаружения изменений проверяемого поведения; в последующих запусках более низкое среднее NLL декодера по позициям окон сохраняется как условие регрессионной проверки, поэтому разница не является независимой оценкой способности модели обобщать и не доказывает превосходства архитектуры.",
    } as const;
    for (const [term, definition] of Object.entries(expected)) {
      expect(sheet.terms.find((entry) => entry.term === term)?.definition).toBe(
        definition,
      );
    }
    expect(JSON.stringify(sheet)).not.toMatch(/фикстур/i);
  });

  it("grounds the reviewed Chapter 1 Russian handoff terms in the natural lesson explanations", () => {
    const sheet = readLocalizedSheet("ru", "01-text-units.json");
    const lesson = readFileSync(
      resolve(root, "src/content/chapters/ru/01-text-units.mdx"),
      "utf8",
    ).replace(/\s+/g, " ");
    const expected = [
      {
        term: "Словарь",
        definition:
          "В этой главе — фиксированная учебная таблица, которая сопоставляет известным скалярным значениям Unicode однозначно заданные ID. В следующих главах сохраняется сам принцип соответствия, но единицы и ID будут другими.",
        lessonEvidence:
          "`Vocabulary` здесь — небольшая учебная реализация для сравнения, а не токенизатор из следующих глав.",
      },
      {
        term: "Неизвестный токен",
        definition:
          "В главе 1 — зарезервированный маркер для незнакомого скалярного значения. После замены на этот маркер исходное значение теряется. В BPE-токенизаторе следующих глав каждому возможному байту соответствует базовый токен, поэтому такой маркер для скалярных значений не используется.",
        lessonEvidence:
          "Каждому байту UTF-8 соответствует базовый токен, поэтому новый токенизатор не наследует правило главы 1",
      },
      {
        term: "Субсловный токенизатор",
        definition:
          "Токенизатор, обученные единицы которого могут представлять несколько соседних байтов. Это позволяет выбирать компромисс между размером словаря и длиной последовательности. В главах 3 и 4 для этого строится новый словарь на уровне байтов, а не расширяется таблица скалярных значений.",
        lessonEvidence:
          "обученные токены слияний смогут представлять последовательности из нескольких байтов",
      },
    ];

    for (const { term, definition, lessonEvidence } of expected) {
      expect(sheet.terms.find((entry) => entry.term === term)?.definition).toBe(
        definition,
      );
      expect(lesson).toContain(lessonEvidence);
    }
  });

  it("grounds the reviewed Chapter 3 Russian terms in the natural lesson explanations", () => {
    const sheet = readLocalizedSheet("ru", "03-learn-bpe-merges.json");
    const lesson = readFileSync(
      resolve(root, "src/content/chapters/ru/03-learn-bpe-merges.mdx"),
      "utf8",
    );
    const expected = [
      {
        term: "Кодирование пар байтов (BPE)",
        definition:
          "Метод токенизации, в котором обучение начинается с отдельных байтов, а каждый раунд добавляет правило слияния выбранной пары соседних токенов.",
        lessonEvidence: "Начальными токенами служат байты UTF-8.",
      },
      {
        term: "Пара-кандидат",
        definition:
          "Упорядоченная пара ID соседних токенов, которую можно выбрать для следующего правила слияния.",
        lessonEvidence: "пара с переставленными ID считается другим кандидатом",
      },
      {
        term: "Число вхождений пары-кандидата",
        definition:
          "Число соседних позиций с этой парой; при выборе правила учитываются в том числе перекрывающиеся позиции.",
        lessonEvidence: "при подсчёте учитываются перекрывающиеся вхождения",
      },
      {
        term: "Раунд слияния",
        definition:
          "Один шаг обучения: подсчитать пары-кандидаты, выбрать одну пару, назначить новому токену ID и применить правило замены.",
        lessonEvidence: "В каждом успешном раунде внутренний цикл",
      },
      {
        term: "Ранг слияния",
        definition:
          "Порядковый номер правила в таблице BPE при нумерации с нуля; правило с меньшим рангом применяется раньше.",
        lessonEvidence:
          "правила будут применяться к произвольным байтам UTF-8 по возрастанию ранга",
      },
      {
        term: "Детерминированный выбор при равной частоте",
        definition:
          "Принятое в этой главе правило: сначала сравнить левые числовые ID пар, а при их равенстве — правые, и выбрать меньшую пару.",
        lessonEvidence:
          "При равной частоте курс сравнивает пары лексикографически по числовым ID: сначала левые ID, затем правые.",
      },
      {
        term: "Замена без перекрытий",
        definition:
          "Проход слева направо, в котором каждый входной токен участвует не более чем в одной замене.",
        lessonEvidence:
          "один исходный токен нельзя использовать дважды в одном проходе",
      },
      {
        term: "Последовательность байтов токена",
        definition:
          "Точная последовательность исходных байтов, которую представляет исходный байтовый токен или токен, созданный слиянием.",
        lessonEvidence: "сохраняйте точную последовательность байтов вместе с",
      },
      {
        term: "Граница документа",
        definition:
          "Граница между документами, на которой при обучении BPE заканчивается соседство: токены из разных документов никогда не образуют одну пару-кандидат.",
        lessonEvidence: "никогда не считаются соседними",
      },
    ];

    expect(sheet.terms).toEqual(
      expected.map(({ term, definition }) => ({ term, definition })),
    );
    const normalizedLesson = lesson.replace(/\s+/g, " ");
    for (const { lessonEvidence } of expected) {
      expect(normalizedLesson).toContain(lessonEvidence);
    }
  });
});

describe("cheat-sheet ordering and page boundaries", () => {
  const terms = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      definition: `Definition ${index + 1}.`,
      term: `Term ${String(index + 1).padStart(2, "0")}`,
    }));

  it("sorts one copied array with locale collation and a deterministic tie-break", () => {
    const source = [
      { term: "zeta", definition: "Zeta definition." },
      { term: "embedding", definition: "Embedding definition." },
      { term: "Attention", definition: "Attention definition." },
      { term: "Alpha", definition: "Base alpha definition." },
      { term: "\u00c1lpha", definition: "Alpha definition." },
    ];
    const before = [...source];

    expect(sortCheatSheetTerms(source, "en").map(({ term }) => term)).toEqual([
      "Alpha",
      "\u00c1lpha",
      "Attention",
      "embedding",
      "zeta",
    ]);
    expect(source).toEqual(before);

    expect(
      sortCheatSheetTerms(
        [
          { term: "\u042f\u0434\u0440\u043e", definition: "One." },
          {
            term: "\u0410\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f",
            definition: "Two.",
          },
          {
            term: "\u0401\u043c\u043a\u043e\u0441\u0442\u044c",
            definition: "Three.",
          },
        ],
        "ru",
      ).map(({ term }) => term),
    ).toEqual([
      "\u0410\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f",
      "\u0401\u043c\u043a\u043e\u0441\u0442\u044c",
      "\u042f\u0434\u0440\u043e",
    ]);
  });

  it("uses an exact ten-term page size without loss or duplication", () => {
    expect(CHEAT_SHEET_PAGE_SIZE).toBe(10);

    for (const [count, expectedLengths] of [
      [10, [10]],
      [11, [10, 1]],
      [23, [10, 10, 3]],
    ] as const) {
      const source = terms(count);
      const pages = paginateCheatSheetTerms(source);
      expect(pages.map((page) => page.length)).toEqual(expectedLengths);
      expect(pages.flat().map(({ term }) => term)).toEqual(
        source.map(({ term }) => term),
      );
      expect(new Set(pages.flat().map(({ term }) => term)).size).toBe(count);
    }
  });
});

describe("cheat-sheet integration contract", () => {
  it("uses a separate strict content collection and one shared JavaScript dialog", () => {
    const config = readFileSync(resolve(root, "src/content.config.ts"), "utf8");
    const route = readFileSync(
      resolve(root, "src/pages/[locale]/course/[...slug].astro"),
      "utf8",
    );
    const component = readFileSync(
      resolve(root, "src/components/CheatSheet.astro"),
      "utf8",
    );

    expect(config).toContain("pattern: '**/*.json'");
    expect(config).toContain("const cheatSheets = defineCollection");
    expect(config).toContain("terms: z.array(cheatSheetTerm).min(5),");
    expect(config).not.toContain(".max(12)");
    expect(config).toContain(
      "export const collections = { chapters, cheatSheets }",
    );
    expect(route).toContain("await getCollection('cheatSheets')");
    expect(route).toContain("<CheatSheet sheet={cheatSheet.data} />");
    expect(component).toContain("<dialog");
    expect(component).toContain("aria-labelledby={titleId}");
    expect(component).toContain("aria-describedby={descriptionId}");
    expect(component).toContain('aria-haspopup="dialog"');
    expect(component).toContain("dialog.showModal()");
    expect(component).toContain(
      "sortCheatSheetTerms(sheet.terms, sheet.locale)",
    );
    expect(component).toContain("paginateCheatSheetTerms(sortedTerms)");
    expect(component).toContain("const isPaginated = termPages.length > 1;");
    expect(component).toContain(
      "{ 'cheat-sheet-dialog-paginated': isPaginated }",
    );
    expect(component).toContain("data-cheat-sheet-pagination");
    expect(component).toContain("data-cheat-sheet-page-status");
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain("role={isPaginated ? 'region' : undefined}");
    expect(component).toContain("tabindex={isPaginated ? '0' : undefined}");
    expect(component).toContain(
      "aria-describedby={isPaginated ? pageStatusId : undefined}",
    );
    expect(component).toContain(
      "grid-template-rows: auto minmax(0, 1fr) auto;",
    );
    const pageViewportStart = component.indexOf("data-cheat-sheet-pages");
    const descriptionStart = component.indexOf(
      '<p id={descriptionId} class="cheat-sheet-description">',
    );
    const termPagesStart = component.indexOf(
      "termPages.map((page, pageIndex)",
      pageViewportStart,
    );
    expect(pageViewportStart).toBeGreaterThan(-1);
    expect(descriptionStart).toBeGreaterThan(pageViewportStart);
    expect(termPagesStart).toBeGreaterThan(descriptionStart);
    expect(component).toContain("pageViewport.scrollTop = 0;");
    expect(component).toContain("if (dialog.open) dialog.scrollTop = 0;");
    const openHandler = component.slice(
      component.indexOf("trigger.addEventListener('click'"),
      component.indexOf("previous?.addEventListener('click'"),
    );
    expect(openHandler.indexOf("dialog.showModal();")).toBeLessThan(
      openHandler.indexOf("showPage(1);"),
    );
    expect(component).toContain("dialog.addEventListener('close'");
    expect(component).toContain("opener?.focus()");
    expect(component.match(/<dl class="cheat-sheet-terms">/g)).toHaveLength(1);
    expect(component).not.toContain("<details");
    expect(component).not.toContain("data-cheat-sheet-fallback");
    expect(component).not.toContain("fallbackSummary");
    expect(component).not.toContain("fallback.hidden");
    expect(component).not.toContain(".cheat-sheet-fallback");
    expect(component).not.toMatch(/client:|React|Vue|Svelte/);
  });

  it("indexes one sheet per existing localized non-orientation chapter", () => {
    const sheet = { data: readSheet("01-text-units.json") };
    const chapter = {
      data: { chapter_id: "01-text-units", locale: "en" as const },
    };

    expect(indexCheatSheets([chapter], [sheet]).get("en:01-text-units")).toBe(
      sheet,
    );
    expect(() => indexCheatSheets([chapter], [sheet, sheet])).toThrow(
      /duplicated/,
    );
    expect(() => indexCheatSheets([], [sheet])).toThrow(/does not match/);
    expect(() =>
      indexCheatSheets(
        [{ data: { ...chapter.data, chapter_kind: "orientation" as const } }],
        [sheet],
      ),
    ).toThrow(/Orientation/);

    const russianSheet = {
      data: readLocalizedSheet("ru", "01-text-units.json"),
    };
    expect(
      indexCheatSheets(
        [{ data: { chapter_id: "01-text-units", locale: "ru" as const } }],
        [russianSheet],
      ).get("ru:01-text-units"),
    ).toBe(russianSheet);
  });

  it("exposes complete interface copy for every published sheet locale", () => {
    const englishCopy = getCheatSheetCopy("en");
    expect(englishCopy).not.toBeNull();
    expect({
      closeLabel: englishCopy?.closeLabel,
      eyebrow: englishCopy?.eyebrow,
      nextLabel: englishCopy?.nextLabel,
      openLabel: englishCopy?.openLabel,
      paginationLabel: englishCopy?.paginationLabel,
      previousLabel: englishCopy?.previousLabel,
    }).toEqual({
      closeLabel: "Close cheat sheet",
      eyebrow: "Quick reference",
      nextLabel: "Next terms",
      openLabel: "Open cheat sheet",
      paginationLabel: "Cheat sheet term pages",
      previousLabel: "Previous terms",
    });
    expect(
      englishCopy?.pageStatus({
        currentPage: 2,
        endTerm: 12,
        pageCount: 2,
        startTerm: 11,
        totalTerms: 12,
      }),
    ).toBe("Terms 11\u201312 of 12; page 2 of 2");
    expect(
      englishCopy?.pageStatus({
        currentPage: 2,
        endTerm: 11,
        pageCount: 2,
        startTerm: 11,
        totalTerms: 11,
      }),
    ).toBe("Terms 11 of 11; page 2 of 2");

    const russianCopy = getCheatSheetCopy("ru");
    expect(russianCopy).not.toBeNull();
    expect({
      closeLabel: russianCopy?.closeLabel,
      eyebrow: russianCopy?.eyebrow,
      nextLabel: russianCopy?.nextLabel,
      openLabel: russianCopy?.openLabel,
      paginationLabel: russianCopy?.paginationLabel,
      previousLabel: russianCopy?.previousLabel,
    }).toEqual({
      closeLabel: "Закрыть справочник терминов",
      eyebrow: "Краткий справочник",
      nextLabel: "Следующие термины",
      openLabel: "Открыть справочник терминов",
      paginationLabel: "Страницы справочника терминов",
      previousLabel: "Предыдущие термины",
    });
    expect(
      russianCopy?.pageStatus({
        currentPage: 2,
        endTerm: 12,
        pageCount: 2,
        startTerm: 11,
        totalTerms: 12,
      }),
    ).toBe("Термины: 11\u201312 из 12; страница 2 из 2");
    expect(
      russianCopy?.pageStatus({
        currentPage: 2,
        endTerm: 11,
        pageCount: 2,
        startTerm: 11,
        totalTerms: 11,
      }),
    ).toBe("Термины: 11 из 11; страница 2 из 2");
  });
});
