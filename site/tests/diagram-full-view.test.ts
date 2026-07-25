// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync, readdirSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  hasMaterialHorizontalOverflow,
  DIAGRAM_FULL_VIEW_MEDIA,
  DIAGRAM_SELECTOR,
  MATERIAL_OVERFLOW_RATIO,
  MATERIAL_OVERFLOW_PX,
  MINIMUM_FULLSCREEN_GAIN_PX,
} from '../src/lib/diagram-full-view';
import {
  parseJsonFrontmatter,
  validateChapterDocument,
  validateDiagramComponents,
  validateDiagramComponentSource,
} from '../../scripts/check-site-content.mjs';

declare const process: { cwd(): string };

interface UsefulDiagram {
  chapterId: string;
  invocation: string;
  visualizationId: string;
}

const repositoryRoot = resolve(process.cwd(), '..');
const diagramDirectory = resolve(process.cwd(), 'src/components/chapters');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');

function filesBelow(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true }) as Array<{
    isDirectory(): boolean;
    name: string;
  }>;
  return entries.flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

describe('course-wide diagram full-view contract', () => {
  it('keeps every current diagram registered as static semantic HTML', () => {
    const diagrams = (readdirSync(diagramDirectory) as string[])
      .filter((name: string) => name.endsWith('Diagram.astro'))
      .sort();

    expect(diagrams.length).toBeGreaterThanOrEqual(30);
    expect(validateDiagramComponents(repositoryRoot)).toBe(diagrams.length);
    for (const diagram of diagrams) {
      const source = readFileSync(resolve(diagramDirectory, diagram), 'utf8');
      expect(() =>
        validateDiagramComponentSource(source, diagram),
      ).not.toThrow();
    }
  });

  it('rejects unregistered diagrams and chapter-private presentation code', () => {
    const semanticFigure = `
      <figure class="course-diagram example-diagram" data-diagram-style="course-v1"
        data-visualization-id="example" tabindex="0"
        aria-labelledby="title" aria-describedby="description">
        <figcaption class="course-diagram__caption">
          <h3 id="title">Example</h3>
          <p id="description" class="course-diagram__description">Description</p>
        </figcaption>
      </figure>`;

    expect(() => validateDiagramComponentSource(semanticFigure)).not.toThrow();
    expect(() =>
      validateDiagramComponentSource(semanticFigure.replace(' data-visualization-id="example"', '')),
    ).toThrow(/data-visualization-id/);
    expect(() =>
      validateDiagramComponentSource(
        semanticFigure.replace('</figure>', '<figure></figure></figure>'),
      ),
    ).toThrow(/exactly one figure/);
    expect(() =>
      validateDiagramComponentSource(
        semanticFigure.replace('</figure>', '<figcaption>Duplicate</figcaption></figure>'),
      ),
    ).toThrow(/exactly one figcaption/);
    expect(() =>
      validateDiagramComponentSource(`${semanticFigure}<script>requestFullscreen()</script>`),
    ).toThrow(/shared controller/);
    expect(() =>
      validateDiagramComponentSource(semanticFigure.replace('</figure>', '<dialog></dialog></figure>')),
    ).toThrow(/shared controller/);
    expect(() =>
      validateDiagramComponentSource(
        semanticFigure.replace('</figure>', '<button>Expand</button></figure>'),
      ),
    ).toThrow(/shared controller/);
  });

  it('requires exactly one diagram in every useful visualization section', () => {
    const chapterPath = 'site/src/content/chapters/en/30-multi-head-attention.mdx';
    const chapter = read(chapterPath);
    const invocation = '<MultiHeadAttentionDiagram labels={diagramLabels} />';
    expect(chapter).toContain(invocation);
    expect(() =>
      validateChapterDocument(chapter.replace(invocation, `${invocation}\n${invocation}`), {
        sourceName: chapterPath,
        checkSourceFiles: false,
        supportedLocales: ['en'],
      }),
    ).toThrow(/exactly one \*Diagram component/);
  });

  it('maps every useful English chapter to one unique registered diagram', () => {
    const chapterDirectory = resolve(process.cwd(), 'src/content/chapters/en');
    const useful = (readdirSync(chapterDirectory) as string[])
      .filter((name: string) => name.endsWith('.mdx'))
      .map((name: string): UsefulDiagram | null => {
        const source = readFileSync(resolve(chapterDirectory, name), 'utf8');
        const { data, body } = parseJsonFrontmatter(source, name);
        if (data.visualization.decision !== 'useful') return null;
        const invocation = body.match(/<([A-Z][A-Za-z0-9]*Diagram)(?:\s|\/|>)/);
        return {
          chapterId: data.chapter_id as string,
          visualizationId: data.visualization.id as string,
          invocation: invocation?.[1] ?? '',
        };
      })
      .filter((entry: UsefulDiagram | null): entry is UsefulDiagram => entry !== null);

    expect(useful.length).toBeGreaterThanOrEqual(30);
    expect(new Set(useful.map(({ chapterId }) => chapterId)).size).toBe(useful.length);
    expect(new Set(useful.map(({ visualizationId }) => visualizationId)).size).toBe(useful.length);
    expect(useful.every(({ invocation }) => invocation.endsWith('Diagram'))).toBe(true);
  });

  it('uses one layout-level controller and typed localized controls', () => {
    const layout = read('site/src/layouts/BaseLayout.astro');
    const controller = read('site/src/lib/diagram-full-view.ts');
    const messages = read('site/src/i18n/messages.ts');
    const english = JSON.parse(read('site/src/i18n/catalogs/en.json')) as Record<string, string>;
    const russian = JSON.parse(read('site/src/i18n/catalogs/ru.json')) as Record<string, string>;

    expect(layout.match(/<script\b/g)).toHaveLength(1);
    expect(layout).toContain("import { initializeDiagramFullView }");
    expect(layout).toContain('data-diagram-full-view-open');
    expect(layout).toContain('data-diagram-full-view-close');
    expect(controller).toContain('requestFullscreen');
    expect(controller).toContain("document.addEventListener('fullscreenchange'");
    expect(controller).toContain("document.addEventListener('keydown'");
    expect(controller).toContain('caption.after(actions)');
    expect(controller).not.toContain('state.figure.prepend(actions)');
    expect(controller).not.toContain('cloneNode');
    const initializers = filesBelow(resolve(process.cwd(), 'src'))
      .filter((path) => /\.(?:astro|ts)$/.test(path))
      .filter((path) => readFileSync(path, 'utf8').includes('initializeDiagramFullView'))
      .sort();
    expect(initializers).toEqual([
      resolve(process.cwd(), 'src/layouts/BaseLayout.astro'),
      resolve(process.cwd(), 'src/lib/diagram-full-view.ts'),
    ]);
    expect(messages).toContain("'diagramFullViewOpenLabel'");
    expect(messages).toContain("'diagramFullViewCloseLabel'");
    expect(english.diagramFullViewOpenLabel).toBe('View diagram full screen');
    expect(english.diagramFullViewCloseLabel).toBe('Exit full screen');
    expect(russian.diagramFullViewOpenLabel).toBe('Развернуть схему на весь экран');
    expect(russian.diagramFullViewCloseLabel).toBe('Выйти из полноэкранного режима');
  });

  it('enables only materially overflowing diagrams on desktop-sized viewports', () => {
    expect(DIAGRAM_SELECTOR).toBe('figure[data-visualization-id]');
    expect(DIAGRAM_FULL_VIEW_MEDIA).toBe(
      '(min-width: 64rem) and (min-height: 36rem)',
    );
    expect(MATERIAL_OVERFLOW_PX).toBe(64);
    expect(MATERIAL_OVERFLOW_RATIO).toBe(0.125);
    expect(MINIMUM_FULLSCREEN_GAIN_PX).toBe(64);
    expect(hasMaterialHorizontalOverflow(300, 363)).toBe(false);
    expect(hasMaterialHorizontalOverflow(300, 364)).toBe(true);
    expect(hasMaterialHorizontalOverflow(800, 899)).toBe(false);
    expect(hasMaterialHorizontalOverflow(800, 900)).toBe(true);
    expect(hasMaterialHorizontalOverflow(0, 500)).toBe(false);
    expect(hasMaterialHorizontalOverflow(Number.NaN, 500)).toBe(false);
  });

  it('documents the shared rule and leaves diagram tables under their named scrollers', () => {
    const agents = read('AGENTS.md');
    const playbook = read('SKILLS.md');
    const lessonRoute = read('site/src/pages/[locale]/course/[...slug].astro');
    const layout = read('site/src/layouts/BaseLayout.astro');
    const diagramStyles = read('site/src/styles/diagram.module.css');
    const globalStyles = read('site/src/styles/global.css');

    expect(agents).toContain('### Diagram presentation');
    expect(agents).toContain('Do not implement chapter-specific full-view behavior.');
    expect(playbook).toMatch(/layout-level diagram full-view\s+controller/);
    expect(playbook).toContain('no chapter-local client script');
    expect(layout).toContain("import diagramStyles from '../styles/diagram.module.css';");
    expect(layout).toContain('<body class={diagramStyles.host}>');
    expect(diagramStyles).toContain("course-diagram[data-diagram-style='course-v1']");
    expect(globalStyles).not.toContain('data-diagram-full-view');
    expect(lessonRoute).toContain('.lesson-body > table');
    expect(lessonRoute).not.toContain('.lesson-body table {');
  });
});
