import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  CallToolRequest 
} from '@modelcontextprotocol/sdk/types.js';
import pkg from 'pg';

const { Pool } = pkg;

// Feature flag to enable/disable this server entirely
const MCP_ENABLED = process.env.MCP_ENABLED === 'true';

// Set up optional Postgres pool (read-only usage expected via DB user)
const DATABASE_URL = process.env.MCP_DATABASE_URL || process.env.DATABASE_URL;
const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined })
  : null;

async function main() {
  if (!MCP_ENABLED) {
    console.error('[MCP] Disabled (MCP_ENABLED is not true). Exiting.');
    process.exit(0);
  }

  console.error('[MCP] Starting FramoCRM MCP Server...');

  const server = new Server(
    { name: 'framo-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [
      {
        name: 'db_query',
        description: 'Run a read-only SQL SELECT against the FramoCRM Postgres database and return rows. Use strictly for SELECT; no writes allowed.',
        inputSchema: {
          type: 'object',
          properties: {
            sql: { 
              type: 'string', 
              description: 'SQL SELECT query to execute against the FramoCRM database' 
            },
            params: { 
              type: 'array', 
              items: { type: ['string', 'number', 'null'] }, 
              description: 'Parameterized values for the SQL query' 
            }
          },
          required: ['sql']
        }
      },
      {
        name: 'get_schema_info',
        description: 'Get information about the FramoCRM database schema including table names and column information.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];

    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;
    
    try {
      if (name === 'db_query') {
        if (!pool) {
          return { content: [{ type: 'text', text: 'No database configured. Please set MCP_DATABASE_URL or DATABASE_URL environment variable.' }] };
        }
        const sql = String(args?.sql || '').trim();
        if (!sql.toLowerCase().startsWith('select')) {
          return { content: [{ type: 'text', text: 'Only SELECT queries are allowed for security. No INSERT, UPDATE, DELETE, or DDL statements.' }] };
        }
        const params = Array.isArray(args?.params) ? args.params : [];
        const { rows } = await pool.query(sql, params);
        return { content: [{ type: 'text', text: `Query executed successfully. Results:\n\n${JSON.stringify(rows, null, 2)}` }] };
      }

      if (name === 'get_schema_info') {
        if (!pool) {
          return { content: [{ type: 'text', text: 'No database configured. Please set MCP_DATABASE_URL or DATABASE_URL environment variable.' }] };
        }
        
        // Get table information
        const tablesQuery = `
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `;
        const { rows: tables } = await pool.query(tablesQuery);
        
        // Get column information for each table
        const columnsQuery = `
          SELECT table_name, column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          ORDER BY table_name, ordinal_position;
        `;
        const { rows: columns } = await pool.query(columnsQuery);
        
        const schemaInfo = {
          tables,
          columns: columns.reduce((acc: any, col: any) => {
            if (!acc[col.table_name]) acc[col.table_name] = [];
            acc[col.table_name].push({
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === 'YES',
              default: col.column_default
            });
            return acc;
          }, {})
        };
        
        return { content: [{ type: 'text', text: `FramoCRM Database Schema:\n\n${JSON.stringify(schemaInfo, null, 2)}` }] };
      }

      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    } catch (error: any) {
      console.error(`[MCP] Error executing ${name}:`, error);
      return { 
        content: [{ type: 'text', text: `Error executing ${name}: ${error.message}` }], 
        isError: true 
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Server connected and ready for requests');
}

main().catch((e) => {
  console.error('[MCP] Fatal error:', e);
  process.exit(1);
});
