// @ts-ignore Node APIs are available in the Playwright runtime.
import { existsSync, readFileSync, readdirSync } from "node:fs";
// @ts-ignore Node APIs are available in the Playwright runtime.
import { resolve } from "node:path";

import { expect, test, type Locator } from "@playwright/test";

import {
  CHEAT_SHEET_PAGE_SIZE,
  getCheatSheetCopy,
  paginateCheatSheetTerms,
  sortCheatSheetTerms,
  type CheatSheetCopy,
  type CheatSheetData,
} from "../../src/lib/cheat-sheets";
import type { Locale } from "../../src/i18n";
import { chapterPath } from "./chapter-helpers";

declare const process: { cwd(): string };

const englishSheets = [
  {
    chapter: 1,
    chapterId: "01-text-units",
    title: "Text units and vocabulary IDs",
    terms: [
      "UTF-8 byte",
      "Unicode scalar value",
      "Vocabulary",
      "Token ID",
      "Unknown token",
      "Reversible round trip",
      "Grapheme cluster",
      "Subword tokenizer",
    ],
  },
  {
    chapter: 2,
    chapterId: "02-corpus-partitions",
    title: "Corpus documents and frozen partitions",
    terms: [
      "Corpus",
      "Whole document",
      "Training partition",
      "Validation partition",
      "Test partition",
      "Disjoint split",
      "Holdout",
      "Data leakage",
      "Provenance group",
    ],
  },
  {
    chapter: 3,
    chapterId: "03-learn-bpe-merges",
    title: "Learning deterministic BPE merges",
    terms: [
      "Byte Pair Encoding (BPE)",
      "Adjacent-pair candidate",
      "Candidate count",
      "Merge round",
      "Merge rank",
      "Deterministic tie-break",
      "Non-overlapping replacement",
      "Byte expansion",
      "Document boundary",
    ],
  },
  {
    chapter: 4,
    chapterId: "04-apply-bpe-tokenizer",
    title: "Applying and reversing a BPE tokenizer",
    terms: [
      "Byte-level BPE tokenizer",
      "Frozen merge rank",
      "Canonical encoding",
      "Content token",
      "Control token",
      "BOS and EOS",
      "Content offset",
      "Byte fallback",
      "Byte-exact decoding",
      "Strict UTF-8 view",
    ],
  },
  {
    chapter: 5,
    chapterId: "05-autoregressive-examples",
    title: "Building autoregressive input–target pairs",
    terms: [
      "Autoregressive language model",
      "Input–target pair",
      "One-token shift",
      "Context length",
      "Stride",
      "Overlapping pairs",
      "BOS and EOS boundary tokens",
      "Causal computation",
      "Causal mask",
    ],
  },
  {
    chapter: 6,
    chapterId: "06-bigram-baseline",
    title: "From transition counts to a bigram model",
    terms: [
      "Bigram model",
      "Transition count",
      "Context",
      "Probability row",
      "Maximum-likelihood estimate (MLE)",
      "Unobserved successor",
      "Unseen context",
      "Add-one smoothing",
      "Pseudocount",
    ],
  },
  {
    chapter: 7,
    chapterId: "07-language-model-metrics",
    title: "From assigned probability to perplexity",
    terms: [
      "Assigned probability",
      "Surprise",
      "Sequence likelihood",
      "Negative log-likelihood (NLL)",
      "Mean NLL",
      "Length normalization",
      "Nat",
      "Perplexity",
      "Empirical cross-entropy",
      "Argmax",
    ],
  },
  {
    chapter: 8,
    chapterId: "08-tensor-storage",
    title: "From tensor coordinates to one flat buffer",
    terms: [
      "Tensor",
      "Shape",
      "Axis",
      "Rank",
      "Extent",
      "Coordinate",
      "Row-major order",
      "Element stride",
      "Offset",
      "Contiguous storage",
    ],
  },
  {
    chapter: 9,
    chapterId: "09-tensor-views",
    title: "Shared views and explicit tensor copies",
    terms: [
      "Tensor view",
      "Reshape",
      "Transpose",
      "Axis permutation",
      "Slice",
      "Base offset",
      "Row-major contiguity",
      "Materialization",
      "Query, key, and value (Q/K/V)",
      "Attention head",
    ],
  },
  {
    chapter: 10,
    chapterId: "10-broadcasting-reductions",
    title: "Align compatible shapes, reduce a named axis",
    terms: [
      "Broadcasting",
      "Trailing-axis alignment",
      "Singleton axis",
      "Elementwise operation",
      "Reduction",
      "Reduction axis",
      "Keep dimension",
      "Feature axis",
      "Attention softmax",
      "Feature normalization",
    ],
  },
  {
    chapter: 11,
    chapterId: "11-matrix-multiplication",
    title: "Multiply rows by columns, then reuse batches",
    terms: [
      "Matrix multiplication",
      "Activation matrix",
      "Projection weight",
      "Output cell",
      "Inner dimension",
      "Contraction",
      "Batched matrix multiplication",
      "Batch broadcasting",
      "Logical transpose",
      "Attention score",
    ],
  },
  {
    chapter: 12,
    chapterId: "12-stable-softmax",
    title: "Turn extreme logits into stable probabilities",
    terms: [
      "Logit",
      "Softmax",
      "Maximum shift",
      "Normalization group",
      "Class axis",
      "Log-sum-exp",
      "Log-softmax",
      "Indexed NLL",
      "Overflow",
      "Underflow",
    ],
  },
  {
    chapter: 13,
    chapterId: "13-gradient-checking",
    title: "Check gradients before trusting backpropagation",
    terms: [
      "Gradient check",
      "Central difference",
      "Numerical derivative",
      "Analytic gradient",
      "Step size",
      "Truncation error",
      "Rounding error",
      "Scale-aware error",
      "Tolerance",
      "Deterministic coordinate sampling",
    ],
  },
  {
    chapter: 14,
    chapterId: "14-scalar-autodiff",
    title: "Accumulate gradients through a scalar graph",
    terms: [
      "Computation graph",
      "Reverse mode",
      "Adjoint",
      "Operand-use edge",
      "Local derivative",
      "Reverse topological order",
      "Gradient accumulation",
      "Backward pass",
      "Detach",
      "Zeroing gradients",
    ],
  },
  {
    chapter: 15,
    chapterId: "15-tensor-autodiff-core",
    title: "Reverse tensor operations with edge-local VJPs",
    terms: [
      "Tensor autodiff tape",
      "Vector-Jacobian product (VJP)",
      "Jacobian",
      "Operand-use edge",
      "Upstream adjoint",
      "Parent adjoint",
      "Broadcast reversal",
      "Reduction VJP",
      "Non-scalar seed",
      "Graph retention",
    ],
  },
  {
    chapter: 16,
    chapterId: "16-model-autodiff-ops",
    title: "Reverse the operations that turn token IDs into loss",
    terms: [
      "Embedding table",
      "Row gather",
      "Token ID",
      "Repeated selector",
      "Scatter-add",
      "Matrix VJP",
      "SiLU",
      "Log-softmax",
      "Indexed mean NLL",
      "Loss-logit gradient",
    ],
  },
  {
    chapter: 17,
    chapterId: "17-parameter-initialization",
    title: "Initialize trainable weights reproducibly",
    terms: [
      "Parameter initialization",
      "Hidden-unit symmetry",
      "Fan-in",
      "Fan-out",
      "Xavier-style initialization",
      "Target variance",
      "Uniform bound",
      "Seed",
      "Reproducibility",
      "Pseudorandom generator",
    ],
  },
  {
    chapter: 18,
    chapterId: "18-token-embeddings",
    title: "Give token IDs trainable vectors",
    terms: [
      "Token embedding",
      "Embedding table",
      "Vocabulary size",
      "Embedding width",
      "Token ID",
      "Direct row lookup",
      "One-hot vector",
      "Gather operation",
      "Repeated-token gradient",
      "Scatter-add",
    ],
  },
  {
    chapter: 19,
    chapterId: "19-linear-layers",
    title: "Mix each token's features with one learned projection",
    terms: [
      "Linear layer",
      "Learned projection",
      "Input feature width",
      "Output feature width",
      "Leading axes",
      "Weight matrix",
      "Bias",
      "Affine map",
      "Parameter sharing",
      "Bias-free projection",
    ],
  },
  {
    chapter: 20,
    chapterId: "20-swiglu-feed-forward",
    title: "Let one learned branch gate another",
    terms: [
      "SwiGLU",
      "Position-wise feed-forward network",
      "Gate projection",
      "Up projection",
      "Down projection",
      "SiLU",
      "Sigmoid",
      "Elementwise product",
      "Feed-forward width",
      "Position independence",
    ],
  },
  {
    chapter: 21,
    chapterId: "21-mini-batches",
    title: "Count real tokens in every mini-batch",
    terms: [
      "Causal window",
      "Mini-batch",
      "Requested batch capacity",
      "Smaller final batch",
      "Target occurrence",
      "Actual target-token denominator",
      "Token-mean gradient",
      "Raw accumulator",
      "Token-weighted mean",
      "No-padding batch",
    ],
  },
  {
    chapter: 22,
    chapterId: "22-adamw",
    title: "Keep decay out of the gradient moments",
    terms: [
      "AdamW",
      "First gradient moment",
      "Second gradient moment",
      "Bias correction",
      "Adaptive update",
      "Decoupled weight decay",
      "Learning rate",
      "Numerical stabilizer",
      "Decay group",
      "No-decay group",
    ],
  },
  {
    chapter: 23,
    chapterId: "23-neural-ngram",
    title: "Train a fixed-context neural language model",
    terms: [
      "Neural n-gram",
      "Fixed context",
      "Token embedding",
      "Context concatenation",
      "SwiGLU hidden layer",
      "Vocabulary projection",
      "Next-token logit",
      "Indexed mean loss",
      "Held-out validation loss",
      "Greedy generation",
    ],
  },
  {
    chapter: 24,
    chapterId: "24-residual-connections",
    title: "Keep an identity path around each learned update",
    terms: [
      "Residual connection",
      "Identity path",
      "Residual branch",
      "Residual stream",
      "Learned update",
      "Exact-shape merge",
      "Vector-Jacobian product",
      "Upstream adjoint",
      "Gradient accumulation",
      "Branch Jacobian",
    ],
  },
  {
    chapter: 25,
    chapterId: "25-rmsnorm",
    title: "Normalize feature scale without centering",
    terms: [
      "RMSNorm",
      "Mean square",
      "Reciprocal RMS",
      "Root-mean-square scale",
      "Learned gain",
      "Epsilon stabilizer",
      "Final feature axis",
      "Approximate scale invariance",
      "Pre-normalization",
      "LayerNorm",
    ],
  },
  {
    chapter: 26,
    chapterId: "26-qkv-projections",
    title: "Create query, key, and value views",
    terms: [
      "Query, key, and value projections",
      "Hidden-state tensor",
      "Model width",
      "Head width",
      "Query view",
      "Key view",
      "Value view",
      "Self-attention",
      "Bias-free projection",
      "Independent projection weights",
    ],
  },
  {
    chapter: 27,
    chapterId: "27-self-attention",
    title: "Compute one unmasked self-attention head",
    terms: [
      "Scaled dot-product self-attention",
      "Unmasked attention",
      "Query",
      "Key",
      "Value",
      "Attention score",
      "Query/key width",
      "Square-root scaling",
      "Row-wise softmax",
      "Attention weight",
      "Weighted value mixture",
    ],
  },
  {
    chapter: 28,
    chapterId: "28-causal-masking",
    title: "Block future keys with a causal mask",
    terms: [
      "Causal mask",
      "Inclusive diagonal",
      "Additive mask",
      "Query row",
      "Key column",
      "Allowed prefix",
      "Blocked future key",
      "Causal softmax",
      "Shifted decoder input",
      "Prefix invariance",
      "Position signal",
    ],
  },
  {
    chapter: 29,
    chapterId: "29-rope",
    title: "Turn query and key pairs with RoPE",
    terms: [
      "Rotary position embedding (RoPE)",
      "Adjacent coordinate pair",
      "Rotation matrix",
      "Pair frequency",
      "Frequency base",
      "Absolute position",
      "Signed relative position",
      "Equal-shift invariance",
      "Orthogonal rotation",
      "Query-key rotation",
      "Causal mask",
    ],
  },
  {
    chapter: 30,
    chapterId: "30-multi-head-attention",
    title: "Keep attention head-local until output mixing",
    terms: [
      "Multi-head causal self-attention",
      "Packed Q/K/V projections",
      "Model width",
      "Head count",
      "Head width",
      "Head split",
      "Per-head RoPE",
      "Per-head causal attention",
      "Head output",
      "Head concatenation",
      "Output projection",
    ],
  },
  {
    chapter: 31,
    chapterId: "31-decoder-block",
    title: "Compose a pre-norm decoder block in exact order",
    terms: [
      "Pre-normalized decoder block",
      "Residual stream",
      "Attention RMSNorm",
      "Causal multi-head attention",
      "First residual merge",
      "Feed-forward RMSNorm",
      "SwiGLU feed-forward branch",
      "Second residual merge",
      "Identity path",
      "Post-norm order",
    ],
  },
  {
    chapter: 32,
    chapterId: "32-decoder-model",
    title: "Trace one tied table through a decoder stack",
    terms: [
      "Decoder stack",
      "Decoder depth",
      "Distinct decoder blocks",
      "Embedding lookup",
      "Final RMSNorm",
      "Weight tying",
      "Tied projection",
      "Vocabulary logits",
      "Mean indexed negative log likelihood",
      "Prefix invariance",
      "Tied gradient accumulation",
    ],
  },
  {
    chapter: 33,
    chapterId: "33-training-selection",
    title: "Select a decoder with validation checkpoints",
    terms: [
      "Training mini-batch",
      "Partition roles",
      "Learning-rate schedule",
      "Raw gradient",
      "Global-norm clipping",
      "Clipped gradient",
      "AdamW update",
      "Optimizer moment state",
      "Graph-free validation loss",
      "Checkpoint set",
      "Earliest validation minimum",
      "Token-weighted mean",
    ],
  },
  {
    chapter: 34,
    chapterId: "34-final-evaluation",
    title: "Separate local test isolation from fixture evidence",
    terms: [
      "Validation-selected checkpoint",
      "Frozen selected state",
      "Single-use test evaluation boundary",
      "Final test evaluation",
      "Fixed-fixture regression evidence",
      "Token-weighted mean NLL",
      "Perplexity",
      "Aligned target slot",
      "Evaluation provenance assertions",
      "No-grad evaluation",
      "Frozen final evaluation report",
      "Frozen bigram",
      "Like-for-like targets",
    ],
  },
  {
    chapter: 35,
    chapterId: "35-checkpoints",
    title: "Save decoder state, replay one specified update",
    terms: [
      "Versioned decoder checkpoint",
      "Checkpoint schema",
      "Trainer-issued selected state",
      "AdamW optimizer state",
      "Sampling RNG state",
      "Checkpoint payload record",
      "Checkpoint record descriptor",
      "Checkpoint payload offset",
      "Canonical checkpoint encoding",
      "Checkpoint integrity checksum (FNV-1a)",
      "Exact round trip",
      "Matched caller-supplied update",
      "Atomic checkpoint replacement",
    ],
  },
  {
    chapter: 36,
    chapterId: "36-temperature-top-k",
    title: "Shape a stable top-k distribution, then draw once",
    terms: [
      "Temperature",
      "Stable ranking",
      "Top-k candidate set",
      "Tie-breaking rule",
      "Top-k renormalization",
      "Max-shifted softmax",
      "Removed-token probability",
      "Categorical draw",
      "Half-open sampling interval",
      "Greedy decoding",
      "Stochastic top-1",
      "RNG-state replay",
    ],
  },
  {
    chapter: 37,
    chapterId: "37-incremental-attention",
    title: "Keep the prefix, project only the new row",
    terms: [
      "Incremental multi-head attention",
      "Layer-bound KV cache",
      "Absolute RoPE position",
      "Rotated key",
      "Unrotated value",
      "Current query",
      "Logical cache length",
      "Cache capacity",
      "Candidate key/value pair",
      "Full-prefix reference",
      "Projection reuse",
      "Transactional cache update",
    ],
  },
  {
    chapter: 38,
    chapterId: "38-cached-generation",
    title: "Prefill once, then decode one token at a time",
    terms: [
      "Model-wide KV cache",
      "Per-layer KV cache",
      "Prompt prefill",
      "One-token decode",
      "Complete-prefix reference",
      "Newest-logit equivalence",
      "Retained prefix length",
      "Attention-score work",
      "Context-limit stop",
      "EOS stop",
      "Coherent cache commit",
      "Cached-generation replay",
      "Cache reset",
    ],
  },
  {
    chapter: 39,
    chapterId: "39-end-to-end-llm",
    title: "Run the whole tiny LLM",
    terms: [
      "End-to-end LLM pipeline",
      "Decoder-only LLM",
      "Frozen document split",
      "Training-only BPE",
      "Overlapping window-target slot",
      "Bitwise training replay",
      "Validation-selected state",
      "Selection-isolated final test evaluation",
      "Frozen alpha-one bigram baseline",
      "Window-slot mean NLL and perplexity",
      "Fixed-fixture regression evidence",
      "Exact checkpoint round trip",
      "Exact logit probe",
      "KV-cached generation",
      "Joint sequence probability",
      "Autoregressive factorization",
      "Next-token conditional distribution",
    ],
  },
] as const;

