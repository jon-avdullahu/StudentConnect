---
id: backend-implementation
title: Backend Implementation
sidebar_position: 2
---

# Backend Implementation (Phases 3 & 4)

We implemented the core Express backend strictly following the Realization Plan.

## 1. Database Initialization

The `initDb` function in `server/db.js` executes DDL queries on startup for the following entities:
- `users`: Includes roles (`student`, `landlord`, `admin`), bios, and JSONB preferences.
- `listings`: Housing listing details with owner foreign key.
- `photos`: Image URLs linked to listings (uploaded via multer to `/uploads/`).
- `messages`: Connects two users with optional listing context, team messaging, and message types.
- `teams` / `team_members` / `team_invitations`: 2-person roommate team system.
- `reports`: User-submitted reports for listings, users, or messages.

## 2. API Endpoints

### Listings API (`/api/listings`)
- `GET /` — Fetches active listings (with `?search`, `?min_price`, `?max_price`).
- `GET /:id` — Fetches a single listing with its related photos.
- `POST /` — Landlord-only endpoint to publish housing with photo uploads (multer, max 5 files, 5 MB each).
- `PUT /:id` — Owner can edit listing details or manage photos.
- `DELETE /:id` — Discard listing (owner only).

### Messaging API (`/api/messages`)
- `GET /` — Provides recent conversations with unread counts.
- `GET /:chatUserId` — Returns direct chat thread, supports `?team=` for landlord team views.
- `POST /` — Send a message (supports `as_team` for team messaging to landlords).

### Reports API (`/api/reports`)
- `POST /` — Let any authenticated user report a listing, user, or message.
- `GET /` & `PUT /:id/status` — **Admin-only** endpoints to manage reports (`pending`, `reviewed`, `resolved`, `dismissed`).

### Profile API (`/api/me/profile`)
- `GET /` — Current student's profile with preferences.
- `PATCH /` — Update bio, university, preferences (students only).

### Students API (`/api/students`)
- `GET /` — Student directory with search and pagination.
- `GET /:id` — Public student profile.

### Teams API (`/api/teams`)
- `GET /mine` — Current user's team.
- `POST /invite` — Invite a student to form a 2-person team.
- `POST /invitations/:id/accept` — Accept a team invitation.
- `POST /invitations/:id/decline` — Decline a team invitation.
- `POST /invitations/:id/cancel` — Cancel a sent invitation.
