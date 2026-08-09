import {
  expect,
  test,
  type JSHandle,
  type Locator,
  type Page,
} from "@playwright/test";

import {
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type CourseChapterLink,
} from "./chapter-helpers";

const chapterId = "34-final-evaluation";
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Open one local test gate, keep the report",
    description:
      "Learn how one local final-evaluation gate isolates an already selected state, compare graph-free decoder and bigram scores fairly, and distinguish a deliberately selected fixed regression fixture from independent generalization evidence.",
    headings: [
      "Freeze the comparison before opening test",
      "Average surprise over target tokens",
      "Keep states, slots, and roles distinct",
      "From training scores to governed final LLM evidence",
      "Make the final boundary executable",
      "Read one information boundary and one comparison",
      "Classify legal decisions before you run",
      "Carry the trainer-selected model and optimizer capture forward",
    ],
    diagramTitle: "Separate local isolation from fixture evidence",
    diagramDescription:
      "Follow training and validation to one local test gate. The evaluator records 24 ordered input/target pairs, while explicit scope cues identify the deliberately selected decoder-lower-than-bigram loss ordering as fixed-fixture regression evidence rather than independent generalization or architecture superiority.",
    cues: [
      "≡ Equivalence sign: same inspected target order",
      "║ Double border: lower loss on the fixed fixture",
      "× Cross: selection rejected the test partition",
    ],
    detailsFragment: "Dataset access control and a shared audit log",
    historyFragments: [
      "Early neural language-model evaluation moved from training-set reporting",
      "does not claim that these papers used exactly one test query",
    ],
    ownershipFragments: [
      "Evaluation later verifies that the retained state and borrowed model match exactly",
      "TrainingResult provides the actual Chapter 33 retained selected state and matching decoder",
      "Role-assertion, provenance-assertion, selected-state/model, context, and vocabulary errors leave the gate-opening count",
      "InspectedTestEpoch and its fields are private to the evaluation module",
      "one input-validation boundary for report evidence and later bigram scoring",
      "does not promise one physical memory pass",
    ],
    trustBoundaryFragments: [
      "The evaluator compares those strings for exact equality; it neither derives them nor checks their relationship to the underlying corpus, split construction, or tokenizer. Equal strings can therefore describe different underlying artifacts.",
      "It does not validate selected_step, and it checks selected_validation_loss only for finiteness and nonnegativity.",
      "The Chapter 34 fixture supplies the intended histories at its assembly call sites.",
      "The reverse-cycle documents were deliberately selected for the recorded decoder-lower ordering, which the learner program now retains as a regression condition.",
      "an alternate fixed-sequence diagnostic makes the bigram lower while the same graph-free and unchanged-state guarantees still pass",
      "That concrete assembly evidence is stronger than the generic constructors' labels",
      "First change the tokenizer mapping while reusing the same tokenizer fingerprint string and the same vocabulary/context sizes. Then change only the fingerprint string.",
    ],
    tokenizerAnswerFragment:
      "Reusing the same string hides the first change from these assertion checks; the API does not inspect the tokenizer. Changing only the string creates an assertion mismatch",
    evidenceBoundaryFragments: [
      "The test documents deliberately reverse the synthetic training cycle and were selected for that recorded ordering after a neutral holdout did not preserve it.",
      "The exact ordering is now rerun as a regression condition.",
      "These are valid measurements of this fixed teaching fixture and its executable boundary, but they are not an untouched independent estimate of generalization and do not establish architecture-wide decoder superiority.",
      "this general warning does not establish any fact about this repository's fixture history or scores",
      "evidence=scope:fixed-fixture-regression within_run_selection_isolated:true fixture_selected_for_ordering:true independent_generalization_estimate:false architecture_superiority_evidence:false",
      "the stale name decoder_beats_bigram is not current evidence",
    ],
    proofHeading: "Separate assertions from checked facts",
    sectionHeadings: [
      "Give each partition one responsibility",
      "Score the same inspected target order",
      "Separate assertions from checked facts",
    ],
    stageLabels: [
      "Train fits parameters",
      "Validation selects the checkpoint",
      "Freeze every decision",
      "Open one local test gate",
      "Keep the report immutable",
    ],
    stageCues: [
      "May update parameters",
      "May choose among planned states",
      "No choice may change now",
      "Validate and store ordered pairs for evidence, never selection",
      "Mechanically checked or recorded",
    ],
    sectionCaptions: [
      "The numbered sequence assigns one responsibility to each stage: training fits, validation selects, and the evaluator may inspect test IDs only after every choice is frozen.",
      "The decoder evaluates the epoch separately without a graph, while the bigram reuses the same 24 checked input/target pairs. The double border marks only the lower recorded mean on this fixed regression fixture.",
      "Corpus, split, and tokenizer strings are caller-supplied; equality checks only their consistency. Context, vocabulary, test targets, state/model identity, and no-grad state preservation are independently checked. The fixture assembly supplies the intended histories.",
    ],
    proofLabels: [
      "Caller-supplied identifiers agree",
      "Selection was already closed",
      "Decoder scoring stays separate and graph-free",
      "One inspected test view and one report",
    ],
    tableHeadings: [
      "Model",
      "Asserted fit role",
      "Asserted selection role",
      "Shared targets",
      "Total NLL",
      "Mean test loss",
    ],
    rowHeaders: [
      "Selected decoder Double border: lower loss on the fixed fixture",
      "Frozen bigram",
    ],
    roleCells: ["Training", "Validation", "Training", "Not selected"],
    scrollerName:
      "Scrollable fixed-fixture decoder and bigram scores over the same inspected target order",
    boundaryRustCaption:
      "Encode the modern separation between a validation-selected model and one local test evaluation",
    handoffFragments: [
      "Chapter 35 will serialize the trainer-issued selected training state: the selected model snapshot, its matching AdamW snapshot, and their shared step.",
      "The Chapter 34 evaluation report and test provenance are not serialized, and the sampling RNG is not evaluation provenance.",
      "Serialization must reproduce this model and its logits, not reopen test data or turn the final report into a new selection signal.",
    ],
  },
  ru: {
    revisionLabel: "Версия материала",
    title:
      "Передайте тестовую выборку одному локальному оценщику и сохраните отчёт",
    description:
      "Разберитесь, как в пределах одного запуска зафиксировать решения, принятые по валидации, проверить и сохранить упорядоченные пары входных и целевых токенов, а затем отделить корректное сравнение на намеренно выбранном фиксированном примере от независимой оценки способности модели обобщать и от доказательства общего превосходства архитектуры.",
    headings: [
      "Зафиксируйте условия сравнения до открытия тестовой выборки",
      "Усредняйте неожиданность по целевым токенам",
      "Не смешивайте состояния, позиции и роли выборок",
      "От результатов обучения к управляемой итоговой оценке LLM",
      "Реализуйте правила итоговой оценки в коде",
      "Проследите одну информационную границу и одно сравнение",
      "Определите допустимые решения до запуска",
      "Передайте дальше выбранную модель и соответствующий снимок оптимизатора",
    ],
    diagramTitle:
      "Отделите локальную изоляцию от результата фиксированного примера",
    diagramDescription:
      "Проследите путь от обучения и выбора по валидации к одному локальному механизму доступа к тестовой выборке. Оценщик сохраняет 24 упорядоченные пары «вход — цель», а явные пометки указывают, что намеренно выбранный порядок потерь, при котором потери декодера ниже потерь биграммной модели, служит регрессионной проверкой фиксированного примера, а не независимой оценкой способности модели обобщать или доказательством общего превосходства архитектуры.",
    cues: [
      "≡ Знак эквивалентности: одна и та же последовательность проверенных пар «вход — цель»",
      "║ Двойная рамка: меньшие потери на фиксированном примере",
      "× Знак ×: при выборе доступ к тестовой выборке был отклонён",
    ],
    detailsFragment: "контроля доступа к набору данных и общего журнала аудита",
    historyFragments: [
      "В ранних исследованиях нейронных языковых моделей постепенно переходили",
      "Работа подтверждает разделение трёх ролей, но не утверждает, что к тестовой выборке обращались ровно один раз.",
    ],
    ownershipFragments: [
      "Позже, перед открытием доступа, оценщик сверяет сохранённое состояние с переданным декодером",
      "TrainingResult предоставляет фактическое сохранённое состояние из главы 33 и соответствующий декодер",
      "Ошибки заявленной роли, согласованности заявленных сведений, несоответствия сохранённого состояния выбранному декодеру, длины контекста или размера словаря оставляют счётчик открытий доступа",
      "InspectedTestEpoch и его поля доступны только внутри модуля оценки",
      "входные данные проверяются на одной границе — при открытии доступа к тестовой эпохе",
      "не означает один физический проход по памяти",
    ],
    trustBoundaryFragments: [
      "Оценщик проверяет точное совпадение этих строк, но сам не вычисляет их и не сверяет с фактическим корпусом, способом разбиения или токенизатором. Поэтому одинаковыми строками можно ошибочно пометить разные данные или токенизаторы.",
      "Значение selected_step не проверяется, а selected_validation_loss проверяется только на конечность и неотрицательность.",
      "В учебном примере главы 34 требуемая история обеспечивается в местах сборки объектов.",
      "Документы с обратным циклом намеренно выбрали так, чтобы значение функции потерь декодера было ниже, и учебная программа сохраняет этот порядок как условие регрессии.",
      "на другой фиксированной последовательности значение биграммной модели оказывается ниже, а оценка всё равно выполняется без графа и не меняет биты состояния",
      "Такие места вызова дают больше оснований, чем метки универсальных конструкторов",
      "Сначала измените отображение токенизатора, но повторно используйте прежнюю строку отпечатка и сохраните размеры словаря и контекста. Затем измените только строку отпечатка.",
    ],
    tokenizerAnswerFragment:
      "Повторное использование той же строки скрывает первое изменение от проверки заявленных сведений: API не исследует токенизатор. Изменение самой строки создаёт несовпадение заявленных сведений",
    evidenceBoundaryFragments: [
      "Тестовые документы намеренно следуют синтетическому обучающему циклу в обратном направлении. Их выбрали именно ради записанного порядка результатов после того, как нейтральная отложенная выборка его не сохранила.",
      "Теперь этот точный порядок повторно проверяется как условие регрессии.",
      "Значения корректно характеризуют фиксированный учебный пример и исполняемую границу, но не являются независимой оценкой способности модели обобщать на ранее не использованных данных и не доказывают общего превосходства архитектуры декодера.",
      "этот общий вывод не устанавливает фактов об истории или результатах учебного примера из данного репозитория",
      "evidence=scope:fixed-fixture-regression within_run_selection_isolated:true fixture_selected_for_ordering:true independent_generalization_estimate:false architecture_superiority_evidence:false",
      "прежнее имя decoder_beats_bigram не является актуальным свидетельством",
    ],
    proofHeading: "Отделите заявленные сведения от проверяемых фактов",
    sectionHeadings: [
      "Разделите роли выборок",
      "Сравните модели на одной и той же проверенной последовательности пар «вход — цель»",
      "Отделите заявленные сведения от проверяемых фактов",
    ],
    stageLabels: [
      "Обучение подгоняет параметры",
      "Валидация выбирает контрольную точку",
      "Зафиксируйте все решения",
      "Откройте один локальный доступ к тестовой выборке",
      "Сохраните неизменяемый отчёт",
    ],
    stageCues: [
      "Может обновлять параметры",
      "Может выбирать среди запланированных состояний",
      "После этого решения не меняются",
      "Проверяет и сохраняет пары для итогового отчёта, но не для выбора модели",
      "Проверено реализацией или записано",
    ],
    sectionCaptions: [
      "Нумерованная последовательность закрепляет за каждым этапом одну роль: обучение подгоняет параметры, валидация выбирает состояние, а оценщик может прочитать ID тестовых токенов только после фиксации всех решений.",
      "Декодер отдельно оценивает исходную эпоху без записи графа вычислений, а биграммная модель использует те же 24 проверенные пары «вход — цель» в том же порядке. Двойная рамка отмечает только меньшее среднее значение на фиксированном примере, сохранённом для регрессионной проверки.",
      "Строки корпуса, разбиения и токенизатора задаёт вызывающий код; их совпадение показывает только согласованность метаданных. Длину контекста, словарь, тестовые цели, совпадение состояния с моделью и сохранность состояния при оценке без графа реализация проверяет отдельно. Требуемую историю объектов обеспечивает код сборки примера.",
    ],
    proofLabels: [
      "Заданные вызывающим кодом идентификаторы совпадают",
      "Выбор уже был завершён",
      "Декодер оценивается отдельно, без записи графа вычислений",
      "Одно проверенное представление тестовой эпохи и один отчёт",
    ],
    tableHeadings: [
      "Модель",
      "Заявленная роль при обучении",
      "Заявленная роль при выборе",
      "Одинаковые целевые позиции",
      "Суммарная NLL",
      "Средние потери на тесте",
    ],
    rowHeaders: [
      "Выбранный декодер Двойная рамка: меньшие потери на фиксированном примере",
      "Зафиксированная биграммная модель",
    ],
    roleCells: ["Обучение", "Валидация", "Обучение", "Нет"],
    scrollerName:
      "Прокручиваемые результаты декодера и биграммной модели на фиксированном примере с одной и той же проверенной последовательностью пар «вход — цель»",
    boundaryRustCaption:
      "Закрепите современное разделение между моделью, выбранной по валидации, и одной локальной оценкой на тестовой выборке",
    handoffFragments: [
      "В главе 35 будет сериализовано состояние, выданное циклом обучения: снимок выбранной модели, зафиксированное одновременно с ним состояние AdamW и их общий номер шага.",
      "Итоговый отчёт главы 34 и сведения о происхождении тестовых данных не сериализуются, а генератор для выбора токенов не относится к происхождению данных оценки.",
      "Сериализованное состояние должно позволять точно воспроизвести эту модель и её логиты.",
    ],
  },
} as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, "");
const mainFormulaLatex =
  "\\mathcal{L}_{te}(\\theta_{s^*})=-\\frac{1}{N_{te}}\\sum_{n=1}^{N_{te}}\\log p_{\\theta_{s^*}}(y_n\\mid x_n)";

