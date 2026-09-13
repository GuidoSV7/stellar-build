---
name: stitch
description: >-
  Portar diseños de Google Stitch (export HTML/CSS o vía MCP de Stitch) a componentes
  React/Next.js con Tailwind, mapeando colores y estilos a los tokens del design system
  del repo. Usar SIEMPRE que el usuario mencione Stitch, pida convertir un mockup o
  export HTML a Tailwind o a componentes, integre una pantalla nueva a partir de un
  diseño, o pegue HTML con estilos inline o roles Material (primaryContainer, onSurface,
  surfaceVariant, etc.). Aplica también al revisar código que porta diseños de Stitch.
---

# Stitch → código del proyecto

Objetivo: que el resultado sea indistinguible de código escrito a mano sobre el design
system del repo. El export de Stitch es un artefacto **desechable**; los tokens del repo
son la fuente de verdad. Si el export y el design system entran en conflicto (un hex que
no existe, un espaciado fuera de escala), gana el design system y la diferencia se anota
para revisión de diseño — no se resuelve copiando el hex al componente.

## Flujo de trabajo

1. **Obtener el export** (MCP de Stitch o HTML/CSS pegado por el usuario). Tratarlo como
   referencia temporal; nunca copiarlo tal cual al repo.
2. **Inventariar antes de escribir código.** Del export, extraer en una lista:
   - todos los hex / `rgb()` usados y dónde aparecen,
   - familias tipográficas y pesos,
   - radios, sombras y espaciados recurrentes,
   - bloques repetidos (cards, botones, inputs, chips) → candidatos a componente.
3. **Reconciliar con el tema existente.** Abrir `tailwind.config.ts`
   (`theme.extend.colors`) y el archivo de tema de la familia visual correspondiente
   (`lib/design-system/*-theme.ts`). Resolver cada color del inventario en este orden:
   1. ya existe un token → usar su clase semántica;
   2. es una variante nueva de un token existente (hover, container, muted) → agregarla
      al archivo de tema con nombre semántico y exponerla en Tailwind;
   3. no encaja en ninguna familia → **detenerse y preguntar** antes de crear una paleta
      nueva. No mezclar paletas (producto / admin / marketing) sin revisión explícita:
      un archivo de tokens por familia visual.
4. **Convertir la estructura** siguiendo las reglas de abajo, componiendo componentes
   (no una página monolítica) y reutilizando los del design system cuando existan.
5. **Verificar** con el checklist final antes de dar por terminado.

## Mapeo de roles Material → tokens del tema

Stitch exporta roles de Material 3, a veces como inline styles. Traducirlos a tokens
semánticos, nunca a hex. Los nombres exactos salen del archivo de tema del repo; esta
tabla muestra el patrón (ejemplo con la familia `admin`):

| Rol en el export             | Token del tema           | Clase Tailwind                              |
| ---------------------------- | ------------------------ | ------------------------------------------- |
| `primary` / `onPrimary`      | `admin.primary`          | `bg-admin-primary text-admin-on-primary`    |
| `primaryContainer`           | `admin.primary-container`| `bg-admin-primary-container`                |
| `surface` / `surfaceVariant` | `admin.surface`          | `bg-admin-surface`                          |
| `onSurface`                  | `admin.content`          | `text-admin-content`                        |
| `onSurfaceVariant`           | `admin.content-muted`    | `text-admin-content-muted`                  |
| `outline` / `outlineVariant` | `admin.border`           | `border-admin-border`                       |
| `error` / `onError`          | `admin.danger`           | `text-admin-danger`                         |

Si un rol no tiene token todavía, se crea en el archivo de tema (única fuente de hex) y
se expone en `tailwind.config.ts`. Nunca declarar `const green = "#00e676"` ni objetos
de paleta dentro de componentes: duplican la fuente de verdad y se desincronizan.

> Si el repo usa Tailwind v4 con configuración CSS-first, los tokens van en `@theme`
> dentro del CSS global en lugar de `theme.extend.colors`; el principio no cambia.

## Reglas de conversión HTML → JSX/Tailwind

