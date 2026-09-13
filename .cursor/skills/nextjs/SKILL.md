---
name: nextjs
description: >
  Arquitectura y reglas de desarrollo Next.js App Router con estructura feature-based
  (bulletproof-react adaptado): features/, componentes, páginas, hooks, services, forms,
  estado, data fetching y estilos. Leer SIEMPRE antes de crear o modificar cualquier
  archivo .tsx, layout, page, hook, service o feature del frontend. Activar también
  cuando se mencione Next.js, App Router, TanStack Query, Server Components,
  Server Actions, Zustand o estructura de carpetas del frontend.
---

# Next.js App Router — Arquitectura Feature-Based

## 1. Arquitectura de Carpetas (bulletproof-react adaptado a App Router)

### Principio: `app/` es SOLO routing. La lógica vive en `features/`.

```
src/
├── app/                        # SOLO routing: page, layout, loading, error, route
│   ├── (public)/               # Route group: layout público
│   │   ├── products/page.tsx
│   │   └── layout.tsx
│   ├── (auth)/                 # Route group: login/register
│   ├── admin/                  # Rutas admin (protegidas por rol)
│   │   ├── layout.tsx          # Guard de rol acá
│   │   └── operations/page.tsx
│   └── api/                    # Route Handlers
├── features/                   # Módulos por dominio de negocio
│   ├── products/
│   │   ├── api/                # services + hooks de TanStack Query del feature
│   │   │   ├── products.service.ts
│   │   │   └── use-products.ts
│   │   ├── components/         # componentes SOLO de este feature
│   │   │   ├── ProductList.tsx
│   │   │   └── ProductForm.tsx
│   │   ├── stores/             # slices Zustand del feature (si aplica)
│   │   ├── types/
│   │   │   └── product.types.ts
│   │   └── utils/              # helpers propios del feature
│   ├── auth/
│   ├── orders/
│   └── admin-dashboard/
├── components/                 # SOLO compartido y agnóstico de dominio
│   ├── ui/                     # primitivas: Input, Button, Card, Modal, Pagination
│   └── layout/                 # Navbar, Footer, Sidebar genéricos
├── hooks/                      # hooks compartidos agnósticos (useDebounce, etc.)
├── lib/                        # facades de librerías: axios.ts, chart.ts
├── stores/                     # Zustand global (auth, cart)
├── types/                      # tipos compartidos entre features
└── config/                     # constantes, env parseado
```

### Reglas de dependencias — UNIDIRECCIONAL, no negociable

El flujo es: `shared (components/ui, hooks, lib, types) → features → app`.

- ✅ `app/` puede importar de `features/` y de shared.
- ✅ `features/` puede importar de shared.
- ❌ NUNCA shared (`components/`, `hooks/`, `lib/`) importa de `features/`. Si un componente de `components/ui` necesita algo de un feature, ese componente pertenece AL feature, no a shared.
- ❌ NUNCA un feature importa de otro feature. Si `features/orders` necesita algo de `features/products`, o (a) lo compartido sube a `types/`/`components/`, o (b) la composición ocurre en `app/` (la page compone ambos features). Cross-imports entre features = acoplamiento circular en 3 meses.
- ✅ Imports SIEMPRE con alias absoluto: `@/features/products/components/ProductList`. Sin barrel `index.ts` (empeora tree-shaking en Next y esconde el origen real).

Forzar con ESLint (`import/no-restricted-paths`):

```json
"import/no-restricted-paths": ["error", { "zones": [
  { "target": "./src/features", "from": "./src/app" },
  { "target": ["./src/components", "./src/hooks", "./src/lib", "./src/types"],
    "from": ["./src/features", "./src/app"] }
]}]
```

### Criterio: ¿feature o shared?

- Usado por UN dominio de negocio → `features/<dominio>/`.
- Agnóstico de dominio y usado (o razonablemente usable) por 2+ features → shared.
- ❌ NUNCA crear en shared "por si acaso se reutiliza". Nace en el feature; se promueve a shared cuando la segunda necesidad REAL aparece.

### Test de límites

Si borrás `features/orders/`, solo deben romper: las pages de `app/` que lo componen. Si rompe otro feature o algo de `components/`, los límites están violados.

