// Shared existing course JSON-frontmatter reader; validation semantics unchanged.
export class ContentValidationError extends Error {
  constructor(issues, heading = 'Content validation failed') {
    super(heading + ':\n- ' + issues.join('\n- '));
    this.name = 'ContentValidationError';
    this.issues = issues;
  }
}


function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseJsonFrontmatter(source, sourceName = 'document') {
  const normalized = source.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    throw new ContentValidationError([
      sourceName +
        ': expected JSON-shaped YAML frontmatter between opening and closing --- lines',
    ]);
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (error) {
    throw new ContentValidationError([
      sourceName +
        ': frontmatter must be valid JSON (which is also valid YAML): ' +
        error.message,
    ]);
  }

  if (!isObject(data)) {
    throw new ContentValidationError([sourceName + ': frontmatter root must be an object']);
  }

  return {
    data,
    body: normalized.slice(match[0].length),
  };
}
