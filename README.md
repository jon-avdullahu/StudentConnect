<div align="center">

# StudentConnect

**A web platform connecting university students in Prishtina with affordable housing and compatible roommates.**

[![CI](https://github.com/REPLACE_WITH_YOUR_GH_USER/StudentConnect/actions/workflows/ci.yml/badge.svg)](https://github.com/REPLACE_WITH_YOUR_GH_USER/StudentConnect/actions/workflows/ci.yml)
[![Deploy](https://github.com/REPLACE_WITH_YOUR_GH_USER/StudentConnect/actions/workflows/deploy.yml/badge.svg)](https://github.com/REPLACE_WITH_YOUR_GH_USER/StudentConnect/actions/workflows/deploy.yml)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/postgres-16-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

[**Live demo**](https://studentconnect-client.onrender.com) · [**API**](https://studentconnect-api.onrender.com) · [**Docs**](./docs/) · [**Bachelor thesis**](./Bachelor_Thesis.md)

</div>

---

## What it does

StudentConnect replaces the chaotic Facebook-group / WhatsApp-chain workflow that university students in Prishtina currently use to find apartments. It provides:

- **Structured housing listings** with search, filters, photos, and price ranges
- **Role-based accounts** for students, landlords, and administrators
- **In-platform messaging** between students and landlords, scoped to specific listings
- **Roommate team formation** — two students can form a 2-person team and message landlords *jointly* in a single merged thread
- **Content moderation** — any user can report listings/users/messages; admins triage them in a dedicated dashboard
- **Bilingual UI** — English and Albanian, ~160 translation keys per language

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite 7 · React Router 7 · Tailwind CSS v4 · Custom i18n |
| Backend | Node.js · Express 4 · MVC pattern · JWT (bcrypt) · `express-rate-limit` · `multer` |
| Database | PostgreSQL 16 · `pg` · `JSONB` for flexible profile data · transactions + row-level locking |
| CI/CD | GitHub Actions (lint + tests + build on every PR) → auto-deploy to Render on merge |
| Hosting | Render (managed Postgres + Node web service + static site) |

## Architecture

```mermaid
flowchart LR
    subgraph "Client (Vite static site)"
      RC[React 19 SPA]
    end

    subgraph "API (Node.js web service)"
      direction TB
      MW[CORS · JSON · Rate limit · Auth middleware]
      RT[Routes]
      CT[Controllers]
      MD[Models]
      MW --> RT --> CT --> MD
    end

    subgraph "Data tier"
      DB[(PostgreSQL 16<br/>8 tables)]
      FS[(Local /uploads<br/>JPEG/PNG/WebP)]
    end

    RC -- HTTPS / JSON --> MW
    MD -- "Parameterized SQL" --> DB
    CT -- "multer (5 MB cap)" --> FS

    GH[GitHub] -- "Push to main" --> RND[Render auto-deploy]
    RND --> RC
    RND --> MW
```

The backend follows a strict MVC layering: routes attach middleware, controllers validate inputs and orchestrate business logic, models own all SQL through parameterized queries. See [`docs/docs/architecture-mvc.md`](./docs/docs/architecture-mvc.md) for the full breakdown.

## Screenshots

> _Place 4–6 screenshots in `docs/screenshots/` and reference them below. Suggested order: home with listings → listing detail → messages with team invite → admin reports dashboard._

| Home & search | Listing detail |
|:---:|:---:|
| ![home](docs/screenshots/home.png) | ![detail](docs/screenshots/listing-detail.png) |
| **Messages with team invite** | **Admin reports dashboard** |
| ![messages](docs/screenshots/messages.png) | ![admin](docs/screenshots/admin-reports.png) |

## Quick start (local)

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 14 (`brew install postgresql@16` on macOS)
- npm 9+

### 1. Clone & install
```bash
git clone https://github.com/REPLACE_WITH_YOUR_GH_USER/StudentConnect.git
cd StudentConnect
npm install                     # installs concurrently for the dev launcher
npm install --prefix server
npm install --prefix client
```

### 2. Database
```bash
brew services start postgresql@16    # macOS
createdb studentconnect
```
Schema is created automatically by `server/db.js` on first server boot — no manual SQL needed.

### 3. Environment
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
# Edit server/.env: set DATABASE_URL and a strong JWT_SECRET
```
Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Run both servers
```bash
npm run dev
```
- API: http://localhost:5001
- Client: http://localhost:5173 (proxies `/api` to the API automatically)

### 5. (Optional) Create an admin
```bash
cd server
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMeNow123 node scripts/seed-admin.js
```

## Testing

```bash
# Server tests (Jest + Supertest, requires Postgres)
cd server
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/studentconnect_test npm test

# Client lint
cd ../client
npm run lint
```

GitHub Actions runs all of the above on every PR — see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Deployment

The repo includes a **Render Blueprint** (`render.yaml`) that provisions the entire stack — managed Postgres, the API web service, and the static client — with one click.

After connecting the repo to Render, every merge to `main` triggers an automatic deploy. Full step-by-step instructions, including branch-protection rules and rollback procedures, are in [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## API reference

Full reference (22 endpoints across 7 route groups) is in [`docs/docs/backend-implementation.md`](./docs/docs/backend-implementation.md). Selected highlights:

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | – | Register as student or landlord |
| `POST` | `/api/auth/login` | – | Returns JWT (7-day expiry) |
| `GET` | `/api/me` | ✓ | Current user's profile summary |
| `GET` | `/api/listings` | – | Public listings; `?search`, `?min_price`, `?max_price` |
| `POST` | `/api/listings` | ✓ landlord | Create listing (multipart, ≤ 5 photos, 5 MB each) |
| `POST` | `/api/teams/invite` | ✓ student | Invite another student to a 2-person team |
| `POST` | `/api/teams/invitations/:id/accept` | ✓ | Accept invitation (transactional + row-locked) |
| `POST` | `/api/reports` | ✓ | Report a listing/user/message |
| `GET` | `/api/reports` | ✓ admin | List reports; `?status` filter |

## Security

A dedicated thesis chapter and a docs page cover this in detail ([`docs/docs/security.md`](./docs/docs/security.md)). Highlights:

- **Password hashing**: bcrypt, cost factor 10
- **Sessions**: stateless JWT (HS256), 7-day expiry
- **RBAC**: `student` / `landlord` / `admin` enforced at the controller layer
- **IDOR prevention**: ownership checks on every mutating listing/profile/team endpoint
- **SQL injection**: parameterized queries everywhere; no string interpolation
- **Rate limiting**: 400 req / 15 min / IP across `/api/*`
- **File uploads**: MIME whitelist (JPEG/PNG/WebP) + 5 MB per-file cap
- **Anti-enumeration**: identical error messages for unknown email and wrong password

Acknowledged limitations (token storage in `localStorage`, no email verification yet, no formal schema validator) are documented openly in the thesis Chapter 8.

## Project structure

```
StudentConnect/
├── client/                     # React 19 + Vite SPA
│   ├── src/
│   │   ├── pages/              # 11 routes
│   │   ├── components/         # Navbar, ListingCard, ReportModal, ...
│   │   ├── context/            # TeamContext, LocaleContext
│   │   ├── i18n/locales.js     # ~160 keys × 2 languages
│   │   └── api.js              # Centralized fetch wrappers
│   └── .env.example
├── server/                     # Express MVC API
│   ├── app.js                  # createApp() — used by tests + server.js
│   ├── server.js               # Production entry (initDb + listen)
│   ├── routes/                 # 7 route files
│   ├── controllers/            # 7 controllers
│   ├── models/                 # 5 models, all parameterized SQL
│   ├── middleware/auth.js      # JWT verification
│   ├── scripts/seed-admin.js   # Admin bootstrap
│   ├── __tests__/              # Jest + Supertest suite
│   └── .env.example
├── docs/                       # Docusaurus site + DEPLOYMENT.md
├── .github/
│   ├── workflows/ci.yml        # PR pipeline
│   ├── workflows/deploy.yml    # Auto-deploy on main merge
│   └── pull_request_template.md
├── render.yaml                 # Render Blueprint — full infra-as-code
└── Bachelor_Thesis.md          # Capstone thesis document
```

## Team — ShieldSec

| Member | Role |
|---|---|
| Art Krasniqi | Project Manager |
| **Jon Avdullahu** | **Backend Developer & Incident Response Lead** |
| Mert Sylqiq | UI/UX Designer |
| Nol Ahmedi | QA & Documentation |
| Taulant Parduzi | Full-Stack Developer |

## License

MIT — see [`LICENSE`](./LICENSE) (add one if you intend to publish).
