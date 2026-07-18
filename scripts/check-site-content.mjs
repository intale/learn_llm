#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

export const SUPPORTED_LOCALES = Object.freeze(['en', 'ru']);

export const REQUIRED_CHAPTER_SECTIONS = Object.freeze([
  'worked-example',
  'formula',
  'symbol-glossary',
  'history',
  'rust-implementation',
  'visualization',
  'exercises',
  'decoder-connection',
]);

const CHAPTER_ID_PATTERN = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONCEPT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const REGION_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const LATEX_PROSE_PATTERN =
  /\\(?:hbox|mbox|vbox|text(?:bf|it|normal|rm|sf|tt|up)?)\s*\{/;
const RUST_SOURCE_PATTERN =
  /^rust\/(?:crates\/llm-from-scratch|demos\/[a-z0-9][a-z0-9-]*)\/src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.rs$/;

export class ContentValidationError extends Error {
  constructor(issues, heading = 'Content validation failed') {
    super(heading + ':\n- ' + issues.join('\n- '));
    this.name = 'ContentValidationError';
    this.issues = issues;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function addTextIssue(issues, value, field, sourceName) {
  if (!hasText(value)) {
    issues.push(sourceName + ': ' + field + ' must be a non-empty string');
  }
}

function normalizedRelativePath(value) {
  return typeof value === 'string' ? value.replaceAll('\\', '/') : '';
}

export function isAllowedRustSourcePath(value) {
  if (!hasText(value)) {
    return false;
  }

  const normalized = normalizedRelativePath(value);
  return (
    normalized === value &&
    !nodePath.posix.isAbsolute(normalized) &&
    !normalized.split('/').includes('..') &&
    RUST_SOURCE_PATTERN.test(normalized)
  );
}

export function extractRustRegion(source, region, sourceName = 'Rust source') {
  if (!REGION_PATTERN.test(region)) {
    throw new ContentValidationError([
      sourceName + ': region "' + region + '" must be a lowercase kebab-case identifier',
    ]);
  }

  const lines = source.split(/\r?\n/);
  const startMarker = '// region:' + region;
  const endMarker = '// endregion:' + region;
  const starts = [];
  const ends = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === startMarker) starts.push(index);
    if (trimmed === endMarker) ends.push(index);
  });

  if (starts.length !== 1 || ends.length !== 1 || starts[0] >= ends[0]) {
    throw new ContentValidationError([
      sourceName + ': expected one ordered ' + startMarker + ' / ' + endMarker + ' pair',
    ]);
  }

  return lines.slice(starts[0] + 1, ends[0]).join('\n');
}

export function parseJsonFrontmatter(source, sourceName = 'document') {
  const normalized = source.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    throw new ContentValidationError([
      sourceName +
        ': expected JSON-shaped YAML frontmatter between opening and closing --- lines',
    ]);
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (error) {
    throw new ContentValidationError([
      sourceName +
        ': frontmatter must be valid JSON (which is also valid YAML): ' +
        error.message,
    ]);
  }

  if (!isObject(data)) {
    throw new ContentValidationError([sourceName + ': frontmatter root must be an object']);
  }

  return {
    data,
    body: normalized.slice(match[0].length),
  };
}

export function extractChapterSectionMarkers(body) {
  return [...body.matchAll(/\{\/\*\s*chapter-section:([a-z-]+)\s*\*\/\}/g)].map(
    (match) => match[1],
  );
}

function maskMdxRange(value) {
  return value.replace(/[^\n]/g, ' ');
}

