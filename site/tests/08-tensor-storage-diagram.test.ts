// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertTensorStorageDiagramLabels,
  parseTensorStorageTrace,
  tensorStorageDiagramId,
  type TensorStorageDiagramLabels,
} from '../src/lib/tensor-storage-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch08-tensor-storage/diagram-trace.txt'),
  'utf8',
);
const contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/08-tensor-storage.md'),
  'utf8',
);

const englishLabels: TensorStorageDiagramLabels = {
  title: 'One coordinate, one row-major offset',
  description:
    'Two 2 × 3 slices and one flat buffer come from the same Rust fixture. Follow [1, 0, 2] through its three stride contributions, then compare the checked out-of-bounds coordinate.',
  summary: { shape: 'Shape', strides: 'Row-major strides', length: 'Stored values' },
  sections: {
    slices: 'Two slices from one rank-3 tensor',
    calculation: 'Turn [1, 0, 2] into offset 8',
    buffer: 'Find offset 8 in the flat buffer',
    bounds: 'Reject an invalid coordinate before access',
  },
  fields: {
    slice: 'Slice',
    row: 'Row',
    coordinate: 'Coordinate',
    contribution: 'Contribution',
    offset: 'Offset',
    value: 'Value',
    axis: 'Axis',
    index: 'Index',
    size: 'Axis size',
  },
  notes: {
    slices:
      'The first coordinate chooses a slice; the next two choose a row and column inside it.',
    calculation:
      'Each term is printed by the Rust trace; their sum names a position in the flat buffer, not the stored value.',
    buffer: 'The double border and diamond mark offset 8 without relying on color.',
    bounds: 'Axis 1 has size 2, so index 2 is rejected before any buffer access.',
  },
  symbols: { selected: 'Selected coordinate and buffer element' },
};

