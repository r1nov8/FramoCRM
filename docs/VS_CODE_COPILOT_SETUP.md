# VS Code Copilot Agent Mode Setup

This document explains how to set up VS Code Copilot agent mode to work with the FramoCRM MCP (Model Context Protocol) server.

## Prerequisites

- VS Code with GitHub Copilot extension installed
- Node.js and npm
- FramoCRM project dependencies installed

## Setup Steps

1. **Install Required VS Code Extensions**:
   - GitHub Copilot (`github.copilot`)
   - GitHub Copilot Chat (`github.copilot-chat`)
   - Optionally: TypeScript Nightly (`ms-vscode.vscode-typescript-next`)

2. **Configure Environment Variables**:
   Create or update `/mcp/.env` file with:
   ```
   MCP_ENABLED=true
   MCP_DATABASE_URL=your_postgres_connection_string  # Optional
   ```

3. **Build the MCP Server**:
   ```bash
   cd mcp
   npm install
   npm run build
   ```

4. **VS Code Configuration**:
   The `.vscode/settings.json` and `.vscode/copilot.json` files are already configured to:
   - Enable GitHub Copilot for TypeScript/JavaScript files
   - Connect to the FramoCRM MCP server when available

## How It Works

The MCP server provides GitHub Copilot with context about your FramoCRM database schema and allows it to:

1. **Query the database** (read-only SELECT statements)
2. **Get schema information** about tables and columns
3. **Understand the project structure** and provide better code suggestions

## Available Tools

- `db_query`: Execute SELECT queries against the FramoCRM database
- `get_schema_info`: Get information about database tables and columns

## Verification

To verify the setup is working:

1. Open VS Code in the FramoCRM project root
2. Open a TypeScript file
3. Try asking Copilot Chat about the database schema or for help with queries
4. The MCP server should provide relevant context about your FramoCRM data

## Troubleshooting

- Check that `MCP_ENABLED=true` in `/mcp/.env`
- Ensure the MCP server builds successfully with `npm run build`
- Check VS Code Developer Console for any MCP connection errors
- Verify GitHub Copilot extension is enabled and authenticated

## Security Notes

- The MCP server only allows read-only SELECT queries for security
- No database credentials are stored in VS Code configuration
- Database access requires proper environment variable configuration