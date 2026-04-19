# Go Live — Step-by-Step

Follow these steps **in order**. Total time: ~20 minutes. You only do this once.

The repo has already been audited and patched for production:

- Postgres SSL enabled automatically when `NODE_ENV=production`
- All client API calls go through `apiUrl()` so they hit the API origin in prod
- Photo URLs go through `assetUrl()` so they resolve against the API origin
- `trust proxy` enabled so rate-limiting works behind Render's proxy
- `uploads/` directory auto-created on boot
- Health-check endpoint at `/healthz`

---

## 0. Sanity check before you push

```bash
# from the repo root
cd client && npm run lint && npm run build && cd ..
cd server && node -e "require('./app').createApp(); console.log('ok')" && cd ..
```

Both should print success. (Tests need a local Postgres; CI will run them with one.)

---

## 1. Push the changes to a PR

```bash
git checkout -b chore/production-hardening
git add .
git commit -m "chore: production-harden for Render deploy

- Enable Postgres SSL when NODE_ENV=production (Render requires it)
- Centralize API base URL via apiUrl() / assetUrl() helpers
- Prefix all raw fetch calls so they resolve to the API origin in prod
- Trust Render's reverse proxy for accurate rate-limit IPs
- Auto-create uploads/ on boot
- Add CORS headers + cache headers to served uploads"
git push -u origin chore/production-hardening
gh pr create --title "Production hardening for Render deploy" --body "Fixes 4 deployment landmines: DB SSL, API base URL prefix, photo URL prefix, proxy trust. See commit message for details."
```

CI runs (lint + tests + build). When it goes green, **merge the PR on GitHub**.

---

## 2. Create the Render account

1. Open https://render.com/register and sign up with **your GitHub account** (this also grants Render permission to read your repos).
2. On the welcome screen pick **Connect your GitHub** and authorise it for the `StudentConnect` repository (you can use "Only select repositories").

You do **not** need to add a credit card. The whole stack runs on the free tier.

---

## 3. Provision the stack from the blueprint

1. In the Render dashboard click the **+ New** button (top-right) → **Blueprint**.
2. Pick the `StudentConnect` repo.
3. Render parses `render.yaml` and shows three resources:
   - `studentconnect-db`  (PostgreSQL, free, 1 GB)
   - `studentconnect-api` (Web service, Node, Frankfurt, free)
   - `studentconnect-client` (Static site, free)
4. Give the blueprint a name (e.g. `studentconnect-prod`) and click **Apply**.
5. Render starts building. Wait 3–5 min until you see two green dots and the URLs appear.

When it's done you'll have:

- API:    `https://studentconnect-api.onrender.com`   *(or `studentconnect-api-XXXX` if the name is taken)*
- Client: `https://studentconnect-client.onrender.com`
- DB:     internal connection string (Render injects it automatically)

> **Write both URLs down — you need them in the next step.**

---

## 4. Wire the two services together (one-time, 30 seconds)

Each service still needs to know the other's URL.

### 4a. Tell the API which client origin to allow (CORS)

1. In the Render dashboard open **studentconnect-api → Environment**.
2. Find `CORS_ORIGIN` (it's already listed but empty).
3. Set value: `https://studentconnect-client.onrender.com` (your actual client URL).
4. Click **Save Changes** — Render redeploys the API automatically (~1 min).

### 4b. Tell the client where the API lives

1. Open **studentconnect-client → Environment**.
2. Find `VITE_API_URL`.
3. Set value: `https://studentconnect-api.onrender.com` (your actual API URL).
4. **Save Changes** — Render rebuilds the client automatically (~2 min).

> The client's value is baked into the JavaScript at build time, so the static site **must** be redeployed after you change `VITE_API_URL`. Render does this for you when you click Save.

---

## 5. Smoke-test the live deployment

Once both services are green again, run:

```bash
# Replace with your actual API URL
curl https://studentconnect-api.onrender.com/healthz
# Expect: {"status":"ok","uptime":<some number>}

curl https://studentconnect-api.onrender.com/api/listings
# Expect: [] (empty array — no listings yet)
```

Then open `https://studentconnect-client.onrender.com` in a browser:

- The Home page should load.
- Click **Sign Up**, register a new student account → you should be logged in and redirected home.
- DevTools → Network: confirm the requests go to the **API URL**, not the client URL, and return 200.

If you see CORS errors in the console, double-check that `CORS_ORIGIN` matches the client URL **exactly** (no trailing slash).

---

## 6. Create your admin user

The blueprint doesn't seed an admin — do it once now.

1. In Render open **studentconnect-api → Shell** (left sidebar).
2. Run:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=PickAStrongOne123! node scripts/seed-admin.js
```

3. Log in at the client URL with those credentials. You can now visit `/admin/reports`.

If you'd rather promote an existing user instead of creating a new one:

```bash
PROMOTE_EMAIL=existing@user.com node scripts/seed-admin.js
```

---

## 7. Lock down `main` so deploys are PR-only

This is the part you specifically asked for: **never push straight to main, every change must go through a passing PR**.

1. On GitHub: your repo → **Settings → Branches → Add branch ruleset** (or "Add classic branch protection rule").
2. **Branch name pattern**: `main`
3. Tick:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - In "Status checks that must pass" search for and add:
       - `Server (lint + tests)`
       - `Client (lint + build)`
   - ✅ Require branches to be up to date before merging
   - ✅ Block force pushes
   - ✅ Do not allow bypassing the above settings  *(important — without this you can still self-bypass as repo owner)*
4. **Save changes**.

Verify it works:

```bash
git checkout main
git pull
echo "test" >> README.md
git commit -am "test"
git push origin main
```

You should see:

```
remote: error: GH013: Repository rule violations found for refs/heads/main.
```

Good — protection is live. Undo:

```bash
git reset --hard HEAD~1
```

From now on the only way to update production is: **branch → PR → CI passes → merge → Render auto-deploys**.

---

## 8. (Optional) Custom domain

If you have a domain (e.g. `studentconnect.app`):

1. Render → **studentconnect-client → Settings → Custom Domains → Add**.
2. Render gives you a CNAME / A record. Add it in your DNS provider.
3. Render auto-provisions a Let's Encrypt cert in 1–5 min.
4. Update `CORS_ORIGIN` on the API to the new domain.
5. Update `VITE_API_URL` on the client only if you're also moving the API to a custom domain.

---

## What's next

Now that you're live, the day-to-day workflow is:

```bash
git checkout -b feature/something
# work, commit
git push -u origin feature/something
gh pr create
# CI runs — wait for green
# merge on GitHub
# ☕ Render redeploys automatically in ~3 min
```

That's it. You're shipping.

---

## Troubleshooting cheat-sheet

| Symptom | Likely cause | Fix |
|---|---|---|
| API 500s on first request | Cold start (free plan sleeps after 15 min) | Wait 30 s, retry |
| "no pg_hba.conf entry" in API logs | SSL not negotiated | Confirm `NODE_ENV=production` is set on the API |
| Client console: "CORS blocked" | `CORS_ORIGIN` mismatch or trailing slash | Set to exact client URL |
| Client requests go to client URL not API | `VITE_API_URL` wasn't set, or client wasn't rebuilt after change | Set value, click Save (forces rebuild) |
| Photos vanish after a few hours | Render free disk is ephemeral (documented limitation) | Move uploads to Cloudinary/S3 — see DEPLOYMENT.md |
| `429 Too Many Requests` from your own IP | Rate limit hit (default 400 req / 15 min / IP) | Bump `API_RATE_LIMIT_MAX` env var on the API |
