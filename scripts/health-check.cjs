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
  return 'http://localhost:4000';
}

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? http : httpInsecure;
    const req = lib.request({ hostname: u.hostname, port: u.port || (u.protocol==='https:'?443:80), path: u.pathname+u.search, method: 'GET' }, (res) => {
      let data='';
      res.on('data', c=> data+=c);
      res.on('end', ()=> resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const base = resolveApiBase();
  try {
    const r = await get(`${base}/api/health`);
    const ok = r.status === 200 && /\bok\b/.test(r.body);
    console.log(JSON.stringify({ base, status: r.status, ok }));
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.log(JSON.stringify({ base, error: String(e.message || e) }));
    process.exit(2);
  }
})();
