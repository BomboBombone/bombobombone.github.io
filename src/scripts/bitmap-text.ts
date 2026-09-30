type Glyph = { codePoint: number; x: number; y: number; rows: number[] };
type TextRun = {
  node: Text;
  color: string;
  fontSize: number;
  fontWeight: number;
  textTransform: string;
  opacity: number;
};

const ACTIVE_CLASS = 'bitmap-text-native';
const LAYER_CLASS = 'bitmap-text-layer';
const FONT_URL = '/fonts/spleen-8x16.bdf';
const GLYPH_WIDTH = 8;
const GLYPH_HEIGHT = 16;
const ATLAS_COLUMNS = 32;

function parseBitmapFont(source: string): { glyphs: Map<number, Glyph>; height: number } {
  const glyphs = new Map<number, Glyph>();
  let codePoint = -1;
  let rows: number[] = [];
  let inBitmap = false;

  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith('ENCODING ')) {
      codePoint = Number(line.slice(9));
    } else if (line === 'BITMAP') {
      rows = [];
      inBitmap = true;
    } else if (inBitmap && /^[0-9A-F]+$/i.test(line)) {
      rows.push(Number.parseInt(line, 16));
    } else if (line === 'ENDCHAR') {
      if (codePoint >= 0 && rows.length === GLYPH_HEIGHT) {
        const index = glyphs.size;
        glyphs.set(codePoint, {
          codePoint,
          x: (index % ATLAS_COLUMNS) * GLYPH_WIDTH,
          y: Math.floor(index / ATLAS_COLUMNS) * GLYPH_HEIGHT,
          rows,
        });
      }
      codePoint = -1;
      inBitmap = false;
    }
  }

  return { glyphs, height: Math.ceil(glyphs.size / ATLAS_COLUMNS) * GLYPH_HEIGHT };
}

