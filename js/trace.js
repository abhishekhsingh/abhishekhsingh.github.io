// Step-through "play the request" for the architecture diagrams.
// Steps match nodes by the label text inside each SVG, so the diagrams stay plain SVG.
import { onMotion, motionOn } from './fx.js';

export const STEPS = {
  'search-ai': [
    [['API Gateway'], 'A request enters through the API gateway: authentication, OAuth2 and rate limiting.'],
    [['Service Layer'], 'The provider factory picks a model chain. Composable prompt traits set the model, version, temperature and reasoning effort.'],
    [['OpenAI Provider', 'Gemini Provider'], 'Each provider has its own adapter. If one fails, the request is retried on the other automatically.'],
    [['=ReplyBot', 'AI Answers Summary', 'Smart Search Summary'], 'Three features run on top: ReplyBot (triggered by the message bus), AI Answers Summary (streamed over SSE) and Smart Search Summary (Llama 3 70B on Bedrock).'],
    [['Synchronized Search', '=Algolia'], 'Search is served from Algolia. An index builder and token issuer keep it in sync, with scoped, secured API keys.'],
    [['Federated Sources', 'SNS Messagebus'], 'Content flows in from federated sources such as Zendesk, Salesforce, Freshdesk and Skilljar, and platform events arrive over the message bus.'],
  ],
  'mcp-server': [
    [['=Claude', '=ChatGPT', '=Cursor', 'Custom Clients'], 'AI assistants connect as MCP clients: Claude, ChatGPT, Cursor or a custom client.'],
    [['MCP over Streamable HTTP'], 'They speak MCP over Streamable HTTP, or stdio for local use.'],
    [['CloudFront'], 'CloudFront with Lambda@Edge routes each request to a region, for locality and failover.'],
    [['MCP Gateway', 'OAuth2 Proxy'], 'The gateway runs the OAuth2.1 flow with PKCE and dynamic client registration.'],
    [['Tool Router', 'Rate Limiter', '=Cache'], 'A tool router dispatches by domain, with per-tenant rate limiting and a TTL plus LRU cache.'],
    [['Tools exposed'], 'Tools are grouped by domain: Search, Analytics, Admin, Education and Community, read-only and administrative.'],
    [['=Algolia', '=Redis', '=DynamoDB'], 'Tools call the backends. Search tokens are permission-scoped, so access control is applied at the token layer, not after the fact.'],
  ],
  'data-highway': [
    [['API Interface'], 'A client submits, monitors or controls a DAG through the REST API.'],
    [['Flow Manager'], 'The Flow Manager orchestrates the DAG as a state machine.'],
    [['Zookeeper'], 'Zookeeper, three nodes, provides leader election and locks so only one manager acts at a time.'],
    [['=Launcher'], 'The Launcher dispatches tasks and allocates resources.'],
    [['DAG Workers', 'Dynamic Workers', 'Python Workers'], 'Tasks run on three worker types: Java and Vert.x DAG workers with 60+ UDFs, Dynamic Workers running 35 isolated connector JARs, and Python workers for Celery and ML tasks.'],
    [['Apache Drill'], 'Apache Drill, the SQL engine with two instances, runs the transformations.'],
    [['DAG Consumers', 'Analytics Data Store'], 'Results land in the analytics data store, S3 or Redshift, for the platform services that consume them.'],
  ],
  'permissions': [
    [['Permission SDK Consumers'], 'A service such as analytics or the API gateway asks the permission SDK: can this user do this to that resource?'],
    [['permissions-api', 'Auth → CORS'], 'The API runs the request through auth, CORS, routing and the policy evaluator.'],
    [['=Neo4j', 'Permission graph'], 'One graph traversal over resources, policies, groups and manager chains answers it in milliseconds.'],
    [['=Redis', 'Eval cache'], 'Results are cached in Redis. A change invalidates only the affected members and resources.'],
    [['Msg Queue', 'permissions-worker'], 'Changes sync through a queue to the worker: heartbeat leader election, onboarding, group sync and cleanup.'],
    [['=Analytics', 'Query Fed.', '=Reporting'], 'Each service enforces the answer its own way: row-level data access, query federation and report checks.'],
  ],
  'udm': [
    [['UDM API'], 'Requests arrive at the UDM API: analyzer, run now, admin and migration.'],
    [['=Message Queue'], 'Work is dispatched asynchronously through queues.'],
    [['UDM Worker'], 'Multi-pool workers run the scheduler, submitter, data load, archival and query builder.'],
    [['=Data Highway'], 'Ingestion is submitted to the pipeline engine as a DAG, with retry and backoff.'],
    [['=PostgreSQL', '=Redshift'], 'Data lands in PostgreSQL for small tenants, with per-tenant DDL, or Redshift for high volume, switched transparently.'],
    [['=Permissions', '=Data Store'], 'Row-level permissions are injected when the query is built, so restricted data never leaves the database.'],
  ],
  'events': [
    [['Receiver'], 'Publishers emit once. Receivers, three instances, authenticate, rate-limit and persist the event.'],
    [['SQS Primary', 'SQS Secondary'], 'Events go to a primary SQS queue and fail over to a secondary one across regions.'],
    [['Enricher Queue'], 'Events are decorated with business context from the data store.'],
    [['Router (\u00d7N)'], 'Routers fan events out to broadcast queues, with tenant routing.'],
    [['Relayer'], 'Relayers handle delayed delivery and retry with backoff.'],
    [['Broadcaster'], 'Broadcasters deliver over HTTP and track status.'],
    [['Subscribers'], 'Subscribers receive the event: webhooks, internal services and customer endpoints. A recovery process picks up any delivery orphaned by a crash.'],
  ],
  'halflist': [
    [['halflist CLI'], 'Run halflist (check, bench, audit, watch, report, pin) from a terminal or CI.'],
    [['=stdio', 'Streamable HTTP', 'SSE Fallback'], 'It connects over stdio, Streamable HTTP or the legacy SSE transport, with OAuth2 PKCE auto-discovery for protected servers.'],
    [['4 Protocol Suites'], 'Four protocol suites run: handshake, tools, resources and prompts.'],
    [['Bench Engine'], 'The bench engine measures p50, p95 and p99 latency.'],
    [['Security Scanner'], 'An offline security scanner checks for prompt injection, exfiltration and rug-pull changes.'],
    [['=Terminal', 'JUnit XML', '=HTML', '=JSON', '=Markdown', 'SVG Badge'], 'Results go to the terminal, JUnit XML, HTML, JSON, Markdown or an SVG badge.'],
  ],
  'goatcounter': [
    [['Single HTML File'], 'The dashboard is one HTML file: React and Recharts, no server and no build step.'],
    [['GoatCounter API'], 'It reads your GoatCounter stats through the read-only API with a token you provide.'],
    [['Response Cache'], 'Responses are cached for 60 seconds.'],
    [['KPI Cards', 'Traffic Chart', 'World Map'], 'KPI cards with period trends, a traffic chart and a world map.'],
    [['=Referrers', '=Versions', '=Regions', '=Campaigns', '=Devices', '=Languages'], 'Breakdowns by referrer, browser version, region, campaign, device and language, with click-to-drill-down.'],
  ],
};

