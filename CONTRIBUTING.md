# Contributing to Veritas

Thanks for helping improve Veritas. This monorepo holds the Community (AGPL) application code.

## Repository layout

```
veritas/
  backend/     # Node.js API
  frontend/    # React UI
  RMM/         # Windows agent sources
docker-compose.yml
```

## Development setup

1. Install Node.js 20+ and PostgreSQL 15+.
2. From `veritas/`:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run install:all
npm run dev
```

3. Open http://localhost:3000/setup for the first-run wizard.

## Pull requests

- Keep changes focused; prefer small PRs.
- Match existing code style and naming.
- Do not commit `.env`, secrets, `node_modules`, builds, or upload content.
- Update docs when behavior or setup steps change.
- For Pro-only behavior, keep Community defaults safe (`VERITAS_EDITION=community`).

## License

By contributing, you agree that your contributions are licensed under the [AGPL-3.0](./LICENSE).