function maskCodeBlocks(source) {
  const parts = source.split(/(\r?\n)/);
  let fence = null;

  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index];
    if (fence) {
      const closingCharacter = fence.character === '~' ? '~' : '\\x60';
      const closing = new RegExp(
        '^[ \\t]{0,3}' +
          closingCharacter +
          '{' +
          fence.length +
          ',}[ \\t]*$',
      );
      parts[index] = maskMdxRange(line);
      if (closing.test(line)) fence = null;
      continue;
    }

    const opening = line.match(/^[ \t]{0,3}([\x60~])\1{2,}/);
    if (opening) {
      const run = opening[0].trimStart();
      fence = { character: opening[1], length: run.length };
      parts[index] = maskMdxRange(line);
      continue;
    }

    if (/^(?: {4}|\t)/.test(line)) {
      parts[index] = maskMdxRange(line);
    }
  }

  return parts.join('');
}

export function renderableMdxSource(source) {
  const backtick = String.fromCharCode(96);
  const inlineCode = new RegExp(
    '(' + backtick + '+)([^\\n]*?)\\1',
    'g',
  );

  return maskCodeBlocks(source)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, maskMdxRange)
    .replace(/<!--[\s\S]*?-->/g, maskMdxRange)
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, maskMdxRange)
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, maskMdxRange)
    .replace(inlineCode, maskMdxRange);
}

function sliceChapterSections(body) {
  const matches = [...body.matchAll(
    /\{\/\*\s*chapter-section:([a-z-]+)\s*\*\/\}/g,
  )];
  const sections = new Map();
  matches.forEach((match, index) => {
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
    sections.set(match[1], body.slice(match.index + match[0].length, end));
  });
  return sections;
}

