// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertTensorViewsDiagramLabels,
  parseTensorViewsTrace,
  tensorViewsDiagramId,
  type TensorViewsDiagramLabels,
} from '../src/lib/tensor-views-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch09-tensor-views/diagram-trace.txt'),
  'utf8',
);
const contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/09-tensor-views.md'),
  'utf8',
);
const component = readFileSync(
  resolve(repositoryRoot, 'site/src/components/chapters/TensorViewsDiagram.astro'),
  'utf8',
);

const englishLabels: TensorViewsDiagramLabels = {
  title: 'One owner, four metadata interpretations',
  description:
    'Compare shared reshape, transpose, and slice records, then follow the slice into materialized storage and inspect rejected requests.',
  sections: {
    storage: 'Start with one owned storage buffer',
    transforms: 'Compare equal shapes with different reading orders',
    slice: 'Follow source offsets into a materialized copy',
    errors: 'Keep incompatible operations explicit',
  },
  fields: {
    operation: 'Operation',
    storage: 'Storage owner',
    shape: 'Shape',
    strides: 'Element strides',
    base: 'Base offset',
    contiguous: 'Row-major contiguous',
    offsets: 'Logical source offsets',
    sourceOffsets: 'Copied from source offsets',
    values: 'Logical values',
    request: 'Request',
    sourceElements: 'Source elements',
    requestedElements: 'Requested elements',
    axisSize: 'Axis size',
    reason: 'Rejected because',
  },
  states: {
    yes: 'Yes',
    no: 'No',
    shared: 'Shared base storage',
    materialized: 'New materialized storage',
    rejected: 'Rejected operation',
  },
  operations: {
    identity: 'Identity view',
    reshape: 'Reshape',
    transpose: 'Transpose',
    slice: 'Slice',
    materialized: 'Materialized slice',
  },
  reasons: {
    count: 'The requested shape has a different element count.',
    contiguity: 'The transpose is not row-major contiguous; materialize before reshaping.',
    bounds: 'The half-open slice end exceeds the selected axis size.',
  },
  notes: {
    storage:
      'The base owner keeps one flat Rust buffer. Every shared view below points back to that storage.',
    transforms:
      'Compare the recorded shapes, strides, and source-offset sequences: matching shapes need not imply matching logical order.',
    slice:
      'Follow the recorded source offsets across the copy boundary into the materialized view\'s fresh offsets.',
    errors: 'Each failure is recorded by the Rust example, not calculated by the visualization.',
  },
  symbols: { shared: '◇ shared', materialized: '◆ copied', rejected: '× rejected' },
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
  source: TensorViewsDiagramLabels,
  path: readonly string[],
): TensorViewsDiagramLabels {
  const copy = structuredClone(source) as unknown as Record<string, unknown>;
  let cursor = copy;
  for (const key of path.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>;
  cursor[path.at(-1)!] = '   ';
  return copy as unknown as TensorViewsDiagramLabels;
}

describe('Chapter 9 tensor-views Rust trace', () => {
  it('projects the exact owned storage and five Rust view records', () => {
    const trace = parseTensorViewsTrace(fixture);

    expect(tensorViewsDiagramId).toBe('tensor-views');
    expect(trace.storage.base.map(({ lexeme }) => lexeme)).toEqual([
      '10.0', '11.0', '12.0', '20.0', '21.0', '22.0',
    ]);
    expect(trace.views.base).toMatchObject({
      id: 'base',
      operation: 'identity',
      storage: 'base',
      contiguous: true,
      contiguousLexeme: 'yes',
    });
    expect(trace.views.reshape.shape.map(({ value }) => value)).toEqual([3, 2]);
    expect(trace.views.reshape.strides.map(({ value }) => value)).toEqual([2, 1]);
    expect(trace.views.reshape.offsets.map(({ value }) => value)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(trace.views.transpose).toMatchObject({
      id: 'transpose',
      storage: 'base',
      contiguous: false,
    });
    expect(trace.views.transpose.axes?.map(({ value }) => value)).toEqual([0, 1]);
    expect(trace.views.transpose.strides.map(({ value }) => value)).toEqual([1, 3]);
    expect(trace.views.transpose.offsets.map(({ value }) => value)).toEqual([0, 3, 1, 4, 2, 5]);
    expect(trace.views.transpose.values.map(({ value }) => value)).toEqual([10, 20, 11, 21, 12, 22]);
  });

  it('preserves slice provenance across the explicit materialization boundary', () => {
    const trace = parseTensorViewsTrace(fixture);

    expect(trace.views.slice.slice).toEqual({
      axis: { lexeme: '1', value: 1 },
      start: { lexeme: '1', value: 1 },
      end: { lexeme: '3', value: 3 },
    });
    expect(trace.views.slice.baseOffset).toEqual({ lexeme: '1', value: 1 });
    expect(trace.views.slice.offsets.map(({ value }) => value)).toEqual([1, 2, 4, 5]);
    expect(trace.views.materialized).toMatchObject({
      storage: 'materialized',
      contiguous: true,
      baseOffset: { lexeme: '0', value: 0 },
    });
    expect(trace.views.materialized.offsets.map(({ value }) => value)).toEqual([0, 1, 2, 3]);
    expect(trace.views.materialized.sourceOffsets?.map(({ value }) => value)).toEqual([1, 2, 4, 5]);
    expect(trace.storage.materialized.map(({ value }) => value)).toEqual([11, 12, 21, 22]);
  });

  it('projects all three typed Rust rejection records in order', () => {
    const trace = parseTensorViewsTrace(fixture);

    expect(trace.errors).toEqual([
      {
        kind: 'element-count-mismatch',
        source: 'base',
        requestedShape: [
          { lexeme: '4', value: 4 },
          { lexeme: '2', value: 2 },
        ],
        sourceElements: { lexeme: '6', value: 6 },
        requestedElements: { lexeme: '8', value: 8 },
      },
      {
        kind: 'non-row-major-contiguous',
        source: 'transpose',
        requestedShape: [
          { lexeme: '2', value: 2 },
          { lexeme: '3', value: 3 },
        ],
      },
      {
        kind: 'out-of-bounds',
        source: 'base',
        axis: { lexeme: '1', value: 1 },
        start: { lexeme: '1', value: 1 },
        end: { lexeme: '4', value: 4 },
        size: { lexeme: '3', value: 3 },
      },
    ]);
  });

  it('keeps the checked fixture embedded verbatim in the chapter contract', () => {
    expect(contract).toContain(fixture.trimEnd());
    expect(contract).toContain('cargo run --quiet --locked -p ch09-tensor-views --example ch09-tensor-views-trace');
  });

  it.each([
    ['CR line ending', fixture.replace(/\n/g, '\r\n')],
    ['missing terminal newline', fixture.slice(0, -1)],
    ['double terminal newline', `${fixture}\n`],
    ['altered begin marker', mutate('TRACE tensor-views-v1 BEGIN', 'TRACE tensor-views-v2 BEGIN')],
    ['altered end marker', mutate('TRACE tensor-views-v1 END', 'TRACE tensor-views-v2 END')],
    ['extra record', fixture.replace('TRACE tensor-views-v1 END', 'VIEW extra=true\nTRACE tensor-views-v1 END')],
    ['reordered field', mutate('id=base ownership=owned', 'ownership=owned id=base')],
    ['wrong fixed ID', mutate('VIEW id=reshape', 'VIEW id=reshaped')],
    ['wrong operation', mutate('id=transpose operation=transpose', 'id=transpose operation=reshape')],
    ['wrong storage owner', mutate('id=slice operation=slice axis=1 start=1 end=3 storage=base', 'id=slice operation=slice axis=1 start=1 end=3 storage=other')],
    ['unsafe integer', mutate('requested-elements=8', 'requested-elements=9007199254740992')],
    ['leading-zero integer', mutate('requested-elements=8', 'requested-elements=08')],
    ['noncanonical decimal', mutate('STORAGE id=base ownership=owned values=10.0,11.0,12.0,20.0,21.0,22.0', 'STORAGE id=base ownership=owned values=10,11.0,12.0,20.0,21.0,22.0')],
    ['invalid contiguity flag', mutate('row-major-contiguous=no offsets=0,3,1,4,2,5', 'row-major-contiguous=maybe offsets=0,3,1,4,2,5')],
    ['shape/stride arity mismatch', mutate('shape=3,2 strides=2,1', 'shape=3,2 strides=2')],
    ['offset/value arity mismatch', mutate('offsets=0,3,1,4,2,5 values=10.0,20.0,11.0,21.0,12.0,22.0', 'offsets=0,3,1,4,2 values=10.0,20.0,11.0,21.0,12.0,22.0')],
    ['transpose axes arity drift', mutate('operation=transpose axes=0,1 storage=base', 'operation=transpose axes=0 storage=base')],
    ['transpose axes value drift', mutate('operation=transpose axes=0,1 storage=base', 'operation=transpose axes=1,0 storage=base')],
    ['slice request drift', mutate('operation=slice axis=1 start=1 end=3 storage=base', 'operation=slice axis=1 start=0 end=3 storage=base')],
    ['reshape shape drift', mutate('id=reshape operation=reshape storage=base shape=3,2', 'id=reshape operation=reshape storage=base shape=2,3')],
    ['reshape base-offset drift', mutate('shape=3,2 strides=2,1 base=0 row-major-contiguous=yes', 'shape=3,2 strides=2,1 base=1 row-major-contiguous=yes')],
    ['reshape offset drift', mutate('row-major-contiguous=yes offsets=0,1,2,3,4,5 values=10.0,11.0,12.0,20.0,21.0,22.0\nVIEW id=transpose', 'row-major-contiguous=yes offsets=0,1,2,3,5,4 values=10.0,11.0,12.0,20.0,21.0,22.0\nVIEW id=transpose')],
    ['reshape value drift', mutate('row-major-contiguous=yes offsets=0,1,2,3,4,5 values=10.0,11.0,12.0,20.0,21.0,22.0\nVIEW id=transpose', 'row-major-contiguous=yes offsets=0,1,2,3,4,5 values=10.0,11.0,12.0,20.0,21.0,23.0\nVIEW id=transpose')],
    ['base storage drift', mutate('STORAGE id=base ownership=owned values=10.0', 'STORAGE id=base ownership=owned values=9.0')],
    ['materialized value drift', mutate('STORAGE id=materialized ownership=owned source=slice values=11.0', 'STORAGE id=materialized ownership=owned source=slice values=10.0')],
    ['source-offset drift', mutate('source-offsets=1,2,4,5', 'source-offsets=1,2,3,5')],
  ])('rejects %s', (_label, invalid) => {
    expect(() => parseTensorViewsTrace(invalid)).toThrow();
  });
});

describe('Chapter 9 diagram labels and static component contract', () => {
  it('accepts the complete English label tree', () => {
    expect(() => assertTensorViewsDiagramLabels(englishLabels)).not.toThrow();
  });

  it.each(stringLeafPaths(englishLabels))('rejects a blank label at %s', (...path) => {
    expect(() => assertTensorViewsDiagramLabels(blankLabelAt(englishLabels, path))).toThrow(
      path.join('.'),
    );
  });

  it('rejects a missing nested label', () => {
    const incomplete = structuredClone(englishLabels) as unknown as Record<string, unknown>;
    delete (incomplete.fields as Record<string, unknown>).sourceOffsets;
    expect(() =>
      assertTensorViewsDiagramLabels(incomplete as unknown as TensorViewsDiagramLabels),
    ).toThrow('labels.fields.sourceOffsets');
  });

  it('reads the Rust fixture at build time and emits no client hydration', () => {
    expect(component).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(component).toContain("../../../../rust/demos/ch09-tensor-views/diagram-trace.txt");
    expect(component).toContain('parseTensorViewsTrace');
    expect(component).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(component).not.toContain('<script');
  });

  it('renders operation metadata and offsets from parsed Rust records', () => {
    expect(component).toContain('offset: trace.views.base.offsets[index]!');
    expect(component).toContain('copiedOffset: trace.views.materialized.offsets[index]!');
    expect(component).toContain('{tuple(view.axes)}');
    expect(component).toContain('{view.slice.axis.lexeme}: {view.slice.start.lexeme}..{view.slice.end.lexeme}');
    expect(component).not.toContain('trace.storage.base.map((value, offset)');
    expect(component).not.toContain('sourceOffsets?.map((sourceOffset, copiedOffset)');
  });

  it('keeps shared, materialized, and rejected states semantic and non-color-only', () => {
    expect(component).toContain('data-storage-id={view.storage}');
    expect(component).toContain('data-error-kind={trace.errors[0].kind}');
    expect(component).toContain("view.storage === 'base' ? '◇' : '◆'");
    expect(component).toContain('<span class="state-symbol" aria-hidden="true">×</span>');
    expect(component).toContain('.view-card.shared { border-style: solid; }');
    expect(component).toContain('.view-card.materialized { border-style: double;');
    expect(component).toContain('.error-card { border-style: dashed; }');
    expect(component).toContain('@media (forced-colors: active)');
  });

  it('makes the figure and intentional horizontal scrollers keyboard reachable', () => {
    expect(component).toContain('data-visualization-id={tensorViewsDiagramId}');
    expect(component).toContain('class="tensor-views-diagram"');
    expect(component).toContain('class="buffer-scroll"');
    expect(component).toContain('class="provenance-scroll"');
    expect(component.match(/tabindex="0"/g)).toHaveLength(3);
    expect(component.match(/role="region"/g)).toHaveLength(2);
    expect(component).toContain('overflow-x: auto;');
    expect(component).toContain('contain: paint;');
  });
});
