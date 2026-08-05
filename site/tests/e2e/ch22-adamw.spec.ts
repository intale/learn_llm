// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import ts from 'typescript';

import { assertAdamwDiagramLabels, type AdamwDiagramLabels } from '../../src/lib/adamw-diagram';
import {
  chapterLocaleDefinitions,
  chapterLocales,
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

interface LessonMetadata {
  content_revision: number;
  title: string;
  description: string;
  history: {
    llm_evolution: {
      sources: readonly { claim: string; source_url: string }[];
    };
  };
  rust_sources: readonly { path: string; region: string }[];
}

interface LocalizedCopy {
  revision: number;
  revisionLabel: string;
  title: string;
  description: string;
  headings: readonly string[];
  historyHeading: string;
  historyFragments: readonly string[];
  historySources: readonly string[];
  diagram: AdamwDiagramLabels;
  displayFormulae: readonly string[];
  rustRegions: readonly (readonly [string, string])[];
}

const chapterId = '22-adamw';
const repositoryRoot = resolve(process.cwd(), '..');
const normalizeMath = (value: string) => value.replace(/\s+/g, '');
const normalizeProse = (value: string) =>
  value
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const revisionLabels: Record<ChapterLocale, string> = {
  en: 'Content revision',
  ru: 'Версия материала',
};

function read(path: string) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

function frontmatter(source: string): LessonMetadata {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('missing JSON frontmatter');
  return JSON.parse(match[1]) as LessonMetadata;
}

function literalValue(node: ts.Expression): unknown {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (!ts.isObjectLiteralExpression(node)) {
    throw new Error(`unsupported diagram-label expression: ${node.getText()}`);
  }
  return Object.fromEntries(
    node.properties.map((property) => {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error(`unsupported diagram-label property: ${property.getText()}`);
      }
      const name = property.name;
      if (!ts.isIdentifier(name) && !ts.isStringLiteralLike(name)) {
        throw new Error(`unsupported diagram-label key: ${name.getText()}`);
      }
      return [name.text, literalValue(property.initializer)];
    }),
  );
}

function exportedObject<T>(source: string, exportName: string): T {
  const marker = `export const ${exportName} =`;
  const start = source.indexOf(marker);
  const end = source.indexOf('\n\n##', start);
  if (start < 0 || end < 0) throw new Error(`missing ${exportName} export`);
  const sourceFile = ts.createSourceFile(
    `${exportName}.ts`,
    source.slice(start, end),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === exportName);
  if (!declaration?.initializer) throw new Error(`missing ${exportName} initializer`);
  return literalValue(declaration.initializer) as T;
}

function loadCopy(locale: ChapterLocale): LocalizedCopy {
  const source = read(`site/src/content/chapters/${locale}/${chapterId}.mdx`);
  const metadata = frontmatter(source);
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  const diagram = exportedObject<AdamwDiagramLabels>(source, 'diagramLabels');
  assertAdamwDiagramLabels(diagram);
  if (headings.length !== 8) throw new Error(`${locale} Chapter 22 must have eight sections`);
  return {
    revision: metadata.content_revision,
    revisionLabel: revisionLabels[locale],
    title: metadata.title,
    description: metadata.description,
    headings,
    historyHeading: headings[3],
    historyFragments: metadata.history.llm_evolution.sources.slice(0, 3).map(({ claim }) => claim),
    historySources: metadata.history.llm_evolution.sources.map(({ source_url }) => source_url),
    diagram,
    displayFormulae: [...body.matchAll(/^\$\$\r?\n([\s\S]*?)\r?\n\$\$$/gm)].map((match) =>
      match[1].trim(),
    ),
    rustRegions: metadata.rust_sources.map(({ path, region }) => [path, region] as const),
  };
}

const copy = Object.fromEntries(
  chapterLocales.map((locale) => [locale, loadCopy(locale)]),
) as Record<ChapterLocale, LocalizedCopy>;

const explicitCopy = {
  en: {
    workedClaims: [
      'Chapter 21 ends with tensor-shaped gradients of the token-mean loss. Before an optimizer step, associate each gradient with the stable name of the parameter with respect to which it was computed. AdamW uses each named gradient to compute an updated value for the matching parameter. It prepares the complete named update before writing any value, then commits every updated value into the same live parameter leaf.',
      'In this worked update, \\theta_0 is the current value of the decay-group parameter decoder.output.weight, and g_1 is the accumulated token-mean loss gradient with respect to that same parameter:',
      "AdamW stores this parameter's moment vectors under decoder.output.weight. The stable name, not the parameter's position in the parameter list, identifies its moment history.",
    ],
    answerEight:
      "This is the course's configurable grouping policy, not a consequence of the AdamW equation. The policy assigns decoder.output.weight to decay, so AdamW subtracts the parameter-proportional term \\eta\\lambda\\theta_{t-1} from it. It assigns decoder.norm.scale to no-decay, so that parameter's effective \\lambda is 0; this avoids a decay term that directly pulls the learned normalization scale toward zero.",
    executionClaim:
      'Every entry point uses the same internal preparation-and-commit operation and the same elementwise AdamW calculation. Tracing records values produced by that calculation; it does not calculate the update a second time.',
    revisionClaim:
      "Each parameter node owns a monotonically increasing parameter-value revision. One successful AdamW commit advances that node's revision once; a failed commit does not advance it.",
  },
  ru: {
    workedClaims: [
      'В конце главы 21 получены тензорные градиенты функции потерь, усреднённой по токенам. Перед шагом оптимизатора сопоставьте каждый градиент со стабильным именем параметра, по которому он вычислен. AdamW использует каждый именованный градиент, чтобы вычислить обновлённое значение соответствующего параметра. Оптимизатор сначала подготавливает полное именованное обновление, не записывая ни одного значения, а затем записывает все обновлённые значения в те же существующие листовые узлы параметров.',
      'В рассматриваемом обновлении \\theta_0 — текущее значение параметра decoder.output.weight из группы с затуханием, а g_1 — накопленный градиент усреднённой по токенам функции потерь по этому же параметру:',
      'AdamW хранит векторы моментов этого параметра под именем decoder.output.weight. Историю моментов определяет стабильное имя, а не положение параметра в списке.',
    ],
    answerEight:
      'Это настраиваемое правило группировки, принятое в курсе, а не следствие формулы AdamW. По этому правилу decoder.output.weight относится к группе с затуханием, поэтому AdamW вычитает из него пропорциональную параметру поправку \\eta\\lambda\\theta_{t-1}. Параметр decoder.norm.scale относится к группе без затухания, и его эффективный коэффициент \\lambda равен 0: так затухание не создаёт отдельную поправку, напрямую стягивающую обучаемый масштаб нормализации к нулю.',
    executionClaim:
      'Все точки входа используют одну и ту же внутреннюю операцию подготовки и атомарной фиксации, а также один и тот же покоординатный расчёт AdamW. Трассировка записывает значения, получаемые в этом расчёте, а не вычисляет обновление повторно.',
    revisionClaim:
      'У каждого узла параметра есть монотонно возрастающая версия значения параметра. После успешного шага AdamW версия этого узла увеличивается на единицу, а после неудачного шага остаётся прежней.',
  },
} as const satisfies Record<
  ChapterLocale,
  {
    workedClaims: readonly string[];
    answerEight: string;
    executionClaim: string;
    revisionClaim: string;
  }