function makeAtlas(glyphs: Map<number, Glyph>, height: number, bold: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLUMNS * GLYPH_WIDTH;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D is unavailable');

  const image = context.createImageData(canvas.width, canvas.height);
  for (const glyph of glyphs.values()) {
    for (let y = 0; y < GLYPH_HEIGHT; y += 1) {
      for (let x = 0; x < GLYPH_WIDTH; x += 1) {
        if (!(glyph.rows[y] & (1 << (GLYPH_WIDTH - x - 1)))) continue;
        const atlasX = glyph.x + x;
        const atlasY = glyph.y + y;
        const startX = bold ? Math.max(glyph.x, atlasX - 1) : atlasX;
        const endX = bold ? Math.min(glyph.x + GLYPH_WIDTH - 1, atlasX + 1) : atlasX;
        for (let px = startX; px <= endX; px += 1) {
          const offset = (atlasY * canvas.width + px) * 4;
          image.data[offset] = 255;
          image.data[offset + 1] = 255;
          image.data[offset + 2] = 255;
          image.data[offset + 3] = 255;
        }
      }
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function getRuns(glyphs: Map<number, Glyph>): { runs: TextRun[]; fallbackParents: Set<HTMLElement> } {
  const runs: TextRun[] = [];
  const fallbackParents = new Set<HTMLElement>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;

  while (node) {
    const value = node.data;
    const parent = node.parentElement;
    if (!parent || !value.trim() || parent.closest('script,style,noscript,textarea,input,select,option,.sr-only,[hidden],[data-bitmap-ignore]')) {
      node = walker.nextNode() as Text | null;
      continue;
    }

    const style = getComputedStyle(parent);
    const visibleText = transformText(value, style.textTransform);
    if ([...visibleText].some((character) => !/^\s$/u.test(character) && !glyphs.has(character.codePointAt(0)!))) {
      fallbackParents.add(parent);
      node = walker.nextNode() as Text | null;
      continue;
    }

    const fontSize = Number.parseFloat(style.fontSize);
    if (fontSize > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
      runs.push({
        node,
        color: style.color,
        fontSize,
        fontWeight: Number.parseInt(style.fontWeight, 10) || 400,
        textTransform: style.textTransform,
        opacity: getOpacity(parent),
      });
    }
    node = walker.nextNode() as Text | null;
  }

  return { runs, fallbackParents };
}

function getOpacity(element: HTMLElement): number {
  let opacity = 1;
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    const value = Number.parseFloat(getComputedStyle(current).opacity);
    opacity *= Number.isFinite(value) ? value : 1;
    current = current.parentElement;
  }
  return opacity;
}

function transformCharacters(value: string, transform: string): string[] {
  let capitalizeNext = true;
  return [...value].map((character) => {
    if (transform === 'uppercase') return character.toLocaleUpperCase();
    if (transform === 'lowercase') return character.toLocaleLowerCase();
    if (transform !== 'capitalize') return character;
    if (/\p{L}/u.test(character)) {
      const output = capitalizeNext ? character.toLocaleUpperCase() : character;
      capitalizeNext = false;
      return output;
    }
    if (/[\s\-_]/u.test(character) || character === '\u2014') capitalizeNext = true;
    return character;
  });
}

function transformText(value: string, transform: string): string {
  if (transform === 'uppercase') return value.toLocaleUpperCase();
  if (transform === 'lowercase') return value.toLocaleLowerCase();
  if (transform !== 'capitalize') return value;
  return value.replace(/(^|[\s\-_]|\u2014)([\p{L}])/gu, (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase()}`);
}

function getClipRect(node: Text): DOMRect | undefined {
  let left = 0;
  let top = 0;
  let right = window.innerWidth;
  let bottom = window.innerHeight;
  let current = node.parentElement;
  while (current && current !== document.body) {
    const style = getComputedStyle(current);
    if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) {
      const rect = current.getBoundingClientRect();
      left = Math.max(left, rect.left + current.clientLeft);
      right = Math.min(right, rect.left + current.clientLeft + current.clientWidth);
    }
    if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) {
      const rect = current.getBoundingClientRect();
      top = Math.max(top, rect.top + current.clientTop);
      bottom = Math.min(bottom, rect.top + current.clientTop + current.clientHeight);
    }
    current = current.parentElement;
  }
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

export async function installBitmapText(): Promise<void> {
  if (matchMedia('(forced-colors: active)').matches || !CSS.supports('-webkit-text-fill-color', 'transparent')) return;

  let response: Response;
  try {
    response = await fetch(new URL(FONT_URL, document.baseURI));
    if (!response.ok) return;
  } catch {
    return;
  }

  await document.fonts.ready;
  const { glyphs, height } = parseBitmapFont(await response.text());
  if (!glyphs.size) return;

  const normalAtlas = makeAtlas(glyphs, height, false);
  const boldAtlas = makeAtlas(glyphs, height, true);
  const tintedAtlases = new Map<string, HTMLCanvasElement>();
  const getAtlas = (color: string, bold: boolean): HTMLCanvasElement => {
    const key = `${bold ? 'bold' : 'normal'}:${color}`;
    let atlas = tintedAtlases.get(key);
    if (atlas) return atlas;
    atlas = document.createElement('canvas');
    atlas.width = normalAtlas.width;
    atlas.height = normalAtlas.height;
    const context = atlas.getContext('2d');
    if (!context) return bold ? boldAtlas : normalAtlas;
    context.fillStyle = color;
    context.fillRect(0, 0, atlas.width, atlas.height);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(bold ? boldAtlas : normalAtlas, 0, 0);
    tintedAtlases.set(key, atlas);
    return atlas;
  };

  const layer = document.createElement('canvas');
  layer.className = LAYER_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('role', 'presentation');
  const context = layer.getContext('2d');
  if (!context) return;

  let runs: TextRun[] = [];
  let fallbackParents = new Set<HTMLElement>();
  let redrawQueued = false;
  let selectionActive = false;
  let bitmapPaintReady = false;
  const body = document.body;

  const refreshRuns = (): void => {
    for (const parent of fallbackParents) parent.removeAttribute('data-bitmap-fallback');
    const next = getRuns(glyphs);
    runs = next.runs;
    fallbackParents = next.fallbackParents;
    for (const parent of fallbackParents) parent.setAttribute('data-bitmap-fallback', '');
  };

  const syncLayer = (): void => {
    const openDialog = document.querySelector<HTMLDialogElement>('dialog[open]');
    const destination: HTMLElement = openDialog || body;
    if (layer.parentElement !== destination) destination.append(layer);
  };

  const render = (): void => {
    redrawQueued = false;
    syncLayer();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.ceil(window.innerWidth * ratio));
    const height = Math.max(1, Math.ceil(window.innerHeight * ratio));
    if (layer.width !== width || layer.height !== height) {
      layer.width = width;
      layer.height = height;
      layer.style.width = `${window.innerWidth}px`;
      layer.style.height = `${window.innerHeight}px`;
    }
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;

    const pixelRatio = ratio;
    const range = document.createRange();
    const clipCache = new Map<Text, DOMRect | undefined>();
    for (const run of runs) {
      if (!run.node.isConnected || !run.node.parentElement || run.opacity <= 0) continue;
      let clip = clipCache.get(run.node);
      if (!clipCache.has(run.node)) {
        clip = getClipRect(run.node);
        clipCache.set(run.node, clip);
      }
      if (!clip || clip.width <= 0 || clip.height <= 0) continue;

      const atlas = getAtlas(run.color, run.fontWeight >= 600);
      const size = run.fontSize;
      const destWidth = Math.max(1, Math.round(size * 0.5 * pixelRatio));
      const destHeight = Math.max(1, Math.round(size * pixelRatio));
      const value = run.node.data;
      let offset = 0;
      const transformedCharacters = transformCharacters(value, run.textTransform);
      context.globalAlpha = run.opacity;

      let characterIndex = 0;
      for (const character of value) {
        const endOffset = offset + character.length;
        range.setStart(run.node, offset);
        range.setEnd(run.node, endOffset);
        const rect = range.getBoundingClientRect();
        const painted = transformedCharacters[characterIndex] || character;
        const paintedCharacters = [...painted];
        for (let expansionIndex = 0; expansionIndex < paintedCharacters.length; expansionIndex += 1) {
          const glyph = glyphs.get(paintedCharacters[expansionIndex].codePointAt(0)!);
          if (!glyph || character.trim() === '' || rect.width <= 0) continue;
          const x = rect.left + expansionIndex * size * 0.5;
          if (x + size * 0.5 < clip.left || x > clip.right || rect.bottom < clip.top || rect.top > clip.bottom) continue;
          const lineTop = rect.top + (rect.height - size) / 2;
          const y = lineTop - size * 0.25;
          context.drawImage(
            atlas,
            glyph.x,
            glyph.y,
            GLYPH_WIDTH,
            GLYPH_HEIGHT,
            Math.round(x * pixelRatio),
            Math.round(y * pixelRatio),
            destWidth,
            destHeight,
          );
        }
        offset = endOffset;
        characterIndex += 1;
      }
    }
    context.globalAlpha = 1;
    if (!bitmapPaintReady) {
      bitmapPaintReady = true;
      if (!selectionActive) {
        body.classList.add(ACTIVE_CLASS);
        scheduleRender();
      }
    }
  };

  const scheduleRender = (): void => {
    if (redrawQueued) return;
    redrawQueued = true;
    requestAnimationFrame(render);
  };

  refreshRuns();
  body.append(layer);
  scheduleRender();

  const observer = new MutationObserver(() => {
    refreshRuns();
    scheduleRender();
  });
  observer.observe(body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'open'] });

  window.addEventListener('resize', () => { refreshRuns(); scheduleRender(); }, { passive: true });
  window.addEventListener('scroll', scheduleRender, { capture: true, passive: true });
  document.addEventListener('click', scheduleRender, true);
  document.addEventListener('pointerover', () => { refreshRuns(); scheduleRender(); }, true);
  document.addEventListener('pointerout', () => { refreshRuns(); scheduleRender(); }, true);
  document.addEventListener('focusin', () => { refreshRuns(); scheduleRender(); }, true);
  document.addEventListener('focusout', () => { refreshRuns(); scheduleRender(); }, true);

  document.addEventListener('selectionchange', () => {
    const hasSelection = Boolean(document.getSelection() && !document.getSelection()?.isCollapsed);
    if (hasSelection === selectionActive) return;
    selectionActive = hasSelection;
    layer.style.display = selectionActive ? 'none' : 'block';
    if (selectionActive) body.classList.remove(ACTIVE_CLASS);
    else {
      refreshRuns();
      scheduleRender();
    }
  });

  window.addEventListener('beforeprint', () => {
    body.classList.remove(ACTIVE_CLASS);
    layer.style.display = 'none';
  });
  window.addEventListener('afterprint', () => {
    layer.style.display = 'block';
    refreshRuns();
    scheduleRender();
  });
}
