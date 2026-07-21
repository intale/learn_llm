---
{
  "chapter_id": "06-bigram-baseline",
  "concept_id": "smoothed-bigram-distribution",
  "content_revision": 2,
  "order": 6,
  "objective": {
    "en": "Build and inspect a smoothed bigram next-token distribution by counting each transition in the original wrapped training documents exactly once.",
    "ru": "Построить и проверить сглаженное распределение вероятностей следующего токена в биграммной модели. Для этого каждый переход между соседними токенами внутри исходных документов обучающей выборки с BOS и EOS нужно подсчитать ровно один раз."
  },
  "worked_inputs": {
    "en": "With BOS=0, EOS=1, content tokens A=2 and B=3, unseen token C=4, and alpha=1, derive count, maximum-likelihood, and smoothed rows from [0,2,2,3,1] and [0,2,3,1].",
    "ru": "Пусть BOS=0, EOS=1, A=2, B=3, C=4 и α=1; токен C входит в словарь, но не встречается в документах обучающей выборки. Для документов [0,2,2,3,1] и [0,2,3,1] подсчитать переходы, а затем получить для контекстов A и C строки счётчиков, распределения MLE и сглаженные распределения."
  },
  "formula": {
    "latex": "C_{ij}=\\sum_{d\\in\\mathcal{D}_{tr}}\\sum_{t=0}^{|d|-2}\\mathbf{1}[z_t^{(d)}=i\\land z_{t+1}^{(d)}=j],\\quad N_i=\\sum_{k\\in V}C_{ik},\\quad \\widehat P_{\\mathrm{MLE}}(j\\mid i)=\\frac{C_{ij}}{N_i}\\;(N_i>0),\\quad \\widehat P_{\\alpha}(j\\mid i)=\\frac{C_{ij}+\\alpha}{N_i+\\alpha|V|}\\;(\\alpha>0)",
    "symbols": [
      {"symbol": "\\mathcal{D}_{tr}", "en": "the set of original wrapped training documents", "ru": "множество исходных документов обучающей выборки; каждый документ начинается с BOS и заканчивается EOS"},
      {"symbol": "d", "en": "one training document", "ru": "один документ обучающей выборки"},
      {"symbol": "|d|", "en": "the number of tokens in document d", "ru": "число токенов в документе d"},
      {"symbol": "t", "en": "a zero-based position whose next position is still inside d", "ru": "позиция с нумерацией от нуля, после которой в документе d есть следующий токен"},
      {"symbol": "z_t^{(d)}", "en": "the token ID at zero-based position t in document d", "ru": "ID токена в позиции t документа d"},
      {"symbol": "i", "en": "the current-token ID and count-table row", "ru": "ID текущего токена и номер строки в таблице счётчиков"},
      {"symbol": "j", "en": "a candidate next-token ID and count-table column", "ru": "ID возможного следующего токена и номер столбца в таблице счётчиков"},
      {"symbol": "k", "en": "an index ranging over every token ID in V", "ru": "индекс, перебирающий все ID токенов из V"},
      {"symbol": "V", "en": "the vocabulary of possible token IDs", "ru": "множество допустимых ID токенов"},
      {"symbol": "|V|", "en": "the number of token IDs in V", "ru": "число ID токенов в V, то есть размер словаря"},
      {"symbol": "C_{ij}", "en": "the number of observed i-to-j transitions", "ru": "сколько раз в обучающей выборке встретился переход i→j"},
      {"symbol": "N_i", "en": "the total number of observed transitions leaving i", "ru": "сколько наблюдавшихся переходов начинается с i"},
      {"symbol": "\\mathbf{1}[\\cdot]", "en": "one when its condition is true and zero otherwise", "ru": "единица, если условие выполнено, и ноль в противном случае"},
      {"symbol": "\\widehat P_{\\mathrm{MLE}}(j\\mid i)", "en": "the maximum-likelihood next-token estimate, defined only when N_i is positive", "ru": "оценка вероятности следующего токена методом максимального правдоподобия; определена только при N_i>0"},
      {"symbol": "\\alpha", "en": "the positive pseudocount added to every candidate next token", "ru": "положительная псевдочастота, добавляемая к каждому возможному продолжению при сглаживании"},
      {"symbol": "\\widehat P_{\\alpha}(j\\mid i)", "en": "the add-alpha smoothed next-token estimate", "ru": "сглаженная с параметром α оценка вероятности следующего токена"}
    ]
  },
  "history": {
    "approach": {
      "en": "Maximum-likelihood n-gram tables with count smoothing",
      "ru": "Оценка максимального правдоподобия и сглаживание в n-граммных моделях"
    },
    "summary": {
      "en": "A bigram model keeps only the current token as context and estimates the next token from observed pair counts. Maximum likelihood gives zero to an unobserved successor after a seen context and cannot normalize a context with no outgoing observations. Add-alpha smoothing makes every row defined, but distributes its extra mass uniformly and is retained here for transparency rather than strength.",
      "ru": "Биграммная модель учитывает только текущий токен и оценивает вероятность каждого следующего токена по тому, сколько раз соответствующая пара встретилась в обучающей выборке. Если конкретное продолжение не встречалось после известного контекста, его оценка максимального правдоподобия равна нулю. Если же после текущего токена не наблюдалось ни одного продолжения, строку нельзя нормировать этим методом. Аддитивное сглаживание задаёт распределение и для такой строки: к каждому возможному продолжению добавляется одинаковая псевдочастота. В курсе этот метод используется ради прозрачности расчёта, а не потому, что считается сильным практическим методом."
    },
    "rust_contrast": "Print a zero maximum-likelihood probability for A-to-C, an undefined maximum-likelihood row for C, and the corresponding add-one probabilities from the same Rust table."
  },
  "rust": {
    "package": "ch06-bigram-baseline",
    "sources": [
      "rust/crates/llm-from-scratch/src/bigram.rs",
      "rust/demos/ch06-bigram-baseline/src/lib.rs",
      "rust/demos/ch06-bigram-baseline/src/main.rs"
    ],
    "expected_output": "tokens: BOS=0 EOS=1 A=2 B=3 C=4\nalpha: 1.0\ntraining document d1: [0, 2, 2, 3, 1]\ntraining document d2: [0, 2, 3, 1]\ncounted transitions: 7\nA counts: [0, 0, 1, 2, 0] total=3\nA MLE: [0.000, 0.000, 0.333, 0.667, 0.000]\nA add-alpha: [0.125, 0.125, 0.250, 0.375, 0.125] denominator=8\nunseen successor A->C: MLE=0.000 add-alpha=0.125\nC counts: [0, 0, 0, 0, 0] total=0\nC MLE: undefined\nC add-alpha: [0.200, 0.200, 0.200, 0.200, 0.200] denominator=5\nflattening would invent: EOS(1)->BOS(0)\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "bigram-baseline",
    "rationale": {
      "en": "Two token-labeled rows can show observed counts, row totals, maximum-likelihood values, smoothing pseudocounts, denominators, and final probabilities without hiding the unseen-context case inside an array.",
      "ru": "Две строки с подписями токенов позволяют сопоставить результаты подсчёта, суммы строк, псевдочастоты, знаменатели и итоговые вероятности. На строке C видно, почему строку с нулевой суммой нельзя нормировать методом максимального правдоподобия и как правило сглаживания строит для неё распределение."
    }
  },
  "decoder_connection": {
    "en": "The model scans each original wrapped training document once, never the overlapping Chapter 5 pairs, and freezes its table. Chapter 7 computes train and validation loss and perplexity without refitting: its metric scorer can select only the training or validation partition.",
    "ru": "Модель один раз просматривает каждый исходный документ обучающей выборки с BOS и EOS и не использует перекрывающиеся пары из главы 5. После обучения таблица остаётся неизменной: глава 7 вычисляет потери и перплексию на обучающей и валидационной выборках без повторной подгонки, а интерфейс расчёта метрики позволяет выбрать только обучающую или валидационную выборку."
  },
  "terminology": [
    {"concept_id": "bigram", "en": "bigram", "ru": "биграмма"},
    {"concept_id": "transition-count", "en": "transition count", "ru": "счётчик перехода"},
    {"concept_id": "maximum-likelihood-estimate", "en": "maximum-likelihood estimate", "ru": "оценка максимального правдоподобия"},
    {"concept_id": "add-alpha-smoothing", "en": "add-alpha smoothing", "ru": "аддитивное сглаживание с параметром α"},
    {"concept_id": "unseen-successor", "en": "unseen successor", "ru": "продолжение, не встретившееся после данного токена"},
    {"concept_id": "unseen-context", "en": "context with no outgoing observations", "ru": "контекст без наблюдавшихся продолжений"}
  ],
  "translation_notes": [
    "Use the mathematical symbol α throughout rendered Russian prose and metadata.",
    "Do not translate unseen as visible or invisible. Describe whether a successor or outgoing transition occurred in the training data.",
    "Translate by context rather than forcing one phrase everywhere: use подсчёт переходов for the process, счётчик перехода or an explicit сколько раз встретился переход for a cell, строка счётчиков for a row, псевдочастота for the smoothing addition, and аддитивное сглаживание с параметром α for add-alpha smoothing; avoid числа переходов as a generic label and avoid the calque счётная модель.",
    "Keep BOS, EOS, MLE, token symbols A/B/C, IDs, arrays, arithmetic, URLs, code, and trace records identical across locales."
  ],
  "acceptance_examples": [
    {"input": "fit alpha=1 and vocabulary size 5 on d1=[0,2,2,3,1], d2=[0,2,3,1]", "expected": "Seven within-document transitions are counted; row A is [0,0,1,2,0], and no EOS-to-BOS transition is recorded."},
    {"input": "query A-to-C and the complete A row", "expected": "MLE(A-to-C)=0, add-one(A-to-C)=1/8, and the smoothed A row is [1/8,1/8,2/8,3/8,1/8]."},
    {"input": "query the complete C row", "expected": "Its zero count total makes the MLE row undefined; add-one smoothing produces the uniform row [1/5,1/5,1/5,1/5,1/5]."},
    {"input": "cargo run --quiet --locked -p ch06-bigram-baseline", "expected": "stdout equals rust/demos/ch06-bigram-baseline/expected.txt byte for byte."},
    {"input": "cargo run --quiet --locked -p ch06-bigram-baseline --example diagram_trace", "expected": "stdout equals rust/demos/ch06-bigram-baseline/diagram-trace.txt byte for byte."}
  ]
}
---

