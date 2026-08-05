// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync, readdirSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CHEAT_SHEET_PAGE_SIZE,
  getCheatSheetCopy,
  indexCheatSheets,
  paginateCheatSheetTerms,
  sortCheatSheetTerms,
  type CheatSheetData,
} from '../src/lib/cheat-sheets';

declare const process: { cwd(): string };

const root = process.cwd();
const contentRoot = resolve(root, 'src/content/cheat-sheets');
const RUSSIAN_ROLLOUT_THROUGH_CHAPTER = 39;

const expectedSheets = {
  '01-text-units': {
    file: '01-text-units.json',
    lesson: '01-text-units.mdx',
    title: 'Text units and vocabulary IDs',
    entries: [
      ['UTF-8 byte', 'scalar occupies two UTF-8 bytes here'],
      ['Unicode scalar value', 'Unicode scalar values'],
      ['Vocabulary', 'A deterministic scalar vocabulary'],
      ['Token ID', 'the token ID at sequence position'],
      ['Unknown token', 'unknown token <UNK>'],
      ['Reversible round trip', 'round trip is reversible for known units'],
      ['Grapheme cluster', 'user-perceived grapheme clusters'],
      ['Subword tokenizer', 'Modern subword methods'],
    ],
  },
  '02-corpus-partitions': {
    file: '02-corpus-partitions.json',
    lesson: '02-corpus-partitions.mdx',
    title: 'Corpus documents and frozen partitions',
    entries: [
      ['Corpus', 'six-document corpus'],
      ['Whole document', 'original whole document first'],
      ['Training partition', 'Only the training set may'],
      ['Validation partition', 'Validation may later guide choices'],
      ['Test partition', 'test remains sealed for the final report'],
      ['Disjoint split', 'three roles cover the entire corpus'],
      ['Holdout', 'fixed holdouts developed'],
      ['Data leakage', 'particular leakage path'],
      ['Provenance group', 'provenance group remains within one role'],
    ],
  },
  '03-learn-bpe-merges': {
    file: '03-learn-bpe-merges.json',
    lesson: '03-learn-bpe-merges.mdx',
    title: 'Learning deterministic BPE merges',
    entries: [
      ['Byte Pair Encoding (BPE)', 'family of repeated-pair procedures'],
      ['Adjacent-pair candidate', 'an ordered adjacent pair'],
      ['Candidate count', 'two candidate positions'],
      ['Merge round', 'For each round'],
      ['Merge rank', 'Rank 0 therefore selects'],
      ['Deterministic tie-break', 'smaller left and then smaller right'],
      ['Non-overlapping replacement', 'without overlap'],
      ['Byte expansion', 'byte expansions'],
      ['Document boundary', 'across the boundary'],
    ],
  },
  '04-apply-bpe-tokenizer': {
    file: '04-apply-bpe-tokenizer.json',
    lesson: '04-apply-bpe-tokenizer.mdx',
    title: 'Applying and reversing a BPE tokenizer',
    entries: [
      ['Byte-level BPE tokenizer', 'base alphabet of only 256 symbols'],
      ['Frozen merge rank', 'Rank is priority'],
      ['Canonical encoding', 'canonical encoding'],
      ['Content token', 'content token ID'],
      ['Control token', 'Document controls are a structural layer'],
      ['BOS and EOS', 'BOS and EOS appear only after encoding'],
      ['Content offset', 'shifted by two'],
      ['Byte fallback', 'One-byte fallback'],
      ['Byte-exact decoding', 'Guarantee exact bytes in one direction'],
      ['Strict UTF-8 view', 'separate strict view'],
    ],
  },
  '05-autoregressive-examples': {
    file: '05-autoregressive-examples.json',
    lesson: '05-autoregressive-examples.mdx',
    title: 'Building autoregressive input–target pairs',
    entries: [
      ['Autoregressive language model', 'An autoregressive language model predicts each token'],
      ['Input–target pair', 'input–target pairs that provide the correct'],
      ['One-token shift', 'Express the one-token shift with slices'],
      ['Context length', 'Choose context length'],
      ['Stride', 'The stride selects candidate starts'],
      ['Overlapping pairs', 'across overlapping pairs'],
      ['BOS and EOS boundary tokens', 'BOS and EOS boundary tokens'],
      ['Causal computation', 'causal computation may use only'],
      ['Causal mask', 'needs an explicit causal mask'],
    ],
  },
  '06-bigram-baseline': {
    file: '06-bigram-baseline.json',
    lesson: '06-bigram-baseline.mdx',
    title: 'From transition counts to a bigram model',
    entries: [
      ['Bigram model', 'This is a **bigram** model'],
      ['Transition count', 'number of observed transitions'],
      ['Context', 'one current token'],
      ['Probability row', 'probability distribution'],
      ['Maximum-likelihood estimate (MLE)', 'maximum-likelihood estimate (MLE)'],
      ['Unobserved successor', 'unobserved successor after `A`'],
      ['Unseen context', 'unseenContext'],
      ['Add-one smoothing', 'Add-one smoothing'],
      ['Pseudocount', 'positive pseudocount added'],
    ],
  },
  '07-language-model-metrics': {
    file: '07-language-model-metrics.json',
    lesson: '07-language-model-metrics.mdx',
    title: 'From assigned probability to perplexity',
    entries: [
      ['Assigned probability', 'Assigned probability'],
      ['Surprise', 'define its **surprise**'],
      ['Sequence likelihood', 'sequence likelihood'],
      ['Negative log-likelihood (NLL)', 'negative log-likelihood'],
      ['Mean NLL', 'mean negative log-likelihood (mean NLL)'],
      ['Length normalization', 'length normalization missing'],
      ['Nat', 'nats per target'],
      ['Perplexity', 'Perplexity is'],
      ['Empirical cross-entropy', 'empirical cross-entropy'],
      ['Argmax', 'argmax alone'],
    ],
  },
  '08-tensor-storage': {
    file: '08-tensor-storage.json',
    lesson: '08-tensor-storage.mdx',
    title: 'From tensor coordinates to one flat buffer',
    entries: [
      ['Tensor', 'A tensor gives'],
      ['Shape', 'For shape [2,2,3]'],
      ['Axis', 'It has three axes'],
      ['Rank', 'its **rank** is'],
      ['Extent', 'Axis `1` has extent'],
      ['Coordinate', 'coordinate `[1,0,2]`'],
      ['Row-major order', 'In row-major order'],
      ['Element stride', 'element stride'],
      ['Offset', 'Offset `8` is'],
      ['Contiguous storage', 'contiguous row-major buffer'],
    ],
  },
  '09-tensor-views': {
    file: '09-tensor-views.json',
    lesson: '09-tensor-views.mdx',
    title: 'Shared views and explicit tensor copies',
    entries: [
      ['Tensor view', 'shared tensor views'],
      ['Reshape', 'First, reshape the view'],
      ['Transpose', 'transpose axes `0` and `1`'],
      ['Axis permutation', 'axis permutation'],
      ['Slice', 'The frozen inner-axis slice'],
      ['Base offset', 'base offset'],
      ['Row-major contiguity', 'row-major contiguous'],
      ['Materialization', 'Materialization is the operation'],
      ['Query, key, and value (Q/K/V)', 'query, key, and value matrices'],
      ['Attention head', 'parallel heads'],
    ],
  },
  '10-broadcasting-reductions': {
    file: '10-broadcasting-reductions.json',
    lesson: '10-broadcasting-reductions.mdx',
    title: 'Align compatible shapes, reduce a named axis',
    entries: [
      ['Broadcasting', 'Broadcasting and mean reduction'],
      ['Trailing-axis alignment', 'trailing-axis alignment'],
      ['Singleton axis', 'singleton and missing leading dimensions'],
      ['Elementwise operation', 'elementwise operations'],
      ['Reduction', 'A reduction is also not'],
      ['Reduction axis', 'explicit zero-based reduction axis'],
      ['Keep dimension', 'Keep dimension'],
      ['Feature axis', 'final feature axis'],
      ['Attention softmax', 'attention softmax'],
      ['Feature normalization', 'feature normalization'],
    ],
  },
  '11-matrix-multiplication': {
    file: '11-matrix-multiplication.json',
    lesson: '11-matrix-multiplication.mdx',
    title: 'Multiply rows by columns, then reuse batches',
    entries: [
      ['Matrix multiplication', 'Checked matrix multiplication'],
      ['Activation matrix', 'The activation matrix'],
      ['Projection weight', 'projection weight'],
      ['Output cell', 'One output cell'],
      ['Inner dimension', 'inner dimension'],
      ['Contraction', 'row-column contraction'],
      ['Batched matrix multiplication', 'batched matrix multiplication'],
      ['Batch broadcasting', 'batch broadcasting'],
      ['Logical transpose', 'logical transpose flags'],
      ['Attention score', 'attention scores'],
    ],
  },
  '12-stable-softmax': {
    file: '12-stable-softmax.json',
    lesson: '12-stable-softmax.mdx',
    title: 'Turn extreme logits into stable probabilities',
    entries: [
      ['Logit', 'These values are logits: scores before normalization, not probabilities.'],
      ['Softmax', "The chapter's stable softmax formula is:"],
      ['Maximum shift', 'The maximum shift removes a'],
      ['Normalization group', 'An axis divides a tensor into independent normalization groups.'],
      ['Class axis', 'class axis gives group shape'],
      ['Log-sum-exp', 'Log-sum-exp adds the maximum back'],
      ['Log-softmax', 'Log-softmax keeps the safer shifted difference'],
      ['Indexed NLL', 'Indexed NLL selects one target'],
      ['Overflow', 'directly exponentiating unshifted large logits can overflow'],
      ['Underflow', 'negative extremes become zero divided by zero'],
    ],
  },
  '13-gradient-checking': {
    file: '13-gradient-checking.json',
    lesson: '13-gradient-checking.mdx',
    title: 'Check gradients before trusting backpropagation',
    entries: [
      ['Gradient check', 'Start with a small scalar gradient check:'],
      ['Central difference', 'The central-difference formula is:'],
      ['Numerical derivative', 'predicts a numerical derivative of'],
      ['Analytic gradient', 'the analytic derivative is'],
      ['Step size', 'the six-step scan'],
      ['Truncation error', 'truncation error of order'],
      ['Rounding error', 'rounding has raised the displayed result'],
      ['Scale-aware error', 'passes exactly when scaled error is no greater than'],
      ['Tolerance', 'declared finite nonnegative tolerance'],
      ['Deterministic coordinate sampling', 'No random generator or hidden state is involved.'],
    ],
  },
  '14-scalar-autodiff': {
    file: '14-scalar-autodiff.json',
    lesson: '14-scalar-autodiff.mdx',
    title: 'Accumulate gradients through a scalar graph',
    entries: [
      ['Computation graph', 'One scalar value stored in the computation graph.'],
      ['Reverse mode', 'Baydin et al. describe reverse mode as recording dependencies'],
      ['Adjoint', 'pass-local adjoint'],
      ['Operand-use edge', 'operand-use edges'],
      ['Local derivative', 'local derivative'],
      ['Reverse topological order', 'topological list is traversed in reverse'],
      ['Gradient accumulation', 'Accumulation across separate backward calls'],
      ['Backward pass', 'Every backward call computes a fresh pass'],
      ['Detach', 'detached branch has no edge to the original'],
      ['Zeroing gradients', 'clears every reachable tracked node'],
    ],
  },
  '15-tensor-autodiff-core': {
    file: '15-tensor-autodiff-core.json',
    lesson: '15-tensor-autodiff-core.mdx',
    title: 'Reverse tensor operations with edge-local VJPs',
    entries: [
      ['Tensor autodiff tape', 'reusable eight-node tensor tape'],
      ['Vector-Jacobian product (VJP)', 'Apply one edge-local VJP instead of building a Jacobian'],
      ['Jacobian', 'The conceptual Jacobian'],
      ['Operand-use edge', 'operand-use edge'],
      ['Upstream adjoint', 'fresh upstream adjoint'],
      ['Parent adjoint', 'fresh parent-adjoint accumulator'],
      ['Broadcast reversal', 'Explicit broadcast sums missing'],
      ['Reduction VJP', 'reductions save their axis, retained-dimension choice, and input extent'],
      ['Non-scalar seed', 'non-scalar seed'],
      ['Graph retention', 'A retained second pass recomputes fresh intermediates'],
    ],
  },
  '16-model-autodiff-ops': {
    file: '16-model-autodiff-ops.json',
    lesson: '16-model-autodiff-ops.mdx',
    title: 'Reverse the operations that turn token IDs into loss',
    entries: [
      ['Embedding table', 'three-row embedding table'],
      ['Row gather', 'Row gather materializes'],
      ['Token ID', 'four token IDs'],
      ['Repeated selector', 'Repeated selectors therefore accumulate'],
      ['Scatter-add', 'embedding scatter-add'],
      ['Matrix VJP', 'Matrix VJPs transpose'],
      ['SiLU', "SiLU's derivative at zero"],
      ['Log-softmax', 'log-softmax produces'],
      ['Indexed mean NLL', 'combined indexed mean NLL'],
      ['Loss-logit gradient', 'target-logit gradient'],
    ],
  },
  '17-parameter-initialization': {
    file: '17-parameter-initialization.json',
    lesson: '17-parameter-initialization.mdx',
    title: 'Initialize trainable weights reproducibly',
    entries: [
      ['Parameter initialization', 'Initialize a projection of shape'],
      ['Hidden-unit symmetry', "preserves the hidden units' equality"],
      ['Fan-in', 'fan-in'],
      ['Fan-out', 'fan-out'],
      ['Xavier-style initialization', 'Xavier-style rule'],
      ['Target variance', 'target variance'],
      ['Uniform bound', 'uniform bound'],
      ['Seed', 'The seed is the raw state'],
      ['Reproducibility', 'The same seed, shape, fan values, and construction order'],
      ['Pseudorandom generator', 'deterministic pseudorandom'],
    ],
  },
  '18-token-embeddings': {
    file: '18-token-embeddings.json',
    lesson: '18-token-embeddings.mdx',
    title: 'Give token IDs trainable vectors',
    entries: [
      ['Token embedding', 'Transformers keep learned token embeddings'],
      ['Embedding table', 'trainable token table'],
      ['Vocabulary size', 'vocabulary size'],
      ['Embedding width', 'embedding width'],
      ['Token ID', 'integer token ID'],
      ['Direct row lookup', 'direct row lookup'],
      ['One-hot vector', 'One-hot vectors make token identity explicit'],
      ['Gather operation', 'calls the Chapter 16 gather operation'],
      ['Repeated-token gradient', 'repeated-token gradients add'],
      ['Scatter-add', 'scatter-add algorithm'],
    ],
  },
  '19-linear-layers': {
    file: '19-linear-layers.json',
    lesson: '19-linear-layers.mdx',
    title: "Mix each token's features with one learned projection",
    entries: [
      ['Linear layer', 'linear layer'],
      ['Learned projection', 'learned projection'],
      ['Input feature width', 'input feature width'],
      ['Output feature width', 'output feature width'],
      ['Leading axes', 'leading axes'],
      ['Weight matrix', 'trainable matrix'],
      ['Bias', 'optional named bias'],
      ['Affine map', 'affine rather than strictly linear'],
      ['Parameter sharing', 'Because every position shares'],
      ['Bias-free projection', 'bias-free policy'],
    ],
  },
  '20-swiglu-feed-forward': {
    file: '20-swiglu-feed-forward.json',
    lesson: '20-swiglu-feed-forward.mdx',
    title: 'Let one learned branch gate another',
    entries: [
      ['SwiGLU', 'bias-free SwiGLU sublayer'],
      ['Position-wise feed-forward network', 'feed-forward network separately at every sequence position'],
      ['Gate projection', 'owns gate, up, and down'],
      ['Up projection', 'second projection before the output projection'],
      ['Down projection', 'down projection'],
      ['SiLU', 'SiLU uses a sigmoid internally'],
      ['Sigmoid', 'sigmoid internally'],
      ['Elementwise product', 'two projected branches meet through elementwise multiplication'],
      ['Feed-forward width', 'input, branch, and output feature widths'],
      ['Position independence', 'SwiGLU transforms positions independently'],
    ],
  },
  '21-mini-batches': {
    file: '21-mini-batches.json',
    lesson: '21-mini-batches.mdx',
    title: 'Count real tokens in every mini-batch',
    entries: [
      ['Causal window', 'separate causal windows'],
      ['Mini-batch', 'mini-batches of fixed-length rows'],
      ['Requested batch capacity', 'With requested capacity'],
      ['Smaller final batch', 'The final batch stays smaller'],
      ['Target occurrence', 'target occurrences'],
      ['Actual target-token denominator', 'actual target-token denominator'],
      ['Token-mean gradient', 'token-mean loss plus gradient coordinates'],
      ['Raw accumulator', 'raw accumulators'],
      ['Token-weighted mean', 'token-weighted mean'],
      ['No-padding batch', 'no padding'],
    ],
  },
  '22-adamw': {
    file: '22-adamw.json',
    lesson: '22-adamw.mdx',
    title: 'Keep decay out of the gradient moments',
    entries: [
      ['AdamW', 'AdamW instead moves the shrinkage term outside'],
      ['First gradient moment', 'first raw gradient moment'],
      ['Second gradient moment', 'second raw moment tracks recent squared magnitude'],
      ['Bias correction', 'corrects their early zero-initialization bias'],
      ['Adaptive update', 'adaptive delta'],
      ['Decoupled weight decay', 'moves parameter-proportional decay outside the gradient'],
      ['Learning rate', 'is the learning rate'],
      ['Numerical stabilizer', 'stabilizes the adaptive denominator'],
      ['Decay group', 'decay-group parameter'],
      ['No-decay group', 'no-decay parameter'],
    ],
  },
  '23-neural-ngram': {
    file: '23-neural-ngram.json',
    lesson: '23-neural-ngram.mdx',
    title: 'Train a fixed-context neural language model',
    entries: [
      ['Neural n-gram', 'The neural n-gram is'],
      ['Fixed context', 'a concatenated fixed context'],
      ['Token embedding', 'maps a token ID to'],
      ['Context concatenation', 'concatenate those rows in chronological order'],
      ['SwiGLU hidden layer', 'SwiGLU receives'],
      ['Vocabulary projection', 'a vocabulary projection for next-token prediction'],
      ['Next-token logit', 'next-token logits'],
      ['Indexed mean loss', 'The indexed mean loss is'],
      ['Held-out validation loss', 'held-out validation loss falls'],
      ['Greedy generation', 'greedy generation'],
    ],
  },
  '24-residual-connections': {
    file: '24-residual-connections.json',
    lesson: '24-residual-connections.mdx',
    title: 'Keep an identity path around each learned update',
    entries: [
      ['Residual connection', 'The entire residual connection is'],
      ['Identity path', 'identity path'],
      ['Residual branch', 'learned branch mapping'],
      ['Residual stream', 'residual stream'],
      ['Learned update', 'learned update'],
      ['Exact-shape merge', 'exact-shape merge'],
      ['Vector-Jacobian product', 'vector-Jacobian product'],
      ['Upstream adjoint', 'upstream output adjoint'],
      ['Gradient accumulation', 'gradient contributions accumulate'],
      ['Branch Jacobian', 'branch Jacobian'],
    ],
  },
  '25-rmsnorm': {
    file: '25-rmsnorm.json',
    lesson: '25-rmsnorm.mdx',
    title: 'Normalize feature scale without centering',
    entries: [
      ['RMSNorm', 'For one final-axis vector, RMSNorm is'],
      ['Mean square', 'compute the mean square'],
      ['Reciprocal RMS', 'The reciprocal RMS'],
      ['Root-mean-square scale', 'root-mean-square scale'],
      ['Learned gain', 'The learned gain'],
      ['Epsilon stabilizer', 'stabilizes the reciprocal square root'],
      ['Final feature axis', 'final feature axis'],
      ['Approximate scale invariance', 'scale-invariant away from zero'],
      ['Pre-normalization', 'A pre-normalized decoder'],
      ['LayerNorm', 'LayerNorm centers the anchor'],
    ],
  },
  '26-qkv-projections': {
    file: '26-qkv-projections.json',
    lesson: '26-qkv-projections.mdx',
    title: 'Create query, key, and value views',
    entries: [
      ['Query, key, and value projections', 'query, key, and value projections'],
      ['Hidden-state tensor', 'hidden-state tensor entering self-attention'],
      ['Model width', 'is the input feature width'],
      ['Head width', 'is the output width for this one-head chapter'],
      ['Query view', 'is the query view'],
      ['Key view', 'is the key view'],
      ['Value view', 'is the value view'],
      ['Self-attention', 'define self-attention over one sequence'],
      ['Bias-free projection', 'three independent bias-free projections'],
      ['Independent projection weights', 'are independent learned weights'],
    ],
  },
  '27-self-attention': {
    file: '27-self-attention.json',
    lesson: '27-self-attention.mdx',
    title: 'Compute one unmasked self-attention head',
    entries: [
      ['Scaled dot-product self-attention', 'scaled dot-product attention'],
      ['Unmasked attention', 'unmasked scaled dot-product attention head'],
      ['Query', 'one query row per token position'],
      ['Key', 'candidate key rows'],
      ['Value', 'value rows whose content is mixed'],
      ['Attention score', 'score row'],
      ['Query/key width', 'shared query/key width'],
      ['Square-root scaling', 'square-root scaling'],
      ['Row-wise softmax', 'Softmax runs across key positions independently for each query'],
      ['Attention weight', 'a retrieval weight'],
      ['Weighted value mixture', 'weighted value mixture'],
    ],
  },
  '28-causal-masking': {
    file: '28-causal-masking.json',
    lesson: '28-causal-masking.mdx',
    title: 'Block future keys with a causal mask',
    entries: [
      ['Causal mask', 'each query attends only to its available prefix'],
      ['Inclusive diagonal', 'The diagonal is deliberately allowed'],
      ['Additive mask', 'use the additive mask'],
      ['Query row', 'For query row'],
      ['Key column', 'key column'],
      ['Allowed prefix', 'Each allowed prefix keeps the full'],
      ['Blocked future key', 'after the future keys are excluded'],
      ['Causal softmax', 'causal_softmax'],
      ['Shifted decoder input', 'Decoder inputs are shifted by one target position'],
      ['Prefix invariance', 'prefix-invariance result'],
      ['Position signal', 'absolute or relative position signal'],
    ],
  },
  '29-rope': {
    file: '29-rope.json',
    lesson: '29-rope.mdx',
    title: 'Turn query and key pairs with RoPE',
    entries: [
      ['Rotary position embedding (RoPE)', 'geometry to query-key scores'],
      ['Adjacent coordinate pair', 'pairs coordinates'],
      ['Rotation matrix', 'rotation matrix'],
      ['Pair frequency', 'one adjacent coordinate pair and its frequency'],
      ['Frequency base', 'positive finite base'],
      ['Absolute position', 'rotations receive absolute positions'],
      ['Signed relative position', 'signed position of the key relative to the query'],
      ['Equal-shift invariance', 'adding the same offset to both positions'],
      ['Orthogonal rotation', 'preserves squared norm and therefore norm'],
      ['Query-key rotation', 'values $V$ are not rotated here'],
      ['Causal mask', 'mask still blocks future keys'],
    ],
  },
  '30-multi-head-attention': {
    file: '30-multi-head-attention.json',
    lesson: '30-multi-head-attention.mdx',
    title: 'Keep attention head-local until output mixing',
    entries: [
      ['Multi-head causal self-attention', 'complete multi-head causal self-attention layer'],
      ['Packed Q/K/V projections', 'first lets every $W_i^Q$, $W_i^K$, and $W_i^V$ read the whole input row'],
      ['Model width', 'input and output width of the complete layer'],
      ['Head count', 'number of independently normalized attention heads'],
      ['Head width', 'is the width of one head; it is even here'],
      ['Head split', 'transpose then produce'],
      ['Per-head RoPE', 'apply RoPE only to its query and key rows'],
      ['Per-head causal attention', "softmax runs separately over each head's key"],
      ['Head output', "is head $i$'s weighted value mixture"],
      ['Head concatenation', 'it does not normalize or mix them'],
      ['Output projection', 'only multiplication by $W_O$ permits'],
    ],
  },
  '31-decoder-block': {
    file: '31-decoder-block.json',
    lesson: '31-decoder-block.mdx',
    title: 'Compose a pre-norm decoder block in exact order',
    entries: [
      ['Pre-normalized decoder block', 'pre-normalized decoder block'],
      ['Residual stream', 'model-width residual stream entering the block'],
      ['Attention RMSNorm', 'Attention RMSNorm input'],
      ['Causal multi-head attention', 'causal multi-head attention'],
      ['First residual merge', 'first residual merge'],
      ['Feed-forward RMSNorm', 'feed-forward RMSNorm'],
      ['SwiGLU feed-forward branch', 'SwiGLU feed-forward branch'],
      ['Second residual merge', 'second residual merge'],
      ['Identity path', 'identity path'],
      ['Post-norm order', 'post-norm order'],
    ],
  },
  '32-decoder-model': {
    file: '32-decoder-model.json',
    lesson: '32-decoder-model.mdx',
    title: 'Trace one tied table through a decoder stack',
    entries: [
      ['Decoder stack', 'one decoder stack'],
      ['Decoder depth', 'decoder depth'],
      ['Distinct decoder blocks', 'Two distinct decoder blocks'],
      ['Embedding lookup', 'Embedding lookup'],
      ['Final RMSNorm', 'Final RMSNorm'],
      ['Weight tying', 'Weight tying is stronger than equal initialization'],
      ['Tied projection', 'Tied projection'],
      ['Vocabulary logits', 'vocabulary logits'],
      ['Mean indexed negative log likelihood', 'mean indexed negative log likelihood'],
      ['Prefix invariance', 'prefix invariance'],
      ['Tied gradient accumulation', 'adds both contributions on the same leaf'],
    ],
  },
  '33-training-selection': {
    file: '33-training-selection.json',
    lesson: '33-training-selection.mdx',
    title: 'Select a decoder with validation checkpoints',
    entries: [
      ['Training mini-batch', 'next-token loss for training mini-batch'],
      ['Partition roles', 'only `Validation` may select a state, while `Test` is rejected here'],
      ['Learning-rate schedule', 'All eight steps execute. Validation does not stop the run early.'],
      ['Raw gradient', 'every finite named-parameter gradient coordinate before clipping'],
      ['Global-norm clipping', 'applies it to every coordinate'],
      ['Clipped gradient', 'globally clipped gradient consumed by AdamW'],
      ['AdamW update', 'parameter and moment states advance together'],
      ['Optimizer moment state', 'continues the existing moments and step counter'],
      ['Graph-free validation loss', 'never differentiated and never updates the'],
      ['Checkpoint set', 'set of measured checkpoint indices'],
      ['Earliest validation minimum', 'earliest measured validation minimum'],
      ['Token-weighted mean', 'Validation averages by predicted-token count, not by number of batches'],
    ],
  },
  '34-final-evaluation': {
    file: '34-final-evaluation.json',
    lesson: '34-final-evaluation.mdx',
    title: 'Freeze choices before one final test report',
    entries: [
      ['Validation-selected checkpoint', 'validation-selected checkpoint index'],
      ['Frozen selected state', 'frozen validation-selected decoder'],
      ['Single-use test evaluation boundary', 'test-only gate'],
      ['Final test evaluation', 'before test evaluation'],
      ['Token-weighted mean NLL', 'token-weighted mean negative log-likelihood'],
      ['Perplexity', 'test perplexity'],
      ['Aligned target slot', 'aligned target slots'],
      ['Evaluation provenance', 'EvaluationProvenance'],
      ['No-grad evaluation', 'existing no-grad'],
      ['Frozen final evaluation report', 'immutable report'],
      ['Frozen bigram', 'Frozen bigram'],
      ['Like-for-like targets', 'like-for-like targets'],
    ],
  },
  '35-checkpoints': {
    file: '35-checkpoints.json',
    lesson: '35-checkpoints.mdx',
    title: 'Save every state, resume exactly',
    entries: [
      ['Versioned decoder checkpoint', 'versioned decoder checkpoint'],
      ['Checkpoint schema', 'application schema for tokenizer'],
      ['Same-step boundary', 'parameters and AdamW state describe one common'],
      ['AdamW optimizer state', 'named AdamW moment tensors, parameter groups, step'],
      ['Continuation RNG state', 'continuation stream for later sampling'],
      ['Checkpoint payload record', 'ordered payload records'],
      ['Checkpoint record descriptor', 'A descriptor stores role, name, dtype, shape, absolute offset, and byte length'],
      ['Checkpoint payload offset', 'absolute start offset of record'],
      ['Canonical checkpoint encoding', 'Encoding the same state twice produces'],
      ['Checkpoint integrity checksum (FNV-1a)', 'FNV-1a detects accidental corruption; it does not authenticate'],
      ['Exact round trip', 'exact round trip and resumed update'],
      ['Exact resumed update', 'one equal resumed update'],
      ['Atomic checkpoint replacement', 'atomic replacement under the supported'],
    ],
  },
  '36-temperature-top-k': {
    file: '36-temperature-top-k.json',
    lesson: '36-temperature-top-k.mdx',
    title: 'Shape a stable top-k distribution, then draw once',
    entries: [
      ['Temperature', 'finite positive temperature'],
      ['Stable ranking', 'stable descending-logit order'],
      ['Top-k candidate set', 'Filter the candidate set, then renormalize'],
      ['Tie-breaking rule', 'equal logits ordered by ascending token ID'],
      ['Top-k renormalization', 'after renormalization'],
      ['Max-shifted softmax', 'max-shifted normalization'],
      ['Removed-token probability', 'Removed IDs keep exact probability $0$'],
      ['Categorical draw', 'categorical draw acts only after both decisions'],
      ['Half-open sampling interval', 'half-open interval'],
      ['Greedy decoding', 'Greedy decoding is therefore a separate policy'],
      ['Stochastic top-1', 'Stochastic $k=1$'],
      ['RNG-state replay', 'random-generator state'],
    ],
  },
  '37-incremental-attention': {
    file: '37-incremental-attention.json',
    lesson: '37-incremental-attention.mdx',
    title: 'Keep the prefix, project only the new row',
    entries: [
      ['Incremental multi-head attention', 'incremental multi-head self-attention'],
      ['Layer-bound KV cache', 'one layer-bound KV cache'],
      ['Absolute RoPE position', 'absolute RoPE position $2$'],
      ['Rotated key', 'one rotated key row'],
      ['Unrotated value', 'one unrotated value row'],
      ['Current query', 'there is no query cache'],
      ['Logical cache length', 'logical cache length'],
      ['Cache capacity', 'cache capacity'],
      ['Candidate key/value pair', 'one-row candidate pair'],
      ['Full-prefix reference', 'full-prefix reference'],
      ['Projection reuse', 'reuses $3$ earlier key rows'],
      ['Transactional cache update', 'Only a fully assembled result permits the key/value copy and length increment'],
    ],
  },
  '38-cached-generation': {
    file: '38-cached-generation.json',
    lesson: '38-cached-generation.mdx',
    title: 'Prefill once, then decode one token at a time',
    entries: [
      ['Model-wide KV cache', 'Model-wide cached generation prefills one independent cache per decoder block'],
      ['Per-layer KV cache', 'one logical K/V prefix per block'],
      ['Prompt prefill', 'Prefill sends both prompt positions through both blocks'],
      ['One-token decode', 'one-token decoder calls'],
      ['Complete-prefix reference', 'complete-prefix references'],
      ['Newest-logit equivalence', 'newest-position logits agree with complete-prefix references within'],
      ['Retained prefix length', 'current retained prefix length'],
      ['Attention-score work', 'attention-score work'],
      ['Context-limit stop', 'context-limit stops before decoding it'],
      ['EOS stop', 'EOS is returned as the selected token, and no later logits are needed.'],
      ['Coherent cache commit', 'layer caches, common length, phase counts, and score-cell counts'],
      ['Cached-generation replay', 'resets and replays'],
      ['Cache reset', 'Reset clears logical length, phase, and work counters'],
    ],
  },
  '39-end-to-end-llm': {
    file: '39-end-to-end-llm.json',
    lesson: '39-end-to-end-llm.mdx',
    title: 'Run the whole tiny LLM',
    entries: [
      ['End-to-end LLM pipeline', 'Every course component now participates in one functional program'],
      ['Decoder-only LLM', 'decoder-only language model'],
      ['Frozen document split', 'frozen document partitions'],
      ['Training-only BPE', 'training-only BPE'],
      ['Causal window', 'causal windows'],
      ['Bitwise training replay', 'compares every training event'],
      ['Validation-selected state', 'validation fixes the selected state'],
      ['Selection-isolated final test evaluation', 'selection-isolated final evaluation'],
      ['Frozen alpha-one bigram baseline', 'alpha-one bigram from the same training tokens'],
      ['Same-target test-loss comparison', 'identical test-reserved targets'],
      ['Exact checkpoint round trip', 'checkpoint bytes and state round-trip exactly'],
      ['Exact logit probe', 'the separate At probe reproduces logits bit for bit'],
      ['KV-cached generation', 'cached and complete-prefix decisions match'],
      ['Joint sequence probability', 'The sequence probability'],
      ['Autoregressive factorization', 'The factorization is a causal promise'],
      ['Next-token conditional distribution', 'generation samples one new $z_t$ from the conditional distribution'],
    ],
  },
} as const;

