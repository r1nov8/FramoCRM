#!/usr/bin/env node
/*
  Probes one or more backend hosts for diagnostics/admin support.
  Usage:
    node scripts/probe-backends.cjs framocrm.onrender.com framo-crm-backend.onrender.com
*/
const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: String(err) }));
    req.setTimeout(8000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

async function probeHost(host) {
  const base = `https://${host}`;
  console.log(`\n== ${host} ==`);
  const endpoints = [
    '/api/health',
    '/api/diagnostics/version',
    '/api/diagnostics/schema',
    '/api/diagnostics/ping',
    '/api/diagnostics/routes'
  ];
  for (const ep of endpoints) {
    try {
      const { status, body } = await get(base + ep);
      let summary = '';
      try {
        const json = JSON.parse(body);
        if (ep === '/api/health') summary = `ok=${json.ok}, version=${json.version}, schema=${json.schema}`;
        else if (ep === '/api/diagnostics/version') summary = `version=${json.version}`;
        else if (ep === '/api/diagnostics/schema') summary = `current_schema=${json?.db?.current_schema}`;
        else if (ep === '/api/diagnostics/routes') summary = `routes=${Array.isArray(json.routes)?json.routes.length:json.count}`;
        else summary = JSON.stringify(json).slice(0, 120);
      } catch {
        summary = (body || '').replace(/\n/g,' ').slice(0, 120);
      }
      console.log(`${ep} -> ${status} ${summary}`);
    } catch (e) {
      console.log(`${ep} -> ERROR ${String(e)}`);
    }
  }
}

async function main() {
  const hosts = process.argv.slice(2);
  if (!hosts.length) {
    console.log('Provide backend hosts to probe, e.g. framocrm.onrender.com framo-crm-backend.onrender.com');
    process.exit(1);
  }
  for (const h of hosts) {
    // accept URLs too
    const host = h.replace(/^https?:\/\//,'').replace(/\/$/,'');
    await probeHost(host);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
