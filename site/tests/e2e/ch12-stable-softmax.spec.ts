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
const contentRevision = 5;
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
      "In exact arithmetic, adding one constant to every logit leaves softmax unchanged. Maximum shifting preserves that distribution while avoiding raw-exponential failures for the worked rows; log-sum-exp, log-softmax, and fused indexed mean NLL retain training evidence in the log domain when an ordinary probability rounds to zero. This course's arbitrary-axis API, finite-input policy, target layout, allocation rules, and error precedence are local correctness decisions.",
    ],
    implementationHeading: 'Implement checked log-domain operations',
    implementationClaims: [
      'For T targets, fused indexed mean NLL keeps two accumulators.',
      'If every row loss and the running sum remain finite, the function divides total by T once and returns the mean in nats per target; this single final division preserves representable subnormal mean rounding.',
      'In parallel, the fallback scaled_mean adds the two nonnegative parts of each row loss after dividing each part by T:',
      'The function returns scaled_mean only when a complete row loss or the running value of total overflows; otherwise it divides total by T and returns that quotient.',
    ],
    rustCaptions: [
      'Expose raw-exponential normalization for one ordinary and two extreme finite rows',
      'Keep axes, empty classes, outputs, non-finite logits, and indexed targets distinct',
      'Normalize finite strided logits and score flat indexed targets without avoidable overflow',
      'Run every checked probability operation over the shared three-row example',
      'Prepare stable outputs, raw failure statuses, target loss, invariance, and typed errors',
    ],
    rustLabels: [
      'Rust source implementing the bounded direct softmax baseline used to reveal finite-precision overflow and underflow',
      'Rust source defining Chapter 12 stable probability and indexed negative-log-likelihood errors',
      'Rust source implementing arbitrary-axis log-sum-exp, softmax, log-softmax, and fused indexed mean negative log-likelihood',
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
      'No. The shift only stabilizes relative logits. Exponentiation and division by the complete shifted sum produce probabilities.',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    chapterTitle: 'Преобразуйте экстремальные логиты в устойчивые вероятности',
    chapterDescription:
      'Преобразуйте логиты словаря и внимания в устойчивые вероятности, логарифмы вероятностей, значения log-sum-exp и среднее NLL по целевым индексам с помощью Rust без сторонних зависимостей.',
    headings: [
      'Предскажите результат сдвига трёх строк',
      'Нормируйте после вычитания максимума',
      'Разберите обозначения вероятностей',
      'От softmax по словарю к вероятностям Transformer',
      'Реализуйте операции с проверкой входных данных в логарифмической шкале',
      'Сравните прямое и устойчивое вычисление softmax',
      'Сделайте прогноз перед запуском Rust',
      'Подготовьте независимую проверку градиентов',
    ],
    historyHeading: 'От softmax по словарю к вероятностям Transformer',
    historyClaims: [
      'Нейронная языковая модель Бенжио и соавторов преобразует оценки словаря в положительные вероятности следующего слова с помощью выходного softmax; сумма вероятностей равна единице. При вычислениях с конечной точностью прямое возведение экспоненты от больших несдвинутых логитов может привести к переполнению, а от достаточно отрицательных — округлить все слагаемые до нуля.',
      'Бенжио и соавторы описывают выходной softmax с положительными значениями, сумма которых равна единице, а его входы трактуют как ненормированные логарифмы вероятностей следующего слова.',
      'В Transformer softmax применяется и к масштабированным оценкам «запрос — ключ» внутри внимания, и при предсказании следующего токена. В опубликованном исходном коде GPT-2 показано устойчивое вычисление для внимания: перед возведением в экспоненту из оценок по последней оси вычитают максимум, затем складывают сдвинутые экспоненты и нормируют их до взвешивания значений.',
      'Васвани и соавторы определяют внимание на основе масштабированного скалярного произведения: к масштабированным произведениям запросов и ключей применяют softmax, после чего полученными весами взвешивают значения. Для получения вероятностей следующего токена к выходам декодера применяют обучаемое линейное преобразование и softmax. В исходном коде GPT-2 от OpenAI softmax по последней оси вычисляется вычитанием максимума с сохранением размерности, возведением в экспоненту и делением на сумму с сохранением размерности; в механизме внимания эта функция применяется к масштабированным и замаскированным оценкам до объединения значений. В коде эти операции обозначены как reduce_max и reduce_sum.',
      'В точной арифметике добавление одной и той же константы ко всем логитам не меняет softmax. Вычитание максимума сохраняет это распределение и устраняет сбои прямого вычисления экспонент для рассматриваемых строк; log-sum-exp, log-softmax и объединённое среднее NLL по индексам целевых классов сохраняют сведения для обучения в логарифмической шкале, даже когда обычная вероятность округляется до нуля. Поддержка произвольной оси, требование конечных входов, расположение целей, правила выделения памяти и порядок ошибок — локальные решения этой реализации.',
    ],
    implementationHeading: 'Реализуйте операции с проверкой входных данных в логарифмической шкале',
    implementationClaims: [
      'Для T целей объединённое среднее NLL по индексам одновременно ведёт два накопителя.',
      'Если каждая потеря и текущая сумма остаются конечными, функция один раз делит total на T и возвращает среднее в натах на целевой элемент; одно деление в конце позволяет сохранить представимое субнормальное среднее.',
      'Параллельно запасной накопитель scaled_mean складывает две части каждой потери после того, как каждая часть поделена на T:',
      'Функция возвращает scaled_mean только тогда, когда полная потеря строки или текущее значение total переполняется; в остальных случаях она делит total на T и возвращает полученное частное.',
    ],
    rustCaptions: [
      'Показать прямую нормализацию экспонент для одной обычной и двух экстремальных строк с конечными значениями',
      'Различать ошибки осей, пустых классов, результата, неконечных логитов и целевых индексов',
      'Нормировать конечные логиты с произвольными шагами и оценивать плоские целевые индексы без устранимого переполнения',
      'Выполнить все проверяемые вероятностные операции над общим примером из трёх строк',
      'Подготовить устойчивые результаты, признаки сбоев прямого вычисления, потерю цели, инвариантность и типизированные ошибки',
    ],
    rustLabels: [
      'Код на Rust с прямым вариантом softmax, который показывает переполнение и округление до нуля при вычислениях с конечной точностью',
      'Код на Rust, определяющий ошибки устойчивых вероятностных операций и отрицательного логарифмического правдоподобия по индексам в главе 12',
      'Код на Rust, реализующий log-sum-exp, softmax, log-softmax и объединённое среднее отрицательное логарифмическое правдоподобие по произвольной оси',
      'Код на Rust, создающий полный пример устойчивого softmax для главы 12',
      'Код на Rust, запускающий учебный пример главы 12 перед выводом точного воспроизводимого результата',
    ],
    diagramTitle: 'Вычитание максимума: устойчивое вычисление',
    diagramDescription:
      'Сравните три сдвинутых ряда логитов, их нормализацию, потери и четыре причины отказа.',
    diagramSections: [
      'Вычтите максимум до экспоненцирования',
      'Выберите логарифм вероятности цели',
      'Отклоните неверные оси, логиты и цели',
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
      'Проверка заблуждения: превращает ли само вычитание максимума логиты в вероятности?',
    ],
    exerciseAnswers: [
      'Максимум равен 1001, поэтому сдвинутые значения в точности равны [-1,0].',
      'Нет. Общая прибавленная константа на ту же величину изменяет максимум, поэтому обе разности после вычитания остаются прежними.',
      'Обе исходные экспоненты переполняются до бесконечности, поэтому вместо вероятностей получаются отношения бесконечности к бесконечности.',
      'У одинаковых сдвинутых логитов равны экспоненты, поэтому обе вероятности равны 0.5.',
      'Логарифм вероятности класса ноль равен -1.313261687518, поэтому NLL равно 1.313261687518.',
      'После удаления оси с индексом 1 получается [2,4], а после её сохранения — [2,1,4].',
      'Log-sum-exp возвращает нейтральный элемент логарифмического сложения — отрицательную бесконечность. Для распределений softmax и log-softmax, а также для потери по целевому индексу нужен хотя бы один класс.',
      'Нет. Сдвиг лишь делает вычисление относительных логитов устойчивым. Вероятности появляются после экспоненцирования и деления на полную сумму сдвинутых экспонент.',
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
  await expect(exerciseDetails.locator('ol > li')).toHaveText(localized.exerciseAnswers);

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
