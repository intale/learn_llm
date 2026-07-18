export const textUnitsDiagramId = 'text-units-pipeline';

export const textUnitsExampleIds = ['ascii', 'cyrillic'] as const;
export type TextUnitsExampleId = (typeof textUnitsExampleIds)[number];

export interface TextUnit {
  value: string;
  bytes: readonly number[];
  scalar: string;
  tokenId: number;
}

export interface TextUnitsExample {
  id: TextUnitsExampleId;
  input: string;
  units: readonly TextUnit[];
}

export interface TextUnitsDiagramLabels {
  title: string;
  description: string;
  pipelineLabel: string;
  examples: Readonly<Record<TextUnitsExampleId, string>>;
  stages: Readonly<{
    input: string;
    bytes: string;
    scalars: string;
    tokenIds: string;
  }>;
  byteCount: Readonly<{
    one: string;
    many: string;
  }>;
}

export const textUnitsExamples = [
  {
    id: 'ascii',
    input: 'cat',
    units: [
      { value: 'c', bytes: [99], scalar: 'U+0063', tokenId: 3 },
      { value: 'a', bytes: [97], scalar: 'U+0061', tokenId: 2 },
      { value: 't', bytes: [116], scalar: 'U+0074', tokenId: 4 },
    ],
  },
  {
    id: 'cyrillic',
    input: 'кот',
    units: [
      { value: 'к', bytes: [208, 186], scalar: 'U+043A', tokenId: 5 },
      { value: 'о', bytes: [208, 190], scalar: 'U+043E', tokenId: 6 },
      { value: 'т', bytes: [209, 130], scalar: 'U+0442', tokenId: 7 },
    ],
  },
] as const satisfies readonly TextUnitsExample[];

const countPlaceholder = '{count}';

export function formatByteCount(
  templates: TextUnitsDiagramLabels['byteCount'],
  count: number,
): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('Byte count must be a positive integer.');
  }

  const template = count === 1 ? templates.one : templates.many;
  if (!template.includes(countPlaceholder)) {
    throw new Error('Byte-count labels must contain the {count} placeholder.');
  }
  return template.replaceAll(countPlaceholder, String(count));
}

export function assertTextUnitsDiagramLabels(labels: TextUnitsDiagramLabels): void {
  const required = [
    ['title', labels.title],
    ['description', labels.description],
    ['pipelineLabel', labels.pipelineLabel],
    ['examples.ascii', labels.examples.ascii],
    ['examples.cyrillic', labels.examples.cyrillic],
    ['stages.input', labels.stages.input],
    ['stages.bytes', labels.stages.bytes],
    ['stages.scalars', labels.stages.scalars],
    ['stages.tokenIds', labels.stages.tokenIds],
    ['byteCount.one', labels.byteCount.one],
    ['byteCount.many', labels.byteCount.many],
  ] as const;

  const missing = required
    .filter(([, value]) => value.trim().length === 0)
    .map(([path]) => path);
  if (missing.length > 0) {
    throw new Error(`Text-units diagram labels must not be empty: ${missing.join(', ')}`);
  }

  formatByteCount(labels.byteCount, 1);
  formatByteCount(labels.byteCount, 2);
}
