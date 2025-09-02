# Render Deployment Notes

This project includes a Render blueprint (`render.yaml`) for the backend and frontend only. It intentionally does not create a database to avoid free-tier limits (only one free database per account).

Requirements (backend service):
- Environment variables on the backend service:
  - `DATABASE_URL` (set this to your existing Postgres connection string)
  - `DB_SCHEMA=green`
  - `ALLOW_ONRENDER=true`
  - `ADMIN_ACTION_TOKEN=<your token>`
  - `NODE_VERSION=20`

Frontend service:
- Exposes `VITE_API_HOST` from the backend service host; the app will build `https://<host>` at runtime.

Start/Build:
- Backend Build: `npm install`
- Backend Start: `npm run migrate && node index.js`
- Frontend Build: `npm install && npm run build`

If you already have an existing backend service and database on Render, you can apply the blueprint to update configuration of services with the same names without creating a new database.
