---
{
  "chapter_id": "05-autoregressive-examples",
  "concept_id": "boundary-safe-causal-windows",
  "content_revision": 3,
  "order": 5,
  "objective": {
    "en": "Turn each encoded document into fixed-length input–target pairs for next-token prediction without joining documents or data partitions.",
    "ru": "Научиться превращать каждый закодированный документ в пары фиксированной длины «вход — цель» для предсказания следующего токена, не склеивая документы между собой и не смешивая обучающую, валидационную и тестовую части корпуса."
  },
  "worked_inputs": {
    "en": "For the document [BOS, 41, 42, 43, 44, EOS], context length three, and stride one, find every complete input–target pair and the suffix at the next candidate start, which is too short to form another pair.",
    "ru": "Дан документ [BOS, 41, 42, 43, 44, EOS], длина контекста равна 3, а шаг — 1. Найдите все полные пары «вход — цель», затем определите, какие токены останутся, если сдвинуть начало окна в следующую позицию, и объясните, почему их недостаточно для новой пары."
  },
  "formula": {
    "latex": "x^{(s)}=z_{s:s+T}, \\quad y^{(s)}=z_{s+1:s+T+1}",
    "symbols": [
      {
        "symbol": "z",
        "en": "one encoded document, including its BOS and EOS boundary tokens",
        "ru": "токены ровно одного документа вместе с BOS в начале и EOS в конце"
      },
      {
        "symbol": "T",
        "en": "the positive context length and the length of both the input and target",
        "ru": "положительная длина контекста; вход и цель содержат по T токенов"
      },
      {
        "symbol": "s",
        "en": "a candidate start kS selected by the stride; it produces a pair only when the document contains all T+1 required source tokens",
        "ru": "позиция начала окна s=kS; пара строится, только если начиная с позиции s в документе есть все T+1 токенов"
      },
      {
        "symbol": "S",
        "en": "the positive distance between consecutive candidate starts",
        "ru": "положительный шаг между соседними позициями начала окна"
      },
      {
        "symbol": "x^{(s)}",
        "en": "the T-token input sequence beginning at s",
        "ru": "входной срез длины T, начинающийся в позиции s"
      },
      {
        "symbol": "y^{(s)}",
        "en": "the T-token target slice beginning one source position after the input, so each position names the next-token target",
        "ru": "целевой срез длины T, начинающийся в позиции s+1; каждый его элемент — следующий токен для соответствующего элемента входа"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Task-specific hand-labeled examples and next-token targets derived from the sequence itself",
      "ru": "От отдельных меток, заданных людьми, к целевым токенам из самой последовательности"
    },
    "summary": {
      "en": "Task-specific supervised NLP uses answers supplied separately from the input. A language model can instead use the next token in the same sequence as the target at every usable position. Bengio et al. factorized a sentence into next-word conditionals over recent context, and the GPT-2 report emphasized learning from naturally occurring sequences rather than task-specific labeled datasets. Neither source defines this course's document boundaries, fixed train/validation/test split, stride, or too-short-suffix policy. Those choices preserve document and split identity so later fitting code can explicitly select training data, and they make example counts reproducible.",
      "ru": "В обычной задаче обучения с учителем метку готовят отдельно от входа. У языковой модели цели уже содержатся в самом документе: в каждой позиции правильный ответ — следующий токен. Модель Бенжио и соавторов предсказывает одно следующее слово по фиксированному числу предыдущих слов, а одна пара «вход — цель» в этой главе объединяет T таких последовательных предсказаний. GPT-2 сохраняет авторегрессионную постановку и обучается на текстах без специальной разметки под одну прикладную задачу. Границы документов, фиксированное разбиение корпуса, шаг и правило обработки остатка задаются в этом курсе. Они не позволяют окнам пересекать границы и обеспечивают воспроизводимый подсчёт примеров."
    },
    "rust_contrast": "Print two token sequences with manually supplied sentiment-class labels, then derive three complete shifted pairs and report the too-short suffix at the next candidate start in one six-token document."
  },
  "rust": {
    "package": "ch05-autoregressive-examples",
    "sources": [
      "rust/crates/llm-from-scratch/src/data.rs",
      "rust/demos/ch05-autoregressive-examples/src/lib.rs",
      "rust/demos/ch05-autoregressive-examples/src/main.rs"
    ],
    "expected_output": "task-specific hand-labeled contrast: sentiment rows=2\nlabeled row 0: input=[41, 42, 43] label=negative\nlabeled row 1: input=[51, 52, 53] label=positive\nsource sequence for next-token targets: [0, 41, 42, 43, 44, 1]\nconfig: context=3 stride=1 required=4\ngenerated pairs: 3\npair start=0 input=[0, 41, 42] target=[41, 42, 43]\npair start=1 input=[41, 42, 43] target=[42, 43, 44]\npair start=2 input=[42, 43, 44] target=[43, 44, 1]\nnext start too short: start=3 tokens=[43, 44, 1] required=4 emitted=false\nshort document: [0, 61, 1] pairs=0 suffix=[0, 61, 1]\nfrozen encoded documents: train=8 validation=2 test=2\nencoded pairs at context=3 stride=1: train=1828 validation=465 test=438\nchapter 6 handoff: count each adjacent training-document transition once\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "autoregressive-examples",
    "rationale": {
      "en": "Separate partition and document tapes make the one-token shift, overlapping pairs, too-short suffixes, and boundaries between unrelated sequences visible at the same time.",
      "ru": "Разбивка схемы по частям корпуса и отдельная лента для каждого документа одновременно показывают сдвиг на один токен, перекрывающиеся пары, остатки, которых недостаточно для новой пары, и границы между независимыми последовательностями."
    }
  },
  "decoder_connection": {
    "en": "Each pair supplies an input sequence and the expected next-token ID at every position. The alignment defines targets but does not prevent a model from reading later input positions; model-side causal computation must enforce that limit. Chapter 6 returns to the original training documents so overlapping pairs do not multiply transition counts, and validation and test documents do not influence fitting.",
    "ru": "В позиции i декодер должен предсказывать y_i по x_0,...,x_i; x_{i+1} и все более поздние элементы x должны быть скрыты. Пары задают правильные цели, а модель отдельно ограничивает доступ к будущим позициям. В главе 6 переходы подсчитываются по исходным документам обучающей части корпуса, чтобы из-за перекрытия окон не учитывать одни и те же наблюдения несколько раз, а валидационные и тестовые документы не влияли на параметры."
  },
  "terminology": [
    {
      "concept_id": "autoregressive-example",
      "en": "autoregressive example",
      "ru": "авторегрессионный пример"
    },
    {
      "concept_id": "input-target-pair",
      "en": "input–target pair",
      "ru": "пара «вход — цель»"
    },
    {
      "concept_id": "context-length",
      "en": "context length",
      "ru": "длина контекста"
    },
    {
      "concept_id": "stride",
      "en": "stride",
      "ru": "шаг"
    },
    {
      "concept_id": "shifted-target",
      "en": "one-token-shifted target",
      "ru": "целевая последовательность со сдвигом на один токен"
    },
    {
      "concept_id": "too-short-suffix",
      "en": "suffix too short for another pair",
      "ru": "остаток, которого недостаточно для новой пары"
    },
    {
      "concept_id": "sequence-derived-target",
      "en": "sequence-derived target",
      "ru": "цель из той же последовательности"
    }
  ],
  "translation_notes": [
    "Translate the autoregressive relation and pair-construction policy by meaning, not by copying English syntax. In Russian prose, explain sequence-derived targets directly; do not rely on an unexplained calque of self-supervision.",
    "Use the concise established term «шаг» for stride and define it as the distance between candidate starts.",
    "Describe the too-short suffix carefully: no separate pair starts there, although some of its tokens may already occur in an earlier complete input or target.",
    "Keep the formula, half-open slice notation, Rust identifiers, numeric IDs, arrays, trace grammar, partition names inside trace output, BOS, EOS, T, S, s, x, y, and z identical in every locale.",
    "Translate visible partition, document, input, target, candidate-start, pair, and suffix labels outside technical trace islands. Do not translate source URLs or paper titles.",
    "Reject literal calques in the Russian projection: use «позиция начала окна», not «позиция, выбранная шагом»; name the concrete corpus-processing call instead of «основной путь»; and describe a pair that crosses a document boundary rather than calling it a «склеенный срез».",
    "The cited papers support next-symbol factorization and the contrast with task-specific labeled supervision. Present document boundaries, fixed partitions, stride, and the complete-pair-only policy as course decisions, not as claims sourced from those papers."
  ],
  "acceptance_examples": [
    {
      "input": "z=[0,41,42,43,44,1], T=3, S=1",
      "expected": "Emit starts 0, 1, and 2 with inputs [0,41,42], [41,42,43], [42,43,44] and targets [41,42,43], [42,43,44], [43,44,1]; the suffix at start 3 is too short for another pair."
    },
    {
      "input": "z=[0,61,1], T=3, S=1",
      "expected": "Emit zero pairs and report the whole three-token document as the suffix at the first candidate start; do not pad it."
    },
    {
      "input": "z=[0,41,42,43,44,1], T=3, S=2",
      "expected": "Emit pairs at starts 0 and 2; skip otherwise valid start 1 because the stride does not select it; report suffix [44,1] at candidate start 4."
    },
    {
      "input": "z=[0,1], T=1, S=1",
      "expected": "Emit the valid boundary pair [BOS] -> [EOS]."
    },
    {
      "input": "a four-token document, T=3, S=5",
      "expected": "Emit one exact-fit pair at start 0 and report no empty suffix because the next candidate start lies beyond the document."
    },
    {
      "input": "suffix [43,44,1] at start 3 of the worked document",
      "expected": "Emit no new pair there, while retaining the same tokens in complete pairs that began earlier; the suffix is not discarded data."
    },
    {
      "input": "documents [0,10,1] and [0,20,1], T=2",
      "expected": "Iterate each document independently; never emit [10,1] -> [1,0], whose final target would cross the EOS-to-BOS boundary."
    },
    {
      "input": "the same encoded document iterated twice",
      "expected": "Both passes produce the same starts and borrowed slices without consuming or mutating the source."
    },
    {
      "input": "cargo run --quiet --locked -p ch05-autoregressive-examples",
      "expected": "Standard output is byte-for-byte equal to rust/demos/ch05-autoregressive-examples/expected.txt."
    },
    {
      "input": "Chapter 6 transition counting",
      "expected": "Read each original training document once rather than recounting adjacent transitions through overlapping pairs."
    },
    {
      "input": "one-token-shifted targets",
      "expected": "Treat them as the correct answers only; require left-to-right recurrent computation or a causal self-attention mask to prevent access to later input positions."
    },
    {
      "input": "cargo run --quiet --locked -p ch05-autoregressive-examples --example diagram_trace",
      "expected": "Standard output is byte-for-byte equal to rust/demos/ch05-autoregressive-examples/diagram-trace.txt."
    }
  ]
}
---

# Chapter 05: Building autoregressive input–target pairs / Как составлять авторегрессионные пары «вход — цель»

<!-- contract-section:scope -->
## Scope

An autoregressive language model predicts each token from earlier tokens. Turn
each frozen sequence with BOS and EOS into complete input–target pairs. Fix a
positive context length `T` and positive stride `S`; let the stride select
candidate starts `s=kS` for nonnegative integers `k=0,1,2,...` inside one document,
and emit a pair only when all `T+1` source tokens exist. Preserve document and
train/validation/test membership rather than concatenating sequences. Defer
probability estimation, randomized mini-batch sampling, padding, and tensor
storage. The pairs define the correct positionwise targets; they do not yet limit
which input positions a model may inspect for each prediction.

Авторегрессионная языковая модель учится предсказывать следующий токен по
предыдущим токенам. Для каждого зафиксированного в главе 4 документа с BOS и EOS
мы отдельно составляем полные пары «вход — цель». Длина контекста `T` и шаг `S`
должны быть положительными. Начало очередного окна задаётся как `s=kS`, где
`k=0,1,2,...`; пара строится, только если начиная с позиции `s` в том же документе
есть все `T+1` токенов. Документы не склеиваются, а обучающая, валидационная и
тестовая части корпуса не смешиваются. Оценивание вероятностей, случайное
формирование мини-пакетов, дополнение коротких последовательностей и хранение
тензоров рассматриваются в следующих главах. Пары задают правильный следующий
токен в каждой позиции, но доступ модели к более поздним элементам входа нужно
ограничивать отдельно.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use `z=[0,41,42,43,44,1]`, where `0` is BOS and `1` is EOS. With `T=3` and
`S=1`, starts 0, 1, and 2 each have four source tokens. They produce
`[0,41,42] -> [41,42,43]`, `[41,42,43] -> [42,43,44]`, and
`[42,43,44] -> [43,44,1]`. At candidate start 3 only `[43,44,1]` remains, so no
fourth pair is emitted. Those three tokens are not erased: they already occur in
earlier complete pairs; the suffix at start 3 is merely too short for another
pair.

Возьмём `z=[0,41,42,43,44,1]`, где `0` обозначает BOS, а `1` — EOS. При `T=3` и
`S=1` в позициях 0, 1 и 2 помещаются необходимые четыре токена. Из них получаются
пары
`[0,41,42] -> [41,42,43]`, `[41,42,43] -> [42,43,44]` и
`[42,43,44] -> [43,44,1]`. Если сдвинуть начало окна в позицию 3, останется только
`[43,44,1]`. Для четвёртой пары нужны четыре токена, поэтому новой пары нет.
Остаток не выбрасывается: те же три токена уже входят в предыдущие полные пары,
но построить из остатка ещё одну пару нельзя.

<!-- contract-section:formula -->
## Formula and symbols

$$
x^{(s)}=z_{s:s+T}, \quad y^{(s)}=z_{s+1:s+T+1}
$$

Both half-open slices contain exactly `T` token IDs. The target is the input span
shifted right by one position, so `y_i` is the observed next token after `x_i`.
A candidate start produces a pair exactly when `s+T < |z|`; equivalently, its
source span contains `T+1` tokens. `T` is the input length, target length, and
maximum context available inside one pair; causal computation for `y_i` may use
only `x_0` through `x_i`. `S` is the distance between candidate starts: `S=1`
considers every possible start, while a larger stride produces fewer pairs,
skips some otherwise complete starts, and can leave gaps when `S>T`.

В обоих полуоткрытых срезах ровно `T` ID токенов. Цель начинается на одну позицию
позже входа, поэтому `y_i` — токен документа, следующий за соответствующим
`x_i`. Пару можно построить тогда и только тогда, когда `s+T < |z|`, то есть
начиная с позиции `s` в документе есть все `T+1` токенов. Параметр `T` задаёт
длину входа, длину цели и наибольшую длину контекста внутри одной пары.
Предсказывая `y_i`, модель может опираться только на `x_0,...,x_i`; более поздние
элементы входа должны быть скрыты. Параметр `S` задаёт шаг между позициями начала
окна. При `S=1` проверяется каждая возможная позиция. Больший шаг даёт меньше пар,
может пропустить подходящие позиции, а при `S>T` — оставить промежутки.

<!-- contract-section:history -->
## Deriving next-token targets from sequence order

In a task-specific classification dataset, people supply an answer separately
from each input. Language modeling can obtain many targets without adding such
labels by hand: the next token is already present in the sequence.
[Bengio et al. (2003)](https://www.jmlr.org/papers/v3/bengio03a.html) factorize a
sentence into next-word conditional probabilities and use a fixed recent context.
The [GPT-2 report (2019)](https://cdn.openai.com/better-language-models/language-models.pdf)
contrasts task-specific labeled datasets with learning from naturally occurring
sequences and uses the same autoregressive factorization.

В задаче обучения с учителем метку готовят отдельно от входа. При обучении
языковой модели цель уже задана порядком токенов в тексте: правильный ответ —
токен, следующий за данным контекстом в том же документе.
[Бенжио и соавторы (2003)](https://www.jmlr.org/papers/v3/bengio03a.html)
раскладывают вероятность предложения в произведение условных вероятностей
следующего слова. В каждом примере они предсказывают одно следующее слово по
фиксированному числу предыдущих слов. В этой главе тот же принцип применяется
сразу к `T` позициям: каждому элементу входа соответствует следующий за ним токен
того же документа. В [отчёте GPT-2 (2019)](https://cdn.openai.com/better-language-models/language-models.pdf)
сохраняется та же авторегрессионная факторизация, а модель обучается на текстах
без специальной разметки под одну прикладную задачу.

The Rust demo makes the difference concrete: two sentiment-classification rows
carry human-supplied class labels, while one six-token sequence yields three
aligned next-token pairs. This contrast does not imply that early language models
needed people to label every next word. The cited papers also do not prescribe
this course's document boundaries, fixed partitions, stride, or too-short-suffix
rule. Those choices preserve document identity and split membership so fitting
code can explicitly use training documents only, and they make the example count
reproducible.

В демонстрации на Rust у двух последовательностей для классификации тональности
метки заданы людьми, а один документ из шести токенов даёт три пары для
предсказания следующего токена. Это не означает, что в ранних языковых моделях
каждое следующее слово размечали вручную. Ни статья Бенжио, ни отчёт GPT-2 не
задают правила подготовки данных для нашего курса. Границы документов,
фиксированное разбиение 8/2/2, шаг между окнами и отказ дополнять остаток
фиктивными токенами — решения этого курса. Они сохраняют ID документов и их
принадлежность к части корпуса, позволяют коду обучения выбрать только обучающие
данные и обеспечивают воспроизводимый подсчёт примеров.

<!-- contract-section:rust-behavior -->
## Rust behavior

`CausalWindowConfig::new` rejects zero context length or stride and rejects
`T=usize::MAX`, for which `T+1` cannot be represented. `window_count` counts
candidate starts with a complete `T+1`-token span. The borrowed iterator yields
`CausalWindow { start, input, target }` without copying or mutating token IDs; the
target slice begins one source position after the input. `incomplete_tail` is the
API name for the suffix at the first candidate start that is too short for a
pair. It returns `None` when that start is at or beyond the document end. A
returned suffix may overlap earlier complete pairs and is never padded or emitted.
`CausalWindowConfig::windows` assumes its token slice contains exactly one
document; token IDs alone do not tell it where one document ends and another
begins. The canonical corpus path therefore calls `EncodedDocument::windows`.

`EncodedCorpusPartitions::from_partitions(&CorpusPartitions, &BpeTokenizer)`
infallibly calls `encode_utf8_document` with the frozen Chapter 4 tokenizer for
every Chapter 2 document and retains its ID and partition. It neither trains a
tokenizer nor reuses the temporary IDs on which Chapter 3 learned merge rules.
Callers request one partition at a time, then build pairs separately for each
`EncodedDocument`. Tests cover exact shifted slices, stride, BOS input, EOS
target, empty token slices, empty-content wrapped documents, exact fits,
too-short suffixes, repeatable iteration, overflow-resistant counts, and the
fixed 8/2/2 corpus split.

`CausalWindowConfig::new` отклоняет нулевую длину контекста и нулевой шаг.
Значение `T=usize::MAX` тоже недопустимо, поскольку при вычислении `T+1` возникло
бы переполнение. `window_count` подсчитывает позиции начала окна, в которых
помещается полный участок из `T+1` токенов. Итератор возвращает
`CausalWindow { start, input, target }` с заимствованными срезами, не копируя и
не изменяя ID. Оба среза принадлежат одному документу, а цель начинается на одну
позицию позже входа.

При подсчёте окон и определении начала остатка каждое сложение проверяется на
переполнение. Метод `incomplete_tail` возвращает остаток с позиции следующего
окна, если она находится внутри документа, но полная пара уже не помещается. Если
эта позиция совпала с концом документа или оказалась за ним, метод возвращает
`None`. Остаток не дополняется и не становится отдельным примером, хотя его
токены могли уже войти в предыдущие пары. `CausalWindowConfig::windows` принимает
срез ровно одного документа: по самим ID невозможно определить границу между
документами. Поэтому для каждого `EncodedDocument` создаётся отдельный итератор.

`EncodedCorpusPartitions::from_partitions(&CorpusPartitions, &BpeTokenizer)`
возвращает готовое разбиение без `Result`. Для каждого документа из главы 2 он
вызывает `encode_utf8_document` с токенизатором, зафиксированным в главе 4, и
сохраняет ID документа вместе с его частью корпуса. Токенизатор здесь не
обучается заново, а временные ID, на которых в главе 3 подбирались правила
слияния, не используются. Вызывающий код выбирает одну часть корпуса и строит
пары отдельно для каждого `EncodedDocument`. Тесты проверяют точный сдвиг срезов,
шаг, BOS во входе, EOS в цели, пустой срез токенов, документ без содержимого
`[BOS, EOS]`, случай ровно с одной полной парой, остатки, которых недостаточно для
новой пары, повторный обход, подсчёт без переполнения и зафиксированное разбиение
корпуса 8/2/2.

<!-- contract-section:visualization -->
## Visualization

Parse only the strict `TRACE autoregressive-examples-v1` block produced by
`cargo run --quiet --locked -p ch05-autoregressive-examples --example diagram_trace`.
Render train, validation, and test as separate regions, with a separate token tape
for every document. Align input and target rows under their source positions and
mark the one-position shift with arrows. Show an outlined, text-labeled suffix
that is too short for a pair at the next candidate start; never imply that its
tokens were deleted.
The parser validates trace grammar, identities, lengths, shift alignment, start
order, and boundaries, but does not choose or generate windows itself.

Схема разделена на части корпуса, а каждый документ показан на отдельной ленте.
Под исходными токенами расположены вход и цель; их взаимное положение и стрелки
показывают сдвиг на один токен. В позиции следующего окна рамкой и подписью
отмечен остаток, которого недостаточно для новой пары. Схема не должна создавать
впечатление, будто эти токены удаляются. Технические ленты читаются слева
направо. При навигации с клавиатуры элементы встречаются в том же порядке, что и
в объяснении. На узком экране документы и пары выстраиваются вертикально.
Границы, подписи и форма передают смысл независимо от цвета.

<!-- contract-section:exercises -->
## Prediction checks

1. For `[0,41,42,43,44,1]`, predict every pair at `T=3, S=1` before running Rust.
2. Repeat with `S=2`; identify the pair-producing starts, the otherwise valid skipped start, and the suffix at candidate start 4.
3. Explain why `[0,61,1]` emits no pair at `T=3` and why padding would change the policy.
4. Decide whether `[BOS] -> [EOS]` is valid for `[BOS,EOS]` at `T=1`.
5. For two separate three-token documents at `T=2`, decide whether one pair can contain tokens from both documents.
6. For an exact-fit four-token document at `T=3, S=5`, decide whether an empty suffix should be reported.
7. Explain how a suffix too short for a new pair can overlap earlier complete pairs.
8. Explain why Chapter 6 must count the original document transitions rather than every overlapping pair.
9. Decide whether shifted targets alone prevent a model from inspecting later input positions.

Answers must appear after the questions in a collapsed `<details>` block in each
localized lesson. The learner checks the worked case against exact Rust output;
the tests and the local stride/context experiment verify the additional cases.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

Each autoregressive pair states the decoder's relation: at position `i`, predict
`y_i` from `x_0` through `x_i`; causal computation must hide `x_{i+1}` and later
inputs. Future tensor
and neural-network chapters will change how predictions are represented and
optimized. Pair alignment alone does not hide later entries of `x` from an
earlier prediction. A left-to-right recurrent model enforces the limit through
sequential state; a self-attention decoder needs an explicit causal mask. Chapter 6
uses the original training documents, not this overlapping view, so each adjacent
transition is counted once and validation and test documents do not influence the
fitted transition counts.

В каждой авторегрессионной паре задана цель для каждой позиции декодера. В
позиции `i` нужно предсказать `y_i`, используя `x_0,...,x_i`; `x_{i+1}` и все
следующие элементы входа должны быть скрыты. Сдвиг входа и цели задаёт правильные
ответы, но сам по себе не ограничивает доступ к будущим позициям. Рекуррентная
модель соблюдает это правило благодаря последовательному обновлению состояния
слева направо, а декодеру с самовниманием нужна каузальная маска. В следующих
главах изменятся представление предсказаний и способ обучения, но связь между
входом и целью останется прежней. В главе 6 переходы подсчитываются по исходным
документам обучающей части корпуса, а не по перекрывающимся окнам. Поэтому каждое
соседство учитывается один раз, а валидационные и тестовые документы не влияют на
параметры.

<!-- contract-section:localization -->
## Localization notes

Use natural explanatory Russian rather than mirroring English clause order.
Introduce stride as «шаг», and explain sequence-derived targets directly rather
than relying on an unexplained calque of self-supervision. Preserve formula notation,
trace output, code identifiers, IDs, arrays, BOS/EOS, and source titles. Translate
all surrounding diagram labels and accessible descriptions. A fluent Russian
reviewer must approve the complete lesson and rendered labels before publication.

<!-- contract-section:acceptance -->
## Acceptance examples

The six-token fixture emits exactly three pairs and reports that start 3 is too
short for another. The short document emits none. Synthetic train, validation, and test
documents remain visibly and structurally separate. The cumulative API encodes
the fixed corpus as 8/2/2 documents without reading across boundaries.
Exact stdout, Rust format/test/lint, contract structure/integration, configured
locale parity, content, parser/unit, type, production build/link, focused browser,
full browser, static-host smoke, and fluent-human Russian approval all pass in the
staged overlay before atomic publication.
