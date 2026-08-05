export interface NeuralNgramDiagramLabels {
  title: string;
  description: string;
  summary: {
    model: string;
    data: string;
    optimizer: string;
  };
  stages: {
    pipeline: string;
    checkpoints: string;
    result: string;
    generation: string;
    proof: string;
  };
  stageNames: {
    context_ids: string;
    embeddings: string;
    concatenated: string;
    hidden: string;
    logits: string;
  };
  fields: {
    shape: string;
    values: string;
    argmax: string;
    argmaxLogit: string;
    step: string;
    trainLoss: string;
    validationLoss: string;
    initialValidation: string;
    finalValidation: string;
    improvement: string;
    prompt: string;
    promptIds: string;
    generatedIds: string;
    stop: string;
    replay: string;
    testText: string;
    target: string;
    gradientL1: string;
    parameterNodes: string;
    gradients: string;
    generationPolicy: string;
  };
  cues: {
    input: string;
    learned: string;
    output: string;
    checkpoint: string;
    final: string;
  };
  notes: {
    pipeline: string;
    checkpoints: string;
    generation: string;
  };
  captions: {
    pipeline: string;
    checkpoints: string;
    proof: string;
  };
  scrollers: {
    pipeline: string;
    generation: string;
  };
}

export const neuralNgramDiagramId = 'neural-ngram' as const;

export interface NeuralNgramTraceVector {
  lexeme: string;
  items: readonly string[];
}

export type NeuralNgramStageName =
  | 'context_ids'
  | 'embeddings'
  | 'concatenated'
  | 'hidden'
  | 'logits';

export interface NeuralNgramStageTrace {
  index: string;
  name: NeuralNgramStageName;
  shape: NeuralNgramTraceVector;
  values: NeuralNgramTraceVector;
  argmax?: string;
  argmaxLogit?: string;
}

export interface NeuralNgramLossTrace {
  step: string;
  train: string;
  validation: string;
}

export interface NeuralNgramTrace {
  config: {
    vocabulary: string;
    merges: string;
    context: string;
    embedding: string;
    concatenated: string;
    swigluInner: string;
    hidden: string;
    parameters: string;
    batch: string;
    evaluationBatch: string;
    initSeed: string;
    shuffleSeed: string;
    maxSteps: string;
    learningRate: string;
    beta1: string;
    beta2: string;
    epsilon: string;
    weightDecay: string;
  };
  split: {
    trainDocuments: string;
    validationDocuments: string;
    testTextUsed: 'no';
    trainContexts: string;
    validationContexts: string;
    trainBatches: string;
    trainEvaluationBatches: string;
    validationEvaluationBatches: string;
  };
  stages: readonly NeuralNgramStageTrace[];
  losses: readonly NeuralNgramLossTrace[];
  result: {
    step: string;
    initialValidation: string;
    finalValidation: string;
    improvement: string;
  };
  generation: {
    prompt: 'At';
    promptIds: NeuralNgramTraceVector;
    ids: NeuralNgramTraceVector;
    stop: 'limit';
  };
  proof: {
    replay: 'bitwise';
    testText: 'not_encoded_or_scored';
    target: 'final_shifted';
    gradientL1: 'five_positive_finite';
    parameterNodes: 'preserved';
    gradients: 'cleared';
    generation: 'deterministic';
  };
}

const INTEGER = /^(?:0|[1-9][0-9]*)$/;
const DECIMAL = /^-?(?:0|[1-9][0-9]*)\.[0-9]{6}$/;
const EPSILON_DECIMAL = /^(?:0|[1-9][0-9]*)\.[0-9]{9}$/;

function fail(message: string): never {
  throw new Error(`invalid neural n-gram trace: ${message}`);
}

function parseFields(
  line: string,
  kind: string,
  keys: readonly string[],
): Readonly<Record<string, string>> {
  const parts = line.split('|');
  if (parts.shift() !== kind) fail(`expected ${kind} line, received ${line}`);
  if (parts.length !== keys.length) {
    fail(`${kind} must contain exactly ${keys.length} ordered fields`);
  }
  const fields: Record<string, string> = {};
  parts.forEach((part, index) => {
    const separator = part.indexOf('=');
    if (separator <= 0) fail(`${kind} field ${index} has no key/value separator`);
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (key !== keys[index]) {
      fail(`${kind} field ${index} must be ${keys[index]}, received ${key}`);
    }
    if (value.length === 0) fail(`${kind}.${key} must not be empty`);
    fields[key] = value;
  });
  return fields;
}

function exact(value: string, expected: string, label: string): string {
  if (value !== expected) fail(`${label} must be ${expected}, received ${value}`);
  return value;
}