interface BrowserSheet {
  readonly chapter: number;
  readonly chapterId: string;
  readonly copy: CheatSheetCopy;
  readonly locale: Locale;
  readonly terms: readonly string[];
  readonly title: string;
}

const englishCopy = getCheatSheetCopy("en");
const russianCopy = getCheatSheetCopy("ru");
if (!englishCopy || !russianCopy) {
  throw new Error(
    "Cheat-sheet browser coverage requires English and Russian interface copy.",
  );
}

const russianSheetRoot = resolve(process.cwd(), "src/content/cheat-sheets/ru");
const russianSheets: BrowserSheet[] = existsSync(russianSheetRoot)
  ? readdirSync(russianSheetRoot)
      .filter((fileName: string) => fileName.endsWith(".json"))
      .sort()
      .map((fileName: string) => {
        const sheet = JSON.parse(
          readFileSync(resolve(russianSheetRoot, fileName), "utf8"),
        ) as CheatSheetData;
        if (sheet.locale !== "ru" || fileName !== `${sheet.chapter_id}.json`) {
          throw new Error(`Invalid Russian cheat-sheet identity: ${fileName}`);
        }
        return {
          chapter: Number.parseInt(sheet.chapter_id.slice(0, 2), 10),
          chapterId: sheet.chapter_id,
          copy: russianCopy,
          locale: "ru" as const,
          terms: sheet.terms.map(({ term }) => term),
          title: sheet.title,
        };
      })
  : [];

