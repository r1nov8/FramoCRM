import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ToolDefinition } from '@modelcontextprotocol/sdk/types.js';
import pkg from 'pg';
import { fetch } from 'undici';

const { Pool } = pkg;

// Feature flag to enable/disable this server entirely
const MCP_ENABLED = process.env.MCP_ENABLED === 'true';

// Set up optional Postgres pool (read-only usage expected via DB user)
const DATABASE_URL = process.env.MCP_DATABASE_URL || process.env.DATABASE_URL;
const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined })
  : null;

// Optional tool flags and config
const HTTP_ENABLED = process.env.MCP_HTTP_ENABLED === 'true';
const FILES_ENABLED = process.env.MCP_FILES_ENABLED === 'true';
const API_URL = process.env.MCP_API_URL || process.env.VITE_API_URL || process.env.API_URL;
const API_TOKEN = process.env.MCP_API_TOKEN; // optional bearer for backend

// Define tools (minimal and read-only)
const tools: ToolDefinition[] = [
  {
    name: 'db_query',
    description: 'Run a read-only SQL SELECT against Postgres and return rows. Use strictly for SELECT; no writes allowed.',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL SELECT query' },
        params: { type: 'array', items: { type: ['string', 'number', 'null'] }, description: 'Parameterized values' }
      },
      required: ['sql']
    }
  },
  ...(HTTP_ENABLED ? [{
    name: 'http_get',
    description: 'Perform a safe HTTP GET to a whitelisted origin and return text. For documentation/data retrieval only.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute URL (https only)' }
      },
      required: ['url']
    }
  } as ToolDefinition] : []),
  ...(FILES_ENABLED ? [{
    name: 'files_list',
    description: 'List files from backend read-only file API (proxied). Requires MCP_API_URL pointing to backend.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative path from share root' } },
      required: []
    }
  } as ToolDefinition, {
    name: 'file_preview',
    description: 'Preview a small text file content via backend file API (proxied).',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative file path' } },
      required: ['path']
    }
  } as ToolDefinition] : [])
];

async function main() {
  if (!MCP_ENABLED) {
    console.error('[MCP] Disabled (MCP_ENABLED is not true). Exiting.');
    process.exit(0);
  }

  const server = new Server({ name: 'framo-mcp', version: '0.1.0' }, { capabilities: { tools: {} } });

  server.tool('db_query', async (args) => {
    if (!pool) return { content: [{ type: 'text', text: 'No database configured' }] };
    const sql = String(args.sql || '').trim();
    if (!sql.toLowerCase().startsWith('select')) {
      return { content: [{ type: 'text', text: 'Only SELECT is allowed' }] };
    }
    const params = Array.isArray(args.params) ? args.params : [];
    const { rows } = await pool.query(sql, params);
    return { content: [{ type: 'json', data: rows }] } as any;
  });

  if (HTTP_ENABLED) {
    server.tool('http_get', async (args) => {
      const url = String(args.url || '');
      try {
        const u = new URL(url);
        if (u.protocol !== 'https:') return { content: [{ type: 'text', text: 'Only https is allowed' }] };
      } catch {
        return { content: [{ type: 'text', text: 'Invalid URL' }] };
      }
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      return { content: [{ type: 'text', text: text.slice(0, 20000) }] };
    });
  }

  if (FILES_ENABLED) {
    if (!API_URL) {
      console.warn('[MCP] FILES tools enabled but MCP_API_URL not set');
    }
    const headers = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined;
    server.tool('files_list', async (args) => {
      if (!API_URL) return { content: [{ type: 'text', text: 'MCP_API_URL not configured' }] };
      const p = args.path ? `?path=${encodeURIComponent(String(args.path))}` : '';
      const r = await fetch(`${API_URL.replace(/\/$/, '')}/api/files${p}`, { headers });
      if (!r.ok) return { content: [{ type: 'text', text: `Error: ${r.status}` }] };
      const data = await r.json();
      return { content: [{ type: 'json', data }] } as any;
    });
    server.tool('file_preview', async (args) => {
      if (!API_URL) return { content: [{ type: 'text', text: 'MCP_API_URL not configured' }] };
      const rel = String(args.path || '');
      const r = await fetch(`${API_URL.replace(/\/$/, '')}/api/file?path=${encodeURIComponent(rel)}`, { headers });
      if (!r.ok) return { content: [{ type: 'text', text: `Error: ${r.status}` }] };
      const data = await r.json();
      return { content: [{ type: 'json', data }] } as any;
    });
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error('[MCP] Fatal error:', e);
  process.exit(1);
});
