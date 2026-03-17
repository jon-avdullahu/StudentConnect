# StudentConnect

A web platform connecting university students in Kosovo with affordable housing options and compatible roommates.

## Team — ShieldSec

- Art Krasniqi — Project Manager
- Jon Avdullahu — Backend Developer
- Mert Sylqiq — UI/UX Designer
- Nol Ahmedi — QA & Documentation
- Taulant Parduzi — Full-Stack Developer

## Tech Stack

- **Frontend:** React (Vite), React Router
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Auth:** JWT, bcrypt

## Getting Started

### 1. Database (PostgreSQL)

**Install PostgreSQL on Ubuntu/Debian** (if not already installed):

```bash
# Server + client (for local development)
sudo apt update
sudo apt install postgresql postgresql-contrib
```

To only get the `createdb` / `psql` tools (e.g. you use a remote DB):

```bash
sudo apt install postgresql-client
```

**Create the database and schema:**

```bash
# If using local Postgres, create a user and DB (often your Linux user works)
sudo -u postgres createuser -s $USER   # optional: allow your user to create DBs
createdb studentconnect
psql -d studentconnect -f server/scripts/init-db.sql
```

Or set `DATABASE_URL` in `.env` to your existing Postgres connection string (e.g. a cloud DB).

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET
npm install
npm run dev
```

Server runs at `http://localhost:5000`.

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Client runs at `http://localhost:5173` and proxies `/api` to the backend.

## Features (current)

- **User registration** — email, password, full name, optional university
- **User login** — JWT-based auth, token stored in localStorage
- **Protected API** — `/api/me` requires `Authorization: Bearer <token>`

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (body: email, password, fullName, university?) |
| POST | `/api/auth/login` | Login (body: email, password) |
| GET | `/api/me` | Current user (header: `Authorization: Bearer <token>`) |
