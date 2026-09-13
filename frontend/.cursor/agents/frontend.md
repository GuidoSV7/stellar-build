---
alwaysApply: true
---

You have access to Engram persistent memory (mem_save, mem_search, mem_context).
Save proactively after significant work. After context resets, call mem_context to recover state.


# AGENTS.md — Frontend

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript estricto
- **Package**: `frontend/` — alias `@/*` → `./src/*`
- **Estilos**: CSS Modules (`*.module.css`) en código vigente; skill **Tailwind** cuando se introduzca Tailwind
- **Estado servidor**: TanStack Query (`src/app/providers.tsx`, `staleTime: 0`)
- **Estado cliente**: Zustand (cuando aplique); sesión JWT en `src/stores/auth-session.ts`
- **Forms**: react-hook-form + Zod (objetivo; migración gradual)
- **HTTP**: Axios `@/lib/axios` (nuevo código); legacy `src/app/_lib/apiBolivianpets.ts` (re-exports durante migración)
- **Gráficos**: Chart.js
- **Testing**: Vitest planificado — **TDD diferido** en change `frontend-feature-architecture` (sin specs en ese change)
- **Stellar**: wallet / dApp — `.cursor/skills/stellar/dapp/SKILL.md`

## Estructura vigente BolivianPets (hoy)

```
frontend/src/
├── app/                    # routing + legacy `_componentes/` por ruta (migración activa)
├── features/               # destino obligatorio código nuevo (ver README)
├── lib/                    # axios, query-client, errors
├── stores/                 # auth-session
└── …
```

Mapa de dominios: `src/features/README.md`. OpenSpec: `openspec/changes/frontend-feature-architecture/`.

**Skill overlay BolivianPets:** `.cursor/skills/bolivianpets-frontend/SKILL.md` (leer **además** de `nextjs`). Skills compartidas: solo en `.cursor/skills/` (raíz monorepo), no bajo `frontend/.cursor/skills/`.

## ESTRUCTURA OBJETIVO (feature-based — ver `.cursor/skills/nextjs/SKILL.md`)

> **Nota de paths:** BolivianPets usa `@/*` → `./src/*`. El árbol objetivo vive bajo `frontend/src/`.

```
frontend/src/
├── app/                        # SOLO routing: page, layout, loading, error
├── features/                   # Módulos por dominio de negocio (mapa en features/README.md)
│   └── <dominio>/
│       ├── api/                # services + hooks TanStack Query del feature
│       ├── components/
│       ├── stores/
│       ├── types/
│       └── utils/
├── components/                 # SOLO compartido agnóstico de dominio
│   └── ui/                     # primitivas: Input, Button, Card, Modal, …
├── hooks/                      # hooks compartidos agnósticos
├── lib/                        # axios, query-client, chart, formatters
├── stores/                     # Zustand global (auth, cart) — hoy `store/` legacy
├── types/
├── config/
└── test/                       # tests espejo de features/, components/, lib/
```

### Reglas de dependencias — UNIDIRECCIONAL

`shared (components/ui, hooks, lib, types) → features/<dominio> → app/`

- ✅ `app/` puede importar de `features/` y shared.
- ✅ `features/` puede importar de shared.
- ❌ NUNCA shared importa de `features/` o `app/`.
- ❌ NUNCA un feature importa de otro feature (componer en `app/`).
- ✅ Imports con alias absoluto `@/features/...` — sin barrel `index.ts`.

### Enforcement

- Gate obligatorio: `npm run build:frontend` en la raíz del monorepo stellar-build.
- Cuando existan en el package: `npm run lint`, `npm run arch:check` (baseline imports legacy y `staleTime`).
- Tras cambios estructurales: build + arch:check si está configurado.

### Gate antes de commit (FE)

**Listo para commit/push** cuando el diff toca `frontend/` (salvo solo docs):

1. `npm run build:frontend` en la raíz del monorepo — **obligatorio**.
2. Vitest acotado al área tocada — **además**, no reemplaza el build (cuando Vitest esté configurado).

### Código legacy (BolivianPets)

Migración feature-based **en curso**. Legacy: `app/**/_componentes`, `app/_lib/apiBolivianpets.ts`. **No crear código nuevo ahí** — usar `src/features/`. Pilot migrado: `features/auth/`.


## Referencia histórica (pre-migración)

El árbol genérico abajo describe el layout **anterior**; el código activo vive en `features/`.