async function expectFormulaGeometry(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
  const result = await page
    .locator(
      ".lesson-body .katex-display, .lesson-body :not(.katex-display) > .katex",
    )
    .evaluateAll((nodes) =>
      nodes.reduce(
        (result, node, index) => {
          const element = node as HTMLElement;
          const rect = element.getBoundingClientRect();
          const lesson = element.closest<HTMLElement>(".lesson-body");
          const rendered = element.querySelector<HTMLElement>(".katex-html");
          const source =
            element.querySelector('annotation[encoding="application/x-tex"]')
              ?.textContent ?? `formula ${index}`;
          const issues: string[] = [];
          if (!lesson || !rendered) {
            result.problems.push(
              source + " lacks its lesson or rendered KaTeX owner",
            );
            return result;
          }
          const lessonRect = lesson.getBoundingClientRect();
          const sanctionedScroller = element.closest<HTMLElement>(
            "[data-diagram-scroll]",
          );
          const inlineOwner = element.closest<HTMLElement>(
            "p, li, dt, dd, th, td, figcaption, h1, h2, h3, h4, h5",
          );
          const containmentRect = element.matches(".katex-display")
            ? rect
            : (inlineOwner?.getBoundingClientRect() ?? lessonRect);
          const style = getComputedStyle(element);
          const renderedStyle = getComputedStyle(rendered);
          const hasMaterialClientBox =
            element.clientWidth > 0 && element.clientHeight > 0;
          const zeroClientInlineMetric =
            element.clientWidth === 0 &&
            element.clientHeight === 0 &&
            style.display === "inline" &&
            rect.width > 0 &&
            rect.height > 0;
          if (!hasMaterialClientBox && !zeroClientInlineMetric) {
            issues.push(source + " has invalid zero-client geometry");
          }
          const inlineDebt = zeroClientInlineMetric
            ? 0
            : hasMaterialClientBox
              ? Math.max(0, element.scrollWidth - element.clientWidth)
              : 0;
          const blockDebt = zeroClientInlineMetric
            ? 0
            : hasMaterialClientBox
              ? Math.max(0, element.scrollHeight - element.clientHeight)
              : 0;
          const inertInlineFallback =
            element.matches(".katex") &&
            !element.parentElement?.matches(".katex-display") &&
            style.overflowX === "auto" &&
            style.overflowY === "hidden" &&
            inlineDebt <= 2 &&
            blockDebt <= 2;
          const displayScrollFallback =
            element.matches(".katex-display") &&
            style.overflowX === "auto" &&
            style.overflowY === "hidden" &&
            blockDebt <= 2;
          if (rect.width <= 0 || rect.height <= 0) {
            issues.push(source + " has no visible box");
          }
          const mathml = element.querySelector<HTMLElement>(".katex-mathml");
          if (!mathml) {
            issues.push(source + " has no accessible MathML projection");
          } else {
            const mathmlStyle = getComputedStyle(mathml);
            if (
              mathmlStyle.display !== "block" ||
              mathmlStyle.overflowX !== "clip"
            ) {
              issues.push(source + " does not contain its MathML projection");
            }
          }
          if (style.direction !== "ltr") {
            issues.push(source + " is not left-to-right");
          }
          if (
            style.display === "none" ||
            style.visibility !== "visible" ||
            Number.parseFloat(style.opacity) < 0.99 ||
            renderedStyle.display === "none" ||
            renderedStyle.visibility !== "visible" ||
            Number.parseFloat(renderedStyle.opacity) < 0.99
          ) {
            issues.push(source + " is concealed");
          }
          if (
            (!inertInlineFallback &&
              !displayScrollFallback &&
              [style.overflowX, style.overflowY].some((value) =>
                ["hidden", "clip"].includes(value),
              )) ||
            [style.contain, renderedStyle.contain].some((contain) =>
              /(?:^|\s)(?:paint|strict|content)(?:\s|$)/.test(contain),
            ) ||
            [style.contentVisibility, renderedStyle.contentVisibility].includes(
              "hidden",
            )
          ) {
            issues.push(source + " uses concealment");
          }
          if (
            ["auto", "clip", "hidden", "scroll"].includes(style.overflowY) &&
            blockDebt > 2
          ) {
            issues.push(source + " clips vertically");
          }
          if (element.classList.contains("katex-display")) {
            const owner = element.parentElement;
            const next = owner?.nextElementSibling as HTMLElement | null;
            if (
              owner &&
              next &&
              owner.getBoundingClientRect().bottom >
                next.getBoundingClientRect().top + 1
            ) {
              issues.push(source + " overlaps the following block");
            }
          }

          const range = document.createRange();
          range.selectNodeContents(rendered);
          const originalScrollLeft = element.scrollLeft;
          const readPaint = () =>
            Array.from(range.getClientRects()).filter(
              ({ width, height }) => width > 0 && height > 0,
            );
          element.scrollLeft = 0;
          const startPaint = readPaint();
          element.scrollLeft = Math.max(
            0,
            element.scrollWidth - element.clientWidth,
          );
          const endPaint = readPaint();
          element.scrollLeft = originalScrollLeft;
          if (startPaint.length === 0 || endPaint.length === 0) {
            issues.push(source + " has no positive rendered Range paint");
          }
          if (
            inlineDebt > 2 &&
            (!element.classList.contains("katex-display") ||
              !["auto", "scroll"].includes(style.overflowX))
          ) {
            issues.push(source + " lacks the smallest formula scroll owner");
          }
          if (
            inlineDebt <= 2 &&
            !sanctionedScroller &&
            (rect.left < lessonRect.left - 2 ||
              rect.right > lessonRect.right + 2)
          ) {
            issues.push(source + " escapes the lesson content box");
          }
          if (element.matches(".katex-display")) {
            if (
              startPaint.some(
                (paint) =>
                  paint.left < rect.left - 2 ||
                  paint.top < rect.top - 2 ||
                  paint.bottom > rect.bottom + 2,
              )
            ) {
              issues.push(source + " start paint escapes its formula box");
            }
            if (
              endPaint.some(
                (paint) =>
                  paint.right > rect.right + 2 ||
                  paint.top < rect.top - 2 ||
                  paint.bottom > rect.bottom + 2,
              )
            ) {
              issues.push(source + " end paint is not reachable at scroll end");
            }
          } else if (
            startPaint.some(
              (paint) =>
                paint.left < containmentRect.left - 2 ||
                paint.right > containmentRect.right + 2 ||
                paint.top < lessonRect.top - 2 ||
                paint.bottom > lessonRect.bottom + 2,
            )
          ) {
            issues.push(source + " inline paint escapes its text owner");
          }
          result.problems.push(...issues);
          result.positivePaintCount += startPaint.length;
          result.formulaCount += 1;
          return result;
        },
        {
          problems: [] as string[],
          positivePaintCount: 0,
          formulaCount: 0,
        },
      ),
    );
  expect(result.problems).toEqual([]);
  expect(result.formulaCount).toBeGreaterThan(0);
  expect(result.positivePaintCount).toBeGreaterThan(0);
}