function patterned(value: string, pattern: RegExp, label: string): string {
  if (!pattern.test(value)) fail(`${label} has invalid lexeme ${value}`);
  return value;
}

function parseVector(
  value: string,
  label: string,
  pattern: RegExp,
  expectedLength: number,
): NeuralNgramTraceVector {
  const match = /^\[(.*)\]$/.exec(value);
  if (!match) fail(`${label} must be a bracketed vector`);
  const items = match[1].length === 0 ? [] : match[1].split(', ');
  if (items.length !== expectedLength) {
    fail(`${label} must contain ${expectedLength} values, received ${items.length}`);
  }
  items.forEach((item, index) => patterned(item, pattern, `${label}[${index}]`));
  return Object.freeze({ lexeme: value, items: Object.freeze(items) });
}

function parseStage(
  line: string,
  expected: {
    index: string;
    name: NeuralNgramStageName;
    shape: string;
    shapeWidth: number;
    valueKey: 'ids' | 'values' | 'preview';
    values: string;
    valueWidth: number;
    argmax?: string;
    argmaxLogit?: string;
  },
): NeuralNgramStageTrace {
  const keys = ['index', 'name', 'shape', expected.valueKey];
  if (expected.name === 'logits') keys.push('argmax', 'argmax_logit');
  const fields = parseFields(line, 'STAGE', keys);
  const index = exact(fields.index, expected.index, 'STAGE.index');
  const name = exact(fields.name, expected.name, 'STAGE.name') as NeuralNgramStageName;
  const shape = parseVector(
    exact(fields.shape, expected.shape, `STAGE.${name}.shape`),
    `STAGE.${name}.shape`,
    INTEGER,
    expected.shapeWidth,
  );
  const values = parseVector(
    exact(fields[expected.valueKey], expected.values, `STAGE.${name}.${expected.valueKey}`),
    `STAGE.${name}.${expected.valueKey}`,
    expected.valueKey === 'ids' ? INTEGER : DECIMAL,
    expected.valueWidth,
  );
  if (expected.name !== 'logits') {
    return Object.freeze({ index, name, shape, values });
  }
  return Object.freeze({
    index,
    name,
    shape,
    values,
    argmax: exact(fields.argmax, expected.argmax ?? '', 'STAGE.logits.argmax'),
    argmaxLogit: exact(
      fields.argmax_logit,
      expected.argmaxLogit ?? '',
      'STAGE.logits.argmax_logit',
    ),
  });
}

function parseLoss(
  line: string,
  expected: { step: string; train: string; validation: string },
): NeuralNgramLossTrace {
  const fields = parseFields(line, 'LOSS', ['step', 'train', 'validation']);
  patterned(fields.step, INTEGER, 'LOSS.step');
  patterned(fields.train, DECIMAL, 'LOSS.train');
  patterned(fields.validation, DECIMAL, 'LOSS.validation');
  return Object.freeze({
    step: exact(fields.step, expected.step, 'LOSS.step'),
    train: exact(fields.train, expected.train, `LOSS[${expected.step}].train`),
    validation: exact(
      fields.validation,
      expected.validation,
      `LOSS[${expected.step}].validation`,
    ),
  });
}

