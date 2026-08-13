# Evidence-led English authoring examples

These examples teach questions to ask, not phrases or a chapter template to
copy. Each example begins with an evidence boundary, shows why an initial draft
is insufficient, and explains the decision embodied in a stronger revision.

## Contents

1. Name the actor, order, condition, and consequence
2. State quantities, axes, and value mappings
3. Separate ideal mathematics from represented arithmetic
4. Keep a historical claim inside its source
5. Make an accessibility surface meaningful in isolation
6. Freeze the requirement before asking for a judgment
7. Choose the isolation unit from the real presentation
8. Transfer questions and forward-test separation

## 1. Name the actor, order, condition, and consequence

### Evidence

In a causal-attention fixture, row $t$ may attend only to positions $j\le t$.
The implementation changes future-position logits before applying row-wise
softmax.

### Insufficient draft

> After masking, these become zero.

### Stronger revision

> Before row-wise softmax normalizes row $t$, the causal mask replaces logits at
> positions $j>t$ with $-\infty$. Softmax therefore assigns those future-token
> positions probability zero.

### Why the revision is stronger

The revision names the mask as the actor, the logits as the changed values, the
row and index condition, the order of masking and normalization, and the causal
link to zero probability. It does not ask the learner to infer what “these”
means or whether masking occurs before or after softmax.

Transfer question: can a learner identify who changes what, under which index
condition, in which order, and why the stated result follows?

## 2. State quantities, axes, and value mappings

### Evidence

A reduction receives a tensor of shape $[T,C]$ and sums over the feature axis
$C$. The result has shape $[T]$.

### Insufficient draft

> Reducing it gives one value for each row.

### Stronger revision

> For an input with shape $[T,C]$, where $T$ counts token positions and $C$
> counts features per token, summing over the feature axis produces $T$ output
> values. Output element $t$ is the sum of the $C$ feature values stored at token
> position $t$.

### Why the revision is stronger

The revision gives each dimension a meaning, names the removed axis, states the
output count, and maps one output index back to its input values. “Row” alone is
not enough when nearby tensors may use different axis meanings.

Transfer question: does every relevant number or dimension state what it counts,
its unit or axis meaning, and how an output value corresponds to the input?

## 3. Separate ideal mathematics from represented arithmetic

### Evidence

For logits `[2,2,1]`, temperature `f64::MIN_POSITIVE`, and $k=3$, stable rank
retains token IDs `[0,1,2]`. In the measured `f64` calculation, token $2$'s
max-shifted exponential weight and stored probability are exactly zero.

### Insufficient draft

> Every retained top-k token has positive probability.

### Stronger revision

> Stable rank retains $K_3=\{0,1,2\}$. In this `f64` calculation, token $2$'s
> max-shifted exponential underflows to zero, so $\widehat q_2=0$ and the positive
> represented support is
> $S_{\tau,3}^{(\mathrm{f64})}=\{0,1\}\subset K_3$.

### Why the revision is stronger

The insufficient draft silently transfers a property of an ideal positive real
exponential to a stored floating-point result. The revision distinguishes the
rank decision from the represented probability and ties the narrower statement
to the measured fixture. It does not claim the converse that every positive
stored probability must own a nonempty interval reachable by every random-number
grid.

Transfer question: is the claim about ideal mathematics, a represented value, or
an observed fixture, and does the prose preserve that exact boundary?

## 4. Keep a historical claim inside its source

### Evidence

A language-model report uses top-k sampling with particular values of $k$ for
particular summarization and open-ended continuation settings. It does not claim
to invent top-k or establish one universally best policy.

### Insufficient draft

> GPT-2 established top-k as the universal decoding method.

### Stronger revision

> The GPT-2 report used top-k sampling with task-specific values of $k$ for
> summarization and open-ended continuation. That evidence demonstrates practical
> use in those settings; it does not establish a universal value of $k$ or a
> universally best decoding policy.

### Why the revision is stronger

The revision names the historical actor and observed practice, retains the task
scope, and explicitly excludes the unsupported universal conclusion. The source
supports the learner's history without being made responsible for a course-local
policy.

Transfer question: which exact clause does the primary source support, and what
stronger conclusion must remain outside the claim?

## 5. Make an accessibility surface meaningful in isolation

### Evidence

A checkpoint comparison exposes three facts: restored parameter bytes match,
the optimizer-step value matches, and the restored random-generator state
matches. The visual design also uses color, but color is redundant.

### Insufficient draft

> Compare the values below; green means success.

### Stronger revision

> Checkpoint replay comparison: restored parameter bytes, optimizer-step value,
> and random-generator state match the values recorded before serialization.

### Why the revision is stronger

