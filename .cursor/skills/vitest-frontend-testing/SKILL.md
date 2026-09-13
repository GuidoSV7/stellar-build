---
name: vitest-frontend-testing
description: >
  Guía para escribir tests unitarios de frontend con Vitest y Testing Library.
  Usar este skill siempre que el usuario quiera escribir, revisar o mejorar tests
  de componentes React/Vue/Svelte, hooks, utilidades JS/TS, o cualquier código
  de frontend. Activar también cuando el usuario mencione "test unitario",
  "testing", "vitest", "jest", "testing library", "coverage", "mock", "spy",
  "renderizar componente", o cuando pida ayuda con errores en sus tests de UI.
---

# Vitest – Testing de Frontend

## Arquitectura de `test/`

Todo el código de pruebas vive bajo **`frontend/test/`**. La estructura **replica** la del resto del frontend: misma carpeta y mismo nombre de archivo, con sufijo `.test.ts` o `.test.tsx`.

```
frontend/test/
├── support/                          # helpers compartidos (no espejan un módulo de app)
│   └── render-with-admin-query.tsx   # QueryClient + React Query para vistas admin
├── components/                       # espejo de components/
│   ├── admin/
│   ├── features/
│   │   └── cashier/                  # espejo de components/features/cashier/
│   ├── landing/
│   ├── marketing/
│   └── sports/
├── lib/                              # espejo de lib/
│   └── mocks/
│       └── admin-house-panel/
├── services/                         # espejo de services/
├── src/                              # espejo de src/
└── utils/                            # espejo de utils/
```

- **`support/`**: utilidades solo para tests (render wrappers, factories). No colocar aquí tests de producto.
- **Resto de ramas**: un archivo `*.test.*` por cada unidad que quieras cubrir en la ruta equivalente fuera de `test/` (p. ej. `components/admin/Foo.tsx` → `test/components/admin/Foo.test.tsx`).
- Vitest incluye únicamente `test/**/*.{test,spec}.{ts,tsx}` (ver `vitest.config.ts` del proyecto).

### Cierre de slice (no-regresión)

- Baseline versionado: **`test/KNOWN_FAILURES.md`** + **`test/baseline-failures.json`** (5 fallos estables de deuda ajena).
- Guardrail: **`npm run test:baseline-check`** — falla solo si hay tests rojos **nuevos** (no listados en el baseline).
- No exigir suite 100% green mientras exista deuda documentada; sí exigir **cero regresiones** sobre el baseline.

## Principios base (F.I.R.S.T.)

Todos los tests deben ser:

- **Fast** – Ejecutarse en milisegundos (sin I/O real)
- **Independent** – Sin estado compartido entre tests
- **Repeatable** – Mismo resultado siempre, sin depender del entorno
- **Self-validating** – Pasan o fallan solos
- **Timely** – Escritos junto al código o antes (TDD)

---

## Qué cubrir en tests de frontend

### 1. Renderizado básico (smoke test)
Verificar que el componente monta sin errores.

```ts
it('renderiza sin errores', () => {
  render(<MiComponente />)
})
```

### 2. Comportamiento del usuario (happy path)
Simular interacciones reales: clicks, tipeo, submit.

```ts
it('muestra el mensaje al hacer click', async () => {
  render(<Boton />)
  await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
  expect(screen.getByText('Enviado!')).toBeInTheDocument()
})
```

### 3. Estados del componente
- Estado inicial
- Estado de carga (`loading`)
- Estado de error
- Estado vacío / sin datos

### 4. Props y variantes
Cubrir las combinaciones críticas de props que cambian la UI.

```ts
it('muestra badge cuando isNew es true', () => {
  render(<Card isNew={true} />)
  expect(screen.getByText('Nuevo')).toBeVisible()
})
```

### 5. Casos límite (edge cases)
- Strings vacíos, listas vacías
- Valores muy largos (overflow de texto)
- Props opcionales ausentes

### 6. Accesibilidad básica
```ts
it('el input tiene label asociado', () => {
  render(<CampoEmail />)
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
})
```

### 7. Hooks personalizados
Usar `renderHook` de Testing Library.

```ts
it('incrementa el contador', () => {
  const { result } = renderHook(() => useContador())
  act(() => result.current.incrementar())
  expect(result.current.valor).toBe(1)
})
```

---

## Qué NO testear en tests unitarios

| ❌ Evitar | ✅ Alternativa |
|---|---|
| Llamadas HTTP reales | `vi.mock` / `msw` |
| Base de datos real | Mocks o fixtures |
| CSS / estilos visuales | Tests E2E o visuales |
| Implementación interna | Comportamiento observable |
| Librerías de terceros | Confiar en sus propios tests |

---

## Setup recomendado

### Dependencias
```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### vitest.config.ts
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
})
```

### src/test/setup.ts
```ts
import '@testing-library/jest-dom'
```

---

## Estructura de un test

```ts
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import MiComponente from './MiComponente'

describe('MiComponente', () => {
  // 1. Happy path
  it('renderiza el título correctamente', () => {
    render(<MiComponente titulo="Hola" />)
    expect(screen.getByRole('heading', { name: /hola/i })).toBeInTheDocument()
  })

  // 2. Interacción
  it('llama a onSubmit con los datos del form', async () => {
    const onSubmit = vi.fn()
    render(<MiComponente onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Juan')
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).toHaveBeenCalledWith({ nombre: 'Juan' })
  })

  // 3. Estado de error
  it('muestra error si el campo está vacío', async () => {
    render(<MiComponente />)
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
    expect(screen.getByText(/campo requerido/i)).toBeInTheDocument()
  })
})
```

---

## Mocks más comunes

### Mock de módulo
```ts
vi.mock('./api/usuarios', () => ({
  obtenerUsuario: vi.fn().mockResolvedValue({ id: 1, nombre: 'Ana' }),
}))
```

### Mock de función (spy)
```ts
const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
// ... test
expect(spy).not.toHaveBeenCalled()
```

### Mock de fetch / HTTP con MSW
```ts
// src/test/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/usuarios', () => {
    return HttpResponse.json([{ id: 1, nombre: 'Ana' }])
  }),
]
```

---

## Queries de Testing Library (orden de preferencia)

Usar siempre la query **más accesible** disponible:

1. `getByRole` — preferida (refleja accesibilidad real)
2. `getByLabelText` — para inputs con label
3. `getByPlaceholderText` — si no hay label
4. `getByText` — para texto visible
5. `getByTestId` — último recurso (`data-testid`)

> ⚠️ Evitar buscar por clase CSS o estructura del DOM. Los tests deben sobrevivir refactors de UI.

---

## Métricas de cobertura

| Tipo de código | Cobertura sugerida |
|---|---|
| Lógica de negocio / hooks | 90%+ |
| Componentes de UI | 70–80% |
| Utilidades / helpers | 90%+ |
| Código de configuración | No es necesario |

Correr coverage:
```bash
npx vitest run --coverage
```

---

## Patrones a seguir
- **Arrange / Act / Assert**: Preparar → ejecutar → verificar
- Un solo concepto por test
- Nombres descriptivos: `'muestra error cuando el email es inválido'`
- `beforeEach` para setup repetitivo, nunca para lógica de test
- Limpiar mocks con `vi.clearAllMocks()` en `afterEach`
