// Animated service-mesh graph for the Signal hero.
// The graph itself comes from assets/signal/mesh.svg, so it always matches the static poster.
const VB_W = 1200, VB_H = 720;

async function loadGraph() {
  const svg = new DOMParser().parseFromString(await (await fetch('assets/signal/mesh.svg')).text(), 'image/svg+xml');
  const nodes = [...svg.querySelectorAll('circle')].map((c) => ({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r'), hub: c.hasAttribute('data-h'), flash: 0 }));
  const edges = [...svg.querySelectorAll('line')].map((l) => ({ a: +l.dataset.i, b: +l.dataset.j, glow: 0 }));
  const adj = nodes.map(() => []);
  edges.forEach((e, k) => { adj[e.a].push([e.b, k]); adj[e.b].push([e.a, k]); });
  return { nodes, edges, adj };
}

function route(g, from, to) {
  const prev = new Map([[from, null]]);
  const q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === to) break;
    for (const [m, k] of g.adj[n]) if (!prev.has(m)) { prev.set(m, [n, k]); q.push(m); }
  }
  if (!prev.has(to)) return null;
  const path = [], eds = [];
  for (let n = to; prev.get(n); n = prev.get(n)[0]) { path.push(n); eds.push(prev.get(n)[1]); }
  path.push(from);
  return { nodes: path.reverse(), edges: eds.reverse() };
}

export async function start(visual, canvas, { onMotion }) {
  const g = await loadGraph();
  const ctx = canvas.getContext('2d', { alpha: true });
  const ingress = g.nodes.map((n, i) => (n.x < 460 ? i : -1)).filter((i) => i >= 0);
  const egress = g.nodes.map((n, i) => (n.x > 880 ? i : -1)).filter((i) => i >= 0);
  const small = matchMedia('(max-width: 768px)').matches;
  const dprCap = small ? 1 : 1.5;
  let W = 0, H = 0, dpr = 1, s = 1, ox = 0, oy = 0;
  let colAccent = '#2dd4a7', colMuted = '#8a94a8', colAccent2 = '#7aa2ff';
  const pulses = [], rings = [];
  let ptr = null, running = true, userOn = true, inView = true, tabOn = true, raf = 0;
  let fpsCap = small ? 24 : 30, lastDraw = 0, nextSpawn = 0, frames = 0, cost = 0, calm = false;

  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    colAccent = cs.getPropertyValue('--accent').trim() || colAccent;
    colAccent2 = cs.getPropertyValue('--accent-2').trim() || colAccent2;
    colMuted = cs.getPropertyValue('--text-muted').trim() || colMuted;
  };
  const resize = () => {
    W = visual.clientWidth; H = visual.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    s = Math.max(W / VB_W, H / VB_H);
    ox = W - VB_W * s; oy = (H - VB_H * s) / 2;
  };
  const pos = (n, t) => [
    ox + (n.x + Math.sin(t * 0.45 + n.y * 0.013) * 3.2 + (n.dx || 0)) * s,
    oy + (n.y + Math.cos(t * 0.37 + n.x * 0.011) * 3.2 + (n.dy || 0)) * s,
  ];
  const spawn = (now) => {
    if (pulses.length >= (calm ? 2 : 4)) return;
    const r = route(g, ingress[(Math.random() * ingress.length) | 0], egress[(Math.random() * egress.length) | 0]);
    if (r && r.nodes.length > 3) pulses.push({ ...r, seg: 0, p: 0, born: now });
  };
  const alpha = (hex, a) => {
    if (hex.startsWith('#') && hex.length === 7) {
      const v = parseInt(hex.slice(1), 16);
      return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`;
    }
    return hex;
  };

  const draw = (now) => {
    const t0 = performance.now();
    const t = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // pointer pushes nearby nodes away a little
    g.nodes.forEach((n) => {
      let tx = 0, ty = 0;
      if (ptr && !calm) {
        const [px, py] = pos(n, t);
        const dx = px - ptr.x, dy = py - ptr.y, d = Math.hypot(dx, dy);
        if (d < 150 && d > 0.1) { const f = (1 - d / 150) * 14 / s; tx = (dx / d) * f; ty = (dy / d) * f; }
      }
      n.dx = (n.dx || 0) + (tx - (n.dx || 0)) * 0.08;
      n.dy = (n.dy || 0) + (ty - (n.dy || 0)) * 0.08;
    });
    ctx.lineWidth = 1;
    g.edges.forEach((e) => {
      const [x1, y1] = pos(g.nodes[e.a], t), [x2, y2] = pos(g.nodes[e.b], t);
      ctx.strokeStyle = alpha(colAccent, 0.13 + e.glow * 0.55);
      ctx.lineWidth = 1 + e.glow * 0.8;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      e.glow = Math.max(0, e.glow - 0.018);
    });
    g.nodes.forEach((n) => {
      const [x, y] = pos(n, t);
      const r = n.r * s * (n.hub ? 0.95 : 0.9);
      ctx.fillStyle = alpha(n.hub ? colAccent : colMuted, n.hub ? 0.55 + n.flash * 0.45 : 0.45 + n.flash * 0.5);
      ctx.beginPath(); ctx.arc(x, y, r * (1 + n.flash * 0.5), 0, 6.283); ctx.fill();
      if (n.hub) {
        ctx.strokeStyle = alpha(colAccent, 0.35 + n.flash * 0.5); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 6.283); ctx.stroke();
      }
      n.flash = Math.max(0, n.flash - 0.03);
    });
    for (let k = rings.length - 1; k >= 0; k--) {
      const rg = rings[k]; rg.t += 0.022;
      if (rg.t >= 1) { rings.splice(k, 1); continue; }
      ctx.strokeStyle = alpha(colAccent, 0.5 * (1 - rg.t)); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, 6 + rg.t * 34, 0, 6.283); ctx.stroke();
    }
    for (let k = pulses.length - 1; k >= 0; k--) {
      const p = pulses[k];
      const a = g.nodes[p.nodes[p.seg]], b = g.nodes[p.nodes[p.seg + 1]];
      const [x1, y1] = pos(a, t), [x2, y2] = pos(b, t);
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      p.p += (260 * s) / len / 30 * (30 / fpsCap) * (calm ? 0.8 : 1);
      g.edges[p.edges[p.seg]].glow = 1;
      if (p.p >= 1) {
        g.nodes[p.nodes[p.seg + 1]].flash = 1;
        p.seg++; p.p = 0;
        if (p.seg >= p.edges.length) { const [rx, ry] = pos(b, t); rings.push({ x: rx, y: ry, t: 0 }); pulses.splice(k, 1); continue; }
      }
      const x = x1 + (x2 - x1) * p.p, y = y1 + (y2 - y1) * p.p;
      for (let i = 5; i >= 0; i--) {
        const back = Math.max(0, p.p - i * 0.06);
        ctx.fillStyle = alpha(colAccent, 0.5 * (1 - i / 6));
        ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * back, y1 + (y2 - y1) * back, (3.2 - i * 0.35) * Math.max(0.8, s), 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = alpha('#ffffff', 0.9);
      ctx.beginPath(); ctx.arc(x, y, 1.6 * Math.max(0.8, s), 0, 6.283); ctx.fill();
    }
    // quality probe: fall back if drawing is slow on this device
    cost += performance.now() - t0; frames++;
    if (frames === 45) {
      const avg = cost / frames;
      if (avg > 14) { stop(); canvas.style.display = 'none'; visual.classList.remove('is-live'); return 'dead'; }
      if (avg > 6) { calm = true; fpsCap = 20; }
    }
  };

  const loop = (now) => {
    raf = 0;
    if (!running || !userOn || !inView || !tabOn) return;
    raf = requestAnimationFrame(loop);
    if (now - lastDraw < 1000 / fpsCap - 2) return;
    lastDraw = now;
    if (now > nextSpawn) { spawn(now); nextSpawn = now + 650 + Math.random() * 700; }
    if (draw(now) === 'dead') return;
    if (!visual.classList.contains('is-live')) visual.classList.add('is-live');
  };
  const kick = () => { if (!raf && running && userOn && inView && tabOn) raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

  resize(); readColors();
  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(visual);
  const io = new IntersectionObserver((es) => { inView = es[0].isIntersecting; kick(); });
  io.observe(visual);
  const vis = () => { tabOn = !document.hidden; kick(); };
  document.addEventListener('visibilitychange', vis);
  const move = (e) => {
    const r = visual.getBoundingClientRect();
    ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const leave = () => { ptr = null; };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    visual.parentElement.addEventListener('pointermove', move, { passive: true });
    visual.parentElement.addEventListener('pointerleave', leave);
  }
  const mo = new MutationObserver(readColors);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme'] });
  onMotion((on) => { userOn = on; if (on) kick(); });
  kick();

  return {
    stop() {
      stop(); ro.disconnect(); io.disconnect(); mo.disconnect();
      document.removeEventListener('visibilitychange', vis);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
