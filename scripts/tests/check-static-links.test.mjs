import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSeoDescription } from '../check-static-links.mjs';

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
