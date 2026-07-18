#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ContentValidationError,
  isAllowedRustSourcePath,
  parseJsonFrontmatter,
  renderableMdxSource,
  repositoryRootFromCwd,
  validateChapterDocument,
  validateChapterLocaleSet,
} from './check-site-content.mjs';
import {
  SUPPORTED_LOCALES,
  readLocaleConfiguration,
} from './locale-config.mjs';

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
const LATEX_PROSE_PATTERN =
  /\\(?:hbox|mbox|vbox|text(?:bf|it|normal|rm|sf|tt|up)?)\s*\{/;

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

function requireLocalizedText(
  issues,
  value,
  field,
  sourceName,
  supportedLocales,
) {
  if (!isObject(value)) {
    issues.push(
      sourceName +
        ': ' +
        field +
        ' must contain one string per configured locale',
    );
    return;
  }
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...supportedLocales].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    issues.push(
      sourceName +
        ': ' +
        field +
        ' locale keys must be exactly ' +
        expectedKeys.join(', '),
    );
  }
  for (const locale of supportedLocales) {
    requireText(issues, value[locale], field + '.' + locale, sourceName);
  }
}

function validateFormula(issues, formula, sourceName, supportedLocales) {
  if (!isObject(formula)) {
    issues.push(sourceName + ': formula must be an object');
    return;
  }
  requireText(issues, formula.latex, 'formula.latex', sourceName);
  if (hasText(formula.latex) && LATEX_PROSE_PATTERN.test(formula.latex)) {
    issues.push(
      sourceName +
        ': formula.latex must contain notation only; put localized prose in symbol definitions',
    );
  }
  if (!Array.isArray(formula.symbols) || formula.symbols.length === 0) {
    issues.push(
      sourceName +
        ': formula.symbols must contain one localized definition per configured locale',
    );
    return;
  }
  const symbols = new Set();
  formula.symbols.forEach((entry, index) => {
    if (!isObject(entry)) {
      issues.push(sourceName + ': formula.symbols[' + index + '] must be an object');
      return;
    }
    requireText(issues, entry.symbol, 'formula.symbols[' + index + '].symbol', sourceName);
    const localizedMeanings = Object.fromEntries(
      Object.entries(entry).filter(([key]) => key !== 'symbol'),
    );
    requireLocalizedText(
      issues,
      localizedMeanings,
      'formula.symbols[' + index + ']',
      sourceName,
      supportedLocales,
    );
    if (symbols.has(entry.symbol)) {
      issues.push(sourceName + ': duplicate formula symbol "' + entry.symbol + '"');
    }
    symbols.add(entry.symbol);
  });
}

