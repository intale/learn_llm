// @ts-ignore Node APIs are supplied by Vitest.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by Vitest.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
declare const process: { cwd(): string };
const source = readFileSync(resolve(process.cwd(), 'src/components/chapters/ReferenceCoreHandoffDiagram.astro'), 'utf8');
describe('Chapter40 static shared diagram', () => {
  it('owns exactly one static semantic tree with shared roles and no private enhancement', () => {
    expect(source.match(/<figure\b/g)).toHaveLength(1);
    expect(source.match(/<figcaption\b/g)).toHaveLength(1);
    expect(source).toContain('data-visualization-id="reference-core-handoff"');
    expect(source).toContain('data-diagram-style="course-v1"');
    expect(source).toContain('class="course-diagram reference-core-handoff-diagram"');
    expect(source).toContain('aria-labelledby="reference-handoff-title"');
    expect(source).toContain('aria-describedby="reference-handoff-description"');
    expect(source.match(/data-diagram-box/g)).toHaveLength(3);
    expect(source).not.toMatch(/<(?:script|style|dialog|button)\b|client:|overflow:\s*(?:hidden|clip)/);
  });
  it('renders the actual structured golden values, not a second trace or inferred score', () => {
    expect(source).toContain("ch40-reference-core-handoff/expected.txt?raw");
    for (const expression of ['trace.reference_identity', 'trace.model.parameters', 'trace.evaluation.window_target_slots', 'trace.evaluation.document_transition_occurrences', 'JSON.stringify(trace.generation.token_ids)']) expect(source).toContain(`{${expression}}`);
    expect(source.match(/<bdi dir="ltr">/g)).toHaveLength(2);
  });
});