const sheets: BrowserSheet[] = [
  ...englishSheets.map((sheet) => ({
    ...sheet,
    copy: englishCopy,
    locale: "en" as const,
  })),
  ...russianSheets,
];

const chapter02BoundaryDefinitions = {
  en: {
    term: "Test partition",
    definition:
      "Documents reserved for reporting after fitting and model selection. One course execution enforces that boundary locally; later executions reuse the known fixture as regression evidence, not a new independent estimate.",
  },
  ru: {
    term: "Тестовая выборка",
    definition:
      "Документы, предназначенные для оценки после завершения обучения и выбора модели. В пределах одного запуска программа обеспечивает эту границу локально; в последующих запусках известный фиксированный пример используют для регрессионной проверки, а не для новой независимой оценки.",
  },
} as const;

const chapter34BoundaryDefinitions = {
  en: [
    {
      term: "Validation-selected checkpoint",
      definition:
        "The planned model checkpoint chosen using validation evidence before the local evaluator receives test data in that execution.",
    },
    {
      term: "Frozen selected state",
      definition:
        "The complete selected decoder snapshot that test scores cannot change inside the demonstrated execution.",
    },
    {
      term: "Single-use test evaluation boundary",
      definition:
        "A local post-selection protocol that checks the epoch's Test label, caller-assertion consistency, and pre-open model constraints; its one-use count applies to one evaluator instance and cannot establish repository-wide uniqueness or independent generalization.",
    },
    {
      term: "Final test evaluation",
      definition:
        "In an untouched protocol, a reporting-only pass after selection closes; this chapter's known and repeatedly checked fixture instead supplies regression evidence.",
    },
    {
      term: "Fixed-fixture regression evidence",
      definition:
        "A reproducible result on checked-in test documents. Chapter 34's documents were selected to produce the decoder-lower-than-bigram loss ordering, which is retained to detect changes; the score is neither an independent estimate of generalization nor evidence of architecture superiority.",
    },
    {
      term: "Evaluation provenance assertions",
      definition:
        "Three nonblank caller-supplied corpus, split, and tokenizer identifiers plus a positive context value; equality checks assertion consistency but does not derive or verify the underlying artifacts.",
    },
    {
      term: "Frozen final evaluation report",
      definition:
        "A versioned record of caller-supplied identifiers, checked target evidence, scores, local gate facts, state-preservation checks, and evidence scope, fixed after selection closes; it proves neither external lineage nor independent generalization.",
    },
    {
      term: "Frozen bigram",
      definition:
        "In this fixture, an add-one bigram fitted on Chapter 33's exact training token slices and sealed before test access; the generic wrapper itself checks only a Train assertion and a nonzero fitted-document count.",
    },
    {
      term: "Like-for-like targets",
      definition:
        "A comparison where both models score the same ordered target slots, including every repetition from overlapping decoder windows; fairness within the fixture does not make the fixture independently held out.",
    },
  ],
  ru: [
    {
      term: "Контрольная точка, выбранная по валидации",
      definition:
        "Заранее предусмотренное состояние модели, выбранное по результатам валидации до того, как локальный оценщик получает тестовые данные в этом запуске.",
    },
    {
      term: "Зафиксированное выбранное состояние",
      definition:
        "Полный снимок выбранного декодера, который тестовые оценки не могут изменить в пределах показанного запуска.",
    },
    {
      term: "Граница однократной оценки на тестовой выборке",
      definition:
        "Локальный протокол после выбора модели: он проверяет метку Test, согласованность заявленных сведений и ограничения модели; счётчик однократного доступа относится к одному экземпляру оценщика и не гарантирует единственность доступа в репозитории или независимость оценки способности модели обобщать.",
    },
    {
      term: "Итоговая оценка на тестовой выборке",
      definition:
        "В протоколе с ранее не использованными данными — проход только для отчёта после завершения выбора; известный и постоянно проверяемый пример этой главы вместо этого служит регрессионной проверкой.",
    },
    {
      term: "Результат фиксированного примера для регрессионной проверки",
      definition:
        "Воспроизводимый результат на сохранённых в репозитории тестовых документах. Документы главы 34 выбрали так, чтобы потери декодера были ниже потерь биграммной модели; этот порядок сохраняют для обнаружения изменений, поэтому результат не является независимой оценкой способности модели обобщать и не доказывает превосходства архитектуры.",
    },
    {
      term: "Заявленные сведения о происхождении данных и условиях оценки",
      definition:
        "Три непустых идентификатора корпуса, разбиения и токенизатора, заданные вызывающим кодом, и положительное значение длины контекста; проверка совпадения показывает только согласованность строк и не устанавливает, какие корпус, способ разбиения и токенизатор стоят за ними.",
    },
    {
      term: "Неизменяемый итоговый отчёт об оценке",
      definition:
        "Версионируемая запись заданных вызывающим кодом идентификаторов, проверенных целевых позиций, результатов, фактов локального доступа, сохранности состояния и области применимости, зафиксированная после завершения выбора; она не доказывает ни внешнее происхождение данных, ни независимость оценки способности модели обобщать.",
    },
    {
      term: "Зафиксированная биграммная модель",
      definition:
        "В этом примере — биграммная модель с аддитивным сглаживанием с параметром один, обученная на точных срезах обучающих токенов главы 33 и зафиксированная до доступа к тестовой выборке; универсальная обёртка проверяет лишь заявленную метку Train и ненулевое число обработанных документов.",
    },
    {
      term: "Одни и те же целевые позиции",
      definition:
        "Сравнение, в котором обе модели оценивают одинаковый упорядоченный набор целевых позиций, включая каждый повтор из перекрывающихся окон декодера; справедливость сравнения внутри примера не делает сами данные независимо отложенными.",
    },
  ],
} as const;

