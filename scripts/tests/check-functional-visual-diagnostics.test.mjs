import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseFrontmatter, validateVisualDiagnosticsPolicy } from '../check-functional-laptop-llm-plan.mjs';

function generation() {
  const plan = parseFrontmatter(readFileSync(new URL('../../curriculum/functional-laptop-llm-extension-plan.md', import.meta.url), 'utf8'), 'plan').data;
  return structuredClone(plan.resource_projection.execution_boundaries.content_generation);
}

test('visual diagnostics are optional, human-report-triggered and bounded', () => {
  const candidate = generation();
  assert.equal(candidate.human_reported_visual_diagnostics.required, false);
  assert.doesNotThrow(() => validateVisualDiagnosticsPolicy(candidate));
  assert.equal(candidate.successful_contexts_exact, 8);
  assert.equal(candidate.successful_context_roles.length, 8);
});

test('routine image gates cannot be reintroduced alongside optional diagnostics', () => {
  const candidate = generation();
  candidate.affected_rendered_image_review = { required: true };
  assert.throws(() => validateVisualDiagnosticsPolicy(candidate), /routine image-review gate is excluded/);
});

test('mandatory or automatically triggered image diagnostics are rejected', () => {
  for (const change of [
    { required: true },
    { required: 'when a useful diagram exists' },
    { trigger: 'every-chapter' },
    { trigger: 'automated-layout-failure' },
    { screenshots: 'always' },
  ]) {
    const candidate = generation();
    Object.assign(candidate.human_reported_visual_diagnostics, change);
    assert.throws(() => validateVisualDiagnosticsPolicy(candidate), /optional human-reported visual diagnostics policy/);
  }
});

test('optional diagnosis does not expand the selected-model or resource boundary', () => {
  for (const change of [
    { model_policy: 'substituted-model' }, { contexts_max: 2 },
    { input_image_bytes_max: 16777217 }, { wall_seconds_max: 901 },
    { human_approval_required: true },
  ]) {
    const candidate = generation();
    Object.assign(candidate.human_reported_visual_diagnostics, change);
    assert.throws(() => validateVisualDiagnosticsPolicy(candidate), /optional human-reported visual diagnostics policy/);
  }
});

test('missing visual diagnostics policy is rejected rather than implying a routine check', () => {
  for (const value of [null, undefined, [], {}]) {
    assert.throws(() => validateVisualDiagnosticsPolicy(value));
  }
});