export function parseNeuralNgramTrace(source: string): NeuralNgramTrace {
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    fail('source must end with exactly one newline');
  }
  if (source.includes('\r')) fail('source must use LF line endings');
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== 13) fail(`expected 13 lines, received ${lines.length}`);

  const config = parseFields(lines[0], 'CONFIG', [
    'vocabulary',
    'merges',
    'context',
    'embedding',
    'concatenated',
    'swiglu_inner',
    'hidden',
    'parameters',
    'batch',
    'evaluation_batch',
    'init_seed',
    'shuffle_seed',
    'max_steps',
    'lr',
    'beta1',
    'beta2',
    'epsilon',
    'weight_decay',
  ]);
  const split = parseFields(lines[1], 'SPLIT', [
    'train_documents',
    'validation_documents',
    'test_text_used',
    'train_contexts',
    'validation_contexts',
    'train_batches',
    'train_evaluation_batches',
    'validation_evaluation_batches',
  ]);

  const stageExpectations = [
    {
      index: '0',
      name: 'context_ids',
      shape: '[1, 2]',
      shapeWidth: 2,
      valueKey: 'ids',
      values: '[67, 118]',
      valueWidth: 2,
    },
    {
      index: '1',
      name: 'embeddings',
      shape: '[1, 2, 4]',
      shapeWidth: 3,
      valueKey: 'values',
      values:
        '[0.064154, 0.021328, 0.083333, -0.012260, 0.057176, 0.111494, -0.126703, -0.068284]',
      valueWidth: 8,
    },
    {
      index: '2',
      name: 'concatenated',
      shape: '[1, 8]',
      shapeWidth: 2,
      valueKey: 'values',
      values:
        '[0.064154, 0.021328, 0.083333, -0.012260, 0.057176, 0.111494, -0.126703, -0.068284]',
      valueWidth: 8,
    },
    {
      index: '3',
      name: 'hidden',
      shape: '[1, 8]',
      shapeWidth: 2,
      valueKey: 'values',
      values:
        '[-0.002448, -0.000051, 0.003220, 0.003477, 0.002033, 0.004016, 0.003727, 0.003874]',
      valueWidth: 8,
    },
    {
      index: '4',
      name: 'logits',
      shape: '[1, 266]',
      shapeWidth: 2,
      valueKey: 'preview',
      values: '[0.000075, -0.000037, 0.000496, -0.001047, -0.000055, -0.001032]',
      valueWidth: 6,
      argmax: '44',
      argmaxLogit: '0.002350',
    },
  ] as const;
  const stages = stageExpectations.map((expected, index) =>
    parseStage(lines[index + 2], expected),
  );
  const lossExpectations = [
    { step: '0', train: '5.583505', validation: '5.583482' },
    { step: '8', train: '5.580106', validation: '5.580365' },
    { step: '15', train: '5.555850', validation: '5.557362' },
  ] as const;
  const losses = lossExpectations.map((expected, index) =>
    parseLoss(lines[index + 7], expected),
  );

  const result = parseFields(lines[10], 'RESULT', [
    'step',
    'initial_validation',
    'final_validation',
    'improvement',
  ]);
  const generation = parseFields(lines[11], 'GENERATE', [
    'prompt',
    'prompt_ids',
    'ids',
    'stop',
  ]);
  const proof = parseFields(lines[12], 'PROOF', [
    'replay',
    'test_text',
    'target',
    'gradient_l1',
    'parameter_nodes',
    'gradients',
    'generation',
  ]);

  [
    config.vocabulary,
    config.merges,
    config.context,
    config.embedding,
    config.concatenated,
    config.swiglu_inner,
    config.hidden,
    config.parameters,
    config.batch,
    config.evaluation_batch,
    config.init_seed,
    config.shuffle_seed,
    config.max_steps,
  ].forEach((value, index) => patterned(value, INTEGER, `CONFIG.integer[${index}]`));
  [config.lr, config.beta1, config.beta2, config.weight_decay].forEach((value, index) =>
    patterned(value, DECIMAL, `CONFIG.decimal[${index}]`),
  );
  patterned(config.epsilon, EPSILON_DECIMAL, 'CONFIG.epsilon');
  [
    split.train_documents,
    split.validation_documents,
    split.train_contexts,
    split.validation_contexts,
    split.train_batches,
    split.train_evaluation_batches,
    split.validation_evaluation_batches,
  ].forEach((value, index) => patterned(value, INTEGER, `SPLIT.integer[${index}]`));

  return Object.freeze({
    config: Object.freeze({
      vocabulary: exact(config.vocabulary, '266', 'CONFIG.vocabulary'),
      merges: exact(config.merges, '8', 'CONFIG.merges'),
      context: exact(config.context, '2', 'CONFIG.context'),
      embedding: exact(config.embedding, '4', 'CONFIG.embedding'),
      concatenated: exact(config.concatenated, '8', 'CONFIG.concatenated'),
      swigluInner: exact(config.swiglu_inner, '8', 'CONFIG.swiglu_inner'),
      hidden: exact(config.hidden, '8', 'CONFIG.hidden'),
      parameters: exact(config.parameters, '3384', 'CONFIG.parameters'),
      batch: exact(config.batch, '64', 'CONFIG.batch'),
      evaluationBatch: exact(config.evaluation_batch, '512', 'CONFIG.evaluation_batch'),
      initSeed: exact(config.init_seed, '23', 'CONFIG.init_seed'),
      shuffleSeed: exact(config.shuffle_seed, '23', 'CONFIG.shuffle_seed'),
      maxSteps: exact(config.max_steps, '15', 'CONFIG.max_steps'),
      learningRate: exact(config.lr, '0.010000', 'CONFIG.lr'),
      beta1: exact(config.beta1, '0.900000', 'CONFIG.beta1'),
      beta2: exact(config.beta2, '0.999000', 'CONFIG.beta2'),
      epsilon: exact(config.epsilon, '0.000000010', 'CONFIG.epsilon'),
      weightDecay: exact(config.weight_decay, '0.010000', 'CONFIG.weight_decay'),
    }),
    split: Object.freeze({
      trainDocuments: exact(split.train_documents, '8', 'SPLIT.train_documents'),
      validationDocuments: exact(
        split.validation_documents,
        '2',
        'SPLIT.validation_documents',
      ),
      testTextUsed: exact(split.test_text_used, 'no', 'SPLIT.test_text_used') as 'no',
      trainContexts: exact(split.train_contexts, '1836', 'SPLIT.train_contexts'),
      validationContexts: exact(
        split.validation_contexts,
        '467',
        'SPLIT.validation_contexts',
      ),
      trainBatches: exact(split.train_batches, '29', 'SPLIT.train_batches'),
      trainEvaluationBatches: exact(
        split.train_evaluation_batches,
        '4',
        'SPLIT.train_evaluation_batches',
      ),
      validationEvaluationBatches: exact(
        split.validation_evaluation_batches,
        '1',
        'SPLIT.validation_evaluation_batches',
      ),
    }),
    stages: Object.freeze(stages),
    losses: Object.freeze(losses),
    result: Object.freeze({
      step: exact(result.step, '15', 'RESULT.step'),
      initialValidation: exact(
        result.initial_validation,
        '5.583482',
        'RESULT.initial_validation',
      ),
      finalValidation: exact(
        result.final_validation,
        '5.557362',
        'RESULT.final_validation',
      ),
      improvement: exact(result.improvement, '0.026120', 'RESULT.improvement'),
    }),
    generation: Object.freeze({
      prompt: exact(generation.prompt, 'At', 'GENERATE.prompt') as 'At',
      promptIds: parseVector(
        exact(generation.prompt_ids, '[67, 118]', 'GENERATE.prompt_ids'),
        'GENERATE.prompt_ids',
        INTEGER,
        2,
      ),
      ids: parseVector(
        exact(
          generation.ids,
          '[259, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211]',
          'GENERATE.ids',
        ),
        'GENERATE.ids',
        INTEGER,
        12,
      ),
      stop: exact(generation.stop, 'limit', 'GENERATE.stop') as 'limit',
    }),
    proof: Object.freeze({
      replay: exact(proof.replay, 'bitwise', 'PROOF.replay') as 'bitwise',
      testText: exact(
        proof.test_text,
        'not_encoded_or_scored',
        'PROOF.test_text',
      ) as 'not_encoded_or_scored',
      target: exact(proof.target, 'final_shifted', 'PROOF.target') as 'final_shifted',
      gradientL1: exact(
        proof.gradient_l1,
        'five_positive_finite',
        'PROOF.gradient_l1',
      ) as 'five_positive_finite',
      parameterNodes: exact(
        proof.parameter_nodes,
        'preserved',
        'PROOF.parameter_nodes',
      ) as 'preserved',
      gradients: exact(proof.gradients, 'cleared', 'PROOF.gradients') as 'cleared',
      generation: exact(
        proof.generation,
        'deterministic',
        'PROOF.generation',
      ) as 'deterministic',
    }),
  });
}

