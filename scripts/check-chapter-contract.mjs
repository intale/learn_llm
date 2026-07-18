#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ContentValidationError,
  isAllowedRustSourcePath,
  parseJsonFrontmatter,
  repositoryRootFromCwd,
} from './check-site-content.mjs';

export const REQUIRED_CONTRACT_SECTIONS = Object.freeze([
  'scope',
  'worked-inputs',
  'formula',
  'history',
  'rust-behavior',
  'visualization',
  'exercises',
  'decoder-connection',
  'localization',
  'acceptance',
]);

const CHAPTER_ID_PATTERN = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONCEPT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PACKAGE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireText(issues, value, field, sourceName) {
  if (!hasText(value)) {
    issues.push(sourceName + ': ' + field + ' must be a non-empty string');
  }
}

function requireLocalizedText(issues, value, field, sourceName) {
  if (!isObject(value)) {
    issues.push(sourceName + ': ' + field + ' must contain en and ru strings');
    return;
  }
  requireText(issues, value.en, field + '.en', sourceName);
  requireText(issues, value.ru, field + '.ru', sourceName);
  if (hasText(value.en) && value.en === value.ru) {
    issues.push(sourceName + ': ' + field + ' English and Russian text must differ');
  }
}

function validateFormula(issues, formula, sourceName) {
  if (!isObject(formula)) {
    issues.push(sourceName + ': formula must be an object');
    return;
  }
  requireText(issues, formula.latex, 'formula.latex', sourceName);
  if (!Array.isArray(formula.symbols) || formula.symbols.length === 0) {
    issues.push(sourceName + ': formula.symbols must contain bilingual symbol definitions');
    return;
  }
  const symbols = new Set();
  formula.symbols.forEach((entry, index) => {
    if (!isObject(entry)) {
      issues.push(sourceName + ': formula.symbols[' + index + '] must be an object');
      return;
    }
    requireText(issues, entry.symbol, 'formula.symbols[' + index + '].symbol', sourceName);
    requireText(issues, entry.en, 'formula.symbols[' + index + '].en', sourceName);
    requireText(issues, entry.ru, 'formula.symbols[' + index + '].ru', sourceName);
    if (symbols.has(entry.symbol)) {
      issues.push(sourceName + ': duplicate formula symbol "' + entry.symbol + '"');
    }
    symbols.add(entry.symbol);
  });
}

function validateHistory(issues, history, sourceName) {
  if (!isObject(history)) {
    issues.push(sourceName + ': history must be an object');
    return;
  }
  requireText(issues, history.approach, 'history.approach', sourceName);
  requireLocalizedText(issues, history.summary, 'history.summary', sourceName);
  requireText(issues, history.rust_contrast, 'history.rust_contrast', sourceName);
}

function validateRustPlan(issues, rust, sourceName) {
  if (!isObject(rust)) {
    issues.push(sourceName + ': rust must be an object');
    return;
  }
  if (!hasText(rust.package) || !PACKAGE_PATTERN.test(rust.package)) {
    issues.push(sourceName + ': rust.package must be a lowercase kebab-case Cargo package');
  }
  if (!Array.isArray(rust.sources) || rust.sources.length === 0) {
    issues.push(sourceName + ': rust.sources must contain at least one planned .rs path');
  } else {
    const unique = new Set();
    rust.sources.forEach((source, index) => {
      if (!isAllowedRustSourcePath(source)) {
        issues.push(
          sourceName +
            ': rust.sources[' +
            index +
            '] must be an allowed repository-relative Rust source path',
        );
      }
      if (unique.has(source)) {
        issues.push(sourceName + ': duplicate planned Rust source "' + source + '"');
      }
      unique.add(source);
    });
  }
  requireText(issues, rust.expected_output, 'rust.expected_output', sourceName);
}

function validateVisualization(issues, visualization, sourceName) {
  if (!isObject(visualization)) {
    issues.push(sourceName + ': visualization must be an object');
    return;
  }
  if (!['useful', 'not-useful'].includes(visualization.decision)) {
    issues.push(
      sourceName + ': visualization.decision must be "useful" or "not-useful"',
    );
  }
  requireLocalizedText(
    issues,
    visualization.rationale,
    'visualization.rationale',
    sourceName,
  );
  if (
    visualization.decision === 'useful' &&
    (!hasText(visualization.id) || !CONCEPT_ID_PATTERN.test(visualization.id))
  ) {
    issues.push(
      sourceName + ': a useful visualization requires a lowercase kebab-case id',
    );
  }
  if (visualization.decision === 'not-useful' && visualization.id !== null) {
    issues.push(
      sourceName + ': a not-useful visualization must set visualization.id to null',
    );
  }
}

function validateTerminology(issues, terminology, sourceName) {
  if (!Array.isArray(terminology) || terminology.length === 0) {
    issues.push(sourceName + ': terminology must contain at least one bilingual term');
    return;
  }
  const concepts = new Set();
  terminology.forEach((term, index) => {
    if (!isObject(term)) {
      issues.push(sourceName + ': terminology[' + index + '] must be an object');
      return;
    }
    if (!hasText(term.concept_id) || !CONCEPT_ID_PATTERN.test(term.concept_id)) {
      issues.push(
        sourceName + ': terminology[' + index + '].concept_id must be kebab-case',
      );
    }
    requireText(issues, term.en, 'terminology[' + index + '].en', sourceName);
    requireText(issues, term.ru, 'terminology[' + index + '].ru', sourceName);
    if (concepts.has(term.concept_id)) {
      issues.push(
        sourceName + ': duplicate terminology concept_id "' + term.concept_id + '"',
      );
    }
    concepts.add(term.concept_id);
  });
}

