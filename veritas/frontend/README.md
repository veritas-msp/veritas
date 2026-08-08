# Veritas Frontend

Web UI for the [Veritas](https://github.com/veritas-msp/veritas) platform: MSP workspace, administration, and client portal.

**Stack:** React 18 · Create React App

This package lives in the Veritas monorepo at `veritas/frontend`.

## Requirements

- Node.js 20+
- Running Veritas backend (`veritas/backend`)

## Setup

From this directory:

```bash
cp .env.example .env
# REACT_APP_VERITAS_EDITION=community
npm install
npm start
```

Or from `veritas/` (backend + frontend together):

```bash
npm run install:all
npm run dev
```

App: http://localhost:3000

Initial setup: http://localhost:3000/setup

## Environment

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_BASE_URL` | API URL (empty = same origin in Docker) |
| `REACT_APP_VERITAS_EDITION` | `community` or `pro` |

## Build

```bash
npm run build
```

Production builds are served by nginx in Docker, with `/api` proxied to the backend.

## Docker

From the repository root:

```bash
docker compose up -d --build veritas-frontend
```

## License

[GNU Affero General Public License v3.0-or-later](./LICENSE)
