const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const nf = (d) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- motion switch (WCAG 2.2.2): one control pauses all looping motion ---------- */
const motion = { on: true, listeners: new Set() };
try { motion.on = localStorage.getItem('portfolio-fx') !== 'off'; } catch (e) {}
function applyMotion() {
  root.classList.toggle('fx-paused', !motion.on);
  document.querySelectorAll('svg').forEach((s) => {
    if (!s.pauseAnimations || s.closest('dialog')) return;
    if (!motion.on) s.pauseAnimations();
  });
  document.querySelectorAll('.fx-toggle').forEach((b) => {
    b.setAttribute('aria-pressed', String(!motion.on));
    b.textContent = motion.on ? 'Pause motion' : 'Play motion';
  });
  motion.listeners.forEach((fn) => fn(motion.on));
}
export function onMotion(fn) { motion.listeners.add(fn); fn(motion.on); }
export const motionOn = () => motion.on && !reduced;
document.querySelectorAll('.fx-toggle').forEach((b) => b.addEventListener('click', () => {
  motion.on = !motion.on;
  try { localStorage.setItem('portfolio-fx', motion.on ? 'on' : 'off'); } catch (e) {}
  applyMotion();
}));

/* ---------- count-up numbers ---------- */
// The final value is real text in the HTML. Under reduced motion nothing runs.
const ease = (t) => 1 - Math.pow(1 - t, 4);
function setup(el) {
  const m = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(el.textContent.trim());
  if (!m) { el.classList.add('is-counted'); return null; }
  const final = el.textContent.trim();
  el.dataset.final = final;
  const decimals = (m[2].split('.')[1] || '').length;
  const to = parseFloat(m[2].replace(/,/g, ''));
  const w = el.getBoundingClientRect().width;
  if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
  if (w) el.style.minWidth = w + 'px';
  el.innerHTML = '<span class="visually-hidden"></span><span aria-hidden="true"><span class="c-pre"></span><span class="c-num"></span><span class="c-sfx"></span></span>';
  el.firstChild.textContent = final;
  const [pre, num, sfx] = el.lastChild.children;
  pre.textContent = m[1]; sfx.textContent = m[3]; num.textContent = nf(decimals).format(0);
  el.classList.add('is-counting');
  return { el, num, to, decimals, fmt: nf(decimals) };
}
// After counting the number goes back to plain text, exactly as authored.
// Signal keeps the suffix in its own span so it can be coloured.
function styleFinal(el) {
  const final = el.dataset.final || el.textContent.trim();
  el.dataset.final = final;
  const m = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(final);
  if (root.dataset.theme === 'signal' && m && m[3]) {
    el.textContent = '';
    el.append(m[1] + m[2]);
    const sfx = document.createElement('span');
    sfx.className = 'c-sfx';
    sfx.textContent = m[3];
    el.append(sfx);
  } else {
    el.textContent = final;
  }
}
function finish(el) {
  el.style.minWidth = '';
  if (el.style.display === 'inline-block') el.style.display = '';
  if (!el.getAttribute('style')) el.removeAttribute('style');
  styleFinal(el);
  el.classList.remove('is-counting');
  el.classList.add('is-counted');
}
function run(c, delay, dur = 1500) {
  const start = performance.now() + delay;
  const tick = (now) => {
    const t = Math.min(1, Math.max(0, (now - start) / dur));
    c.num.textContent = c.fmt.format(c.to * ease(t));
    if (t < 1) requestAnimationFrame(tick);
    else { finish(c.el); }
  };
  requestAnimationFrame(tick);
}
function initCounters() {
  const els = [...document.querySelectorAll('[data-count]')];
  if (reduced || !els.length) { els.forEach((e) => { e.classList.add('is-counted'); styleFinal(e); }); watchTheme(); return; }
  const prepared = new Map();
  els.forEach((el) => {
    const track = el.closest('.scale-track');
    if (track) { // the marquee repeats its items: count only the first copy
      const all = [...track.querySelectorAll('[data-count]')];
      if (all.indexOf(el) >= all.length / 2) { el.classList.add('is-counted'); styleFinal(el); return; }
    }
    const c = setup(el);
    if (c) prepared.set(el, c);
  });
  let batch = 0, last = 0;
  const io = new IntersectionObserver((entries) => {
    const now = performance.now();
    if (now - last > 250) batch = 0;
    last = now;
    entries.filter((e) => e.isIntersecting).forEach((e) => {
      io.unobserve(e.target);
      run(prepared.get(e.target), 200 + batch++ * 110);
    });
  }, { threshold: 0.4 });
  prepared.forEach((_, el) => io.observe(el));
  watchTheme();
}
// Re-style finished numbers when the theme changes
function watchTheme() {
  new MutationObserver(() => document.querySelectorAll('[data-count].is-counted').forEach(styleFinal)).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}

