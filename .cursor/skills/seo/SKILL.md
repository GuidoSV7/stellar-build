---
name: seo
description: >
  Skill de SEO técnico y de contenido para aplicaciones web modernas (React,
  Next.js, Angular, Vue u otro framework JS). Usar cuando el usuario pida
  optimizar el SEO de una app, revisar metadatos, mejorar Core Web Vitals,
  agregar datos estructurados (JSON-LD), configurar sitemap/robots.txt,
  mejorar Open Graph/Twitter Cards, o auditar la indexabilidad de un sitio.
  Si el proyecto es Next.js, combinar esta skill con la skill "nextjs-seo"
  para la implementación específica del framework (Metadata API, sitemap.ts,
  robots.ts, generación de imágenes OG, etc.).
---

# SEO Skill (genérica, agnóstica de framework)

Guía de referencia para implementar y auditar SEO técnico y on-page en
aplicaciones construidas con JavaScript/TypeScript. Es agnóstica de
framework: aplica los mismos principios a React (CRA/Vite), Next.js,
Angular, Vue/Nuxt, Remix, Astro, etc. Cuando el stack sea **Next.js**,
leer también `../nextjs-seo/SKILL.md`, que trae el código específico del
framework (Metadata API, `sitemap.ts`, `robots.ts`, `ImageResponse`, etc.).

## 0. Antes de tocar código: diagnóstico rápido

1. Preguntar o inferir el stack: ¿React puro (CSR), Next.js, Angular,
   Vue/Nuxt, Astro? Esto determina la estrategia de renderizado (paso 1).