├── actions/                          # Server Actions de Next.js
│   ├── [resource]/                   # Agrupado por recurso/entidad
│   │   ├── create-[resource].ts
│   │   ├── update-[resource].ts
│   │   ├── delete-[resource].ts
│   │   └── [custom-action].ts
│   └── shared/                       # Actions compartidas
│       ├── upload-file.ts
│       └── send-email.ts
│
├── app/                              # Next.js App Router
│   ├── (public)/                     # Route Group - Rutas públicas
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── [dynamic-routes]/
│   │
│   ├── (auth)/                       # Route Group - Autenticación
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   │
│   ├── (protected)/                  # Route Group - Rutas protegidas
│   │   ├── dashboard/
│   │   ├── profile/
│   │   └── layout.tsx
│   │
│   ├── admin/                        # Panel de administración
│   │   ├── [feature]/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── api/                          # Route Handlers (API Routes)
│   │   ├── [resource]/
│   │   │   └── route.ts
│   │   └── webhooks/
│   │       └── [provider]/
│   │           └── route.ts
│   │
│   ├── layout.tsx                    # Root layout
│   ├── providers.tsx                 # Client-side providers
│   ├── globals.css                   # Estilos globales
│   ├── error.tsx                     # Error boundary
│   ├── loading.tsx                   # Loading UI
│   └── not-found.tsx                 # 404 page
│
├── components/
│   ├── features/                     # Componentes por feature/dominio
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   │
│   │   ├── [feature-name]/
│   │   │   ├── [FeatureName]List.tsx
│   │   │   ├── [FeatureName]Card.tsx
│   │   │   ├── [FeatureName]Form.tsx
│   │   │   └── [FeatureName]Detail.tsx
│   │   │
│   │   └── shared/                   # Componentes compartidos entre features
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── Sidebar.tsx
│   │
│   └── ui/                           # Componentes UI reutilizables (Design System)
│       ├── form/
│       │   ├── Button.tsx
│       │   ├── Input.tsx
│       │   ├── Select.tsx
│       │   ├── Textarea.tsx
│       │   ├── Checkbox.tsx
│       │   └── index.ts
│       │
│       ├── feedback/
│       │   ├── Alert.tsx
│       │   ├── Toast.tsx
│       │   ├── Spinner.tsx
│       │   ├── Skeleton.tsx
│       │   └── index.ts
│       │
│       ├── layout/
│       │   ├── Card.tsx
│       │   ├── Modal.tsx
│       │   ├── Drawer.tsx
│       │   ├── Tabs.tsx
│       │   └── index.ts
│       │
│       ├── data-display/
│       │   ├── Table.tsx
│       │   ├── Badge.tsx
│       │   ├── Avatar.tsx
│       │   └── index.ts
│       │
│       └── index.ts                  # Re-export todos los UI components
│
├── hooks/                            # Custom React Hooks
│   ├── auth/
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   └── useSession.ts
│   │
│   ├── data/                         # Hooks para data fetching
│   │   ├── use[Resource].ts          # Ej: useProducts.ts, useUsers.ts
│   │   └── use[Resource]Mutation.ts
│   │
│   ├── ui/                           # Hooks para UI state
│   │   ├── useModal.ts
│   │   ├── useToast.ts
│   │   ├── useTheme.ts
│   │   └── useMediaQuery.ts
│   │
│   └── shared/                       # Hooks compartidos/utilidades
│       ├── useDebounce.ts
│       ├── useLocalStorage.ts
│       └── useClipboard.ts
│
├── lib/                              # Configuraciones y utilidades de librerías
│   ├── axios.ts                      # Configuración de Axios
│   ├── query-client.ts               # TanStack Query config
│   ├── constants.ts                  # Constantes globales
│   ├── env.ts                        # Validación de variables de entorno
│   └── [library].ts                  # Configs de otras libs (stripe, firebase, etc)
│
├── services/                         # Servicios de API (por recurso/dominio)
│   ├── [resource]/
│   │   ├── [resource].service.ts     # Lógica compartida y tipos base
│   │   ├── [resource].admin.ts       # Endpoints admin (si aplica)
│   │   ├── [resource].public.ts      # Endpoints públicos (si aplica)
│   │   ├── [resource].user.ts        # Endpoints de usuario (si aplica)
│   │   ├── [resource].schema.ts      # Validaciones con Zod
│   │   └── [resource].types.ts       # TypeScript interfaces/types
│   │
│   └── index.ts                      # Re-exports de todos los servicios
│
├── store/                            # Estado global (Zustand/Redux/etc)
│   ├── [feature].store.ts            # Store por feature
│   ├── index.ts                      # Re-exports
│   └── middleware/                   # Middleware para stores (opcional)
│       └── logger.ts
│
├── utils/                            # Funciones utilitarias
│   ├── formatters/
│   │   ├── currency.ts
│   │   ├── date.ts
│   │   └── string.ts
│   │
│   ├── validators/
│   │   ├── email.ts
│   │   └── phone.ts
│   │
│   ├── helpers/
│   │   ├── array.ts
│   │   ├── object.ts
│   │   └── async.ts
│   │
│   └── index.ts                      # Re-exports
│
├── middleware.ts                     # Next.js Middleware (autenticación, i18n, etc)
│
├── public/                           # Assets estáticos
│   ├── images/
│   ├── fonts/
│   ├── icons/
│   └── files/
│
├── docs/                             # Documentación del proyecto
│   ├── architecture.md
│   ├── api-contracts.md
│   └── deployment.md
│
├── .env.example                      # Variables de entorno de ejemplo
├── .env.local                        # Variables de entorno locales (git ignored)
├── .gitignore
├── next.config.ts                    # Configuración de Next.js
├── tailwind.config.ts                # Configuración de Tailwind
├── tsconfig.json                     # Configuración de TypeScript
├── package.json
└── README.md