function assertText(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`invalid neural n-gram labels: ${path} must be non-empty text`);
  }
}

function assertKeys(
  value: unknown,
  path: string,
  expected: readonly string[],
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`invalid neural n-gram labels: ${path} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(
      `invalid neural n-gram labels: ${path} must contain exactly ${wanted.join(', ')}`,
    );
  }
}

export function assertNeuralNgramDiagramLabels(
  labels: NeuralNgramDiagramLabels,
): asserts labels is NeuralNgramDiagramLabels {
  const schema = {
    summary: ['model', 'data', 'optimizer'],
    stages: ['pipeline', 'checkpoints', 'result', 'generation', 'proof'],
    stageNames: ['context_ids', 'embeddings', 'concatenated', 'hidden', 'logits'],
    fields: [
      'shape',
      'values',
      'argmax',
      'argmaxLogit',
      'step',
      'trainLoss',
      'validationLoss',
      'initialValidation',
      'finalValidation',
      'improvement',
      'prompt',
      'promptIds',
      'generatedIds',
      'stop',
      'replay',
      'testText',
      'target',
      'gradientL1',
      'parameterNodes',
      'gradients',
      'generationPolicy',
    ],
    cues: ['input', 'learned', 'output', 'checkpoint', 'final'],
    notes: ['pipeline', 'checkpoints', 'generation'],
    captions: ['pipeline', 'checkpoints', 'proof'],
    scrollers: ['pipeline', 'generation'],
  } as const;
  assertKeys(labels, 'labels', ['title', 'description', ...Object.keys(schema)]);
  assertText(labels.title, 'labels.title');
  assertText(labels.description, 'labels.description');
  for (const [group, keys] of Object.entries(schema)) {
    const values: unknown = labels[group as keyof NeuralNgramDiagramLabels];
    assertKeys(values, `labels.${group}`, keys);
    for (const key of keys) assertText(values[key], `labels.${group}.${key}`);
  }
}
