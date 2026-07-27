const variantRanges = Object.freeze({
  bold: { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
  italic: { upper: 0x1d434, lower: 0x1d44e },
  'bold-italic': { upper: 0x1d468, lower: 0x1d482 },
  script: { upper: 0x1d49c, lower: 0x1d4b6 },
  'bold-script': { upper: 0x1d4d0, lower: 0x1d4ea },
  fraktur: { upper: 0x1d504, lower: 0x1d51e },
  'double-struck': { upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8 },
  'bold-fraktur': { upper: 0x1d56c, lower: 0x1d586 },
  'sans-serif': { upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 },
  'sans-serif-bold': { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  'sans-serif-italic': { upper: 0x1d608, lower: 0x1d622 },
  'sans-serif-bold-italic': { upper: 0x1d63c, lower: 0x1d656 },
  monospace: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
});

const legacyCodePoints = Object.freeze({
  italic: Object.freeze({ h: 0x210e }),
  script: Object.freeze({
    B: 0x212c,
    E: 0x2130,
    F: 0x2131,
    H: 0x210b,
    I: 0x2110,
    L: 0x2112,
    M: 0x2133,
    R: 0x211b,
    e: 0x212f,
    g: 0x210a,
    o: 0x2134,
  }),
  fraktur: Object.freeze({
    C: 0x212d,
    H: 0x210c,
    I: 0x2111,
    R: 0x211c,
    Z: 0x2128,
  }),
  'double-struck': Object.freeze({
    C: 0x2102,
    H: 0x210d,
    N: 0x2115,
    P: 0x2119,
    Q: 0x211a,
    R: 0x211d,
    Z: 0x2124,
  }),
});

function mapAsciiMathematicalCharacter(character, variant) {
  const range = variantRanges[variant];
  if (!range) {
    throw new Error(`Unsupported MathML mathvariant "${variant}".`);
  }

  const legacy = legacyCodePoints[variant]?.[character];
  if (legacy !== undefined) return String.fromCodePoint(legacy);

  const codePoint = character.codePointAt(0);
  if (codePoint >= 0x41 && codePoint <= 0x5a && range.upper !== undefined) {
    return String.fromCodePoint(range.upper + codePoint - 0x41);
  }
  if (codePoint >= 0x61 && codePoint <= 0x7a && range.lower !== undefined) {
    return String.fromCodePoint(range.lower + codePoint - 0x61);
  }
  if (codePoint >= 0x30 && codePoint <= 0x39 && range.digit !== undefined) {
    return String.fromCodePoint(range.digit + codePoint - 0x30);
  }
  if (/^[A-Za-z0-9]$/.test(character) || /[\p{L}\p{N}]/u.test(character)) {
    throw new Error(
      `MathML mathvariant "${variant}" cannot map character "${character}".`,
    );
  }
  return character;
}

export function mathematicalAlphanumericText(value, variant) {
  if (typeof value !== 'string') {
    throw new TypeError('MathML variant text must be a string.');
  }
  if (typeof variant !== 'string' || variant === '' || variant === 'normal') {
    throw new Error('A non-normal MathML mathvariant is required.');
  }
  return [...value]
    .map((character) => mapAsciiMathematicalCharacter(character, variant))
    .join('');
}

function mathVariantProperty(properties) {
  if (Object.hasOwn(properties, 'mathvariant')) return 'mathvariant';
  if (Object.hasOwn(properties, 'mathVariant')) return 'mathVariant';
  return null;
}

function normalizeVariantElement(node) {
  const properties = node.properties ?? {};
  const property = mathVariantProperty(properties);
  if (!property) return;

  const variant = properties[property];
  if (variant === 'normal') {
    if (node.tagName !== 'mi') delete properties[property];
    node.properties = properties;
    return;
  }
  if (typeof variant !== 'string') {
    throw new Error(`MathML <${node.tagName}> has a non-string mathvariant.`);
  }
  if (
    !Array.isArray(node.children) ||
    node.children.length !== 1 ||
    node.children[0]?.type !== 'text'
  ) {
    throw new Error(
      `MathML <${node.tagName}> with mathvariant "${variant}" must contain one text node.`,
    );
  }

  node.children[0].value = mathematicalAlphanumericText(
    node.children[0].value,
    variant,
  );
  delete properties[property];
  node.properties = properties;
}

export function rehypeMathmlCompatibility() {
  return (tree) => {
    const pending = [tree];
    while (pending.length > 0) {
      const node = pending.pop();
      if (node?.type === 'element') normalizeVariantElement(node);
      if (Array.isArray(node?.children)) pending.push(...node.children);
    }
  };
}

const variantElementPattern =
  /<([a-z][\w:-]*)([^<>]*?)\s+mathvariant=(['"])([^'"<>]+)\3([^<>]*)>([^<>]*)<\/\1>/giu;
const variantTagPattern =
  /<([a-z][\w:-]*)\b[^>]*\bmathvariant\s*=\s*(['"])([^'"]+)\2[^>]*>/giu;

export function normalizeMathmlVariantsInHtml(html) {
  if (typeof html !== 'string') {
    throw new TypeError('Rendered math HTML must be a string.');
  }

  const normalized = html.replace(
    variantElementPattern,
    (element, tagName, before, _quote, variant, after, text) => {
      if (variant === 'normal') {
        return tagName.toLowerCase() === 'mi'
          ? element
          : `<${tagName}${before}${after}>${text}</${tagName}>`;
      }
      const mapped = mathematicalAlphanumericText(text, variant);
      return `<${tagName}${before}${after}>${mapped}</${tagName}>`;
    },
  );

  const remaining = [...normalized.matchAll(variantTagPattern)].find(
    (match) => match[1].toLowerCase() !== 'mi' || match[3] !== 'normal',
  );
  if (remaining) {
    throw new Error(
      `Rendered MathML contains an unnormalized mathvariant "${remaining[3]}" on <${remaining[1]}>.`,
    );
  }
  return normalized;
}
