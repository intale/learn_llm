// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

declare const process: { cwd(): string };

const chapterFiles = [
  '01-text-units.mdx',
  '02-corpus-partitions.mdx',
  '03-learn-bpe-merges.mdx',
  '04-apply-bpe-tokenizer.mdx',
  '05-autoregressive-examples.mdx',
  '06-bigram-baseline.mdx',
  '07-language-model-metrics.mdx',
] as const;
const locales = ['en', 'ru'] as const;
const chapterRoot = resolve(process.cwd(), 'src/content/chapters');
const componentRoot = resolve(process.cwd(), 'src/components');

function readChapter(locale: (typeof locales)[number], file: string): string {
  return readFileSync(resolve(chapterRoot, locale, file), 'utf8');
}

function withoutFrontmatter(source: string): string {
  const result = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  expect(result, 'chapter frontmatter must be present').not.toBe(source);
  return result;
}

function withoutFencedCode(source: string): string {
  return source.replace(/```[\s\S]*?```/g, '');
}

function mathMarkup(source: string) {
  const body = withoutFencedCode(withoutFrontmatter(source));
  const display = body.match(/\$\$[\s\S]+?\$\$/g) ?? [];
  const withoutDisplay = body.replace(/\$\$[\s\S]+?\$\$/g, '');
  const inline = withoutDisplay.match(/(?<!\\)\$(?!\$)[^$\r\n]+?(?<!\\)\$/g) ?? [];
  return { body, display, inline };
}

function proseOutsideMathAndCode(source: string): string {
  return withoutFencedCode(withoutFrontmatter(source))
    .replace(/\$\$[\s\S]+?\$\$/g, '')
    .replace(/(?<!\\)\$(?!\$)[^$\r\n]+?(?<!\\)\$/g, '')
    .replace(/(?<!`)`([^`\r\n]+)`(?!`)/g, '');
}

function inlineCode(source: string): string[] {
  const body = withoutFencedCode(withoutFrontmatter(source));
  return [...body.matchAll(/(?<!`)`([^`\r\n]+)`(?!`)/g)].map((match) => match[1]);
}

const requiredBodyMath: Record<string, readonly string[]> = {
  '01': [String.raw`z_i`],
  '02': [String.raw`\mathcal{D}_{tr}`],
  '03': [String.raw`C(a,b)`],
  '04': [String.raw`\operatorname{encode}_{content}`],
  '05': [String.raw`T+1`, String.raw`x_i`],
  '06': [String.raw`C_{ij}`, String.raw`\alpha`],
  '07': [String.raw`-\ln`, String.raw`\operatorname{PPL}`],
};

const formerMathCodeSpans = [
  'i',
  'r',
  'k',
  'T',
  'S',
  'N',
  's_k',
  'T+1',
  'x_i',
  'y_i',
  'C(a,b)',
  '-a',
  '-b',
  '256+r',
  '256+k',
  'encode_content(decode_content(z)) = z',
  'C_{ij}',
  'N_i',
  'alpha',
  '-ln p',
  'NLL',
  'PPL',
  'p=0',
  'exp(NLL/N)',
] as const;

const rawFormulaPatterns = [
  /\bC\s*\(\s*[ab]\s*,\s*[ab]\s*\)/,
  /\b256\s*\+\s*[rk]\b/,
  /\bT\s*\+\s*1\b/,
  /\b[xy]_i\b/,
  /\bs_k\b/,
  /\bC_\{ij\}\b/,
  /\bN_i\b/,
  /-\s*(?:ln|log)\s+p\b/i,
  /\bp\s*=\s*0\b/,
  /\b(?:NLL|PPL)\s*=/,
] as const;

const suspiciousCode =
  /(?:[=+*/−×÷≤≥≠≈∞→]|->|\b(?:T|S|N|p|q|x|y|z|i|j|k|r)\b|\\(?:frac|sum|ln|log|exp)|_[{A-Za-z0-9])/;
const documentedLiteralData = [
  {
    name: 'Unicode scalar notation',
    pattern: /^(?:U\+[0-9A-F]+|\[[^\]]*\bU\+[0-9A-F]+\b[^\]]*\])$/i,
  },
  {
    name: 'literal count ratios emitted by examples',
    pattern: /^\d+(?:\s*\/\s*\d+)+$/,
  },
  {
    name: 'literal Rust ranges',
    pattern: /^\d+\.\.=\d+$/,
  },
  {
    name: 'literal trace fields',
    pattern: /^(?:index|test_selectable|target_count)=(?:\d+|yes|no)$/,
  },
  {
    name: 'literal signed floating-point output',
    pattern: /^\+0\.0$/,
  },
  {
    name: 'repository paths',
    pattern: /^(?:rust|src|examples)\//,
  },
  {
    name: 'concrete shell commands',
    pattern: /^(?:cargo|docker|git|npm)\s/,
  },
  {
    name: 'concrete API identifiers',
    pattern: /^(?=.{5,}$)(?:[A-Za-z][A-Za-z0-9]*(?:::|\.))?(?:[A-Za-z][A-Za-z0-9]*_)+[A-Za-z][A-Za-z0-9]*(?:\([^\r\n]*\))?$/,
  },
  {
    name: 'literal token-transition records',
    pattern: /^[A-Z]+(?:\(\d+\))?→[A-Z]+(?:\(\d+\))?$/,
  },
  {
    name: 'literal input-target records',
    pattern: /^\[[^\]]+\]\s*->\s*\[[^\]]+\]$/,
  },
  {
    name: 'concrete Rust type signatures',
    pattern: /^[A-Za-z][\w:<>]*(?:\s*->\s*[A-Za-z][\w:<>, ]*)$/,
  },
] as const;

