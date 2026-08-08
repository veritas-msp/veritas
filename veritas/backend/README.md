# Veritas Backend

REST API for the [Veritas](https://github.com/veritas-msp/veritas) platform: authentication, CRM, ticketing, administration, client portal, and RMM.

**Stack:** Node.js 20 · Express · PostgreSQL 15

This package lives in the Veritas monorepo at `veritas/backend`.

## Requirements

- Node.js 20+
- PostgreSQL 15+

## Setup

From this directory:

```bash
cp .env.example .env
# DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY
npm install
npm start
```

Or from `veritas/` (backend + frontend together):

```bash
npm run install:all
npm run dev
```

API: http://localhost:3001

Initial setup (with the frontend running): http://localhost:3000/setup

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `ENCRYPTION_KEY` | Encryption key for sensitive fields |
| `VERITAS_EDITION` | `community` (default) or `pro` |

See [.env.example](./.env.example) for all variables.

## Database schema

Fresh installs use `schema/schema_export.csv` via the setup wizard at `/setup`.

Existing instances receive incremental patches from `schema/patches/` automatically at startup (or via `npm run schema:incremental`).

## Scripts (`scripts/`)

| File | npm | Role |
|------|-----|------|
| `apply-missing-migrations.mjs` | `npm run schema:incremental` | Applies missing DB patches on an existing instance |
| `build-rmm-windows-cmd.mjs` | `npm run build:rmm-agent:cmd` | Generates the Windows RMM agent `.cmd` launcher |
| `build-rmm-windows-msi.ps1` | *(called by the script below)* | Builds the `.msi` installer (Windows + WiX Toolset) |
| `build-rmm-windows-agent.mjs` | `npm run build:rmm-agent` | Full RMM agent build: `.cmd` then `.msi` on Windows |

```bash
npm run schema:incremental   # missing DB patches
npm run build:rmm-agent:cmd  # Windows launcher (.cmd)
npm run build:rmm-agent      # .cmd + .msi (Windows + WiX)
```

## Docker

From the repository root:

```bash
docker compose up -d --build veritas-backend
```

## License

[GNU Affero General Public License v3.0-or-later](./LICENSE)