const chapter35BoundaryDefinitions = {
  en: [
    {
      term: "Versioned decoder checkpoint",
      definition:
        "A validated, schema-versioned artifact storing tokenizer layout, decoder configuration and parameter bits, trainer-paired AdamW state and shared step, plus a separate sampling RNG.",
    },
    {
      term: "Checkpoint schema",
      definition:
        "The versioned application contract that defines stored tokenizer, decoder, optimizer, and sampling-RNG state, record roles, compatibility checks, and the continuation data left to the caller.",
    },
    {
      term: "Trainer-issued selected state",
      definition:
        "The sealed model/AdamW capture required at checkpoint creation; version 1 stores both counters and validates equality but stores no independent model-lineage proof.",
    },
    {
      term: "AdamW optimizer state",
      definition:
        "Named first and second moments, parameter groups, step, configuration, and exact accumulated beta powers; the caller still supplies update inputs, targets, and any learning-rate override.",
    },
    {
      term: "Sampling RNG state",
      definition:
        "The saved raw SplitMix64 stream state used for later token sampling, distinct from the omitted batch-shuffle or other training RNG.",
    },
    {
      term: "Checkpoint payload record",
      definition:
        "One ordered contiguous block of encoded tokenizer, decoder-parameter, or optimizer values in the checkpoint payload.",
    },
    {
      term: "Checkpoint record descriptor",
      definition:
        "Metadata assigning one checkpoint payload record its role, name, dtype, shape, absolute offset, and byte length.",
    },
    {
      term: "Checkpoint payload offset",
      definition:
        "The absolute file-byte position where one checkpoint payload record begins; the next offset advances by element byte width times shape product.",
    },
    {
      term: "Canonical checkpoint encoding",
      definition:
        "The deterministic little-endian checkpoint representation with stable header fields, descriptor and payload order, and no implicit alignment padding.",
    },
    {
      term: "Checkpoint integrity checksum (FNV-1a)",
      definition:
        "An accidental-corruption check over the complete canonical checkpoint with its checksum field treated as zero; FNV-1a does not authenticate the file.",
    },
    {
      term: "Exact round trip",
      definition:
        "Loading and canonical re-encoding reproduce identical checkpoint bytes, logits bits, and the next sampling-RNG draw in the same arithmetic environment.",
    },
    {
      term: "Matched caller-supplied update",
      definition:
        "Original and loaded branches given the same caller-supplied inputs, targets, and learning rate produce identical parameter bits, optimizer state, and post-update logits for one manual update; this is not a trainer restart.",
    },
    {
      term: "Atomic checkpoint replacement",
      definition:
        "The supported Unix same-filesystem publication that synchronizes a complete same-directory temporary checkpoint, renames it over the destination, then synchronizes the directory.",
    },
  ],
  ru: [
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
  ],
} as const;

const chapter39EvidenceDefinitions = {
  en: [
    {
      term: "End-to-end LLM pipeline",
      definition:
        "The course path that turns frozen documents into BPE tokens and causal batches, trains and selects a decoder before one local fixed-fixture evaluation, restores it, and generates text.",
    },
    {
      term: "Selection-isolated final test evaluation",
      definition:
        "One local post-selection pass whose test targets cannot update parameters or feed a result back into model selection inside that execution; the local access count does not establish repository-wide independence.",
    },
    {
      term: "Overlapping window-target slot",
      definition:
        "One causal target position identified by document, stride-one window start, and position inside that window. The same within-document transition occurrence can appear in as many as four slots, with the decoder seeing one, two, three, or four in-window context tokens.",
    },
    {
      term: "Window-slot mean NLL and perplexity",
      definition:
        "Chapter 39 averages NLL over the same 1,744 overlapping window-target slots for both models, in nats per slot; exponentiating gives dimensionless window-slot perplexity. A separate metric would score each of 442 within-document transition occurrences once, give the decoder the longest available causal prefix capped at four tokens, and use only its newest-position distribution; its numeric mean NLL and perplexity are not reported.",
    },
    {
      term: "Fixed-fixture regression evidence",
      definition:
        "A known result rerun to detect changes in checked behavior; later executions retain the lower decoder window-slot mean NLL as a regression condition, so the gap is neither an independent estimate of generalization nor evidence of architecture superiority.",
    },
  ],
  ru: [
    {
      term: "Полный процесс работы LLM",
      definition:
        "Путь курса превращает зафиксированные документы в BPE-токены и каузальные пакеты, обучает и выбирает декодер до одной локальной оценки фиксированного примера, восстанавливает его и генерирует текст.",
    },
    {
      term: "Итоговая тестовая оценка, изолированная от выбора",
      definition:
        "Один локальный проход после завершения выбора, чьи тестовые цели не могут обновить параметры или повлиять на выбор модели в пределах этого запуска; локальный счётчик доступа не доказывает независимость на уровне всего репозитория.",
    },
    {
      term: "Целевая позиция перекрывающегося окна",
      definition:
        "Одна каузальная целевая позиция, заданная документом, началом окна с шагом 1 и положением внутри окна. Один переход внутри документа может входить в результат до четырёх раз; в этих позициях декодеру доступны один, два, три или четыре токена контекста.",
    },
    {
      term: "Среднее NLL и перплексия по позициям окон",
      definition:
        "В главе 39 обе модели оценивают одни и те же 1744 целевые позиции перекрывающихся окон: NLL усредняется в натах на позицию окна, а его экспонента даёт безразмерную перплексию. Отдельная метрика оценивала бы каждый из 442 переходов внутри документов один раз, передавала бы декодеру максимально доступный каузальный префикс не длиннее четырёх токенов и использовала бы только распределение в последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся.",
    },
    {
      term: "Результат фиксированного примера для регрессионной проверки",
      definition:
        "Известный результат, который повторно запускают для обнаружения изменений проверяемого поведения; в последующих запусках более низкое среднее NLL декодера по позициям окон сохраняется как условие регрессионной проверки, поэтому разница не является независимой оценкой способности модели обобщать и не доказывает превосходства архитектуры.",
    },
  ],
} as const;

