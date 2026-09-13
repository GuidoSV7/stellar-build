# Frontend feature architecture map

Package: `frontend/` (Next.js App Router). Chain target: **Stellar** (not Solana).

| Feature | App routes | Status | Unit tests (`test/`) |
|---------|------------|--------|----------------------|
| auth | login modal, session | migrated | `test/features/auth/` |
| public-marketing | `/` | pilot | `test/features/public-marketing/` |
| merchant-analytics | admin analytics filters | partial | `test/features/merchant-analytics/` |
| admin-dashboard | `/admin` | legacy | pending |
| admin-customers | `/admin/customers` | legacy | pending |
| admin-analytics | `/admin/analytics` | legacy | pending |
| admin-settings | `/admin/settings` | legacy | pending |
| shared lib | `@/lib/*` | migrated | `test/lib/` (partial) |
| stellar dApp | wallet / chain UX | planned | use `.cursor/skills/stellar/dapp` |

Commands:

- `cd frontend && npm test` — Vitest
- `cd frontend && npm run build`