# Chapter 06: From transition counts to a bigram model / От подсчета переходов к биграммной модели

<!-- contract-section:scope -->
## Scope

Revision 2 replaces the earlier fixture. It teaches the one-token bigram context, one count per transition in each original wrapped training document, maximum-likelihood normalization, and add-alpha smoothing. It includes BOS and EOS, uses no padding, never flattens documents, never fits from overlapping Chapter 5 pairs, and does not open validation or test data. Chapter 7 will score the frozen table; gradients come later.

<!-- contract-section:worked-inputs -->
## Worked example

Use `BOS=0`, `EOS=1`, `A=2`, `B=3`, `C=4`, `alpha=1`, and the two training documents `[0,2,2,3,1]` and `[0,2,3,1]`. Before seeing the table, list the seven adjacent transitions and predict which next token is most likely after `A`. Then distinguish `A->C`, an unobserved successor after a seen context, from row `C`, a context with no outgoing observations.

<!-- contract-section:formula -->
## Formula and symbols

$$C_{ij}=\sum_{d\in\mathcal{D}_{tr}}\sum_{t=0}^{|d|-2}\mathbf{1}[z_t^{(d)}=i\land z_{t+1}^{(d)}=j],\quad N_i=\sum_{k\in V}C_{ik},\quad \widehat P_{\mathrm{MLE}}(j\mid i)=\frac{C_{ij}}{N_i}\;(N_i>0),\quad \widehat P_{\alpha}(j\mid i)=\frac{C_{ij}+\alpha}{N_i+\alpha|V|}\;(\alpha>0)$$