const expectedRussianChapterIds = Object.keys(expectedSheets).slice(
  0,
  RUSSIAN_ROLLOUT_THROUGH_CHAPTER,
);

const exactDefinitions = {
  '12-stable-softmax': {
    Underflow: 'A finite-precision effect where a tiny magnitude becomes subnormal or rounds to zero.',
  },
  '15-tensor-autodiff-core': {
    'Reduction VJP': 'A reverse rule that reinserts and broadcasts a reduced axis, dividing by its extent for a mean.',
  },
  '16-model-autodiff-ops': {
    'Indexed mean NLL': 'Average negative log-likelihood over examples or token positions, selecting one target class in each row.',
    'Loss-logit gradient': 'Gradient of mean token loss with respect to every class logit in each row.',
  },
  '19-linear-layers': {
    'Affine map': 'A matrix transformation followed by addition of a fixed or trainable bias vector.',
  },
  '27-self-attention': {
    'Attention weight': 'A normalized retrieval coefficient for one query-key pair, not confidence in correctness.',
  },
  '28-causal-masking': {
    'Causal mask': 'An attention visibility rule allowing each query to use its own key and all earlier keys, but no later keys.',
    'Shifted decoder input': 'A training input offset by one target position so the allowed diagonal contains an earlier known token, not the predicted target.',
    'Position signal': 'Separate absolute or relative information that distinguishes token order; the causal mask provides visibility, not position.',
  },
  '29-rope': {
    'Absolute position': "The token index supplied to RoPE when determining each pair's local angle.",
    'Signed relative position': 'The key position minus the query position, preserving direction rather than only distance.',
    'Query-key rotation': 'RoPE rotates queries and keys while leaving value vectors unrotated in this lesson.',
    'Causal mask': 'The separate visibility rule blocking future key positions independently of RoPE geometry.',
  },
  '30-multi-head-attention': {
    'Multi-head causal self-attention': 'An attention layer that computes separately normalized causal attention in several projected head views before concatenation and output mixing.',
    'Packed Q/K/V projections': "Three dense model-width maps applied before the head split; every head's output columns can read and mix all input features.",
    'Model width': "The feature count of the complete layer's input and output, restored after all head outputs are concatenated.",
    'Head count': 'The number of independently normalized attention heads, required here to be nonzero and divide model width exactly.',
    'Head width': 'The feature count inside one head, equal to model width divided by head count and even for this RoPE design.',
    'Head split': 'A reshape and transpose of projected queries, keys, and values into a head axis, performed only after their dense projections.',
    'Per-head RoPE': 'Pairwise position rotations applied independently inside each head to queries and keys, while values remain unrotated.',
    'Per-head causal attention': "Each head's masked scaled-score table, row softmax over key positions, and weighted value mixture, normalized independently of other heads.",
    'Head output': "The weighted mixture of unrotated value rows produced by one head using that head's causal attention probabilities.",
    'Head concatenation': 'A parameter-free join of completed head outputs along the final feature axis that restores model width without averaging or mixing.',
    'Output projection': 'The learned map after concatenation that can recombine completed head features, while earlier dense query, key, and value maps may already mix input features.',
  },
  '31-decoder-block': {
    'Pre-normalized decoder block': "A block that normalizes each sublayer input, runs its transformation, then adds the result to that branch's entering residual stream.",
    'Residual stream': 'A same-shaped model-width tensor updated by each branch while preserving a direct identity route.',
    'Attention RMSNorm': 'The first independently parameterized normalization, applied to the block input before causal attention.',
    'Causal multi-head attention': 'The token-mixing first branch that attends only to the current and earlier token positions.',
    'First residual merge': 'The addition of causal-attention output to the unchanged block input, producing the intermediate stream.',
    'Feed-forward RMSNorm': 'The second independently parameterized normalization, applied to the intermediate stream before SwiGLU.',
    'SwiGLU feed-forward branch': 'The per-token feature transformation whose model-width output returns to the second residual merge.',
    'Second residual merge': 'The addition of the SwiGLU output to the unchanged intermediate stream, producing the block output.',
    'Identity path': "A bypass that carries a branch's entering residual value unchanged around its learned transformation.",
    'Post-norm order': 'The contrasting layout that performs a residual merge before applying LayerNorm to the merged value.',
  },
  '32-decoder-model': {
    'Decoder stack': 'The ordered sequence of zero or more causal decoder blocks between token lookup and final normalization.',
    'Decoder depth': 'The configured number of repeated decoder blocks; zero is valid and makes the empty block composition the identity.',
    'Distinct decoder blocks': 'Repeated blocks with the same configuration but separately owned parameters, so matching structure does not imply shared weights.',
    'Embedding lookup': 'Gathering one row from the vocabulary-by-feature table for each input token ID, producing model-width feature vectors.',
    'Final RMSNorm': 'The independently parameterized learned-gain normalization applied after the entire block stack, including at zero depth.',
    'Weight tying': 'Using one parameter table for both token lookup and vocabulary scoring, not two separate tables that merely start with equal values.',
    'Tied projection': 'Multiplying final hidden states by a differentiable transpose view of the embedding table instead of a separate output-head parameter.',
    'Vocabulary logits': 'The unnormalized output scores over every vocabulary item at each batch and token position, distinct from the scalar training loss.',
    'Mean indexed negative log likelihood': "The scalar loss formed by selecting each target token's negative log probability and averaging over all batch-position pairs.",
    'Prefix invariance': 'The causal guarantee that changing only a later token leaves every earlier logit row bitwise unchanged.',
    'Tied gradient accumulation': "Reverse-mode addition of the table's lookup-role gradient and output-role gradient onto the one shared parameter leaf.",
  },
  '33-training-selection': {
    'Training mini-batch': 'An ordered batch from the training partition whose next-token loss supplies one planned forward, backward, and optimizer update.',
    'Partition roles': 'Training fits parameters, validation selects among measured checkpoints without updating or stopping the bounded run, and test remains excluded until later evaluation.',
    'Learning-rate schedule': 'A predetermined finite positive rate for every planned update, with all updates executed even while validation is measured.',
    'Raw gradient': 'The finite derivative of one training mini-batch loss at the pre-update parameter state, before any clipping.',
    'Global-norm clipping': 'Computing one norm across every parameter gradient and applying one shared scale so the complete gradient respects a ceiling.',
    'Clipped gradient': 'The raw gradient after the shared global scale, left unchanged below the ceiling and consumed by AdamW.',
    'AdamW update': 'The scheduled optimizer operation that advances parameters and continuing moment state using the clipped training gradient.',
    'Optimizer moment state': "AdamW's persistent first moment, second moment, and step counter, continued across learning-rate schedule boundaries.",
    'Graph-free validation loss': 'A token-weighted validation metric computed without a reverse graph or gradient mutation; it selects only, never updates or stops the bounded run.',
    'Checkpoint set': 'The predetermined measured update indices, including initialized and final states, over which validation selection is allowed.',
    'Earliest validation minimum': 'The measured checkpoint with minimum validation loss, with exact ties retained at the smallest update index by strict improvement.',
    'Token-weighted mean': 'An epoch loss that weights each batch mean by its predicted-token count rather than giving every batch equal weight.',
  },
  '34-final-evaluation': {
    'Validation-selected checkpoint': 'The planned model checkpoint chosen using validation evidence before any test result is available.',
    'Frozen selected state': 'The complete selected decoder snapshot after every model and data choice is sealed; test scores may describe it but cannot change it.',
    'Single-use test evaluation boundary': 'The once-only post-selection protocol that verifies held-out test role and provenance before scoring, consumes test access when scoring begins, and prevents test evidence from becoming a selection signal.',
    'Final test evaluation': 'The reporting-only pass over held-out test data after selection closes; its result cannot choose a checkpoint or tune another decision.',
    'Token-weighted mean NLL': 'Total negative log likelihood divided by the number of aligned target tokens, so longer documents contribute in proportion to their targets.',
    Perplexity: 'The exponential of mean negative log likelihood, expressing average multiplicative uncertainty per target token.',
    'Aligned target slot': 'One causal input and observed next-token target at a stable document, window, and position, including repetitions from overlapping windows.',
    'Evaluation provenance': 'The shared corpus, split, tokenizer, and context identity binding the selected decoder, baseline, and test epoch.',
    'No-grad evaluation': 'Scoring with graph construction disabled and with decoder parameters and gradient bits verified unchanged afterward.',
    'Frozen final evaluation report': 'A versioned record of final test provenance, aligned targets, scores, one-use evidence, and state-preservation checks, fixed after selection closes.',
    'Frozen bigram': 'An add-one bigram fitted only on the same training token slices and sealed before test access.',
    'Like-for-like targets': 'A comparison where both models score the same ordered target slots, including every repetition from overlapping decoder windows.',
  },
  '35-checkpoints': {
    'Versioned decoder checkpoint': 'A validated, schema-versioned artifact binding tokenizer layout, decoder configuration and parameters, same-step optimizer state, selected step, and continuation RNG.',
    'Checkpoint schema': 'The versioned application contract that defines required tokenizer, decoder, optimizer, and RNG state together with record roles and compatibility checks.',
    'Same-step boundary': 'The clean post-update point where decoder parameters and AdamW state share one completed step and no gradients need saving.',
    'AdamW optimizer state': 'Named first and second moments, parameter groups, step, configuration, and exact accumulated beta powers required to continue the selected decoder’s next update.',
    'Continuation RNG state': 'The saved raw SplitMix64 stream state used for later sampling, distinct from the earlier batch-shuffle seed.',
    'Checkpoint payload record': 'One ordered contiguous block of encoded tokenizer, decoder-parameter, or optimizer values in the checkpoint payload.',
    'Checkpoint record descriptor': 'Metadata assigning one checkpoint payload record its role, name, dtype, shape, absolute offset, and byte length.',
    'Checkpoint payload offset': 'The absolute file-byte position where one checkpoint payload record begins; the next offset advances by element byte width times shape product.',
    'Canonical checkpoint encoding': 'The deterministic little-endian checkpoint representation with stable header fields, descriptor and payload order, and no implicit alignment padding.',
    'Checkpoint integrity checksum (FNV-1a)': 'An accidental-corruption check over the complete canonical checkpoint with its checksum field treated as zero; FNV-1a does not authenticate the file.',
    'Exact round trip': 'Loading and canonical re-encoding reproduce identical checkpoint bytes, logits bits, and the next RNG draw in the same arithmetic environment.',
    'Exact resumed update': 'Original and restored same-step states given identical inputs, targets, and learning rate produce identical parameter bits, optimizer state, and post-update logits.',
    'Atomic checkpoint replacement': 'The supported Unix same-filesystem publication that synchronizes a complete same-directory temporary checkpoint, renames it over the destination, then synchronizes the directory.',
  },
  '36-temperature-top-k': {
    Temperature: 'A finite strictly positive divisor applied to logits before softmax; lower values sharpen probability gaps and higher values flatten them without changing rank.',
    'Stable ranking': 'Deterministic ordering by descending logit, with the configured tie rule resolving equal values before candidate filtering.',
    'Top-k candidate set': 'The exact number of highest-ranked token IDs retained before sampling, bounded between one and the vocabulary size.',
    'Tie-breaking rule': 'Equal logits are ordered by ascending token ID, making the retained boundary and greedy choice deterministic.',
    'Top-k renormalization': 'Recomputing probabilities over only retained candidates after filtering, so their probabilities sum to one.',
    'Max-shifted softmax': 'Softmax computed after subtracting the largest retained scaled logit, preserving probability ratios while avoiding overflow.',
    'Removed-token probability': 'An exact zero assigned to every filtered token, so it owns no sampling interval and cannot be selected.',
    'Categorical draw': 'One unit-interval random draw used after temperature scaling, filtering, and renormalization to select a retained token.',
    'Half-open sampling interval': 'A cumulative probability range including its lower endpoint and excluding its upper endpoint, traversed here in ascending token-ID order.',
    'Greedy decoding': 'The separate deterministic policy that chooses the first stable rank and leaves the random-generator state untouched.',
    'Stochastic top-1': 'A sampling policy that retains one token and chooses the same ID as greedy but still consumes exactly one random draw.',
    'RNG-state replay': 'Reproducing categorical choices by restoring the same generator state and preserving deterministic ranking, interval order, and sampling policy.',
  },
  '37-incremental-attention': {
    'Incremental multi-head attention': 'A one-row attention path that projects the current row for every head, reads retained layer-local keys and values plus the candidate pair, and returns the newest output.',
    'Layer-bound KV cache': "Fixed key/value storage tied to one attention layer's parameter-node, RoPE, batch, model, head, capacity, and head-width identity.",
    'Absolute RoPE position': "The zero-based position used to rotate the current query and key, equal to the cache's old logical length before append.",
    'Rotated key': 'A projected, head-split key after RoPE at its absolute position; this is the key representation retained in the cache.',
    'Unrotated value': 'A projected and head-split value kept without RoPE; this is the value representation retained in the cache.',
    'Current query': 'The newest projected, head-split, RoPE-rotated query used only for the current attention calculation and never cached.',
    'Logical cache length': 'The number of retained positions currently exposed; reset sets it to zero without reallocating or clearing stored values.',
    'Cache capacity': 'The fixed maximum number of positions backed by the physical buffers; logical reset does not change it.',
    'Candidate key/value pair': 'The newest rotated-key and unrotated-value rows included with the retained prefix for calculation before any cache append is committed.',
    'Full-prefix reference': "Independent uncached attention over the complete prefix whose newest output is the correctness reference, matched within the lesson's tolerance.",
    'Projection reuse': 'Reusing earlier cached key and value projections so only the newest rows are reprojected; the newest query still reads the retained prefix, so attention is not constant time.',
    'Transactional cache update': 'A rule that copies the candidate key/value rows and increments logical length only after the complete incremental output, including output projection, succeeds.',
  },
  '38-cached-generation': {
    'Model-wide KV cache': 'The decoder-level state that owns one compatible per-layer KV cache and advances every block’s logical length, phase, and work counters coherently.',
    'Per-layer KV cache': 'One decoder block’s independent, fixed-capacity store for that block’s K/V prefix, bound to its attention-layer identity and therefore not interchangeable with an equal-shaped cache from another depth.',
    'Prompt prefill': "The initial complete-prompt phase that fills every layer's cache and produces the logits used for the first generation decision.",
    'One-token decode': "A later generation phase that feeds only the newly selected token while reusing every layer's retained key/value prefix to produce later logits.",
    'Complete-prefix reference': 'An uncached computation that reruns the entire known prefix and provides the correctness baseline for cached generation.',
    'Newest-logit equivalence': 'Agreement within tolerance between cached and complete-prefix logits at the newest position, preserving the same next-token decision under the same policy.',
    'Retained prefix length': 'The current number of token positions exposed by every coherent layer cache and therefore the number of keys read by the newest cached query.',
    'Attention-score work': 'The count of query-key score values formed; cached decoding avoids earlier query rows but the newest query still scans the retained prefix.',
    'Context-limit stop': 'A stop that keeps the token selected from logits at a full retained prefix, then ends before decoding it because the cache has reached capacity.',
    'EOS stop': 'A stop that keeps the selected end-of-sequence token in the output and ends before decoding it because no later logits are needed.',
    'Coherent cache commit': 'A transaction that advances every block cache, common length, phase, and work counters only after the full decoder row and vocabulary logits succeed, leaving committed state unchanged on error.',
    'Cached-generation replay': 'Repeating cached generation from reset state with the same exact model, prompt, policy, and RNG state to reproduce selected tokens, draws, final RNG state, and stopping reason.',
    'Cache reset': 'Clearing logical length, phase, and work counters for a fresh sequence while retaining backing allocations, capacity, and stored values outside the now-empty logical prefix.',
  },
  '39-end-to-end-llm': {
    'End-to-end LLM pipeline': 'The one-way course path that turns frozen documents into BPE tokens and causal batches, trains and selects a decoder, evaluates the selected decoder once on held-out test targets, restores it, and generates text.',
    'Decoder-only LLM': 'An autoregressive language model with a causal decoder stack and no separate encoder, mapping a bounded earlier-token context to next-token logits.',
    'Frozen document split': 'A fixed assignment of whole documents to training, validation, and test roles, preventing test-reserved text from influencing tokenizer learning, parameter updates, or selection.',
    'Training-only BPE': 'A byte-pair tokenizer whose merge ranks are learned only from training documents, then frozen and applied unchanged to validation and test documents.',
    'Causal window': 'A fixed-context input–target slice whose positions predict aligned next tokens using only the allowed earlier-token context.',
    'Bitwise training replay': 'A repeat of the frozen training run with identical data, initialization, batch order, and arithmetic environment that reproduces every recorded training event and gradient diagnostic, the selected checkpoint, every final model value, and the final optimizer state bit for bit.',
    'Validation-selected state': 'The trained decoder state chosen by validation loss before test mini-batches are materialized.',
    'Selection-isolated final test evaluation': 'One local post-selection pass over held-out test targets that cannot update parameters or feed its result back into model selection.',
    'Frozen alpha-one bigram baseline': 'An add-one-smoothed, one-token-context model fitted only on training tokens and frozen before it scores the final test targets.',
    'Same-target test-loss comparison': 'A loss comparison in which the decoder and frozen bigram score the same ordered test target positions; the measured gap describes only this frozen fixture and isolates neither a causal effect nor a universal architecture ranking.',
    'Exact checkpoint round trip': 'Saving and loading the selected state so checkpoint bytes, model and optimizer bits, BPE ranks, selected step, and RNG state all reproduce exactly.',
    'Exact logit probe': 'A deliberately narrow check that the restored decoder reproduces every logit bit for the fixed At input, without claiming that every possible input was compared.',
    'KV-cached generation': 'In this fixture, generation after prompt prefill retains per-block key/value state and decodes only tokens needed for later logits, while matching the complete-prefix reference’s draws, token decisions, stopping, and final RNG state.',
    'Joint sequence probability': 'The probability assigned to an entire token sequence, computed as the product of the observed next-token conditional probability at every position.',
    'Autoregressive factorization': 'The causal decomposition of joint sequence probability into one next-token conditional factor per position, with each factor depending only on the earlier prefix.',
    'Next-token conditional distribution': 'The decoder’s probability distribution over the next token given the allowed earlier prefix; training scores the observed token, while generation samples a new token from it.',
  },
} as const;