function visibleSectionEvidence(section) {
  return section
    .replace(/^\s*##[^\n]*$/m, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\`*_#|[\]{}$\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedFormula(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function validateChapterSections(data, body, issues, sourceName) {
  const sections = sliceChapterSections(body);
  for (const name of REQUIRED_CHAPTER_SECTIONS) {
    const section = sections.get(name) ?? '';
    if (!/^\s*##\s+\S/m.test(section)) {
      issues.push(sourceName + ': ' + name + ' section must start with a level-two heading');
    }
    if (visibleSectionEvidence(section).length < 40) {
      issues.push(sourceName + ': ' + name + ' section lacks meaningful teaching evidence');
    }
  }

  const formulaSection = renderableMdxSource(sections.get('formula') ?? '');
  const displayedFormulae = [...formulaSection.matchAll(/\$\$\s*([\s\S]*?)\s*\$\$/g)].map(
    (match) => normalizedFormula(match[1]),
  );
  if (!displayedFormulae.includes(normalizedFormula(data.formula?.latex))) {
    issues.push(
      sourceName + ': formula section must display formula.latex exactly once as notation',
    );
  } else if (
    displayedFormulae.filter(
      (formula) => formula === normalizedFormula(data.formula?.latex),
    ).length !== 1
  ) {
    issues.push(sourceName + ': formula section must display formula.latex exactly once');
  }

  const rustSection = renderableMdxSource(
    sections.get('rust-implementation') ?? '',
  );
  if (extractRustSourceReferences(rustSection).length === 0) {
    issues.push(sourceName + ': rust-implementation section must contain <RustSource> evidence');
  }

  const visualizationSection = renderableMdxSource(
    sections.get('visualization') ?? '',
  );
  const diagramInvocation = /<[A-Z][A-Za-z0-9]*Diagram(?:\s|\/|>)/;
  if (data.visualization?.decision === 'useful' && !diagramInvocation.test(visualizationSection)) {
    issues.push(sourceName + ': useful visualization must be invoked inside its section');
  }
  if (
    data.visualization?.decision === 'not-useful' &&
    diagramInvocation.test(renderableMdxSource(body))
  ) {
    issues.push(sourceName + ': not-useful visualization must not invoke a diagram');
  }

  const exercises = renderableMdxSource(sections.get('exercises') ?? '');
  const answerStart = exercises.indexOf('<details');
  const predictionPrompts =
    answerStart === -1 ? exercises : exercises.slice(0, answerStart);
  const checkedAnswers = answerStart === -1 ? '' : exercises.slice(answerStart);
  const predictionCount = [...predictionPrompts.matchAll(/^\s*\d+\.\s+\S/gm)].length;
  if (!/^\s*1\.\s+\S/m.test(predictionPrompts)) {
    issues.push(sourceName + ': exercises section must contain a predict-first ordered list');
  }
  const answerBlock = checkedAnswers.match(
    /^<details\b[^>]*>\s*<summary\b[^>]*>\s*\S[\s\S]*?<\/summary>([\s\S]*?)<\/details>/,
  );
  if (!answerBlock) {
    issues.push(sourceName + ': exercises section must contain checked answers in <details>');
  } else {
    const answerCount = [...answerBlock[1].matchAll(/^\s*\d+\.\s+\S/gm)].length;
    if (
      visibleSectionEvidence(answerBlock[1]).length < 40 ||
      answerCount !== predictionCount
    ) {
      issues.push(
        sourceName +
          ': checked answers must contain one substantive ordered answer per prediction',
      );
    }
  }

  return sections;
}

function literalAttribute(tag, name) {
  const patterns = [
    new RegExp('\\b' + name + '\\s*=\\s*"([^"]*)"'),
    new RegExp("\\b" + name + "\\s*=\\s*'([^']*)'"),
    new RegExp('\\b' + name + '\\s*=\\s*\\{\\s*"([^"]*)"\\s*\\}'),
    new RegExp("\\b" + name + "\\s*=\\s*\\{\\s*'([^']*)'\\s*\\}"),
  ];

  for (const pattern of patterns) {
    const match = tag.match(pattern);
    if (match) return match[1];
  }

  return undefined;
}

export function extractRustSourceReferences(body) {
  return [...body.matchAll(/<RustSource\b[^>]*\/?\s*>/g)].map((match) => ({
    path: literalAttribute(match[0], 'path'),
    region: literalAttribute(match[0], 'region'),
    tag: match[0],
  }));
}

function validateFormula(formula, issues, sourceName) {
  if (!isObject(formula)) {
    issues.push(sourceName + ': formula must be an object');
    return;
  }

  addTextIssue(issues, formula.latex, 'formula.latex', sourceName);
  if (hasText(formula.latex) && LATEX_PROSE_PATTERN.test(formula.latex)) {
    issues.push(
      sourceName +
        ': formula.latex must contain notation only; put localized prose in the symbol glossary',
    );
  }
  if (!Array.isArray(formula.symbols) || formula.symbols.length === 0) {
    issues.push(sourceName + ': formula.symbols must contain at least one symbol');
    return;
  }

  const seen = new Set();
  formula.symbols.forEach((symbol, index) => {
    if (!isObject(symbol)) {
      issues.push(sourceName + ': formula.symbols[' + index + '] must be an object');
      return;
    }
    addTextIssue(
      issues,
      symbol.symbol,
      'formula.symbols[' + index + '].symbol',
      sourceName,
    );
    addTextIssue(
      issues,
      symbol.meaning,
      'formula.symbols[' + index + '].meaning',
      sourceName,
    );
    if (hasText(symbol.symbol) && seen.has(symbol.symbol)) {
      issues.push(sourceName + ': formula symbol "' + symbol.symbol + '" is duplicated');
    }
    seen.add(symbol.symbol);
  });
}

function validateRustSources(rustSources, issues, sourceName) {
  if (!Array.isArray(rustSources) || rustSources.length === 0) {
    issues.push(sourceName + ': rust_sources must contain at least one source declaration');
    return;
  }

  const seen = new Set();
  rustSources.forEach((source, index) => {
    if (!isObject(source)) {
      issues.push(sourceName + ': rust_sources[' + index + '] must be an object');
      return;
    }

    if (!isAllowedRustSourcePath(source.path)) {
      issues.push(
        sourceName +
          ': rust_sources[' +
          index +
          '].path must be a repository-relative .rs file under rust/crates/llm-from-scratch/src or rust/demos/<name>/src',
      );
    }
    if (source.region !== undefined && !REGION_PATTERN.test(source.region)) {
      issues.push(
        sourceName +
          ': rust_sources[' +
          index +
          '].region must be a lowercase kebab-case identifier',
      );
    }
    addTextIssue(
      issues,
      source.purpose,
      'rust_sources[' + index + '].purpose',
      sourceName,
    );

    const identity = (source.path ?? '') + '#' + (source.region ?? '');
    if (seen.has(identity)) {
      issues.push(sourceName + ': Rust source declaration "' + identity + '" is duplicated');
    }
    seen.add(identity);
  });
}

function validateVisualization(visualization, issues, sourceName) {
  if (!isObject(visualization)) {
    issues.push(sourceName + ': visualization must be an object');
    return;
  }

  if (!['useful', 'not-useful'].includes(visualization.decision)) {
    issues.push(
      sourceName + ': visualization.decision must be "useful" or "not-useful"',
    );
  }
  addTextIssue(
    issues,
    visualization.rationale,
    'visualization.rationale',
    sourceName,
  );

  if (visualization.decision === 'useful') {
    if (!hasText(visualization.id) || !CONCEPT_ID_PATTERN.test(visualization.id)) {
      issues.push(
        sourceName +
          ': a useful visualization requires a lowercase kebab-case visualization.id',
      );
    }
  }

  if (visualization.decision === 'not-useful' && visualization.id !== null) {
    issues.push(
      sourceName + ': a not-useful visualization must set visualization.id to null',
    );
  }
}

export function validateChapterMetadata(data, sourceName = 'chapter') {
  const issues = [];

  if (!hasText(data.chapter_id) || !CHAPTER_ID_PATTERN.test(data.chapter_id)) {
    issues.push(sourceName + ': chapter_id must match NN-lowercase-kebab-case');
  }
  if (!SUPPORTED_LOCALES.includes(data.locale)) {
    issues.push(sourceName + ': locale must be exactly "en" or "ru"');
  }
  if (!Number.isInteger(data.content_revision) || data.content_revision < 1) {
    issues.push(sourceName + ': content_revision must be a positive integer');
  }
  if (!Number.isInteger(data.order) || data.order < 1) {
    issues.push(sourceName + ': order must be a positive integer');
  }
  if (!hasText(data.concept_id) || !CONCEPT_ID_PATTERN.test(data.concept_id)) {
    issues.push(sourceName + ': concept_id must be lowercase kebab-case');
  }

  for (const field of [
    'title',
    'description',
    'objective',
    'worked_inputs',
    'decoder_connection',
  ]) {
    addTextIssue(issues, data[field], field, sourceName);
  }

  validateFormula(data.formula, issues, sourceName);

  if (!isObject(data.history)) {
    issues.push(sourceName + ': history must be an object');
  } else {
    addTextIssue(issues, data.history.approach, 'history.approach', sourceName);
    addTextIssue(issues, data.history.summary, 'history.summary', sourceName);
    if (!isAllowedRustSourcePath(data.history.rust_source)) {
      issues.push(sourceName + ': history.rust_source is not an allowed repository Rust path');
    }
  }

  validateRustSources(data.rust_sources, issues, sourceName);
  validateVisualization(data.visualization, issues, sourceName);

  if (
    isObject(data.history) &&
    Array.isArray(data.rust_sources) &&
    !data.rust_sources.some((source) => source?.path === data.history.rust_source)
  ) {
    issues.push(sourceName + ': history.rust_source must also appear in rust_sources');
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues);
  }

  return data;
}

