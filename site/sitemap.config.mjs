export const DEFAULT_SITE_ORIGIN = 'https://intale.github.io';
export const MAX_SITEMAP_URLS = 50_000;

const siteBaseSegmentPattern = /^[A-Za-z0-9._~-]+$/;
const sitemapRoutePattern = /^\/(?:[A-Za-z0-9._~-]+\/)+$/;

/** Normalize the public HTTPS origin used in absolute sitemap URLs. */
export function normalizeSiteOrigin(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new Error('SITE_ORIGIN must be a non-empty HTTPS origin.');
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('SITE_ORIGIN must be a valid absolute URL.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('SITE_ORIGIN must use HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('SITE_ORIGIN must not contain credentials.');
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('SITE_ORIGIN must contain only an origin, without a path, query, or fragment.');
  }
  return parsed.origin;
}

/** Normalize the build-time path prefix reused by sitemap URLs. */
export function normalizeSitemapBase(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Sitemap base must be a non-empty absolute path.');
  }
  if (!value.startsWith('/') || value.includes('\\') || /[?#]/.test(value)) {
    throw new Error(
      'Sitemap base must start with / and contain no query, fragment, or backslash.',
    );
  }

  const segments = value.split('/').filter(Boolean);
  if (
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        !siteBaseSegmentPattern.test(segment),
    )
  ) {
    throw new Error('Sitemap base contains an unsafe path segment.');
  }

  const normalized = segments.length === 0 ? '/' : `/${segments.join('/')}/`;
  if (value !== normalized) {
    throw new Error(`Sitemap base must use normalized directory syntax: ${normalized}`);
  }
  return normalized;
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

/** Render the complete deterministic sitemap document. */
export function renderSitemapXml(routes, origin, base) {
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error('Sitemap routes must be a non-empty array.');
  }
  if (routes.length > MAX_SITEMAP_URLS) {
    throw new Error(`Sitemap may contain at most ${MAX_SITEMAP_URLS} URLs.`);
  }

  const normalizedOrigin = normalizeSiteOrigin(origin);
  const normalizedBase = normalizeSitemapBase(base);
  const normalizedRoutes = routes.map(normalizeSitemapRoute);
  if (new Set(normalizedRoutes).size !== normalizedRoutes.length) {
    throw new Error('Sitemap routes must be unique.');
  }
  normalizedRoutes.sort(compareRoutes);

  const entries = normalizedRoutes.map((route) => {
    const path = normalizedBase + (route === '/' ? '' : route.slice(1));
    const absoluteUrl = new URL(path, normalizedOrigin).href;
    return `  <url><loc>${escapeXml(absoluteUrl)}</loc></url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
