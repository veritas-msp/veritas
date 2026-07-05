# Veritas - Community & Pro Editions

> Scoping document (Phase 0). Internal reference before open source and Pro commercialization.  
> **Status:** validated for implementation - last updated: June 2026.

---

## 1. Business model

| Edition | Distribution | Code license | Monetization |
|---------|--------------|--------------|--------------|
| **Community** | Open source, self-hosted | [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) | Free |
| **Pro** | Binary / private repo + license key | Veritas commercial license | Subscription (TBD) |

**Chosen model:** Open Core - the PSA core is public; Pro value (integrations, RMM, reports, advanced SLA, etc.) remains paid.

---

## 2. Community scope (validated)

### 2.1 User modules (sidebar)

| UI module | Technical key | Community | Pro |
|-----------|---------------|:---------:|:---:|
| Companies | `Contrat` / `contrat_enabled` | ✅ | ✅ |
| Contacts | `Contact` / `contact_enabled` | ✅ | ✅ |
| Support (ticketing) | `Ticket` / `tickets_enabled` | ✅ | ✅ |
| Professional services & deployments | `TicketSales` | ❌ | ✅ |
| Scheduling | `Planning` | ❌ | ✅ |
| Infrastructure | `Hardware` | ❌ | ✅ |
| Cybersecurity | `Cybersecurite` | ❌ | ✅ |
| Cloud & IT services | `Service` | ❌ | ✅ |
| Monitoring / reports | `Mon`, `Rapport`, `DocumentsHub` | ❌ | ✅ |
| Dashboards / SLA KPIs | `SlaKpi`, `Billing` | ❌ | ✅ |
| Home | `Home` | ✅ (minimal, see §2.6) | ✅ (full) |

### 2.2 Community ticketing

- **Included:** **Support** tickets only (`incident`, `demande`).
- **Excluded:** **Professional services & deployments** module (`TicketSales`), project / deployment tickets.
- **Included in Community (baseline):** creation, assignment, comments, statuses, priorities, attachments, basic custom views.
- **Excluded (Pro):** SLA (calculation, deadlines, business hours config), automatic IMAP mail collectors, GLPI sync, support credits, scheduling alerts linked to tickets, advanced automation.

### 2.3 Community company record

- **Included:** identity, contact details, linked contacts, basic contract, notes, support ticket history.
- **Excluded:** infrastructure tabs and data (`v_b_clients_m_*`), cybersecurity, campaigns, cloud services, mapping, monitoring documents, advanced contract modules.

### 2.4 Community administration

| Admin section | Community | Pro |
|---------------|:---------:|:---:|
| General settings (language, timezone, appearance) | ✅ | ✅ |
| Company management (list / delete) | ✅ | ✅ |
| Agents & profiles | ✅ (limited) | ✅ |
| Ticket configuration (basic workflow) | ✅ (no GLPI) | ✅ |
| Home news feeds | ❌ | ✅ |
| Contract options | ❌ | ✅ |
| Hardware families | ❌ | ✅ |
| Teams | ❌ | ✅ |
| Client portal | ✅ (3 accounts max) | ✅ |
| Support SLA (hours / calculation) | ❌ | ✅ |
| RMM - Windows agents | ✅ (25 endpoints max) | ✅ |
| Integrations (M365, CheckMK, Bitdefender, OVH, WhatsApp…) | ❌ | ✅ |
| Maintenance (maintenance mode) | ✅ | ✅ |

### 2.5 Community quantitative limits

| Resource | Community | Pro |
|----------|-----------|-----|
| **MSP agent accounts** (`v_b_users`, `role <> 'client'`, active) | **5 max** | Unlimited (fair use) |
| **Client portal accounts** (`role = 'client'`, active) | **3 max** | Unlimited |
| **Companies** (`v_b_clients`) | **100 max** | Unlimited |
| **Contacts** (`v_b_contacts`) | **300 max** | Unlimited |
| **Support tickets** | **Unlimited** | Unlimited |
| **Windows RMM agents** (`v_b_rmm_agents`, active) | **25 max** | Per plan |

