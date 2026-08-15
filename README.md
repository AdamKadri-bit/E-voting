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
extension=gd
extension=zip
```

They ship with PHP already; they are just switched off by default. Verify:

```bash
php -r "echo extension_loaded('sodium') ? 'ok' : 'MISSING SODIUM';"
```

`sodium` is a hard requirement (`lcobucci/jwt`, via `tymon/jwt-auth`).
`pdo_sqlite` and `sqlite3` are what the test suite runs on — without them
every feature test fails with `could not find driver`. `gd` and `zip` are what
`phpoffice/phpspreadsheet` needs to read and write the candidate import
spreadsheets. Run `composer check-platform-reqs` in `backend/` to confirm the
full set.

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

### ID scanning (Google Cloud Vision)

The Lebanese ID scan calls Google Cloud Vision. It needs a service-account key
that is **not** in the repository — `backend/google-credentials.json` is
git-ignored, so every machine supplies its own. Everything else about the
feature already works without setup; only the scan itself fails.

Check where a machine stands:

```bash
php artisan ocr:check
```

It prints the exact setup steps when the key is missing, and `--live` sends a
test image to Google so credential, billing and API-enablement problems surface
with the real reason instead of a generic failure.

There are two ways to give a machine credentials.

**A — sign in, no key file.** Best when the Cloud project belongs to a
teammate: the login happens in your own browser and leaves nothing long-lived
in the repo.

```bash
brew install --cask google-cloud-sdk
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

**B — service-account key file.** Cloud console → pick the project → enable the
[Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
→ enable billing (Vision has a free monthly tier but still requires it) → IAM &
Admin → Service Accounts → Keys → Add key → JSON. Drop the file at
`backend/google-credentials.json`, or point `GOOGLE_APPLICATION_CREDENTIALS`
at it.

A key file authenticates *as the project*, so a copy passed between developers
means shared quota, shared billing, and no way to revoke one person without
breaking the other. Prefer A when you can; never commit the key.

Without a key the API answers a scan with a generic 503 and logs the real cause
server-side — that is deliberate, since provider errors carry project
identifiers. `ocr:check` is how you tell a misconfigured machine from an outage.

### Closing elections automatically

Polling closes at the hour the election law fixes, not when an administrator
gets around to it. `elections:auto-close` moves any active election past its
`ends_at` to `closed`; it is scheduled every minute in `routes/console.php`, so
a third terminal keeps that honest during development:

```bash
php artisan schedule:work
```

Without it nothing is lost — the admin panel also runs the sweep whenever it
reads election data — but the status only updates when someone opens the panel.

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
