---
{
  "chapter_id":"06-bigram-baseline","concept_id":"smoothed-bigram-distribution","content_revision":1,"order":6,
  "objective":{"en":"Estimate and query a smoothed next-token distribution by counting each adjacent training-document transition once.","ru":"Оценить и запросить сглаженное распределение следующего токена, посчитав каждый соседний переход в обучающих документах ровно один раз."},
  "worked_inputs":{"en":"Count transitions in [0,1,1,2] and [0,1,2], then predict the most likely successor before and after smoothing.","ru":"Посчитать переходы в [0,1,1,2] и [0,1,2], затем предсказать наиболее вероятный следующий токен до и после сглаживания."},
  "formula":{"latex":"C_{ij}=\\sum_{d\\in\\mathcal{D}_{tr}}\\sum_{t=1}^{|d|-1}\\mathbf{1}[z_t=i\\land z_{t+1}=j],\\quad P(j\\mid i)=\\frac{C_{ij}+\\alpha}{\\sum_k C_{ik}+\\alpha|V|}","symbols":[{"symbol":"C_{ij}","en":"count of transitions from token i to token j","ru":"число переходов от токена i к токену j"},{"symbol":"z_t","en":"token at position t in one training document","ru":"токен в позиции t одного обучающего документа"},{"symbol":"\\mathcal{D}_{tr}","en":"the training documents only","ru":"только обучающие документы"},{"symbol":"P(j\\mid i)","en":"smoothed probability of next token j after i","ru":"сглаженная вероятность токена j после i"},{"symbol":"\\alpha","en":"positive additive smoothing amount","ru":"положительная добавка аддитивного сглаживания"},{"symbol":"|V|","en":"vocabulary size","ru":"размер словаря"},{"symbol":"\\mathbf{1}","en":"indicator that is one when the transition matches","ru":"индикатор, равный единице при совпадении перехода"}]},
  "history":{"approach":{"en":"Maximum-likelihood n-gram language models","ru":"Языковые модели n-грамм с оценкой максимального правдоподобия"},"summary":{"en":"Classical n-gram models count finite-context transitions. Their unsmoothed rows assign zero probability to unseen continuations, so additive smoothing gives every vocabulary item a controlled nonzero baseline.","ru":"Классические модели n-грамм считают переходы в конечном контексте. В несглаженной строке невидимые продолжения получают нулевую вероятность, поэтому аддитивное сглаживание задаёт всем токенам небольшой ненулевой базовый шанс."},"rust_contrast":"Print an unsmoothed zero for an unseen continuation beside the smoothed probability from the same count table."},
  "rust":{"package":"ch06-bigram-baseline","sources":["rust/crates/llm-from-scratch/src/bigram.rs","rust/demos/ch06-bigram-baseline/src/main.rs"],"expected_output":"vocabulary: 3\nalpha: 1.0\ncounts row 0: [0, 2, 0]\ncounts row 1: [0, 1, 2]\nprobabilities row 0: [0.200, 0.600, 0.200]\nprobabilities unseen row 2: [0.333, 0.333, 0.333]\nprediction row 0: [0.2, 0.6, 0.2]\n"},
  "visualization":{"decision":"useful","id":"bigram-baseline","rationale":{"en":"A count/probability row makes normalization, smoothing mass, and an unseen context visible together.","ru":"Строка счётчиков и вероятностей одновременно показывает нормировку, массу сглаживания и невидимый контекст."}},
  "decoder_connection":{"en":"The model consumes the [BOS, content..., EOS] sequences from Chapter 5 and supplies a first next-token distribution; Chapter 7 will score it without changing the frozen table.","ru":"Модель получает последовательности [BOS, содержимое..., EOS] из главы 5 и задаёт первое распределение следующего токена; глава 7 оценит его, не изменяя зафиксированную таблицу."},
  "terminology":[{"concept_id":"bigram","en":"bigram","ru":"биграмма"},{"concept_id":"transition-count","en":"transition count","ru":"число переходов"},{"concept_id":"additive-smoothing","en":"additive smoothing","ru":"аддитивное сглаживание"},{"concept_id":"next-token-distribution","en":"next-token distribution","ru":"распределение следующего токена"}],
  "translation_notes":["Keep count, probability, row, and unseen-context terminology consistent; explain that smoothing is a teaching baseline, not a learned neural representation."],
  "acceptance_examples":[{"input":"fit vocabulary 3, alpha 1 on [0,1,1,2] and [0,1,2]","expected":"Each within-document transition is counted once; row 0 is [0,2,0] and row 1 is [0,1,2]."},{"input":"query unseen context 2","expected":"The smoothed row is uniform [1/3,1/3,1/3]."},{"input":"cargo run --quiet --locked -p ch06-bigram-baseline","expected":"stdout equals rust/demos/ch06-bigram-baseline/expected.txt byte-for-byte."}]
}
---