**"MSP agent" definition:** any internal user of the provider (admin, supervisor, technician), excluding contacts with client portal access. Aligned with the existing backend count in `routes/utils/stats.js`.

**Behavior at limit:** HTTP `403` on create or reactivation beyond the cap, with a dedicated error code:

| Limit reached | HTTP code | Error code |
|---------------|-----------|------------|
| 6th MSP agent | `403` | `COMMUNITY_AGENT_LIMIT` |
| 4th client portal account | `403` | `COMMUNITY_CLIENT_PORTAL_LIMIT` |
| 101st company | `403` | `COMMUNITY_CLIENT_LIMIT` |
| 301st contact | `403` | `COMMUNITY_CONTACT_LIMIT` |
| 26th RMM agent | `403` | `COMMUNITY_RMM_AGENT_LIMIT` |

### 2.6 Community home (validated)

**Minimal** home page - no Pro dashboard:

| Block | Community | Pro |
|-------|:---------:|:---:|
| **My tickets** (assigned queue / open tickets for logged-in agent) | ✅ | ✅ |
| **News** (news column / RSS, default feeds) | ✅ | ✅ |
| **Light KPIs** (essential counters, e.g. companies, open tickets, urgent) | ✅ | ✅ |
| Infra / RMM / contract / monitoring KPIs | ❌ | ✅ |
| Quick actions to Pro modules (scheduling, infra, reports…) | ❌ | ✅ |

**RSS feed administration** (sources, languages): **Pro only** - in Community, built-in default feeds are read-only.

**SLA:** **excluded** from Community - no deadline calculation, no SLA display on tickets, no access to `/api/sla-settings`.

## 3. Repositories

| Repo | OSS visibility | Role | Edition |
|------|----------------|------|---------|
| `veritas-backend` | Public | API, PostgreSQL database, migrations | Community (AGPL) + Pro hooks |
| `veritas-frontend` | Public | React UI | Community (AGPL) + Pro hooks |
| `veritas-agent` | Public | Windows RMM agent | Community (25 endpoints max) / Pro |
| `veritas` (meta) | Public | Docs, Docker Compose, links | - |
| `veritas-pro` (future) | Private | Pro modules and routes | Pro |
| `veritas-website` | Public or private | Marketing / pricing site | - |

