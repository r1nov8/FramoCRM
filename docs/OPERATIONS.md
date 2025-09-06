# Operations Runbook (FramoCRM Backend)

Stable baseline: current `main` plus workflow `deploy-backend-azure.yml` (Node 22, production-only deps, commit tagging, pre-deploy smoke load).

## 1. Deployment Verification Checklist
Run after each automatic deploy (push to main touching `backend/**`).

1. Open `/api/_version` – confirm `commit` matches latest `git rev-parse HEAD` on main.
2. Open `/api/health` – expect `{ ok: true, commit: <sha>, dbHost: <hostname>, dbSource: <ENV_VAR_NAME> }`.
3. Spot check auth flow (login) and one CRUD endpoint (e.g. `GET /api/projects`).
4. Azure Portal > App Service > Diagnose and solve problems – confirm no recent crash loops.
5. GitHub Actions run: ensure pre-deploy smoke step succeeded ("Basic load check passed.").

## 2. Azure Health Check Configuration
Purpose: Faster detection of unhealthy instance & warmup success.

Portal steps:
1. App Service > Settings > Health check.
2. Path: `/api/health`.
3. Interval: default (recommended) or 60s.
4. Healthy threshold: 2, Unhealthy threshold: 2 (default acceptable).
5. Save.

CLI equivalent (direct):
```
az webapp config set \
  --resource-group <RG> \
  --name framocrm-backend \
  --generic-configurations '{"healthCheckPath":"/api/health"}'
```

Shortcut script (from repo root):
```
./scripts/set-healthcheck.sh <RG> framocrm-backend
```

## 3. Enable Logging (if not already)
1. App Service > Monitoring > App Service logs.
2. Enable: Application Logging (Filesystem) = On.
3. Retention (days): 5 (tune as needed).
4. Save.
5. View live: `https://<app>.scm.azurewebsites.net/api/logstream`.

CLI:
```
az webapp log config \
  --name framocrm-backend \
  --resource-group <RG> \
  --application-logging filesystem \
  --level information
```

## 4. Alerts
Create two alerts (Azure Monitor > Alerts):

1. Restart Count:
   - Signal: Platform metric `App Service plan > Restart Count`.
   - Condition: Greater than 0 over 5 minutes.
   - Action Group: Email / Teams / Pager.
2. HTTP 5xx Errors:
   - Signal: `Http5xx` metric.
   - Condition: Greater than 5 over 5 minutes.

Optional: Availability test (Ping `/api/health` every minute from 2+ regions).

## 5. Staging Slot Strategy (Optional Hardening)
1. Create slot `staging` (App Service > Deployment slots > Add Slot). Clone config except connection strings (verify secrets present).
2. Set same Startup Command: `node backend/index.js` (Configuration > General settings > Startup Command).
3. Deploy staging explicitly (add a second workflow targeting slot if desired) OR temporarily change `app-name` in workflow for a test branch.
4. Validate on staging: version, health, critical endpoints.
5. Swap (Slots page > Swap > staging → production). Swap is fast and reduces downtime.

## 6. Rollback Procedure
The workflow tags each successful deploy with a timestamp tag and moves `latest-backend`.

To rollback:
```
git fetch --tags
git checkout <known-good-tag>
git tag -f rollback
git push origin rollback --force
```
Then manually trigger a deploy (push a branch or cherry-pick). Or create a temporary branch from the tag and merge.

Simplest: `git push origin <tag>:main` (fast-forward main back) if acceptable.

## 7. Dependency & Build Discipline
Rules:
1. Do not run `npm update`; pin changes intentionally and test in staging.
2. Rely on `backend/package-lock.json` + `npm ci --omit=dev`.
3. Skip Puppeteer download (already enforced by env `PUPPETEER_SKIP_DOWNLOAD=1`).

## 8. Local Smoke Test Before Pushing
```
# From repo root
export SKIP_ROOT_POSTINSTALL=1
npm run smoke
```
`scripts/health-check.cjs` should return success quickly; investigate if it fails before pushing.

## 9. Observability Quick Wins
- Add Application Insights (Enable via Portal) for request traces & dependency latency.
- Set sampling (default 5–20%) sufficient.

## 10. Common Failure Modes & Fast Diagnoses
| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| Warmup timeout / no response | Missing `DATABASE_URL` / slow DB | Confirm App Settings; hit `/api/health` once up |
| Immediate crash on start | Syntax error introduced | Pre-deploy smoke would fail; check Actions logs |
| 401s everywhere after deploy | `JWT_SECRET` missing | Add App Setting and restart |
| Admin accounts missing | Bootstraps ran before migrations | Re-run migrations, restart |

## 11. Safe Sequence For Schema Changes
1. Add new migration SQL in `backend/` (never edit older migrations).
2. Commit & push (CI runs migrations pre-deploy).
3. Verify change via psql or new endpoint response.
4. Update frontend types / UI.

## 12. Manual Hotfix Flow
1. Branch from `main` (or `latest-backend` tag if main drifted).
2. Make minimal fix; run local smoke.
3. Merge to main → auto deploy.
4. Verify version & health.

## 13. Future Enhancements (Optional)
- Add separate CI workflow for PRs running only the dry-load smoke step (no deploy).
- Add a readiness endpoint that checks a trivial DB query if you later require stricter health gates.
- Introduce structured logging (JSON) if ingesting into centralized log analytics.

---
Keep this file updated when operational procedures change.