# Chapter 06: A count-based bigram language model / Счётная биграммная языковая модель

<!-- contract-section:scope -->
## Scope

This chapter counts adjacent transitions inside each training document, normalizes one row at a time, and applies additive smoothing. It includes BOS/EOS transitions and never crosses document boundaries. It does not teach loss, gradients, neural logits, or evaluation; those follow in Chapter 7.

<!-- contract-section:worked-inputs -->
## Worked example

For documents `[0,1,1,2]` and `[0,1,2]`, count each neighboring pair once. Row 0 sees two `0→1` transitions; row 1 sees one `1→1` and two `1→2` transitions. With vocabulary size 3 and `α=1`, row 0 becomes `[1/5,3/5,1/5]`. An unseen row has equal probability for all three tokens.

<!-- contract-section:formula -->
## Formula and symbols

$$C_{ij}=\sum_{d\in\mathcal{D}_{tr}}\sum_{t=0}^{|d|-2}\mathbf{1}[z_t=i\land z_{t+1}=j],\quad P(j\mid i)=\frac{C_{ij}+\alpha}{\sum_k C_{ik}+\alpha|V|}$$

The first expression counts only adjacent positions within one training document. The second adds `α` to every candidate and divides by the row total after adding `α|V|`, so every row sums to one.

## Symbol glossary

`Cᵢⱼ` is the transition count, `zₜ` is a token, `D_tr` is the training partition, `P(j|i)` is the next-token probability, `α` is positive smoothing, and `|V|` is vocabulary size.

<!-- contract-section:history -->
## Historical contrast

Finite-context n-gram models were a practical pre-neural language-model baseline: count a context and estimate the next symbol. Maximum-likelihood counts expose an important weakness: an unseen continuation receives probability zero. The Rust demo prints the same row after adding one unit of smoothing, making the historical limitation observable without importing a language-model library.

<!-- contract-section:rust-behavior -->
## Rust implementation

`BigramModel::fit` iterates `windows(2)` separately for each document, stores a deterministic row-major count table, and exposes `count`, `probability`, and `predict`. It rejects an empty vocabulary, invalid smoothing, and out-of-range IDs. Tests cover repeated transitions and uniform unseen rows.

<!-- contract-section:visualization -->
## Visualization

The diagram should show one count row beside its smoothed probability row, with numeric labels and row totals. The relationship remains readable without color: borders, headings, and exact values carry the distinction.

<!-- contract-section:exercises -->
## Predict, then check

1. Count the transitions in `[0,1,1,2]` and `[0,1,2]`.
2. Predict the unsmoothed row for context `2`.
3. Explain why flattening the two documents would create a transition that does not exist.
4. Explain why smoothing changes probabilities but not observed counts.

<details><summary>Check your predictions</summary>

The counts are row 0 `[0,2,0]` and row 1 `[0,1,2]`; context 2 has no observed outgoing transition, so its unsmoothed row is undefined/zero while its smoothed row is uniform. Flattening would invent a cross-document pair. Smoothing leaves counts intact and changes only the normalized estimate.
</details>

**Misconception check:** “The most likely next token is the model’s confidence.” False: the full row is the prediction; the argmax alone discards uncertainty.

<!-- contract-section:decoder-connection -->
## Handoff to scoring

The fitted table consumes complete wrapped sequences from Chapter 5 and produces a distribution for every current token. Chapter 7 will calculate likelihood and perplexity on train and validation while keeping the table and test partition fixed.

<!-- contract-section:localization -->
## Localization

Both locale lessons use the same numeric fixture, formula, Rust sources, navigation, and expected output. Only explanatory prose and labels are translated.

<!-- contract-section:acceptance -->
## Acceptance

The Rust demo output is byte-for-byte frozen in `rust/demos/ch06-bigram-baseline/expected.txt`; contract, content, parity, Rust, static-build, link, and browser checks validate the complete slice.
