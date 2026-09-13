---
name: playwright-e2e-next
description: Pruebas E2E con Playwright para aplicaciones Next.js (App Router, Server Components, Server Actions, flujos de auth y pago). Usar SIEMPRE que el usuario pida tests end-to-end, tests de UI, tests de flujos de usuario, mencione Playwright, testear async Server Components, o pida validar login, formularios, checkout, navegación o cualquier flujo completo en el navegador. También aplica al configurar Playwright, arreglar tests flaky, o decidir qué flujos merecen E2E.
---

# Playwright — E2E en Next.js (FRONTEND)

**Ámbito: FRONTEND (Next.js).** Nota clave del stack: Vitest no puede renderizar async Server Components, así que todo componente async se testea acá, en E2E — no es opcional, es la única capa que los cubre.

## Qué merece un test E2E (presupuesto: 20-30 tests)

E2E es la capa más cara y lenta. Solo flujos donde una falla cuesta dinero o usuarios:
- Registro / login / logout (incluye el flujo de sesión completo).
- Checkout / pago / suscripción.
- El flujo core del producto (crear X, publicar Y).
- Formularios críticos con su validación visible.

NO escribir E2E para: variantes de estilo, cada estado de un componente (eso es Vitest+RTL), lógica de negocio del backend (eso es integración Nest). Si la suite pasa de ~30 tests o ~10 min, recortar antes de agregar.

## Setup

```bash
npm init playwright@latest
```

```typescript
// playwright.config.ts — lo esencial
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,      // que un .only no se cuele a CI
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',          // trace viewer para depurar flaky
  },
  webServer: {
    command: 'npm run build && npm run start', // CI testea el build de PRODUCCIÓN
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,      // en local reusa el dev server
  },
});
```

Testear contra `next start` (build de producción) en CI: el dev server difiere en streaming, caching y errores.

## Locators: la regla que decide si la suite vive o muere

Prioridad estricta (los locators de Playwright auto-esperan y reintentan):

1. `page.getByRole('button', { name: 'Comprar' })` — rol + nombre accesible. SIEMPRE la primera opción.
2. `page.getByLabel('Email')` para inputs de formulario.
3. `page.getByText(...)` para contenido no interactivo.
4. `page.getByTestId('...')` solo cuando no hay semántica posible (agregar `data-testid` al componente).

**PROHIBIDO**: selectores CSS de clases (`.btn-primary`), XPath, selectores por estructura del DOM (`div > div:nth-child(2)`). Se rompen con cualquier refactor de estilos y son la causa #1 de suites abandonadas. Bonus del getByRole: si el test no encuentra el rol, el componente probablemente tiene un problema de accesibilidad — el test lo detecta gratis.

## Assertions web-first (elimina el flaky)

```typescript
// BIEN — reintenta hasta 5s hasta que se cumpla:
await expect(page.getByRole('status')).toHaveText('Guardado');

// MAL — foto instantánea, falla si aún no renderizó:
const text = await page.textContent('h1');
expect(text).toBe('Bienvenido');
```

**PROHIBIDO `page.waitForTimeout()`**. Si un test "necesita" un sleep, el problema es el locator o la assertion. Usar `expect(locator).toBeVisible()/toHaveText()/toHaveURL()` que auto-esperan.

## Autenticación: una vez, no por test

Loguearse por UI en cada test es lento y frágil. Usar storage state:

```typescript
// e2e/auth.setup.ts — proyecto "setup" que corre primero
setup('autenticar', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_USER!);
  await page.getByLabel('Contraseña').fill(process.env.E2E_PASS!);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
```

En config: proyecto `setup` como dependencia, y los demás proyectos con `storageState: 'e2e/.auth/user.json'`. Mantener UN test que sí valide el login por UI (es un flujo crítico); el resto lo hereda.

## Datos de test y aislamiento

- Cada test crea sus propios datos (vía API/seed del backend), con identificadores únicos (`user-${Date.now()}`), y no asume estado previo.
- Para terceros (pasarela de pago), usar el modo test del proveedor o `page.route()` para interceptar la red — nunca pegarle a producción de un tercero.
- Playwright aísla por contexto de navegador nuevo por test; no romper eso compartiendo estado global.

## Estructura del test: legible como flujo de usuario

```typescript
test('un usuario puede completar una compra', async ({ page }) => {
  await page.goto('/products/teclado-mecanico');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.getByRole('link', { name: 'Carrito' }).click();
  await expect(page.getByRole('listitem')).toContainText('Teclado mecánico');

  await page.getByRole('button', { name: 'Pagar' }).click();
  await page.getByLabel('Número de tarjeta').fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Confirmar pago' }).click();

  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible();
  await expect(page).toHaveURL(/\/orders\/[\w-]+/);
});
```

Page Object Model: adoptarlo solo cuando 3+ tests repiten las mismas interacciones sobre una página. El page object expone acciones y locators; las assertions viven en el test, no en el page object.

## Depurar flaky

1. `npx playwright test --trace on` y abrir el trace viewer — muestra cada paso, screenshots, red y consola.
2. Causas típicas: locator ambiguo (strict mode violation → afinar con `.filter()`), assertion no web-first, datos compartidos entre tests, dependencia del dev server.
3. Un test flaky se arregla o se borra en la semana. Flaky tolerado = suite ignorada = gauntlet muerto.

## Checklist

- [ ] Solo flujos críticos; la suite corre en <10 min.
- [ ] Cero selectores CSS/XPath; getByRole/getByLabel dominan.
- [ ] Cero `waitForTimeout`; todas las assertions son web-first.
- [ ] Auth por storage state; un solo test de login por UI.
- [ ] CI corre contra build de producción con `forbidOnly` y trace on-first-retry.