The revision identifies the comparison, both states, and all three quantities.
It remains meaningful when read by a screen reader without nearby layout or
color. This is not a rule against particular words; it is a positive test of
whether the isolated surface carries the meaning needed for its role.

Transfer question: if the surface is presented alone, can the learner identify
the object, operation or comparison, states, and result without position, color,
or an unexplained pronoun?

For an accessible description, first state the figure's nonvisual teaching
purpose in your own words. Then check whether the description carries the
relationships that make the figure useful—not merely the values printed inside
it. For example, a diagram about two paths converging must name both paths and
their convergence; enumerating the endpoint values would not preserve that
relationship for a learner who cannot see the layout.

## 6. Freeze the requirement before asking for a judgment

Suppose the checkpoint description above is one isolated review surface. Freeze
its neutral requirement before assigning a reviewer:

> Identify the recorded and restored checkpoint states, name the parameter,
> optimizer-step, and random-generator quantities being compared, and state the
> comparison result without relying on position or color.

This requirement comes from the commitment map, not from the reviewer. The
isolated reviewer repeats it exactly, then explains whether the supplied words
satisfy it. The technical reviewer independently checks that it covers the
evidence assigned to the description. A reviewer cannot make a weak description
pass by replacing the requirement with “identify that this is a checkpoint
figure.”

After the review record is frozen, a new role-specific adjudicator checks both
the requirement and the rationale against the exact role bundle. Deterministic
tooling can prove that the frozen requirement was repeated, but only the
reviewer and adjudicator can judge its adequacy and the substance of the
reasoning. External routing manifests hash the actual prompt, context manifest,
bundle, and schema. The semantic record declares only the ordered artifact IDs
it read; a deterministic external receipt over those actual files and the exact
raw response is the provenance authority. The raw response bytes are also the
sealed semantic record; a host tool may reject them but may not sort, normalize,
reserialize, project, or repair their semantic fields.

The prompt is executable evidence too. Both reviewer roles use the exact output
of `canonicalReviewPrompt(role)`, and both adjudicator roles use
`canonicalAdjudicationPrompt(role)`. Each prompt carries the role's substantive
task, its four-artifact boundary, and a `responseByteContract`: emit only one
compact JSON object; recursively sort every object key by UTF-8 bytes; retain
schema-required array order; add no whitespace outside JSON strings; and finish
with exactly one LF. Semantically correct indented JSON is still an invalid raw
record. Preserve it as failed evidence and ask a fresh judgment context for a
replacement; never pass it through a formatter. The prompts do not tell the
model that a candidate is clean or defective and do not provide an expected
finding, answer, or verdict.

The instruction split is deliberate. The author or outer orchestrator uses the
skill and protocol to prepare, route, seal, audit, and verify the judgments. A
frozen reviewer or adjudicator does not invoke that skill or open `AGENTS.md`,
`SKILLS.md`, the skill, its references, or another repository skill or protocol
file. Platform and system instructions already present still apply; the exact
canonical prompt supplies the executable role instruction. Its four routed
artifacts remain the context manifest, prompt, role-specific bundle, and output
schema—there is no fifth instruction artifact.

The adjudicator judges the review, not the candidate a second time. Its `pass`
approves a sound review even when that review correctly gives the candidate
`fail`; its `fail` means the review is unsound or incomplete. A supported review
finding has no linked adjudicator finding. Adjudicator findings are reserved for
review defects and must not duplicate the candidate defect that a sound review
already reported. The prepared adjudication bundle and canonical adjudication
prompt expose the fixed workflow meanings from `adjudicationSemantics`; those
meanings are not candidate evidence or an expected verdict.

Here is a fully disclosed generic excerpt, not a held-out fixture. Suppose the
candidate still uses “Compare the values below; green means success” for the
frozen checkpoint-description requirement above. A sound review assessment may
contain:

```json
{
  "surfaceId": "example.checkpoint-description",
  "judgment": "blocking",
  "roleRequirement": "Identify the recorded and restored checkpoint states, name the parameter, optimizer-step, and random-generator quantities being compared, and state the comparison result without relying on position or color.",
  "rationale": "The supplied words name neither checkpoint state nor any compared quantity and make success depend on color.",
  "findingIds": ["example.missing-checkpoint-comparison"]
}
```

A sound adjudicator does not change that blocking severity to `pass`. It echoes
the review assessment and separately approves its reasoning:

```json
{
  "surfaceId": "example.checkpoint-description",
  "reviewAssessmentJudgment": "blocking",
  "judgment": "supported",
  "rationale": "The bound words and requirement support the review's blocking assessment.",
  "findingIds": []
}
```

