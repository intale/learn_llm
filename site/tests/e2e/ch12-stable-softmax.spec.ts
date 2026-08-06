// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  chapterLocales,
  chapterLocaleDefinitions,
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readMathAwareText,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '12-stable-softmax';
const contentRevision = 7;
const formulaLatex = String.raw`p_i=\frac{\exp(\ell_i-m)}{\sum_j\exp(\ell_j-m)}, \quad m=\max_j\ell_j`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://github.com/openai/gpt-2/blob/master/src/model.py',
] as const;

interface LocalizedCopy {
  revisionLabel: string;
  chapterTitle: string;
  chapterDescription: string;
  headings: readonly string[];
  historyHeading: string;
  historyClaims: readonly string[];
  implementationHeading: string;
  implementationClaims: readonly string[];
  rustCaptions: readonly string[];
  rustLabels: readonly string[];
  diagramTitle: string;
  diagramDescription: string;
  diagramSections: readonly string[];
  rankField: string;
  probabilitiesMatch: string;
  exerciseSummary: string;
  exerciseQuestions: readonly string[];
  exerciseAnswers: readonly string[];
}

const copy = {
  en: {
    revisionLabel: 'Content revision',
    chapterTitle: 'Turn extreme logits into stable probabilities',
    chapterDescription:
      'Turn vocabulary and attention logits into stable probabilities, log-probabilities, log-sum-exp values, and indexed mean NLL with dependency-free Rust.',
    headings: [
      'Predict three shifted rows',
      'Normalize with one maximum shift',
      'Name each probability quantity',
      'From vocabulary softmax to Transformer probabilities',
      'Implement checked log-domain operations',
      'Compare naive and stable exponentials',
      'Predict before running Rust',
      'Prepare an independent gradient oracle',
    ],
    historyHeading: 'From vocabulary softmax to Transformer probabilities',
    historyClaims: [
      "Bengio et al.'s neural language model uses an output softmax to turn vocabulary scores into positive next-word probabilities that sum to one. In finite precision, directly exponentiating unshifted large logits can overflow, while directly exponentiating sufficiently negative logits can round every term to zero.",
      'Bengio et al. describe an output softmax whose values are positive and sum to one, interpreting its inputs as unnormalized log probabilities for the next word.',
      "The Transformer reuses softmax for scaled query-key scores inside attention and for next-token predictions. OpenAI's published GPT-2 source shows a stable implementation for attention: subtract the maximum along the last axis before exponentiating, sum the shifted exponentials, and normalize before combining values.",
      "Vaswani et al. define scaled dot-product attention by applying softmax to scaled query-key products before weighting values, and apply a learned linear transform plus softmax to decoder outputs for predicted next-token probabilities. OpenAI's GPT-2 source implements last-axis softmax by subtracting the maximum with retained dimensions, exponentiating, and dividing by the sum with retained dimensions; its attention path applies that helper to scaled masked scores before combining values. The source names those reductions reduce_max and reduce_sum.",
      "In exact arithmetic, adding one constant to every logit leaves softmax unchanged. Maximum shifting preserves that distribution while avoiding raw-exponential failures for the worked rows. Log-sum-exp supplies the stable log-normalizer; log-softmax retains class scores in the log domain, and fused indexed mean NLL retains a target loss when the corresponding ordinary probability rounds to zero. This course's arbitrary-axis API, finite-input policy, target layout, allocation rules, and error precedence are local correctness decisions.",
    ],
    implementationHeading: 'Implement checked log-domain operations',
    implementationClaims: [
      'Tensor-returning operations check their output layout and reserve output storage before reading logits. Indexed NLL instead checks group layout, target count, a nonempty mean, and every target bound before reading any logit.',
      "Each value emitted by that cursor is the zero-based offset of class zero in one normalization group, measured in f64 elements from the start of the tensor owner's flat storage. This chapter calls that value the group-base offset.",
      'Removing that axis leaves group shape [3] and group stride [2], so the group-base cursor emits offsets [0,2,4].',
      'One forward request creates one checked axis-and-group plan and invokes the row-statistics calculation exactly once for each group.',
      'The crate-private log_softmax_forward and indexed_mean_nll_forward helpers may emit probabilities alongside their primary result so a later backward gradient calculation can reuse them without normalizing the logits again.',
      'The public functions do not expose the optional saved tensor; each returns only its documented result.',
      'The preliminary finite-input scan does not calculate either group statistic.',
      'A successful preliminary scan returns a private FiniteLogits marker.',
      'Because the tensor view cannot mutate its values, the maximum scan trusts that marker instead of checking the same values again.',
      'Stable row statistics still require a maximum scan and a shifted-exponential scan, and producing class-wise output requires another class scan.',
      'calling softmax and then log_softmax remains two independent forward requests.',
      'No numerical pass constructs a class coordinate vector or calls TensorView::get once per scalar.',
      'For T targets, fused indexed mean NLL keeps two accumulators.',
      'If every group loss and the running sum remain finite, the function divides total by T once and returns the mean in nats per target; this single final division preserves representable subnormal mean rounding.',
      'In parallel, the fallback scaled_mean adds the two nonnegative parts of each group loss after dividing each part by T:',
      'The function returns scaled_mean only when a complete group loss or the running value of total overflows; otherwise it divides total by T and returns that quotient.',
    ],
    rustCaptions: [
      'Expose raw-exponential normalization for one ordinary and two extreme finite rows',
      'Keep axes, empty classes, outputs, non-finite logits, and indexed targets distinct',
      'Compute one reusable statistics bundle for each checked normalization group',
      'Emit requested probability results from one checked group traversal',
      'Run every checked probability operation over the shared three-row example',
      'Prepare stable outputs, raw failure statuses, target loss, invariance, and typed errors',
    ],
    rustLabels: [
      'Rust source implementing the bounded direct softmax baseline used to reveal finite-precision overflow and underflow',
      'Rust source defining Chapter 12 stable probability and indexed negative-log-likelihood errors',
      'Rust source implementing the checked Chapter 12 group-base cursor, class-stride traversal, and one row-statistics calculation per group',
      'Rust source implementing arbitrary-axis log-sum-exp, softmax, log-softmax, fused indexed mean negative log-likelihood, and optional saved probabilities',
      'Rust source constructing the complete Chapter 12 stable softmax example',
      'Rust source running the Chapter 12 learner example before printing its exact deterministic output',
    ],
    diagramTitle: 'See one maximum shift rescue ordinary and extreme logits',
    diagramDescription:
      'Compare three Rust-recorded rows with equal relative logits, follow their stable normalization and target losses, and inspect four rejected requests.',
    diagramSections: [
      'Subtract one row maximum before exponentiating',
      'Select one log-probability per target',
      'Reject invalid axes, logits, and targets',
    ],
    rankField: 'Rank',
    probabilitiesMatch: 'All three recorded rows have exactly matching probabilities.',
    exerciseSummary: 'Check the predictions',
    exerciseQuestions: [
      'Predict the shifted values for [1000,1001].',
      'Predict whether adding -1001 to [0,1] changes either probability.',
      'Explain why direct normalization of [1000,1001] is undefined in f64.',
      'Predict both probabilities for equal logits [7,7].',
      'Select the loss for target class 0 in row [1000,1001].',
      'Predict log-sum-exp output shapes for input [2,3,4], axis 1, with and without keep_dim.',
      'Decide which empty-class operation has a defined identity.',
      'For shape [3,2], source strides [2,1], and class axis 1, list the three group-base offsets and the two source offsets read in each group.',
      'Suppose one training operation must return log-softmax values and retain softmax probabilities for its backward gradient calculation. Which group-wide facts can both results share, and which class-wise work still remains?',
      'Misconception check: does maximum shifting itself turn logits into probabilities?',
    ],
    exerciseAnswers: [
      'The maximum is 1001, so the shifted values are exactly [-1,0].',
      'No. Adding one shared constant changes the maximum by the same amount and leaves both shifted differences unchanged.',
      'Both raw exponentials overflow to infinity, so each division becomes infinity divided by infinity rather than a probability.',
      'Equal shifted logits have equal exponentials, so both probabilities are 0.5.',
      'Class zero has log-probability -1.313261687518, so its NLL is 1.313261687518.',
      'Removing axis one gives [2,4]; retaining it gives [2,1,4].',
      'Log-sum-exp returns the log-additive identity negative infinity. A softmax distribution, log-softmax distribution, and indexed target loss need at least one class.',
      'Removing class axis 1 leaves group stride [2], so the group bases are [0,2,4]. Class stride 1 gives source offsets [0,1], [2,3], and [4,5].',
      'Both results share the already computed maximum m, shifted-exponential sum S, and log-normalizer \\ln S. One class scan can emit both values from those facts. The operation does not repeat the maximum or shifted-sum calculation, but it still visits every class to write the requested outputs.',
      'No. The shift only stabilizes relative logits. Exponentiation and division by the complete shifted sum produce probabilities.',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    chapterTitle: 'Преобразуйте большие по модулю логиты в устойчивые вероятности',
    chapterDescription:
      'Преобразуйте логиты словаря и внимания в устойчивые вероятности, логарифмы вероятностей, значения log-sum-exp и среднее NLL по целевым индексам на Rust без сторонних зависимостей.',
    headings: [
      'Предскажите результат сдвига трёх строк',
      'Нормируйте после вычитания максимума',
      'Разберите обозначения вероятностей',
      'От softmax по словарю к вероятностям Transformer',
      'Реализуйте вычисления в логарифмической шкале с явными проверками',
      'Сравните прямое вычисление softmax с устойчивым',
      'Сделайте прогноз перед запуском Rust',
      'Подготовьте независимую проверку градиентов',
    ],
    historyHeading: 'От softmax по словарю к вероятностям Transformer',
    historyClaims: [
      'В нейронной языковой модели Бенжио и соавторов выходной softmax превращает оценки словаря в положительные вероятности следующего слова, сумма которых равна единице. При вычислениях с конечной точностью прямое экспоненцирование больших несдвинутых логитов может привести к переполнению. Для достаточно отрицательных логитов каждая экспонента может округлиться до нуля.',
      'Бенжио и соавторы описывают softmax на выходе: его положительные значения в сумме дают единицу, а входные значения интерпретируются как ненормированные логарифмы вероятностей следующего слова.',
      'Transformer использует softmax и для масштабированных оценок «запрос — ключ» внутри механизма внимания, и для предсказания следующего токена. В опубликованном коде GPT-2 для внимания используется устойчивый вариант: перед экспоненцированием из оценок по последней оси вычитают максимум, затем складывают сдвинутые экспоненты и нормируют их, прежде чем взвешивать значения.',
      'Васвани и соавторы определяют внимание на основе масштабированного скалярного произведения: к масштабированным произведениям запросов и ключей применяют softmax, после чего полученными весами взвешивают значения. Для получения вероятностей следующего токена к выходам декодера применяют обучаемое линейное преобразование и softmax. В исходном коде GPT-2 от OpenAI softmax по последней оси вычисляется так: максимум вычитается с сохранением оси единичного размера, затем значения экспоненцируются и делятся на сумму, вычисленную с таким же сохранением оси. В механизме внимания эта функция применяется к масштабированным и замаскированным оценкам до объединения значений. В коде эти операции обозначены как reduce_max и reduce_sum.',
      'В точной арифметике прибавление одной и той же константы ко всем логитам не меняет результат softmax. Вычитание максимума сохраняет это распределение и позволяет избежать сбоев прямого экспоненцирования для строк примера. Log-sum-exp даёт численно устойчивый логарифм нормирующей суммы; log-softmax сохраняет оценки классов в логарифмической шкале, а совмещённое вычисление среднего NLL по индексам позволяет вычислить потерю для целевого класса, даже если соответствующая обычная вероятность округляется до нуля. Интерфейс для произвольной оси, требование конечных входов, схема расположения целей, правила выделения памяти и порядок ошибок — решения о корректности, принятые в реализации курса.',
    ],
    implementationHeading: 'Реализуйте вычисления в логарифмической шкале с явными проверками',
    implementationClaims: [
      'Операции, возвращающие тензор, до чтения логитов проверяют схему размещения результата и резервируют для него память. Операция среднего NLL по индексам вместо этого проверяет схему групп, соответствие числа целей числу групп, наличие хотя бы одной цели и границы всех целевых индексов до чтения любого логита.',
      'Каждое значение этого курсора — отсчитываемое от нуля смещение элемента класса 0 в одной группе нормализации относительно начала плоского буфера исходного тензора.',
      'После её удаления остаются форма групп [3] и шаг групп [2], поэтому курсор выдаёт базовые смещения [0,2,4].',
      'Каждый вызов прямого прохода создаёт один проверенный план оси и групп и ровно один раз для каждой группы вычисляет её статистики.',
      'Доступные только внутри крейта вспомогательные функции log_softmax_forward и indexed_mean_nll_forward могут вместе с основным результатом сформировать вероятности, чтобы последующее вычисление градиента при обратном проходе использовало их без повторной нормализации логитов.',
      'Общедоступные функции не возвращают этот дополнительный тензор вероятностей; каждая из них возвращает только результат, указанный в её интерфейсе.',
      'Предварительный проход проверяет только конечность входных значений и не вычисляет ни одну из этих статистик.',
      'Успешная проверка возвращает служебный маркер FiniteLogits, который нельзя создать извне этого модуля.',
      'Поскольку через представление тензора нельзя изменить значения, проход поиска максимума полагается на подтверждённую этим маркером конечность и не проверяет те же логиты повторно.',
      'Для устойчивого вычисления статистик группы всё равно нужны проход поиска максимума и отдельный проход суммирования сдвинутых экспонент; для записи значений по классам нужен ещё один проход по классам.',
      'softmax, а затем log_softmax — это два независимых вызова прямого прохода.',
      'Ни один численный проход не создаёт вектор координат класса и не вызывает TensorView::get для каждого скаляра.',
      'Для T целей совмещённое вычисление среднего NLL по индексам ведёт два накопителя.',
      'Если потери всех групп и текущая сумма остаются конечными, функция один раз делит total на T и возвращает среднее в натах на одну цель. Благодаря единственному делению в конце сохраняется корректное округление представимого субнормального среднего.',
      'Параллельно запасной накопитель scaled_mean складывает две неотрицательные части потери каждой группы, предварительно разделив каждую часть на T:',
      'Функция возвращает scaled_mean только при переполнении полной потери группы или текущего значения total; иначе она делит total на T и возвращает полученное частное.',
    ],
    rustCaptions: [
      'Показать прямую нормализацию экспонент для одной обычной строки и двух строк с большими по модулю конечными значениями',
      'Различать ошибки осей, пустых классов, результата, неконечных логитов и целевых индексов',
      'Один раз вычислить повторно используемый набор статистик для каждой проверенной группы нормализации',
      'Сформировать запрошенные вероятностные результаты за один проверенный обход групп',
      'Выполнить все проверяемые вероятностные операции над общим примером из трёх строк',
      'Подготовить устойчивые результаты, признаки сбоев прямого вычисления, потерю цели, инвариантность и типизированные ошибки',
    ],
    rustLabels: [
      'Код на Rust с прямым вариантом softmax, который показывает переполнение и округление до нуля при вычислениях с конечной точностью',
      'Код на Rust, определяющий ошибки устойчивых вероятностных операций и отрицательного логарифмического правдоподобия по индексам в главе 12',
      'Код на Rust, реализующий курсор с проверенными границами для базовых смещений групп, обход с шагом по оси классов и однократное вычисление статистик каждой группы в главе 12',
      'Код на Rust, реализующий log-sum-exp, softmax, log-softmax и совмещённое вычисление среднего отрицательного логарифмического правдоподобия по индексам вдоль произвольной оси, а также, при необходимости, дополнительный тензор вероятностей для обратного прохода',
      'Код на Rust, создающий полный пример устойчивого softmax для главы 12',
      'Код на Rust, запускающий учебный пример главы 12 перед выводом точного воспроизводимого результата',
    ],
    diagramTitle: 'Как вычитание максимума делает вычисление устойчивым',
    diagramDescription:
      'Сравните три вычисленные программой на Rust строки, в каждой из которых разность между логитами одинакова; проследите устойчивую нормализацию и потери для целевых классов и разберите четыре отклонённых запроса.',
    diagramSections: [
      'Вычтите максимум каждой строки перед экспоненцированием',
      'Выберите логарифм вероятности по целевому индексу каждой строки',
      'Отклоните недопустимые оси, логиты и цели',
    ],
    rankField: 'Ранг',
    probabilitiesMatch: 'Во всех трёх строках записаны одинаковые вероятности.',
    exerciseSummary: 'Проверить прогнозы',
    exerciseQuestions: [
      'Предскажите сдвинутые значения для [1000,1001].',
      'Изменится ли какая-либо вероятность, если прибавить -1001 к [0,1]?',
      'Объясните, почему прямая нормализация [1000,1001] не определена в f64.',
      'Предскажите обе вероятности для одинаковых логитов [7,7].',
      'Найдите потерю для целевого класса 0 в строке [1000,1001].',
      'Предскажите формы результата log-sum-exp для входа [2,3,4] и оси 1 при выключенном и включённом keep_dim.',
      'У какой операции над пустой осью классов определён нейтральный элемент?',
      'Для формы [3,2], шагов исходного тензора [2,1] и оси классов 1 перечислите три базовых смещения групп и два смещения в исходном хранилище, которые читаются для каждой группы.',
      'Пусть во время обучения одна операция должна вернуть значения log-softmax и сохранить вероятности softmax для последующего вычисления градиента при обратном проходе. Какие величины, общие для всей группы, можно использовать для обоих результатов? Какую работу по каждому классу всё равно потребуется выполнить?',
      'Проверка заблуждения: превращает ли само вычитание максимума логиты в вероятности?',
    ],
    exerciseAnswers: [
      'Максимум равен 1001, поэтому сдвинутые значения в точности равны [-1,0].',
      'Нет. Одна и та же прибавка изменяет максимум на такую же величину, поэтому обе разности после вычитания остаются прежними.',
      'Обе исходные экспоненты переполняются до бесконечности, поэтому каждая вероятность вычисляется как отношение бесконечности к бесконечности.',
      'У одинаковых сдвинутых логитов равны экспоненты, поэтому обе вероятности равны 0.5.',
      'Логарифм вероятности класса ноль равен -1.313261687518, поэтому значение NLL равно 1.313261687518.',
      'После удаления оси с индексом 1 получается [2,4], а после её сохранения — [2,1,4].',
      'Log-sum-exp возвращает нейтральный элемент логарифмического сложения — отрицательную бесконечность. Для распределений softmax и log-softmax, а также для потери по целевому индексу нужен хотя бы один класс.',
      'После удаления оси классов 1 остаётся шаг групп [2], поэтому базовые смещения равны [0,2,4]. Шаг по оси классов равен 1, и три группы читают элементы со смещениями [0,1], [2,3] и [4,5].',
      'Для обоих результатов используются уже вычисленные максимум m, сумма сдвинутых экспонент S и логарифм нормирующей суммы \\ln S. За один проход по классам из этих величин можно сформировать оба запрошенных результата. Повторно искать максимум или сумму сдвинутых экспонент не нужно, но каждый класс всё равно требуется посетить, чтобы записать значения результатов.',
      'Нет. Вычитание максимума лишь делает вычисление относительных различий между логитами численно устойчивее; само вычитание не превращает эти значения в вероятности. Вероятности получаются после экспоненцирования и деления на сумму всех сдвинутых экспонент.',
    ],
  },
} satisfies Record<ChapterLocale, LocalizedCopy>;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustRegions = [
  ['rust/demos/ch12-stable-softmax/src/lib.rs', 'direct-output-softmax'],
  ['rust/crates/llm-from-scratch/src/nn/probability.rs', 'probability-errors'],
  ['rust/crates/llm-from-scratch/src/nn/probability.rs', 'checked-probability-groups'],
  ['rust/crates/llm-from-scratch/src/nn/probability.rs', 'stable-probability-operations'],
  ['rust/demos/ch12-stable-softmax/src/lib.rs', 'tiny-stable-softmax-example'],
  ['rust/demos/ch12-stable-softmax/src/main.rs', 'learner-stable-softmax-output'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 12,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.chapterDescription);
  await expectSeoDescription(page, localized.chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: localized.historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = await readMathAwareText(historyNodes);
  for (const claim of localized.historyClaims) {
    expect(historyText).toContain(claim);
  }
  await expect(historyNodes.locator('code').filter({ hasText: /^reduce_max$/ })).toHaveCount(1);
  await expect(historyNodes.locator('code').filter({ hasText: /^reduce_sum$/ })).toHaveCount(1);
  expect(historyText).not.toMatch(
    /FORTRAN|Genie|NumPy|programming-language history|array-library history/i,
  );
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  const implementationNodes = page
    .getByRole('heading', { level: 2, name: localized.implementationHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.implementationHeading}"]]`,
    );
  const implementationText = await readMathAwareText(implementationNodes);
  for (const claim of localized.implementationClaims) {
    expect(implementationText).toContain(claim);
  }

  const formula = page
    .locator('.katex-display')
    .filter({ has: page.locator('annotation[encoding="application/x-tex"]', { hasText: formulaLatex }) });
  await expect(formula).toHaveCount(1);
  await expect(formula).toHaveCSS('direction', 'ltr');
  await expect(formula.locator('annotation[encoding="application/x-tex"]')).toHaveText(
    formulaLatex,
  );
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  await expect(rustSources.locator('figcaption > span')).toHaveText(localized.rustCaptions);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));
  expect(
    await highlighted.evaluateAll((blocks) => blocks.map((block) => block.getAttribute('aria-label'))),
  ).toEqual(localized.rustLabels);
  for (const evidence of await highlighted.evaluateAll((blocks) =>
    blocks.map((block) => ({
      tabIndex: block.getAttribute('tabindex'),
      direction: block.getAttribute('dir'),
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.direction).toBe('ltr');
    expect(evidence.colors).toBeGreaterThan(1);
  }

  await expectVisualizationDecision(page, { decision: 'useful', id: 'stable-softmax' });
  const diagram = page.locator('figure[data-visualization-id="stable-softmax"]');
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(diagram.locator('[data-diagram-box]')).toHaveCount(11);

  expect(
    await diagram.locator('[data-softmax-row]').evaluateAll((rows) =>
      rows.map((row) => ({
        row: row.getAttribute('data-softmax-row'),
        maximum: row.getAttribute('data-maximum'),
        shifted: row.getAttribute('data-shifted'),
        probabilities: row.getAttribute('data-probabilities'),
        logProbabilities: row.getAttribute('data-log-probabilities'),
      })),
    ),
  ).toEqual([
    {
      row: '0',
      maximum: '1.000000000000',
      shifted: '-1.000000000000,0.000000000000',
      probabilities: '0.268941421370,0.731058578630',
      logProbabilities: '-1.313261687518,-0.313261687518',
    },
    {
      row: '1',
      maximum: '1001.000000000000',
      shifted: '-1.000000000000,0.000000000000',
      probabilities: '0.268941421370,0.731058578630',
      logProbabilities: '-1.313261687518,-0.313261687518',
    },
    {
      row: '2',
      maximum: '-1000.000000000000',
      shifted: '-1.000000000000,0.000000000000',
      probabilities: '0.268941421370,0.731058578630',
      logProbabilities: '-1.313261687518,-0.313261687518',
    },
  ]);
  expect(
    await diagram.locator('[data-naive-status]').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-naive-status')),
    ),
  ).toEqual(['finite', 'overflow-undefined', 'underflow-undefined']);
  await expect(diagram.locator('[data-stable-probability-row] td')).toContainText([
    '[0.268941421370, 0.731058578630]',
    '[0.268941421370, 0.731058578630]',
    '[0.268941421370, 0.731058578630]',
  ]);
  expect(
    await diagram.locator('[data-target-row]').evaluateAll((cards) =>
      cards.map((card) => ({
        row: card.getAttribute('data-target-row'),
        target: card.getAttribute('data-target-class'),
        loss: card.getAttribute('data-target-loss'),
      })),
    ),
  ).toEqual([
    { row: '0', target: '1', loss: '0.313261687518' },
    { row: '1', target: '0', loss: '1.313261687518' },
    { row: '2', target: '1', loss: '0.313261687518' },
  ]);
  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-error-kind')),
    ),
  ).toEqual([
    'axis-out-of-bounds',
    'empty-normalization-axis',
    'positive-infinity-logit',
    'target-out-of-bounds',
  ]);
  await expect(diagram.locator('[data-error-kind="axis-out-of-bounds"]')).toContainText(
    `${localized.rankField} 2`,
  );
  await expect(diagram.locator('[data-probabilities-match]')).toContainText(
    localized.probabilitiesMatch,
  );
  await expect(diagram.locator('[data-probabilities-match]')).toHaveAttribute(
    'data-probabilities-match',
    'yes',
  );
  await expect(diagram.locator('[data-probabilities-match]')).toHaveAttribute(
    'data-denominator',
    '1.367879441171',
  );

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scroller = diagram.locator('[data-diagram-scroll]');
  await expect(scroller).toHaveCount(1);
  await expect(scroller).toHaveAttribute('role', 'region');
  await expect(scroller).toHaveAttribute('tabindex', '0');
  await expect(scroller).toHaveAttribute('aria-label', localized.diagramSections[0]);
  await scroller.focus();
  await expect(scroller).toBeFocused();
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const selector of ['.target-card', '.error-card']) {
      const positions = await diagram.locator(selector).evaluateAll((cards) =>
        cards.slice(0, 2).map((card) => {
          const rectangle = card.getBoundingClientRect();
          return { left: rectangle.left, top: rectangle.top, bottom: rectangle.bottom };
        }),
      );
      expect(positions).toHaveLength(2);
      expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
      expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    }
  }
  expect(
    await diagram.locator('[data-diagram-box]').evaluateAll((boxes) =>
      boxes
        .map((box) => ({
          inlineDebt: (box as HTMLElement).scrollWidth - (box as HTMLElement).clientWidth,
          blockDebt: (box as HTMLElement).scrollHeight - (box as HTMLElement).clientHeight,
        }))
        .filter(({ inlineDebt, blockDebt }) => inlineDebt > 2 || blockDebt > 2),
    ),
  ).toEqual([]);

  const exerciseQuestions = page.locator('.lesson-body > ol > li');
  await expect(exerciseQuestions).toHaveText(localized.exerciseQuestions);
  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  const exerciseAnswers = exerciseDetails.locator('ol > li');
  await expect(exerciseAnswers).toHaveCount(localized.exerciseAnswers.length);
  expect(
    await Promise.all(
      localized.exerciseAnswers.map((_, index) => readMathAwareText(exerciseAnswers.nth(index))),
    ),
  ).toEqual(localized.exerciseAnswers);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 12 localized stable-softmax vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 12 is twelfth on every course index with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(12);
      expect(chapters[11]).toEqual(
        expect.objectContaining({ chapterId, order: 12, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        localeDefinition?.languageTag ?? '',
      );
      await page.getByRole('link', { name: localized.chapterTitle, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 12,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.chapterTitle,
      });
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
      await expectNoOverflowOrClientScripts(page);
    }

    for (const source of chapterLocaleDefinitions) {
      for (const target of chapterLocaleDefinitions.filter(({ code }) => code !== source.code)) {
        await page.goto(chapterPath(source.code, chapterId));
        const switchLink = page.locator(`.locale-switch a[data-locale="${target.code}"]`);
        await expect(switchLink).not.toHaveAttribute('data-locale-fallback', 'course-index');
        await switchLink.click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
        await expect(
          page.getByRole('heading', { level: 1, name: copy[target.code].chapterTitle, exact: true }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 12 ${locale} renders exact content at desktop and narrow widths`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('chapter 12 full view fits both localized diagrams without substantial travel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const diagram = page.locator('figure[data-visualization-id="stable-softmax"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'stable-softmax',
      );
      await settle(page);
      const geometry = await diagram.evaluate((node) => ({
        blockDebt: node.scrollHeight - node.clientHeight,
        blockBudget: Math.ceil(node.clientHeight * 0.2),
        inlineDebt: node.scrollWidth - node.clientWidth,
        regionInlineDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
        ).map((region) => region.scrollWidth - region.clientWidth),
        boxDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-box]'),
        ).map((box) => ({
          inline: box.scrollWidth - box.clientWidth,
          block: box.scrollHeight - box.clientHeight,
        })),
      }));
      expect(geometry.blockDebt).toBeLessThanOrEqual(geometry.blockBudget);
      expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
      expect(geometry.regionInlineDebts.every((debt) => debt <= 2)).toBe(true);
      expect(
        geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2),
      ).toBe(true);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 12 ${locale} keeps finite, stable, overflow, underflow, and rejection cues in forced colors`, async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="stable-softmax"]');
      const finite = diagram.locator('[data-naive-status="finite"]');
      const overflow = diagram.locator('[data-naive-status="overflow-undefined"]');
      const underflow = diagram.locator('[data-naive-status="underflow-undefined"]');
      const stable = diagram.locator('[data-probabilities-match]');
      const rejected = diagram.locator('.error-card').first();
      await expect(finite.locator('.state-symbol')).toHaveText('=');
      await expect(overflow.locator('.state-symbol')).toHaveText('↑');
      await expect(underflow.locator('.state-symbol')).toHaveText('↓');
      await expect(stable.locator('.state-symbol')).toHaveText('✓');
      await expect(rejected.locator('.state-symbol')).toHaveText('×');
      expect(await finite.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
        'solid',
      );
      expect(
        await overflow.evaluate((node) => window.getComputedStyle(node).borderTopStyle),
      ).toBe('dashed');
      expect(
        await underflow.evaluate((node) => window.getComputedStyle(node).borderTopStyle),
      ).toBe('dotted');
      expect(await stable.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
        'double',
      );
      expect(
        await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle),
      ).toBe('dashed');
      await expect(diagram.locator('[data-error-kind="axis-out-of-bounds"]')).toContainText(
        copy[locale].rankField,
      );
      await expectNoOverflowOrClientScripts(page);
    });
  }

  test('both localized diagrams remain complete without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    try {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        await page.goto(chapterPath(locale, chapterId));
        await expect(
          page.getByRole('heading', { level: 1, name: localized.chapterTitle, exact: true }),
        ).toBeVisible();
        const diagram = page.locator('figure[data-visualization-id="stable-softmax"]');
        await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
        await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
        await expect(diagram.locator('table[data-diagram-table]')).toHaveCount(1);
        await expect(diagram.locator('[data-softmax-row]')).toHaveCount(3);
        await expect(diagram.locator('[data-naive-status]')).toHaveCount(3);
        await expect(diagram.locator('[data-target-row]')).toHaveCount(3);
        await expect(diagram.locator('[data-error-kind]')).toHaveCount(4);
        await expect(diagram.locator('[data-diagram-box]')).toHaveCount(11);
        await expect(diagram.locator('[data-probabilities-match]')).toContainText(
          localized.probabilitiesMatch,
        );
        await expect(diagram.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
        await expectNoOverflowOrClientScripts(page);
      }
    } finally {
      await context.close();
    }
  });
});
