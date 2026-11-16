// Replays recorded halflist runs. The recordings are real output (see assets/demo/README.md).
const root = document.querySelector('[data-demo]');
if (root) {
  const pre = root.querySelector('pre');
  const buttons = [...root.querySelectorAll('.demo-cmd')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cache = {};
  const CMDS = {
    check: 'halflist check --stdio "python3 sample_server.py"',
    bench: 'halflist bench --stdio "python3 sample_server.py" --all -n 20 -w 2',
  };
  let run = 0;

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const paint = (line) => esc(line)
    .replace(/(✓+)/g, '<span class="t-ok">$1</span>')
    .replace(/(✗+)/g, '<span class="t-bad">$1</span>')
    .replace(/(⚠+)/g, '<span class="t-warn">$1</span>')
    .replace(/(● fast)/g, '<span class="t-ok">$1</span>')
    .replace(/(━━ [A-Z ]+ ━+)/g, '<span class="t-head">$1</span>')
    .replace(/(FAIL|PASS)/g, (m) => `<span class="${m === 'FAIL' ? 't-bad' : 't-ok'}">${m}</span>`);

  async function load(name) {
    if (!cache[name]) cache[name] = (await (await fetch(`assets/demo/halflist-${name}.txt`)).text()).split('\n');
    return cache[name];
  }

  async function play(name) {
    const id = ++run;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cmd === name)));
    let lines;
    try { lines = await load(name); } catch (e) { pre.textContent = 'Could not load the recording.'; return; }
    if (id !== run) return;
    const head = `<span class="t-prompt">$</span> ${esc(CMDS[name])}\n`;
    if (reduced) { pre.innerHTML = head + lines.map(paint).join('\n'); return; }
    pre.innerHTML = head;
    root.classList.add('is-running');
    for (let i = 0; i < lines.length; i++) {
      if (id !== run) return;
      pre.insertAdjacentHTML('beforeend', paint(lines[i]) + '\n');
      pre.parentElement.scrollTop = pre.parentElement.scrollHeight;
      await new Promise((r) => setTimeout(r, lines[i].trim() ? 38 : 12));
    }
    root.classList.remove('is-running');
  }

  buttons.forEach((b) => b.addEventListener('click', () => play(b.dataset.cmd)));
}
