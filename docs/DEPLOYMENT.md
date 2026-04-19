# Deployment Guide

StudentConnect deploys to **Render** as three coupled services defined in `render.yaml` at the repo root:

| Service | Type | Purpose |
|---|---|---|
| `studentconnect-db` | PostgreSQL (managed) | Primary data store |
| `studentconnect-api` | Web service (Node.js) | Express REST API |
| `studentconnect-client` | Static site | Vite-built React SPA |

The blueprint is **infrastructure-as-code**: connecting the GitHub repo to Render once is enough to provision the entire stack and keep it auto-deploying on every push to `main`.

---

## First-time setup (≈ 15 minutes)

### 1. Push the repo to GitHub

```bash
git add .
git commit -m "chore: add CI/CD and Render blueprint"
git push origin main
```

### 2. Create a Render account
- Sign up at [render.com](https://render.com) using your GitHub account.
- Render's free tier is sufficient for a capstone demo (services sleep after 15 min of inactivity, then cold-start on the next request).

### 3. Connect the blueprint
1. In the Render dashboard click **New + → Blueprint**.
2. Select your `StudentConnect` GitHub repository.
3. Render reads `render.yaml` and previews three resources: **Approve**.
4. Render starts building. The first build takes 3–5 minutes.

### 4. Wire up the cross-service URLs (one-time)

After the first deploy completes you will have two URLs that look like:

- API: `https://studentconnect-api.onrender.com`
- Client: `https://studentconnect-client.onrender.com`

Set these on each service in the Render dashboard under **Environment**:

| Service | Variable | Value |
|---|---|---|
| `studentconnect-api` | `CORS_ORIGIN` | `https://studentconnect-client.onrender.com` |
| `studentconnect-client` | `VITE_API_URL` | `https://studentconnect-api.onrender.com` |

Trigger a manual redeploy on each so the new env vars take effect.

### 5. Bootstrap an admin user

Open the Render shell on `studentconnect-api` and run:

```bash
ADMIN_EMAIL=admin@studentconnect.app ADMIN_PASSWORD=ChangeMeNow123 node scripts/seed-admin.js
```

You can now log in at `<client-url>` with that email and access `/admin/reports`.

---

## Continuous deployment

After the one-time setup, the deployment pipeline runs automatically:

```
PR opened ──▶ GitHub Actions CI ──▶ ✅ checks pass ──▶ merge to main ──▶ Render auto-deploy ──▶ live site updated
                  │
                  └──▶ ❌ fails ──▶ merge blocked (with branch protection)
```

### What CI checks on every PR

`.github/workflows/ci.yml` runs two parallel jobs:

- **server**: spins up Postgres 16, installs deps with `npm ci`, runs the full Jest + Supertest suite.
- **client**: installs deps, runs `eslint`, runs `vite build`.

If both jobs are green, the PR can be merged.

### What runs on `main` push

`.github/workflows/deploy.yml` pings Render's deploy hooks (optional — Render also auto-deploys from `main` on its own when the repo is connected). The workflow only fires after a successful merge to `main`, so failed PRs never reach production.

---

## Enabling branch protection on `main`

To enforce that **a PR must pass CI before it can be merged**:

1. Go to your repo on GitHub → **Settings → Branches → Add branch ruleset** (or "Add classic branch protection rule").
2. **Branch name pattern**: `main`
3. Enable:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
     - Add required checks: `Server (lint + tests)` and `Client (lint + build)`
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Do not allow bypassing the above settings** (recommended)
4. **Save**.

After this, direct pushes to `main` are blocked and every change must go through a passing PR.

---

## Optional: GitHub Actions deploy hooks

If you prefer GitHub Actions to *also* trigger Render deploys (instead of relying solely on Render's own auto-deploy):

1. In each Render web service: **Settings → Deploy Hook → Copy URL**.
2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `RENDER_API_DEPLOY_HOOK` → the API deploy hook URL
   - `RENDER_CLIENT_DEPLOY_HOOK` → the client deploy hook URL

`.github/workflows/deploy.yml` will detect them and ping the hooks on every push to `main`. Without them, the workflow logs a friendly warning and exits successfully.

---

## Local development

```bash
# From the repo root:
npm install
npm run dev
```

This boots both the Express API on `:5001` and the Vite dev server on `:5173`. The Vite proxy routes `/api/*` to the API automatically.

For details on local Postgres setup, see [`README.md`](../README.md).

---

## Known limitation — ephemeral file storage

Render's free web-service plan uses an **ephemeral filesystem**: any file written to disk (including photos uploaded by landlords into `server/uploads/`) is wiped when the service restarts (which happens at every deploy and after ~15 minutes of inactivity on the free plan).

**For a capstone demo this is acceptable** — uploads are stored in Postgres as URL paths and the API still serves them while the dyno is warm. For real production traffic, swap multer's disk storage for object storage:

- **Cloudinary** — generous free tier, drop-in for image uploads
- **AWS S3** / **Backblaze B2** / **Cloudflare R2** — cheap S3-compatible object stores
- **Render Persistent Disks** — works but moves you to a paid plan

The change is isolated to `server/routes/listings.js` (multer storage engine) and doesn't affect the rest of the codebase.

---

## Rollbacks

Render keeps a deploy history per service. To roll back:

1. Open the service in the Render dashboard.
2. **Events → Deploys → Rollback** on the previous successful deploy.

Database rollbacks are **not** included — Render Postgres has daily snapshots on paid plans only. For free-tier safety, dump important data periodically:

```bash
pg_dump $DATABASE_URL > backup-$(date +%F).sql
```
