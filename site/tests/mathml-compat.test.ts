import { renderToString } from 'katex';
import { describe, expect, it } from 'vitest';

import {
  mathematicalAlphanumericText,
  normalizeMathmlVariantsInHtml,
  rehypeMathmlCompatibility,
} from '../src/lib/mathml-compat.mjs';
import { mathmlCompatibilityIssues } from '../../scripts/check-static-links.mjs';

function render(latex: string) {
  return renderToString(latex, {
    displayMode: false,
    output: 'htmlAndMathml',
    strict: 'error',
    throwOnError: true,
  });
}

describe('MathML Core compatibility', () => {
  it('replaces KaTeX mathematical variants with Unicode symbols', () => {
    const latex = String.raw`\mathcal{D}\mathcal{L}\mathsf{T}\mathbf{i}\mathbf{1}\mathbb{R}`;
    const original = render(latex);
    const annotation = original.match(
      /<annotation[^>]*>([\s\S]*?)<\/annotation>/,
    )?.[1];

    expect(original).toContain('mathvariant="script"');
    expect(original).toContain('mathvariant="sans-serif"');
    expect(original).toContain('mathvariant="bold"');
    expect(original).toContain('mathvariant="double-struck"');

    const normalized = normalizeMathmlVariantsInHtml(original);
    for (const symbol of ['𝒟', 'ℒ', '𝖳', '𝐢', '𝟏', 'ℝ']) {
      expect(normalized).toContain(symbol);
    }
    expect(normalized).not.toMatch(
      /mathvariant="(?:script|sans-serif|bold|double-struck)"/,
    );
    expect(normalized.match(/<annotation[^>]*>([\s\S]*?)<\/annotation>/)?.[1])
      .toBe(annotation);
    expect(mathmlCompatibilityIssues('sample.html', normalized)).toEqual([]);
  });

  it('retains the allowed normal variant', () => {
    const original = render(String.raw`\mathrm{max}`);
    expect(original).toContain('mathvariant="normal"');
    expect(normalizeMathmlVariantsInHtml(original)).toBe(original);

    expect(
      normalizeMathmlVariantsInHtml(
        '<math><mo mathvariant="normal">+</mo></math>',
      ),
    ).toBe('<math><mo>+</mo></math>');
  });

  it('normalizes rehype element properties after KaTeX', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'mi',
          properties: { mathvariant: 'double-struck' },
          children: [{ type: 'text', value: 'R' }],
        },
        {
          type: 'element',
          tagName: 'mi',
          properties: { mathvariant: 'normal' },
          children: [{ type: 'text', value: 'x' }],
        },
      ],
    };

    rehypeMathmlCompatibility()(tree);

    expect(tree.children[0]).toEqual({
      type: 'element',
      tagName: 'mi',
      properties: {},
      children: [{ type: 'text', value: 'ℝ' }],
    });
    expect(tree.children[1].properties).toEqual({ mathvariant: 'normal' });
  });

  it('fails closed for an unsupported alphabet or structured variant token', () => {
    expect(() => mathematicalAlphanumericText('α', 'bold')).toThrow(
      /cannot map character/,
    );
    expect(() => mathematicalAlphanumericText('x', 'initial')).toThrow(
      /Unsupported MathML mathvariant/,
    );
    expect(() =>
      normalizeMathmlVariantsInHtml(
        '<math><mi mathvariant="bold"><mrow>i</mrow></mi></math>',
      ),
    ).toThrow(/unnormalized mathvariant/);
  });

  it('distinguishes maximum labels from the max function operator', () => {
    const malformed = render(String.raw`\Delta_{\max}`);
    expect(mathmlCompatibilityIssues('malformed.html', malformed)).toEqual([
      expect.stringMatching(/<msub> with 3 element children; expected 2/),
    ]);

    const label = normalizeMathmlVariantsInHtml(
      render(String.raw`\Delta_{\mathrm{max}}`),
    );
    expect(mathmlCompatibilityIssues('label.html', label)).toEqual([]);
    const maxOperator = normalizeMathmlVariantsInHtml(
      render(String.raw`m=\max_j \ell_j`),
    );
    expect(maxOperator).toContain('m=\\max_j \\ell_j');
    expect(mathmlCompatibilityIssues('operator.html', maxOperator)).toEqual([]);
  });

  it('reports deprecated attributes and every fixed-arity mismatch', () => {
    expect(
      mathmlCompatibilityIssues(
        'deprecated.html',
        '<math><mi mathvariant="script">D</mi></math>',
      ),
    ).toEqual([
      expect.stringMatching(/unsupported mathvariant="script" on <mi>/),
    ]);
    expect(
      mathmlCompatibilityIssues(
        'misplaced-normal.html',
        '<math><mo mathvariant="normal">+</mo></math>',
      ),
    ).toEqual([
      expect.stringMatching(/only normal on <mi> is allowed/),
    ]);
    expect(
      mathmlCompatibilityIssues(
        'arity.html',
        '<math><mrow><msubsup><mi>x</mi><mn>1</mn></msubsup></mrow></math>',
      ),
    ).toEqual([
      expect.stringMatching(/<msubsup> with 2 element children; expected 3/),
    ]);
  });
});
