#!/usr/bin/env node
/*
Simple smoke test:
- Resolve API_URL logic similar to the app
- GET /api/health and print status
*/
const http = require('node:https');
const httpInsecure = require('node:http');

function resolveApiBase() {
  const env = process.env.VITE_API_URL || process.env.API_URL;
  if (env && /^https?:\/\//i.test(env)) return env;
  const host = process.env.VITE_API_HOST;
  if (host && /^[a-z0-9.-]+$/i.test(host)) return `https://${host.replace(/\/$/, '')}`;
  return 'http://localhost:4000';
}

function get(url, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? http : httpInsecure;
    const req = lib.request(
      { hostname: u.hostname, port: u.port || (u.protocol==='https:'?443:80), path: u.pathname+u.search, method: 'GET' },
      (res) => {
        let data='';
        res.on('data', c=> data+=c);
        res.on('end', ()=> resolve({ status: res.statusCode, body: data }));
      }
    );
    const to = setTimeout(() => {
      try { req.destroy(new Error('Request timeout')); } catch {}
    }, timeoutMs);
    req.on('error', (e) => { clearTimeout(to); reject(e); });
    req.on('close', () => { clearTimeout(to); });
    req.end();
  });
}

(async () => {
  const base = resolveApiBase();
  const url = `${base}/api/health`;
  const attempts = Number(process.env.SMOKE_RETRIES || 3);
  const delay = (ms)=> new Promise(r=> setTimeout(r, ms));
  let lastErr = null;
  for (let i=1;i<=attempts;i++) {
    try {
      const r = await get(url, 2000);
      const ok = r.status === 200 && /\bok\b/.test(r.body);
      console.log(JSON.stringify({ base, status: r.status, ok, attempt: i }));
      if (ok) return process.exit(0);
      lastErr = new Error(`Unexpected status ${r.status}`);
    } catch (e) {
      lastErr = e;
      console.log(JSON.stringify({ base, error: String(e && e.message || e), attempt: i }));
    }
    if (i < attempts) await delay(400);
  }
  console.log(JSON.stringify({ base, error: String(lastErr && lastErr.message || lastErr || 'unknown'), attempts }));
  process.exit(2);
})();
