<p align="center">
  <img src="./docs/assets/veritas-banner.png" alt="Veritas, open source MSP platform" width="720">
</p>

<p align="center">
  <strong>Self-hosted MSP platform combining PSA, ITSM, and RMM in one place.</strong>
</p>

<p align="center">
  <a href="https://veritas-msp.com">Website</a> ·
  <a href="./EDITIONS.md">Editions</a> ·
  <a href="https://github.com/veritas-msp">GitHub Organization</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License: AGPL v3">
  <img src="https://img.shields.io/badge/Deployment-on--premise-2ea44f" alt="On-premise">
  <img src="https://img.shields.io/badge/Open%20Core-Community%20%2B%20Pro-6366f1" alt="Open Core">
</p>

---

## Overview

**Veritas** centralizes day-to-day MSP operations: companies and contacts (PSA), support tickets (ITSM), infrastructure supervision, and RMM. Everything runs on your own infrastructure.

| Component | Path |
|-----------|------|
| API & database | `veritas/backend` |
| Web UI | `veritas/frontend` |
| Windows RMM agent | `veritas/RMM/Agents/windows` |

This repository is a monorepo: clone once, then run with Docker or from source.

## Screenshots

### Helpdesk

Ticket views, filters, and assignment for your support team.

<p align="center">
  <img src="./docs/assets/veritas-helpdesk.png" alt="Veritas helpdesk showing ticket list and views" width="900">
</p>

### Ticket workspace

Full ticket detail: conversation thread, properties, linked hardware, and resolution workflow.

<p align="center">
  <img src="./docs/assets/veritas-supportticket.png" alt="Veritas support ticket with conversation and ticket properties" width="900">
</p>

### Supervision center

Infrastructure inventory by site and device type, including servers, storage, network, workstations, and RMM agents.

<p align="center">
  <img src="./docs/assets/veritas-supervisioncenter.png" alt="Veritas supervision center infrastructure monitoring dashboard" width="900">
</p>

### Administration

Language, timezone, appearance, and organization settings from a single admin area.

<p align="center">
  <img src="./docs/assets/veritas-settings.png" alt="Veritas administration general settings" width="900">
</p>

### Client portal

Dedicated sign-in for end users: equipment, documents, and tickets from their company portal.

<p align="center">
  <img src="./docs/assets/veritas-login-clientportal.png" alt="Veritas client portal sign-in page" width="900">
</p>

---

## Deploy with Docker

```bash
git clone https://github.com/veritas-msp/veritas.git
cd veritas
cp .env.docker.example .env
docker compose up -d --build
```

Then open **http://SERVER_IP:3000/setup** (secrets and database are configured in the wizard).

| Service | URL |
|---------|-----|
| Web UI | http://SERVER_IP:3000 |
| API | http://SERVER_IP:3001 |

Data is stored in Docker volumes `veritas-db` and `veritas-uploads`.

If the frontend build runs out of memory on a small VPS, add 2–4 GB of swap, then rebuild:

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
docker compose build --no-cache veritas-frontend && docker compose up -d
```

## Development (from source)

Requires Node.js 20+, PostgreSQL 15+, npm, Git.

```bash
git clone https://github.com/veritas-msp/veritas.git
cd veritas/veritas
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run install:all
npm run dev
```

Open http://localhost:3000/setup

| Variable | File | Description |
|----------|------|-------------|
| `JWT_SECRET` / `ENCRYPTION_KEY` | `backend/.env` | App secrets |
| `DATABASE_URL` | `backend/.env` | Optional until `/setup` |
| `VERITAS_EDITION` | `backend/.env` | `community` or `pro` |
| `REACT_APP_API_BASE_URL` | `frontend/.env` | Default `http://localhost:3001` |
| `REACT_APP_VERITAS_EDITION` | `frontend/.env` | `community` or `pro` |

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend | 3001 |
| PostgreSQL | 5432 |

## Production

Put a reverse proxy (nginx, Traefik, Caddy, …) in front of port 3000 for TLS. Set `ALLOWED_ORIGINS` and `FRONTEND_BASE_URL` in `.env` to your public URL.

## Editions

Community and Pro differ in modules and quotas (companies, contacts, agents, RMM endpoints, etc.). Details: [EDITIONS.md](./EDITIONS.md).

## License

[GNU Affero General Public License v3.0](./LICENSE)

<p align="center">
  <img src="./docs/assets/veritas-icon.png" alt="Veritas" width="48">
</p>