Positions are zero-based, matching Rust slices. The document superscript prevents a transition from using the end of one document and the start of another. Here `V` is the vocabulary and `|V|` is its number of token IDs. The MLE row exists only for `N_i>0`; add-alpha smoothing defines every row by adding the same positive pseudocount to every candidate next token.

<!-- contract-section:history -->
## Historical contrast

Classical n-gram models estimate a token from a fixed-length suffix of prior tokens; a bigram uses only the current token. Chen and Goodman compare established smoothing methods and explain why distributing probability among unseen n-grams is central to language modeling ([ACL 1996](https://aclanthology.org/P96-1041.pdf)). Bengio, Ducharme, and Vincent describe n-gram conditional tables and motivate distributed representations that generalize across similar sequences ([NeurIPS 2000](https://proceedings.neurips.cc/paper/2000/hash/728f206c2a01bf572b5940d7d9a8fa4c-Abstract.html)). This course keeps uniform add-alpha smoothing because its arithmetic is inspectable, while explicitly showing that it also assigns mass to implausible or structurally forbidden successors such as BOS in the middle of a document.

<!-- contract-section:rust-behavior -->
## Rust behavior

The generic Rust fitter scans every supplied slice separately and trusts the caller to provide one wrapped, unpadded training document per slice. It stores a checked row-major `|V| x |V|` count table, records document and transition totals, returns `None` for an undefined zero-total MLE row, and returns a normalized add-alpha row for every valid context. A partition-aware constructor obtains separately wrapped documents from `Partition::Train` only. The learner demo and diagram trace share one valid wrapped fixture and identify the exact `EOS->BOS` transition that flattening would invent.

<!-- contract-section:visualization -->
## Visualization

The static figure reads the exact Rust trace. In separate panels for contexts `A` and `C`, it gives each possible next token its own labeled table row, then shows its count, MLE result, added pseudocount, smoothed numerator, and final probability alongside `N_i` and the smoothed denominator. Text, borders, headings, and numeric values carry every distinction without relying on color.

<!-- contract-section:exercises -->
## Predict, calculate, explain

Exercises must ask learners to enumerate the seven source transitions, calculate the complete `A` rows, distinguish MLE zero from undefined MLE, identify `EOS->BOS` as the flattening error, explain why Chapter 5 windows would overcount, test a different alpha, verify row sums, and interpret ties. Checked answers must show the arithmetic rather than repeat only the final arrays.

<!-- contract-section:decoder-connection -->
## Handoff to scoring

The bigram table is the first complete next-token model in the course. Freeze it after training-only fitting. Chapter 7 will assign probabilities to train and validation targets and convert those probabilities to loss and perplexity. The table remains unchanged while scoring: training examples are not added to its counts again, validation is evaluation-only, and Chapter 7's metric scorer can select only training or validation.

<!-- contract-section:localization -->
## Localization

English and Russian share formula notation, token meanings, IDs, arrays, Rust regions, trace records, primary-source URLs, and revision metadata. Russian prose must describe training-data observations directly rather than translating unseen with visibility metaphors, and its complete staged surface requires explicit fluent-human approval.

<!-- contract-section:acceptance -->
## Acceptance

Contract projections, exact Rust output, trace parsing, mathematical invariants, locale parity, static rendering, responsive accessibility, primary-source claims, natural-language reviews, and Docker-only canonical regression gates must all pass. Revision 1 remains available only through its immutable Git history and run record.