const n = (el, a) => parseFloat(el.getAttribute(a));
const inside = (r, x, y, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

function model(svg) {
  if (svg._m) return svg._m;
  const rects = [...svg.querySelectorAll('rect')].filter((r) => r.hasAttribute('x') && r.hasAttribute('width')).map((el) => ({ el, x: n(el, 'x'), y: n(el, 'y'), w: n(el, 'width'), h: n(el, 'height') }));
  const texts = [...svg.querySelectorAll('text')].map((el) => ({ el, x: n(el, 'x'), y: n(el, 'y'), s: el.textContent.trim() }));
  const marks = [...svg.querySelectorAll('circle, ellipse')].map((el) => ({ el, x: n(el, 'cx'), y: n(el, 'cy') }));
  const links = [...svg.querySelectorAll('line, path[stroke]')].filter((el) => !el.closest('defs')).map((el) => {
    let a, b;
    if (el.tagName === 'line') { a = [n(el, 'x1'), n(el, 'y1')]; b = [n(el, 'x2'), n(el, 'y2')]; }
    else {
      const v = (el.getAttribute('d') || '').match(/-?\d*\.?\d+/g);
      if (!v || v.length < 4) return null;
      a = [+v[0], +v[1]]; b = [+v[v.length - 2], +v[v.length - 1]];
    }
    return { el, a, b };
  }).filter(Boolean);
  return (svg._m = { rects, texts, marks, links });
}

function match(s, key) {
  if (key.startsWith('=')) return s === key.slice(1);
  return s.includes(key);
}

// Resolve one step to the SVG elements to highlight. Returns { els, rects } or null.
export function resolve(svg, keys) {
  const m = model(svg);
  const els = new Set(), rects = [];
  for (const key of keys) {
    const t = m.texts.find((t) => match(t.s, key));
    if (!t) return null;
    const host = m.rects.filter((r) => inside(r, t.x, t.y - 3)).sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (host) {
      rects.push(host); els.add(host.el);
      m.texts.forEach((x) => { if (inside(host, x.x, x.y - 3)) els.add(x.el); });
      m.marks.forEach((x) => { if (inside(host, x.x, x.y)) els.add(x.el); });
    } else els.add(t.el);
  }
  return { els, rects };
}

function linksBetween(svg, from, to) {
  if (!from.length || !to.length) return [];
  const m = model(svg);
  const touch = (p, rs) => rs.some((r) => inside(r, p[0], p[1], 8));
  return m.links.filter((l) => (touch(l.a, from) && touch(l.b, to)) || (touch(l.b, from) && touch(l.a, to))).map((l) => l.el);
}

function build(container, key) {
  const steps = STEPS[key];
  const svg = container.querySelector('svg');
  const wrap = container.closest('.arch-wrap') || container;
  if (!svg || !steps) return;
  const bar = document.createElement('div');
  bar.className = 'trace-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Walk through a request');
  bar.innerHTML = '<button type="button" class="trace-btn" data-act="prev" aria-label="Previous step">‹</button>'
    + '<button type="button" class="trace-btn trace-play" data-act="play">Play the request</button>'
    + '<button type="button" class="trace-btn" data-act="next" aria-label="Next step">›</button>'
    + '<span class="trace-count" aria-hidden="true"></span>'
    + '<p class="trace-caption" aria-live="polite">Follow how a request moves through this system.</p>';
  wrap.after(bar);
  const caption = bar.querySelector('.trace-caption');
  const count = bar.querySelector('.trace-count');
  const play = bar.querySelector('.trace-play');
  let i = -1, timer = 0, prev = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) play.hidden = true;

  const clear = () => {
    svg.classList.remove('is-tracing');
    svg.querySelectorAll('.tr-on').forEach((e) => e.classList.remove('tr-on'));
  };
  const show = (k) => {
    i = k;
    clear();
    if (k < 0 || k >= steps.length) { caption.textContent = 'Follow how a request moves through this system.'; count.textContent = ''; prev = []; return; }
    const r = resolve(svg, steps[k][0]);
    if (!r) { caption.textContent = steps[k][1]; return; }
    svg.classList.add('is-tracing');
    r.els.forEach((e) => e.classList.add('tr-on'));
    linksBetween(svg, prev, r.rects).forEach((e) => e.classList.add('tr-on'));
    prev = r.rects;
    caption.textContent = steps[k][1];
    count.textContent = (k + 1) + ' / ' + steps.length;
  };
  const stop = () => { if (timer) clearInterval(timer); timer = 0; play.textContent = i >= steps.length - 1 && i >= 0 ? 'Replay' : (i < 0 ? 'Play the request' : 'Resume'); play.setAttribute('aria-pressed', 'false'); };
  const advance = () => {
    if (i >= steps.length - 1) { stop(); return; }
    show(i + 1);
    if (i >= steps.length - 1) stop();
  };
  const start = () => {
    if (!motionOn()) return;
    if (i >= steps.length - 1 || i < 0) { prev = []; show(0); }
    play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
    if (timer) clearInterval(timer);
    timer = setInterval(advance, 3600);
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'play') { if (timer) stop(); else start(); return; }
    stop();
    if (act === 'next') { if (i < 0) prev = []; show(Math.min(i + 1, steps.length - 1)); }
    if (act === 'prev') show(Math.max(i - 1, 0));
    if (i >= steps.length - 1) play.textContent = 'Replay';
  });
  container.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); stop(); if (i < 0) prev = []; show(Math.min(i + 1, steps.length - 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); show(Math.max(i - 1, 0)); }
    else if (e.key === 'Escape') { stop(); show(-1); }
  });
  onMotion((on) => { if (!on) stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  new IntersectionObserver((es) => { if (!es[0].isIntersecting) stop(); }).observe(wrap);
}

document.querySelectorAll('.arch-container[data-trace]').forEach((c) => {
  if (!c.closest('dialog')) build(c, c.dataset.trace);
});
