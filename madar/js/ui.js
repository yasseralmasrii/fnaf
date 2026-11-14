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
