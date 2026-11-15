// Small UI helpers shared by all screens.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function render(html) {
  const app = document.getElementById('app');
  app.innerHTML = html;
  window.scrollTo(0, 0);
  return app;
}

export function toast(text, kind = '') {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), 2200);
}

export function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { return null; }
  return value;
}

export function statCard(cls, label, value, bar) {
  return `<div class="stat ${cls}"><div class="label">${label}</div><div class="value">${value}</div>${
    bar === undefined ? '' : `<div class="bar"><div style="width:${Math.round(Math.max(0, Math.min(1, bar)) * 100)}%"></div></div>`}</div>`;
}

export function warningsHtml(warnings) {
  if (!warnings.length) return '<div class="warn ok">✅ Everything looks good!</div>';
  return warnings.map(w => `<div class="warn ${w.level}">${w.level === 'stop' ? '⛔' : w.level === 'warn' ? '⚠️' : '💡'} ${w.text}</div>`).join('');
}

export function modal(html) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="card modal">${html}</div>`;
  document.body.appendChild(back);
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  return back;
}

// ---------- Traced emojis ----------
// Every emoji is drawn as a thin line tracing, in the colour of the text around it.
// Set TRACE_EMOJI to false to bring back the normal colour emojis.
export const TRACE_EMOJI = true;
const EMOJI_RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/gu;
const HAS_EMOJI = /\p{Extended_Pictographic}/u;

// SVG filters: outline of the shape + the lines inside it, painted in one colour.
function traceFilter(id, color, radius) {
  return `<filter id="${id}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
    <feMorphology in="SourceAlpha" operator="dilate" radius="${radius}" result="grow"/>
    <feComposite in="grow" in2="SourceAlpha" operator="out" result="ring"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .3 .59 .11 0 0" result="lum"/>
    <feConvolveMatrix in="lum" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="false" result="edge"/>
    <feComponentTransfer in="edge" result="edgeT"><feFuncA type="linear" slope="5" intercept="-0.35"/></feComponentTransfer>
    <feComposite in="edgeT" in2="SourceAlpha" operator="in" result="inner"/>
    <feMerge result="lines"><feMergeNode in="ring"/><feMergeNode in="inner"/></feMerge>
    <feFlood flood-color="${color}"/>
    <feComposite in2="lines" operator="in"/>
  </filter>`;
}

function wrapEmojis(node) {
  if (node.nodeType === 3) {
    const p = node.parentElement;
    if (!p || p.closest('.ico, script, style, textarea, code') || !HAS_EMOJI.test(node.nodeValue)) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    node.nodeValue.replace(EMOJI_RE, (m, i) => {
      if (i > last) frag.appendChild(document.createTextNode(node.nodeValue.slice(last, i)));
      const s = document.createElement('span'); s.className = 'ico'; s.textContent = m; frag.appendChild(s);
      last = i + m.length; return m;
    });
    if (last < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
    node.replaceWith(frag);
  } else if (node.nodeType === 1 && !node.matches('.ico, script, style, textarea, code')) {
    [...node.childNodes].forEach(wrapEmojis);
  }
}

if (TRACE_EMOJI && typeof document !== 'undefined') {
  document.body.classList.add('trace');
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    ${traceFilter('tr-sand', '#f6ead2', 0.8)}${traceFilter('tr-ink', '#3e2412', 0.8)}${traceFilter('tr-gold', '#ffd98a', 0.8)}${traceFilter('tr-white', '#ffffff', 0.8)}
    ${traceFilter('tr-canvas', '#f6ead2', 1.6)}</defs></svg>`);
  new MutationObserver(list => {
    for (const m of list) m.addedNodes.forEach(n => { if (n.isConnected) wrapEmojis(n); });
  }).observe(document.body, { childList: true, subtree: true });
  wrapEmojis(document.body);

  // Canvas: an emoji on its own is drawn as a tracing; emojis inside a sentence are left out.
  const fillText = CanvasRenderingContext2D.prototype.fillText;
  const traceCache = new Map();
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    text = String(text);
    if (!HAS_EMOJI.test(text)) return fillText.call(this, text, x, y, maxWidth);
    const words = text.replace(EMOJI_RE, '').trim();
    if (words) return fillText.call(this, words, x, y, maxWidth);
    // Filters are slow, so each traced emoji is drawn once into a small canvas and reused.
    const size = Math.round(parseFloat((this.font.match(/([\d.]+)px/) || [0, 30])[1]));
    const key = `${size}|${this.textAlign}|${this.textBaseline}|${text}`;
    let img = traceCache.get(key);
    if (!img) {
      img = document.createElement('canvas');
      img.width = img.height = size * 3;
      const c = img.getContext('2d');
      c.font = `${size}px sans-serif`; c.textAlign = this.textAlign; c.textBaseline = this.textBaseline;
      c.filter = 'url(#tr-canvas)';
      fillText.call(c, text, size * 1.5, size * 1.5);
      traceCache.set(key, img);
    }
    this.drawImage(img, x - size * 1.5, y - size * 1.5);
  };
}