function sourceIdentity(source) {
  return source.path + '#' + (source.region ?? '');
}

function validateFileLocation(data, filePath, issues) {
  const normalized = normalizedRelativePath(filePath);
  const match = normalized.match(/\/chapters\/(en|ru)\/([^/]+)\.mdx?$/);
  if (!match) {
    issues.push(filePath + ': chapter file must live under chapters/en or chapters/ru');
    return;
  }
  if (match[1] !== data.locale) {
    issues.push(
      filePath +
        ': directory locale ' +
        match[1] +
        ' does not match metadata locale ' +
        data.locale,
    );
  }
  if (match[2] !== data.chapter_id) {
    issues.push(
      filePath + ': filename must equal chapter_id "' + data.chapter_id + '"',
    );
  }
}

export function validateChapterDocument(
  source,
  {
    sourceName = 'chapter',
    filePath,
    repositoryRoot,
    checkSourceFiles = true,
  } = {},
) {
  const parsed = parseJsonFrontmatter(source, sourceName);
  validateChapterMetadata(parsed.data, sourceName);
  const issues = [];

  if (filePath) {
    validateFileLocation(parsed.data, filePath, issues);
  }

  const markers = extractChapterSectionMarkers(parsed.body);
  if (JSON.stringify(markers) !== JSON.stringify(REQUIRED_CHAPTER_SECTIONS)) {
    issues.push(
      sourceName +
        ': chapter section markers must appear exactly once in this order: ' +
        REQUIRED_CHAPTER_SECTIONS.join(', '),
    );
  }

  if (JSON.stringify(markers) === JSON.stringify(REQUIRED_CHAPTER_SECTIONS)) {
    validateChapterSections(parsed.data, parsed.body, issues, sourceName);
  }

  const references = extractRustSourceReferences(renderableMdxSource(parsed.body));
  if (references.length === 0) {
    issues.push(sourceName + ': body must include at least one <RustSource> component');
  }

  const declared = new Set(parsed.data.rust_sources.map(sourceIdentity));
  const rendered = new Set();
  references.forEach((reference) => {
    if (!reference.path) {
      issues.push(sourceName + ': every <RustSource> path must be a string literal');
      return;
    }
    if (!isAllowedRustSourcePath(reference.path)) {
      issues.push(
        sourceName +
          ': <RustSource> path "' +
          reference.path +
          '" is outside the Rust allowlist',
      );
    }
    if (reference.region !== undefined && !REGION_PATTERN.test(reference.region)) {
      issues.push(
        sourceName +
          ': <RustSource> region "' +
          reference.region +
          '" is not kebab-case',
      );
    }
    const identity = reference.path + '#' + (reference.region ?? '');
    rendered.add(identity);
    if (!declared.has(identity)) {
      issues.push(
        sourceName +
          ': <RustSource> reference "' +
          identity +
          '" is not declared in rust_sources',
      );
    }
  });

  for (const identity of declared) {
    if (!rendered.has(identity)) {
      issues.push(
        sourceName + ': declared Rust source evidence is not rendered: "' + identity + '"',
      );
    }
  }

  if (repositoryRoot && checkSourceFiles) {
    parsed.data.rust_sources.forEach((declaration) => {
      const absolute = nodePath.resolve(repositoryRoot, declaration.path);
      if (!existsSync(absolute)) {
        issues.push(
          sourceName + ': declared Rust source does not exist: ' + declaration.path,
        );
        return;
      }
      if (declaration.region) {
        try {
          extractRustRegion(
            readFileSync(absolute, 'utf8'),
            declaration.region,
            declaration.path,
          );
        } catch (error) {
          issues.push(...(error.issues ?? [error.message]));
        }
      }
    });
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues);
  }

  return {
    ...parsed,
    filePath,
    sourceName,
    references,
  };
}