### Estructura legacy BolivianPets (migración pendiente)

Además del árbol objetivo, el código **vigente** organiza UI así (**no crear código nuevo aquí**):

```
src/app/
├── admin/_componentes/     # panel admin
├── cliente/_componentes/   # portal merchant (/cliente)
├── _componentes/           # shared por rutas (inicio, auth, cuenta)
├── solana/                 # wallet (→ features/solana)
└── _lib/apiBolivianpets.ts     # HTTP monolítico (→ features/*/api)
```

Nueva UI **MUST** ir a `features/<dominio>/` según `src/features/README.md`.


## SIEMPRE

- Tras cambios relevantes: `npm run build:frontend` en la raíz del monorepo stellar-build.
- Tras cambios de dependencias: `npm install` en la raíz (workspaces) y commitear lockfile si aplica.
- Tras cambios de arquitectura: `arch:check` cuando exista en el package frontend.


## 🤖 Autoinvocación de Skills y Agents — OBLIGATORIO

> El agente DEBE leer la skill correspondiente y/o delegar al subagent
> antes de ejecutar estas tareas.

### Skills (contexto y reglas)

| Tarea | Skill a leer |
|---|---|
| Crear o modificar componente, página, hook, service o layout de Next.js | `.cursor/skills/bolivianpets-frontend/SKILL.md` + `.cursor/skills/nextjs/SKILL.md` |
| Aplicar o modificar estilos (CSS Modules vigente; Tailwind si aplica) | `.cursor/skills/tailwind-4/SKILL.md` |
| Crear o modificar schemas y validaciones Zod (forms, services, env) | `.cursor/skills/zod-4/SKILL.md` |
| Optimizar, auditar o implementar SEO técnico y de contenido | `.cursor/skills/seo/SKILL.md` |
| Metadata API, sitemap, robots, OG, JSON-LD e indexación en Next.js | `.cursor/skills/nextjs-seo/SKILL.md` |
| Convertir un diseño de Stitch en componente | `.cursor/skills/stitch/SKILL.md` |
| Escribir, modificar o revisar tests | `.cursor/skills/vitest-frontend-testing/SKILL.md` |
| Tests E2E Playwright (Next.js) | `.cursor/skills/playwright-e2e-next/SKILL.md` |

### Subagents (delegación de tareas)

Solo existen subagents para tareas **ortogonales** a la implementación. El resto son **skills** que compone el agent `nextjs`.

| Tarea | Subagent | Notas |
|---|---|---|
| Crear o modificar componente, página, hook, service o layout | `nextjs` | **Por defecto.** Compone `tailwind`, `zod` y `seo` + `nextjs-seo` según alcance. |
| Convertir diseño Stitch en componente | `stitch` | Flujo MCP / export HTML; mentalidad distinta. |
| Escribir, modificar o revisar tests | `test unitarios - frontend` | Solo specs. |

**Sin subagent** (solo skill, leída por `nextjs` o el agente principal):

