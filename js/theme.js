const registry = {
  midnight: { label: 'Midnight', css: null },
  terminal: { label: 'Terminal', css: 'css/themes/terminal.css' },
  bento: { label: 'Bento', css: 'css/themes/bento.css' },
  brutalist: { label: 'Brutalist', css: 'css/themes/brutalist.css' },
};
const names = Object.keys(registry);
const root = document.documentElement;
const pending = new Map();

function loadTheme(name) {
  const t = registry[name];
  if (!t || !t.css) return Promise.resolve();
  if (pending.has(name)) return pending.get(name);
  const existing = document.getElementById('theme-css-' + name);
  const link = existing || Object.assign(document.createElement('link'), { rel: 'stylesheet', href: t.css, id: 'theme-css-' + name });
  const done = new Promise((resolve) => {
    if (existing && existing.sheet) return resolve();
    link.addEventListener('load', resolve);
    link.addEventListener('error', resolve);
    if (!existing) document.head.append(link);
  });
  pending.set(name, done);
  return done;
}

function announce(name) {
  const el = document.getElementById('theme-status');
  if (el) el.textContent = 'Theme: ' + registry[name].label;
}

function syncRadios(name) {
  document.querySelectorAll('#theme-pop input[name="theme"]').forEach((r) => { r.checked = r.value === name; });
}

async function setTheme(name, origin) {
  if (!registry[name] || name === root.dataset.theme) return;
  await loadTheme(name);
  const swap = () => {
    root.dataset.theme = name;
    try { localStorage.setItem('portfolio-style', name); } catch (e) {}
    syncRadios(name);
    announce(name);
    if (name === 'terminal') {
      setTimeout(() => {
        root.setAttribute('data-typed', '');
        try { sessionStorage.setItem('portfolio-typed', '1'); } catch (e) {}
      }, 1500);
    }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduced) return swap();
  const x = origin ? origin.x : innerWidth - 40;
  const y = origin ? origin.y : 32;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(swap);
  try {
    await vt.ready;
    root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: '::view-transition-new(root)' }
    );
  } catch (e) {}
}

const btn = document.getElementById('themeBtn');
const pop = document.getElementById('theme-pop');
const originOf = () => {
  const b = btn.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
};

syncRadios(root.dataset.theme);
document.querySelectorAll('#theme-pop input[name="theme"]').forEach((r) => {
  r.addEventListener('change', () => setTheme(r.value, originOf()));
  const label = r.closest('label');
  ['pointerenter', 'focusin'].forEach((ev) => label.addEventListener(ev, () => loadTheme(r.value), { once: true }));
});

addEventListener('keydown', (e) => {
  if (!(e.altKey && e.shiftKey && e.code === 'KeyT')) return;
  e.preventDefault();
  const next = names[(names.indexOf(root.dataset.theme) + 1) % names.length];
  setTheme(next, originOf());
});

if (pop) pop.addEventListener('toggle', () => btn.setAttribute('aria-expanded', pop.matches(':popover-open')));

// The terminal prompt types once per browser session
if (root.dataset.theme === 'terminal') {
  try { sessionStorage.setItem('portfolio-typed', '1'); } catch (e) {}
}

// Bento: pointer spotlight on tiles
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let raf = 0, el = null, px = 0, py = 0;
  addEventListener('pointermove', (e) => {
    if (root.dataset.theme !== 'bento') return;
    const card = e.target.closest('.card');
    if (!card) return;
    el = card; px = e.clientX; py = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', (px - r.left) + 'px');
      el.style.setProperty('--y', (py - r.top) + 'px');
    });
  }, { passive: true });
}