function readLocalizedSheet(locale: 'en' | 'ru', fileName: string) {
  return JSON.parse(
    readFileSync(resolve(contentRoot, locale, fileName), 'utf8'),
  ) as CheatSheetData;
}

function readSheet(fileName: string) {
  return readLocalizedSheet('en', fileName);
}

describe('English chapter cheat-sheet content', () => {
  it('publishes exactly the independently checkpointed English records', () => {
    expect(readdirSync(resolve(contentRoot, 'en')).sort()).toEqual(
      Object.values(expectedSheets)
        .map(({ file }) => file)
        .sort(),
    );
    expect(readdirSync(resolve(contentRoot, 'ru')).sort()).toEqual(
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

  it('sorts all thirteen Chapter 35 concepts into exact ten-plus-three pages without loss', () => {
    const sheet = readSheet('35-checkpoints.json');
    const sorted = sortCheatSheetTerms(sheet.terms, 'en');
    const pages = paginateCheatSheetTerms(sorted);
    const expectedSortedTerms = [
      'AdamW optimizer state',
      'Atomic checkpoint replacement',
      'Canonical checkpoint encoding',
      'Checkpoint integrity checksum (FNV-1a)',
      'Checkpoint payload offset',
      'Checkpoint payload record',
      'Checkpoint record descriptor',
      'Checkpoint schema',
      'Continuation RNG state',
      'Exact resumed update',
      'Exact round trip',
      'Same-step boundary',
      'Versioned decoder checkpoint',
    ];

    expect(pages.map((page) => page.length)).toEqual([10, 3]);
    expect(pages.flat().map(({ term }) => term)).toEqual(expectedSortedTerms);
    expect(new Set(pages.flat().map(({ term }) => term)).size).toBe(13);
  });

  it('sorts all thirteen Chapter 38 concepts into exact ten-plus-three pages without loss', () => {
    const sheet = readSheet('38-cached-generation.json');
    const sorted = sortCheatSheetTerms(sheet.terms, 'en');
    const pages = paginateCheatSheetTerms(sorted);
    const expectedSortedTerms = [
      'Attention-score work',
      'Cache reset',
      'Cached-generation replay',
      'Coherent cache commit',
      'Complete-prefix reference',
      'Context-limit stop',
      'EOS stop',
      'Model-wide KV cache',
      'Newest-logit equivalence',
      'One-token decode',
      'Per-layer KV cache',
      'Prompt prefill',
      'Retained prefix length',
    ];

    expect(pages.map((page) => page.length)).toEqual([10, 3]);
    expect(pages.flat().map(({ term }) => term)).toEqual(expectedSortedTerms);
    expect(new Set(pages.flat().map(({ term }) => term)).size).toBe(13);
  });

  it('sorts all sixteen Chapter 39 concepts into exact ten-plus-six pages without loss', () => {
    const sheet = readSheet('39-end-to-end-llm.json');
    const sorted = sortCheatSheetTerms(sheet.terms, 'en');
    const pages = paginateCheatSheetTerms(sorted);
    const expectedSortedTerms = [
      'Autoregressive factorization',
      'Bitwise training replay',
      'Causal window',
      'Decoder-only LLM',
      'End-to-end LLM pipeline',
      'Exact checkpoint round trip',
      'Exact logit probe',
      'Frozen alpha-one bigram baseline',
      'Frozen document split',
      'Joint sequence probability',
      'KV-cached generation',
      'Next-token conditional distribution',
      'Same-target test-loss comparison',
      'Selection-isolated final test evaluation',
      'Training-only BPE',
      'Validation-selected state',
    ];

    expect(pages.map((page) => page.length)).toEqual([10, 6]);
    expect(pages.flat().map(({ term }) => term)).toEqual(expectedSortedTerms);
    expect(new Set(pages.flat().map(({ term }) => term)).size).toBe(16);
  });

  for (const [chapterId, expected] of Object.entries(expectedSheets)) {
    it(`${chapterId} contains concise terms grounded in its canonical lesson`, () => {
      const sheet = readSheet(expected.file);
      const lesson = readFileSync(
        resolve(root, 'src/content/chapters/en', expected.lesson),
        'utf8',
      );

      expect(sheet.chapter_id).toBe(chapterId);
      expect(sheet.locale).toBe('en');
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
        expect(lesson).toContain(evidence);
        expect(sheet.terms[index]?.definition.trim()).toBe(
          sheet.terms[index]?.definition,
        );
        expect(sheet.terms[index]?.definition).toMatch(/\.$/);
        expect(
          sheet.terms[index]?.definition.split(/\s+/).length,
        ).toBeGreaterThan(7);
      });

      expect(sheet.terms.map(({ term }) => term).join(' ')).not.toMatch(
        /\b(?:Vec|usize|Result|borrow checker|TypeScript|Python|Rust|JavaScript|HTML|CSS|Astro|browser|modal|dialog|web interface|build|deployment|Docker|Git)\b/i,
      );

      for (const [term, definition] of Object.entries(
        exactDefinitions[chapterId as keyof typeof exactDefinitions] ?? {},
      )) {
        expect(sheet.terms.find((entry) => entry.term === term)?.definition).toBe(
          definition,
        );
      }
    });
  }
});

describe('Russian chapter cheat-sheet localization', () => {
  const protectedLiterals = /<[^>]+>|UTF-8|Unicode|BPE|BOS|EOS|Q\/K\/V|RMSNorm|LayerNorm|RoPE|SwiGLU|AdamW|FNV-1a|KV|LLM|NLL|MLE|VJP|f64|SplitMix64|Unix|\bAt\b/g;
  const caseFoldedProtectedLiterals = /top-k|top-1|softmax/gi;

  for (const chapterId of expectedRussianChapterIds) {
    it(`${chapterId} preserves the English concepts in natural Russian`, () => {
      const english = readLocalizedSheet('en', `${chapterId}.json`);
      const russian = readLocalizedSheet('ru', `${chapterId}.json`);

      expect(russian.chapter_id).toBe(chapterId);
      expect(russian.locale).toBe('ru');
      expect(russian.title).not.toBe(english.title);
      expect(russian.title).toMatch(/[А-Яа-яЁё]/);
      expect(russian.description).not.toBe(english.description);
      expect(russian.description).toMatch(/[А-Яа-яЁё]/);
      expect(russian.terms).toHaveLength(english.terms.length);
      expect(
        new Set(russian.terms.map(({ term }) => term.toLocaleLowerCase('ru'))).size,
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
          `${source?.term ?? ''} ${source?.definition ?? ''}`.match(protectedLiterals) ?? [],
        );
        const localizedText = `${term} ${definition}`;
        for (const literal of sourceLiterals) {
          expect(localizedText).toContain(literal);
        }

        const sourceCaseFoldedLiterals = new Set(
          (`${source?.term ?? ''} ${source?.definition ?? ''}`.match(
            caseFoldedProtectedLiterals,
          ) ?? []).map((literal) => literal.toLocaleLowerCase('en')),
        );
        const localizedCaseFoldedText = localizedText.toLocaleLowerCase('en');
        for (const literal of sourceCaseFoldedLiterals) {
          expect(localizedCaseFoldedText).toContain(literal);
        }
      });
    });
  }
});