describe('Chapter 1-7 formula-source contract', () => {
  it('enumerates both published locales and routes every reviewed expression through math markup', () => {
    const reviewed: string[] = [];
    for (const locale of locales) {
      for (const file of chapterFiles) {
        const source = readChapter(locale, file);
        const { body, display, inline } = mathMarkup(source);
        const chapter = file.slice(0, 2);
        reviewed.push(`${locale}/${file}`);

        expect(display.length, `${locale}/${file} display math`).toBeGreaterThan(0);
        expect(inline.length, `${locale}/${file} inline math`).toBeGreaterThan(0);
        for (const fragment of requiredBodyMath[chapter]) {
          expect(body, `${locale}/${file} must retain ${fragment}`).toContain(fragment);
        }

        const code = inlineCode(source);
        for (const oldExpression of formerMathCodeSpans) {
          expect(code, `${locale}/${file} still styles ${oldExpression} as code`).not.toContain(
            oldExpression,
          );
        }

        const prose = proseOutsideMathAndCode(source);
        for (const pattern of rawFormulaPatterns) {
          expect(prose, `${locale}/${file} contains raw formula ${pattern}`).not.toMatch(pattern);
        }
      }
    }

    expect(reviewed).toHaveLength(14);
    expect(new Set(reviewed).size).toBe(14);
  });

  it('keeps math-like code spans only when they are concrete program or trace data', () => {
    const seen = new Set<string>();
    for (const locale of locales) {
      for (const file of chapterFiles) {
        for (const value of inlineCode(readChapter(locale, file))) {
          if (!suspiciousCode.test(value)) continue;
          const allowance = documentedLiteralData.find(({ pattern }) => pattern.test(value));
          expect(
            allowance?.name,
            `${locale}/${file} has an undocumented math-like code span: \`${value}\``,
          ).toBeTruthy();
          if (allowance) seen.add(allowance.name);
        }
      }
    }

    expect([...seen].sort()).toEqual(
      documentedLiteralData.map(({ name }) => name).sort(),
    );
  });
});

describe('build-time formula rendering in Chapter 1-7 diagrams', () => {
  it('uses one strict HTML-plus-MathML helper without client JavaScript', () => {
    const source = readFileSync(resolve(componentRoot, 'InlineMath.astro'), 'utf8');
    expect(source).toContain("import { renderToString } from 'katex'");
    expect(source).toContain("output: 'htmlAndMathml'");
    expect(source).toContain("strict: 'error'");
    expect(source).toContain('throwOnError: true');
    expect(source).toContain('data-inline-math');
    expect(source).not.toContain('<script');
    expect(source).not.toContain('client:');
  });

  it('renders component-owned expressions or replaces them with natural localized wording', () => {
    const components = {
      corpus: readFileSync(
        resolve(componentRoot, 'chapters/CorpusPartitionsDiagram.astro'),
        'utf8',
      ),
      tokenizer: readFileSync(
        resolve(componentRoot, 'chapters/ApplyBpeTokenizerDiagram.astro'),
        'utf8',
      ),
      windows: readFileSync(
        resolve(componentRoot, 'chapters/AutoregressiveExamplesDiagram.astro'),
        'utf8',
      ),
      bigram: readFileSync(
        resolve(componentRoot, 'chapters/BigramBaselineDiagram.astro'),
        'utf8',
      ),
      metrics: readFileSync(
        resolve(componentRoot, 'chapters/LanguageModelMetricsDiagram.astro'),
        'utf8',
      ),
    };

    expect(components.corpus).toContain("import InlineMath from '../InlineMath.astro'");
    expect(components.corpus).toContain('String.raw`\\frac{${assignedCount}}{${assignedCount}}`');
    expect(components.corpus).not.toContain('{assignedCount} / {assignedCount}');
    expect(components.tokenizer).toContain("import InlineMath from '../InlineMath.astro'");
    expect(components.tokenizer).toContain('<InlineMath latex="+2" />');
    expect(components.windows).not.toContain('↳ +1');
    expect(components.windows).not.toContain('<span aria-hidden="true">+1</span>');
    expect(components.bigram).not.toMatch(/C_\{ij\}|\\alpha/);
    expect(components.metrics).not.toMatch(/−ln p|-\\ln p/);
    for (const source of Object.values(components)) {
      expect(source).not.toContain('<script');
      expect(source).not.toContain('client:');
    }
  });
});
