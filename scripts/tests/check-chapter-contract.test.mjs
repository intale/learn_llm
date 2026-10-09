import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  runChapterContractCheck,
  validateChapterContractIntegration,
  validateChapterContractText,
} from '../check-chapter-contract.mjs';
import {
  isAllowedRustSourcePath,
  parseJsonFrontmatter,
  readChapterDocuments,
  runContentCheck,
  validateAllChapterSets,
  validateCatalogParity,
  validateChapterDocument,
  validateChapterMetadata,
  validateChapterRouteSource,
  validatePracticalChapterDelegation,
} from '../check-site-content.mjs';
import { readCourseConfiguration } from '../check-course-boundaries.mjs';
import { courseById, FIRST_COURSE_ID, PRACTICAL_COURSE_ID } from '../lib/course-boundaries.mjs';
import {
  checkFunctionalContract,
  contractDispatch,
  runFunctionalContractCheck,
  validateDemoContractBinding,
} from '../check-functional-chapter-contract.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const configuration = readCourseConfiguration(root);
const first = courseById(configuration, FIRST_COURSE_ID);
const practical = courseById(configuration, PRACTICAL_COURSE_ID);
const initialIds = ['00-course-structure', '01-reference-core-handoff', '02-corpus-preparation'];
const source = (course, id, kind = 'lesson') => readFileSync(join(root,
  kind === 'contract' ? course.contractDirectory : course.contentDirectory + '/en',
  id + (kind === 'contract' ? '.md' : '.mdx')), 'utf8');