function expectedPages(terms: readonly string[], locale: Locale) {
  const sorted = sortCheatSheetTerms(
    terms.map((term) => ({ definition: "Browser-test definition.", term })),
    locale,
  );
  return paginateCheatSheetTerms(sorted).map((page) =>
    page.map(({ term }) => term),
  );
}

function expectedStatus(
  copy: CheatSheetCopy,
  pageIndex: number,
  pageCount: number,
  termCount: number,
) {
  const start = pageIndex * CHEAT_SHEET_PAGE_SIZE + 1;
  const end = Math.min((pageIndex + 1) * CHEAT_SHEET_PAGE_SIZE, termCount);
  return copy.pageStatus({
    currentPage: pageIndex + 1,
    endTerm: end,
    pageCount,
    startTerm: start,
    totalTerms: termCount,
  });
}

interface Bounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

async function readPaginatedLayout(dialog: Locator) {
  return dialog.evaluate((node) => {
    const bounds = (element: Element): Bounds => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
      };
    };
    const pageViewport = node.querySelector<HTMLElement>(
      "[data-cheat-sheet-pages]",
    );
    const pagination = node.querySelector<HTMLElement>(
      "[data-cheat-sheet-pagination]",
    );
    const status = node.querySelector<HTMLElement>(
      "[data-cheat-sheet-page-status]",
    );
    const previous = node.querySelector<HTMLButtonElement>(
      "[data-cheat-sheet-previous]",
    );
    const next = node.querySelector<HTMLButtonElement>(
      "[data-cheat-sheet-next]",
    );
    if (!pageViewport || !pagination || !status || !previous || !next) {
      throw new Error("Paginated cheat-sheet controls are incomplete.");
    }

    return {
      dialog: bounds(node),
      dialogClientHeight: node.clientHeight,
      dialogScrollHeight: node.scrollHeight,
      dialogScrollTop: node.scrollTop,
      next: bounds(next),
      pageViewport: bounds(pageViewport),
      pageViewportClientHeight: pageViewport.clientHeight,
      pageViewportScrollHeight: pageViewport.scrollHeight,
      pageViewportScrollTop: pageViewport.scrollTop,
      pagination: bounds(pagination),
      previous: bounds(previous),
      status: bounds(status),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  });
}

function expectInside(inner: Bounds, outer: Bounds) {
  expect(inner.left).toBeGreaterThanOrEqual(outer.left - 1);
  expect(inner.right).toBeLessThanOrEqual(outer.right + 1);
  expect(inner.top).toBeGreaterThanOrEqual(outer.top - 1);
  expect(inner.bottom).toBeLessThanOrEqual(outer.bottom + 1);
}

function expectPaginatedShell(
  layout: Awaited<ReturnType<typeof readPaginatedLayout>>,
) {
  expect(layout.dialog.left).toBeGreaterThanOrEqual(0);
  expect(layout.dialog.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.dialog.top).toBeGreaterThanOrEqual(0);
  expect(layout.dialog.bottom).toBeLessThanOrEqual(layout.viewport.height);
  expect(layout.dialogScrollTop).toBeLessThanOrEqual(1);
  expect(
    layout.dialogScrollHeight,
    `dialog shell geometry ${JSON.stringify(layout)}`,
  ).toBeLessThanOrEqual(layout.dialogClientHeight + 1);
  expect(layout.pageViewportClientHeight).toBeGreaterThan(0);
  expectInside(layout.pageViewport, layout.dialog);
  expectInside(layout.pagination, layout.dialog);
  expectInside(layout.status, layout.dialog);
  expectInside(layout.previous, layout.dialog);
  expectInside(layout.next, layout.dialog);
}

async function scrollCurrentTermPageToEnd(pageViewport: Locator) {
  return pageViewport.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
    const lastTerm = node.querySelector(
      "[data-cheat-sheet-page]:not([hidden]) .cheat-sheet-term:last-child",
    );
    if (!lastTerm) {
      throw new Error("The visible cheat-sheet page has no final term.");
    }
    const viewportRect = node.getBoundingClientRect();
    const termRect = lastTerm.getBoundingClientRect();
    return {
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      scrollTop: node.scrollTop,
      termBottom: termRect.bottom,
      viewportBottom: viewportRect.bottom,
      viewportTop: viewportRect.top,
    };
  });
}

function expectCurrentPageEndReachable(
  reachability: Awaited<ReturnType<typeof scrollCurrentTermPageToEnd>>,
) {
  expect(
    reachability.scrollTop + reachability.clientHeight,
  ).toBeGreaterThanOrEqual(reachability.scrollHeight - 1);
  expect(reachability.termBottom).toBeGreaterThanOrEqual(
    reachability.viewportTop - 1,
  );
  expect(reachability.termBottom).toBeLessThanOrEqual(
    reachability.viewportBottom + 1,
  );
}