---

## 2. Servicios y API

- ✅ Cada feature define sus services en `features/<dominio>/api/`. Un service por recurso del backend.
- ✅ **OBLIGATORIO** usar la instancia de Axios de `@/lib/axios` para TODAS las llamadas HTTP — los interceptors aplican auth y manejo de errores.
- ✅ SIEMPRE tipar request/response con interfaces en `features/<dominio>/types/`.
- ✅ SIEMPRE paginación en listados: enviar `page`/`limit` (o `take`/`skip`), consumir `{ data, total, page, totalPages }`.
- ✅ Server Actions para mutaciones de formularios simples; Route Handlers (`app/api/`) para endpoints que consumen clientes externos o webhooks.
- ❌ NUNCA `fetch()` nativo. ❌ NUNCA importar `axios` directo (siempre la instancia).

## 3. Server vs Client Components

- ✅ Server Components (`async`) por default en pages; fetch inicial vía services.
- ✅ `"use client"` SOLO para: hooks de React, event handlers, browser APIs, Context, TanStack Query.
- ✅ Patrón híbrido: page.tsx (Server) hace fetch inicial → pasa `initialData` como props → Client Component la usa en `useQuery` para evitar re-fetch inicial.
- ✅ `<Suspense>` con skeletons para carga progresiva; `loading.tsx` y `error.tsx` en cada sección.
- ❌ NUNCA `ssr: false` en `next/dynamic` dentro de Server Components.

### Fetch paralelo — regla correcta, no dogma

- ✅ Datos INDEPENDIENTES y degradables (widgets de dashboard, secciones opcionales): `Promise.allSettled` — un widget caído no tumba la página; renderizar fallback por sección.
- ✅ Datos CRÍTICOS sin los cuales la página no tiene sentido (el producto en su página de detalle): `Promise.all` — fallar rápido y dejar que `error.tsx` maneje. Renderizar una página "exitosa" con huecos silenciosos es peor que un error visible.

## 4. Estado

- ✅ Zustand para estado global de cliente (auth, carrito) en `stores/`; slices propios de un feature en `features/<dominio>/stores/`.
- ✅ TanStack Query para datos de servidor en Client Components.
- ✅ `useState`/`useReducer` para estado local.

### Política de caché (DECISIÓN DE NEGOCIO — datos siempre frescos)

Este proyecto prioriza frescura absoluta sobre performance de red. Costo asumido: refetch en cada mount y cada focus de ventana.

- ❌ NUNCA `cache`, `revalidate`, `unstable_cache` de Next.js.
- ❌ NUNCA `staleTime`/`gcTime` en `useQuery` — usar defaults del QueryClient (staleTime: 0, gcTime: 0, refetchOnMount/refetchOnWindowFocus true).
- ❌ NUNCA `generateStaticParams` ni generación estática — contradice la política de no-caché. Todas las páginas con datos son dinámicas.
- ⚠️ Si esta política cambia (p. ej. catálogo que tolera 60s de staleness), se cambia ACÁ primero, no ad-hoc en un useQuery.

## 5. Formularios

- ✅ SIEMPRE `react-hook-form` + Zod en Client Components; errores con `toast.error()`.
- ✅ Server Actions para formularios simples: validar con Zod en el server ANTES de procesar; redirect tras éxito.

## 6. UI y Estilos

### Primitivas obligatorias — NO clases repetidas a mano

- ✅ **OBLIGATORIO** usar los componentes de `components/ui/` (`<Input>`, `<Textarea>`, `<Select>`, `<Button>`, `<Card>`, `<Pagination>`). Las clases viven UNA vez ahí.
- ❌ NUNCA `<input>`/`<select>`/`<textarea>` nativos sueltos en features o pages. Si falta una variante, se agrega a la primitiva, no se copia la clase.
- ✅ La primitiva `<Input>` incluye de base: `text-black placeholder:text-gray-400 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent`. Variantes: error (`border-red-500 focus:ring-red-500`), disabled (`bg-gray-100 cursor-not-allowed`).
- ✅ `text-black` en inputs es innegociable (visibilidad); al vivir en la primitiva, se garantiza por construcción en lugar de por checklist.

