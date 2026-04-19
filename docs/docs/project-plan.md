---
id: project-plan
title: Project Realization Plan
sidebar_position: 1
---

# StudentConnect — Technical Realization & Execution Plan

Based on the StudentConnect Documentation, this document outlines the best-practice technical approach to realize the project successfully within the given constraints (20-week timeline, €150–200 budget, 5-person team).

## 1. Executive Technical Summary

The goal is to build an MVP for a student housing marketplace. Since the primary target is university students in Prishtina, a mobile-first responsive web application (Progressive Web App - PWA) is the most viable approach.

## 2. Technology Stack

### Frontend (UI/UX)
*   **Framework:** Next.js (React) or Vite (React).
*   **Styling:** Tailwind CSS.
*   **Mobile Approach:** PWA.

### Backend (API & Database)
*   **Framework:** Node.js with Express.js.
*   **Database:** PostgreSQL.
*   **DB Hosting:** Supabase.

### DevOps & Hosting
*   **Frontend Hosting:** Vercel or Netlify.
*   **Backend Hosting:** Render or Railway or Supabase.

## 3. Database Design

### Core Entities
1.  **Users:** `id`, `email`, `password_hash`, `role`, `bio`, `preferences`, `created_at`.
2.  **Listings:** `id`, `owner_id`, `title`, `description`, `price`, `location_lat`, `location_lng`, `status`, `created_at`.
3.  **Photos:** `id`, `listing_id`, `url`.
4.  **Messages:** `id`, `sender_id`, `receiver_id`, `listing_id`, `content`, `timestamp`, `is_read`.
5.  **Reports:** `id`, `reporter_id`, `reported_entity_type`, `entity_id`, `reason`, `status`.

## 4. Work Phases
*   **Phase 1:** Foundation & Design
*   **Phase 2:** Core Infrastructure & Auth
*   **Phase 3:** Listings & Search
*   **Phase 4:** Messaging & Moderation
*   **Phase 5:** Testing, Hardening & Deployment
