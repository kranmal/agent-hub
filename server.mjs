// Agent Hub: one local page for the Perf team, the QA team and Pretty CSV.
// It starts the two existing team servers (--web) if they are not running, proxies
// their APIs under /api/perf and /api/qa, serves Pretty CSV at /csv, and runs the
// "Run all" chain (perf strategy, then QA) in sequence.
//   node agent-hub/server.mjs      -> http://127.0.0.1:4750
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The team projects live in qa-agent-team/ and perf-agent-team/ inside this repo.
// Set HUB_QA_DIR / HUB_PERF_DIR to use copies elsewhere.
const find = (envDir, ...cands) => {
  const dirs = [envDir, ...cands].filter(Boolean).map((d) => path.resolve(HERE, d));
  return dirs.find((d) => fs.existsSync(path.join(d, 'interface/server.mjs'))) || dirs[0];
};
const QA_DIR = find(process.env.HUB_QA_DIR, './qa-agent-team', '../qa-agent-team');
const PERF_DIR = find(process.env.HUB_PERF_DIR, './perf-agent-team', '../perf-agent-team');
const PORT = Number(process.env.HUB_PORT || 4750);

const TEAMS = {
  qa: { port: Number(process.env.QA_UI_PORT || 4747), script: path.join(QA_DIR, 'interface/server.mjs'), header: 'x-qa-ui' },
  perf: { port: Number(process.env.PERF_UI_PORT || 4748), script: path.join(PERF_DIR, 'interface/server.mjs'), header: 'x-perf-ui' },
};

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((ok, bad) => {
  let d = ''; req.on('data', (c) => { d += c; if (d.length > 1e6) req.destroy(); });
  req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { bad(e); } });
});