function mutate(search: string, replacement: string): string {
  const first = fixture.indexOf(search);
  if (first === -1 || fixture.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Mutation anchor must occur exactly once: ${search}`);
  }
  return fixture.replace(search, replacement);
}

function stringLeafPaths(value: object, prefix: readonly string[] = []): string[][] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = [...prefix, key];
    return typeof child === 'string' ? [path] : stringLeafPaths(child as object, path);
  });
}

function blankLabelAt(
  source: TensorStorageDiagramLabels,
  path: readonly string[],
): TensorStorageDiagramLabels {
  const copy = structuredClone(source) as unknown as Record<string, unknown>;
  let cursor = copy;
  for (const part of path.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>;
  cursor[path.at(-1) ?? ''] = '   ';
  return copy as unknown as TensorStorageDiagramLabels;
}

describe('tensor-storage Rust trace parser', () => {
  it('matches the contract and projects the complete exact Rust fixture', () => {
    expect(tensorStorageDiagramId).toBe('tensor-storage');
    expect(contract).toContain(`"id": "${tensorStorageDiagramId}"`);

    const trace = parseTensorStorageTrace(fixture);
    expect(trace.tensor.id).toBe('tiny');
    expect(trace.tensor.rank.lexeme).toBe('3');
    expect(trace.tensor.shape.map(({ lexeme }) => lexeme)).toEqual(['2', '2', '3']);
    expect(trace.tensor.strides.map(({ lexeme }) => lexeme)).toEqual(['6', '3', '1']);
    expect(trace.tensor.length.lexeme).toBe('12');
    expect(
      trace.slices.map((slice) => ({
        axis0: slice.axis0.lexeme,
        rows: slice.rows.map((row) => row.map(({ lexeme }) => lexeme)),
      })),
    ).toEqual([
      { axis0: '0', rows: [['10.0', '11.0', '12.0'], ['20.0', '21.0', '22.0']] },
      { axis0: '1', rows: [['30.0', '31.0', '32.0'], ['40.0', '41.0', '42.0']] },
    ]);
    expect(trace.buffer.map(({ lexeme }) => lexeme)).toEqual([
      '10.0', '11.0', '12.0', '20.0', '21.0', '22.0',
      '30.0', '31.0', '32.0', '40.0', '41.0', '42.0',
    ]);
    expect(trace.coordinate.map(({ lexeme }) => lexeme)).toEqual(['1', '0', '2']);
    expect(
      trace.terms.map((term) => ({
        axis: term.axis.lexeme,
        index: term.index.lexeme,
        stride: term.stride.lexeme,
        contribution: term.contribution.lexeme,
      })),
    ).toEqual([
      { axis: '0', index: '1', stride: '6', contribution: '6' },
      { axis: '1', index: '0', stride: '3', contribution: '0' },
      { axis: '2', index: '2', stride: '1', contribution: '2' },
    ]);
    expect({ offset: trace.lookup.offset.lexeme, value: trace.lookup.value.lexeme }).toEqual({
      offset: '8',
      value: '32.0',
    });
    expect({
      coordinate: trace.bounds.coordinate.map(({ lexeme }) => lexeme),
      status: trace.bounds.status,
      axis: trace.bounds.axis.lexeme,
      index: trace.bounds.index.lexeme,
      size: trace.bounds.size.lexeme,
    }).toEqual({
      coordinate: ['1', '2', '0'],
      status: 'out-of-bounds',
      axis: '1',
      index: '2',
      size: '2',
    });
  });

  it('requires exact LF framing, record count, order, and field spelling', () => {
    expect(() => parseTensorStorageTrace(fixture.slice(0, -1))).toThrow(/exactly one LF/);
    expect(() => parseTensorStorageTrace(`${fixture}\n`)).toThrow(/exactly one LF/);
    expect(() => parseTensorStorageTrace(fixture.replaceAll('\n', '\r\n'))).toThrow(/LF line endings/);
    expect(() => parseTensorStorageTrace(mutate('TRACE tensor-storage-v1 BEGIN', 'TRACE tensor-storage-v2 BEGIN'))).toThrow(/ordered 12-line block/);
    expect(() => parseTensorStorageTrace(mutate('BUFFER values=', 'VALUES buffer='))).toThrow(/line 5/);
    expect(() => parseTensorStorageTrace(mutate('COORDINATE indices=', 'UNKNOWN indices='))).toThrow(/line 6/);
    expect(() => parseTensorStorageTrace(mutate('TRACE tensor-storage-v1 END', 'EXTRA record\nTRACE tensor-storage-v1 END'))).toThrow(/ordered 12-line block/);
  });

  it('rejects malformed tensor identity, integer lexemes, arities, and slice order', () => {
    expect(() => parseTensorStorageTrace(mutate('id=tiny', 'id=other'))).toThrow(/id must be tiny/);
    expect(() => parseTensorStorageTrace(mutate('rank=3', 'rank=2'))).toThrow(/rank 3/);
    expect(() => parseTensorStorageTrace(mutate('shape=2,2,3', 'shape=2,3'))).toThrow(/shape has arity 2/);
    expect(() => parseTensorStorageTrace(mutate('strides=6,3,1', 'strides=6,03,1'))).toThrow(/line 2/);
    expect(() => parseTensorStorageTrace(mutate('length=12', 'length=9007199254740992'))).toThrow(/safe nonnegative/);
    expect(() => parseTensorStorageTrace(mutate('SLICE axis0=1', 'SLICE axis0=2'))).toThrow(/expected SLICE axis0=1/);
    expect(() => parseTensorStorageTrace(mutate('row0=10.0,11.0,12.0', 'row0=10.0,11.0'))).toThrow(/row0 has arity 2/);
  });

  it('rejects malformed buffer, coordinate, term, lookup, and bounds records', () => {
    expect(() => parseTensorStorageTrace(mutate(',42.0\nCOORDINATE', '\nCOORDINATE'))).toThrow(/buffer has arity 11/);
    expect(() => parseTensorStorageTrace(mutate('indices=1,0,2', 'indices=1,0'))).toThrow(/coordinate has arity 2/);
    expect(() => parseTensorStorageTrace(mutate('TERM axis=1', 'TERM axis=2'))).toThrow(/expected TERM axis=1/);
    expect(() => parseTensorStorageTrace(mutate('LOOKUP offset=8 value=32.0', 'LOOKUP offset=8 value=32'))).toThrow(/line 10/);
    expect(() => parseTensorStorageTrace(mutate('status=out-of-bounds', 'status=ok'))).toThrow(/line 11/);
    expect(() => parseTensorStorageTrace(mutate('coordinate=1,2,0 status=', 'coordinate=1,2 status='))).toThrow(/bounds coordinate has arity 2/);
  });

  it('projects grammar-valid Rust fields without recomputing their relationships', () => {
    const changed = mutate('contribution=6', 'contribution=7')
      .replace('LOOKUP offset=8 value=32.0', 'LOOKUP offset=9 value=31.0');
    const trace = parseTensorStorageTrace(changed);
    expect(trace.terms[0].contribution.lexeme).toBe('7');
    expect(trace.lookup.offset.lexeme).toBe('9');
    expect(trace.lookup.value.lexeme).toBe('31.0');
  });

  it('requires every locale-owned visible and accessible label leaf', () => {
    expect(() => assertTensorStorageDiagramLabels(englishLabels)).not.toThrow();
    const paths = stringLeafPaths(englishLabels);
    expect(paths).toHaveLength(23);
    for (const path of paths) {
      expect(() => assertTensorStorageDiagramLabels(blankLabelAt(englishLabels, path))).toThrow(
        path.join('.'),
      );
    }

    const missing = structuredClone(englishLabels) as unknown as Record<string, unknown>;
    delete (missing.fields as Record<string, unknown>).offset;
    expect(() =>
      assertTensorStorageDiagramLabels(missing as unknown as TensorStorageDiagramLabels),
    ).toThrow(/labels\.fields\.offset is missing/);
  });
});

describe('tensor-storage diagram component contract', () => {
  it('stays Rust-backed, semantic, static, responsive, and non-color dependent', () => {
    const componentSource = readFileSync(
      resolve(process.cwd(), 'src/components/chapters/TensorStorageDiagram.astro'),
      'utf8',
    );
    const parserSource = readFileSync(
      resolve(process.cwd(), 'src/lib/tensor-storage-diagram.ts'),
      'utf8',
    );

    expect(componentSource).toContain('<figure');
    expect(componentSource).toContain('<figcaption>');
    expect(componentSource).toContain('<table>');
    expect(componentSource).toContain('<ol class="term-list"');
    expect(componentSource).toContain('<ol class="flat-buffer"');
    expect(componentSource).toContain('data-slice-axis0={slice.axis0.lexeme}');
    expect(componentSource).toContain('data-term-axis={term.axis.lexeme}');
    expect(componentSource).toContain('data-buffer-offset={offset}');
    expect(componentSource).toContain("data-status={trace.bounds.status}");
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('aria-labelledby={titleId}');
    expect(componentSource).toContain('aria-describedby={descriptionId}');
    expect(componentSource).toContain('dir="ltr"');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toContain("border: 0.2rem double currentColor");
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('<span class="selection-marker" aria-hidden="true">◆</span>');
    expect(componentSource).toContain('@media (max-width: 48rem)');
    expect(componentSource).toContain('@media (forced-colors: active)');
    expect(componentSource).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(componentSource).toContain('parseTensorStorageTrace');
    for (const source of [componentSource, parserSource]) {
      expect(source).not.toContain('Math.');
      expect(source).not.toContain('.reduce(');
      expect(source).not.toContain('fetch(');
      expect(source).not.toContain('Math.random');
      expect(source).not.toContain('<script');
      expect(source).not.toContain('client:');
    }
    expect(componentSource).not.toContain(englishLabels.title);
    expect(componentSource).not.toContain(englishLabels.sections.bounds);
  });
});
