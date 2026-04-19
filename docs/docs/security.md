---
id: security
title: Security Strategies
sidebar_position: 3
---

# Security & Incident Response

As specifically defined by Jon's role as Incident Response Lead, we implemented essential security procedures right into our initial build to avoid brute-force and data destruction.

## 1. Rate Limiting
We utilize `express-rate-limit` globally on all `/api/` endpoints natively in the Express.js instance. This applies an upper bound (default 400 requests per 15-minute window for a specific IP, configurable via `API_RATE_LIMIT_MAX`). The higher default accommodates message polling and multi-tab development while still defending login routes against basic brute-forcing.

## 2. Authentication and Authorization
We have created an `authMiddleware` JWT verification guard. This middleware ensures the user acts autonomously and acts as a layer of trust. In the Listings API (`PUT`, `DELETE`), we've layered another logical check:
```js
  const listingRes = await pool.query('SELECT owner_id FROM listings WHERE id = $1', [id]);
  if (listingRes.rows[0].owner_id !== req.userId) {
    return res.status(403).json({ error: 'You do not have permission' });
  }
```
This entirely prohibits IDOR (Insecure Direct Object Reference).

## 3. SQL Injection Avoidance
We solely rely on parametrized queries using `pg`'s native placeholders (`$1`, `$2`), effectively decoupling query arguments from interpretation parsing. `zod` and structural validation can be added natively in the next iteration for stricter JSON shaping.
