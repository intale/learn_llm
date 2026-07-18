export const corpusPartitionsDiagramId = 'corpus-partitions';

export const corpusPartitionRoles = ['train', 'validation', 'test'] as const;
export type CorpusPartitionRole = (typeof corpusPartitionRoles)[number];

export interface CorpusDocumentMetadata {
  id: string;
  language: string;
  provenanceGroup: string;
}

export interface CorpusPartitionDiagramData {
  role: CorpusPartitionRole;
  badge: 'TR' | 'VA' | 'TE';
  documents: readonly CorpusDocumentMetadata[];
}

export interface CorpusPartitionsDiagramLabels {
  title: string;
  description: string;
  partitionListLabel: string;
  roles: Readonly<
    Record<
      CorpusPartitionRole,
      Readonly<{
        title: string;
        purpose: string;
        documentListLabel: string;
      }>
    >
  >;
  fields: Readonly<{
    documents: string;
    wholeDocument: string;
    documentId: string;
    language: string;
    provenanceGroup: string;
  }>;
  summary: Readonly<{
    assignedDocuments: string;
    repeatedIds: string;
  }>;
  invariantsLabel: string;
  invariants: Readonly<{
    complete: string;
    disjoint: string;
    provenance: string;
  }>;
}

interface SplitManifestShape {
  schema_version: number;
  corpus_checksum: string;
  strategy: string;
  train: string[];
  validation: string[];
  test: string[];
}

const manifestKeys = [
  'schema_version',
  'corpus_checksum',
  'strategy',
  ...corpusPartitionRoles,
] as const;
const roleBadges = { train: 'TR', validation: 'VA', test: 'TE' } as const;
const identifierPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const documentHeaderPattern =
  /^%% document ([a-z][a-z0-9]*(?:-[a-z0-9]+)*) ([a-z][a-z0-9]*(?:-[a-z0-9]+)*) ([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseManifest(value: unknown): SplitManifestShape {
  if (!isRecord(value)) {
    throw new Error('Corpus split manifest must be a JSON object.');
  }

  const allowedKeys = new Set<string>(manifestKeys);
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`Corpus split manifest has unknown role or field: ${unknownKeys.join(', ')}.`);
  }
  const missingKeys = manifestKeys.filter((key) => !(key in value));
  if (missingKeys.length > 0) {
    throw new Error(`Corpus split manifest is missing: ${missingKeys.join(', ')}.`);
  }
  if (value.schema_version !== 1) {
    throw new Error('Corpus split manifest schema_version must be 1.');
  }
  if (
    typeof value.corpus_checksum !== 'string' ||
    !/^fnv1a64:[0-9a-f]{16}$/.test(value.corpus_checksum)
  ) {
    throw new Error('Corpus split manifest checksum is malformed.');
  }
  if (value.strategy !== 'fixed-paired-document-holdout-v1') {
    throw new Error('Corpus split manifest strategy is unsupported.');
  }

  for (const role of corpusPartitionRoles) {
    const ids = value[role];
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => typeof id !== 'string' || !identifierPattern.test(id))
    ) {
      throw new Error(`${role} must be a nonempty array of document IDs.`);
    }
  }

  return value as unknown as SplitManifestShape;
}

export function parseCorpusDocumentMetadata(
  source: string,
): readonly CorpusDocumentMetadata[] {
  const documents: CorpusDocumentMetadata[] = [];
  let openDocument = false;

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const header = line.match(documentHeaderPattern);
    if (header) {
      if (openDocument) {
        throw new Error(`Nested corpus document marker at line ${index + 1}.`);
      }
      const [, id, language, provenanceGroup] = header;
      if (documents.some((document) => document.id === id)) {
        throw new Error(`Duplicate corpus document ID ${id}.`);
      }
      documents.push({ id, language, provenanceGroup });
      openDocument = true;
    } else if (line === '%% end') {
      if (!openDocument) {
        throw new Error(`Unmatched corpus end marker at line ${index + 1}.`);
      }
      openDocument = false;
    } else if (!openDocument && line.trim().length > 0) {
      throw new Error(`Corpus text outside a document at line ${index + 1}.`);
    }
  }

  if (openDocument) throw new Error('Corpus ends inside a document.');
  if (documents.length === 0) throw new Error('Corpus contains no documents.');
  return documents;
}