async function expectDiagramContainment(page: Page, settle = true) {
  if (settle) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolveFrame) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolveFrame()),
        ),
      );
    });
  }
  const diagram = page.locator(
    'figure[data-visualization-id="final-evaluation-boundary"]',
  );
  const result = await diagram.evaluate((node) => {
    const root = node as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const problems: string[] = [];
    const markedBoxes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-box]"),
    );
    const tableCells = Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-diagram-table] th, [data-diagram-table] td",
      ),
    );
    const stateSymbols = Array.from(
      root.querySelectorAll<HTMLElement>(".state-symbol"),
    );
    const expectedBorderedOwners = [
      root,
      ...markedBoxes,
      ...tableCells,
      ...stateSymbols,
    ];
    const expectedBorderedOwnerSet = new Set(expectedBorderedOwners);
    const describeElement = (element: HTMLElement) => {
      const classes = Array.from(element.classList)
        .slice(0, 4)
        .map((name) => "." + name)
        .join("");
      const data = [
        element.getAttribute("data-stage"),
        element.getAttribute("data-proof"),
        element.getAttribute("data-score-model"),
      ]
        .filter(Boolean)
        .join("/");
      return (
        element.tagName.toLowerCase() + classes + (data ? "[" + data + "]" : "")
      );
    };
    const colorHasZeroAlpha = (color: string) => {
      if (color === "transparent") return true;
      const commaAlpha = color.match(/^rgba\([^)]*,\s*(0(?:\.0+)?)\s*\)$/);
      if (commaAlpha) return Number.parseFloat(commaAlpha[1]) === 0;
      const slashAlpha = color.match(/\/\s*(0(?:\.0+)?%?)\s*\)$/);
      if (!slashAlpha) return false;
      return Number.parseFloat(slashAlpha[1]) === 0;
    };
    const hasFourSidedBorder = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const widths = [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ].map(Number.parseFloat);
      const styles = [
        style.borderTopStyle,
        style.borderRightStyle,
        style.borderBottomStyle,
        style.borderLeftStyle,
      ];
      const colors = [
        style.borderTopColor,
        style.borderRightColor,
        style.borderBottomColor,
        style.borderLeftColor,
      ];
      return (
        widths.every((width) => width > 0) &&
        styles.every((value) => !["none", "hidden"].includes(value)) &&
        colors.every((value) => !colorHasZeroAlpha(value))
      );
    };
    const borderedOwners = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) =>
        !element.closest("[data-diagram-full-view-controls]") &&
        hasFourSidedBorder(element),
    );
    const borderedOwnerSet = new Set(borderedOwners);
    for (const expected of expectedBorderedOwners) {
      if (!borderedOwnerSet.has(expected)) {
        problems.push("a declared content owner lacks a four-sided border");
      }
    }
    for (const owner of borderedOwners) {
      if (!expectedBorderedOwnerSet.has(owner)) {
        problems.push(
          "an unclassified bordered owner bypasses containment: " +
            owner.tagName.toLowerCase() +
            (owner.className
              ? "." + String(owner.className).split(/\s+/).join(".")
              : ""),
        );
      }
    }
    const nearestBorderedOwner = (element: HTMLElement | null) => {
      let current = element;
      while (current && current !== root.parentElement) {
        if (borderedOwnerSet.has(current)) return current;
        current = current.parentElement;
      }
      return null;
    };
    const concealedStyle = (style: CSSStyleDeclaration) => {
      const webkitMask = style.getPropertyValue("-webkit-mask-image");
      return (
        style.display === "none" ||
        ["hidden", "collapse"].includes(style.visibility) ||
        Number.parseFloat(style.opacity) < 0.99 ||
        colorHasZeroAlpha(style.color) ||
        style.filter !== "none" ||
        style.clipPath !== "none" ||
        Boolean(style.maskImage && style.maskImage !== "none") ||
        Boolean(webkitMask && webkitMask !== "none") ||
        /(?:^|\s)(?:paint|strict|content)(?:\s|$)/.test(style.contain) ||
        style.contentVisibility === "hidden"
      );
    };
    const isFullscreen = document.fullscreenElement === root;
    for (const [index, box] of borderedOwners.entries()) {
      const style = getComputedStyle(box);
      const inlineDebt = Math.max(0, box.scrollWidth - box.clientWidth);
      const blockDebt = Math.max(0, box.scrollHeight - box.clientHeight);
      if (inlineDebt > 2) {
        problems.push("box " + index + " owns forbidden inline travel");
      }
      if (blockDebt > 2) {
        if (
          box !== root ||
          !isFullscreen ||
          !["auto", "scroll"].includes(style.overflowY)
        ) {
          problems.push("box " + index + " owns forbidden block travel");
        }
      }
      if (
        [style.overflowX, style.overflowY].some((value) =>
          ["hidden", "clip"].includes(value),
        )
      ) {
        problems.push("box " + index + " hides overflow");
      }
      if (concealedStyle(style)) {
        problems.push("box " + index + " conceals paint");
      }
      const boxRect = box.getBoundingClientRect();
      const innerRect = {
        left: boxRect.left + Number.parseFloat(style.borderLeftWidth),
        right: boxRect.right - Number.parseFloat(style.borderRightWidth),
        top: boxRect.top + Number.parseFloat(style.borderTopWidth),
        bottom: boxRect.bottom - Number.parseFloat(style.borderBottomWidth),
      };
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      let textIndex = 0;
      while (textNode) {
        const rawText = textNode.textContent ?? "";
        const text = rawText.replace(/[\s\u200b-\u200d\ufeff]/g, "");
        const parent = textNode.parentElement;
        const nearestBox = nearestBorderedOwner(parent);
        if (
          text &&
          parent &&
          nearestBox === box &&
          !parent.closest(".katex-mathml, [data-diagram-full-view-controls]")
        ) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          const paintRects = Array.from(range.getClientRects()).filter(
            ({ width, height }) => width > 0 && height > 0,
          );
          if (paintRects.length === 0) {
            problems.push(
              "box " +
                index +
                " " +
                describeElement(box) +
                " text " +
                textIndex +
                " " +
                JSON.stringify(text) +
                " in " +
                describeElement(parent) +
                " has no positive paint",
            );
          }
          let ancestor: HTMLElement | null = parent;
          let concealedAncestor = false;
          while (ancestor) {
            if (concealedStyle(getComputedStyle(ancestor))) {
              concealedAncestor = true;
              break;
            }
            if (ancestor === box) break;
            ancestor = ancestor.parentElement;
          }
          if (concealedAncestor) {
            problems.push(
              "box " + index + " text " + textIndex + " is concealed",
            );
          }
          for (const rect of paintRects) {
            const sanctionedTravelRegion = parent.closest<HTMLElement>(
              "[data-diagram-scroll]",
            );
            const travelTableRect = sanctionedTravelRegion
              ?.querySelector<HTMLElement>("table")
              ?.getBoundingClientRect();
            const boxIsInsideTravelRegion =
              box.closest("[data-diagram-scroll]") !== null;
            const horizontallyContained =
              (rect.left >= innerRect.left - 2 &&
                rect.right <= innerRect.right + 2) ||
              (!boxIsInsideTravelRegion &&
                travelTableRect !== undefined &&
                rect.left >= travelTableRect.left - 2 &&
                rect.right <= travelTableRect.right + 2);
            if (
              !horizontallyContained ||
              rect.top < innerRect.top - 2 ||
              rect.bottom > innerRect.bottom + 2
            ) {
              problems.push(
                "box " +
                  index +
                  " " +
                  describeElement(box) +
                  " text " +
                  textIndex +
                  " " +
                  JSON.stringify(text) +
                  " in " +
                  describeElement(parent) +
                  " crosses its border; paint=" +
                  JSON.stringify({
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                  }) +
                  " inner=" +
                  JSON.stringify(innerRect),
              );
            }
          }
          textIndex += 1;
        }
        textNode = walker.nextNode();
      }
    }
    const namedScroller = root.querySelector<HTMLElement>(
      "[data-diagram-scroll]",
    );
    for (const [index, element] of [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].entries()) {
      if (element.closest(".katex-mathml, [data-diagram-full-view-controls]")) {
        continue;
      }
      if (
        !element.matches(".katex, .katex-display") &&
        element.closest(".katex, .katex-display")
      ) {
        continue;
      }
      const style = getComputedStyle(element);
      const inlineDebt = Math.max(0, element.scrollWidth - element.clientWidth);
      const blockDebt = Math.max(
        0,
        element.scrollHeight - element.clientHeight,
      );
      const inertInlineMathFallback =
        element.matches(".katex") &&
        !element.parentElement?.matches(".katex-display") &&
        style.overflowX === "auto" &&
        style.overflowY === "hidden" &&
        inlineDebt <= 2 &&
        blockDebt <= 2;
      if (
        !inertInlineMathFallback &&
        [style.overflowX, style.overflowY].some((value) =>
          ["hidden", "clip"].includes(value),
        )
      ) {
        problems.push(
          "element " +
            index +
            " " +
            describeElement(element) +
            " hides or clips overflow " +
            style.overflowX +
            "/" +
            style.overflowY +
            " debt=" +
            inlineDebt +
            "/" +
            blockDebt,
        );
      }
      if (concealedStyle(style)) {
        problems.push("element " + index + " conceals paint");
      }
      const hasMaterialBox =
        element.clientWidth > 0 && element.clientHeight > 0;
      const elementRect = element.getBoundingClientRect();
      const zeroClientInlineMetric =
        element.clientWidth === 0 &&
        element.clientHeight === 0 &&
        style.display === "inline" &&
        elementRect.width > 0 &&
        elementRect.height > 0;
      const hasNonblankText =
        (element.textContent ?? "").replace(/[\s\u200b-\u200d\ufeff]/g, "")
          .length > 0;
      if (!hasMaterialBox && !zeroClientInlineMetric && hasNonblankText) {
        problems.push(
          "element " +
            index +
            " " +
            describeElement(element) +
            " has invalid zero-client geometry",
        );
      }
      if (
        hasMaterialBox &&
        !inertInlineMathFallback &&
        (style.overflowX === "scroll" ||
          (style.overflowX === "auto" && inlineDebt > 2)) &&
        element !== namedScroller
      ) {
        problems.push(
          "element " +
            index +
            " " +
            describeElement(element) +
            " is an unapproved inline owner " +
            style.overflowX +
            " debt=" +
            inlineDebt,
        );
      }
      if (
        hasMaterialBox &&
        !inertInlineMathFallback &&
        (style.overflowY === "scroll" ||
          (style.overflowY === "auto" && blockDebt > 2)) &&
        (element !== root || !isFullscreen)
      ) {
        problems.push(
          "element " +
            index +
            " " +
            describeElement(element) +
            " is an unapproved block owner " +
            style.overflowY +
            " debt=" +
            blockDebt,
        );
      }
    }
    const scrollers = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
    );
    for (const [index, scroller] of scrollers.entries()) {
      const rect = scroller.getBoundingClientRect();
      const style = getComputedStyle(scroller);
      const visibleLeft = rect.left;
      const visibleRight = rect.right;
      if (
        scroller.getAttribute("role") !== "region" ||
        scroller.getAttribute("tabindex") !== "0" ||
        !scroller.getAttribute("aria-label")
      ) {
        problems.push("scroller " + index + " is not a named keyboard region");
      }
      if (!["auto", "scroll"].includes(style.overflowX))
        problems.push("scroller " + index + " does not own horizontal travel");
      if (scroller.scrollHeight > scroller.clientHeight + 2)
        problems.push("scroller " + index + " clips vertically");
      if (rect.left < rootRect.left - 2 || rect.right > rootRect.right + 2)
        problems.push("scroller " + index + " escapes the figure");
      const table = scroller.querySelector<HTMLElement>("table");
      if (!table) {
        problems.push("scroller " + index + " lacks its table");
      } else {
        const originalScrollLeft = scroller.scrollLeft;
        const maximumScrollLeft = Math.max(
          0,
          scroller.scrollWidth - scroller.clientWidth,
        );
        const edgeRects = [0, 1_000_000, -1_000_000].map((position) => {
          scroller.scrollLeft = position;
          const tableRect = table.getBoundingClientRect();
          const cells = Array.from(
            table.querySelectorAll<HTMLElement>("th, td"),
          );
          const edgePaintIsReachable = (side: "left" | "right") => {
            const edgeCells = cells.filter((cell) => {
              const cellRect = cell.getBoundingClientRect();
              return side === "left"
                ? Math.abs(cellRect.left - tableRect.left) <= 4
                : Math.abs(cellRect.right - tableRect.right) <= 4;
            });
            const paint = edgeCells.flatMap((cell) => {
              const walker = document.createTreeWalker(
                cell,
                NodeFilter.SHOW_TEXT,
              );
              const rects: DOMRect[] = [];
              let textNode = walker.nextNode();
              while (textNode) {
                const parent = textNode.parentElement;
                const text = textNode.textContent?.replace(/\s+/g, "") ?? "";
                if (text && parent && !parent.closest(".katex-mathml")) {
                  const range = document.createRange();
                  range.selectNodeContents(textNode);
                  rects.push(
                    ...Array.from(range.getClientRects()).filter(
                      ({ width, height }) => width > 0 && height > 0,
                    ),
                  );
                }
                textNode = walker.nextNode();
              }
              return rects;
            });
            return (
              edgeCells.length > 0 &&
              paint.length > 0 &&
              paint.every(
                ({ left, right }) =>
                  left >= visibleLeft - 2 && right <= visibleRight + 2,
              )
            );
          };
          return {
            actualScrollLeft: scroller.scrollLeft,
            left: tableRect.left,
            leftPaintReachable: edgePaintIsReachable("left"),
            right: tableRect.right,
            rightPaintReachable: edgePaintIsReachable("right"),
          };
        });
        scroller.scrollLeft = originalScrollLeft;
        if (
          !edgeRects.some(
            ({ left, leftPaintReachable }) =>
              left >= visibleLeft - 4 || leftPaintReachable,
          )
        ) {
          problems.push(
            "scroller " +
              index +
              " left edge is unreachable " +
              JSON.stringify({
                clientWidth: scroller.clientWidth,
                direction: style.direction,
                edgeRects,
                maximumScrollLeft,
                scrollWidth: scroller.scrollWidth,
                visibleLeft,
                visibleRight,
              }),
          );
        }
        if (
          !edgeRects.some(
            ({ right, rightPaintReachable }) =>
              right <= visibleRight + 4 || rightPaintReachable,
          )
        ) {
          problems.push(
            "scroller " +
              index +
              " right edge is unreachable " +
              JSON.stringify({
                clientWidth: scroller.clientWidth,
                direction: style.direction,
                edgeRects,
                maximumScrollLeft,
                scrollWidth: scroller.scrollWidth,
                visibleLeft,
                visibleRight,
              }),
          );
        }
      }
    }
    const rootBlockDebt = Math.max(0, root.scrollHeight - root.clientHeight);
    let rootEndReachable = true;
    if (isFullscreen && rootBlockDebt > 2) {
      const lastContent = root.querySelector<HTMLElement>(
        ":scope > section:last-of-type",
      );
      if (!lastContent) {
        rootEndReachable = false;
      } else {
        const originalScrollTop = root.scrollTop;
        root.scrollTop = rootBlockDebt;
        const viewportRect = root.getBoundingClientRect();
        const contentRect = lastContent.getBoundingClientRect();
        rootEndReachable =
          contentRect.bottom <= viewportRect.bottom + 2 &&
          contentRect.bottom >= viewportRect.top - 2;
        root.scrollTop = originalScrollTop;
      }
      if (!rootEndReachable) {
        problems.push(
          "fullscreen root cannot reach its final content at scroll end",
        );
      }
    }
    return {
      borderedOwnerCount: borderedOwners.length,
      boundedBoxCount: markedBoxes.length + tableCells.length,
      boxCount: markedBoxes.length,
      clientWidth: root.clientWidth,
      problems,
      rootBlockDebt,
      rootEndReachable,
      rootOverflowY: getComputedStyle(root).overflowY,
      scrollerCount: scrollers.length,
      scrollWidth: root.scrollWidth,
      stateSymbolCount: stateSymbols.length,
      tableCellCount: tableCells.length,
    };
  });
  expect(result.problems).toEqual([]);
  expect(result.borderedOwnerCount).toBe(39);
  expect(result.boundedBoxCount).toBe(33);
  expect(result.boxCount).toBe(15);
  expect(result.scrollerCount).toBe(1);
  expect(result.stateSymbolCount).toBe(5);
  expect(result.tableCellCount).toBe(18);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  expect(result.rootEndReachable).toBe(true);
  if (result.rootBlockDebt > 2) {
    expect(result.rootOverflowY).toMatch(/^(?:auto|scroll)$/);
  }
  const scroller = diagram.locator("[data-diagram-scroll]");
  await scroller.focus();
  await expect(scroller).toBeFocused();
}