describe('cheat-sheet ordering and page boundaries', () => {
  const terms = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      definition: `Definition ${index + 1}.`,
      term: `Term ${String(index + 1).padStart(2, '0')}`,
    }));

  it('sorts one copied array with locale collation and a deterministic tie-break', () => {
    const source = [
      { term: 'zeta', definition: 'Zeta definition.' },
      { term: 'embedding', definition: 'Embedding definition.' },
      { term: 'Attention', definition: 'Attention definition.' },
      { term: 'Alpha', definition: 'Base alpha definition.' },
      { term: '\u00c1lpha', definition: 'Alpha definition.' },
    ];
    const before = [...source];

    expect(sortCheatSheetTerms(source, 'en').map(({ term }) => term)).toEqual([
      'Alpha',
      '\u00c1lpha',
      'Attention',
      'embedding',
      'zeta',
    ]);
    expect(source).toEqual(before);

    expect(
      sortCheatSheetTerms(
        [
          { term: '\u042f\u0434\u0440\u043e', definition: 'One.' },
          { term: '\u0410\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f', definition: 'Two.' },
          { term: '\u0401\u043c\u043a\u043e\u0441\u0442\u044c', definition: 'Three.' },
        ],
        'ru',
      ).map(({ term }) => term),
    ).toEqual(['\u0410\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f', '\u0401\u043c\u043a\u043e\u0441\u0442\u044c', '\u042f\u0434\u0440\u043e']);
  });

  it('uses an exact ten-term page size without loss or duplication', () => {
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

describe('cheat-sheet integration contract', () => {
  it('uses a separate strict content collection and one shared progressive dialog', () => {
    const config = readFileSync(resolve(root, 'src/content.config.ts'), 'utf8');
    const route = readFileSync(
      resolve(root, 'src/pages/[locale]/course/[...slug].astro'),
      'utf8',
    );
    const component = readFileSync(
      resolve(root, 'src/components/CheatSheet.astro'),
      'utf8',
    );

    expect(config).toContain("pattern: '**/*.json'");
    expect(config).toContain('const cheatSheets = defineCollection');
    expect(config).toContain('terms: z.array(cheatSheetTerm).min(5),');
    expect(config).not.toContain('.max(12)');
    expect(config).toContain(
      'export const collections = { chapters, cheatSheets }',
    );
    expect(route).toContain("await getCollection('cheatSheets')");
    expect(route).toContain('<CheatSheet sheet={cheatSheet.data} />');
    expect(component).toContain('<dialog');
    expect(component).toContain('aria-labelledby={titleId}');
    expect(component).toContain('aria-describedby={descriptionId}');
    expect(component).toContain('aria-haspopup="dialog"');
    expect(component).toContain('dialog.showModal()');
    expect(component).toContain('sortCheatSheetTerms(sheet.terms, sheet.locale)');
    expect(component).toContain('paginateCheatSheetTerms(sortedTerms)');
    expect(component).toContain('const isPaginated = termPages.length > 1;');
    expect(component).toContain("{ 'cheat-sheet-dialog-paginated': isPaginated }");
    expect(component).toContain('data-cheat-sheet-pagination');
    expect(component).toContain('data-cheat-sheet-page-status');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain("role={isPaginated ? 'region' : undefined}");
    expect(component).toContain("tabindex={isPaginated ? '0' : undefined}");
    expect(component).toContain(
      'aria-describedby={isPaginated ? pageStatusId : undefined}',
    );
    expect(component).toContain(
      'grid-template-rows: auto auto minmax(0, 1fr) auto;',
    );
    expect(component).toContain('pageViewport.scrollTop = 0;');
    expect(component).toContain('if (dialog.open) dialog.scrollTop = 0;');
    const openHandler = component.slice(
      component.indexOf("trigger.addEventListener('click'"),
      component.indexOf("previous?.addEventListener('click'"),
    );
    expect(openHandler.indexOf('dialog.showModal();')).toBeLessThan(
      openHandler.indexOf('showPage(1);'),
    );
    expect(component).toContain('sortedTerms.map(({ term, definition })');
    expect(component).toContain("dialog.addEventListener('close'");
    expect(component).toContain('opener?.focus()');
    expect(component).toContain('<details');
    expect(component.indexOf('showPage(1);')).toBeLessThan(
      component.indexOf('fallback.hidden = true;'),
    );
    expect(component).not.toMatch(/client:|React|Vue|Svelte/);
  });

  it('indexes one sheet per existing localized non-orientation chapter', () => {
    const sheet = { data: readSheet('01-text-units.json') };
    const chapter = {
      data: { chapter_id: '01-text-units', locale: 'en' as const },
    };

    expect(indexCheatSheets([chapter], [sheet]).get('en:01-text-units')).toBe(
      sheet,
    );
    expect(() => indexCheatSheets([chapter], [sheet, sheet])).toThrow(
      /duplicated/,
    );
    expect(() => indexCheatSheets([], [sheet])).toThrow(/does not match/);
    expect(() =>
      indexCheatSheets(
        [{ data: { ...chapter.data, chapter_kind: 'orientation' as const } }],
        [sheet],
      ),
    ).toThrow(/Orientation/);

    const russianSheet = {
      data: readLocalizedSheet('ru', '01-text-units.json'),
    };
    expect(
      indexCheatSheets(
        [{ data: { chapter_id: '01-text-units', locale: 'ru' as const } }],
        [russianSheet],
      ).get('ru:01-text-units'),
    ).toBe(russianSheet);
  });

  it('exposes complete interface copy for every published sheet locale', () => {
    const englishCopy = getCheatSheetCopy('en');
    expect(englishCopy).not.toBeNull();
    expect({
      closeLabel: englishCopy?.closeLabel,
      eyebrow: englishCopy?.eyebrow,
      fallbackSummary: englishCopy?.fallbackSummary,
      nextLabel: englishCopy?.nextLabel,
      openLabel: englishCopy?.openLabel,
      paginationLabel: englishCopy?.paginationLabel,
      previousLabel: englishCopy?.previousLabel,
    }).toEqual({
      closeLabel: 'Close cheat sheet',
      eyebrow: 'Quick reference',
      fallbackSummary: 'Cheat sheet',
      nextLabel: 'Next terms',
      openLabel: 'Open cheat sheet',
      paginationLabel: 'Cheat sheet term pages',
      previousLabel: 'Previous terms',
    });
    expect(
      englishCopy?.pageStatus({
        currentPage: 2,
        endTerm: 12,
        pageCount: 2,
        startTerm: 11,
        totalTerms: 12,
      }),
    ).toBe('Terms 11\u201312 of 12; page 2 of 2');
    expect(
      englishCopy?.pageStatus({
        currentPage: 2,
        endTerm: 11,
        pageCount: 2,
        startTerm: 11,
        totalTerms: 11,
      }),
    ).toBe('Terms 11 of 11; page 2 of 2');

    const russianCopy = getCheatSheetCopy('ru');
    expect(russianCopy).not.toBeNull();
    expect({
      closeLabel: russianCopy?.closeLabel,
      eyebrow: russianCopy?.eyebrow,
      fallbackSummary: russianCopy?.fallbackSummary,
      nextLabel: russianCopy?.nextLabel,
      openLabel: russianCopy?.openLabel,
      paginationLabel: russianCopy?.paginationLabel,
      previousLabel: russianCopy?.previousLabel,
    }).toEqual({
      closeLabel: 'Закрыть справочник терминов',
      eyebrow: 'Краткий справочник',
      fallbackSummary: 'Справочник терминов',
      nextLabel: 'Следующие термины',
      openLabel: 'Открыть справочник терминов',
      paginationLabel: 'Страницы справочника терминов',
      previousLabel: 'Предыдущие термины',
    });
    expect(
      russianCopy?.pageStatus({
        currentPage: 2,
        endTerm: 12,
        pageCount: 2,
        startTerm: 11,
        totalTerms: 12,
      }),
    ).toBe('Термины: 11\u201312 из 12; страница 2 из 2');
    expect(
      russianCopy?.pageStatus({
        currentPage: 2,
        endTerm: 11,
        pageCount: 2,
        startTerm: 11,
        totalTerms: 11,
      }),
    ).toBe('Термины: 11 из 11; страница 2 из 2');
  });
});