- **Clases semánticas en lugar de hex.** `style={{ color: '#00e676' }}` →
  `text-admin-primary`. Los únicos inline styles aceptables: `backgroundImage` con
  data-URI o URL dinámica, y valores realmente calculados en runtime.
- **Espaciado a escala.** Stitch exporta px arbitrarios; redondear a la escala de
  Tailwind (grid de 4px): `padding: 18px` → `p-4` o `p-5` según el contexto visual, no
  `p-[18px]`. Un valor arbitrario (`w-[347px]`) solo si el diseño lo exige de forma no
  negociable, y con un comentario explicando por qué.
- **HTML semántico.** El export es sopa de `<div>`: convertir a `<button>`, `<nav>`,
  `<main>`, `<section>`, listas y headings reales. Un `<div onClick>` no es un botón:
  rompe accesibilidad y navegación por teclado.
- **Responsive primero.** Stitch entrega un frame fijo (390px móvil o 1440px desktop).
  Reinterpretar anchos fijos como `max-w-*` + `mx-auto` o layouts fluidos (`flex`,
  `grid`) con breakpoints. Nunca portar `width: 1440px`.
- **Componentización.** Bloques repetidos del inventario → un componente con props, en
  el directorio del feature o del design system según la reutilización esperada.
- **Scope raíz.** Envolver la pantalla en su scope (`admin-scope`, `auth-stitch-scope`,
  `stitch-landing`, …) para que plugins, fuentes y estilos de autofill del tema
  apliquen correctamente.
- **Assets.** Reemplazar URLs de `googleusercontent` y data-URIs de imágenes por assets
  del repo (con `next/image` si aplica). Google Fonts y Material Symbols se cargan una
  sola vez en el layout / `globals.css`; nunca un `<link>` dentro del componente.
- **Estilos globales del export** (autofill, icon fonts, utilidades de sombra, cualquier
  `<style>` global) → plugin de Tailwind o `globals.css`, importando el valor desde el
  archivo de tema si hace falta un hex.

### Ejemplo

Export de Stitch (entrada):

```html
<div style="background-color:#131712" class="flex flex-col min-h-screen justify-between">
  <button style="background-color:#00e676;color:#131712"
          class="flex h-12 items-center justify-center rounded-full px-5 font-bold">
    <span class="truncate">Continue</span>
  </button>
</div>
```

Código del proyecto (salida):

```tsx
<div className="admin-scope flex min-h-screen flex-col justify-between bg-admin-surface">
  <button
    type="button"
    className="flex h-12 items-center justify-center rounded-full bg-admin-primary px-5 font-bold text-admin-on-primary"
  >
    Continue
  </button>
</div>
```

Los hex `#131712` y `#00e676` viven únicamente en `lib/design-system/stitch-theme.ts`
como `surface` y `primary`, expuestos vía `tailwind.config.ts`.

## Anti-patrones (si aparece uno, corregirlo antes de continuar)

- Hex o `rgb()` en JSX/TSX fuera del archivo de tema.
- Copiar el `<head>` del export (links de fuentes, meta tags, script del CDN de Tailwind).
- `style={{ … }}` para algo que Tailwind ya cubre.
- Crear una paleta nueva "porque el export la traía".
- Una página monolítica de 400 líneas sin extraer componentes.

## Checklist final

Ejecutar antes de dar por terminado (ajustar rutas a la estructura del repo):

```bash
# Hex fuera del design system: debe devolver vacío o solo casos justificados con comentario
grep -rn --include='*.tsx' -E '#[0-9a-fA-F]{3,8}' app components | grep -v design-system

# Inline styles sospechosos: solo backgroundImage / valores dinámicos deberían aparecer
grep -rn --include='*.tsx' 'style={{' app components | grep -v backgroundImage
```

- [ ] Todos los colores del inventario del paso 2 quedaron mapeados a tokens; ninguno
      perdido, ninguno duplicado.
- [ ] La pantalla es responsive, no un frame fijo.
- [ ] Comparación visual contra el mockup: layout, jerarquía tipográfica y estados
      (hover, disabled, focus) coinciden.
- [ ] Bloques repetidos extraídos a componentes; los del design system reutilizados en
      lugar de reimplementados.