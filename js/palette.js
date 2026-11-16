// Command palette: Ctrl/Cmd+K or the search button in the nav. Never the only way to navigate.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let dlg = null, input, list, status, items = [], shown = [], active = 0;

const $ = (s) => document.querySelector(s);
const go = (sel) => () => {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
};
const system = (id) => () => {
  if (typeof window.showTab === 'function') window.showTab(id);
  go('#projects .proj-tabs')();
};
const click = (sel) => () => { const el = $(sel); if (el) el.click(); };
const open = (url) => () => window.open(url, '_blank', 'noopener');
const say = (msg) => { if (status) status.textContent = msg; };

function commands() {
  const email = ($('a[href^="mailto:"]') || {}).href;
  const link = (t) => ($(`a[href*="${t}"]`) || {}).href;
  const themes = [...document.querySelectorAll('#theme-pop input[name="theme"]')].map((r) => ({ id: r.value, label: r.closest('label').textContent.trim() }));
  const tabs = [...document.querySelectorAll('.proj-tab')].map((t) => ({ id: t.dataset.tab, label: t.textContent.trim() }));
  return [
    ...[['About', '#about'], ['Journey', '#journey'], ['Projects', '#projects'], ['Open Source', '#open-source'], ['Tech Stack', '#skills'], ['Background', '#education'], ['Testimonials', '[data-section="testimonials"]'], ['Contact', '#contact']]
      .map(([l, s]) => ({ group: 'Go to', label: l, run: go(s) })),
    ...tabs.map((t) => ({ group: 'Systems', label: t.label, keywords: 'system architecture diagram', run: system(t.id) })),
    { group: 'Projects', label: 'Try the mcp-halflist demo', keywords: 'mcp halflist cli terminal replay', run: go('[data-demo]') },
    { group: 'Projects', label: 'mcp-halflist on PyPI', keywords: 'python package pip', run: open('https://pypi.org/project/mcp-halflist/') },
    { group: 'Projects', label: 'mcp-halflist on GitHub', keywords: 'code source', run: open('https://github.com/abhishekhsingh/mcp-halflist') },
    { group: 'Projects', label: 'halflist GitHub Action', keywords: 'ci marketplace', run: open('https://github.com/abhishekhsingh/halflist-action') },
    ...themes.map((t) => ({ group: 'Appearance', label: 'Theme: ' + t.label, keywords: 'style look switch', run: click(`#theme-pop input[value="${t.id}"]`) })),
    { group: 'Appearance', label: 'Toggle dark and light mode', keywords: 'theme sun moon', run: click('#themeToggle') },
    { group: 'Appearance', label: 'Pause or play motion', keywords: 'animation reduce stop', run: click('.fx-toggle') },
    { group: 'Contact', label: 'Download resume (PDF)', keywords: 'cv', run: () => { const a = $('.nav-resume'); if (a) window.open(a.href, '_blank', 'noopener'); } },
    { group: 'Contact', label: 'Copy email address', keywords: 'mail', run: () => { if (email) navigator.clipboard.writeText(email.replace('mailto:', '')).then(() => say('Email address copied')).catch(() => say('Could not copy')); } },
    { group: 'Contact', label: 'Open LinkedIn', run: open(link('linkedin.com')) },
    { group: 'Contact', label: 'Open GitHub profile', run: open('https://github.com/abhishekhsingh') },
  ];
}

function render() {
  const q = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  shown = items.filter((c) => q.every((t) => (c.label + ' ' + (c.keywords || '') + ' ' + c.group).toLowerCase().includes(t)));
  if (q.length) shown.sort((a, b) => (b.label.toLowerCase().startsWith(q[0]) ? 1 : 0) - (a.label.toLowerCase().startsWith(q[0]) ? 1 : 0));
  active = Math.min(active, Math.max(0, shown.length - 1));
  let html = '', last = '';
  shown.forEach((c, i) => {
    if (!q.length && c.group !== last) { html += `<li role="presentation" class="pal-group">${c.group}</li>`; last = c.group; }
    html += `<li role="option" id="pal-${i}" class="pal-item" data-i="${i}" aria-selected="${i === active}"><span>${c.label}</span>${q.length ? `<span class="pal-tag">${c.group}</span>` : ''}</li>`;
  });
  list.innerHTML = html || '<li role="presentation" class="pal-empty">No matches</li>';
  input.setAttribute('aria-activedescendant', shown.length ? 'pal-' + active : '');
  const cur = list.querySelector('[aria-selected="true"]');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

let cssReady = null;
function loadCss() {
  if (!cssReady) {
    cssReady = new Promise((resolve) => {
      const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'css/palette.css' });
      l.onload = l.onerror = resolve;
      document.head.append(l);
    });
  }
  return cssReady;
}

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'palette';
  dlg.setAttribute('aria-label', 'Command palette');
  dlg.innerHTML = '<div class="pal-box"><input class="pal-input" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" placeholder="Type a command or search" autocomplete="off" spellcheck="false" aria-label="Search commands">'
    + '<ul id="pal-list" class="pal-list" role="listbox" aria-label="Commands"></ul>'
    + '<div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> select</span><span><kbd>Esc</kbd> close</span></div></div>'
    + '<p class="visually-hidden" role="status" id="palette-status"></p>';
  document.body.appendChild(dlg);
  input = dlg.querySelector('input'); list = dlg.querySelector('ul'); status = dlg.querySelector('#palette-status');
  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, shown.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
    else if (e.key === 'Home') { e.preventDefault(); active = 0; render(); }
    else if (e.key === 'End') { e.preventDefault(); active = Math.max(shown.length - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(active); }
  });
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) run(+li.dataset.i); });
  list.addEventListener('pointermove', (e) => { const li = e.target.closest('[data-i]'); if (li && +li.dataset.i !== active) { active = +li.dataset.i; list.querySelectorAll('[aria-selected]').forEach((n) => n.setAttribute('aria-selected', 'false')); li.setAttribute('aria-selected', 'true'); input.setAttribute('aria-activedescendant', li.id); } });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}

function run(i) {
  const c = shown[i];
  if (!c) return;
  dlg.close();
  setTimeout(c.run, 60);
}

export async function toggle() {
  await loadCss();
  if (!dlg) build();
  if (dlg.open) { dlg.close(); return; }
  items = commands(); active = 0; input.value = ''; render();
  dlg.showModal(); input.focus();
  if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'palette-open', title: 'Command palette', event: true });
}