>;

const expectedRustRegions = copy.en.rustRegions;

function readRustRegion(path: string, region: string): string {
  const lines = read(path).split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n').replace(/\n+$/, '');
}

const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

const parameterEvidence = [
  {
    index: '0',
    name: 'decoder.output.weight',
    group: 'decay',
    shape: '[2]',
    before: String.raw`\left[1,-2\right]`,
    gradient: String.raw`\left[0.2,-0.4\right]`,
    first: String.raw`\left[0.1,-0.2\right]`,
    second: String.raw`\left[0.02,0.08\right]`,
    correctedFirst: String.raw`\left[0.2,-0.4\right]`,
    correctedSecond: String.raw`\left[0.04,0.16\right]`,
    adaptive: String.raw`\left[0.066667,-0.08\right]`,
    decay: String.raw`\left[0.01,-0.02\right]`,
    after: String.raw`\left[0.923333,-1.9\right]`,
  },
  {
    index: '1',
    name: 'decoder.norm.scale',
    group: 'no_decay',
    shape: '[1]',
    before: String.raw`\left[0.5\right]`,
    gradient: String.raw`\left[0\right]`,
    first: String.raw`\left[0\right]`,
    second: String.raw`\left[0\right]`,
    correctedFirst: String.raw`\left[0\right]`,
    correctedSecond: String.raw`\left[0\right]`,
    adaptive: String.raw`\left[0\right]`,
    decay: String.raw`\left[0\right]`,
    after: String.raw`\left[0.5\right]`,
  },
] as const;

const trajectoryEvidence = {
  sgd: [
    String.raw`\left[1,1\right]`,
    String.raw`\left[0.9,0.6\right]`,
    String.raw`\left[0.81,0.36\right]`,
    String.raw`\left[0.729,0.216\right]`,
    String.raw`\left[0.6561,0.1296\right]`,
  ],
  adamw: [
    String.raw`\left[1,1\right]`,
    String.raw`\left[0.899091,0.892439\right]`,
    String.raw`\left[0.799889,0.786278\right]`,
    String.raw`\left[0.702629,0.681677\right]`,
    String.raw`\left[0.60758,0.578823\right]`,
  ],
} as const;

const noDecayEvidence = [
  {
    key: 'before',
    vector: '[0.500000]',
    latex: String.raw`\theta_{t-1}=\left[0.5\right]`,
  },
  {
    key: 'gradient',
    vector: '[0.000000]',
    latex: String.raw`g_t=\left[0\right]`,
  },
  {
    key: 'corrected-first',
    vector: '[0.000000]',
    latex: String.raw`\hat m_t=\left[0\right]`,
  },
  {
    key: 'corrected-second',
    vector: '[0.000000]',
    latex: String.raw`\hat v_t=\left[0\right]`,
  },
  {
    key: 'adaptive',
    vector: '[0.000000]',
    latex: String.raw`\frac{\eta\hat m_t}{\sqrt{\hat v_t}+\varepsilon}=\left[0\right]`,
  },
  {
    key: 'decay',
    vector: '[0.000000]',
    latex: String.raw`\eta\lambda\theta_{t-1}=\left[0\right]`,
  },
  {
    key: 'after',
    vector: '[0.500000]',
    latex: String.raw`\theta_t=\left[0.5\right]`,
  },
] as const;

type AdamwFigureId = 'adamw' | 'adamw-evidence';

interface DiagramContract {
  id: AdamwFigureId;
  expectedScrollerCount: number;
  structure: readonly {
    selector: string;
    count: number;
  }[];
}

const diagramContracts = [
  {
    id: 'adamw',
    expectedScrollerCount: 1,
    structure: [
      { selector: '.config-summary > [data-diagram-box]', count: 5 },
      {
        selector: '.stage-intro[data-diagram-box], .decay-note[data-diagram-box]',
        count: 2,
      },
      { selector: '.parameter-card[data-diagram-box]', count: 1 },
      { selector: '.parameter-card > header[data-diagram-box]', count: 1 },
      { selector: '.group-badge[data-diagram-box]', count: 1 },
      {
        selector:
          '.input-node[data-diagram-box], .moment-node[data-diagram-box], .adaptive-delta[data-diagram-box], .bypass-origin[data-diagram-box], .decay-delta[data-diagram-box], .output-node[data-diagram-box]',
        count: 6,
      },
      { selector: '.bypass-formula[data-diagram-box]', count: 1 },
    ],
  },
  {
    id: 'adamw-evidence',
    expectedScrollerCount: 1,
    structure: [
      { selector: '.no-decay-stage[data-diagram-box]', count: 1 },
      { selector: '.parameter-identity[data-diagram-box]', count: 1 },
      { selector: '.evidence-cell[data-diagram-box]', count: 7 },
      { selector: '.trajectory-stage[data-diagram-box]', count: 1 },
      { selector: '.trajectory-objective[data-diagram-box]', count: 1 },
      { selector: '.trajectory-lane[data-diagram-box]', count: 2 },
      { selector: '.replacement-stage[data-diagram-box]', count: 1 },
      { selector: '.proof-stage[data-diagram-box]', count: 1 },
      { selector: '.proof-grid > [data-diagram-box]', count: 6 },
    ],
  },
] as const satisfies readonly DiagramContract[];

