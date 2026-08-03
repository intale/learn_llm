export const COLOR_THEMES = ['light', 'dark'] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];

export const THEME_STORAGE_KEY = 'learn-llm-color-theme';
export const DARK_THEME_MEDIA = '(prefers-color-scheme: dark)';

export function isColorTheme(value: unknown): value is ColorTheme {
  return COLOR_THEMES.includes(value as ColorTheme);
}

export function resolveColorTheme(
  storedTheme: unknown,
  prefersDark: boolean,
): ColorTheme {
  if (isColorTheme(storedTheme)) return storedTheme;
  return prefersDark ? 'dark' : 'light';
}

export function readStoredTheme(
  storage: Pick<Storage, 'getItem'> | null,
  storageKey = THEME_STORAGE_KEY,
): ColorTheme | null {
  if (!storage) return null;
  try {
    const storedTheme = storage.getItem(storageKey);
    return isColorTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function browserStorage(browserWindow: Window): Storage | null {
  try {
    return browserWindow.localStorage;
  } catch {
    return null;
  }
}

function storeTheme(
  storage: Pick<Storage, 'setItem'> | null,
  storageKey: string,
  theme: ColorTheme,
) {
  if (!storage) return;
  try {
    storage.setItem(storageKey, theme);
  } catch {
    // The visual switch still works for this page when persistence is blocked.
  }
}

export function initializeThemeToggle(
  documentObject: Document = document,
  browserWindow: Window = window,
) {
  const root = documentObject.documentElement;
  const storageKey = root.dataset.themeStorageKey;
  if (storageKey !== THEME_STORAGE_KEY) return;

  const toggles = Array.from(
    documentObject.querySelectorAll<HTMLButtonElement>('button[data-theme-toggle]'),
  );
  if (toggles.length === 0) return;

  const media = browserWindow.matchMedia(DARK_THEME_MEDIA);
  const storage = browserStorage(browserWindow);
  let storedTheme = readStoredTheme(storage, storageKey);
  let currentTheme = resolveColorTheme(
    isColorTheme(root.dataset.theme) ? root.dataset.theme : storedTheme,
    media.matches,
  );

  const applyTheme = (theme: ColorTheme) => {
    currentTheme = theme;
    root.dataset.theme = theme;
    for (const toggle of toggles) {
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  };

  applyTheme(currentTheme);
  for (const toggle of toggles) {
    if (toggle.dataset.themeToggleReady === 'true') continue;
    toggle.dataset.themeToggleReady = 'true';
    toggle.addEventListener('click', () => {
      storedTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(storedTheme);
      storeTheme(storage, storageKey, storedTheme);
    });
    toggle.hidden = false;
  }

  media.addEventListener('change', (event) => {
    if (storedTheme === null) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });

  browserWindow.addEventListener('storage', (event) => {
    if (storage && event.storageArea && event.storageArea !== storage) return;
    if (event.key !== null && event.key !== storageKey) return;
    if (event.key === null || event.newValue === null) {
      storedTheme = null;
      applyTheme(media.matches ? 'dark' : 'light');
      return;
    }
    if (!isColorTheme(event.newValue)) return;
    storedTheme = event.newValue;
    applyTheme(storedTheme);
  });
}
