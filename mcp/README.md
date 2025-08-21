# Framo MCP Server (scaffold)

This is a minimal, isolated Model Context Protocol (MCP) server for FramoCRM. It is disabled by default and ships with read-only tools.

## Status
- Disabled by default via `MCP_ENABLED` flag.
- No changes to the main app; lives under `mcp/` and runs separately.

## Tools
- `db_query`: Read‑only Postgres SELECT. Requires `MCP_DATABASE_URL` (or falls back to `DATABASE_URL`). Ensure DB user is read‑only.

## Configure
Create `mcp/.env` or set env vars:

- `MCP_ENABLED=true` to enable the server
- `MCP_DATABASE_URL=postgres://user:pass@host:port/db` (optional; falls back to `DATABASE_URL`)

## Run
In the `mcp` folder:

```bash
pnpm install    # or npm install
pnpm dev        # or npm run dev
# or build & run
pnpm build && pnpm start
```

For MCP clients that speak stdio, the server communicates over stdio when launched.

## Docker (optional)
```Dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
COPY mcp/package.json mcp/tsconfig.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY mcp/src ./src
RUN npx tsc -p .
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

## Safety
- Read‑only tool only, rejects non‑SELECT SQL.
- Use a least‑privilege DB user.
- No file system or network tools included yet.