export function sharedChapterData(data) {
  return {
    chapter_id: data.chapter_id,
    order: data.order,
    concept_id: data.concept_id,
    formula: {
      latex: data.formula.latex,
      symbols: data.formula.symbols.map((symbol) => symbol.symbol),
    },
    history_rust_source: data.history.rust_source,
    rust_sources: data.rust_sources.map((source) => ({
      path: source.path,
      region: source.region ?? null,
    })),
    visualization: {
      decision: data.visualization.decision,
      id: data.visualization.id,
    },
  };
}

export function validateChapterPair(english, russian) {
  const issues = [];
  if (english.data.locale !== 'en' || russian.data.locale !== 'ru') {
    issues.push('pair arguments must be ordered as English then Russian');
  }
  if (english.data.chapter_id !== russian.data.chapter_id) {
    issues.push('paired chapter_id values differ');
  }
  if (english.data.content_revision !== russian.data.content_revision) {
    issues.push(
      english.data.chapter_id +
        ': English revision ' +
        english.data.content_revision +
        ' differs from Russian revision ' +
        russian.data.content_revision,
    );
  }
  if (
    JSON.stringify(sharedChapterData(english.data)) !==
    JSON.stringify(sharedChapterData(russian.data))
  ) {
    issues.push(
      english.data.chapter_id +
        ': locale-neutral formula, source, visualization, order, or concept fields differ',
    );
  }
  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'Chapter parity validation failed');
  }
  return true;
}