// Call a team server directly (adds the CSRF header and a matching origin).
async function team(name, method, p, body) {
  const t = TEAMS[name];
  const base = `http://127.0.0.1:${t.port}`;
  const r = await fetch(base + p, {
    method,
    headers: { 'content-type': 'application/json', [t.header]: '1', origin: base },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `${name} server ${r.status}`);
  return data;
}

async function isUp(name) {
  try { return (await fetch(`http://127.0.0.1:${TEAMS[name].port}/api/health`)).ok; } catch { return false; }
}
async function ensureTeams() {
  for (const [name, t] of Object.entries(TEAMS)) {
    if (await isUp(name)) continue;
    if (!fs.existsSync(t.script)) { console.error(`[hub] ${name} server missing: ${t.script}`); continue; }
    spawn(process.execPath, [t.script, '--web'], { detached: true, stdio: 'ignore' }).unref();
    for (let i = 0; i < 20 && !(await isUp(name)); i++) await new Promise((r) => setTimeout(r, 250));
  }
}

// ---------- Run all: perf strategy, then QA ----------
const chain = { state: 'idle', steps: [], error: null, cancelled: false };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE = new Set(['succeeded', 'failed', 'cancelled', 'interrupted']);

// Stop every running run in both teams and the Run all chain. Reset also clears the
// chain state. Run history and reports on disk are kept. Teams that are not up are skipped.
async function stopEverything() {
  chain.cancelled = true;
  const stopped = [];
  for (const name of Object.keys(TEAMS)) {
    if (!(await isUp(name))) continue;
    let runs = [];
    try { runs = await team(name, 'GET', '/api/runs'); } catch { continue; }
    for (const r of runs.filter((x) => x.status === 'running')) {
      await team(name, 'POST', `/api/runs/${r.id}/cancel`).catch(() => {});
      stopped.push(`${name}:${r.id}`);
    }
  }
  return stopped;
}

async function runChain({ target, model, effort }) {
  Object.assign(chain, { state: 'running', error: null, cancelled: false, steps: [
    { team: 'perf', label: 'Perf strategy', status: 'pending', runId: null },
    { team: 'qa', label: 'QA full run', status: 'pending', runId: null },
  ] });
  try {
    for (const step of chain.steps) {
      if (chain.cancelled) { step.status = 'cancelled'; continue; }
      const mode = step.team === 'perf' ? 'strategy' : 'full';
      const { id } = await team(step.team, 'POST', '/api/runs', { target, mode, model, effort });
      step.runId = id; step.status = 'running';
      for (;;) {
        await sleep(3000);
        const s = await team(step.team, 'GET', `/api/runs/${id}`);
        if (DONE.has(s.status)) { step.status = s.status; break; }
      }
      if (step.status !== 'succeeded') { chain.error = `${step.label} ${step.status}`; break; }
    }
    chain.state = chain.error ? 'failed' : chain.cancelled ? 'cancelled' : 'done';
  } catch (e) { chain.state = 'failed'; chain.error = e.message; }
}

// ---------- Costs ----------
// Finished runs never change, so their cost is cached; running ones are re-read each time.
const costCache = new Map();
async function costs() {
  const out = { perf: [], qa: [] };
  for (const name of ['perf', 'qa']) {
    let runs = [];
    try { runs = await team(name, 'GET', '/api/runs'); } catch { continue; }
    for (const r of runs) {
      const key = `${name}:${r.id}`;
      let c = costCache.get(key);
      if (!c) {
        try {
          const d = await team(name, 'GET', `/api/runs/${r.id}`);
          c = { id: r.id, status: d.status, target: d.target, mode: d.mode, startedAt: d.startedAt, costUsd: d.result?.costUsd ?? null, durationMs: d.result?.durationMs ?? null, turns: d.result?.turns ?? null, model: d.settings?.model || 'default', effort: d.settings?.effort || 'default' };
          if (DONE.has(c.status)) costCache.set(key, c);
        } catch { continue; }
      }
      out[name].push(c);
    }
  }
  return out;
}

// ---------- Estimate ----------
// A rough forecast, not a quote: size the target, scale from your own finished runs
// (or built-in defaults), then apply model and effort multipliers and a +/- range.
const MODEL_X = { haiku: 0.3, sonnet: 1, opus: 1.7, fable: 1.7, default: 1.5 };
const EFFORT_X = { low: 1, medium: 1.5, high: 2.2, xhigh: 3, max: 4, default: 1.5 };
const SRC = /\.(m?[jt]sx?|py|rb|go|rs|java|kt|swift|php|cs|vue|svelte|html|css|scss)$/i;
const SKIP = /(^|\/)(node_modules|\.git|dist|build|\.next|vendor|coverage|\.expo)(\/|$)/;

function walk(dir, acc = { files: 0, bytes: 0 }, depth = 0) {
  if (depth > 8 || acc.files > 20000) return acc;
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    if (SKIP.test(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, acc, depth + 1);
    else if (SRC.test(e.name)) { acc.files++; try { acc.bytes += fs.statSync(f).size; } catch {} }
  }
  return acc;
}
async function measure(target) {
  if (target.startsWith('/') || target.startsWith('~')) {
    const dir = target.replace(/^~/, process.env.HOME);
    if (!fs.existsSync(dir)) throw new Error('That folder does not exist');
    const m = walk(dir); return { kind: 'local folder', files: m.files, kb: Math.round(m.bytes / 1024) };
  }
  const u = new URL(/^https?:/.test(target) ? target : 'https://' + target);
  const gh = u.hostname === 'github.com' && u.pathname.split('/').filter(Boolean);
  if (gh && gh.length >= 2) {
    const r = await fetch(`https://api.github.com/repos/${gh[0]}/${gh[1].replace(/\.git$/, '')}/git/trees/HEAD?recursive=1`, { headers: { 'user-agent': 'agent-hub' } });
    if (!r.ok) throw new Error(`Could not read that GitHub repo (${r.status}). Private repos need a local path instead.`);
    const t = (await r.json()).tree.filter((x) => x.type === 'blob' && SRC.test(x.path) && !SKIP.test(x.path));
    return { kind: 'GitHub repo', files: t.length, kb: Math.round(t.reduce((a, x) => a + (x.size || 0), 0) / 1024) };
  }
  const get = async (p) => { try { const r = await fetch(new URL(p, u), { signal: AbortSignal.timeout(8000) }); return r.ok ? await r.text() : ''; } catch { return ''; } };
  const [home, map] = await Promise.all([get(u.href), get('/sitemap.xml')]);
  if (!home && !map) throw new Error('Could not reach that site');
  const mapped = (map.match(/<loc>/g) || []).length;
  const links = new Set([...home.matchAll(/href="([^"#?]+)"/g)].map((m) => { try { return new URL(m[1], u); } catch { return null; } }).filter((x) => x && x.hostname === u.hostname && !/\.(css|js|png|jpe?g|svg|ico|pdf|xml)$/i.test(x.pathname)).map((x) => x.pathname));
  return { kind: 'website', pages: Math.max(mapped, links.size, 1), mapped, kb: Math.round(home.length / 1024) };
}
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function estimate({ target, model = 'sonnet', effort = 'low' }) {
  const m = await measure(target.trim());
  const areas = Math.max(2, Math.min(12, m.pages ? Math.ceil(m.pages / 3) : Math.ceil(m.files / 25)));
  const mx = MODEL_X[model] ?? 1.5, ex = EFFORT_X[effort] ?? 1.5, factor = mx * ex;
  // Calibrate from finished QA runs (they ran on default settings, treated as 1.5 x 1.5).
  const hist = (await costs()).qa.filter((r) => r.status === 'succeeded' && r.costUsd > 0 && r.mode === 'full').map((r) => r.costUsd);
  const histMed = median(hist), calibrated = histMed != null;
  const qaBase = calibrated ? histMed / (1.5 * 1.5) / 6 : 0.35;   // sonnet-low dollars per feature area; typical past run ~ 6 areas
  const qa = qaBase * areas * factor;
  const perfStrategy = (0.5 + 0.08 * areas) * factor;
  const perfRun = (0.9 + 0.15 * areas) * factor;
  const range = (v) => ({ low: +(v * 0.6).toFixed(2), mid: +v.toFixed(2), high: +(v * 1.8).toFixed(2) });
  return {
    target, measured: m, areas, model, effort,
    qa: range(qa), perfStrategy: range(perfStrategy), perfRun: range(perfRun),
    total: range(qa + perfStrategy + perfRun),
    basis: calibrated ? `QA is scaled from your ${hist.length} finished full run(s), median $${histMed.toFixed(2)}.` : 'No finished full QA runs yet, so QA uses a built-in default.',
    notes: ['Perf figures use built-in defaults; there is no Perf run history yet to calibrate from.', 'Model and effort multipliers are rough. Actual cost depends on how many fixes and retries the agents need.', 'Load tests themselves (k6) cost nothing in tokens; only the agents do.'],
  };
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };

async function handle(req, res) {
  const host = (req.headers.host || '').split(':')[0];
  if (host !== '127.0.0.1' && host !== 'localhost') return json(res, 403, { error: 'bad host' });
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (req.method === 'GET' && (p === '/' || p === '/csv')) {
    const file = p === '/' ? path.join(HERE, 'index.html') : path.join(HERE, 'PrettyCSV.html');
    res.writeHead(200, { 'content-type': MIME['.html'] });
    return res.end(fs.readFileSync(file));
  }
  if (req.method === 'GET' && p === '/api/health') {
    const [qa, perf] = await Promise.all([isUp('qa'), isUp('perf')]);
    return json(res, 200, { qa, perf, chain });
  }
  if (req.method === 'GET' && p === '/api/costs') return json(res, 200, await costs());
  if (req.method === 'GET' && p === '/api/chain') return json(res, 200, chain);

  if (req.method === 'POST') {
    if (req.headers['x-hub-ui'] !== '1' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) {
      return json(res, 403, { error: 'forbidden' });
    }
    if (p === '/api/chain') {
      if (chain.state === 'running') return json(res, 409, { error: 'A Run all chain is already running' });
      let b; try { b = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
      if (!b.target) return json(res, 400, { error: 'target is required' });
      await ensureTeams();
      runChain(b);
      return json(res, 200, chain);
    }
    if (p === '/api/estimate') {
      let b; try { b = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
      if (!b.target) return json(res, 400, { error: 'target is required' });
      try { return json(res, 200, await estimate(b)); } catch (e) { return json(res, 422, { error: e.message }); }
    }
    if (p === '/api/stop-all') return json(res, 200, { stopped: await stopEverything() });
    if (p === '/api/reset') {
      const stopped = await stopEverything();
      Object.assign(chain, { state: 'idle', steps: [], error: null, cancelled: false });
      return json(res, 200, { stopped, reset: true });
    }
    if (p === '/api/chain/cancel') {
      chain.cancelled = true;
      const active = chain.steps.find((s) => s.status === 'running');
      if (active) await team(active.team, 'POST', `/api/runs/${active.runId}/cancel`).catch(() => {});
      return json(res, 200, chain);
    }
  }

  // Proxy /api/<team>/... to the team server.
  const m = p.match(/^\/api\/(qa|perf)(\/.*)$/);
  if (m) {
    try {
      await ensureTeams();
      const t = TEAMS[m[1]];
      const target = `http://127.0.0.1:${t.port}${m[2]}${url.search}`;
      if (req.method === 'POST') {
        if (req.headers['x-hub-ui'] !== '1') return json(res, 403, { error: 'forbidden' });
        const b = await readBody(req);
        return json(res, 200, await team(m[1], 'POST', m[2], b));
      }
      const r = await fetch(target);
      res.writeHead(r.status, { 'content-type': r.headers.get('content-type') || 'application/json', 'content-disposition': r.headers.get('content-disposition') || 'inline' });
      return res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { return json(res, 502, { error: e.message }); }
  }
  json(res, 404, { error: 'not found' });
}

http.createServer((req, res) => handle(req, res).catch((e) => json(res, 500, { error: e.message })))
  .listen(PORT, '127.0.0.1', async () => {
    console.log(`Agent Hub: http://127.0.0.1:${PORT}`);
    await ensureTeams();
  });
