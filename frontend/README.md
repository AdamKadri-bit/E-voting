# Frontend

React 19 + TypeScript + Vite. Setup, demo accounts and every command are in the
[root README](../README.md); the design is in [`docs/DIASPORA_AND_E2E.md`](../docs/DIASPORA_AND_E2E.md).

| Command | What it does |
|---|---|
| `npm run dev` | development server on http://localhost:5173 |
| `npm run build` | typecheck + production build (CSP, SRI, crypto-bundle hash) |
| `npm test` | ballot-cryptography unit tests (Vitest) |
| `npx playwright test` | end-to-end tests on an isolated, freshly seeded stack, six viewports |
| `npm run verify -- --election <id>` | independent election verifier (CLI) |

`src/crypto/` holds the ballot cryptography; `src/crypto/worker.ts` is the Web
Worker whose SHA-256 the bulletin board publishes.