const contractSource = (course, id) => source(course, id, 'contract');
const rebuild = parsed => '---\n' + JSON.stringify(parsed.data, null, 2) + '\n---\n' + parsed.body;
const changed = (value, change) => {
  const parsed = parseJsonFrontmatter(value);
  change(parsed);
  return rebuild(parsed);
};
const lesson = (course, id, value = source(course, id)) => validateChapterDocument(value, {
  course, checkSourceFiles: false,
  filePath: join(root, course.contentDirectory, 'en', id + '.mdx'),
});
const contract = (course, id, value = contractSource(course, id)) => validateChapterContractText(value, {
  course, filePath: join(root, course.contractDirectory, id + '.md'),
});
function temporary(t) {
  const path = mkdtempSync(join(tmpdir(), 'course-contract-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}
function write(path, relative, value) {
  mkdirSync(join(path, relative, '..'), { recursive: true });
  writeFileSync(join(path, relative), value);
}

test('first-course orientation and low-numbered lesson keep their historical schemas', () => {
  const orientation = lesson(first, first.orientationChapterId);
  assert.equal(orientation.data.visualization.id, 'llm-system-map');
  assert.equal(orientation.data.visualization.supplementary[0].id, 'llm-parts-map');
  assert.equal(contract(first, first.orientationChapterId).data.rust, null);
  const firstLesson = lesson(first, '01-text-units');
  validateChapterMetadata(firstLesson.data);
  validateChapterContractText(contractSource(first, '01-text-units'));
});

test('practical orientation is course-scoped and has no formula, Rust sample or diagram', () => {
  const id = practical.orientationChapterId;
  const parsed = lesson(practical, id);
  assert.equal(parsed.data.formula, null);
  assert.deepEqual(parsed.data.rust_sources, []);
  assert.equal(parsed.data.history.rust_source, null);
  assert.equal(parsed.data.visualization.decision, 'not-useful');
  assert.equal(contract(practical, id).data.rust, null);
  assert.throws(() => validateChapterDocument(source(practical, id), { checkSourceFiles: false }), /orientation/);
  assert.throws(() => validateChapterContractText(contractSource(practical, id)), /orientation/);
  for (const change of [
    parsed => { parsed.data.formula = { latex: 'x' }; },
    parsed => { parsed.data.history.rust_source = 'rust/demos/practical-ch01-reference-core-handoff/src/lib.rs'; },
    parsed => { parsed.data.rust_sources = [{ path: 'rust/crates/llm-from-scratch-practical/src/lib.rs', purpose: 'Fixture.' }]; },
    parsed => { parsed.body += '\n<RustSource path="rust/crates/llm-from-scratch-practical/src/lib.rs" />\n'; },
    parsed => { parsed.body += '\n<ReferenceCoreHandoffDiagram />\n'; },
  ]) assert.throws(() => lesson(practical, id, changed(source(practical, id), change)));
});

test('orientation exception cannot move to another ID, order or course', () => {
  for (const change of [
    parsed => { parsed.data.chapter_id = '01-course-structure'; parsed.data.order = 1; },
    parsed => { parsed.data.chapter_id = '00-another-orientation'; },
    parsed => { delete parsed.data.chapter_kind; },
  ]) assert.throws(() => lesson(practical, practical.orientationChapterId,
    changed(source(practical, practical.orientationChapterId), change)), /identity|orientation/);
  assert.throws(() => lesson(first, practical.orientationChapterId,
    source(practical, practical.orientationChapterId)), /identity|orientation/);
});

test('practical orientation requires its approved course-path section order', () => {
  for (const kind of ['lesson', 'contract']) {
    const value = source(practical, practical.orientationChapterId, kind);
    const missing = value.replace(kind === 'contract'
      ? '<!-- contract-section:course-path -->' : '{/* chapter-section:course-path */}', '');
    assert.throws(() => kind === 'contract'
      ? contract(practical, practical.orientationChapterId, missing)
      : lesson(practical, practical.orientationChapterId, missing), /section markers/);
  }
});

test('empty terminology is required only for the exact practical orientation', () => {
  const id = practical.orientationChapterId;
  for (const terminology of [null, [{ concept_id: 'fixture-term', en: 'Fixture term' }]]) {
    assert.throws(() => contract(practical, id, changed(contractSource(practical, id), parsed => {
      parsed.data.terminology = terminology;
    })), /practical orientation terminology must be an empty array/);
  }
  for (const [course, chapterId] of [[first, first.orientationChapterId],
    [practical, initialIds[1]], [practical, initialIds[2]]]) {
    assert.throws(() => contract(course, chapterId, changed(contractSource(course, chapterId), parsed => {
      parsed.data.terminology = [];
    })), /terminology must contain at least one term/);
  }
});

test('practical chapters 1 and 2 require LLM evolution despite their low numbers', () => {
  for (const id of initialIds.slice(1)) {
    lesson(practical, id);
    contract(practical, id);
    assert.throws(() => lesson(practical, id, changed(source(practical, id), parsed => {
      delete parsed.data.history.llm_evolution;
    })), /required for every practical lesson/);
    assert.throws(() => contract(practical, id, changed(contractSource(practical, id), parsed => {
      delete parsed.data.history.llm_evolution;
    })), /required for every practical lesson/);
  }
});

test('practical lesson formula, Rust, history evidence and exercise gates remain active', () => {
  const id = initialIds[1];
  for (const [change, error] of [
    [parsed => { parsed.data.formula = null; }, /formula/],
    [parsed => { parsed.data.rust_sources = []; }, /rust_sources/],
    [parsed => {
      const pattern = new RegExp(parsed.data.history.llm_evolution.limitation
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
      assert.match(parsed.body, pattern);
      parsed.body = parsed.body.replace(pattern, '');
    }, /history section must render/],
    [parsed => { parsed.body = parsed.body.replace('chapter-section:exercises', 'chapter-section:practice'); }, /section markers/],
    [parsed => { parsed.body = parsed.body.replace(/<details[\s\S]*?<\/details>/, ''); }, /answer/],
  ]) assert.throws(() => lesson(practical, id, changed(source(practical, id), change)), error);
  assert.throws(() => contract(practical, id, changed(contractSource(practical, id), parsed => {
    parsed.data.rust = null;
  })), /rust must/);
});

test('practical crate Rust paths require practical context while existing source schemas stay valid', () => {
  const path = 'rust/crates/llm-from-scratch-practical/src/data/prepared_corpus.rs';
  assert.equal(isAllowedRustSourcePath(path), false);
  assert.equal(isAllowedRustSourcePath(path, first), false);
  assert.equal(isAllowedRustSourcePath(path, practical), true);
  for (const existing of ['rust/crates/llm-from-scratch/src/lib.rs', 'rust/demos/ch01-text-units/src/main.rs']) {
    assert.equal(isAllowedRustSourcePath(existing), true);
    assert.equal(isAllowedRustSourcePath(existing, practical), true);
  }
  for (const invalid of [path.replace('/src/', '/src/../'), path.replaceAll('/', '\\'),
    '/'+path, 'scripts/tool.rs', 'rust/crates/another-crate/src/lib.rs']) {
    assert.equal(isAllowedRustSourcePath(invalid, practical), false);
  }
});

test('active locales remain bilingual for the first course and English-only for practical', () => {
  const firstContract = contractSource(first, '01-text-units');
  assert.throws(() => contract(first, '01-text-units', changed(firstContract, parsed => {
    delete parsed.data.objective.ru;
  })), /locale keys must be exactly en, ru/);
  const practicalContract = contractSource(practical, initialIds[1]);
  assert.throws(() => contract(practical, initialIds[1], changed(practicalContract, parsed => {
    parsed.data.objective.ru = 'Invalid inactive fixture locale.';
  })), /locale keys must be exactly en/);
  for (const id of initialIds) {
    const data = parseJsonFrontmatter(source(practical, id)).data;
    assert.throws(() => validateChapterMetadata({ ...data, locale: 'ru' }, 'fixture', ['en', 'ru'], { course: practical }), /locale/);
  }
  const data = parseJsonFrontmatter(source(first, first.orientationChapterId)).data;
  validateChapterMetadata({ ...data, locale: 'es' }, 'registered-locale fixture', ['en', 'es', 'ru']);
});

test('inactive practical locale files are detected instead of silently ignored', t => {
  const fixture = temporary(t);
  const id = practical.orientationChapterId;
  write(fixture, practical.contentDirectory + '/en/' + id + '.mdx', source(practical, id));
  assert.equal(readChapterDocuments(fixture, ['en'], { course: practical }).length, 1);
  write(fixture, practical.contentDirectory + '/ru/' + id + '.mdx', source(practical, id));
  assert.throws(() => readChapterDocuments(fixture, ['en'], { course: practical }), /directory locale/);
});

test('contract integration refuses an inactive practical lesson before treating it as available', t => {
  const fixture = temporary(t);
  const id = practical.orientationChapterId;
  write(fixture, practical.contentDirectory + '/en/' + id + '.mdx', source(practical, id));
  write(fixture, practical.contentDirectory + '/ru/' + id + '.mdx', source(practical, id));
  assert.throws(() => validateChapterContractIntegration(contract(practical, id), {
    repositoryRoot: fixture, course: practical,
    localeConfiguration: { locales: ['en', 'ru'], defaultLocale: 'en' },
  }), /inactive course locale ru/);
});

test('same chapter numbers in distinct course directories cannot select each other', () => {
  const practicalPath = practical.contractDirectory + '/' + initialIds[1] + '.md';
  const firstPath = first.contractDirectory + '/01-text-units.md';
  assert.equal(runChapterContractCheck(['--structure-only', firstPath], root).results.length, 1);
  assert.equal(runChapterContractCheck(['--course', practical.id, '--structure-only', practicalPath], root).results.length, 1);
  assert.throws(() => runChapterContractCheck(['--structure-only', practicalPath], root), /outside the selected course directory/);
  assert.throws(() => runChapterContractCheck(['--course', practical.id, '--structure-only', firstPath], root), /outside the selected course directory/);
  assert.throws(() => validateChapterDocument(source(practical, initialIds[1]), {
    course: practical, checkSourceFiles: false,
    filePath: join(root, first.contentDirectory, 'en', initialIds[1] + '.mdx'),
  }), /must live under practical-chapters/);
});

test('default and practical contract selectors enumerate their separate current prefixes', () => {
  const firstResults = runChapterContractCheck(['--structure-only'], root);
  assert.equal(firstResults.results.length, 40);
  assert.equal(firstResults.results.every(result => result.parsed.data.order <= 39), true);
  const practicalResults = runChapterContractCheck(['--course', practical.id, '--structure-only'], root);
  const currentPracticalIds = [...initialIds, '03-scalable-bpe-tokenizer'];
  assert.deepEqual(practicalResults.results.map(result => result.parsed.data.chapter_id), currentPracticalIds);
  assert.equal(runFunctionalContractCheck(['--structure-only'], root).length, 40);
  assert.equal(runFunctionalContractCheck(['--course', practical.id, '--structure-only'], root).length, currentPracticalIds.length);
});

test('contract integration binds the practical demo package rather than the same-numbered first demo', () => {
  const id = initialIds[1];
  const parsed = contract(practical, id);
  parsed.data.rust.package = 'ch' + id;
  assert.throws(() => validateChapterContractIntegration(parsed, {
    repositoryRoot: root, course: practical,
    localeConfiguration: { locales: ['en', 'ru'], defaultLocale: 'en' },
  }), /rust.package must equal "practical-ch/);
});

test('current functional checks require an explicit course and cannot dispatch retired successors by number', () => {
  assert.equal(contractDispatch('39-end-to-end-llm'), 'legacy-demo');
  assert.throws(() => contractDispatch('40-reference-core-handoff'), /outside first course range/);
  assert.equal(contractDispatch(initialIds[1], { course: practical }), 'practical-demo');
  assert.throws(() => contractDispatch('45-outside-practical', { course: practical }), /outside course boundary/);
  assert.throws(() => validateDemoContractBinding({}, {}), /explicit historical context/);
  assert.throws(() => checkFunctionalContract(root,
    practical.contractDirectory + '/' + initialIds[1] + '.md', { structureOnly: true }), /outside the selected course directory/);
});

test('course and option inputs fail closed before chapter traversal', () => {
  for (const args of [['--course', 'unknown'], ['--course'], ['--unexpected'], ['--course', practical.id, '--historical']]) {
    assert.throws(() => runChapterContractCheck(args, root));
    assert.throws(() => runFunctionalContractCheck(args, root));
    assert.throws(() => runContentCheck(args, root));
  }
});

test('separate course locale sets stay contiguous despite overlapping orders', () => {
  const firstDocuments = ['en', 'ru'].flatMap(locale => [first.orientationChapterId, '01-text-units'].map(id =>
    parseJsonFrontmatter(readFileSync(join(root, first.contentDirectory, locale, id + '.mdx'), 'utf8'))));
  const practicalDocuments = initialIds.map(id => lesson(practical, id));
  assert.equal(validateAllChapterSets(firstDocuments, { requiredLocales: first.activeLocales }).length, 2);
  assert.equal(validateAllChapterSets(practicalDocuments, { requiredLocales: practical.activeLocales }).length, 3);
  assert.throws(() => validateAllChapterSets([...firstDocuments, ...practicalDocuments], {
    requiredLocales: id => id === first.orientationChapterId || id === '01-text-units' ? first.activeLocales : practical.activeLocales,
  }), /duplicate|contiguous|order/);
});

test('home and practical-index catalog groups are independently optional per registered locale', t => {
  const fixture = temporary(t);
  write(fixture, 'site/src/i18n/messages.ts', "export const messageKeys = ['siteName', 'startCourse'] as const;\nexport const COURSE_HOME_MESSAGE_KEYS = ['courseChoiceTitle', 'practicalCourseTitle'] as const;\nexport const COURSE_INDEX_MESSAGE_KEYS = ['practicalCourseEyebrow', 'practicalIndexDescription'] as const;\nexport const courseMessageKeys = [...COURSE_HOME_MESSAGE_KEYS, ...COURSE_INDEX_MESSAGE_KEYS] as const;\n");
  const required = { siteName: 'Fixture site', startCourse: 'Fixture start' };
  const home = { courseChoiceTitle: 'Fixture choice', practicalCourseTitle: 'Fixture practical' };
  const index = { practicalCourseEyebrow: 'Fixture index', practicalIndexDescription: 'Fixture description' };
  const locales = { locales: ['en', 'ru'], defaultLocale: 'en' };
  write(fixture, 'site/src/i18n/catalogs/en.json', JSON.stringify({ ...required, ...home, ...index }));
  for (const optional of [{}, home, index, { ...home, ...index }]) {
    write(fixture, 'site/src/i18n/catalogs/ru.json', JSON.stringify({ ...required, ...optional }));
    assert.equal(validateCatalogParity(fixture, locales), 6);
  }
  write(fixture, 'site/src/i18n/catalogs/ru.json', JSON.stringify({ ...required, courseChoiceTitle: home.courseChoiceTitle }));
  assert.throws(() => validateCatalogParity(fixture, locales), /COURSE_HOME_MESSAGE_KEYS must be all present or all absent/);
  write(fixture, 'site/src/i18n/catalogs/ru.json', JSON.stringify({ ...required, ...home, practicalCourseEyebrow: index.practicalCourseEyebrow }));
  assert.throws(() => validateCatalogParity(fixture, locales), /COURSE_INDEX_MESSAGE_KEYS must be all present or all absent/);
  for (const invalid of [
    JSON.stringify({ ...required, unexpected: 'Fixture' }),
    JSON.stringify({ ...required, ...home, practicalCourseTitle: '' }),
    JSON.stringify({ ...required, ...index, practicalIndexDescription: '' }),
    '{"siteName":"Fixture","siteName":"Duplicate","startCourse":"Fixture"}',
  ]) {
    write(fixture, 'site/src/i18n/catalogs/ru.json', invalid);
    assert.throws(() => validateCatalogParity(fixture, locales));
  }
});

test('optional catalog groups cannot overlap each other or the required message schema', t => {
  const fixture = temporary(t);
  const locales = { locales: ['en', 'ru'], defaultLocale: 'en' };
  for (const indexKey of ['siteName', 'homeTitle']) {
    write(fixture, 'site/src/i18n/messages.ts', "export const messageKeys = ['siteName'] as const;\nexport const COURSE_HOME_MESSAGE_KEYS = ['homeTitle'] as const;\nexport const COURSE_INDEX_MESSAGE_KEYS = ['" + indexKey + "'] as const;\n");
    assert.throws(() => validateCatalogParity(fixture, locales), /message schema groups must not overlap/);
  }
});

test('practical thin route delegates markup and CSS checks to the sole original renderer', () => {
  const wrapper = readFileSync(join(root, 'site/src/pages/[locale]/practical-llm-in-rust/[...slug].astro'), 'utf8');
  const renderer = readFileSync(join(root, 'site/src/pages/[locale]/course/[...slug].astro'), 'utf8');
  assert.deepEqual(validatePracticalChapterDelegation(wrapper), {
    rendererImport: '../course/[...slug].astro', componentCount: 1,
  });
  assert.throws(() => validateChapterRouteSource(wrapper), /article data-chapter-root/);
  validateChapterRouteSource(renderer);
  assert.throws(() => validateChapterRouteSource(renderer.replace('<style is:global>', '<style>')),
    /style is:global/);
});

test('practical delegation rejects presentation changes and extra wrapper trees', () => {
  const wrapper = readFileSync(join(root, 'site/src/pages/[locale]/practical-llm-in-rust/[...slug].astro'), 'utf8')
    .replace(" chapterLabelByLocale={{ en: 'Chapter' }}", '');
  for (const value of [
    wrapper.replace('<CourseChapter {...Astro.props} />', '<CourseChapter {...Astro.props} class="private" />'),
    wrapper.replace('<CourseChapter {...Astro.props} />', '<CourseChapter {...Astro.props} client:load />'),
    wrapper.replace('<CourseChapter {...Astro.props} />', '<CourseChapter {...{...Astro.props}} />'),
    wrapper.replace('<CourseChapter {...Astro.props} />', '<CourseChapter {...Astro.props}>Extra</CourseChapter>'),
    wrapper.replace('<CourseChapter {...Astro.props} />', '<OtherChapter {...Astro.props} />'),
    wrapper + '\n<CourseChapter {...Astro.props} />\n',
    wrapper + '\n<style is:global>article { color: red; }</style>\n',
    wrapper + '\n<script>console.log("extra");</script>\n',
  ]) assert.throws(() => validatePracticalChapterDelegation(value), /practical route|practical presentation/);
});

test('practical delegation accepts the original spread and authored literal Chapter label', () => {
  const wrapper = readFileSync(join(root, 'site/src/pages/[locale]/practical-llm-in-rust/[...slug].astro'), 'utf8')
    .replace(" chapterLabelByLocale={{ en: 'Chapter' }}", '');
  const expected = { rendererImport: '../course/[...slug].astro', componentCount: 1 };
  assert.deepEqual(validatePracticalChapterDelegation(wrapper), expected);
  assert.deepEqual(validatePracticalChapterDelegation(wrapper.replace(
    '<CourseChapter {...Astro.props} />',
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ en: 'Chapter' }} />")), expected);
});

test('practical Chapter label delegation refuses other maps, expressions and attributes', () => {
  const wrapper = readFileSync(join(root, 'site/src/pages/[locale]/practical-llm-in-rust/[...slug].astro'), 'utf8')
    .replace(" chapterLabelByLocale={{ en: 'Chapter' }}", '');
  for (const presentation of [
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ en: 'Lesson' }} />",
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ ru: 'Chapter' }} />",
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ en: 'Chapter', ru: 'Chapter' }} />",
    '<CourseChapter {...Astro.props} chapterLabelByLocale={labels} />',
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ ...labels, en: 'Chapter' }} />",
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ ['en']: 'Chapter' }} />",
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ en: makeLabel() }} />",
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ en: 'Chapter' }} class='private' />",
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ en: 'Chapter' }} client:load />",
    "<CourseChapter {...Astro.props} chapterLabelByLocale={{ en: 'Chapter' }} chapterLabelByLocale={{ en: 'Chapter' }} />",
    "<CourseChapter chapterLabelByLocale={{ en: 'Chapter' }} {...Astro.props} />",
  ]) {
    assert.throws(() => validatePracticalChapterDelegation(wrapper.replace(
      '<CourseChapter {...Astro.props} />', presentation)), /practical presentation/);
  }
});

test('practical delegation requires an actual unique runtime import binding', () => {
  const wrapper = readFileSync(join(root, 'site/src/pages/[locale]/practical-llm-in-rust/[...slug].astro'), 'utf8');
  const binding = "import CourseChapter from '../course/[...slug].astro';";
  for (const value of [
    wrapper.replace(binding, "import CourseChapter from '../../../components/OtherChapter.astro';"),
    wrapper.replace(binding, "import type CourseChapter from '../course/[...slug].astro';"),
    wrapper.replace(binding, "import { CourseChapter } from '../course/[...slug].astro';"),
    wrapper.replace(binding, '/*\n' + binding + '\n*/'),
    wrapper.replace(binding, 'const importLookingText = ' + JSON.stringify(binding) + ';'),
    wrapper.replace(binding, binding + '\nconst CourseChapter = null;'),
    wrapper.replace(binding, binding + '\nconst replacement = CourseChapter;'),
    wrapper.replace(binding, 'import CourseChapter from ;'),
  ]) assert.throws(() => validatePracticalChapterDelegation(value), /approved default renderer import|frontmatter must parse|Astro/);
});