async function expectOnePaintRangeForExactValue(
  diagram: Locator,
  value: string,
) {
  const technicalValue = diagram.locator("code bdi").filter({
    hasText: value,
  });
  await expect(technicalValue).toHaveCount(1);
  await expect(technicalValue).toHaveText(value);
  const paint = await technicalValue.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const positiveRects = Array.from(range.getClientRects()).filter(
      ({ width, height }) => width > 0 && height > 0,
    );
    return {
      positiveRectCount: positiveRects.length,
      text: node.textContent,
    };
  });
  expect(paint).toEqual({
    positiveRectCount: 1,
    text: value,
  });
}

async function captureAuthoredDiagram(
  diagram: Locator,
): Promise<JSHandle<HTMLElement[]>> {
  return diagram.evaluateHandle((node) =>
    [
      node as HTMLElement,
      ...Array.from(node.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) => !element.closest("[data-diagram-full-view-controls]"),
    ),
  );
}

async function expectSameAuthoredDiagram(
  diagram: Locator,
  authored: JSHandle<HTMLElement[]>,
) {
  const result = await diagram.evaluate((node, before) => {
    const current = [
      node as HTMLElement,
      ...Array.from(node.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) => !element.closest("[data-diagram-full-view-controls]"),
    );
    return {
      connected: before.every((element) => element.isConnected),
      count: current.length,
      sameIdentity:
        before.length === current.length &&
        before.every((element, index) => element === current[index]),
    };
  }, authored);
  expect(result.connected).toBe(true);
  expect(result.count).toBeGreaterThan(0);
  expect(result.sameIdentity).toBe(true);
}

async function readControllerStrippedMarkup(diagram: Locator) {
  return diagram.evaluate((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.querySelector("[data-diagram-full-view-controls]")?.remove();
    return clone.innerHTML;
  });
}