### Tokens generales

- Botón primario: `bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50` (en `<Button>`)
- Card: `bg-white shadow-lg rounded-lg p-6` · Label: `block text-sm font-medium text-gray-700 mb-1` · Error text: `text-sm text-red-600 mt-1`
- Contenedores `max-w-7xl mx-auto`; responsive mobile-first con `sm: md: lg:`.

## 7. Gráficos

- ✅ SIEMPRE Chart.js con `react-chartjs-2`; registro de componentes (ArcElement, CategoryScale, etc.) centralizado en `@/lib/chart.ts` — importar de ahí, no registrar en cada componente.
- ✅ `responsive: true`; `maintainAspectRatio` según el caso.
- ❌ NUNCA otra librería de gráficos.

## 8. WebSocket / Tiempo Real

- ✅ `<LiveUsers />` (feature `features/live-users/`) en `app/layout.tsx` con `className="hidden"` — mantiene la conexión WS activa.
- ✅ Consumir datos en vivo vía hook `useLiveUsers`.

## 9. Seguridad

- ✅ Cumplir `.cursor/skills/backend-security-rules/SKILL.md` (auth, roles, no confiar en el cliente).
- ✅ Rutas admin bajo `app/admin/` con verificación de rol EN EL LAYOUT del segmento (guard), no componente por componente.
- ✅ Ocultar acciones admin/destructivas por rol (defensa en profundidad) — el backend revalida SIEMPRE.
- ❌ NUNCA secretos/API keys/tokens de servicio en código cliente o `localStorage` salvo diseño explícito de sesión.
- ❌ EVITAR `dangerouslySetInnerHTML` sin sanitizar. ❌ NO exponer IDs internos innecesarios en query strings.

## 10. URLs siempre en inglés

- ✅ Paths en inglés en `href`, `router.push()`, carpetas de `app/`, `redirect()`: `/traceability`, `/verify-product`, `/about-us`.
- ❌ `/trazabilidad`, `/productos`, `/contacto`. El contenido visible sí puede estar en español.

---

## 🚨 Errores comunes — rechazar en review

- ❌ Lógica de negocio o componentes de dominio dentro de `app/` (solo routing) o en `components/` (solo shared agnóstico).
- ❌ Import de un feature desde otro feature, o de features desde shared.
- ❌ `fetch()` nativo o `axios` importado directo.
- ❌ `staleTime`/`gcTime`/`revalidate`/`generateStaticParams` (ver política de caché).
- ❌ `<input>` nativo suelto en lugar de la primitiva de `components/ui/`.
- ❌ `Promise.allSettled` en datos críticos (huecos silenciosos) o `Promise.all` en widgets independientes (fallo en cascada) — aplicar el criterio de §3.
- ❌ Listados sin paginación. ❌ Acciones admin sin guard de rol en el layout del segmento.
- ❌ `any`; `useRouter` de `next/router` (usar `next/navigation`); `<a>` en vez de `next/link`; `<img>` en vez de `next/image`.
- ❌ Olvidar `'use client'` donde hay hooks; olvidar `loading.tsx`/`error.tsx` por sección.

## 📋 Checklist pre-commit

- [ ] **`npm run build:frontend`** verde (desde repo root) — no sustituir por solo `vitest run`.
- [ ] ¿El código nuevo está en el feature correcto (`features/<dominio>/`) y `app/` solo tiene routing?
- [ ] ¿Cero imports cross-feature y cero imports shared→feature?
- [ ] ¿Todo HTTP pasa por `@/lib/axios`? ¿Sin caché de ningún tipo?
- [ ] ¿Inputs/selects usan las primitivas de `components/ui/`?
- [ ] ¿Listados paginados? ¿Rutas admin con guard en el layout?
- [ ] ¿`Promise.all` vs `allSettled` según criticidad de los datos?
- [ ] ¿Loading/error states, toasts, `'use client'` donde corresponde, URLs en inglés, tipos estrictos?
- [ ] ¿Gráficos con Chart.js registrado vía `@/lib/chart.ts`?
- [ ] ¿`<LiveUsers />` presente (oculto) en el layout raíz?