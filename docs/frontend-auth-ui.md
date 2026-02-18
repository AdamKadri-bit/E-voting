# Frontend (V1) — Auth UI + GovShell Layout

This document explains what has been implemented on the frontend so far, why it is structured this way, and how to run/extend it.

> Scope: **UI only** (no backend auth yet).  
> Target: Lebanon Secure E-Voting portal prototype (integrity-first, audit-friendly UI wording).

---

## 1) Tech stack (current)
- React + TypeScript (Vite)
- React Router (page routing)
- lucide-react (icons)
- Custom CSS in `src/index.css` (no Tailwind)

---

## 2) Folder / file structure (frontend)
Typical relevant files:
- `frontend/src/main.tsx`
  - App bootstrap
  - imports global CSS (`index.css`)
  - router mount
- `frontend/src/index.css`
  - Theme tokens (dark/light)
  - Layout styles for GovShell, hero, cards, pills, sections
  - Scroll-hint animation + hide/show transitions
- `frontend/src/ui/useGovTheme.ts`
  - Handles theme state (dark/light)
  - Applies theme attribute to document root (`data-theme`)
  - Persists theme choice (localStorage)
- `frontend/src/ui/GovShell.tsx`
  - Main layout shell:
    - fixed top bar (logo/title + theme button)
    - hero area (auth form)
    - feature tiles (pills)
    - long scroll sections (security & legal explanation)
  - “Jump to form / Sign in / Sign up” appears when the auth form is not visible
- `frontend/src/pages/Login.tsx` (or similar)
  - Sign-in form UI
- `frontend/src/pages/Signup.tsx` (or similar)
  - Sign-up form UI

(Exact page file names may vary depending on our current router setup, but the shell and styling are consistent.)

---

## 3) Theme system (dark/light)
### How it works
- Theme is stored as `data-theme="dark|light"` on `:root` (`document.documentElement`).
- CSS variables define the entire color system:
  - `--gov-bg`, `--gov-ink`, `--gov-muted`, `--gov-edge`, `--gov-gold`
  - Card backgrounds and shadows: `--gov-card`, `--gov-card2`, `--gov-shadow`

### Design intent
- **Dark mode**: modern, “secure terminal” feel, strong contrast.
- **Light mode**: parchment/institutional look to feel more like an official portal.

### Where to change colors
- `src/index.css`
  - `:root { ... }` controls dark theme tokens.
  - `:root[data-theme="light"] { ... }` controls light theme tokens.

---

## 4) GovShell layout design
`GovShell.tsx` is the main layout component.

### Top bar (fixed)
- Always visible.
- Contains:
  - Portal title + Arabic subtitle
  - Theme toggle button
  - When auth form is not visible: quick actions (“Jump to form”, “Sign in”, “Sign up”)

### Hero section (above the fold)
- Centered headline:
  - “Your vote. Verifiable. Protected.”
- The auth form content is passed into GovShell via the `right` prop.
  - This allows `Login` and `Signup` pages to reuse the exact same shell.
- Below the form: a full-width row of 4 “square pills” (feature tiles).

### Scroll sections (learn more)
Below hero we show large cards explaining:
- Legal alignment (Lebanon) — references the parliamentary framework (Law 44/2017) at a high level
- Integrity & transparency
- Data security & privacy
- Voter trust
- Remote voting limitation

These sections are intentionally written to support a strict jury defense:
- clear claims
- avoid “magic security” language
- acknowledge remote voting limits honestly

---

## 5) “Scroll to learn more” indicator (smart behavior)
We added a bottom scroll hint animation, but it must not overlap content.

### Requirements
- If the form grows (Signup), the hint must not overlap the feature pills.
- The hint should disappear while the user scrolls.
- The hint appears only when:
  - user is at the very top (`scrollY < ~8`)
  - user is not actively scrolling (debounced)
  - there is enough free space between hero bottom and pill band

### How it is implemented
In `GovShell.tsx`:
- We track:
  - `heroRef` → the hero section element
  - `pillBandRef` → feature pills container
  - `showScrollHint` state
- On scroll:
  - hide immediately
  - after a short delay (debounce) recompute if it should show
- “Enough space” is calculated using element bounding rectangles:
  - `free = heroRect.bottom - pillRect.bottom`
  - show only if `free > 90px`

In `index.css`:
- `.govScrollHintWrap.isHidden` fades and shifts the hint out.

---

## 6) Running the frontend locally
From repo root:
```bash
cd frontend
npm install
npm run dev
