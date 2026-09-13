# Features — BolivianPets domain map

Dependency flow: `shared (components/ui, lib, stores, types) → features/<domain> → app/`

- No cross-feature imports; compose in `app/` pages.
- New code MUST land here (OpenSpec: `frontend-feature-architecture`).
- Legacy: `app/**/_componentes`, `app/_lib/apiBolivianpets.ts` — migration in progress.

| Feature | App routes | Legacy source |
|---------|------------|---------------|
| `auth` | login modal, session | `app/_componentes/autenticacion` |
| `admin-dashboard` | `/admin` home | `app/admin/_componentes/dashboard` |
| `admin-customers` | `/admin/customers` | `app/admin/_componentes/clientes` |
| `admin-analytics` | `/admin/analytics` | `app/admin/_componentes/analytics` |
| `admin-settings` | `/admin/settings` | `app/admin/_componentes/settings` |
| `merchant-analytics` | `/admin` (filtros de fecha) | soporte del dashboard admin |
| `public-marketing` | `/` home | `app/_componentes/inicio` |

HTTP: new services in `features/<domain>/api/` using `@/lib/axios`.
