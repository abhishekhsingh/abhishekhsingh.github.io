// Shows PyPI downloads and the latest release from data/stats.json, which a weekly job refreshes.
const el = document.querySelector('[data-stats]');
if (el) {
  fetch('data/stats.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => {
      const parts = [];
      if (d.pypi && d.pypi.last_month) parts.push(new Intl.NumberFormat('en-US').format(d.pypi.last_month) + ' PyPI downloads in the last month');
      const r = d.releases && d.releases.mcp_halflist;
      if (r) parts.push('latest release ' + r.tag + ', ' + new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }));
      if (!parts.length) return;
      el.textContent = parts.join(' \u00B7 ') + (d.updated ? ' (as of ' + new Date(d.updated + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) + ')' : '');
      el.hidden = false;
    })
    .catch(() => {});
}
