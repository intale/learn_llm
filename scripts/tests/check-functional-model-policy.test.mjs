import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertSelectedModelBinding, parseFrontmatter, validateSchema, validateChapterRecords,
} from '../check-functional-laptop-llm-plan.mjs';

test('rebound design hashes and immutable schema/chapter projections remain coherent', () => {
  const checker = readFileSync(new URL('../check-functional-laptop-llm-plan.mjs', import.meta.url), 'utf8');
  const embedded = (name) => JSON.parse(checker.match(new RegExp(`^const ${name} = /\\*[^\\n]*?\\*/ (.*);$`, 'm'))[1]);
  const constants = embedded('EMBEDDED_CONSTANTS');
  assert.doesNotThrow(() => validateSchema(embedded('EMBEDDED_SCHEMA'), constants));
  assert.doesNotThrow(() => validateChapterRecords(embedded('EMBEDDED_CHAPTER_RECORDS'), constants));
});

test('functional semantic routes accept the selected identity without a model allowlist', () => {
  for (const selected of ['user-selected-model-a', 'provider/model-b', 'local-model-c']) {
    for (const role of ['author', 'reviewer', 'adjudicator']) {
      assert.doesNotThrow(() => assertSelectedModelBinding(selected, selected, role));
    }
    assert.throws(() => assertSelectedModelBinding('substituted-model', selected, 'reviewer'), /identity drift/);
  }
});

test('missing and malformed selected-model provenance is rejected', () => {
  for (const value of ['', '   ', null, undefined, 7]) {
    assert.throws(() => assertSelectedModelBinding('selected-model', value, 'author'), /selected model is missing/);
    assert.throws(() => assertSelectedModelBinding(value, 'selected-model', 'reviewer'), /identity drift/);
  }
});

test('model selection preserves the frozen review roles and non-model resource limits', () => {
  const plan = parseFrontmatter(readFileSync(new URL('../../curriculum/functional-laptop-llm-extension-plan.md', import.meta.url), 'utf8'), 'plan').data;
  const generation = plan.resource_projection.execution_boundaries.content_generation;
  assert.equal(generation.model_policy, 'user-selected-model');
  assert.equal(generation.deterministic_packaging_model_policy, 'user-selected-model');
  assert.equal(generation.affected_rendered_image_review.model_policy, 'user-selected-model');
  assert.equal(generation.successful_contexts_exact, 8);
  assert.deepEqual(generation.successful_context_roles, [
    'canonical-English-author', 'English-technical-pedagogical-reviewer',
    'English-isolated-surface-reviewer', 'English-technical-adjudicator',
    'English-isolated-surface-adjudicator', 'Russian-localizer',
    'Russian-bilingual-reviewer', 'Russian-target-only-reviewer',
  ]);
  assert.deepEqual(generation.per_context_limits, {
    input_bytes_max: 2097152, input_tokens_max: 200000,
    output_bytes_max: 1048576, output_tokens_max: 40000, wall_seconds_max: 1800,
  });
  assert.deepEqual(generation.aggregate_attempt_limits, {
    contexts_max: 16, input_bytes_max: 33554432, input_tokens_max: 3200000,
    output_bytes_max: 16777216, output_tokens_max: 640000, wall_seconds_max: 28800,
  });
});