The adjudication role verdict may therefore be `pass` while the review and
candidate remain failed. If the assessment were unsound, the adjudicator would
exact-echo its severity, set `judgment` to `rejected`, link a blocking
review-defect finding on this surface, and return role verdict `fail`.

Transfer question: was the success criterion frozen from the evidence before
the judgment, and did a separate context inspect the reasoning rather than only
its fields?

## 7. Choose the isolation unit from the real presentation

Suppose one figure presents an embedding lookup as an arrow-linked sequence that
is read and announced together:

> Token ID $7$ → look up row $7$ → embedding vector $e_7$

Do not automatically turn the three child elements into three isolated units and
then require each child to restate the whole lookup. That would review arbitrary
DOM fragments instead of the learner-facing relationship.

Annotated choice:

- If the rendered reading order and accessibility tree present the arrow-linked
  sequence as one relationship, freeze the three exact values as one grouped
  unit. Its requirement should identify the input token ID, lookup operation,
  selected row, and resulting vector.
- If a card is intentionally announced, reused, or encountered on its own, keep
  it separate and write the necessary referent into that card. Grouping cannot
  hide incomplete standalone copy.
- If a heading such as “Try the zero case” heads an exercise whose prompt names
  the operation, judge the heading's real navigational role or group the heading
  and prompt when the presentation exposes them as one section. Do not require
  the heading to repeat the page concept merely because its DOM element can be
  extracted alone.

The grouping decision is therefore semantic and presentation-bound: preserve
the smallest complete relationship the learner actually receives. Do not add an
unrelated sibling paragraph just to make a weak label pass.

Transfer question: does the frozen unit match the real rendered, reading-order,
or accessibility relationship, and does every intentionally standalone fragment
carry its own required referents?

## 8. Transfer questions and forward-test separation

Use the examples only to recover these general questions:

- What exact evidence supports the claim, and what does it not support?
- Which actor performs which operation, under what prerequisite or condition?
- What is the required order and causal relationship?
- What does each quantity count, which unit or axis does it use, and what does
  each value mean?
- Is a statement ideal, represented, measured, historical, or course-local?
- Does each isolated unit match the real presentation relationship and remain
  meaningful for its actual role?
- Was each role requirement frozen before review, checked for adequacy, and
  adjudicated from an independently routed role bundle?
- Did the adjudicator judge the review rather than duplicate its candidate
  finding, exact-echo each review-assessment severity, and use
  `supported`/`rejected` separately from its role verdict?

Do not copy the examples' cadence, vocabulary, paragraph order, or topic
structure. Do not train or score prose against these examples.

Forward-test this skill only on chapters and concepts absent from these worked
examples. The examples use reduction axes, causal masking, checkpoint replay,
temperature/top-k evidence, and an embedding-lookup sequence. Keep held-out
authoring and review fixtures on different chapters, conceal their curator
mapping and intended findings until all four raw responses, semantic records,
routing manifests, and external receipts are immutable and verified, and accept
a different concrete valid finding as additional evidence after independent
adjudication. Before curating those held-out fixtures, run four fresh prompt-
comprehension probes over neutral tiny fixtures, one for each reviewer and
adjudicator role. Give each probe only its fresh context manifest, exact
canonical role prompt, exact role-specific bundle, and output schema. All four
untouched raw responses must demonstrate the intended role semantics and satisfy
the exact byte contract. Do not create or route a mapping, answer key,
classification, expected defect, or expected verdict for these probes.

Before routing a concealed negative control to those judgments, freeze two
private exact-byte preaudits in fresh contexts: one full
technical/pedagogical and one source-blind isolated-role, each using the same
four-artifact shape as its actual review and no model-facing classification.
Use the same-role canonical review prompt's exact bytes and hash for each
preaudit and its later actual review; only the fresh context and route identities
differ. Both preaudit records must have verdict `pass`, no findings, and only pass
assessments with empty finding links; an advisory counts as a finding and
disqualifies the candidate from the clean-control role until the candidate or
inventory changes and both preaudits are repeated. Edits to either bound input
set invalidate both preaudits. An additional finding never substitutes for the
concealed role-critical defect; after freeze and reveal, a new evaluator must
confirm that the required reviewer reported the mapped defect, its role
adjudicator exact-echoed the affected review-assessment severity, supported the
assessment and finding without a linked adjudicator finding, and approved the
sound review, and both actual negative-control reviews met the same clean-record
condition under the same role prompt, bundle, schema, model, reasoning, and
declared four-artifact IDs as their preaudits. Reject an invalid raw response;
never let host tooling rewrite its ordering or semantics. If effectiveness fails
after reveal, retire the entire exposed set, including its clean control, and use
new disjoint concepts, opaque identities, private preaudits, fresh judgments,
routes, receipts, mapping, and evaluator for any successor held-out test.
