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
  // Only numbers that are on screen (or just below it) when the page loads are counted.
  // Anything else keeps its real value, so nothing ever shows a placeholder zero.
  const near = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight * 1.4 && r.right > 0 && r.left < innerWidth; };
  els.forEach((el) => {
    const track = el.closest('.scale-track');
    if (track) { // the marquee repeats its items: count only the first copy
      const all = [...track.querySelectorAll('[data-count]')];
      if (all.indexOf(el) >= all.length / 2) { el.classList.add('is-counted'); styleFinal(el); return; }
    }
    if (!near(el)) { el.classList.add('is-counted'); styleFinal(el); return; }
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
  }, { threshold: 0.15 });
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
  // Signal shows the number as rolling digits; other themes keep plain text
  const paintEst = (v) => {
    const text = nfI.format(v);
    if (root.dataset.theme !== 'signal') {
      if (num._od) { num._od = null; num.classList.remove('odo'); }
      num.textContent = text;
      return;
    }
    if (!num._od || num._od.len !== text.length) {
      num.textContent = ''; num.classList.add('odo');
      const cols = [];
      [...text].forEach((ch, i) => {
        const fromRight = text.length - 1 - i;
        if (/\d/.test(ch)) {
          const od = document.createElement('span'); od.className = 'od';
          const st = document.createElement('span'); st.className = 'od-s';
          if (fromRight < 5) st.style.transition = 'none'; // the fastest digits just change
          st.innerHTML = '0123456789'.replace(/\d/g, (d) => '<i>' + d + '</i>');
          od.append(st); num.append(od); cols.push(st);
        } else { const sep = document.createElement('span'); sep.textContent = ch; num.append(sep); cols.push(null); }
      });
      num._od = { len: text.length, cols };
    }
    [...text].forEach((ch, i) => { const st = num._od.cols[i]; if (st) st.style.transform = 'translateY(-' + (+ch * 1.25) + 'em)'; });
  };
  const CAP = 18000; // stop after this much running time
  let active = 0, last = 0, running = false, started = false, userPaused = false, shown = 0, raf = 0;
  const frame = (now) => {
    raf = 0;
    if (!running) return;
    active += Math.min(100, now - last); last = now;
    const v = Math.min(active, CAP) / 1000 * perSec;
    if (now - shown > 90 || active >= CAP) { shown = now; paintEst(v); } // about 10 updates a second
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
// The mesh graph runs in themes that show it. The WebGL glow belongs to Signal only:
// it is stopped when you leave Signal and built fresh when you come back.
let hero = null, glLayer = null, glToken = 0;
const heroThemes = ['signal', 'terminal', 'bento'];

function stopGL() {
  glToken++;
  if (glLayer) { glLayer.stop(); glLayer = null; }
}
function startGL(visual) {
  if (glLayer || reduced) return;
  const token = ++glToken;
  const late = () => import('./hero-gl.js').then((gl) => {
    if (token !== glToken || !hero || root.dataset.theme !== 'signal' || glLayer) return;
    glLayer = gl.start(visual, { onMotion });
  }).catch(() => {});
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(late, { timeout: 2500 }) : setTimeout(late, 1200));
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
}
async function syncHero() {
  const visual = document.querySelector('.hero-visual');
  const theme = root.dataset.theme;
  if (theme !== 'signal') stopGL();
  const wantsHero = heroThemes.includes(theme) && visual && !reduced;
  if (!wantsHero) { if (hero && hero.stop) hero.stop(); hero = null; visual && visual.classList.remove('is-live'); return; }
  if (hero) { if (theme === 'signal' && hero.stop) startGL(visual); return; }
  const token = (hero = {});
  try {
    const mod = await import('./hero.js');
    if (hero !== token || !heroThemes.includes(root.dataset.theme)) return;
    const h = await mod.start(visual, visual.querySelector('canvas'), { onMotion, motionOn });
    if (hero !== token || !heroThemes.includes(root.dataset.theme)) { h.stop(); return; }
    hero = h;
    if (root.dataset.theme === 'signal') startGL(visual);
  } catch (e) { hero = null; }
}

/* ---------- secondary features load after the page is idle ---------- */
let palette = null;
function openPalette() {
  return (palette ? Promise.resolve(palette) : import('./palette.js').then((m) => (palette = m))).then((m) => m.toggle());
}
function initLater() {
  const btn = document.getElementById('paletteBtn');
  if (btn) btn.addEventListener('click', openPalette);
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  });
  const load = () => ['./trace.js', './demo.js', './stats.js'].forEach((m) => import(m).catch(() => {}));
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 1200));
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
}

/* ---------- name "decode" on load (Signal, motion allowed) ---------- */
function decodeName() {
  const el = document.querySelector('.hero-name');
  if (!el || el.classList.contains('is-in')) return;
  if (root.dataset.theme !== 'signal' || reduced || !motionOn()) { el.classList.add('is-in'); return; }
  const real = el.textContent.trim();
  const glyphs = 'abcdefghijklmnopqrstuvwxyz0123456789<>/_-';
  const vh = document.createElement('span'); vh.className = 'visually-hidden'; vh.textContent = real;
  const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
  el.textContent = ''; el.append(vh, vis); el.classList.add('is-in');
  const DUR = 750, t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / DUR), keep = Math.floor(p * real.length * 1.25);
    vis.textContent = [...real].map((c, i) => (c === ' ' || i < keep ? c : glyphs[(Math.random() * glyphs.length) | 0])).join('').toUpperCase();
    if (p < 1) requestAnimationFrame(tick); else { el.textContent = real; }
  };
  requestAnimationFrame(tick);
}

/* ---------- chapter rail (all themes) and magnetic buttons (Signal) load when idle ---------- */
let wow = null;
function syncWow() {
  if (wow) { wow.sync(); return; }
  if (syncWow.pending) return;
  syncWow.pending = true;
  const go = () => import('./wow.js').then((m) => { wow = m; m.sync(); }).catch(() => { syncWow.pending = false; });
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1200));
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
}

export function init() {
  decodeName();
  syncWow();
  new MutationObserver(syncWow).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  initLater();
  applyMotion();
  initCounters();
  initEstimate();
  initSpotlight();
  syncHero();
  new MutationObserver(syncHero).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}
init();
