export const DEFAULT_SITE_URL = 'https://intale.github.io/learn_llm/';
export const SITEMAP_NAMESPACE =
  'http://www.sitemaps.org/schemas/sitemap/0.9';
export const MAX_SITEMAP_URLS = 50_000;
export const MAX_SITEMAP_URL_LENGTH = 2_047;
export const MAX_SITEMAP_BYTES = 52_428_800;

const githubPagesAccountHost = 'intale.github.io';
const githubPagesProjectPath = '/learn_llm/';
const siteUrlPathSegmentPattern = /^[A-Za-z0-9._~-]+$/;
const sitemapRoutePattern = /^\/(?:[A-Za-z0-9._~-]+\/)+$/;

/** Normalize the complete public HTTPS base URL used by sitemap entries. */
export function normalizeSiteUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new Error('SITE_URL must be a non-empty HTTPS site URL.');
  }
  if (value.includes('\\')) {
    throw new Error('SITE_URL must not contain a backslash.');
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('SITE_URL must be a valid absolute URL.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('SITE_URL must use HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('SITE_URL must not contain credentials.');
  }
  if (parsed.search || parsed.hash) {
    throw new Error('SITE_URL must not contain a query or fragment.');
  }

  const authorityStart = value.indexOf('://') + 3;
  const pathStart = value.indexOf('/', authorityStart);
  const rawPath = pathStart === -1 ? '/' : value.slice(pathStart);
  const segments = rawPath.split('/').filter(Boolean);
  if (
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        !siteUrlPathSegmentPattern.test(segment),
    )
  ) {
    throw new Error('SITE_URL contains an unsafe path segment.');
  }

  const normalizedPath = segments.length === 0 ? '/' : `/${segments.join('/')}/`;
  const pathWithoutOptionalTrailingSlash = rawPath.endsWith('/')
    ? rawPath.slice(0, -1) || '/'
    : rawPath;
  if (
    pathWithoutOptionalTrailingSlash !==
    (normalizedPath === '/' ? '/' : normalizedPath.slice(0, -1))
  ) {
    throw new Error(`SITE_URL must use normalized directory syntax: ${normalizedPath}`);
  }
  if (
    parsed.hostname === githubPagesAccountHost &&
    (parsed.port !== '' || normalizedPath !== githubPagesProjectPath)
  ) {
    throw new Error(
      `SITE_URL on ${githubPagesAccountHost} must identify ${githubPagesProjectPath}, not the account root or another project.`,
    );
  }
  return parsed.origin + normalizedPath;
}

/** Normalize one logical directory route emitted by the static site. */
export function normalizeSitemapRoute(value) {
  if (value === '/') return value;
  const segments =
    typeof value === 'string' ? value.split('/').filter(Boolean) : [];
  if (
    typeof value !== 'string' ||
    !sitemapRoutePattern.test(value) ||
    segments.some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error(
      'Sitemap routes must be / or normalized absolute directory routes.',
    );
  }
  return value;
}

function compareRoutes(left, right) {
  if (left === right) return 0;
  if (left === '/') return -1;
  if (right === '/') return 1;
  return left < right ? -1 : 1;
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Enforce the Sitemap protocol's uncompressed UTF-8 document limit. */
export function assertSitemapByteLimit(
  source,
  maximumBytes = MAX_SITEMAP_BYTES,
) {
  if (typeof source !== 'string') {
    throw new Error('Sitemap source must be a string.');
  }
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error('Sitemap byte limit must be a positive safe integer.');
  }

  const byteLength = new TextEncoder().encode(source).byteLength;
  if (byteLength > maximumBytes) {
    throw new Error(
      `Sitemap may contain at most ${maximumBytes} uncompressed UTF-8 bytes.`,
    );
  }
  return byteLength;
}

/** Render the complete deterministic sitemap document. */
export function renderSitemapXml(routes, siteUrl) {
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error('Sitemap routes must be a non-empty array.');
  }
  if (routes.length > MAX_SITEMAP_URLS) {
    throw new Error(`Sitemap may contain at most ${MAX_SITEMAP_URLS} URLs.`);
  }

  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const normalizedRoutes = routes.map(normalizeSitemapRoute);
  if (new Set(normalizedRoutes).size !== normalizedRoutes.length) {
    throw new Error('Sitemap routes must be unique.');
  }
  normalizedRoutes.sort(compareRoutes);

  const entries = normalizedRoutes.map((route) => {
    const relativeRoute = route === '/' ? '' : route.slice(1);
    const absoluteUrl = new URL(relativeRoute, normalizedSiteUrl).href;
    if (absoluteUrl.length > MAX_SITEMAP_URL_LENGTH) {
      throw new Error(
        `Sitemap locations may contain at most ${MAX_SITEMAP_URL_LENGTH} characters.`,
      );
    }
    return `  <url><loc>${escapeXml(absoluteUrl)}</loc></url>`;
  });

  const source = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_NAMESPACE}">`,
    ...entries,
    '</urlset>',
  ].join('');
  assertSitemapByteLimit(source);
  return source;
}