| Tarea | Skill |
|---|---|
| Estilos Tailwind, validación Zod en forms o services | `tailwind`, `zod` |
| SEO técnico, metadatos, sitemap, indexabilidad en Next.js | `seo`, `nextjs-seo` (ambas) |

### Composición de skills (implementación vs revisión)

**Implementación** — subagent `nextjs` compone:

```
nextjs agent
  ├── .cursor/skills/bolivianpets-frontend/SKILL.md  (BolivianPets — SIEMPRE)
  ├── .cursor/skills/nextjs/SKILL.md             (siempre)
  ├── .cursor/skills/tailwind-4/SKILL.md         (si UI con Tailwind; CSS Modules no reemplaza esta skill si migran a Tailwind)
  ├── .cursor/skills/zod-4/SKILL.md              (si forms, schemas o services)
  ├── .cursor/skills/seo/SKILL.md                (si SEO técnico o contenido)
  └── .cursor/skills/nextjs-seo/SKILL.md        (si SEO en Next.js; combinar con seo)
```

**Tarea especializada** — subagent dedicado:

- `stitch` → portar diseños Stitch a código

**Ejemplo literal de comportamiento esperado:**

- Usuario pide "creá un formulario de login" → delegar a `nextjs` (lee `nextjs` + `tailwind` + `zod`)
- Usuario pide "mejorá el responsive del header" → delegar a `nextjs` (lee `nextjs` + `tailwind`)
- Usuario pide "agregá validación Zod al registro" → delegar a `nextjs` (lee `nextjs` + `zod`)
- Usuario pide "optimizá el SEO" o "agregá metadata y sitemap" → delegar a `nextjs` (lee `seo` + `nextjs-seo`)
- Usuario pide "pasame este diseño de Stitch a componente" → delegar a `stitch`
- Usuario pide "hacé los tests de este componente" → delegar a `test unitarios - frontend`

### Cómo aplicar skills y subagents (punto de entrada)

Este archivo (`.cursor/rules/frontend-agent.mdc`) es el **punto de entrada** del agente en el frontend. Symlink: `frontend/.cursor/rules/agent.mdc`. Subagents: `frontend/.cursor/agents/`.

| Situación | Comportamiento esperado |
|---|---|
| Tarea de implementación que encaja en la tabla (crear componente, schema Zod, tests, etc.) | **OBLIGATORIO** leer la skill correspondiente. **PREFERIR** delegar al subagent indicado. |
| Pregunta conceptual, revisión breve o cambio trivial (1–2 líneas) | Leer la skill si aporta contexto; **no hace falta** delegar. |
| Tarea mixta (p. ej. formulario + estilos + tests) | Leer las skills necesarias; delegar a **varios** subagents en paralelo si el alcance lo justifica. |
| El usuario pide explícitamente un subagent | Delegar sin excepción al subagent indicado. |

**Skills vs subagents:** la skill aporta reglas y convenciones; el subagent ejecuta la tarea con ese contexto. En implementación no trivial, **no basta** con conocer la skill de memoria: hay que leerla o delegar.

**Importante:** esto guía al agente principal; no es un hook automático del IDE. Si la tarea encaja en la tabla y se implementa código, el agente **no debe** saltarse la skill ni la delegación salvo que sea genuinamente trivial.


## Enrutamiento de contexto

- **BolivianPets overlay** (dominios, legacy, gates): `.cursor/skills/bolivianpets-frontend/SKILL.md`
- **Reglas de Next.js** (servicios, estado, forms, errores): `.cursor/skills/nextjs/SKILL.md`
- **Estilos Tailwind CSS 4** (cuando aplique): `.cursor/skills/tailwind-4/SKILL.md`
- **Validación con Zod**: `.cursor/skills/zod-4/SKILL.md`
- **SEO técnico y contenido**: `.cursor/skills/seo/SKILL.md`
- **SEO Next.js** (Metadata API, sitemap, robots, OG): `.cursor/skills/nextjs-seo/SKILL.md`
- **Convertir diseños de Stitch**: `.cursor/skills/stitch/SKILL.md`
- **Tests unitarios con Vitest**: `.cursor/skills/vitest-frontend-testing/SKILL.md`
- **E2E Playwright (Next.js)**: `.cursor/skills/playwright-e2e-next/SKILL.md`
- **Seguridad** (auth, roles, API): `.cursor/skills/backend-security-rules/SKILL.md`
- **OpenSpec change (migración FE)**: `openspec/changes/frontend-feature-architecture/`
- **Subagents disponibles**: `frontend/.cursor/agents/`