async function settle(page: Page) {
  await page.evaluate(() => {
    document.documentElement.getBoundingClientRect();
  });
}

async function expectFormulaGeometry(page: Page) {
  await settle(page);
  const problems = await page
    .locator('.lesson-body .katex-display, .lesson-body .katex:not(.katex-display .katex)')
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        if (element.closest('figure.course-diagram')) return [];
        const rect = element.getBoundingClientRect();
        const source =
          element.querySelector('annotation[encoding="application/x-tex"]')?.textContent ??
          `formula ${index}`;
        const issues: string[] = [];
        if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) {
          issues.push(`${source} escapes the viewport`);
        }
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(`${source} has no visible box`);
        }
        const mathml = element.querySelector<HTMLElement>('.katex-mathml');
        if (!mathml) {
          issues.push(`${source} has no accessible MathML projection`);
        } else {
          const style = getComputedStyle(mathml);
          if (style.display !== 'block' || style.overflowX !== 'clip') {
            issues.push(`${source} does not contain its MathML projection`);
          }
        }
        const { direction, overflowY } = getComputedStyle(element);
        if (direction !== 'ltr') issues.push(`${source} is not left-to-right`);
        if (
          ['auto', 'clip', 'hidden', 'scroll'].includes(overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) {
          issues.push(`${source} clips vertically`);
        }
        if (element.classList.contains('katex-display')) {
          const owner = element.parentElement;
          const next = owner?.nextElementSibling as HTMLElement | null;
          if (
            owner &&
            next &&
            owner.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1
          ) {
            issues.push(`${source} overlaps the following block`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectDiagramContainment(
  page: Page,
  locale: ChapterLocale,
  contract: DiagramContract,
) {
  await settle(page);
  const diagram = page.locator(`figure[data-visualization-id="${contract.id}"]`);
  await expect(diagram).toHaveCount(1);
  for (const { selector, count } of contract.structure) {
    await expect(diagram.locator(selector)).toHaveCount(count);
  }
  const result = await diagram.evaluate((figure, allowedError) => {
    const root = figure as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const fullscreenRoot = document.fullscreenElement === root;
    const problems: string[] = [];
    const visible = (element: Element) => {
      const style = getComputedStyle(element as HTMLElement);
      return (
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    };
    const describe = (element: Element) => {
      const node = element as HTMLElement;
      if (node.classList.contains('katex')) {
        const latex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
        return `span.katex${latex ? `(${latex})` : ''}`;
      }
      const classes =
        typeof node.className === 'string'
          ? node.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
      return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const hasCompleteBorder = (element: HTMLElement) => {
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
      return (
        widths.every((width) => Number.isFinite(width) && width > 0) &&
        styles.every((styleName) => !['none', 'hidden'].includes(styleName))
      );
    };
    const all = [root, ...root.querySelectorAll<HTMLElement>('*')].filter(
      (element) => visible(element) && !element.closest('.visually-hidden'),
    );
    const isBoundedBox = (element: HTMLElement) => {
      if (element === root && fullscreenRoot) return false;
      const display = getComputedStyle(element).display;
      if (
        element.hasAttribute('data-diagram-scroll') ||
        element.closest('.katex, .katex-mathml, .visually-hidden, [aria-hidden="true"]') ||
        display === 'inline' ||
        display === 'contents' ||
        display.startsWith('table-row')
      ) {
        return false;
      }
      return (
        element === root ||
        element.hasAttribute('data-diagram-box') ||
        ['TH', 'TD'].includes(element.tagName) ||
        hasCompleteBorder(element)
      );
    };
    const boxes = all.filter(isBoundedBox);
    const boxSet = new Set(boxes);
    const nearestBoundedBox = (element: HTMLElement | null): HTMLElement | null => {
      if (!element) return null;
      const scrollOwner = element.closest<HTMLElement>('[data-diagram-scroll]');
      let candidate: HTMLElement | null = element;
      while (candidate && root.contains(candidate)) {
        if (boxSet.has(candidate)) {
          if (scrollOwner && !scrollOwner.contains(candidate)) return null;
          return candidate;
        }
        if (candidate === root) break;
        candidate = candidate.parentElement;
      }
      return null;
    };
    const innerEdges = (box: HTMLElement) => {
      const rect = box.getBoundingClientRect();
      const style = getComputedStyle(box);
      return {
        bottom: rect.bottom - Number.parseFloat(style.borderBottomWidth || '0'),
        left: rect.left + Number.parseFloat(style.borderLeftWidth || '0'),
        right: rect.right - Number.parseFloat(style.borderRightWidth || '0'),
        top: rect.top + Number.parseFloat(style.borderTopWidth || '0'),
      };
    };
    const auditPaintRect = (
      rect: DOMRect,
      box: HTMLElement,
      witness: HTMLElement,
      kind: string,
    ) => {
      if (rect.width <= 0 || rect.height <= 0) return;
      const edges = innerEdges(box);
      const escapes =
        rect.left < edges.left - allowedError ||
        rect.right > edges.right + allowedError ||
        rect.top < edges.top - allowedError ||
        rect.bottom > edges.bottom + allowedError;
      if (!escapes) return;
      const debt = Math.max(
        edges.left - rect.left,
        rect.right - edges.right,
        edges.top - rect.top,
        rect.bottom - edges.bottom,
      );
      problems.push(
        `${describe(witness)} paints ${kind} outside ${describe(box)} by ${debt.toFixed(1)}px`,
      );
    };

    const markedBoxes = all.filter((element) => element.hasAttribute('data-diagram-box'));
    for (const [index, box] of markedBoxes.entries()) {
      if (!hasCompleteBorder(box)) {
        problems.push(`marked box ${index} lacks a four-sided border`);
      }
    }
    for (const box of boxes) {
      const style = getComputedStyle(box);
      if (
        [style.overflowX, style.overflowY].some((overflow) => ['hidden', 'clip'].includes(overflow))
      ) {
        problems.push(`${describe(box)} hides or clips overflow`);
      }
      if (
        box.scrollWidth > box.clientWidth + allowedError ||
        box.scrollHeight > box.clientHeight + allowedError
      ) {
        problems.push(`${describe(box)} does not contain its content`);
      }
      const parentBox = nearestBoundedBox(box.parentElement);
      if (parentBox && parentBox !== box) {
        auditPaintRect(box.getBoundingClientRect(), parentBox, box, 'a nested box');
      }
    }

    const scrollers = Array.from(root.querySelectorAll<HTMLElement>('[data-diagram-scroll]'));
    for (const [index, region] of scrollers.entries()) {
      const style = getComputedStyle(region);
      const rect = region.getBoundingClientRect();
      const owner = region.parentElement?.closest<HTMLElement>('[data-diagram-box]');
      const ownerRect = owner?.getBoundingClientRect();
      if (
        region.getAttribute('role') !== 'region' ||
        region.getAttribute('tabindex') !== '0' ||
        !(region.getAttribute('aria-label') ?? '').trim()
      ) {
        problems.push(`scroll region ${index} lacks its keyboard name or role`);
      }
      if (!['auto', 'scroll'].includes(style.overflowX)) {
        problems.push(`scroll region ${index} does not own horizontal overflow`);
      }
      if (
        ownerRect &&
        (rect.left < ownerRect.left - allowedError || rect.right > ownerRect.right + allowedError)
      ) {
        problems.push(`scroll region ${index} escapes its bounded stage`);
      }
    }

    const excludedFromPaintAudit = (element: Element) =>
      element.closest('.katex-mathml, .visually-hidden') !== null ||
      element.closest('[aria-hidden="true"]') !== null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const parent = textNode.parentElement;
      const text = textNode.textContent?.trim() ?? '';
      if (
        parent &&
        text &&
        visible(parent) &&
        !parent.closest('.katex') &&
        !excludedFromPaintAudit(parent)
      ) {
        const box = nearestBoundedBox(parent);
        if (box) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of Array.from(range.getClientRects())) {
            auditPaintRect(rect, box, parent, 'text');
          }
        }
      }
      textNode = walker.nextNode();
    }

    for (const formula of root.querySelectorAll<HTMLElement>('.katex')) {
      if (
        !visible(formula) ||
        formula.parentElement?.closest('.katex') ||
        formula.closest('.katex-mathml, .visually-hidden')
      ) {
        continue;
      }
      const box = nearestBoundedBox(formula.parentElement);
      if (box) {
        auditPaintRect(formula.getBoundingClientRect(), box, formula, 'formula');
      }
    }
    if (
      rootRect.left < -allowedError ||
      rootRect.right > document.documentElement.clientWidth + allowedError ||
      root.scrollWidth > root.clientWidth + allowedError
    ) {
      problems.push('figure escapes its inline or fullscreen boundary');
    }
    return {
      markedBoxCount: markedBoxes.length,
      scrollerCount: scrollers.length,
      problems,
    };
  }, 2);
  const expectedMarkedBoxes = contract.structure.reduce((sum, item) => sum + item.count, 0);
  expect(result.markedBoxCount).toBeGreaterThanOrEqual(expectedMarkedBoxes);
  expect(result.scrollerCount).toBe(contract.expectedScrollerCount);
  expect(result.problems, `${locale}/${contract.id} diagram containment`).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  const localized = copy[locale];
  const labels = localized.diagram;
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 22,
    revision: localized.revision,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ['en', 'ru'],
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.description);
  await expectSeoDescription(page, localized.description);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);
  expect(localized.revision).toBe(7);
  expect(normalizeProse(await page.locator('.lesson-body').innerText())).toContain(
    normalizeProse(explicitCopy[locale].executionClaim),
  );
  expect(normalizeProse(await page.locator('.lesson-body').innerText())).toContain(
    normalizeProse(explicitCopy[locale].revisionClaim),
  );

  const workedExample = page
    .getByRole('heading', { level: 2, name: localized.headings[0], exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.headings[0]}"]]`,
    );
  const workedText = await readMathAwareText(workedExample);
  for (const claim of explicitCopy[locale].workedClaims) expect(workedText).toContain(claim);

  const history = page
    .getByRole('heading', {
      level: 2,
      name: localized.historyHeading,
      exact: true,
    })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = normalizeProse((await history.allInnerTexts()).join(' '));
  for (const fragment of localized.historyFragments) {
    expect(historyText).toContain(normalizeProse(fragment));
  }
  expect(historyText).not.toMatch(
    /Rust history|Python history|TypeScript history|истори[яи] Rust|истори[яи] Python|истори[яи] TypeScript/i,
  );
  const historyLinks = history.locator('a');
  await expect(historyLinks).toHaveCount(localized.historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(localized.historySources);

  const renderedDisplays = page.locator('.lesson-body > .katex-display');
  await expect(renderedDisplays).toHaveCount(localized.displayFormulae.length);
  expect(
    (
      await renderedDisplays.locator('annotation[encoding="application/x-tex"]').allTextContents()
    ).map(normalizeMath),
  ).toEqual(localized.displayFormulae.map(normalizeMath));
  expect(
    await renderedDisplays.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).toEqual(Array.from({ length: localized.displayFormulae.length }, () => 'ltr'));
  const annotations = (
    await page.locator('annotation[encoding="application/x-tex"]').allTextContents()
  ).map(normalizeMath);
  for (const expected of [
    String.raw`\widetilde g_t=0.25[0.8,-0.4]=[0.2,-0.1]`,
    String.raw`1-\beta_1^t=0.500000`,
    String.raw`1-\beta_2^t=0.500000`,
    String.raw`\eta\lambda\theta_0=[0.01,-0.02]`,
    String.raw`\eta\lambda\theta=0.030000`,
    String.raw`q(x,y)=\frac12(x^2+4y^2)`,
    String.raw`\operatorname{diag}(H)=\left[1,4\right]`,
  ]) {
    expect(
      annotations.some((formula) => formula.includes(normalizeMath(expected))),
      `expected a rendered formula containing ${expected}`,
    ).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  const renderedCode = await page.locator('.lesson-body :not(pre) > code').allTextContents();
  for (const codeShapedMath of ['theta_0', 'g_1', 'm_t', 'v_t', 'eta*lambda']) {
    expect(renderedCode).not.toContain(codeShapedMath);
  }
  await expectFormulaGeometry(page);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted
      .locator('code')
      .evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));
  for (const evidence of await highlighted.evaluateAll((blocks) =>
    blocks.map((block) => ({
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'adamw',
    supplementary: [{ id: 'adamw-evidence' }],
  });
  const primary = page.locator('figure[data-visualization-id="adamw"]');
  const evidence = page.locator('figure[data-visualization-id="adamw-evidence"]');
  await expect(primary).toHaveAccessibleName(labels.title);
  await expect(primary).toHaveAccessibleDescription(labels.description);
  await expect(primary).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(primary).toHaveAttribute('aria-labelledby', 'adamw-chapter-22-title');
  await expect(primary).toHaveAttribute('aria-describedby', 'adamw-chapter-22-description');
  await expect(page.locator('#adamw-chapter-22-title')).toHaveCount(1);
  await expect(page.locator('#adamw-chapter-22-description')).toHaveCount(1);
  await expect(evidence).toHaveAccessibleName(labels.evidenceTitle);
  await expect(evidence).toHaveAccessibleDescription(labels.evidenceDescription);
  await expect(evidence).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(evidence).toHaveAttribute('aria-labelledby', 'adamw-evidence-chapter-22-title');
  await expect(evidence).toHaveAttribute(
    'aria-describedby',
    'adamw-evidence-chapter-22-description',
  );
  await expect(page.locator('#adamw-evidence-chapter-22-title')).toHaveCount(1);
  await expect(page.locator('#adamw-evidence-chapter-22-description')).toHaveCount(1);

  await expect(primary.locator('.config-summary dt')).toHaveText([
    labels.summary.step,
    labels.summary.learningRate,
    labels.summary.momentRates,
    labels.summary.stabilizer,
    labels.summary.decay,
  ]);

  const primaryStageHeadings = primary.locator('.stage-intro > h4, .decay-note > h4');
  await expect(primaryStageHeadings).toHaveCount(2);
  await expect(primaryStageHeadings.locator('.state-symbol')).toHaveText(['1', '2']);
  for (const [index, label] of [labels.stages.moments, labels.stages.deltas].entries()) {
    await expect(primaryStageHeadings.nth(index)).toContainText(label);
  }

  const parameter = parameterEvidence[0];
  const cards = primary.locator('.parameter-card');
  await expect(cards).toHaveCount(1);
  const card = primary.locator(`.parameter-card[data-parameter-index="${parameter.index}"]`);
  await expect(card.locator('h5')).toHaveText(parameter.name);
  await expect(card.locator('[data-parameter-group]')).toHaveText(labels.symbols.applyDecay);
  await expect(card.locator('[data-parameter-group]')).toHaveAttribute(
    'data-parameter-group',
    parameter.group,
  );
  await expect(card.locator('[data-parameter-group] + bdi code')).toHaveText(parameter.group);
  await expect(card.locator('header dl > div').nth(1).locator('dd code')).toHaveText(
    parameter.shape,
  );
  const cardAnnotations = (
    await card.locator('annotation[encoding="application/x-tex"]').allTextContents()
  ).map(normalizeMath);
  for (const expected of [
    parameter.before,
    parameter.gradient,
    parameter.first,
    parameter.second,
    parameter.correctedFirst,
    parameter.correctedSecond,
    parameter.adaptive,
    parameter.decay,
    parameter.after,
  ]) {
    expect(
      cardAnnotations.includes(normalizeMath(expected)),
      `${locale}/${parameter.name} must render ${expected}`,
    ).toBe(true);
  }
  await expect(card.locator('.decay-bypass')).toHaveAttribute(
    'data-decay-bypass',
    'direct-from-parameter',
  );
  await expect(card.locator('.decay-delta')).toHaveAttribute('data-decay-action', 'apply');
  await expect(primary.locator('.trajectory-stage, .proof-stage, .parameter-identity')).toHaveCount(
    0,
  );

  const branchTopology = await card.evaluate((cardNode) => {
    const rect = (selector: string) =>
      cardNode.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
    const input = rect('.input-node');
    const moments = rect('.moment-node');
    const adaptive = rect('.adaptive-delta');
    const bypass = rect('.decay-bypass');
    const origin = rect('.bypass-origin');
    const decay = rect('.decay-delta');
    return {
      rowSeparated: bypass.top >= Math.max(input.bottom, moments.bottom, adaptive.bottom) - 1,
      originAligned: Math.abs(origin.left - input.left) <= 1,
      decayAligned: Math.abs(decay.right - adaptive.right) <= 1,
    };
  });
  expect(branchTopology).toEqual({
    rowSeparated: true,
    originAligned: true,
    decayAligned: true,
  });

  const noDecayParameter = parameterEvidence[1];
  const parameterIdentity = evidence.locator(
    `.parameter-identity[data-parameter-index="${noDecayParameter.index}"]`,
  );
  await expect(parameterIdentity).toHaveCount(1);
  await expect(parameterIdentity).toHaveAttribute('data-parameter-group', noDecayParameter.group);
  await expect(parameterIdentity.locator('h5')).toHaveText(noDecayParameter.name);
  await expect(
    parameterIdentity.locator('.parameter-meta > div').nth(0).locator('dd'),
  ).toContainText(labels.symbols.skipDecay);
  await expect(
    parameterIdentity.locator('.parameter-meta > div').nth(0).locator('dd code'),
  ).toHaveText(noDecayParameter.group);
  await expect(
    parameterIdentity.locator('.parameter-meta > div').nth(1).locator('dd code'),
  ).toHaveText(noDecayParameter.shape);
  await expect(evidence.locator('.parameter-card, .config-summary')).toHaveCount(0);

  const evidenceCells = evidence.locator('.evidence-cell');
  await expect(evidenceCells).toHaveCount(noDecayEvidence.length);
  await expect(evidenceCells.locator('dt')).toHaveText([
    labels.fields.before,
    labels.fields.gradient,
    labels.fields.correctedFirst,
    labels.fields.correctedSecond,
    labels.fields.adaptiveDelta,
    labels.fields.decayDelta,
    labels.fields.after,
  ]);
  for (const item of noDecayEvidence) {
    const cell = evidence.locator(`.evidence-cell[data-evidence="${item.key}"]`);
    await expect(cell).toHaveAttribute('data-vector', item.vector);
    await expect(cell.locator('annotation[encoding="application/x-tex"]')).toHaveText(item.latex);
  }

  const evidenceStageHeadings = evidence.locator(
    '.trajectory-stage > h4, .replacement-stage > h4, .proof-stage h4',
  );
  await expect(evidenceStageHeadings).toHaveCount(3);
  await expect(evidenceStageHeadings.locator('.state-symbol')).toHaveText(['3', '4', '5']);
  for (const [index, label] of [
    labels.stages.trajectory,
    labels.stages.replacement,
    labels.stages.proof,
  ].entries()) {
    await expect(evidenceStageHeadings.nth(index)).toContainText(label);
  }

  const trajectory = evidence.locator('.trajectory-stage');
  const trajectoryLanes = trajectory.locator('.trajectory-lane');
  await expect(trajectoryLanes).toHaveCount(2);
  await expect(trajectoryLanes.locator('h5')).toHaveText([
    labels.symbols.sgd,
    labels.symbols.adamw,
  ]);
  for (const optimizer of ['sgd', 'adamw'] as const) {
    const lane = trajectory.locator(`.trajectory-lane.${optimizer}`);
    await expect(lane.locator('li')).toHaveCount(5);
    expect(
      (
        await lane.locator('li strong annotation[encoding="application/x-tex"]').allTextContents()
      ).map(normalizeMath),
    ).toEqual(trajectoryEvidence[optimizer].map(normalizeMath));
  }
  await expect(trajectory.locator('.trajectory-lane li')).toHaveCount(10);
  await expect(trajectory.locator('annotation[encoding="application/x-tex"]')).toHaveCount(22);

  const proof = evidence.locator('.proof-stage');
  await expect(proof.locator('dt')).toHaveText([
    labels.fields.stateNames,
    labels.fields.rawGradient,
    labels.fields.leafIdentity,
    labels.fields.zeroGradientDecay,
    labels.fields.failedTransaction,
    labels.fields.commit,
  ]);
  await expect(proof.locator('code')).toHaveText(['decoder.norm.scale', 'decoder.output.weight']);
  await expect(proof.locator('dd').nth(1)).toHaveText(labels.symbols.unchanged);
  await expect(proof.locator('dd').nth(2)).toHaveText(labels.symbols.preserved);
  await expect(proof.locator('dd').nth(4)).toHaveText(labels.symbols.unchanged);
  await expect(proof.locator('dd').nth(5)).toHaveText(labels.symbols.atomic);
  await expect(
    proof.locator('dd').nth(3).locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(String.raw`\eta\lambda\theta=0.030000`);

  const primaryScroller = primary.locator('[data-diagram-scroll]');
  const evidenceScroller = evidence.locator('[data-diagram-scroll]');
  await expect(primaryScroller).toHaveCount(1);
  await expect(evidenceScroller).toHaveCount(1);
  await expect(page.locator('figure.course-diagram [data-diagram-scroll]')).toHaveCount(2);
  for (const [scroller, name] of [
    [primaryScroller, `${labels.scrollers.parameterFlow} ${parameter.name}`],
    [evidenceScroller, labels.scrollers.trajectory],
  ] as const) {
    await expect(scroller).toHaveAttribute('role', 'region');
    await expect(scroller).toHaveAttribute('tabindex', '0');
    await expect(scroller).toHaveAccessibleName(name);
    await scroller.focus();
    await expect(scroller).toBeFocused();
    if (narrow) {
      const widths = await scroller.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }
  for (const diagram of [primary, evidence]) {
    expect(
      await diagram
        .locator('code, bdi, .katex')
        .evaluateAll(
          (nodes) =>
            nodes.length > 0 &&
            nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
        ),
    ).toBe(true);
  }
  for (const contract of diagramContracts) {
    await expectDiagramContainment(page, locale, contract);
  }

  if (narrow) {
    expect(
      await primary
        .locator('.parameter-card > header')
        .evaluateAll((headers) =>
          headers.every((header) => window.getComputedStyle(header).display === 'grid'),
        ),
    ).toBe(true);
    for (const selector of ['.parameter-evidence > .evidence-cell', '.proof-grid > div']) {
      const tops = await evidence
        .locator(selector)
        .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)));
      expect(new Set(tops).size, `${locale}/${selector} must reflow to one column`).toBe(
        tops.length,
      );
    }
  }

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(details.locator('ol > li')).toHaveCount(9);
  expect(await readMathAwareText(details.locator('ol > li').nth(7))).toBe(
    explicitCopy[locale].answerEight,
  );
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 22 localized AdamW vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('chapter 22 is twenty-second on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    expect(copy.ru.rustRegions).toEqual(copy.en.rustRegions);
    expect(copy.ru.displayFormulae.map(normalizeMath)).toEqual(
      copy.en.displayFormulae.map(normalizeMath),
    );
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(22);
      expect(chapters[21]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 22,
          title: localized.title,
        }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 22,
        revision: localized.revision,
        revisionLabel: localized.revisionLabel,
        title: localized.title,
        equivalentLocales: ['en', 'ru'],
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
          page.getByRole('heading', {
            level: 1,
            name: copy[target.code].title,
            exact: true,
          }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`the complete ${locale} Rust-backed lesson renders at desktop and narrow widths`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 720, height: 900 });
      await page.reload();
      await settle(page);
      for (const contract of diagramContracts) {
        await expectDiagramContainment(page, locale, contract);
      }
      await expectNoOverflowOrClientScripts(page);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('Chapter 22 full view fits both locales, remains readable, and restores focus', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    const localizedControlLabels: string[] = [];
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const pageToggles = page.locator('[data-diagram-full-view-toggle]');
      await expect(pageToggles).toHaveCount(diagramContracts.length);
      const controlLabels = await pageToggles.evaluateAll((toggles) =>
        toggles.map((toggle) => toggle.getAttribute('aria-label')?.trim() ?? ''),
      );
      expect(controlLabels.every(Boolean), `${locale} full-view control labels`).toBe(true);
      expect(new Set(controlLabels).size, `${locale} full-view control labels`).toBe(1);
      localizedControlLabels.push(controlLabels[0]!);

      const controlledFigures: string[] = [];
      for (const contract of diagramContracts) {
        const diagram = page.locator(`figure[data-visualization-id="${contract.id}"]`);
        const toggle = diagram.locator('[data-diagram-full-view-toggle]');
        await expect(toggle).toHaveCount(1);
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAccessibleName(controlLabels[0]!);
        const figureDomId = await diagram.getAttribute('id');
        expect(figureDomId, `${locale}/${contract.id} DOM id`).toBeTruthy();
        await expect(toggle).toHaveAttribute('aria-controls', figureDomId!);
        controlledFigures.push(figureDomId!);

        const before = await diagram.evaluate((node) => ({
          counts: {
            boxes: node.querySelectorAll('[data-diagram-box]').length,
            scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
            formulae: node.querySelectorAll('.katex').length,
            code: node.querySelectorAll('code').length,
            parameterCards: node.querySelectorAll('.parameter-card').length,
            evidenceCells: node.querySelectorAll('.evidence-cell').length,
            trajectoryPoints: node.querySelectorAll('.trajectory-lane li').length,
            proofCells: node.querySelectorAll('.proof-grid > [data-diagram-box]').length,
          },
          minFont: Math.min(
            ...Array.from(node.querySelectorAll<HTMLElement>('h3, h4, h5, p, dt, dd, li, code'))
              .filter((element) => element.getClientRects().length > 0)
              .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
          ),
        }));

        await toggle.click();
        await page.waitForFunction(
          (expectedId) =>
            document.fullscreenElement?.getAttribute('data-visualization-id') === expectedId,
          contract.id,
        );
        await settle(page);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expectDiagramContainment(page, locale, contract);
        const geometry = await diagram.evaluate((node) => ({
          counts: {
            boxes: node.querySelectorAll('[data-diagram-box]').length,
            scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
            formulae: node.querySelectorAll('.katex').length,
            code: node.querySelectorAll('code').length,
            parameterCards: node.querySelectorAll('.parameter-card').length,
            evidenceCells: node.querySelectorAll('.evidence-cell').length,
            trajectoryPoints: node.querySelectorAll('.trajectory-lane li').length,
            proofCells: node.querySelectorAll('.proof-grid > [data-diagram-box]').length,
          },
          blockDebt: node.scrollHeight - node.clientHeight,
          blockBudget: Math.ceil(node.clientHeight * 0.25) + 2,
          blockSections: Array.from(node.children).map((child) => ({
            name:
              child.getAttribute('class') ??
              child.getAttribute('data-diagram-full-view-actions') ??
              child.tagName.toLowerCase(),
            height: Math.round(child.getBoundingClientRect().height * 10) / 10,
          })),
          primaryParts: [
            '.parameter-card > header',
            '.parameter-scroll',
            '.flow',
            '.input-node',
            '.moment-node',
            '.adaptive-delta',
            '.decay-bypass',
            '.bypass-origin',
            '.decay-delta',
            '.output-node',
          ].flatMap((selector) => {
            const part = node.querySelector<HTMLElement>(selector);
            return part
              ? [{ selector, height: Math.round(part.getBoundingClientRect().height * 10) / 10 }]
              : [];
          }),
          evidenceParts: [
            '.no-decay-stage',
            '.no-decay-stage > h4',
            '.parameter-identity',
            '.parameter-evidence',
            '.evidence-cell',
            '.trajectory-stage',
            '.trajectory-scroll',
            '.closing-grid',
            '.replacement-stage',
            '.proof-stage',
            '.proof-stage > div',
            '.proof-grid',
            '.proof-grid > div',
          ].flatMap((selector) => {
            const parts = Array.from(node.querySelectorAll<HTMLElement>(selector));
            return parts.map((part, index) => ({
              selector: `${selector}[${index}]`,
              width: Math.round(part.getBoundingClientRect().width * 10) / 10,
              height: Math.round(part.getBoundingClientRect().height * 10) / 10,
            }));
          }),
          inlineDebt: node.scrollWidth - node.clientWidth,
          regionDebts: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-scroll]')).map(
            (region) => ({
              name: region.getAttribute('aria-label'),
              inline: region.scrollWidth - region.clientWidth,
              block: region.scrollHeight - region.clientHeight,
              clientWidth: region.clientWidth,
              scrollWidth: region.scrollWidth,
              children: Array.from(region.children).map((child) => ({
                className: child.getAttribute('class'),
                width: Math.round(child.getBoundingClientRect().width * 10) / 10,
                scrollWidth: (child as HTMLElement).scrollWidth,
              })),
            }),
          ),
          boxDebts: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-box]')).map(
            (box) => ({
              inline: box.scrollWidth - box.clientWidth,
              block: box.scrollHeight - box.clientHeight,
            }),
          ),
          minFont: Math.min(
            ...Array.from(node.querySelectorAll<HTMLElement>('h3, h4, h5, p, dt, dd, li, code'))
              .filter((element) => element.getClientRects().length > 0)
              .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
          ),
        }));
        const geometryLabel = `${locale}/${contract.id}`;
        expect(geometry.counts).toEqual(before.counts);
        expect(
          geometry.blockDebt,
          `${geometryLabel} full-view block debt; sections=${JSON.stringify(geometry.blockSections)}; primary=${JSON.stringify(geometry.primaryParts)}; evidence=${JSON.stringify(geometry.evidenceParts)}`,
        ).toBeLessThanOrEqual(
          geometry.blockBudget,
        );
        expect(geometry.inlineDebt, `${geometryLabel} full-view inline debt`).toBeLessThanOrEqual(
          2,
        );
        expect(
          geometry.regionDebts.every(({ inline, block }) => inline <= 2 && block <= 2),
          `${geometryLabel} named-region debt: ${JSON.stringify(geometry.regionDebts)}`,
        ).toBe(true);
        expect(
          geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2),
          `${geometryLabel} bounded-box debt: ${JSON.stringify(geometry.boxDebts)}`,
        ).toBe(true);
        expect(geometry.minFont).toBeGreaterThanOrEqual(11.9);
        expect(geometry.minFont).toBeGreaterThanOrEqual(before.minFont - 0.1);

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toBeFocused();
      }
      expect(new Set(controlledFigures).size, `${locale} controlled figures`).toBe(
        diagramContracts.length,
      );
    }
    expect(new Set(localizedControlLabels).size).toBe(chapterLocales.length);
  });

  test('adaptive, decay, group, trajectory, and commit states survive forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const primary = page.locator('figure[data-visualization-id="adamw"]');
      const evidence = page.locator('figure[data-visualization-id="adamw-evidence"]');
      await expect(primary.locator('.adaptive-delta')).toHaveCSS('border-top-style', 'solid');
      await expect(primary.locator('.decay-delta')).toHaveCSS('border-top-style', 'dashed');
      await expect(primary.locator('.group-badge')).toHaveCSS('border-top-style', 'solid');
      await expect(evidence.locator('.no-decay-identity')).toHaveCSS('border-top-style', 'dashed');
      await expect(evidence.locator('.trajectory-lane.sgd')).toHaveCSS('border-top-style', 'solid');
      await expect(evidence.locator('.trajectory-lane.adamw')).toHaveCSS(
        'border-top-style',
        'double',
      );
      await expect(primary.locator('[data-parameter-group]')).toHaveText(
        copy[locale].diagram.symbols.applyDecay,
      );
      await expect(evidence.locator('.no-decay-stage > h4')).toHaveText(
        copy[locale].diagram.symbols.skipDecay,
      );
      await expect(evidence.locator('.state-symbol')).toHaveText(['3', '4', '5']);
      for (const contract of diagramContracts) {
        await expectDiagramContainment(page, locale, contract);
      }
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('localized prose follows RTL while technical evidence stays left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const primary = page.locator('figure[data-visualization-id="adamw"]');
      const evidence = page.locator('figure[data-visualization-id="adamw-evidence"]');
      for (const diagram of [primary, evidence]) {
        await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
        await expect(diagram.locator('.course-diagram__description')).toHaveCSS('direction', 'rtl');
        expect(
          await diagram
            .locator('bdi[dir="ltr"], code, .katex')
            .evaluateAll(
              (nodes) =>
                nodes.length > 0 &&
                nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
            ),
        ).toBe(true);
      }
      await expect(primary.locator('.config-summary dt').first()).toHaveText(
        copy[locale].diagram.summary.step,
      );
      await expect(primary.locator('.config-summary dt').first()).toHaveCSS('direction', 'rtl');
      await expect(evidence.locator('.no-decay-stage > h4')).toHaveText(
        copy[locale].diagram.symbols.skipDecay,
      );
      await expect(evidence.locator('.no-decay-stage > h4')).toHaveCSS('direction', 'rtl');
      expect(
        await primary.locator('.flow-arrow, .bypass-arrow').evaluateAll(
          (nodes) =>
            nodes.length > 0 &&
            nodes.every((node) => {
              const transform = getComputedStyle(node).transform;
              return transform !== 'none' && new DOMMatrix(transform).a < 0;
            }),
        ),
      ).toBe(true);
      expect(
        await evidence.locator('.trajectory-arrow').evaluateAll(
          (nodes) =>
            nodes.length > 0 &&
            nodes.every((node) => {
              const transform = getComputedStyle(node).transform;
              return transform !== 'none' && new DOMMatrix(transform).a < 0;
            }),
        ),
      ).toBe(true);
      for (const contract of diagramContracts) {
        await expectDiagramContainment(page, locale, contract);
      }
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('both complete localized lessons and exact trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: copy[locale].title,
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator('figure.rust-source')).toHaveCount(expectedRustRegions.length);
      const primary = page.locator('figure[data-visualization-id="adamw"]');
      const evidence = page.locator('figure[data-visualization-id="adamw-evidence"]');
      await expect(primary).toBeVisible();
      await expect(primary).toHaveAccessibleName(copy[locale].diagram.title);
      await expect(evidence).toBeVisible();
      await expect(evidence).toHaveAccessibleName(copy[locale].diagram.evidenceTitle);
      await expect(primary.locator('.parameter-card')).toHaveCount(1);
      await expect(primary.locator('.trajectory-lane, .proof-stage')).toHaveCount(0);
      await expect(evidence.locator('.parameter-identity')).toHaveCount(1);
      await expect(evidence.locator('.evidence-cell')).toHaveCount(7);
      await expect(evidence.locator('.trajectory-lane')).toHaveCount(2);
      await expect(evidence.locator('.trajectory-lane li')).toHaveCount(10);
      await expect(primary.locator('[data-diagram-scroll]')).toHaveCount(1);
      await expect(evidence.locator('[data-diagram-scroll]')).toHaveCount(1);
      await expect(page.locator('figure.course-diagram [data-diagram-scroll]')).toHaveCount(2);
      await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
      await expect(primary.locator('.decay-delta')).toContainText('0.01');
      await expect(evidence.locator('.proof-stage')).toContainText(
        copy[locale].diagram.symbols.atomic,
      );
      for (const contract of diagramContracts) {
        await expectDiagramContainment(page, locale, contract);
      }
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