async function readDiagramPresentation(diagram: Locator) {
  return diagram.evaluate(async (node) => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
    const root = node as HTMLElement;
    const allocationSelector = [
      ":scope > figcaption",
      ":scope > section",
      ".cue-list > li",
      ".stage-list",
      ".stage-card",
      ".comparison-region",
      ".score-table",
      ".score-table tr",
      ".score-table th",
      ".score-table td",
      ".proof-grid",
      ".proof-card",
    ].join(", ");
    const allocations = Array.from(
      root.querySelectorAll<HTMLElement>(allocationSelector),
    ).map((element, index) => ({
      index,
      key: [
        element.tagName.toLowerCase(),
        element.getAttribute("data-stage") ?? "",
        element.getAttribute("data-score-model") ?? "",
        element.className,
      ].join(":"),
      width: element.getBoundingClientRect().width,
    }));
    const textFragments: Array<{
      fontSize: number;
      fragments: number;
      index: number;
      lineHeight: number;
      text: string;
    }> = [];
    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = textWalker.nextNode();
    while (textNode) {
      const parent = textNode.parentElement;
      const text =
        textNode.textContent
          ?.replace(/[\s\u200b-\u200d\ufeff]+/g, " ")
          .trim() ?? "";
      if (
        text &&
        parent &&
        !parent.closest(".katex-mathml, [data-diagram-full-view-controls]")
      ) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const parentStyle = getComputedStyle(parent);
        const lineHeight = Number.parseFloat(parentStyle.lineHeight);
        textFragments.push({
          fontSize: Number.parseFloat(parentStyle.fontSize),
          fragments: Array.from(range.getClientRects()).filter(
            ({ width, height }) => width > 0 && height > 0,
          ).length,
          index: textFragments.length,
          lineHeight: Number.isFinite(lineHeight) ? lineHeight : 0,
          text,
        });
      }
      textNode = textWalker.nextNode();
    }
    const authoredElements = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) =>
        !element.closest(
          ".katex, .katex-mathml, [data-diagram-full-view-controls]",
        ),
    );
    const fontSamples = authoredElements.flatMap((element, index) => {
      const directText = Array.from(element.childNodes)
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.textContent ?? "")
        .join(" ")
        .replace(/[\s\u200b-\u200d\ufeff]+/g, " ")
        .trim();
      if (!directText) return [];
      const style = getComputedStyle(element);
      const lineHeight = Number.parseFloat(style.lineHeight);
      return [
        {
          fontSize: Number.parseFloat(style.fontSize),
          index,
          lineHeight: Number.isFinite(lineHeight) ? lineHeight : 0,
          text: directText,
        },
      ];
    });
    const scaledElements = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].flatMap((element, index) => {
      if (element.closest("[data-diagram-full-view-controls]")) return [];
      const style = getComputedStyle(element);
      const scale = style.getPropertyValue("scale");
      const zoom = style.getPropertyValue("zoom");
      return style.transform !== "none" ||
        Boolean(scale && scale !== "none") ||
        Boolean(zoom && zoom !== "normal" && Number.parseFloat(zoom) !== 1)
        ? [{ index, scale, transform: style.transform, zoom }]
        : [];
    });
    const comparison = root.querySelector<HTMLElement>("[data-diagram-scroll]");
    const comparisonSection = comparison?.closest<HTMLElement>("section");
    const comparisonRect = comparison?.getBoundingClientRect();
    const comparisonSectionRect = comparisonSection?.getBoundingClientRect();
    const comparisonSectionStyle = comparisonSection
      ? getComputedStyle(comparisonSection)
      : null;
    const rootStyle = getComputedStyle(root);
    const table = comparison?.querySelector<HTMLElement>("table");
    const flag = Array.from(
      root.querySelectorAll<HTMLElement>("code bdi"),
    ).find(
      (element) => element.textContent === "provenance_assertions_match=true",
    );
    const technicalValues = Array.from(
      root.querySelectorAll<HTMLElement>("code bdi"),
    ).map((element, index) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const paint = Array.from(range.getClientRects()).filter(
        ({ width, height }) => width > 0 && height > 0,
      );
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const hasMaterialClientBox =
        element.clientWidth > 0 && element.clientHeight > 0;
      const zeroClientInlineMetric =
        element.clientWidth === 0 &&
        element.clientHeight === 0 &&
        style.display === "inline" &&
        rect.width > 0 &&
        rect.height > 0 &&
        paint.length > 0;
      return {
        blockDebt: zeroClientInlineMetric
          ? 0
          : hasMaterialClientBox
            ? Math.max(0, element.scrollHeight - element.clientHeight)
            : 0,
        fragments: paint.length,
        index,
        inlineDebt: zeroClientInlineMetric
          ? 0
          : hasMaterialClientBox
            ? Math.max(0, element.scrollWidth - element.clientWidth)
            : 0,
        text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
        validClientMetrics: hasMaterialClientBox || zeroClientInlineMetric,
      };
    });
    const inlineMath = Array.from(
      root.querySelectorAll<HTMLElement>("[data-inline-math] > .katex"),
    ).map((element, index) => {
      const rendered = element.querySelector<HTMLElement>(".katex-html");
      const range = document.createRange();
      if (rendered) range.selectNodeContents(rendered);
      const owner = element.closest<HTMLElement>("[data-diagram-box], th, td");
      const ownerRect = owner?.getBoundingClientRect();
      const ownerStyle = owner ? getComputedStyle(owner) : null;
      const innerRect =
        ownerRect && ownerStyle
          ? {
              bottom:
                ownerRect.bottom -
                Number.parseFloat(ownerStyle.borderBottomWidth),
              left:
                ownerRect.left + Number.parseFloat(ownerStyle.borderLeftWidth),
              right:
                ownerRect.right -
                Number.parseFloat(ownerStyle.borderRightWidth),
              top: ownerRect.top + Number.parseFloat(ownerStyle.borderTopWidth),
            }
          : null;
      const paint = rendered
        ? Array.from(range.getClientRects()).filter(
            ({ width, height }) => width > 0 && height > 0,
          )
        : [];
      const hasMaterialClientBox =
        element.clientWidth > 0 && element.clientHeight > 0;
      const elementStyle = getComputedStyle(element);
      const elementRect = element.getBoundingClientRect();
      const zeroClientInlineMetric =
        element.clientWidth === 0 &&
        element.clientHeight === 0 &&
        elementStyle.display === "inline" &&
        elementRect.width > 0 &&
        elementRect.height > 0 &&
        paint.length > 0;
      return {
        blockDebt: zeroClientInlineMetric
          ? 0
          : hasMaterialClientBox
            ? Math.max(0, element.scrollHeight - element.clientHeight)
            : 0,
        fontSize: Number.parseFloat(elementStyle.fontSize),
        index,
        inlineDebt: zeroClientInlineMetric
          ? 0
          : hasMaterialClientBox
            ? Math.max(0, element.scrollWidth - element.clientWidth)
            : 0,
        paintContained:
          innerRect !== null &&
          paint.every(
            (paintRect) =>
              paintRect.left >= innerRect.left - 2 &&
              paintRect.right <= innerRect.right + 2 &&
              paintRect.top >= innerRect.top - 2 &&
              paintRect.bottom <= innerRect.bottom + 2,
          ),
        positivePaint: paint.length,
        renderedFontSize: rendered
          ? Number.parseFloat(getComputedStyle(rendered).fontSize)
          : 0,
        validClientMetrics: hasMaterialClientBox || zeroClientInlineMetric,
      };
    });
    const descendantBlockOwners = Array.from(
      root.querySelectorAll<HTMLElement>("*"),
    ).flatMap((element, index) => {
      if (element.closest(".katex-mathml, [data-diagram-full-view-controls]")) {
        return [];
      }
      if (
        !element.matches(".katex, .katex-display") &&
        element.closest(".katex, .katex-display")
      ) {
        return [];
      }
      const debt = Math.max(0, element.scrollHeight - element.clientHeight);
      const overflowY = getComputedStyle(element).overflowY;
      return overflowY === "scroll" || (debt > 2 && overflowY === "auto")
        ? [
            {
              debt,
              index,
              overflowY,
            },
          ]
        : [];
    });
    return {
      allocations,
      comparisonBlockDebt: comparison
        ? Math.max(0, comparison.scrollHeight - comparison.clientHeight)
        : Number.POSITIVE_INFINITY,
      comparisonInlineDebt: comparison
        ? Math.max(0, comparison.scrollWidth - comparison.clientWidth)
        : Number.POSITIVE_INFINITY,
      comparisonSectionGaps:
        comparisonRect && comparisonSectionRect && comparisonSectionStyle
          ? {
              end: Math.abs(
                comparisonRect.right -
                  (comparisonSectionRect.right -
                    Number.parseFloat(comparisonSectionStyle.borderRightWidth) -
                    Number.parseFloat(comparisonSectionStyle.paddingRight)),
              ),
              start: Math.abs(
                comparisonRect.left -
                  (comparisonSectionRect.left +
                    Number.parseFloat(comparisonSectionStyle.borderLeftWidth) +
                    Number.parseFloat(comparisonSectionStyle.paddingLeft)),
              ),
            }
          : { end: Number.POSITIVE_INFINITY, start: Number.POSITIVE_INFINITY },
      comparisonRootWidthGap: comparisonSectionRect
        ? Math.abs(
            comparisonSectionRect.width -
              (root.clientWidth -
                Number.parseFloat(rootStyle.paddingLeft) -
                Number.parseFloat(rootStyle.paddingRight)),
          )
        : Number.POSITIVE_INFINITY,
      descendantBlockOwners,
      flagFontSize: flag
        ? Number.parseFloat(getComputedStyle(flag).fontSize)
        : 0,
      fontSamples,
      inlineMath,
      rootBlockDebt: Math.max(0, root.scrollHeight - root.clientHeight),
      rootFontSize: Number.parseFloat(getComputedStyle(root).fontSize),
      rootOverflowY: getComputedStyle(root).overflowY,
      scaledElements,
      tableFontSize: comparison
        ? Number.parseFloat(getComputedStyle(table ?? comparison).fontSize)
        : 0,
      tableInlineFillGap:
        comparison && table
          ? Math.abs(
              table.getBoundingClientRect().width - comparison.clientWidth,
            )
          : Number.POSITIVE_INFINITY,
      technicalValues,
      textFragments,
    };
  });
}

