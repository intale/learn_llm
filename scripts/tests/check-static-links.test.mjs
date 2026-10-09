import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSeoDescription,deriveSeoExpectations,validateLocalizedCourseEntry } from '../check-static-links.mjs';
import {resolve} from 'node:path';
import {readCourseConfiguration,FOUNDATION_CHAPTER_IDS} from '../check-course-boundaries.mjs';
import {LOCALE_CONFIGURATION} from '../locale-config.mjs';
import {readChapterLocaleConfiguration} from '../chapter-locale-config.mjs';

function check(meta, expected, tail = '') {
  const issues = [];
  validateSeoDescription('en/course/00-llm-parts/index.html',
    `<html><head>${meta}</head><body>${tail}</body></html>`, expected, issues);
  return issues;
}

for (const [name, meta, expected] of [
  ['apostrophe within double quotes', '<meta name="description" content="Inspect the course\'s scalar reference and its full limits.">', "Inspect the course's scalar reference and its full limits."],
  ['double quote within single quotes', '<meta name=\'description\' content=\'Inspect the "scalar reference" and its limits.\'>', 'Inspect the "scalar reference" and its limits.'],
  ['quoted greater-than character', '<meta name="description" content="Inspect x > y and the reference limits.">', 'Inspect x > y and the reference limits.'],
  ['named and numeric entities', '<meta name="description" content="A &amp; B &quot;reference&quot; &#39;scope&#39; &#x3C; limit">', 'A & B "reference" \'scope\' < limit'],
  ['entity text is decoded only once', '<meta name="description" content="Preserve &amp;quot; as literal entity text.">', 'Preserve &quot; as literal entity text.'],
  ['unquoted attributes and case-insensitive names', '<META NAME=DESCRIPTION CONTENT=Reference>', 'Reference'],
]) {
  test(name, () => assert.deepEqual(check(meta, expected), []));
}

test('source mismatch remains rejected', () => {
  assert.match(check('<meta name="description" content="Actual reference">', 'Expected reference').join('\n'), /does not match its source/);
});
test('missing description remains rejected', () => {
  assert.match(check('', 'Reference').join('\n'), /expected exactly one meta/);
});
test('duplicate description remains rejected', () => {
  assert.match(check('<meta name="description" content="Reference"><meta name="description" content="Reference">', 'Reference').join('\n'), /found 2/);
});
test('blank description remains rejected', () => {
  assert.match(check('<meta name="description" content=" &#32; ">', '').join('\n'), /must not be blank/);
});
test('placeholder description remains rejected', () => {
  assert.match(check('<meta name="description" content="TODO">', 'TODO').join('\n'), /placeholder text/);
});
test('description outside raw head remains rejected despite parser repair', () => {
  assert.match(check('', 'Reference', '<meta name="description" content="Reference">').join('\n'), /must be inside the head/);
});
test('missing or duplicate complete head remains rejected', () => {
  for (const source of ['<html><body><meta name="description" content="Reference"></body></html>', '<head><meta name="description" content="Reference"></head><head></head>']) {
    const issues = [];
    validateSeoDescription('index.html', source, 'Reference', issues);
    assert.match(issues.join('\n'), /expected exactly one complete head/);
  }
});

test('current source SEO matrix separates first0–39 and admitted English practical0–2',()=>{
  const root=resolve(import.meta.dirname,'../..');
  const expectations=deriveSeoExpectations(root,LOCALE_CONFIGURATION,readChapterLocaleConfiguration(root),{
    courseConfiguration:readCourseConfiguration(root),practicalChapterIds:FOUNDATION_CHAPTER_IDS,
  });
  assert.equal(expectations.size,89);
  for(const id of FOUNDATION_CHAPTER_IDS){
    assert.equal(expectations.has('/en/practical-llm-in-rust/'+id+'/'),true);
    assert.equal(expectations.has('/ru/practical-llm-in-rust/'+id+'/'),false);
  }
  assert.equal([...expectations.keys()].some(route=>/^\/(?:en|ru)\/course\/(?:40|41)-/.test(route)),false);
});

const courseConfiguration = readCourseConfiguration(resolve(import.meta.dirname, '../..'));
const chooserSource = (locale = 'en', base = '/') => `<section data-course-selection>
  <article data-course-id="llm-from-scratch"><a class="course-cta" href="${base}${locale}/course/00-llm-parts/">First start</a></article>
  <article data-course-id="practical-llm-in-rust"><a class="course-cta" href="${base}en/practical-llm-in-rust/00-course-structure/" hreflang="en">Practical start</a></article>
</section>`;
function entryIssues(source, locale = 'en', base = '/') {
  const issues = [];
  validateLocalizedCourseEntry(locale + '/index.html', source, issues, LOCALE_CONFIGURATION, base, courseConfiguration);
  return issues;
}

test('two named home starts select their course orientations and configured base', () => {
  for (const locale of ['en', 'ru']) {
    for (const base of ['/', '/learn_llm/']) {
      assert.deepEqual(entryIssues(chooserSource(locale, base), locale, base), []);
    }
  }
});

test('absent chooser preserves the ordinary localized first-index fallback', () => {
  assert.deepEqual(entryIssues('<a href="/ru/course/">Existing start</a>', 'ru'), []);
  assert.match(entryIssues('<a href="/ru/course/00-llm-parts/">Wrong fallback</a>', 'ru').join('\n'), /ordinary link to \/ru\/course\//);
});

test('chooser rejects a stale first-index destination or missing practical start', () => {
  assert.match(entryIssues(chooserSource().replace('/en/course/00-llm-parts/', '/en/course/')).join('\n'), /named llm-from-scratch start/);
  assert.match(entryIssues(chooserSource().replace('class="course-cta" href="/en/practical', 'href="/en/practical')).join('\n'), /named practical-llm-in-rust start/);
});

test('chooser rejects a third generic start and duplicate course identity', () => {
  assert.match(entryIssues(chooserSource() + '<a class="course-cta" href="/en/course/">Old start</a>').join('\n'), /exactly two/);
  assert.match(entryIssues(chooserSource().replace('data-course-id="practical-llm-in-rust"', 'data-course-id="llm-from-scratch"')).join('\n'), /named practical-llm-in-rust start/);
});

test('actual DOM prevents comment, script and inert-template start impostors', () => {
  const missing = '<section data-course-selection><article data-course-id="llm-from-scratch"></article><article data-course-id="practical-llm-in-rust"></article></section>';
  for (const fake of ['<!--' + chooserSource() + '-->', '<script>' + JSON.stringify(chooserSource()) + '</script>', '<template>' + chooserSource() + '</template>']) {
    assert.match(entryIssues(missing + fake).join('\n'), /named llm-from-scratch start/);
  }
});

test('practical destination language is independent of the home label language', () => {
  assert.deepEqual(entryIssues(chooserSource('ru').replace('hreflang="en"', 'hreflang="en" lang="ru"'), 'ru'), []);
  assert.match(entryIssues(chooserSource('ru').replace('hreflang="en"', 'hreflang="ru"'), 'ru').join('\n'), /hreflang/);
  assert.match(entryIssues(chooserSource('ru').replace('hreflang="en"', 'hreflang="en" lang="en"'), 'ru').join('\n'), /label language/);
});
