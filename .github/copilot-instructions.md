# Copilot Instructions for FramoCRM

## Project Overview
- **FramoCRM** is a full-stack CRM app with a React (Vite) frontend and a Node.js/Express backend (in `/backend`). Data is stored in PostgreSQL, with schema migrations managed via SQL files in `/backend`.
- The UI is spreadsheet-style, with editable, resizable tables (see `components/CompanyInfoPage.tsx`). All changes sync live to the backend/database.

## Key Architecture & Patterns
- **Frontend:**
  - Located at project root, uses React + Tailwind CSS.
  - Major UI: `components/CompanyInfoPage.tsx` (company overview, spreadsheet-like), `components/Sidebar.tsx`, `components/Header.tsx`.
  - State/context: `context/DataContext.tsx`.
  - Data fetching: via custom hooks in `hooks/useCrmData.ts`.
- **Backend:**
  - Located in `/backend`, main entry: `backend/index.js`.
  - REST API for CRUD on companies, contacts, deals, etc. Endpoints updated as schema evolves.
  - Migrations: SQL files in `/backend` (e.g., `migrate_add_address_website_to_companies.sql`).
  - Uses `pg` for Postgres access. DB connection string from `DATABASE_URL` env var.

## Developer Workflows
- **Local Dev:**
  - Install root deps: `npm install` (frontend), `cd backend && npm install` (backend).
  - Start frontend: `npm run dev` (root).
  - Start backend: `cd backend && node index.js`.
  - DB: Start Postgres (Homebrew on macOS), run migrations manually with `psql`.
- **Deploy:**
  - Backend: Deploy `/backend` as Node.js service (see README for Render steps).
  - Frontend: Deploy static site from root `dist`.

## Project Conventions
- **TypeScript** for all React code, plain JS for backend.
- **Tailwind CSS** for all styling; avoid custom CSS unless necessary.
- **API contracts**: Keep frontend and backend in sync when adding fields (e.g., new company columns).
- **Migrations**: Always add a new SQL file for schema changes; do not edit old migrations.
- **Env vars**: Use `.env.local` for frontend, `.env` for backend.

## Integration Points
- **API**: All data flows through REST endpoints in `backend/index.js`.
- **Database**: Postgres, connection via `pg` and `DATABASE_URL`.
- **External AI**: Gemini API key required for some features (see `.env.local`).

## Examples
- To add a new company field:
  1. Add column in a new SQL migration in `/backend`.
  2. Update backend API in `backend/index.js`.
  3. Update frontend types and UI in `types.ts` and `components/CompanyInfoPage.tsx`.

## References
- See `README.md` for setup and deployment.
- Key files: `components/CompanyInfoPage.tsx`, `backend/index.js`, `/backend/*.sql`, `hooks/useCrmData.ts`, `context/DataContext.tsx`.

---

If you are an AI agent, follow these conventions and update all relevant layers when making schema or API changes. Ask for clarification if any workflow or pattern is unclear.