async function readVisibleDialogSafety(dialog: Locator) {
  return dialog.evaluate((node) => {
    const root = node as HTMLElement;
    const bounds = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
      };
    };
    const colorHasZeroAlpha = (color: string) => {
      if (color === "transparent") return true;
      const rgba = color.match(/rgba?\([^)]*[,/]\s*(0(?:\.0+)?%?)\s*\)$/);
      return rgba
        ? Number.parseFloat(rgba[1]) === 0
        : /#[0-9a-f]{6}00$/i.test(color);
    };
    const described = (element: HTMLElement) =>
      element.getAttribute("data-cheat-sheet-pages") !== null
        ? "pages"
        : element.className
            ?.toString()
            .split(/\s+/)
            .filter(Boolean)
            .join(".") || element.tagName.toLowerCase();
    const authoredElements = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) =>
        element.getAttribute("hidden") === null &&
        element.closest("[hidden]") === null,
    );
    const scaledElements: Array<{
      index: number;
      owner: string;
      scale: string;
      transform: string;
      zoom: string;
    }> = [];
    const concealedElements: Array<{ index: number; owner: string }> = [];
    for (const [index, element] of authoredElements.entries()) {
      const style = getComputedStyle(element);
      const scale = style.getPropertyValue("scale");
      const zoom = style.getPropertyValue("zoom");
      if (
        style.transform !== "none" ||
        Boolean(scale && scale !== "none") ||
        Boolean(zoom && zoom !== "normal" && Number.parseFloat(zoom) !== 1)
      ) {
        scaledElements.push({
          index,
          owner: described(element),
          scale,
          transform: style.transform,
          zoom,
        });
      }
      const opacity = Number.parseFloat(style.opacity);
      const documentedDisabledOpacity =
        element.matches(":disabled") && opacity >= 0.5;
      const webkitMask = style.getPropertyValue("-webkit-mask-image");
      const lineClamp = style.getPropertyValue("line-clamp");
      const webkitLineClamp = style.getPropertyValue("-webkit-line-clamp");
      const concealed =
        style.display === "none" ||
        ["hidden", "collapse"].includes(style.visibility) ||
        (opacity < 0.99 && !documentedDisabledOpacity) ||
        style.filter !== "none" ||
        style.clipPath !== "none" ||
        Boolean(style.maskImage && style.maskImage !== "none") ||
        Boolean(webkitMask && webkitMask !== "none") ||
        [style.overflowX, style.overflowY].some((value) =>
          ["hidden", "clip"].includes(value),
        ) ||
        style.textOverflow === "ellipsis" ||
        Boolean(lineClamp && lineClamp !== "none") ||
        Boolean(webkitLineClamp && webkitLineClamp !== "none") ||
        /(?:^|\s)(?:paint|strict|content)(?:\s|$)/.test(style.contain) ||
        style.contentVisibility === "hidden";
      if (concealed) {
        concealedElements.push({ index, owner: described(element) });
      }
    }

    const textSamples: Array<{
      fontSize: number;
      lineHeight: number;
      paint: number;
      role: string;
      text: string;
    }> = [];
    const paintedText: Array<{ left: number; right: number }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const parent = textNode.parentElement;
      const text = textNode.data
        .replace(/[\s\u200b-\u200d\ufeff]+/g, " ")
        .trim();
      if (
        !text ||
        !parent ||
        parent.getAttribute("hidden") !== null ||
        parent.closest("[hidden]")
      ) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const paint = Array.from(range.getClientRects()).filter(
        ({ width, height }) => width > 0 && height > 0,
      );
      paintedText.push(
        ...paint.map((rect) => ({ left: rect.left, right: rect.right })),
      );
      const style = getComputedStyle(parent);
      const lineHeight = Number.parseFloat(style.lineHeight);
      textSamples.push({
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: Number.isFinite(lineHeight) ? lineHeight : 0,
        paint: paint.length,
        role: parent.closest("h2")
          ? "title"
          : parent.closest(".cheat-sheet-eyebrow")
            ? "eyebrow"
            : parent.closest(".cheat-sheet-close")
              ? "close"
              : "body",
        text,
      });
      if (colorHasZeroAlpha(style.color) || paint.length === 0) {
        concealedElements.push({
          index: textSamples.length - 1,
          owner: `text:${text.slice(0, 40)}`,
        });
      }
    }

    const descendantVerticalOwners = authoredElements
      .filter((element) => element !== root)
      .flatMap((element) => {
        const style = getComputedStyle(element);
        const debt = Math.max(0, element.scrollHeight - element.clientHeight);
        return style.overflowY === "scroll" ||
          (style.overflowY === "auto" && debt > 1)
          ? [described(element)]
          : [];
      });
    const descendantHorizontalOwners = authoredElements
      .filter((element) => element !== root)
      .flatMap((element) => {
        const style = getComputedStyle(element);
        const debt = Math.max(0, element.scrollWidth - element.clientWidth);
        return style.overflowX === "scroll" ||
          (style.overflowX === "auto" && debt > 1)
          ? [described(element)]
          : [];
      });
    const panel = root.querySelector(".cheat-sheet-panel");
    const visiblePage = root.querySelector(
      "[data-cheat-sheet-page]:not([hidden])",
    );
    const bounded = [
      panel,
      visiblePage,
      root.querySelector("[data-cheat-sheet-pagination]"),
      root.querySelector("[data-cheat-sheet-page-status]"),
      root.querySelector("[data-cheat-sheet-previous]"),
      root.querySelector("[data-cheat-sheet-next]"),
    ]
      .filter((element): element is Element => element !== null)
      .map(bounds);

    return {
      bodyClientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.documentElement.scrollWidth,
      bounded,
      concealedElements,
      descendantHorizontalOwners,
      descendantVerticalOwners,
      dialog: bounds(root),
      dialogClientWidth: root.clientWidth,
      dialogScrollWidth: root.scrollWidth,
      paintedText,
      rootRem: Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      ),
      scaledElements,
      textSamples,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  });
}