function expectReadableFullView(
  inline: Awaited<ReturnType<typeof readDiagramPresentation>>,
  full: Awaited<ReturnType<typeof readDiagramPresentation>>,
) {
  expect(full.allocations.map(({ key }) => key)).toEqual(
    inline.allocations.map(({ key }) => key),
  );
  for (const allocation of full.allocations) {
    expect(
      allocation.width + 2,
      `allocation ${allocation.index} (${allocation.key}) width`,
    ).toBeGreaterThanOrEqual(inline.allocations[allocation.index].width);
  }
  expect(full.comparisonInlineDebt).toBeLessThanOrEqual(2);
  expect(full.comparisonBlockDebt).toBeLessThanOrEqual(2);
  expect(full.comparisonSectionGaps.start).toBeLessThanOrEqual(2);
  expect(full.comparisonSectionGaps.end).toBeLessThanOrEqual(2);
  expect(full.comparisonRootWidthGap).toBeLessThanOrEqual(2);
  expect(full.tableInlineFillGap).toBeLessThanOrEqual(2);
  expect(full.descendantBlockOwners).toEqual([]);
  expect(inline.scaledElements).toEqual([]);
  expect(full.scaledElements).toEqual([]);
  expect(full.rootFontSize + 0.01).toBeGreaterThanOrEqual(inline.rootFontSize);
  expect(full.flagFontSize + 0.01).toBeGreaterThanOrEqual(inline.flagFontSize);
  expect(full.tableFontSize + 0.01).toBeGreaterThanOrEqual(
    inline.tableFontSize,
  );
  expect(full.rootFontSize).toBeGreaterThanOrEqual(14);
  expect(full.flagFontSize).toBeGreaterThanOrEqual(12);
  expect(full.tableFontSize).toBeGreaterThanOrEqual(14);
  expect(full.fontSamples.map(({ index, text }) => ({ index, text }))).toEqual(
    inline.fontSamples.map(({ index, text }) => ({ index, text })),
  );
  for (const [sampleIndex, sample] of full.fontSamples.entries()) {
    const inlineSample = inline.fontSamples[sampleIndex];
    expect(
      sample.fontSize + 0.01,
      `direct-text owner ${sample.index} (${sample.text}) font size`,
    ).toBeGreaterThanOrEqual(inlineSample.fontSize);
    if (sample.lineHeight > 0 && inlineSample.lineHeight > 0) {
      expect(
        sample.lineHeight + 0.01,
        `direct-text owner ${sample.index} (${sample.text}) line height`,
      ).toBeGreaterThanOrEqual(inlineSample.lineHeight);
    }
  }
  expect(full.technicalValues.length).toBeGreaterThan(0);
  for (const technical of full.technicalValues) {
    expect(technical.validClientMetrics).toBe(true);
    expect(technical.inlineDebt).toBeLessThanOrEqual(2);
    expect(technical.blockDebt).toBeLessThanOrEqual(2);
    expect(
      technical.fragments,
      `technical value ${technical.index} (${technical.text}) fragments`,
    ).toBe(1);
  }
  expect(full.inlineMath.length).toBeGreaterThan(0);
  for (const formula of full.inlineMath) {
    expect(formula.validClientMetrics).toBe(true);
    expect(
      formula.fontSize + 0.01,
      `inline formula ${formula.index} font size`,
    ).toBeGreaterThanOrEqual(inline.inlineMath[formula.index].fontSize);
    expect(
      formula.renderedFontSize + 0.01,
      `inline formula ${formula.index} rendered font size`,
    ).toBeGreaterThanOrEqual(inline.inlineMath[formula.index].renderedFontSize);
    expect(formula.fontSize).toBeGreaterThanOrEqual(12);
    expect(formula.renderedFontSize).toBeGreaterThanOrEqual(12);
    expect(
      formula.inlineDebt,
      `inline formula ${formula.index} inline debt`,
    ).toBeLessThanOrEqual(2);
    expect(
      formula.blockDebt,
      `inline formula ${formula.index} block debt`,
    ).toBeLessThanOrEqual(2);
    expect(
      formula.positivePaint,
      `inline formula ${formula.index} paint`,
    ).toBeGreaterThan(0);
    expect(
      formula.paintContained,
      `inline formula ${formula.index} containment`,
    ).toBe(true);
  }
  expect(full.textFragments.map(({ text }) => text)).toEqual(
    inline.textFragments.map(({ text }) => text),
  );
  for (const text of full.textFragments) {
    const inlineText = inline.textFragments[text.index];
    expect(
      text.fragments,
      `text ${text.index} (${text.text}) gained paint fragments`,
    ).toBeLessThanOrEqual(inlineText.fragments);
    expect(
      text.fontSize + 0.01,
      `text ${text.index} (${text.text}) font size`,
    ).toBeGreaterThanOrEqual(inlineText.fontSize);
    if (text.lineHeight > 0 && inlineText.lineHeight > 0) {
      expect(
        text.lineHeight + 0.01,
        `text ${text.index} (${text.text}) line height`,
      ).toBeGreaterThanOrEqual(inlineText.lineHeight);
    }
  }
  if (full.rootBlockDebt > 2) {
    expect(full.rootOverflowY).toMatch(/^(?:auto|scroll)$/);
  } else {
    expect(full.rootOverflowY).not.toBe("scroll");
  }
}

async function expectLogicalSourceFlow(
  container: Locator,
  itemSelector: string,
  expectedCount: number,
) {
  await expect(container).toHaveCount(1);
  const result = await container.evaluate(
    (node, { expectedCount: count, itemSelector: selector }) => {
      const owner = node as HTMLElement;
      const items = Array.from(
        owner.querySelectorAll<HTMLElement>(`:scope > ${selector}`),
      );
      const direction = getComputedStyle(owner).direction;
      const problems: string[] = [];
      if (items.length !== count) {
        problems.push(
          `expected ${count} direct items, received ${items.length}`,
        );
      }
      if (getComputedStyle(owner).gridAutoFlow.includes("dense")) {
        problems.push("dense grid placement can reorder source evidence");
      }
      const rects = items.map((item, index) => {
        const style = getComputedStyle(item);
        const order = Number.parseFloat(style.order);
        if (Number.isFinite(order) && order !== 0) {
          problems.push(`item ${index} has CSS order ${style.order}`);
        }
        const rect = item.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          index,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        };
      });
      for (let leftIndex = 0; leftIndex < rects.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < rects.length;
          rightIndex += 1
        ) {
          const first = rects[leftIndex];
          const second = rects[rightIndex];
          const overlapInline =
            Math.min(first.right, second.right) -
            Math.max(first.left, second.left);
          const overlapBlock =
            Math.min(first.bottom, second.bottom) -
            Math.max(first.top, second.top);
          if (overlapInline > 2 && overlapBlock > 2) {
            problems.push(`items ${leftIndex} and ${rightIndex} overlap`);
          }
        }
      }
      for (let index = 0; index + 1 < rects.length; index += 1) {
        const current = rects[index];
        const next = rects[index + 1];
        const sameBand = Math.abs(current.top - next.top) <= 2;
        if (sameBand) {
          const advancesTowardInlineEnd =
            direction === "rtl"
              ? next.right <= current.left + 2
              : next.left >= current.right - 2;
          if (!advancesTowardInlineEnd) {
            problems.push(
              `items ${index} and ${index + 1} invert logical inline order`,
            );
          }
        } else if (next.top < current.bottom - 2) {
          problems.push(
            `item ${index + 1} starts before item ${index}'s block band ends`,
          );
        }
      }
      return { direction, problems };
    },
    { expectedCount, itemSelector },
  );
  expect(result.direction).toMatch(/^(?:ltr|rtl)$/);
  expect(result.problems).toEqual([]);
}

