<!-- gentle-ai:codegraph-guidance -->
## Agentes por dominio — USAR cuando el trabajo toca ese dominio

Rules en `.cursor/rules/` (raíz del monorepo stellar-build / BolivianPets). **Skills** solo en `.cursor/skills/` (raíz) — no existen carpetas `skills` bajo `backend/` ni `frontend/`. Subagents en `backend/.cursor/agents/` y `frontend/.cursor/agents/`.

| Agente | Cuándo | Path (Cursor) |
|---|---|---|
| `backend` | Trabajo en `backend/` (ASP.NET Core, API, OpenAPI) | `.cursor/rules/backend-agent.mdc` |
| `frontend` | Trabajo en `frontend/` (Next.js, Stellar wallet, admin/cliente) | `.cursor/rules/frontend-agent.mdc` |
| `contract` | Trabajo en `contract/` (Soroban / contratos Stellar) | `.cursor/rules/contract-agent.mdc` |
| `nextjs` | Páginas, layouts, componentes App Router | `frontend/.cursor/agents/nextjs.md` |
| `test unitarios - frontend` | Tests unitarios frontend (Vitest) | `frontend/.cursor/agents/test unitarios - frontend.md` |
| `test e2e - frontend` | E2E Playwright (Next.js, wallet, flujos) | `frontend/.cursor/agents/test e2e - frontend.md` |
| `stitch` | Diseños Stitch → React | `frontend/.cursor/agents/stitch.md` |
| `owasp-top10` | Revisión de seguridad API | `backend/.cursor/agents/owasp-top10.md` |
| `sonar-code-quality` | Refactor calidad / complejidad | `backend/.cursor/agents/sonar-code-quality.md` |

**Abrir el workspace en la raíz `stellar-build/`** para que `.cursor/skills/` y `.cursor/rules/` resuelvan bien. En `backend/` y `frontend/` solo hay symlink de **rules** (`agent.mdc` → raíz); las **skills se referencian siempre** como `stellar-build/.cursor/skills/<nombre>/SKILL.md` (path relativo al abrir monorepo: `.cursor/skills/...`).

## Git — commits

- **Nunca** agregar `Co-authored-by` de Cursor (ni `Cursor`, `cursoragent`, ni emails `*@cursor*`) en mensajes de commit.
- No incluir trailers de coautoría de herramientas/IDE salvo que el usuario lo pida explícitamente.

## Skills del monorepo

Fuente de verdad: **`.cursor/skills/`** en la raíz del monorepo (overlays BolivianPets: `bolivianpets-backend`, `bolivianpets-frontend`; stack FE: `nextjs`, `zod-4`, `vitest-frontend-testing`, `playwright-e2e-next`, …). **Stellar** (stellar.new): **`.cursor/skills/stellar/`** (`dapp`, `smart-contracts`, `assets`, …). Compat: `.claude/skills` → symlink a esa carpeta.

## Backend

`.cursor/rules/backend-agent.mdc` — symlink `backend/.cursor/rules/agent.mdc`. Ver `backend/.cursor/agents/backend.md` si el contexto es solo la carpeta backend.

Overlay: `.cursor/skills/bolivianpets-backend/SKILL.md`.

## Frontend

`.cursor/rules/frontend-agent.mdc` — symlink `frontend/.cursor/rules/agent.mdc`. Overlay: `.cursor/skills/bolivianpets-frontend/SKILL.md`.

## Contract

`.cursor/rules/contract-agent.mdc` — symlink `contract/.cursor/rules/agent.mdc`. Usar skills en `.cursor/skills/stellar/smart-contracts` y companions.

## Gate de verificación

| Área | Comando |
|---|---|
| Frontend | `cd frontend && npm run build` |
| Frontend tests | `cd frontend && npm test` |
| Backend | `dotnet build backend/BolivianPets.slnx` (o `backend/src/Api`) |
| Contratos | según toolchain Soroban del package `contract/` |

## MCP (Cursor) — stellar-build

| Servidor | Uso | Verificación |
|---|---|---|
| **codegraph** | Explorar código antes de Read/Grep | Índice en `.codegraph/`; `codegraph explore "Symbol"` |
| **engram** | Memoria persistente (`mem_save`, `mem_search`, …) | Proyecto **`stellar-build`**; `.engram/` |
| **context7** | Docs de librerías | `resolve-library-id` requiere `libraryName` + `query` |

Tras editar MCP, **recargar ventana** de Cursor (Developer: Reload Window).

<!-- /gentle-ai:codegraph-guidance -->
