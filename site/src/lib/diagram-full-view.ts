export const DIAGRAM_SELECTOR = 'figure[data-visualization-id]';
export const DIAGRAM_FULL_VIEW_MEDIA = '(min-width: 64rem) and (min-height: 36rem)';
export const MATERIAL_OVERFLOW_PX = 64;
export const MATERIAL_OVERFLOW_RATIO = 0.125;
export const MINIMUM_FULLSCREEN_GAIN_PX = 64;

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

export function hasMaterialHorizontalOverflow(
  clientWidth: number,
  scrollWidth: number,
  threshold = MATERIAL_OVERFLOW_PX,
): boolean {
  return (
    Number.isFinite(clientWidth) &&
    Number.isFinite(scrollWidth) &&
    clientWidth > 0 &&
    scrollWidth - clientWidth >= Math.max(threshold, clientWidth * MATERIAL_OVERFLOW_RATIO)
  );
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

function horizontalScrollOwners(figure: HTMLElement, view: Window): HTMLElement[] {
  return [figure, ...figure.querySelectorAll<HTMLElement>('*')].filter((element) => {
    const { overflowX } = view.getComputedStyle(element);
    return (
      ['auto', 'scroll'].includes(overflowX) &&
      hasMaterialHorizontalOverflow(element.clientWidth, element.scrollWidth)
    );
  });
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
      try {
        if (document.fullscreenElement === state.figure) {
          await document.exitFullscreen();
          return;
        }
        returnFocus = button;
        returnFigure = state.figure;
        await state.figure.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        state.failed = true;
        returnFocus = null;
        returnFigure = null;
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
      state.figure
        .querySelectorAll<HTMLElement>('[data-diagram-full-view-scroll-owner]')
        .forEach((owner) => delete owner.dataset.diagramFullViewScrollOwner);

      const active = fullscreen === state.figure;
      const owners = horizontalScrollOwners(state.figure, view);
      const fullscreenContentWidth = Math.max(0, view.innerWidth - 48);
      const offersUsefulWidth =
        fullscreenContentWidth - state.figure.clientWidth >= MINIMUM_FULLSCREEN_GAIN_PX;
      const eligible =
        active ||
        (canOpen &&
          !state.failed &&
          offersUsefulWidth &&
          typeof state.figure.requestFullscreen === 'function' &&
          owners.length > 0);

      if (!eligible) {
        removeControls(state);
        continue;
      }

      for (const owner of owners) owner.dataset.diagramFullViewScrollOwner = 'true';
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
  view.addEventListener('resize', scheduleUpdate, { passive: true });

  const ResizeObserverConstructor = (
    view as Window & { ResizeObserver?: typeof ResizeObserver }
  ).ResizeObserver;
  const resizeObserver =
    typeof ResizeObserverConstructor === 'function'
      ? new ResizeObserverConstructor(scheduleUpdate)
      : null;
  for (const state of states) resizeObserver?.observe(state.figure);

  void document.fonts.ready.then(scheduleUpdate);

  update();

  return () => {
    destroyed = true;
    if (animationFrame !== 0) view.cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('fullscreenerror', scheduleUpdate);
    document.removeEventListener('keydown', onKeyDown, true);
    media.removeEventListener('change', onFullscreenChange);
    view.removeEventListener('resize', scheduleUpdate);
    for (const state of states) removeControls(state);
    delete document.documentElement.dataset.diagramFullViewReady;
  };
}