async function expectScoreTableAllocation(region: Locator) {
  const geometry = await region.evaluate((node) => {
    const scroller = node as HTMLElement;
    const table = scroller.querySelector<HTMLElement>("table");
    const section = scroller.closest<HTMLElement>("section");
    const root = scroller.closest<HTMLElement>("figure");
    const scrollerRect = scroller.getBoundingClientRect();
    const sectionRect = section?.getBoundingClientRect();
    const sectionStyle = section ? getComputedStyle(section) : null;
    const rootStyle = root ? getComputedStyle(root) : null;
    const rootRem = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    return {
      blockDebt: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
      clientWidth: scroller.clientWidth,
      fullscreen: document.fullscreenElement !== null,
      inlineDebt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
      regionSectionEndGap:
        sectionRect && sectionStyle
          ? Math.abs(
              scrollerRect.right -
                (sectionRect.right -
                  Number.parseFloat(sectionStyle.borderRightWidth) -
                  Number.parseFloat(sectionStyle.paddingRight)),
            )
          : Number.POSITIVE_INFINITY,
      regionSectionStartGap:
        sectionRect && sectionStyle
          ? Math.abs(
              scrollerRect.left -
                (sectionRect.left +
                  Number.parseFloat(sectionStyle.borderLeftWidth) +
                  Number.parseFloat(sectionStyle.paddingLeft)),
            )
          : Number.POSITIVE_INFINITY,
      sectionRootWidthGap:
        root && rootStyle && sectionRect
          ? Math.abs(
              sectionRect.width -
                (root.clientWidth -
                  Number.parseFloat(rootStyle.paddingLeft) -
                  Number.parseFloat(rootStyle.paddingRight)),
            )
          : Number.POSITIVE_INFINITY,
      rootRem,
      tableWidth: table?.getBoundingClientRect().width ?? 0,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.blockDebt).toBeLessThanOrEqual(2);
  expect(geometry.regionSectionStartGap).toBeLessThanOrEqual(2);
  expect(geometry.regionSectionEndGap).toBeLessThanOrEqual(2);
  expect(geometry.sectionRootWidthGap).toBeLessThanOrEqual(2);
  expect(geometry.tableWidth + 2).toBeGreaterThanOrEqual(42 * geometry.rootRem);
  if (geometry.inlineDebt <= 2) {
    expect(
      Math.abs(geometry.tableWidth - geometry.clientWidth),
    ).toBeLessThanOrEqual(2);
  }
  if (!geometry.fullscreen && geometry.viewportWidth <= 400) {
    expect(geometry.inlineDebt).toBeGreaterThan(2);
    expect(geometry.tableWidth).toBeGreaterThan(geometry.clientWidth + 2);
  } else if (!geometry.fullscreen && geometry.viewportWidth >= 1024) {
    expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
  }
}

async function expectDiagramSemantics(
  page: Page,
  diagram: Locator,
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expect(diagram).toHaveAttribute(
    "aria-labelledby",
    "final-evaluation-diagram-title",
  );
  await expect(diagram).toHaveAttribute(
    "aria-describedby",
    "final-evaluation-diagram-description",
  );
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
  for (const [id, text] of [
    ["final-evaluation-diagram-title", localized.diagramTitle],
    ["final-evaluation-diagram-description", localized.diagramDescription],
  ] as const) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(diagram.locator(`#${id}`)).toHaveText(text);
  }
  await expect(
    diagram.locator(":scope > :not([data-diagram-full-view-controls])"),
  ).toHaveCount(4);
  await expect(diagram.locator(":scope > figcaption")).toHaveCount(1);

  const sectionIds = [
    "final-evaluation-boundary-title",
    "final-evaluation-comparison-title",
    "final-evaluation-proof-title",
  ] as const;
  const sections = diagram.locator(":scope > section");
  await expect(sections).toHaveCount(sectionIds.length);
  await expectLogicalSourceFlow(diagram, "section", sectionIds.length);
  for (const [index, id] of sectionIds.entries()) {
    const section = sections.nth(index);
    await expect(section).toHaveAttribute("data-diagram-box", "");
    await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(section).toHaveAttribute("aria-labelledby", id);
    await expect(section.locator(`:scope > h4#${id}`)).toHaveText(
      localized.sectionHeadings[index],
    );
    await expect(section.locator(":scope > p").first()).toHaveText(
      localized.sectionCaptions[index],
    );
  }

  const cueList = diagram.locator("figcaption > ul.cue-list");
  await expect(cueList.locator(":scope > li")).toHaveCount(3);
  await expect(cueList.getByRole("listitem")).toHaveCount(3);
  await expectLogicalSourceFlow(cueList, "li", 3);
  const stageList = sections.nth(0).locator(":scope > ol.stage-list");
  await expect(stageList.locator(":scope > li")).toHaveCount(5);
  await expect(stageList.getByRole("listitem")).toHaveCount(5);
  await expectLogicalSourceFlow(stageList, "li", 5);
  await expect(diagram.locator("[data-stage]")).toHaveCount(5);
  expect(
    await diagram
      .locator("[data-stage]")
      .evaluateAll((stages) =>
        stages.map((stage) => stage.getAttribute("data-stage")),
      ),
  ).toEqual(["train", "validation", "frozen", "test", "report"]);
  await expect(diagram.locator("[data-stage] h5")).toHaveText(
    localized.stageLabels,
  );
  await expect(diagram.locator("[data-stage] > p")).toHaveText(
    localized.stageCues,
  );
  await expect(diagram.locator(".state-symbol")).toHaveText([
    "1",
    "2",
    "3",
    "4",
    "5",
  ]);

  const region = diagram.getByRole("region", {
    name: localized.scrollerName,
    exact: true,
  });
  await expect(region).toHaveCount(1);
  await expect(region).toHaveAttribute("data-diagram-scroll", "");
  await expect(region).toHaveAttribute("tabindex", "0");
  await expectScoreTableAllocation(region);
  const table = region.getByRole("table", {
    name: localized.scrollerName,
    exact: true,
  });
  await expect(table).toHaveCount(1);
  await expect(table).toHaveAttribute("data-diagram-table", "");
  await expect(table.locator(":scope > caption")).toHaveText(
    localized.scrollerName,
  );
  await expect(table.locator("tr")).toHaveCount(3);
  await expect(table.locator('thead th[scope="col"]')).toHaveCount(6);
  await expect(table.locator('thead th[scope="col"]')).toHaveText(
    localized.tableHeadings,
  );
  await expect(table.locator('tbody th[scope="row"]')).toHaveCount(2);
  await expect(table.locator('tbody th[scope="row"]')).toHaveText(
    localized.rowHeaders,
  );
  await expect(table.locator("tbody td")).toHaveCount(10);
  const selectedRow = table.locator(
    'tbody tr[data-score-model="selected-decoder"]',
  );
  const bigramRow = table.locator('tbody tr[data-score-model="frozen-bigram"]');
  await expect(selectedRow).toHaveAttribute("data-lower-loss", "true");
  await expect(bigramRow).toHaveAttribute("data-lower-loss", "false");
  await expect(
    selectedRow.locator('td[data-fit-partition="train"]'),
  ).toHaveCount(1);
  await expect(
    selectedRow.locator('td[data-selected-by="validation"]'),
  ).toHaveCount(1);
  await expect(bigramRow.locator('td[data-fit-partition="train"]')).toHaveCount(
    1,
  );
  await expect(bigramRow.locator('td[data-selected-by="none"]')).toHaveCount(1);
  await expect(
    table.locator("tbody td[data-fit-partition], tbody td[data-selected-by]"),
  ).toHaveText(localized.roleCells);

  const proofGrid = sections.nth(2).locator(":scope > .proof-grid");
  await expect(proofGrid).toHaveCount(1);
  await expect(proofGrid.locator(":scope > *")).toHaveCount(4);
  const proofCards = proofGrid.locator(
    ':scope > article.proof-card[data-diagram-card][data-diagram-box][data-status="pass"]',
  );
  await expect(proofCards).toHaveCount(4);
  await expectLogicalSourceFlow(proofGrid, "article.proof-card", 4);
  await expect(proofCards.locator(":scope > h5")).toHaveText(
    localized.proofLabels,
  );
  const proofCodeValues = [
    [
      "corpus=ch33-34-synthetic-v1",
      "split=fixed-role-split-v1",
      "tokenizer=literal-u32-v1",
      "provenance_assertions_match=true",
    ],
    ["selection_test_partition", "selection_test_partition_rejected=true"],
    ["graph_nodes=0", "parameters_unchanged=true", "gradients_unchanged=true"],
    [
      "fnv1a64:dac4bb4d76beeb59",
      "gate_openings_before=0",
      "gate_openings_after=1",
      "report_version=1",
    ],
  ] as const;
  for (const [index, values] of proofCodeValues.entries()) {
    await expect(proofCards.nth(index).locator("code bdi")).toHaveText(values);
  }
  const proofAnnotations = [
    [],
    ["s^*=8"],
    ["\\#\\mathrm{graphs}=0"],
    ["V=5,\\;T=2,\\;N_{te}=24"],
  ] as const;
  for (const [index, annotations] of proofAnnotations.entries()) {
    await expect(
      proofCards.nth(index).locator('annotation[encoding="application/x-tex"]'),
    ).toHaveText(annotations);
  }
  const assertionCard = proofCards.nth(0);
  await expect(assertionCard).not.toContainText("fnv1a64:");
  const selectionCard = proofCards.nth(1);
  await expect(
    selectionCard.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText("s^*=8");
  await expect(selectionCard).toContainText("selection_test_partition");
  await expect(selectionCard).toContainText(
    "selection_test_partition_rejected=true",
  );
  const noGradCard = proofCards.nth(2);
  await expect(
    noGradCard.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText("\\#\\mathrm{graphs}=0");
  const checkedViewCard = proofCards.nth(3);
  await expect(checkedViewCard).toContainText("fnv1a64:dac4bb4d76beeb59");
  await expect(
    checkedViewCard.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText("V=5,\\;T=2,\\;N_{te}=24");
  await expect(checkedViewCard).not.toContainText(
    "provenance_assertions_match=true",
  );
  await expect(diagram).toContainText("provenance_assertions_match=true");
  await expect(diagram).not.toContainText("provenance_match=true");
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 34,
    revision: 7,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ["en", "ru"],
    fallbackRouteSuffix: "/course/",
  });
  await expect(page.locator(".lesson-description")).toHaveText(
    localized.description,
  );
  await expectSeoDescription(page, localized.description);
  await expect(page.locator(".lesson-body h2")).toHaveText(localized.headings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  const normalizedAnnotations = annotations.map(normalizeMath);
  const exactDisplayFormulas = [
    "\\mathcal{L}_{te}^{\\mathrm{decoder}}=1.607679,\\qquad\\mathcal{L}_{te}^{\\mathrm{bigram}}=2.236735.",
    mainFormulaLatex,
    "\\mathcal{L}_{te}=\\frac{\\sum_dN_d\\mathcal{L}^{(d)}_{te}}{\\sum_dN_d},\\qquadN_{te}=\\sum_dN_d",
  ];
  const normalizedDisplayAnnotations = (
    await page
      .locator(
        '.lesson-body .katex-display annotation[encoding="application/x-tex"]',
      )
      .allTextContents()
  ).map(normalizeMath);
  expect(normalizedDisplayAnnotations).toEqual(
    exactDisplayFormulas.map(normalizeMath),
  );
  expect(
    normalizedAnnotations.filter(
      (formula) => formula === normalizeMath(mainFormulaLatex),
    ),
    "the complete main formula must have exactly one rendered annotation",
  ).toHaveLength(1);
  for (const exactInline of ["N_{te}=24", "\\Delta_{te}=0.629055"]) {
    expect(normalizedAnnotations).toContain(normalizeMath(exactInline));
  }
  expect(annotations.some((expression) => expression.includes("\\*"))).toBe(
    false,
  );
  await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);

  const lessonText = (await page.locator(".lesson-body").innerText())
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
  for (const fragment of localized.historyFragments) {
    expect(lessonText).toContain(fragment);
  }
  for (const fragment of localized.ownershipFragments) {
    expect(lessonText).toContain(fragment);
  }
  for (const fragment of localized.trustBoundaryFragments) {
    expect(lessonText).toContain(fragment);
  }
  for (const fragment of localized.evidenceBoundaryFragments) {
    expect(lessonText).toContain(fragment);
  }
  for (const fragment of localized.handoffFragments) {
    expect(lessonText).toContain(fragment);
  }
  expect(lessonText).not.toMatch(
    locale === "en"
      ? /serialize the same selected state that this chapter evaluated|serialize the exact selected and evaluated state|optimizer and RNG provenance/i
      : /сериализуем именно то выбранное состояние, которое оценили здесь|состояние генератора псевдослучайных чисел как часть происхождения оценки/i,
  );
  expect(lessonText).not.toMatch(
    locale === "en"
      ? /course(?:'s)? first and only final test|previously unscored test|proves? (?:independent )?generalization|shows? (?:that )?decoder architectures? (?:always|universally) (?:beat|outperform)/i
      : /первая и единственная итоговая оценка|ранее не оценивавш|доказывает независимую оценку обобщающей способности|подтверждает универсальное превосходство архитектуры/i,
  );
  expect(lessonText.match(/\bdecoder_beats_bigram\b/g)).toHaveLength(1);
  expect(lessonText).not.toMatch(/\bdecoder_wins\b/);
  if (locale === "ru") {
    expect(lessonText).not.toMatch(/фикстур/i);
  }
  await expect(
    page.locator('.lesson-body a[href^="https://www.jmlr.org/"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('.lesson-body a[href^="https://proceedings.neurips.cc/"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.lesson-body a[href="https://arxiv.org/abs/1506.02629"]'),
  ).toHaveCount(1);
  await expect(page.locator("figure.rust-source")).toHaveCount(7);
  await expect(
    page
      .locator("figure.rust-source figcaption span")
      .filter({ hasText: localized.boundaryRustCaption }),
  ).toHaveCount(1);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "final-evaluation-boundary",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="final-evaluation-boundary"]',
  );
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(15);
  await expectDiagramSemantics(page, diagram, locale);
  await expect(
    diagram.locator('[data-score-model="selected-decoder"] annotation'),
  ).toHaveText([
    "N_{te}=24",
    "\\sum_n(-\\log p_n)=38.584306",
    "\\mathcal{L}_{te}=1.607679",
  ]);
  await expect(
    diagram.locator('[data-score-model="frozen-bigram"] annotation'),
  ).toHaveText([
    "N_{te}=24",
    "\\sum_n(-\\log p_n)=53.681634",
    "\\mathcal{L}_{te}=2.236735",
  ]);
  await expect(diagram).toContainText("fnv1a64:dac4bb4d76beeb59");
  await expect(diagram).toContainText("selection_test_partition_rejected=true");
  await expect(diagram).toContainText("gate_openings_before=0");
  await expect(diagram).toContainText("gate_openings_after=1");
  await expect(diagram).toContainText("graph_nodes=0");
  await expect(
    diagram.locator("svg, canvas, path, polyline, line"),
  ).toHaveCount(0);
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(8);
  await expect(details).toContainText(localized.detailsFragment);
  await expect(details).toContainText(localized.tokenizerAnswerFragment);
  await expectFormulaGeometry(page);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "33-training-selection");
  const next = page.locator(
    'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
  );
  await expect(next).toHaveAttribute("data-chapter-id", "35-checkpoints");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 34 once-only final evaluation vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 34 routes", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters[33]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 34,
            title: copy[locale].title,
          }),
        );
        await page.goto(chapterPath(locale, chapterId));
        const other: ChapterLocale = locale === "en" ? "ru" : "en";
        await expect(
          page.locator(`.locale-switch a[data-locale="${other}"]`),
        ).toHaveAttribute("href", chapterPath(other, chapterId));
        await expect(
          page.locator(`link[rel="alternate"][hreflang="${other}"]`),
        ).toHaveAttribute(
          "href",
          new RegExp(`/${other}/course/${chapterId}/$`),
        );
      }
    });

    test("both complete lessons and final reports render at desktop and narrow widths", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, chapters, locale);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, chapters, locale);
        await expect(
          page.locator(
            'figure[data-visualization-id="final-evaluation-boundary"] [data-diagram-full-view-toggle]',
          ),
        ).toHaveCount(0);
      }
    });

    test("full view reuses each localized complete figure and restores focus", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 1280, height: 900 });
      const controlNames: string[] = [];
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="final-evaluation-boundary"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        controlNames.push((await toggle.getAttribute("aria-label")) ?? "");
        const authored = await captureAuthoredDiagram(diagram);
        const inlineMarkup = await readControllerStrippedMarkup(diagram);
        const inlinePresentation = await readDiagramPresentation(diagram);
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute(
              "data-visualization-id",
            ) === "final-evaluation-boundary",
        );
        await expect(diagram.locator("[data-stage]")).toHaveCount(5);
        await expect(diagram.locator("tbody tr")).toHaveCount(2);
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expectDiagramSemantics(page, diagram, locale);
        await expectSameAuthoredDiagram(diagram, authored);
        expect(await readControllerStrippedMarkup(diagram)).toBe(inlineMarkup);
        await expectDiagramContainment(page);
        const fullPresentation = await readDiagramPresentation(diagram);
        expectReadableFullView(inlinePresentation, fullPresentation);
        await expectOnePaintRangeForExactValue(
          diagram,
          "provenance_assertions_match=true",
        );
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expectSameAuthoredDiagram(diagram, authored);
        expect(await readControllerStrippedMarkup(diagram)).toBe(inlineMarkup);
        await authored.dispose();
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test("minimum eligible full view keeps the provenance assertion flag on one painted line", async ({
      browser,
    }, testInfo) => {
      test.setTimeout(120_000);
      const minimumFullView = { width: 1024, height: 576 };
      const context = await browser.newContext({
        baseURL: String(testInfo.project.use.baseURL),
        screen: minimumFullView,
        viewport: minimumFullView,
      });
      const page = await context.newPage();
      try {
        for (const locale of locales) {
          await page.goto(chapterPath(locale, chapterId));
          await page.waitForFunction(
            () =>
              document.documentElement.dataset.diagramFullViewReady === "true",
          );
          const diagram = page.locator(
            'figure[data-visualization-id="final-evaluation-boundary"]',
          );
          const toggle = diagram.locator("[data-diagram-full-view-toggle]");
          await expect(toggle).toHaveCount(1);
          const authored = await captureAuthoredDiagram(diagram);
          const inlineMarkup = await readControllerStrippedMarkup(diagram);
          const inlinePresentation = await readDiagramPresentation(diagram);
          await toggle.click();
          await page.waitForFunction(
            () =>
              document.fullscreenElement?.getAttribute(
                "data-visualization-id",
              ) === "final-evaluation-boundary",
          );
          await expectDiagramSemantics(page, diagram, locale);
          await expectDiagramContainment(page);
          await expectSameAuthoredDiagram(diagram, authored);
          expect(await readControllerStrippedMarkup(diagram)).toBe(
            inlineMarkup,
          );
          const fullPresentation = await readDiagramPresentation(diagram);
          expectReadableFullView(inlinePresentation, fullPresentation);
          expect(fullPresentation.rootBlockDebt).toBeGreaterThan(2);
          await expectOnePaintRangeForExactValue(
            diagram,
            "provenance_assertions_match=true",
          );
          await page.keyboard.press("Escape");
          await page.waitForFunction(() => document.fullscreenElement === null);
          await expect(toggle).toBeFocused();
          await expect(toggle).toHaveAttribute("aria-expanded", "false");
          await expectSameAuthoredDiagram(diagram, authored);
          expect(await readControllerStrippedMarkup(diagram)).toBe(
            inlineMarkup,
          );
          await authored.dispose();
        }
      } finally {
        await context.close();
      }
    });

    test("text, double borders, and numbered states survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="final-evaluation-boundary"]',
        );
        await expect(diagram.locator(".cue-list li")).toHaveText(
          copy[locale].cues,
        );
        await expect(diagram.locator(".state-symbol")).toHaveText([
          "1",
          "2",
          "3",
          "4",
          "5",
        ]);
        await expect(diagram.locator('[data-stage="frozen"]')).toHaveCSS(
          "border-top-style",
          "double",
        );
        await expect(
          diagram.locator(
            '[data-score-model="selected-decoder"] > :first-child',
          ),
        ).toHaveCSS("border-left-style", "double");
        const forcedEvidence = await diagram
          .locator(".state-symbol")
          .evaluateAll((symbols) =>
            symbols.map((symbol) => {
              const element = symbol as HTMLElement;
              const style = getComputedStyle(element);
              const range = document.createRange();
              range.selectNodeContents(element);
              const colors = [
                style.borderTopColor,
                style.borderRightColor,
                style.borderBottomColor,
                style.borderLeftColor,
              ];
              const colorHasZeroAlpha = (color: string) => {
                if (color === "transparent") return true;
                const commaAlpha = color.match(
                  /^rgba\([^)]*,\s*(0(?:\.0+)?)\s*\)$/,
                );
                if (commaAlpha) {
                  return Number.parseFloat(commaAlpha[1]) === 0;
                }
                const slashAlpha = color.match(/\/\s*(0(?:\.0+)?%?)\s*\)$/);
                return slashAlpha
                  ? Number.parseFloat(slashAlpha[1]) === 0
                  : false;
              };
              return {
                borderColorsVisible: colors.every(
                  (color) => !colorHasZeroAlpha(color),
                ),
                borderStyles: [
                  style.borderTopStyle,
                  style.borderRightStyle,
                  style.borderBottomStyle,
                  style.borderLeftStyle,
                ],
                borderWidths: [
                  style.borderTopWidth,
                  style.borderRightWidth,
                  style.borderBottomWidth,
                  style.borderLeftWidth,
                ].map(Number.parseFloat),
                paint: Array.from(range.getClientRects()).filter(
                  ({ width, height }) => width > 0 && height > 0,
                ).length,
              };
            }),
          );
        expect(forcedEvidence).toHaveLength(5);
        for (const state of forcedEvidence) {
          expect(state.borderStyles).not.toContain("none");
          expect(state.borderStyles).not.toContain("hidden");
          expect(state.borderWidths.every((width) => width > 0)).toBe(true);
          expect(state.borderColorsVisible).toBe(true);
          expect(state.paint).toBeGreaterThan(0);
        }
        await expectOnePaintRangeForExactValue(
          diagram,
          "provenance_assertions_match=true",
        );
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("RTL prose keeps technical values and evidence order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="final-evaluation-boundary"]',
        );
        await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
        await expect(diagram.locator("h4").first()).toHaveCSS(
          "direction",
          "rtl",
        );
        await expectDiagramSemantics(page, diagram, locale);
        expect(
          await diagram
            .locator("[data-stage]")
            .evaluateAll((stages) =>
              stages.map((stage) => stage.getAttribute("data-stage")),
            ),
        ).toEqual(["train", "validation", "frozen", "test", "report"]);
        expect(
          await diagram
            .locator("code, bdi, [data-inline-math]")
            .evaluateAll((nodes) =>
              nodes.every((node) => getComputedStyle(node).direction === "ltr"),
            ),
        ).toBe(true);
        const selectedHeader = diagram.locator(
          '[data-score-model="selected-decoder"] > th[scope="row"]',
        );
        await expect(selectedHeader).toHaveCSS("border-right-style", "double");
        await expect(selectedHeader).not.toHaveCSS(
          "border-left-style",
          "double",
        );
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("the lesson and exact report evidence render without JavaScript or the Fullscreen API", async ({
      browser,
    }, testInfo) => {
      test.setTimeout(120_000);
      const baseURL = String(testInfo.project.use.baseURL);
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL,
      });
      const page = await context.newPage();
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        await expect(
          page.getByRole("heading", { level: 1, name: copy[locale].title }),
        ).toBeVisible();
        const lessonText = (await page.locator(".lesson-body").innerText())
          .replace(/[’‘]/g, "'")
          .replace(/\s+/g, " ");
        for (const fragment of copy[locale].handoffFragments) {
          expect(lessonText).toContain(fragment);
        }
        const diagram = page.locator(
          'figure[data-visualization-id="final-evaluation-boundary"]',
        );
        await expect(diagram).toHaveCount(1);
        await expect(diagram.locator("[data-diagram-box]")).toHaveCount(15);
        await expectDiagramSemantics(page, diagram, locale);
        await expect(
          diagram.locator("[data-diagram-full-view-toggle]"),
        ).toHaveCount(0);
        await expect(diagram).toContainText("fnv1a64:dac4bb4d76beeb59");
        await expectOnePaintRangeForExactValue(
          diagram,
          "provenance_assertions_match=true",
        );
        const noScriptMainFormula = page
          .locator(
            '.lesson-body .katex-display annotation[encoding="application/x-tex"]',
          )
          .filter({ hasText: mainFormulaLatex });
        await expect(noScriptMainFormula).toHaveCount(1);
        expect(
          normalizeMath((await noScriptMainFormula.textContent()) ?? ""),
        ).toBe(normalizeMath(mainFormulaLatex));
        await expectDiagramContainment(page, false);
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();

      const unsupportedContext = await browser.newContext({ baseURL });
      await unsupportedContext.addInitScript(() => {
        Object.defineProperty(document, "fullscreenEnabled", {
          configurable: true,
          value: false,
        });
      });
      const unsupportedPage = await unsupportedContext.newPage();
      try {
        for (const locale of locales) {
          await unsupportedPage.goto(chapterPath(locale, chapterId));
          await unsupportedPage.waitForFunction(
            () =>
              document.documentElement.dataset.diagramFullViewReady === "true",
          );
          const diagram = unsupportedPage.locator(
            'figure[data-visualization-id="final-evaluation-boundary"]',
          );
          await expect(diagram).toBeVisible();
          await expect(
            diagram.locator("[data-diagram-full-view-controls]"),
          ).toHaveCount(0);
          await expect(
            diagram.locator("[data-diagram-full-view-toggle]"),
          ).toHaveCount(0);
          await expectDiagramSemantics(unsupportedPage, diagram, locale);
          await expectDiagramContainment(unsupportedPage);
          await expectNoOverflowOrClientScripts(unsupportedPage);
        }
      } finally {
        await unsupportedContext.close();
      }
    });
  },
);
