// Optional WebGL layer for the Signal hero: a slow, soft flow-noise glow behind the graph.
// Loaded late and only on capable desktops. Tears itself down if frames are slow.
const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = `precision mediump float;
uniform vec2 u_res;uniform float u_t;uniform vec2 u_m;uniform vec3 u_c1;uniform vec3 u_c2;uniform float u_k;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=(uv-.5)*vec2(u_res.x/u_res.y,1.);
  float t=u_t*.045;
  vec2 q=vec2(fbm(p*1.6+t),fbm(p*1.6-t+3.1));
  vec2 r=vec2(fbm(p*2.2+q*2.4+vec2(1.7,9.2)+t*1.3),fbm(p*2.2+q*2.4+vec2(8.3,2.8)-t));
  float f=fbm(p*1.8+r*2.);
  float focus=smoothstep(1.0,.0,length(p-vec2(.55,.08)));
  vec2 m=(u_m-.5)*vec2(u_res.x/u_res.y,1.);
  float glow=smoothstep(.45,.0,length(p-m))*.35;
  vec3 col=mix(u_c1,u_c2,clamp(f*1.5+q.x*.4,0.,1.));
  float a=(pow(f,2.3)*focus+glow*focus)*u_k;
  gl_FragColor=vec4(col*a,a);
}`;

const rgb = (css) => {
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = css; c.fillRect(0, 0, 1, 1);
  const d = c.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
};

export function supported() {
  if (matchMedia('(max-width: 768px)').matches || matchMedia('(pointer: coarse)').matches) return false;
  if (navigator.connection && navigator.connection.saveData) return false;
  if ((navigator.hardwareConcurrency || 4) <= 4) return false;
  return true;
}

export function start(visual, { onMotion }) {
  if (!supported()) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-gl';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) { gl.getExtension('WEBGL_lose_context')?.loseContext(); return null; }

  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl.getExtension('WEBGL_lose_context')?.loseContext(); return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const u = { res: U('u_res'), t: U('u_t'), m: U('u_m'), c1: U('u_c1'), c2: U('u_c2'), k: U('u_k') };
  visual.insertBefore(canvas, visual.firstChild);

  const SCALE = 0.5; // soft background: half resolution looks the same and costs a quarter
  const resize = () => {
    canvas.width = Math.max(2, Math.round(visual.clientWidth * SCALE));
    canvas.height = Math.max(2, Math.round(visual.clientHeight * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height);
  };
  const colors = () => {
    const cs = getComputedStyle(document.documentElement);
    gl.uniform3fv(u.c1, rgb(cs.getPropertyValue('--accent').trim() || '#2dd4a7'));
    gl.uniform3fv(u.c2, rgb(cs.getPropertyValue('--accent-2').trim() || '#7aa2ff'));
    gl.uniform1f(u.k, document.documentElement.dataset.mode === 'light' ? 0.55 : 1.15);
  };
  let mx = 0.7, my = 0.5, tx = 0.7, ty = 0.5, raf = 0, last = 0, t0 = performance.now();
  let userOn = true, inView = true, tabOn = true, alive = true, frames = 0, slow = 0;
  const frame = (now) => {
    raf = 0;
    if (!alive || !userOn || !inView || !tabOn) return;
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < 1000 / 30 - 2) return;
    last = now;
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    gl.uniform1f(u.t, (now - t0) / 1000);
    gl.uniform2f(u.m, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!canvas.classList.contains('is-on')) canvas.classList.add('is-on');
    if (++frames > 20 && frames <= 80 && dt > 60) slow++;
    if (frames === 80 && slow > 25) teardown(); // consistently slow: give up quietly
  };
  const kick = () => { if (!raf && alive && userOn && inView && tabOn) raf = requestAnimationFrame(frame); };
  function teardown() {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect(); io.disconnect(); mo.disconnect();
    document.removeEventListener('visibilitychange', vis);
    canvas.classList.remove('is-on');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    setTimeout(() => canvas.remove(), 1300);
  }
  resize(); colors();
  const ro = new ResizeObserver(resize); ro.observe(visual);
  const io = new IntersectionObserver((es) => { inView = es[0].isIntersecting; kick(); }); io.observe(visual);
  const vis = () => { tabOn = !document.hidden; kick(); };
  document.addEventListener('visibilitychange', vis);
  const mo = new MutationObserver(colors);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme'] });
  visual.parentElement.addEventListener('pointermove', (e) => {
    const r = visual.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height;
  }, { passive: true });
  onMotion((on) => { userOn = on; if (on) kick(); });
  kick();
  return { stop: teardown };
}