function validateStringArray(issues, value, field, sourceName) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(sourceName + ': ' + field + ' must be a non-empty array');
    return;
  }
  value.forEach((entry, index) => {
    requireText(issues, entry, field + '[' + index + ']', sourceName);
  });
}

function validateAcceptanceExamples(issues, examples, sourceName) {
  if (!Array.isArray(examples) || examples.length === 0) {
    issues.push(sourceName + ': acceptance_examples must contain deterministic examples');
    return;
  }
  examples.forEach((example, index) => {
    if (!isObject(example)) {
      issues.push(sourceName + ': acceptance_examples[' + index + '] must be an object');
      return;
    }
    requireText(
      issues,
      example.input,
      'acceptance_examples[' + index + '].input',
      sourceName,
    );
    requireText(
      issues,
      example.expected,
      'acceptance_examples[' + index + '].expected',
      sourceName,
    );
  });
}

export function extractContractSectionMarkers(body) {
  return [...body.matchAll(/<!--\s*contract-section:([a-z-]+)\s*-->/g)].map(
    (match) => match[1],
  );
}

export function validateChapterContractText(
  source,
  { sourceName = 'chapter contract', filePath } = {},
) {
  const parsed = parseJsonFrontmatter(source, sourceName);
  const data = parsed.data;
  const issues = [];

  if (!hasText(data.chapter_id) || !CHAPTER_ID_PATTERN.test(data.chapter_id)) {
    issues.push(sourceName + ': chapter_id must match NN-lowercase-kebab-case');
  }
  if (!hasText(data.concept_id) || !CONCEPT_ID_PATTERN.test(data.concept_id)) {
    issues.push(sourceName + ': concept_id must be lowercase kebab-case');
  }
  if (!Number.isInteger(data.content_revision) || data.content_revision < 1) {
    issues.push(sourceName + ': content_revision must be a positive integer');
  }
  if (!Number.isInteger(data.order) || data.order < 1) {
    issues.push(sourceName + ': order must be a positive integer');
  }

  requireLocalizedText(issues, data.objective, 'objective', sourceName);
  requireLocalizedText(issues, data.worked_inputs, 'worked_inputs', sourceName);
  validateFormula(issues, data.formula, sourceName);
  validateHistory(issues, data.history, sourceName);
  validateRustPlan(issues, data.rust, sourceName);
  validateVisualization(issues, data.visualization, sourceName);
  requireLocalizedText(
    issues,
    data.decoder_connection,
    'decoder_connection',
    sourceName,
  );
  validateTerminology(issues, data.terminology, sourceName);
  validateStringArray(issues, data.translation_notes, 'translation_notes', sourceName);
  validateAcceptanceExamples(issues, data.acceptance_examples, sourceName);

  const markers = extractContractSectionMarkers(parsed.body);
  if (JSON.stringify(markers) !== JSON.stringify(REQUIRED_CONTRACT_SECTIONS)) {
    issues.push(
      sourceName +
        ': contract section markers must appear exactly once in this order: ' +
        REQUIRED_CONTRACT_SECTIONS.join(', '),
    );
  }

  if (filePath) {
    const normalized = filePath.replaceAll('\\', '/');
    if (normalized.includes('/curriculum/chapters/')) {
      const filename = nodePath.basename(normalized, nodePath.extname(normalized));
      if (filename !== data.chapter_id) {
        issues.push(
          sourceName + ': filename must equal chapter_id "' + data.chapter_id + '"',
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'Chapter contract validation failed');
  }

  return parsed;
}

function defaultContractPaths(repositoryRoot) {
  const directory = nodePath.join(repositoryRoot, 'curriculum/chapters');
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => nodePath.join(directory, entry.name))
    .sort();
}

export function runChapterContractCheck(
  args = process.argv.slice(2),
  cwd = process.cwd(),
) {
  const repositoryRoot = repositoryRootFromCwd(cwd);
  const requested = args.filter((argument) => !argument.startsWith('--'));
  const paths =
    requested.length > 0
      ? requested.map((value) => nodePath.resolve(cwd, value))
      : defaultContractPaths(repositoryRoot);

  const results = paths.map((filePath) => {
    if (!existsSync(filePath)) {
      throw new ContentValidationError(['chapter contract does not exist: ' + filePath]);
    }
    return validateChapterContractText(readFileSync(filePath, 'utf8'), {
      sourceName: nodePath.relative(repositoryRoot, filePath),
      filePath,
    });
  });

  return { paths, results };
}

function isMainModule() {
  return (
    process.argv[1] &&
    nodePath.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  try {
    const result = runChapterContractCheck();
    console.log(
      'Chapter contract check passed: ' + result.results.length + ' file(s).',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