export function findPublishablePairs(documents) {
  const groups = new Map();
  for (const document of documents) {
    const group = groups.get(document.data.chapter_id) ?? [];
    group.push(document);
    groups.set(document.data.chapter_id, group);
  }

  const pairs = [];
  for (const [chapterId, group] of groups) {
    const english = group.filter((document) => document.data.locale === 'en');
    const russian = group.filter((document) => document.data.locale === 'ru');
    if (english.length !== 1 || russian.length !== 1) continue;
    try {
      validateChapterPair(english[0], russian[0]);
      pairs.push({
        chapterId,
        revision: english[0].data.content_revision,
        en: english[0],
        ru: russian[0],
      });
    } catch {
      // Invalid or stale pairs are deliberately not publishable.
    }
  }

  return pairs.sort(
    (left, right) =>
      left.en.data.order - right.en.data.order ||
      left.chapterId.localeCompare(right.chapterId),
  );
}

export function validatePublishedChapterSequence(pairs) {
  const ordered = [...pairs].sort(
    (left, right) =>
      left.en.data.order - right.en.data.order ||
      left.chapterId.localeCompare(right.chapterId),
  );
  const orders = new Set();
  const concepts = new Set();
  const issues = [];

  ordered.forEach((pair, index) => {
    const expectedOrder = index + 1;
    const expectedPrefix = String(expectedOrder).padStart(2, '0') + '-';
    const order = pair.en.data.order;
    const concept = pair.en.data.concept_id;
    if (orders.has(order)) {
      issues.push('duplicate published chapter order ' + order);
    }
    if (concepts.has(concept)) {
      issues.push('duplicate published concept_id "' + concept + '"');
    }
    if (order !== expectedOrder || !pair.chapterId.startsWith(expectedPrefix)) {
      issues.push(
        pair.chapterId +
          ': published chapters must form a contiguous ordered prefix; expected order ' +
          expectedOrder,
      );
    }
    orders.add(order);
    concepts.add(concept);
  });

  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'Published chapter sequence failed');
  }
  return ordered;
}

