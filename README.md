<p align="center">
  <img src="./docs/assets/veritas-banner.png" alt="Veritas - open source MSP platform" width="720">
</p>

<p align="center">
  <strong>Self-hosted MSP platform - PSA, ITSM, and RMM in one place.</strong>
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

**Veritas** centralizes day-to-day MSP operations: companies and contacts (PSA), support tickets (ITSM), infrastructure supervision, and RMM - deployable on your own infrastructure.

| Component | Repository |
|-----------|------------|
| API & database | [veritas-backend](https://github.com/veritas-msp/veritas-backend) |
| Web UI | [veritas-frontend](https://github.com/veritas-msp/veritas-frontend) |
| Windows RMM agent | [veritas-agent](https://github.com/veritas-msp/veritas-agent) |

Clone this meta repo and the application repos **side by side** in the same directory.

## Screenshots

### Helpdesk

Ticket views, filters, and assignment for your support team.

<p align="center">
  <img src="./docs/assets/veritas-helpdesk.png" alt="Veritas helpdesk - ticket list and views" width="900">
</p>

### Ticket workspace

Full ticket detail: conversation thread, properties, linked hardware, and resolution workflow.

<p align="center">
  <img src="./docs/assets/veritas-supportticket.png" alt="Veritas support ticket - conversation and ticket properties" width="900">
</p>

### Supervision center

Infrastructure inventory by site and device type - servers, storage, network, workstations, and RMM agents.

<p align="center">
  <img src="./docs/assets/veritas-supervisioncenter.png" alt="Veritas supervision center - infrastructure monitoring dashboard" width="900">
</p>

### Administration

Language, timezone, appearance, and organization settings from a single admin area.

<p align="center">
  <img src="./docs/assets/veritas-settings.png" alt="Veritas administration - general settings" width="900">
</p>

### Client portal

Dedicated sign-in for end users: equipment, documents, and tickets from their company portal.

<p align="center">
  <img src="./docs/assets/veritas-login-clientportal.png" alt="Veritas client portal - sign-in page" width="900">
</p>

---

## Requirements

- For local development: Node.js 20+, PostgreSQL 15+, npm
- Optional: [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose v2 (see application repos)

## Quick start

```bash
cd veritas-backend && cp .env.example .env && npm install && npm start
cd veritas-frontend && cp .env.example .env && npm install && npm start
```

1. Open http://localhost:3000/setup - run migrations and create the admin account  
2. Sign in at http://localhost:3000/login

Generate random secrets (PowerShell):

```powershell
-join ((48..57 + 65..90 + 97..122 | Get-Random -Count 64 | ForEach-Object {[char]$_}))
```

Set in `veritas-backend/.env`:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Session signing secret |
| `ENCRYPTION_KEY` | Encryption key for sensitive data |
| `DATABASE_URL` | PostgreSQL connection string |
| `VERITAS_EDITION` | `community` (default) or `pro` |

Set in `veritas-frontend/.env`:

| Variable | Description |
|----------|-------------|
| `REACT_APP_VERITAS_EDITION` | `community` (default) or `pro` |

## Services (local dev)

| Service | Port | Role |
|---------|------|------|
| Frontend | 3000 | Web UI + `/api` proxy |
| Backend | 3001 | REST API |
| PostgreSQL | 5432 | Database |

## Production

Set public URLs in backend and frontend `.env` files, then put a reverse proxy (nginx, Traefik, Caddy, …) in front of port 3000 for TLS. See each application repo for deployment details.

## Editions

Community and Pro differ in modules and quotas (companies, contacts, agents, RMM endpoints, etc.). Details: [EDITIONS.md](./EDITIONS.md).

## License

[GNU Affero General Public License v3.0](./LICENSE)

<p align="center">
  <img src="./docs/assets/veritas-icon.png" alt="Veritas" width="48">
</p>
