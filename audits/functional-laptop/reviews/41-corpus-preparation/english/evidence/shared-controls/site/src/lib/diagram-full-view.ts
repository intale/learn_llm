export const DIAGRAM_SELECTOR = 'figure[data-visualization-id]';
export const DIAGRAM_FULL_VIEW_MEDIA = '(min-width: 64rem) and (min-height: 36rem)';

interface DiagramFullViewLabels {
  open: string;
  close: string;
}

interface DiagramControls {
  actions: HTMLDivElement;
  button: HTMLButtonElement;
  label: HTMLSpanElement;
}

interface DiagramState {
  figure: HTMLElement;
  controls: DiagramControls | null;
  failed: boolean;
}

function ensureFigureId(figure: HTMLElement, document: Document): string {
  if (figure.id) return figure.id;

  const visualizationId = figure.dataset.visualizationId ?? 'diagram';
  const stem = `course-diagram-${visualizationId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  let candidate = stem;
  let suffix = 2;
  while (document.getElementById(candidate)) {
    candidate = `${stem}-${suffix}`;
    suffix += 1;
  }
  figure.id = candidate;
  return candidate;
}

function readLabels(document: Document): DiagramFullViewLabels | null {
  const { diagramFullViewOpen, diagramFullViewClose } = document.documentElement.dataset;
  if (!diagramFullViewOpen?.trim() || !diagramFullViewClose?.trim()) return null;
  return {
    open: diagramFullViewOpen,
    close: diagramFullViewClose,
  };
}

export function initializeDiagramFullView(
  document: Document = window.document,
  view: Window = window,
): () => void {
  const labels = readLabels(document);
  const figures = Array.from(document.querySelectorAll<HTMLElement>(DIAGRAM_SELECTOR));
  if (!labels || figures.length === 0) return () => undefined;

  const media = view.matchMedia(DIAGRAM_FULL_VIEW_MEDIA);
  const states = figures.map<DiagramState>((figure) => ({
    figure,
    controls: null,
    failed: false,
  }));
  let returnFocus: HTMLElement | null = null;
  let returnFigure: HTMLElement | null = null;
  let animationFrame = 0;
  let destroyed = false;

  const removeControls = (state: DiagramState) => {
    state.controls?.actions.remove();
    state.controls = null;
    state.figure.classList.remove('diagram-full-view-capable');
  };

  const ensureControls = (state: DiagramState): DiagramControls => {
    if (state.controls) return state.controls;

    const actions = document.createElement('div');
    actions.className = 'diagram-full-view-actions';
    actions.dataset.diagramFullViewControls = '';

    const button = document.createElement('button');
    button.className = 'diagram-full-view-toggle';
    button.dataset.diagramFullViewToggle = '';
    button.type = 'button';
    button.setAttribute('aria-controls', ensureFigureId(state.figure, document));
    button.setAttribute('aria-expanded', 'false');

    const icon = document.createElement('span');
    icon.className = 'diagram-full-view-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⛶';

    const label = document.createElement('span');
    label.textContent = labels.open;

    button.append(icon, label);
    actions.append(button);
    const caption = state.figure.querySelector(':scope > figcaption');
    if (!caption) throw new Error('A registered course diagram must have one figcaption.');
    caption.after(actions);
    state.figure.classList.add('diagram-full-view-capable');
    state.controls = { actions, button, label };

    button.addEventListener('click', async () => {
      if (document.fullscreenElement === state.figure) {
        try {
          await document.exitFullscreen();
        } catch {
          scheduleUpdate();
        }
        return;
      }

      returnFocus = button;
      returnFigure = state.figure;
      try {
        await state.figure.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        state.failed = true;
        returnFocus = null;
        scheduleUpdate();
      }
    });

    return state.controls;
  };

  const update = () => {
    animationFrame = 0;
    const fullscreen = document.fullscreenElement;
    const canOpen =
      media.matches &&
      document.fullscreenEnabled &&
      typeof document.exitFullscreen === 'function';

    for (const state of states) {
      const active = fullscreen === state.figure;
      const controlHadFocus = document.activeElement === state.controls?.button;
      const eligible =
        active ||
        (canOpen &&
          !state.failed &&
          typeof state.figure.requestFullscreen === 'function');

      if (!eligible) {
        removeControls(state);
        if (controlHadFocus) {
          returnFocus = null;
          returnFigure = state.figure;
        }
        continue;
      }

      const controls = ensureControls(state);
      controls.button.setAttribute('aria-expanded', String(active));
      controls.button.setAttribute('aria-label', active ? labels.close : labels.open);
      if (active) controls.button.setAttribute('aria-keyshortcuts', 'Escape');
      else controls.button.removeAttribute('aria-keyshortcuts');
      controls.label.textContent = active ? labels.close : labels.open;
    }

    if (!fullscreen && (returnFocus || returnFigure)) {
      const target = returnFocus?.isConnected ? returnFocus : returnFigure;
      returnFocus = null;
      returnFigure = null;
      target?.focus();
    }
  };

  function scheduleUpdate() {
    if (destroyed || animationFrame !== 0) return;
    animationFrame = view.requestAnimationFrame(update);
  }

  const onFullscreenChange = () => {
    if (document.fullscreenElement && !media.matches) {
      void document.exitFullscreen().catch(() => undefined);
    }
    scheduleUpdate();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.key === 'Escape' &&
      states.some(({ figure }) => document.fullscreenElement === figure)
    ) {
      event.preventDefault();
      void document.exitFullscreen().catch(() => undefined);
    }
  };

  document.documentElement.dataset.diagramFullViewReady = 'true';
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('fullscreenerror', scheduleUpdate);
  document.addEventListener('keydown', onKeyDown, true);
  media.addEventListener('change', onFullscreenChange);

  update();

  return () => {
    destroyed = true;
    if (animationFrame !== 0) view.cancelAnimationFrame(animationFrame);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('fullscreenerror', scheduleUpdate);
    document.removeEventListener('keydown', onKeyDown, true);
    media.removeEventListener('change', onFullscreenChange);
    for (const state of states) removeControls(state);
    delete document.documentElement.dataset.diagramFullViewReady;
  };
}