for (const sheet of sheets) {
  test.describe(`${sheet.locale.toUpperCase()} Chapter ${sheet.chapter} cheat sheet @cheat-sheet:${sheet.locale}:${sheet.chapterId}`, () => {
    test("presents sorted page slices with accessible controls and restores focus", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(chapterPath(sheet.locale, sheet.chapterId));

      const termPages = expectedPages(sheet.terms, sheet.locale);
      const sortedTerms = termPages.flat();
      if (sheet.chapterId === "35-checkpoints") {
        expect(termPages.map((termPage) => termPage.length)).toEqual([10, 3]);
        if (sheet.locale === "en") {
          expect(sortedTerms).toEqual([
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
          ]);
        }
        expect(sortedTerms.join(" ")).not.toMatch(
          /Continuation RNG state|Exact resumed update|Same-step boundary|Точное продолжение обновления/,
        );
      }
      if (sheet.chapterId === "02-corpus-partitions") {
        expect(termPages.map((termPage) => termPage.length)).toEqual([9]);
      }
      if (sheet.locale === "en" && sheet.chapterId === "38-cached-generation") {
        expect(termPages.map((termPage) => termPage.length)).toEqual([10, 3]);
        expect(sortedTerms).toEqual([
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
        ]);
      }
      if (sheet.locale === "en" && sheet.chapterId === "39-end-to-end-llm") {
        expect(termPages.map((termPage) => termPage.length)).toEqual([10, 7]);
        expect(sortedTerms).toEqual([
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
        ]);
      }
      const root = page.locator("[data-cheat-sheet]");
      const trigger = root.getByRole("button", { name: sheet.copy.openLabel });
      const dialog = root.getByRole("dialog", { name: sheet.title });
      const pages = dialog.locator("[data-cheat-sheet-pages]");
      const visibleTerms = dialog.locator(
        "[data-cheat-sheet-page]:not([hidden]) dt",
      );
      const pagination = dialog.getByRole("navigation", {
        name: sheet.copy.paginationLabel,
      });
      const previous = dialog.getByRole("button", {
        name: sheet.copy.previousLabel,
      });
      const next = dialog.getByRole("button", { name: sheet.copy.nextLabel });
      const status = dialog.getByRole("status");
      const pagesId = `cheat-sheet-${sheet.chapterId}-pages`;
      const titleId = `cheat-sheet-${sheet.chapterId}-title`;
      const pageStatusId = `cheat-sheet-${sheet.chapterId}-page-status`;

      await expect(root).toHaveCount(1);
      await expect(root).toHaveAttribute(
        "data-cheat-sheet-page-count",
        String(termPages.length),
      );
      await expect(trigger).toBeVisible();
      await expect(root.locator("details")).toHaveCount(0);
      await expect(dialog).not.toBeVisible();

      await trigger.focus();
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(".cheat-sheet-eyebrow")).toHaveText(
        sheet.copy.eyebrow,
      );
      await expect(pages).toHaveAttribute("id", pagesId);
      await expect(dialog.locator("[data-cheat-sheet-page] dt")).toHaveText(
        sortedTerms,
      );
      expect(new Set(sortedTerms).size).toBe(sortedTerms.length);
      if (sheet.chapterId === "14-scalar-autodiff") {
        const expectedDefinitions =
          sheet.locale === "en"
            ? {
                term: "Adjoint",
                definition:
                  "A pass-local sensitivity for one tracked node: the selected output's derivative with respect to that node, multiplied by the finite seed installed at the output.",
              }
            : {
                term: "Сопряжённая величина",
                definition:
                  "Чувствительность отслеживаемого узла в текущем проходе: производная выбранного выхода по этому узлу, умноженная на конечную начальную сопряжённую величину, заданную для выхода.",
              };
        const entry = dialog.locator(".cheat-sheet-term").filter({
          has: page.locator("dt", { hasText: expectedDefinitions.term }),
        });
        await expect(entry).toHaveCount(1);
        await expect(entry.locator("dt")).toHaveText(expectedDefinitions.term);
        await expect(entry.locator("dd")).toHaveText(
          expectedDefinitions.definition,
        );
      }
      if (sheet.chapterId === "02-corpus-partitions") {
        const expectedDefinition = chapter02BoundaryDefinitions[sheet.locale];
        const entry = dialog.locator(".cheat-sheet-term").filter({
          has: page.locator("dt", { hasText: expectedDefinition.term }),
        });
        await expect(entry).toHaveCount(1);
        await expect(entry.locator("dt")).toHaveText(expectedDefinition.term);
        await expect(entry.locator("dd")).toHaveText(
          expectedDefinition.definition,
        );
      }
      if (sheet.chapterId === "34-final-evaluation") {
        const expectedDefinitions = chapter34BoundaryDefinitions[sheet.locale];
        for (const expectedDefinition of expectedDefinitions) {
          const entry = dialog.locator(".cheat-sheet-term").filter({
            has: page.locator("dt", { hasText: expectedDefinition.term }),
          });
          await expect(entry).toHaveCount(1);
          await expect(entry.locator("dt")).toHaveText(expectedDefinition.term);
          await expect(entry.locator("dd")).toHaveText(
            expectedDefinition.definition,
          );
        }
      }
      if (sheet.chapterId === "35-checkpoints") {
        for (const expectedDefinition of chapter35BoundaryDefinitions[
          sheet.locale
        ]) {
          const entry = dialog.locator(".cheat-sheet-term").filter({
            has: page.locator("dt", { hasText: expectedDefinition.term }),
          });
          await expect(entry).toHaveCount(1);
          await expect(entry.locator("dt")).toHaveText(expectedDefinition.term);
          await expect(entry.locator("dd")).toHaveText(
            expectedDefinition.definition,
          );
        }
      }
      if (sheet.chapterId === "39-end-to-end-llm") {
        for (const expectedDefinition of chapter39EvidenceDefinitions[
          sheet.locale
        ]) {
          const entry = dialog.locator(".cheat-sheet-term").filter({
            has: page.locator("dt", { hasText: expectedDefinition.term }),
          });
          await expect(entry).toHaveCount(1);
          await expect(entry.locator("dt")).toHaveText(expectedDefinition.term);
          await expect(entry.locator("dd")).toHaveText(
            expectedDefinition.definition,
          );
        }
      }
      await expect(visibleTerms).toHaveText(termPages[0] ?? []);
      await expect(
        root.getByRole("button", { name: sheet.copy.closeLabel }),
      ).toBeFocused();

      if (termPages.length === 1) {
        await expect(pagination).toHaveCount(0);
        await expect(previous).toHaveCount(0);
        await expect(next).toHaveCount(0);
        await expect(status).toHaveCount(0);
        await expect(dialog).not.toHaveClass(/cheat-sheet-dialog-paginated/);
        await expect(pages).not.toHaveAttribute("role", "region");
        await expect(pages).not.toHaveAttribute("tabindex", "0");
      } else {
        await expect(pagination).toBeVisible();
        await expect(dialog).toHaveClass(/cheat-sheet-dialog-paginated/);
        await expect(pages).toHaveAttribute("role", "region");
        await expect(pages).toHaveAttribute("tabindex", "0");
        await expect(pages).toHaveAttribute("aria-labelledby", titleId);
        await expect(pages).toHaveAttribute("aria-describedby", pageStatusId);
        await expect(status).toHaveAttribute("id", pageStatusId);
        await expect(
          dialog.getByRole("region", { name: sheet.title }),
        ).toHaveCount(1);
        await expect(previous).toHaveAttribute("aria-controls", pagesId);
        await expect(next).toHaveAttribute("aria-controls", pagesId);
        await expect(previous).toBeDisabled();
        await expect(next).toBeEnabled();

        const initialLayout = await readPaginatedLayout(dialog);
        expectPaginatedShell(initialLayout);
        await pages.focus();
        await expect(pages).toBeFocused();
        const firstPageEnd = await scrollCurrentTermPageToEnd(pages);
        expectCurrentPageEndReachable(firstPageEnd);
        expect(firstPageEnd.scrollTop).toBeGreaterThan(0);
        const scrolledLayout = await readPaginatedLayout(dialog);
        expectPaginatedShell(scrolledLayout);
        expect(
          Math.abs(
            scrolledLayout.pagination.top - initialLayout.pagination.top,
          ),
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(
            scrolledLayout.pagination.bottom - initialLayout.pagination.bottom,
          ),
        ).toBeLessThanOrEqual(1);

        for (let pageIndex = 0; pageIndex < termPages.length; pageIndex += 1) {
          const pageStatus = expectedStatus(
            sheet.copy,
            pageIndex,
            termPages.length,
            sortedTerms.length,
          );
          await expect(root).toHaveAttribute(
            "data-cheat-sheet-current-page",
            String(pageIndex + 1),
          );
          await expect(visibleTerms).toHaveText(termPages[pageIndex] ?? []);
          await expect(status).toHaveText(pageStatus);
          await expect(
            dialog.getByRole("group", { name: pageStatus }),
          ).toBeVisible();
          if (pageIndex === 0) {
            await expect(previous).toBeDisabled();
          } else {
            await expect(previous).toBeEnabled();
          }
          if (pageIndex === termPages.length - 1) {
            await expect(next).toBeDisabled();
          } else {
            await expect(next).toBeEnabled();
          }

          if (pageIndex < termPages.length - 1) {
            await next.click();
            expect(
              await pages.evaluate((node) => node.scrollTop),
            ).toBeLessThanOrEqual(1);
            expectPaginatedShell(await readPaginatedLayout(dialog));
          }
        }

        await expect(previous).toBeFocused();
        for (
          let pageIndex = termPages.length - 1;
          pageIndex > 0;
          pageIndex -= 1
        ) {
          await previous.click();
          await expect(visibleTerms).toHaveText(termPages[pageIndex - 1] ?? []);
          expect(
            await pages.evaluate((node) => node.scrollTop),
          ).toBeLessThanOrEqual(1);
        }
        await expect(next).toBeFocused();
        const beforeClose = await scrollCurrentTermPageToEnd(pages);
        expectCurrentPageEndReachable(beforeClose);
        expect(beforeClose.scrollTop).toBeGreaterThan(0);
      }

      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expect(root).toHaveAttribute("data-cheat-sheet-current-page", "1");
      await expect(visibleTerms).toHaveText(termPages[0] ?? []);
      expect(
        await pages.evaluate((node) => node.scrollTop),
      ).toBeLessThanOrEqual(1);
      if (termPages.length > 1) {
        expectPaginatedShell(await readPaginatedLayout(dialog));
      }
      await root.getByRole("button", { name: sheet.copy.closeLabel }).click();
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });

    test("contains every modal page at narrow width and keeps it reachable at short height", async ({
      page,
    }) => {
      const termPages = expectedPages(sheet.terms, sheet.locale);
      await page.setViewportSize({ width: 720, height: 900 });
      await page.goto(chapterPath(sheet.locale, sheet.chapterId));
      const baselineTrigger = page.getByRole("button", {
        name: sheet.copy.openLabel,
      });
      await baselineTrigger.click();
      const baselineDialog = page.getByRole("dialog", { name: sheet.title });
      const baselineNext = baselineDialog.getByRole("button", {
        name: sheet.copy.nextLabel,
      });
      const baselinePages: Array<
        Awaited<ReturnType<typeof readVisibleDialogSafety>>
      > = [];
      for (let pageIndex = 0; pageIndex < termPages.length; pageIndex += 1) {
        await expect(
          baselineDialog.locator("[data-cheat-sheet-page]:not([hidden]) dt"),
        ).toHaveText(termPages[pageIndex] ?? []);
        baselinePages.push(await readVisibleDialogSafety(baselineDialog));
        if (pageIndex < termPages.length - 1) await baselineNext.click();
      }
      await baselineDialog
        .getByRole("button", { name: sheet.copy.closeLabel })
        .click();

      await page.setViewportSize({ width: 360, height: 500 });
      await page.goto(chapterPath(sheet.locale, sheet.chapterId));
      const trigger = page.getByRole("button", { name: sheet.copy.openLabel });
      await trigger.click();

      const dialog = page.getByRole("dialog", { name: sheet.title });
      const pages = dialog.locator("[data-cheat-sheet-pages]");
      const pagination = dialog.getByRole("navigation", {
        name: sheet.copy.paginationLabel,
      });
      const next = dialog.getByRole("button", { name: sheet.copy.nextLabel });
      await expect(dialog).toBeVisible();

      for (let pageIndex = 0; pageIndex < termPages.length; pageIndex += 1) {
        await expect(
          dialog.locator("[data-cheat-sheet-page]:not([hidden]) dt"),
        ).toHaveText(termPages[pageIndex] ?? []);

        const geometry = await readVisibleDialogSafety(dialog);
        const baseline = baselinePages[pageIndex];

        expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(
          geometry.bodyClientWidth + 1,
        );
        expect(geometry.dialogScrollWidth).toBeLessThanOrEqual(
          geometry.dialogClientWidth + 1,
        );
        expect(geometry.dialog.left).toBeGreaterThanOrEqual(0);
        expect(geometry.dialog.right).toBeLessThanOrEqual(
          geometry.viewport.width,
        );
        expect(geometry.dialog.top).toBeGreaterThanOrEqual(0);
        expect(geometry.dialog.bottom).toBeLessThanOrEqual(
          geometry.viewport.height,
        );
        for (const bounds of geometry.bounded) {
          expect(bounds.left).toBeGreaterThanOrEqual(geometry.dialog.left - 1);
          expect(bounds.right).toBeLessThanOrEqual(geometry.dialog.right + 1);
        }
        for (const ink of geometry.paintedText) {
          expect(ink.left).toBeGreaterThanOrEqual(geometry.dialog.left - 1);
          expect(ink.right).toBeLessThanOrEqual(geometry.dialog.right + 1);
        }
        expect(geometry.scaledElements).toEqual([]);
        expect(geometry.concealedElements).toEqual([]);
        expect(geometry.descendantHorizontalOwners).toEqual([]);
        expect(
          geometry.descendantVerticalOwners.filter(
            (owner) => owner !== "pages",
          ),
        ).toEqual([]);
        expect(
          geometry.textSamples.map(({ role, text }) => ({ role, text })),
        ).toEqual(
          baseline.textSamples.map(({ role, text }) => ({ role, text })),
        );
        for (const [index, sample] of geometry.textSamples.entries()) {
          const baselineSample = baseline.textSamples[index];
          const responsiveFloor =
            sample.role === "title"
              ? Math.min(baselineSample.fontSize, geometry.rootRem * 1.7)
              : baselineSample.fontSize;
          expect(
            sample.fontSize + 0.01,
            `${sheet.locale} ${sheet.chapterId} page ${pageIndex + 1} ${sample.role} text ${index} (${sample.text}) font size`,
          ).toBeGreaterThanOrEqual(responsiveFloor);
          expect(sample.paint).toBeGreaterThan(0);
        }

        if (termPages.length > 1) {
          await expect(pagination).toBeVisible();
          const initialLayout = await readPaginatedLayout(dialog);
          expectPaginatedShell(initialLayout);
          const reachability = await scrollCurrentTermPageToEnd(pages);
          expectCurrentPageEndReachable(reachability);
          if (reachability.scrollHeight > reachability.clientHeight + 1) {
            expect(reachability.scrollTop).toBeGreaterThan(1);
            expect(geometry.descendantVerticalOwners).toContain("pages");
          } else {
            expect(reachability.scrollTop).toBeLessThanOrEqual(1);
          }
          const scrolledLayout = await readPaginatedLayout(dialog);
          expectPaginatedShell(scrolledLayout);
          expect(
            Math.abs(
              scrolledLayout.pagination.top - initialLayout.pagination.top,
            ),
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(
              scrolledLayout.pagination.bottom -
                initialLayout.pagination.bottom,
            ),
          ).toBeLessThanOrEqual(1);
        } else {
          const reachability = await dialog.evaluate((node) => {
            node.scrollTop = node.scrollHeight;
            const target = Array.from(
              node.querySelectorAll(
                "[data-cheat-sheet-page]:not([hidden]) .cheat-sheet-term",
              ),
            ).at(-1);
            const dialogRect = node.getBoundingClientRect();
            const targetRect = target?.getBoundingClientRect();
            return {
              clientHeight: node.clientHeight,
              dialogBottom: dialogRect.bottom,
              dialogTop: dialogRect.top,
              scrollHeight: node.scrollHeight,
              scrollTop: node.scrollTop,
              targetBottom: targetRect?.bottom ?? Number.NaN,
              targetTop: targetRect?.top ?? Number.NaN,
            };
          });
          expect(
            reachability.scrollTop + reachability.clientHeight,
          ).toBeGreaterThanOrEqual(reachability.scrollHeight - 1);
          expect(reachability.targetTop).toBeGreaterThanOrEqual(
            reachability.dialogTop - 1,
          );
          expect(reachability.targetBottom).toBeLessThanOrEqual(
            reachability.dialogBottom + 1,
          );
          expect(reachability.scrollTop).toBeGreaterThan(1);
        }

        if (pageIndex < termPages.length - 1) {
          await next.click();
          expect(
            await pages.evaluate((node) => node.scrollTop),
          ).toBeLessThanOrEqual(1);
          expectPaginatedShell(await readPaginatedLayout(dialog));
        }
      }

      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await trigger.click();
      await expect(dialog).toBeVisible();
      expect(
        await dialog.evaluate((node) => node.scrollTop),
      ).toBeLessThanOrEqual(1);
      expect(
        await pages.evaluate((node) => node.scrollTop),
      ).toBeLessThanOrEqual(1);
      if (termPages.length > 1) {
        expectPaginatedShell(await readPaginatedLayout(dialog));
      }
      await dialog.getByRole("button", { name: sheet.copy.closeLabel }).click();
    });

  });
}

test("Chapter 0 and unpublished Russian chapters remain sheet-free", async ({
  page,
}) => {
  await page.goto(chapterPath("en", "00-llm-parts"));
  await expect(page.locator("[data-cheat-sheet]")).toHaveCount(0);
  await page.goto(chapterPath("ru", "00-llm-parts"));
  await expect(page.locator("[data-cheat-sheet]")).toHaveCount(0);

  const publishedRussianChapterIds = new Set(
    russianSheets.map(({ chapterId }) => chapterId),
  );
  for (const sheet of englishSheets) {
    if (publishedRussianChapterIds.has(sheet.chapterId)) continue;
    await page.goto(chapterPath("ru", sheet.chapterId));
    await expect(page.locator("[data-cheat-sheet]")).toHaveCount(0);
  }
});
