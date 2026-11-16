// Extras that are not needed for the first paint.
// The chapter rail is shared by every theme; the magnetic buttons belong to Signal only.
// sync() is called on load and on every theme change.
const SECTIONS = [
  ['about', 'About'], ['journey', 'Journey'], ['projects', 'Systems'], ['open-source', 'Open source'],
  ['skills', 'Stack'], ['education', 'Background'], ['testimonials', 'Voices'], ['contact', 'Contact'],
];
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
let railUndo = null, magUndo = null;

function chapterRail() {
  if (!matchMedia('(min-width: 1360px)').matches) return;
  const nav = document.createElement('nav');
  nav.className = 'chapter-rail';
  nav.setAttribute('aria-label', 'Page chapters');
  const ol = document.createElement('ol');
  const links = new Map();
  SECTIONS.forEach(([id, label], i) => {
    const sec = document.getElementById(id);
    if (!sec) return;
    const a = document.createElement('a');
    a.href = '#' + id;
    a.innerHTML = '<span class="n">' + String(i + 1).padStart(2, '0') + '</span><span class="t">' + label + '</span>';
    const li = document.createElement('li');
    li.append(a); ol.append(li); links.set(sec, a);
  });
  nav.append(ol);
  document.body.append(nav);
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
    const a = links.get(e.target);
    a.classList.add('is-active'); a.setAttribute('aria-current', 'true');
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a, sec) => io.observe(sec));
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; nav.classList.toggle('is-shown', scrollY > 320); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  railUndo = () => { io.disconnect(); removeEventListener('scroll', onScroll); nav.remove(); };
}

function magnetic() {
  if (!fine || reduced) return;
  const targets = [...document.querySelectorAll('.btn-primary, .contact-link')];
  const R = 70, PULL = 0.22, MAX = 9;
  let raf = 0, ev = null;
  const run = () => {
    raf = 0;
    targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = ev.clientX - cx, dy = ev.clientY - cy;
      const inside = Math.abs(dx) < r.width / 2 + R && Math.abs(dy) < r.height / 2 + R;
      if (inside) {
        el.style.setProperty('--mx', Math.max(-MAX, Math.min(MAX, dx * PULL)) + 'px');
        el.style.setProperty('--my', Math.max(-MAX, Math.min(MAX, dy * PULL)) + 'px');
      } else { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); }
    });
  };
  const move = (e) => { ev = e; if (!raf) raf = requestAnimationFrame(run); };
  const leave = () => targets.forEach((el) => { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
  addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', leave);
  magUndo = () => { removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); leave(); };
}

export function sync() {
  if (!railUndo) chapterRail();
  const wantMag = root.dataset.theme === 'signal';
  if (wantMag && !magUndo) magnetic();
  if (!wantMag && magUndo) { magUndo(); magUndo = null; }
}
export function stop() { if (railUndo) railUndo(); if (magUndo) magUndo(); railUndo = magUndo = null; }