2. Revisar si ya existe `robots.txt`, `sitemap.xml`, meta tags, y si el
   contenido crítico aparece en el HTML inicial (ver `curl -s URL` o "Ver
   código fuente" — no solo en el DOM renderizado por JS).
3. Priorizar: la falta de SSR/SSG en contenido indexable suele ser el
   problema #1; metadatos y datos estructurados el #2; Core Web Vitals el #3.

## 1. Estrategia de renderizado (la base de todo)

El SEO de una SPA depende, ante todo, de que el HTML que reciben los
crawlers contenga el contenido real, no un `<div id="root"></div>` vacío
que se llena con JS. Los bots de IA (GPTBot, ClaudeBot, PerplexityBot) en
general **no ejecutan JavaScript**, así que dependen 100% del HTML servido.

| Estrategia | Cuándo usarla |
|---|---|
| **SSR** (Server-Side Rendering) | Contenido dinámico, personalizado o que cambia por request (dashboards públicos, resultados de búsqueda, páginas con datos en tiempo real). |
| **SSG** (Static Site Generation) | Contenido que cambia poco (landing pages, blogs, documentación). TTFB mínimo, máxima cacheabilidad. |
| **ISR** (Incremental Static Regeneration) | Contenido que cambia ocasionalmente pero necesita frescura (e-commerce, precios, stock). Es el mejor balance en 2026. |
| **CSR puro** | Solo para rutas detrás de autenticación / que no necesitan rankear (paneles internos, apps privadas). |

Por framework:
- **React sin meta-framework (CRA/Vite):** no hay SSR nativo. Opciones:
  migrar a un framework con SSR (Next.js, Remix, Waku), o usar
  prerendering estático (`vite-plugin-ssr`, `react-snap`, prerender.io)
  solo como parche para páginas de marketing estáticas.
- **Next.js:** SSR/SSG/ISR nativos vía App Router + React Server
  Components. Es el default recomendado en 2026 para SEO. Ver skill
  `nextjs-seo`.
- **Angular:** CSR por defecto. Activar SSR/hidratación híbrida con
  `ng add @angular/ssr` (Angular Universal). Permite `RenderMode.Server`,
  `RenderMode.Prerender` (SSG) o `RenderMode.Client` por ruta.
- **Vue/Nuxt:** Nuxt trae SSR/SSG nativo (similar filosofía a Next.js).

Regla práctica: **verificar siempre con "Ver código fuente" (Ctrl+U) o
`curl`, no con las DevTools** (que muestran el DOM ya hidratado). Si el
`<title>`, la descripción y el contenido principal no aparecen ahí, un
bot que no ejecuta JS no los va a ver.

## 2. Metadatos on-page (title, description, canonical)

Reglas universales, independientes del framework:

- **Title:** único por página, 50–60 caracteres, con la keyword principal
  cerca del inicio. Nunca reutilizar el mismo title en dos rutas.
- **Meta description:** única por página, 150–160 caracteres. No afecta
  el ranking directamente pero sí el CTR en resultados de búsqueda.
- **Canonical URL:** siempre absoluta (`https://dominio.com/ruta`), en
  cada página, incluso si es autorreferencial. Evita contenido duplicado
  por parámetros de query, trailing slash o www/no-www.
- **Nunca** dejar metadatos genéricos/repetidos generados por un layout
  raíz sin sobrescribirlos por página — es el error más común en SPAs.

Implementación según stack:
- **Next.js:** Metadata API (`export const metadata` / `generateMetadata`).
  Ver skill `nextjs-seo`.
- **React (Vite/CRA) sin framework SSR:** `react-helmet-async` (mantiene
  compatibilidad con SSR si migras después) o `<title>`/meta tags nativos
  de React 19 dentro de cualquier componente (React 19 permite renderizar
  `<title>`, `<meta>`, `<link>` directamente y los hoistea al `<head>`).
- **Angular:** servicios `Title` y `Meta` de `@angular/platform-browser`,
  seteados en el `ngOnInit`/resolver de cada componente de ruta. Con SSR
  (Angular Universal) esto se renderiza en el HTML enviado al servidor.
  Ejemplo:
  ```ts
  import { Title, Meta } from '@angular/platform-browser';

  constructor(private title: Title, private meta: Meta) {}

  ngOnInit() {
    this.title.setTitle('Título de la página | Marca');
    this.meta.updateTag({ name: 'description', content: 'Descripción única de esta página.' });
    this.meta.updateTag({ property: 'og:title', content: 'Título de la página' });
  }
  ```
  Tip: usar `meta.updateTag` (no `addTag`) para evitar tags duplicados al
  navegar entre rutas dentro de la misma sesión SPA.

## 3. Open Graph y Twitter Cards (compartibilidad social)

Toda página pública debería tener:
```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://dominio.com/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://dominio.com/ruta" />
<meta property="og:type" content="website" /> <!-- o "article" -->
<meta name="twitter:card" content="summary_large_image" />
```
- Imagen OG: 1200×630px, formato jpg/png, URL absoluta.
- Validar con Facebook Sharing Debugger, Twitter Card Validator y
  LinkedIn Post Inspector antes de dar por cerrada una implementación
  (los crawlers cachean, así que hay que forzar el re-scrape).

## 4. Datos estructurados (JSON-LD)

Usar siempre **JSON-LD** (no microdata ni RDFa) inyectado en un
`<script type="application/ld+json">`. Es el formato que Google recomienda
y el más fácil de mantener en componentes.

Tipos más comunes:
- `Organization` / `WebSite` en la home.
- `Article` / `BlogPosting` en posts de blog.
- `Product` + `Offer` + `AggregateRating` en páginas de producto.
- `BreadcrumbList` en todas las páginas con jerarquía de navegación.
- `FAQPage` en secciones de preguntas frecuentes.

Ejemplo de componente reutilizable (aplica a React/Angular por igual, solo
cambia la sintaxis del componente):
```tsx
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```
Validar siempre con el **Rich Results Test** de Google y el
**Schema.org Validator**. "Schema drift" (el JSON-LD dice algo que el
contenido visible no respalda) puede generar penalizaciones manuales.

## 5. robots.txt y sitemap.xml

- `robots.txt` en la raíz del dominio, con `Sitemap:` apuntando al sitemap.
  Bloquear solo rutas realmente privadas (`/admin`, `/api`, checkout,
  resultados de búsqueda internos). **No bloquear crawlers de IA**
  (GPTBot, ClaudeBot, PerplexityBot) salvo que exista una razón estratégica
  de licenciamiento de contenido — bloquearlos hoy significa perder
  citaciones en ChatGPT, Claude y Perplexity.
- `sitemap.xml` debe listar únicamente URLs canónicas (sin duplicados, sin
  parámetros de tracking), con `lastmod` real (actualizado cuando cambia
  el contenido) y, si aplica, `changefreq`/`priority`.
- Para sitios multi-idioma, incluir todas las variantes de idioma en el
  sitemap y usar `hreflang` (self-referencing incluido) en cada página.
- Enviar el sitemap a Google Search Console y Bing Webmaster Tools tras
  cada cambio estructural.

## 6. Core Web Vitals (factor de ranking confirmado)

| Métrica | Umbral "bueno" | Qué mide |
|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | Velocidad de carga del contenido principal |
| **INP** (Interaction to Next Paint) | ≤ 200ms | Responsividad ante interacciones (reemplazó a FID en 2024) |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Estabilidad visual (que no "salte" el layout) |

Medir siempre con **datos de campo** (CrUX / Search Console / Real User
Monitoring), no solo con Lighthouse en laboratorio — Google usa datos de
campo para el ranking.

Palancas comunes, agnósticas de framework:
- **LCP:** priorizar la imagen/elemento principal (`fetchpriority="high"`
  o equivalente), usar CDN, comprimir imágenes en WebP/AVIF, precargar
  fuentes críticas, reducir TTFB (cache del servidor, edge rendering).
- **INP:** dividir bundles de JS (code splitting), diferir scripts no
  críticos, mover trabajo pesado a Web Workers, evitar long tasks en
  el hilo principal, usar renderizado concurrente (React 18+).
- **CLS:** siempre declarar `width`/`height` (o `aspect-ratio`) en
  imágenes y embeds, reservar espacio para banners/ads, evitar inyectar
  contenido arriba del contenido existente sin reservar espacio.

## 7. Arquitectura del sitio y contenido

- URLs limpias y descriptivas: `/productos/zapatillas-running` en vez de
  `/product?id=123`. Evitar URLs con hash (`/#/ruta`) en SPAs — no son
  crawleables de forma confiable.
- Enlazado interno: cada página importante debe ser alcanzable en pocos
  clics desde la home; evitar páginas huérfanas.
- Un `<h1>` único por página, jerarquía de headings coherente (`h1` >
  `h2` > `h3`, sin saltarse niveles).
- HTML semántico (`<header>`, `<nav>`, `<main>`, `<article>`,
  `<footer>`) — ayuda tanto a crawlers como a accesibilidad (WCAG 2.2 AA).
- Alt text descriptivo en todas las imágenes (no vacío, no keyword
  stuffing).
- HTTPS en todo el sitio, sin contenido mixto, con redirects 301 desde
  HTTP y desde versiones no canónicas (www vs no-www).

## 8. Checklist de auditoría rápida

- [ ] El contenido principal aparece en el HTML servido (verificado con
      "ver código fuente", no solo DevTools).
- [ ] Cada ruta pública tiene `title` y `description` únicos.
- [ ] Cada ruta tiene canonical URL absoluta.
- [ ] Open Graph + Twitter Card configurados y validados.
- [ ] JSON-LD implementado en home, artículos/productos y breadcrumbs;
      validado en Rich Results Test.
- [ ] `robots.txt` y `sitemap.xml` accesibles, sin bloquear crawlers de IA
      sin motivo, sitemap sin URLs rotas/duplicadas.
- [ ] LCP ≤ 2.5s, INP ≤ 200ms, CLS < 0.1 en datos de campo (Search Console).
- [ ] URLs limpias, sin hash routing para contenido indexable.
- [ ] Un solo `<h1>` por página, jerarquía de headings correcta.
- [ ] Sitio en HTTPS, sin contenido duplicado por www/trailing slash.
- [ ] Sitemap enviado a Google Search Console y Bing Webmaster Tools.

## 9. Notas 2026

- Los buscadores de IA (ChatGPT, Perplexity, Google AI Overviews, Gemini)
  ya representan una porción relevante del tráfico informacional. La
  mayoría no ejecuta JS, así que todo lo que mejora el SEO técnico
  tradicional (SSR, HTML limpio, datos estructurados) también mejora la
  visibilidad en respuestas de IA (a veces llamado GEO/AEO).
- Google indexa mobile-first: auditar siempre con el user-agent
  Googlebot Smartphone, no de escritorio.
- Cuidado con el "error 500 invisible": si el framework atrapa un error
  del servidor y muestra una pantalla genérica con status 200, el bot
  indexa una página vacía sin saberlo. Verificar que los status codes
  HTTP sean correctos.