# Frontend feature architecture map

OpenSpec: `openspec/changes/frontend-feature-architecture/`

| Feature | App routes | Status | Phase | Unit tests (`test/`) |
|---------|------------|--------|-------|----------------------|
| auth | login modal, session | migrated | 2 | `test/features/auth/` |
| public-marketing | `/` | pilot | 3 | `test/features/public-marketing/` |
| public-payments | `/pago/.../confirmar` | legacy | 3 | pending |
| public-docs | `/documentacion` | legacy | 3 | pending |
| merchant-businesses | `/cliente/negocios` | pilot | 4 | `test/features/merchant-businesses/` |
| merchant-payments | `/cliente/pagos` | legacy | 4 | pending |
| merchant-transactions | `/cliente/transacciones` | legacy | 4 | pending |
| merchant-webhooks | `/cliente/webhooks` | legacy | 4 | pending |
| merchant-api-keys | `/cliente/api-keys` | legacy | 4 | pending |
| merchant-analytics | `/cliente/analytics` | legacy | 4 | pending |
| admin-dashboard | `/admin` | legacy | 5 | pending |
| admin-customers | `/admin/customers` | legacy | 5 | pending |
| admin-analytics | `/admin/analytics` | legacy | 5 | pending |
| admin-settings | `/admin/settings` | legacy | 5 | pending |
| solana | wallet UX | legacy | 6 | pending |
| shared lib | `@/lib/*` | migrated | 1 | pending |

SEO (fe-seo): `metadataBase`, `sitemap.ts`, `robots.ts` — phase 1 bootstrap.

Commands (package `frontend-hackathon-solana/`):

- `npm run test` — Vitest (`test/**/*.{test,spec}.{ts,tsx}`)
- Raíz: `npm run test:frontend`, `npm run build:frontend`

Skills: `nextjs`, `bolivianpets-frontend`, `nextjs-seo`, `vitest-frontend-testing`, `playwright-e2e-next` (E2E).