function validateHistory(issues, history, sourceName, supportedLocales) {
  if (!isObject(history)) {
    issues.push(sourceName + ': history must be an object');
    return;
  }
  requireLocalizedText(
    issues,
    history.approach,
    'history.approach',
    sourceName,
    supportedLocales,
  );
  requireLocalizedText(
    issues,
    history.summary,
    'history.summary',
    sourceName,
    supportedLocales,
  );
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

function validateVisualization(
  issues,
  visualization,
  sourceName,
  supportedLocales,
) {
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
    supportedLocales,
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

function validateTerminology(issues, terminology, sourceName, supportedLocales) {
  if (!Array.isArray(terminology) || terminology.length === 0) {
    issues.push(
      sourceName +
        ': terminology must contain at least one term localized for every configured locale',
    );
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
    const localizedTerm = Object.fromEntries(
      Object.entries(term).filter(([key]) => key !== 'concept_id'),
    );
    requireLocalizedText(
      issues,
      localizedTerm,
      'terminology[' + index + ']',
      sourceName,
      supportedLocales,
    );
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
  {
    sourceName = 'chapter contract',
    filePath,
    supportedLocales = SUPPORTED_LOCALES,
  } = {},
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

  requireLocalizedText(
    issues,
    data.objective,
    'objective',
    sourceName,
    supportedLocales,
  );
  requireLocalizedText(
    issues,
    data.worked_inputs,
    'worked_inputs',
    sourceName,
    supportedLocales,
  );
  validateFormula(issues, data.formula, sourceName, supportedLocales);
  validateHistory(issues, data.history, sourceName, supportedLocales);
  validateRustPlan(issues, data.rust, sourceName);
  validateVisualization(
    issues,
    data.visualization,
    sourceName,
    supportedLocales,
  );
  requireLocalizedText(
    issues,
    data.decoder_connection,
    'decoder_connection',
    sourceName,
    supportedLocales,
  );
  validateTerminology(issues, data.terminology, sourceName, supportedLocales);
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

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

export function localizedContractProjection(contract, locale) {
  return {
    chapter_id: contract.chapter_id,
    content_revision: contract.content_revision,
    order: contract.order,
    concept_id: contract.concept_id,
    objective: contract.objective[locale],
    worked_inputs: contract.worked_inputs[locale],
    formula: {
      latex: contract.formula.latex,
      symbols: contract.formula.symbols.map((symbol) => ({
        symbol: symbol.symbol,
        meaning: symbol[locale],
      })),
    },
    rust_source_paths: sortedUnique(contract.rust.sources),
    history: {
      approach: contract.history.approach[locale],
      summary: contract.history.summary[locale],
    },
    visualization: {
      decision: contract.visualization.decision,
      id: contract.visualization.id,
      rationale: contract.visualization.rationale[locale],
    },
    decoder_connection: contract.decoder_connection[locale],
  };
}

function localizedLessonProjection(lesson) {
  return {
    chapter_id: lesson.chapter_id,
    content_revision: lesson.content_revision,
    order: lesson.order,
    concept_id: lesson.concept_id,
    objective: lesson.objective,
    worked_inputs: lesson.worked_inputs,
    formula: {
      latex: lesson.formula.latex,
      symbols: lesson.formula.symbols.map((symbol) => ({
        symbol: symbol.symbol,
        meaning: symbol.meaning,
      })),
    },
    rust_source_paths: sortedUnique(lesson.rust_sources.map((source) => source.path)),
    history: {
      approach: lesson.history.approach,
      summary: lesson.history.summary,
    },
    visualization: {
      decision: lesson.visualization.decision,
      id: lesson.visualization.id,
      rationale: lesson.visualization.rationale,
    },
    decoder_connection: lesson.decoder_connection,
  };
}

function expectedDiagramPath(chapterId) {
  const componentName = chapterId
    .slice(3)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return 'site/src/components/chapters/' + componentName + 'Diagram.astro';
}

function visualizationComponent(body, decision, sourceName, chapterId) {
  const renderableBody = renderableMdxSource(body);
  const imports = [...renderableBody.matchAll(
    /import\s+([A-Z][A-Za-z0-9]*Diagram)\s+from\s+['"]([^'"]+Diagram\.astro)['"];?/g,
  )].map((match) => ({ alias: match[1], importPath: match[2] }));
  const marker = '{/* chapter-section:visualization */}';
  const start = body.indexOf(marker);
  const end = body.indexOf('{/* chapter-section:exercises */}', start + marker.length);
  const section =
    start === -1 || end === -1
      ? ''
      : renderableMdxSource(body.slice(start, end));
  const invoked = imports.filter((entry) =>
    new RegExp('<' + entry.alias + '(?:\\s|/|>)').test(section),
  );

  if (decision === 'useful') {
    if (imports.length !== 1 || invoked.length !== 1) {
      throw new ContentValidationError([
        sourceName +
          ': useful visualization must import and invoke exactly one shared *Diagram component inside the visualization section',
      ], 'Chapter integration validation failed');
    }
    const sourcePath = sourceName.replaceAll('\\', '/');
    const resolvedPath = nodePath.posix.normalize(
      nodePath.posix.join(nodePath.posix.dirname(sourcePath), invoked[0].importPath),
    );
    const expectedPath = expectedDiagramPath(chapterId);
    if (resolvedPath !== expectedPath) {
      throw new ContentValidationError([
        sourceName +
          ': useful visualization must resolve to the chapter-specific component ' +
          expectedPath +
          '; found ' +
          resolvedPath,
      ], 'Chapter integration validation failed');
    }
    return resolvedPath;
  }

  if (
    imports.length !== 0 ||
    /<[A-Z][A-Za-z0-9]*Diagram(?:\s|\/|>)/.test(renderableBody)
  ) {
    throw new ContentValidationError([
      sourceName + ': not-useful visualization must not import or invoke a *Diagram component',
    ], 'Chapter integration validation failed');
  }
  return null;
}

export function validateContractLesson(contract, lesson, locale, sourceName = 'lesson') {
  const expected = localizedContractProjection(contract, locale);
  const actual = localizedLessonProjection(lesson.data);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new ContentValidationError([
      sourceName +
        ': ID, revision, order, concept, objective, worked input, formula, history, Rust source set, visualization, or decoder connection differs from the contract',
    ], 'Chapter integration validation failed');
  }
  if (!contract.rust.sources.includes(lesson.data.history.rust_source)) {
    throw new ContentValidationError([
      sourceName + ': history.rust_source is absent from contract rust.sources',
    ], 'Chapter integration validation failed');
  }
  return visualizationComponent(
    lesson.body,
    contract.visualization.decision,
    sourceName,
    contract.chapter_id,
  );
}

export function validateExpectedOutput(
  contract,
  expectedOutput,
  sourceName = 'chapter contract',
) {
  if (expectedOutput !== contract.rust.expected_output) {
    throw new ContentValidationError([
      sourceName + ': rust.expected_output differs byte-for-byte from expected.txt',
    ], 'Chapter integration validation failed');
  }
  return true;
}

export function validateChapterContractIntegration(
  parsed,
  {
    repositoryRoot,
    sourceName = 'chapter contract',
    localeConfiguration = readLocaleConfiguration(repositoryRoot),
  },
) {
  const contract = parsed.data;
  const issues = [];
  const expectedPackage = 'ch' + contract.chapter_id;
  if (contract.rust.package !== expectedPackage) {
    issues.push(
      sourceName + ': rust.package must equal "' + expectedPackage + '"',
    );
  }

  const demoPrefix = 'rust/demos/' + contract.rust.package + '/';
  const demoSources = contract.rust.sources.filter((path) => path.startsWith('rust/demos/'));
  if (!demoSources.includes(demoPrefix + 'src/main.rs')) {
    issues.push(sourceName + ': rust.sources must include ' + demoPrefix + 'src/main.rs');
  }
  for (const path of demoSources) {
    if (!path.startsWith(demoPrefix)) {
      issues.push(sourceName + ': Rust demo source belongs to another package: ' + path);
    }
  }

  const manifestPath = nodePath.join(repositoryRoot, demoPrefix, 'Cargo.toml');
  const expectedPath = nodePath.join(repositoryRoot, demoPrefix, 'expected.txt');
  if (!existsSync(manifestPath)) {
    issues.push(sourceName + ': demo manifest does not exist: ' + demoPrefix + 'Cargo.toml');
  } else {
    const manifest = readFileSync(manifestPath, 'utf8');
    const packageName = manifest.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
    if (packageName !== contract.rust.package) {
      issues.push(sourceName + ': Cargo package name differs from rust.package');
    }
  }
  if (!existsSync(expectedPath)) {
    issues.push(sourceName + ': expected-output fixture does not exist: ' + demoPrefix + 'expected.txt');
  } else {
    try {
      validateExpectedOutput(
        contract,
        readFileSync(expectedPath, 'utf8'),
        sourceName,
      );
    } catch (error) {
      issues.push(...(error.issues ?? [error.message]));
    }
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'Chapter integration validation failed');
  }

  const lessons = {};
  const diagrams = {};
  for (const locale of localeConfiguration.locales) {
    const lessonPath = nodePath.join(
      repositoryRoot,
      'site/src/content/chapters',
      locale,
      contract.chapter_id + '.mdx',
    );
    if (!existsSync(lessonPath)) {
      throw new ContentValidationError([
        sourceName + ': missing ' + locale + ' lesson ' + nodePath.relative(repositoryRoot, lessonPath),
      ], 'Chapter integration validation failed');
    }
    const lesson = validateChapterDocument(readFileSync(lessonPath, 'utf8'), {
      sourceName: nodePath.relative(repositoryRoot, lessonPath),
      filePath: lessonPath,
      repositoryRoot,
      checkSourceFiles: true,
      supportedLocales: localeConfiguration.locales,
    });
    lessons[locale] = lesson;
    diagrams[locale] = validateContractLesson(
      contract,
      lesson,
      locale,
      nodePath.relative(repositoryRoot, lessonPath),
    );
    if (
      diagrams[locale] &&
      !existsSync(nodePath.join(repositoryRoot, diagrams[locale]))
    ) {
      throw new ContentValidationError([
        sourceName + ': visualization component does not exist: ' + diagrams[locale],
      ], 'Chapter integration validation failed');
    }
  }

  validateChapterLocaleSet(
    Object.values(lessons),
    localeConfiguration.locales,
    localeConfiguration.defaultLocale,
  );
  const diagramPaths = new Set(Object.values(diagrams));
  if (diagramPaths.size !== 1) {
    throw new ContentValidationError([
      sourceName + ': all localized lessons must invoke the same visualization component',
    ], 'Chapter integration validation failed');
  }

  return {
    lessons,
    visualizationComponent: diagrams[localeConfiguration.defaultLocale],
    expectedPath,
  };
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
  const localeConfiguration = readLocaleConfiguration(repositoryRoot);
  const structureOnly = args.includes('--structure-only');
  const unknownOptions = args.filter(
    (argument) => argument.startsWith('--') && argument !== '--structure-only',
  );
  if (unknownOptions.length > 0) {
    throw new ContentValidationError(['unknown option(s): ' + unknownOptions.join(', ')]);
  }
  const requested = args.filter((argument) => argument !== '--structure-only');
  const paths =
    requested.length > 0
      ? requested.map((value) => nodePath.resolve(cwd, value))
      : defaultContractPaths(repositoryRoot);

  const results = paths.map((filePath) => {
    if (!existsSync(filePath)) {
      throw new ContentValidationError(['chapter contract does not exist: ' + filePath]);
    }
    const parsed = validateChapterContractText(readFileSync(filePath, 'utf8'), {
      sourceName: nodePath.relative(repositoryRoot, filePath),
      filePath,
      supportedLocales: localeConfiguration.locales,
    });
    const integration = structureOnly
      ? null
      : validateChapterContractIntegration(parsed, {
          repositoryRoot,
          sourceName: nodePath.relative(repositoryRoot, filePath),
          localeConfiguration,
        });
    return { parsed, integration };
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
      'Chapter contract check passed: ' + result.results.length + ' integrated file(s).',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