/* ---------- estimated throughput strip (clearly labelled as an estimate) ---------- */
function initEstimate() {
  const box = document.querySelector('.hero-estimate');
  if (!box) return;
  const perSec = parseFloat(box.dataset.perSecond);
  const num = box.querySelector('.est-num');
  const btn = box.querySelector('.est-pause');
  const nfI = nf(0);
  if (reduced) {
    num.textContent = '≈ ' + Math.round(perSec / 1000) + 'K';
    box.querySelector('.est-text').textContent = 'records processed every second, on average';
    btn.hidden = true;
    return;
  }
  const CAP = 18000; // stop after this much running time
  let active = 0, last = 0, running = false, started = false, userPaused = false, shown = 0, raf = 0;
  const frame = (now) => {
    raf = 0;
    if (!running) return;
    active += Math.min(100, now - last); last = now;
    const v = Math.min(active, CAP) / 1000 * perSec;
    if (now - shown > 90 || active >= CAP) { shown = now; num.textContent = nfI.format(v); } // about 10 updates a second
    if (active >= CAP) { running = false; btn.textContent = 'Restart'; btn.dataset.state = 'done'; return; }
    raf = requestAnimationFrame(frame);
  };
  const go = () => { if (running || !motionOn()) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); btn.textContent = 'Pause'; };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  btn.addEventListener('click', () => {
    if (btn.dataset.state === 'done') { active = 0; btn.dataset.state = ''; go(); return; }
    if (running) { userPaused = true; stop(); btn.textContent = 'Resume'; btn.setAttribute('aria-pressed', 'true'); }
    else { userPaused = false; btn.setAttribute('aria-pressed', 'false'); go(); }
  });
  onMotion((on) => {
    if (!on) { stop(); if (btn.dataset.state !== 'done') btn.textContent = 'Resume'; }
    else if (started && !userPaused && btn.dataset.state !== 'done') go();
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting && !started) { started = true; setTimeout(go, 1900); }
    else if (!e.isIntersecting && running) stop();
    else if (e.isIntersecting && started && btn.textContent === 'Pause' && !running) go();
  }), { threshold: 0.3 });
  io.observe(box);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
}

/* ---------- spotlight borders and glow on tiles (fine pointers, themes that use them) ---------- */
function initSpotlight() {
  if (!fine) return;
  let raf = 0, el = null, px = 0, py = 0;
  addEventListener('pointermove', (e) => {
    if (!['bento', 'signal'].includes(root.dataset.theme)) return;
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

/* ---------- hero graph (Signal theme) ---------- */
let hero = null;
async function syncHero() {
  const visual = document.querySelector('.hero-visual');
  const wantsHero = root.dataset.theme === 'signal' && visual && !reduced;
  if (!wantsHero) { if (hero) { hero.stop(); hero = null; visual && visual.classList.remove('is-live'); } return; }
  if (hero) return;
  const token = (hero = {});
  try {
    const mod = await import('./hero.js');
    if (hero !== token || root.dataset.theme !== 'signal') return;
    hero = await mod.start(visual, visual.querySelector('canvas'), { onMotion, motionOn });
    // WebGL glow: only after the page has loaded and the browser is idle
    const late = () => import('./hero-gl.js').then((gl) => {
      if (!hero || root.dataset.theme !== 'signal') return;
      const layer = gl.start(visual, { onMotion });
      if (layer) { const stopHero = hero.stop; hero.stop = () => { layer.stop(); stopHero(); }; }
    }).catch(() => {});
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(late, { timeout: 2500 }) : setTimeout(late, 1200));
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
  } catch (e) { hero = null; }
}

export function init() {
  applyMotion();
  initCounters();
  initEstimate();
  initSpotlight();
  syncHero();
  new MutationObserver(syncHero).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}
init();