export function validatePublishedContractSequence(pairs, contracts) {
  const orderedPairs = validatePublishedChapterSequence(pairs);
  const orderedContracts = [...contracts].sort(
    (left, right) =>
      left.data.order - right.data.order ||
      left.data.chapter_id.localeCompare(right.data.chapter_id),
  );
  const issues = [];
  const contractIds = new Set();
  const contractOrders = new Set();
  const contractConcepts = new Set();

  orderedContracts.forEach((contract, index) => {
    const data = contract.data;
    if (contractIds.has(data.chapter_id)) {
      issues.push('duplicate implemented contract chapter_id "' + data.chapter_id + '"');
    }
    if (contractOrders.has(data.order)) {
      issues.push('duplicate implemented contract order ' + data.order);
    }
    if (contractConcepts.has(data.concept_id)) {
      issues.push('duplicate implemented contract concept_id "' + data.concept_id + '"');
    }
    if (data.order !== index + 1) {
      issues.push(
        data.chapter_id + ': implemented contracts must form a contiguous ordered prefix',
      );
    }
    contractIds.add(data.chapter_id);
    contractOrders.add(data.order);
    contractConcepts.add(data.concept_id);
  });

  if (orderedPairs.length !== orderedContracts.length) {
    issues.push(
      'published bilingual lesson count ' +
        orderedPairs.length +
        ' differs from implemented contract count ' +
        orderedContracts.length,
    );
  }

  const count = Math.max(orderedPairs.length, orderedContracts.length);
  for (let index = 0; index < count; index += 1) {
    const pair = orderedPairs[index];
    const contract = orderedContracts[index]?.data;
    if (!pair || !contract) continue;
    const lessonIdentity = {
      chapter_id: pair.chapterId,
      content_revision: pair.en.data.content_revision,
      order: pair.en.data.order,
      concept_id: pair.en.data.concept_id,
    };
    const contractIdentity = {
      chapter_id: contract.chapter_id,
      content_revision: contract.content_revision,
      order: contract.order,
      concept_id: contract.concept_id,
    };
    if (JSON.stringify(lessonIdentity) !== JSON.stringify(contractIdentity)) {
      issues.push(
        'published lesson identity ' +
          JSON.stringify(lessonIdentity) +
          ' differs from implemented contract ' +
          JSON.stringify(contractIdentity),
      );
    }
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'Published contract sequence failed');
  }
  return orderedPairs;
}

function listFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = nodePath.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(absolute));
    } else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      files.push(absolute);
    }
  }

  return files.sort();
}

export function readChapterDocuments(repositoryRoot) {
  const contentRoot = nodePath.join(repositoryRoot, 'site/src/content/chapters');
  return listFiles(contentRoot).map((filePath) =>
    validateChapterDocument(readFileSync(filePath, 'utf8'), {
      sourceName: nodePath.relative(repositoryRoot, filePath),
      filePath,
      repositoryRoot,
      checkSourceFiles: true,
    }),
  );
}

export function readChapterContractSummaries(repositoryRoot) {
  const contractRoot = nodePath.join(repositoryRoot, 'curriculum/chapters');
  if (!existsSync(contractRoot)) return [];
  return readdirSync(contractRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const filePath = nodePath.join(contractRoot, entry.name);
      return {
        filePath,
        data: parseJsonFrontmatter(
          readFileSync(filePath, 'utf8'),
          nodePath.relative(repositoryRoot, filePath),
        ).data,
      };
    });
}

function catalogKeys(source, locale, sourceName) {
  const declaration = source.match(
    new RegExp(
      'export const ' + locale + '(?::[^=]+)?\\s*=\\s*\\{([\\s\\S]*?)\\n\\};',
    ),
  );
  if (!declaration) {
    throw new ContentValidationError([
      sourceName + ': could not find the exported ' + locale + ' catalog object',
    ]);
  }
  return [...declaration[1].matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*):/gm)].map(
    (match) => match[1],
  );
}

export function validateCatalogParity(repositoryRoot) {
  const enPath = nodePath.join(repositoryRoot, 'site/src/i18n/en.ts');
  const ruPath = nodePath.join(repositoryRoot, 'site/src/i18n/ru.ts');
  const english = catalogKeys(readFileSync(enPath, 'utf8'), 'en', enPath);
  const russian = catalogKeys(readFileSync(ruPath, 'utf8'), 'ru', ruPath);
  const enSorted = [...english].sort();
  const ruSorted = [...russian].sort();

  if (JSON.stringify(enSorted) !== JSON.stringify(ruSorted)) {
    throw new ContentValidationError([
      'message catalog keys differ: en=[' +
        enSorted.join(', ') +
        '], ru=[' +
        ruSorted.join(', ') +
        ']',
    ]);
  }
  if (new Set(english).size !== english.length || new Set(russian).size !== russian.length) {
    throw new ContentValidationError(['message catalogs contain duplicate keys']);
  }

  return english.length;
}

