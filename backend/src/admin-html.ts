/**
 * Self-contained admin dashboard HTML.
 * Served at GET /admin — fetches /api/admin/stats after password entry.
 * No external dependencies; styling mirrors the VibeCheck dark theme.
 */
export function adminHtml(): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VibeCheck Admin</title>
  <style>
    *, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #09090f; color: #f0f0f5; min-height: 100vh; padding: 2rem 1rem; }
    .wrap { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 1.5rem; letter-spacing: -0.02em; }
    h1 span { color: #f5a623; }
    h2 { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8080b8; margin-bottom: 0.875rem; }
    .card { background: #12121e; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1.25rem 1.5rem; }
    .grid-4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.875rem; margin-bottom: 0.875rem; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; margin-bottom: 0.875rem; }
    @media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr; } }
    .stat { font-size: 2.25rem; font-weight: 800; color: #f5a623; line-height: 1; }
    .stat-label { font-size: 0.7rem; color: #8080b8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.4rem; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8080b8; padding: 0 0 0.5rem; text-align: left; }
    td { font-size: 0.825rem; padding: 0.35rem 0; border-top: 1px solid rgba(255,255,255,0.04); color: #a0a0c4; }
    td:last-child { text-align: right; color: #f0f0f5; font-variant-numeric: tabular-nums; }
    .bar-wrap { margin-top: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; height: 3px; }
    .bar { height: 3px; background: #f5a623; border-radius: 2px; }
    .note { font-size: 0.7rem; color: #8080b8; margin-bottom: 0.75rem; line-height: 1.5; }
    /* Login form */
    .login-wrap { max-width: 340px; }
    label { font-size: 0.7rem; color: #8080b8; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 0.5rem; }
    input[type=password] { width: 100%; padding: 0.7rem 1rem; background: #0d0d18; border: 1px solid rgba(245,166,35,0.3); border-radius: 8px; color: #f0f0f5; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
    input[type=password]:focus { border-color: rgba(245,166,35,0.65); }
    /* Base button (login — full width) */
    button { margin-top: 0.75rem; width: 100%; padding: 0.7rem; background: #f5a623; color: #0d0a02; border: none; border-radius: 8px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: background 0.15s, opacity 0.15s; }
    button:hover:not(:disabled) { background: #d4911e; }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .err { color: #f87171; font-size: 0.8rem; margin-top: 0.5rem; min-height: 1.2em; }
    /* Dashboard header row */
    .dash-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .dash-meta { font-size: 0.75rem; color: #8080b8; }
    /* Refresh button — compact, auto-width, overrides the full-width login rule */
    .btn-refresh { margin-top: 0; width: auto; padding: 0.6rem 1.25rem; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.45rem; letter-spacing: 0.01em; box-shadow: 0 0 18px rgba(245,166,35,0.18); }
    .btn-refresh:hover:not(:disabled) { box-shadow: 0 0 28px rgba(245,166,35,0.3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { display: inline-block; animation: spin 0.8s linear infinite; }
    .ts { font-size: 0.7rem; color: #8080b8; text-align: center; margin-top: 1rem; }
  </style>
</head>
<body>
<div class="wrap">
  <h1>Vibe<span>Check</span> <span style="color:#8080b8;font-weight:400;font-size:1rem">/ Admin</span></h1>

  <!-- Login -->
  <div id="login" class="login-wrap card">
    <label for="ak">Admin key</label>
    <input type="password" id="ak" placeholder="Enter admin key"
           onkeydown="if(event.key==='Enter')go()" autofocus />
    <button onclick="go()">View Stats</button>
    <p class="err" id="err" aria-live="polite"></p>
  </div>

  <!-- Dashboard (hidden until authenticated) -->
  <div id="dash" style="display:none">
    <!-- Header row: subtitle on the left, Refresh button on the right -->
    <div class="dash-header">
      <p class="dash-meta" id="refresh-ts">Loading…</p>
      <button class="btn-refresh" id="refresh-btn" onclick="refresh()">
        <span id="refresh-icon">↻</span> Refresh Data
      </button>
    </div>

    <div class="grid-4" id="kpis"></div>
    <div class="grid-2" id="tables"></div>
    <p class="ts" id="ts"></p>
  </div>
</div>

<script>
let savedKey = '';

/* ── Auth flow ─────────────────────────────────────────────────── */
async function go() {
  const key = document.getElementById('ak').value.trim();
  document.getElementById('err').textContent = '';
  if (!key) return;

  const ok = await fetchAndRender(key, 'err');
  if (ok) {
    savedKey = key;
    document.getElementById('login').style.display = 'none';
    document.getElementById('dash').style.display = '';
  }
}

/* ── Refresh (reuses saved key, no page reload) ─────────────────── */
async function refresh() {
  if (!savedKey) return;
  const btn  = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');

  btn.disabled = true;
  icon.className = 'spin';

  await fetchAndRender(savedKey, null);

  icon.className = '';
  btn.disabled = false;
}

/* ── Shared fetch + render ──────────────────────────────────────── */
async function fetchAndRender(key, errId) {
  let data;
  try {
    const res = await fetch('/api/admin/stats?key=' + encodeURIComponent(key));
    if (res.status === 401) {
      if (errId) document.getElementById(errId).textContent = 'Invalid key.';
      return false;
    }
    if (res.status === 503) {
      if (errId) document.getElementById(errId).textContent = 'ADMIN_KEY not configured on the server.';
      return false;
    }
    if (!res.ok) {
      if (errId) document.getElementById(errId).textContent = 'Server error — check Railway logs.';
      return false;
    }
    data = await res.json();
  } catch {
    if (errId) document.getElementById(errId).textContent = 'Could not reach server.';
    return false;
  }

  render(data);
  return true;
}

/* ── Rendering helpers ──────────────────────────────────────────── */
function bar(n, max) {
  const pct = max > 0 ? Math.round(n / max * 100) : 0;
  return '<div class="bar-wrap"><div class="bar" style="width:' + pct + '%"></div></div>';
}

function table(rows, emptyMsg) {
  if (!rows || rows.length === 0) return '<p class="note">' + emptyMsg + '</p>';
  const maxN = Math.max(...rows.map(r => r[1]), 1);
  return '<table><thead><tr><th>Name</th><th>Count</th></tr></thead><tbody>'
    + rows.map(([name, n]) =>
        '<tr><td>' + esc(name) + bar(n, maxN) + '</td><td>' + n + '</td></tr>'
      ).join('')
    + '</tbody></table>';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function render(d) {
  // KPI tiles
  document.getElementById('kpis').innerHTML = [
    ['Total Scans',     d.totalScans],
    ['Total Bugs',      d.totalBugs],
    ['Unique Domains',  d.topDomainsRanked.length],
    ['Avg Bugs / Scan', d.avgBugsPerScan],
  ].map(([label, val]) =>
    '<div class="card"><div class="stat">' + val + '</div><div class="stat-label">' + label + '</div></div>'
  ).join('');

  // Severity breakdown
  const sev = d.bugsBySeverity || {};
  document.getElementById('kpis').innerHTML +=
    ['critical','warning','info'].map(k =>
      '<div class="card"><div class="stat" style="font-size:1.5rem">' + (sev[k]||0) + '</div><div class="stat-label">' + k + '</div></div>'
    ).join('');

  // Tables
  document.getElementById('tables').innerHTML =
    '<div class="card"><h2>Top Bug Types</h2>'
      + table(d.topBugTypes, 'No bugs recorded yet.') + '</div>'
    + '<div class="card"><h2>Top Scanned Domains</h2>'
      + table(d.topDomainsRanked, 'No scans yet.') + '</div>'
    + '<div class="card"><h2>Template Prompt Candidates</h2>'
      + '<p class="note">Bug types most often using template prompts — high numbers signal prompts worth improving.</p>'
      + table(d.templateCandidates, 'No template usage recorded.') + '</div>'
    + '<div class="card"><h2>Bugs by Severity</h2>'
      + table(Object.entries(sev).sort(([,a],[,b])=>b-a), 'No data.') + '</div>';

  // Timestamps
  const now   = new Date().toLocaleTimeString();
  const stored = d.lastUpdated ? new Date(d.lastUpdated).toLocaleString() : '—';
  document.getElementById('refresh-ts').textContent = 'Refreshed at ' + now;
  document.getElementById('ts').textContent = 'Stats last written: ' + stored;
}
</script>
</body>
</html>`;
}
