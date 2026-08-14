# Secure E-Voting System

## Tech Stack
- Frontend: React (Vite)
- Backend: Laravel (PHP)
- Database: MySQL
- Hosting: AWS
- Blockchain: Permissioned (Hash Anchoring Only)

## Project Goal
Build a secure, auditable, and transparent electronic voting system with multi-layer trust architecture.

## Development Workflow
Database → Frontend → Backend → Integration → Testing → Deployment

## Roles
- Migration Owner: [Adam Kadri]
- Development: Shared between Adam Kadri and Hadi Rhimi

---

## Local Setup

Both machines must match on the items below. Everything else is handled by the
lock files, and CI enforces it on every PR.

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| PHP | 8.3.x | Pinned in `backend/composer.json` (`config.platform.php`). 8.4 works too, but resolution always targets 8.3. |
| Node | 24.x | |
| MySQL | 8.x | Local server; the test suite uses in-memory SQLite instead. |
| Composer | 2.x | |

### PHP extensions (do this once)

Open your `php.ini` — find it with `php --ini` — and make sure these three lines
are **not** commented out (no leading `;`):

```ini
extension=pdo_sqlite
extension=sodium
extension=sqlite3
```

They ship with PHP already; they are just switched off by default. Verify:

```bash
php -r "echo extension_loaded('sodium') ? 'ok' : 'MISSING SODIUM';"
```

`sodium` is a hard requirement (`lcobucci/jwt`, via `tymon/jwt-auth`).
`pdo_sqlite` and `sqlite3` are what the test suite runs on — without them
every feature test fails with `could not find driver`.

### First-time install

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
```

```bash
cd frontend
cp .env.example .env
npm ci
```

### Running it

Two terminals. Backend first — `SERVER_PORT=8001` in `backend/.env` makes it
bind the port `frontend/.env` expects, so no `--port` flag is needed. Without
that variable `artisan serve` defaults to **8000** and every request from the
frontend fails with `ERR_CONNECTION_REFUSED`:

```bash
cd backend
php artisan serve
```

```bash
npm --prefix frontend run dev
```

---

## Keeping both machines in sync

Most of the breakages so far came from one machine resolving dependencies
differently than the other. Three rules prevent it:

**1. Use `composer install`, not `composer update`.**
`install` reads `composer.lock` and gives you exactly what your teammate has.
`update` re-resolves everything and rewrites the lock — run it only when you are
deliberately changing a dependency, and say so in the PR.

**2. Don't hand-edit `composer.lock` or `package-lock.json`.**
If a merge conflicts in a lock file, resolve the conflict in `composer.json` /
`package.json` first, then regenerate the lock.

**3. Never commit secrets.**
`backend/google-credentials.json`, `backend/cacert.pem` and every `.env` are
gitignored. If `git status` ever shows one of them as untracked, the root
`.gitignore` is broken — fix that before committing anything else.

### Why the platform pin exists

`backend/composer.json` contains:

```json
"config": {
    "platform": { "php": "8.3.0" }
}
```

This tells Composer to resolve dependencies *as if* it were running PHP 8.3.0,
no matter what the machine actually has. Without it, running `composer update`
on PHP 8.4 pulls in packages that require 8.4 and instantly breaks anyone on
8.3 — which is exactly what happened in #17. The required extensions are
declared in `require` / `require-dev` for the same reason: so a machine missing
one fails loudly at install time instead of silently resolving to different
package versions.

### CI

`.github/workflows/ci.yml` runs on every PR: it installs from the lock files on
PHP 8.3 with the extension set above, checks `composer.json` and `composer.lock`
agree, runs the test suite, and typechecks and builds the frontend. A dependency
change that only works on one machine turns the PR red instead of reaching main.
