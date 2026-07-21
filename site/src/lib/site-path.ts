const siteBaseSegmentPattern = /^[A-Za-z0-9._~-]+$/;

/** Validate the build-time URL prefix used by the static host. */
export function normalizeSiteBase(value: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Site base must be a non-empty absolute path.');
  }
  if (!value.startsWith('/') || value.includes('\\') || /[?#]/.test(value)) {
    throw new Error(
      'Site base must start with / and contain no query, fragment, or backslash.',
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
    throw new Error('Site base contains an unsafe path segment.');
  }

  const normalized = segments.length === 0 ? '/' : `/${segments.join('/')}/`;
  if (value !== normalized) {
    throw new Error(`Site base must use normalized directory syntax: ${normalized}`);
  }
  return normalized;
}

/** Prefix one site-root-relative route with a validated deployment base. */
export function sitePathForBase(path: string, base: string): string {
  const normalizedBase = normalizeSiteBase(base);
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\')
  ) {
    throw new Error('Site path must be one absolute-path reference.');
  }

  const suffixIndex = path.search(/[?#]/);
  const pathname = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : path.slice(suffixIndex);
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    throw new Error('Site path contains invalid percent encoding.');
  }
  if (
    decodedPathname.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('Site path may not contain dot segments.');
  }

  const relativePath = pathname === '/' ? '' : pathname.slice(1);
  return normalizedBase + relativePath + suffix;
}

/** Resolve a route against Astro's configured deployment base. */
export function sitePath(path = '/'): string {
  return sitePathForBase(path, import.meta.env.BASE_URL);
}