function groupsForDocuments(documents) {
  const groups = new Map();
  documents.forEach((document) => {
    const group = groups.get(document.data.chapter_id) ?? [];
    group.push(document);
    groups.set(document.data.chapter_id, group);
  });
  return groups;
}

export function validateAllChapterPairs(
  documents,
  { requireContiguousPrefix = true } = {},
) {
  const issues = [];
  for (const [chapterId, group] of groupsForDocuments(documents)) {
    const english = group.filter((document) => document.data.locale === 'en');
    const russian = group.filter((document) => document.data.locale === 'ru');
    if (english.length !== 1 || russian.length !== 1) {
      issues.push(
        chapterId +
          ': expected exactly one English and one Russian source; found en=' +
          english.length +
          ', ru=' +
          russian.length,
      );
      continue;
    }
    try {
      validateChapterPair(english[0], russian[0]);
    } catch (error) {
      issues.push(...(error.issues ?? [error.message]));
    }
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'Bilingual publication gate failed');
  }

  const pairs = findPublishablePairs(documents);
  return requireContiguousPrefix
    ? validatePublishedChapterSequence(pairs)
    : pairs;
}

export function repositoryRootFromCwd(cwd = process.cwd()) {
  const resolved = nodePath.resolve(cwd);
  return nodePath.basename(resolved) === 'site' ? nodePath.dirname(resolved) : resolved;
}

function readOption(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

export function runContentCheck(args = process.argv.slice(2), cwd = process.cwd()) {
  const repositoryRoot = repositoryRootFromCwd(cwd);
  const mode = args[0] && !args[0].startsWith('--') ? args[0] : 'all';
  const chapter = readOption(args, '--chapter');
  const locale = readOption(args, '--locale');
  const catalogCount = validateCatalogParity(repositoryRoot);
  const documents = readChapterDocuments(repositoryRoot);

  if (mode === 'chapter') {
    if (!chapter || !SUPPORTED_LOCALES.includes(locale)) {
      throw new ContentValidationError([
        'chapter mode requires --locale en|ru and --chapter NN-slug',
      ]);
    }
    const selected = documents.filter(
      (document) =>
        document.data.chapter_id === chapter && document.data.locale === locale,
    );
    if (selected.length !== 1) {
      throw new ContentValidationError([
        'expected one source for ' +
          locale +
          '/' +
          chapter +
          '; found ' +
          selected.length,
      ]);
    }
    return {
      mode,
      documents: selected,
      pairs: [],
      catalogCount,
    };
  }

  if (mode === 'parity') {
    const selected = chapter
      ? documents.filter((document) => document.data.chapter_id === chapter)
      : documents;
    if (chapter && selected.length === 0) {
      throw new ContentValidationError(['no sources found for chapter ' + chapter]);
    }
    const pairs = validateAllChapterPairs(selected, {
      requireContiguousPrefix: !chapter,
    });
    if (!chapter) {
      validatePublishedContractSequence(
        pairs,
        readChapterContractSummaries(repositoryRoot),
      );
    }
    return { mode, documents: selected, pairs, catalogCount };
  }

  if (mode !== 'all') {
    throw new ContentValidationError(['unknown content-check mode "' + mode + '"']);
  }

  const pairs = validateAllChapterPairs(documents);
  validatePublishedContractSequence(
    pairs,
    readChapterContractSummaries(repositoryRoot),
  );
  return { mode, documents, pairs, catalogCount };
}

function isMainModule() {
  return (
    process.argv[1] &&
    nodePath.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  try {
    const result = runContentCheck();
    console.log(
      'Content check passed: ' +
        result.documents.length +
        ' localized source(s), ' +
        result.pairs.length +
        ' publishable pair(s), ' +
        result.catalogCount +
        ' catalog key(s).',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