**GitHub organization:** [`veritas-msp`](https://github.com/veritas-msp)

Application repos are cloned **side by side** with the meta repo (listed in `.gitignore`).

---

## 4. License & trademark

### 4.1 Community code license

- **Choice: AGPL-3.0** on `veritas-backend`, `veritas-frontend`, and the `veritas` meta repo.
- **Rationale:** prevent a third party from repackaging Veritas as a competing SaaS without publishing modifications.
- **Status:** README + `EDITIONS.md` on each repo. Site legal pages: `legal.html`, `privacy.html`, `terms.html`.

### 4.2 Pro license

- Proprietary commercial license, distinct from AGPL.
- License key (`VERITAS_LICENSE_KEY` or validation server) - Phase 2–3 implementation.

### 4.3 Trademark

- The name **Veritas**, logo, and visual identity remain the publisher's property.
- Community forks may not use the brand for a competing product without clear differentiation.
- Trademark registration recommended before a wide public announcement.

---

## 5. API matrix (backend)

Legend: ✅ accessible · ⚠️ partial · ❌ blocked (`403` + `requirePro`)

### 5.1 Community - allowed routes

| Prefix | Usage |
|--------|--------|
| `/api/auth` | Login, MFA, password reset |
| `/api/users` | ⚠️ MSP agent management (5 max) |
| `/api/profiles` | Community profiles |
| `/api/user-settings` | User preferences |
| `/api/clients` | ⚠️ Company CRUD without infra modules (100 max) |
| `/api/contacts` | ⚠️ Contact CRUD (300 max) |
| `/api/tickets` | ⚠️ Support only (unlimited) |
| `/api/client-portal`, `/api/client-portal-users` | ⚠️ Client portal (3 accounts max) |
| `/api/rmm` | ⚠️ Windows RMM agents (25 endpoints max) |
| `/api/settings`, `/api/general-settings` | Basic settings |
| `/api/stats` | ⚠️ Minimal home KPIs (§2.6) |
| `/api/tech-news` | ⚠️ Read-only (default feeds, no admin config) |
| `/api/setup` | Initial installation |
| `/api/maintenance` | Maintenance mode |
| `/api` (support report) | Bug report |

### 5.2 Pro only - blocked in Community

| Prefix | Module |
|--------|--------|
| `/api/clients/modules` | Equipment / infra |
| `/api/material-types`, `/api/equipment-families` | Hardware |
| `/api/events` | Scheduling |
| `/api/monitoring-documents`, `/api/client-files` | Documents |
| `/api/sla-settings` | SLA |
| `/api/contract-module-options` | Contract options |
| `/api/glpi-ticket` | GLPI |
| `/api/email` | Email reports |
| `/api/teams` | Teams |
| `/api/bitdefender`, `/api/checkmk`, `/api/unifi` | Integrations |
| `/api/ovh`, `/api/partner-center`, `/api/office365` | Integrations |
| `/api/whatsapp`, `/api/client-office365` | Integrations |
| `/api/equipment-monitoring-alerts` | Monitoring alerts |

### 5.3 Crons to disable in Community

In `server.js` - do not run if `VERITAS_EDITION=community`:

- CheckMK backup sync jobs
- Ticket mail collectors
- Offline RMM agent sync *(kept in Community - 25 endpoint cap)*
- Monitoring alert scan → tickets
- Advanced scheduling notifications (if Pro-linked)

---

## 6. Community user profiles

Seed profiles for Community (replace current "everything enabled" profiles):

| Profile | contrat | contact | tickets | Other modules |
|---------|:-------:|:-------:|:-------:|:--------------:|
| Community Administrator | ✅ | ✅ | ✅ | ❌ |
| Community Agent | ✅ | ✅ | ✅ | ❌ |

Pro flags (`monitoring_enabled`, `infrastructure_enabled`, etc.) remain `FALSE` in Community database - migration `20260720_community_profiles_defaults.sql`.

---

## 7. Environment variable (Phase 2)

```env
# backend/.env
VERITAS_EDITION=community   # or "pro"

# frontend/.env
REACT_APP_VERITAS_EDITION=community
```

### Phase 2 checklist

- [x] `utils/edition.js` - read `VERITAS_EDITION`, default `community`, `/api/edition` payload
- [x] `middleware/edition.js` - `requirePro` (403 + `PRO_FEATURE_REQUIRED`) and `requireProAuth` (JWT + Pro)
- [x] `GET /api/edition` - public endpoint
- [x] Pro mounts in `server.js` - §5.2 prefixes protected by `requirePro*`
- [x] Pro crons §5.3 - `isPro()` on CheckMK sync, mail collectors, monitoring alerts
- [x] `.env.example` backend + frontend
- [x] `/setup` wizard - writes `VERITAS_EDITION` + `REACT_APP_VERITAS_EDITION` (default `community`)
- [x] Frontend `useVeritasEdition` - source of truth = backend API
- [x] Startup log - edition displayed in console
- [x] Script `npm run verify:phase2` in `veritas-backend`
- [x] Commercial license key - Phase 5b (billing validation + admin UI)

### Switch to Pro in development

1. **Backend** - in `veritas-backend/.env`: `VERITAS_EDITION=pro`, then restart `npm start`.
2. **Frontend** - in `veritas-frontend/.env`: `REACT_APP_VERITAS_EDITION=pro`, then restart `npm start` (variable injected at CRA build).
3. Verify: `GET http://localhost:3001/api/edition` should return `{ "edition": "pro", "limits": null, "license": { "devBypass": true, ... } }`.
4. **Profiles** - in Pro, re-enable desired modules via Administration → Agents & profiles (Community migration resets Pro flags to `FALSE`).

> In **production**, Pro edition requires a `VRT-PRO-…` key validated against `veritas-billing` (see §7quinquies).

Expected behavior:

- `community` → active gating (routes, crons, UI, agent limits).
- `pro` → valid license (or dev bypass `VERITAS_EDITION=pro` + `NODE_ENV≠production` without key).
- Missing variable → **`community`** by default for public OSS builds.

---

## 7bis. Community gating (Phase 3)

### Phase 3 checklist

- [x] `utils/communityLimits.js` - MSP, portal, company, contact, RMM quotas + `COMMUNITY_*` codes
- [x] `utils/ticketEditionGuard.js` - exclude professional services / deployment tickets
- [x] Limit routes - `users`, `clients`, `contacts`, `rmm` (create / reactivate)
- [x] SLA disabled - no `buildSlaInfoForTicket` in Community (`routes/utils/tickets.js`)
- [x] `GET /api/stats/home-kpis` → `403` in Community; lightweight `home-dashboard` (§2.6)
- [x] Frontend sidebar / admin - `config/edition.js`, `useVeritasEdition`, `AdminPanel`, `AdminTickets`
- [x] Community home - essential KPIs + quick links to Companies / Contacts / Support
- [x] Company record - mapping, equipment, SLA, credits, professional services hidden
- [x] Contact record - SLA, professional services, events hidden; company form without modules/SLA
- [x] Tickets UI - SLA column hidden (`TicketPage`, `TicketDetailPage`)
- [x] Profile migration - `20260720_community_profiles_defaults.sql`
- [x] API errors - limit messages surfaced (`utils/apiErrors.js`, `users`, `rmm`)
- [x] Script `npm run verify:phase3` in `veritas-backend`

### Testing in Community

1. **Backend** - `VERITAS_EDITION=community` in `veritas-backend/.env`, restart.
2. **Frontend** - `REACT_APP_VERITAS_EDITION=community` in `veritas-frontend/.env`, restart.
3. Verify: `npm run verify:phase3` (from `veritas-backend/`).
4. Manual walkthrough: sidebar (3 modules), admin (limited sections), company record without infra, ticket without SLA.

---

## 7ter. Docker install (Phase 4)

### Phase 4 checklist

- [x] `docker-compose.yml` - Postgres 15, backend, frontend (Community by default)
- [x] `.env.docker.example` - secrets, edition, same-origin URLs
- [x] `veritas-backend/Dockerfile` - Node 20 Alpine, healthcheck `/health/live`
- [x] `veritas-frontend/Dockerfile` - CRA build + nginx
- [x] `veritas-frontend/nginx.conf` - proxy `/api` and `/uploads` → backend
- [x] Persistent volumes - `veritas-db`, `veritas-uploads`
- [x] `/setup` wizard - migrations + admin (pre-configured env in Docker)
- [x] `README.md` - Docker quick start + local dev
- [x] Script `node scripts/verify-phase4.mjs` (meta repo root)
- [ ] `docker compose up` build tested on machine with Docker Desktop

### Docker quick start

```powershell
Copy-Item .env.docker.example .env
# JWT_SECRET + ENCRYPTION_KEY in .env
docker compose up -d --build
node scripts/verify-phase4.mjs
# then: http://localhost:3000/setup then /login
```

---

## 7quater. Legal & website (Phase 5)

### Phase 5 checklist

- [x] README on meta + application repos
- [x] Marketing site - `#pricing` section (Community / Pro / Advanced)
- [x] `veritas-website/legal.html` + `privacy.html` + `terms.html` - legal & GDPR pages
- [x] Site footer - legal links + GitHub
- [x] Script `node scripts/verify-phase5.mjs`
- [ ] Trademark registration (optional before OSS)
- [ ] Pro EULA legal review by attorney (before sale)

---

## 7quinquies. Pro license activation (Phase 5b)

Flow: **Stripe checkout** → key `VRT-PRO-XXXX-XXXX-XXXX-XXXX` (billing) → **Administration → Pro License** (self-hosted instance) → periodic billing validation.

### Phase 5b checklist

- [x] `veritas-billing` - `POST /api/license/validate` (secret `BILLING_LICENSE_API_SECRET`)
- [x] `veritas-backend/utils/proLicense.js` - cache, refresh, dev bypass
- [x] `veritas-backend/routes/config/license.js` - `GET/POST /api/license`, `POST /api/license/refresh` (admin JWT)
- [x] `GET /api/edition` - `license` field (public status, no full key)
- [x] Cron - license re-check every 15 min
- [x] `veritas-frontend` - admin **Pro License** tab (visible in Community)
- [x] `.env.example` backend + billing - `VERITAS_LICENSE_KEY`, `VERITAS_BILLING_API_URL`, shared secrets
- [x] Marketing site - success page hint (Administration → Pro License)
- [x] Script `node scripts/verify-phase5b.mjs`
- [x] Billing super-admin `/admin` - key & customer management
- [x] Pro MSP agent limit per subscription `agentCount`
- [x] Near-instant revocation (`LICENSE_CACHE_MS`, default 5 s)

### Production configuration

| Service | Variables |
|---------|-----------|
| **veritas-billing** | `BILLING_LICENSE_API_SECRET` (shared secret) |
| **veritas-backend** | `VERITAS_LICENSE_KEY`, `VERITAS_BILLING_API_URL`, `BILLING_LICENSE_API_SECRET` (same secret) |

Billing statuses considered **active**: `active`, `trialing`, `past_due`. Admin revocation: `suspended`, `revoked`, `banned`.

### License super-admin (Veritas MSP)

- UI: `https://billing.veritas-msp.com/admin` (local: `http://localhost:3002/admin`)
- Secret: `BILLING_ADMIN_SECRET` in `veritas-billing/.env`
- Actions: list, change status/agents, suspend, revoke, ban, key rotation, delete
- **Revocation**: effect on client instances in ~5 s (`LICENSE_CACHE_MS`, default 5000)
- **Pro agent limit**: subscription `agentCount` applied on MSP user create/reactivate

---

## 8. Phase 0 checklist

- [x] Community scope defined (Companies, Contacts, Support)
- [x] Community quantitative limits documented (agents, portal, companies, contacts, RMM)
- [x] UI / admin / API module matrix
- [x] AGPL-3.0 license choice
- [x] Repo structure and GitHub org (`veritas-msp`)
- [x] Trademark policy documented in product decisions
- [x] Product decisions finalized (SLA, home, Pro pricing deferred)
- [x] GitHub organization [`veritas-msp`](https://github.com/veritas-msp) created
- [ ] Trademark registration (optional before OSS)
- [ ] Pro commercial license legal validation (before sale)

---

## 9. Next phases

| Phase | Goal | Status |
|-------|------|--------|
| **1 - Audit** | Secrets, git history, sensitive surface | ✅ |
| **2 - Edition flag** | `VERITAS_EDITION`, `requirePro` middleware | ✅ |
| **3 - Gating** | Profiles, Community quotas, routes, lightweight UI | ✅ |
| **4 - Install** | Docker Compose, README, quick start | ✅ (static verify; compose test if Docker installed) |
| **5 - Legal** | README, site pricing, legal pages | ✅ |
| **6 - Publication** | GitHub push, tag `v1.0.0-community` | 🔄 in progress |

### Phase 6 checklist

- [x] Quick wins - `veritas-msp.com`, gitignore secrets, `install.conf` out of git
- [x] Remotes → `veritas-msp/*` (backend, frontend, website, agent)
- [x] Script `node scripts/verify-phase6.mjs`
- [x] Consolidated commits per repo (phases 2–5b)
- [x] Script `node scripts/verify-phase6.mjs` - OK
- [x] Local tag `v1.0.0-community` on each OSS repo
- [x] GitHub push + `veritas-msp/veritas` meta repo created
- [ ] `veritas-billing` - separate **private** repo (outside AGPL publication)

---

## 10. Finalized decisions

| Topic | Community decision |
|-------|-------------------|
| **SLA** | **Excluded** - no basic or advanced SLA (config, calculation, deadline display) |
| **Home** | **Minimum** - my tickets + news (default feeds) + a few essential KPIs (§2.6) |
| **Pro pricing** | **Marketing site** - Community / Pro / Advanced pricing section ([veritas-msp.com](https://veritas-msp.com/#pricing)); commercial EULA before sale |
