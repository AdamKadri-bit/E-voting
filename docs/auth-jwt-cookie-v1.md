# Auth v1 — JWT in HttpOnly Cookie + Email Verification

This document explains what was implemented for authentication in the E-Voting project (Laravel backend + Vite/React frontend), why it was implemented this way, and how to test it locally.

---

## High-level Goal

Implement secure authentication for:
- User registration
- Email verification (required)
- Login (denied if email is not verified)
- Authenticated identity endpoint (`/api/me`)
- Frontend forms wired to backend (no more manual console-only testing)

We intentionally chose:
- **JWT access token stored in an HttpOnly cookie**
- **Stateless auth** (no server sessions required for API auth)
- **Email verification before login**

---

## Local URLs

Frontend:
- http://localhost:5173

Backend:
- http://localhost:8000 (important: we use `localhost` not `127.0.0.1` to avoid cookie quirks)

---

## Key Security Decisions

### Why JWT in HttpOnly Cookie?
- HttpOnly cookie can’t be read by JavaScript → reduces XSS token theft.
- Browser automatically attaches cookie → easier for frontend requests.
- Works cleanly with `credentials: "include"` fetch requests.

### Why JWT is NOT stored in database
We are using **stateless auth**:
- Server verifies signature + expiration using `JWT_SECRET`.
- No need to store access tokens in DB.
- Storing access tokens would add DB overhead and complexity.

### Sessions Table
The `sessions` table staying empty is normal because:
- We did not use session-based auth for API requests.
- JWT cookie auth does not require DB sessions.

---

## Backend Implementation

### CORS (cross-origin)
Because frontend and backend run on different origins (`localhost:5173` vs `localhost:8000`), the browser enforces CORS.

We configured CORS to allow the frontend origin and credentials so cookies work:
- Allowed origin: `http://localhost:5173`
- `supports_credentials = true`

This enables fetch calls like:
```js
fetch("http://localhost:8000/api/me", { credentials: "include" })