export function fnv1a64(source: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(source)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

export function createCorpusPartitionsDiagramData(
  manifestValue: unknown,
  corpusSource: string,
): readonly CorpusPartitionDiagramData[] {
  const manifest = parseManifest(manifestValue);
  const corpusDocuments = parseCorpusDocumentMetadata(corpusSource);
  const checksum = fnv1a64(corpusSource);
  if (manifest.corpus_checksum !== checksum) {
    throw new Error(
      `Corpus split checksum mismatch: manifest=${manifest.corpus_checksum}, actual=${checksum}.`,
    );
  }

  const documentById = new Map(
    corpusDocuments.map((document) => [document.id, document] as const),
  );
  const sourcePosition = new Map(
    corpusDocuments.map((document, index) => [document.id, index] as const),
  );
  const seen = new Set<string>();
  const assignedRole = new Map<string, CorpusPartitionRole>();

  const partitions = corpusPartitionRoles.map((role) => {
    const documents = manifest[role].map((id, index, ids) => {
      const document = documentById.get(id);
      if (!document) throw new Error(`${role} contains unknown document ${id}.`);
      if (seen.has(id)) throw new Error(`Document ${id} is assigned more than once.`);
      if (
        index > 0 &&
        (sourcePosition.get(ids[index - 1]) ?? Number.MAX_SAFE_INTEGER) >=
          (sourcePosition.get(id) ?? -1)
      ) {
        throw new Error(`${role} does not preserve corpus source order.`);
      }
      seen.add(id);
      assignedRole.set(id, role);
      return document;
    });
    return { role, badge: roleBadges[role], documents };
  });

  const missing = corpusDocuments.find((document) => !seen.has(document.id));
  if (missing) throw new Error(`Manifest omits corpus document ${missing.id}.`);

  for (const document of corpusDocuments) {
    const related = corpusDocuments.find(
      (candidate) =>
        candidate.provenanceGroup === document.provenanceGroup &&
        assignedRole.get(candidate.id) !== assignedRole.get(document.id),
    );
    if (related) {
      throw new Error(`Provenance group ${document.provenanceGroup} crosses roles.`);
    }
  }

  return partitions;
}

export function assertCorpusPartitionsDiagramLabels(
  labels: CorpusPartitionsDiagramLabels,
): void {
  const required: readonly (readonly [string, string])[] = [
    ['title', labels.title],
    ['description', labels.description],
    ['partitionListLabel', labels.partitionListLabel],
    ...corpusPartitionRoles.flatMap((role) => [
      [`roles.${role}.title`, labels.roles[role].title] as const,
      [`roles.${role}.purpose`, labels.roles[role].purpose] as const,
      [
        `roles.${role}.documentListLabel`,
        labels.roles[role].documentListLabel,
      ] as const,
    ]),
    ...Object.entries(labels.fields).map(
      ([key, value]) => [`fields.${key}`, value] as const,
    ),
    ...Object.entries(labels.summary).map(
      ([key, value]) => [`summary.${key}`, value] as const,
    ),
    ['invariantsLabel', labels.invariantsLabel],
    ...Object.entries(labels.invariants).map(
      ([key, value]) => [`invariants.${key}`, value] as const,
    ),
  ];
  const missing = required
    .filter(([, value]) => value.trim().length === 0)
    .map(([path]) => path);
  if (missing.length > 0) {
    throw new Error(
      `Corpus-partitions diagram labels must not be empty: ${missing.join(', ')}.`,
    );
  }
}
