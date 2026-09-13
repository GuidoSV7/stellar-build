---
name: nextjs-seo
description: >
  Skill de SEO específica para Next.js (App Router). Usar junto con la
  skill genérica "seo" cuando el proyecto sea Next.js y se necesite
  implementar la Metadata API (metadata / generateMetadata), sitemap.ts,
  robots.ts, imágenes Open Graph dinámicas, JSON-LD, next/image, next/font
  o resolver problemas de indexación propios de App Router / Pages Router.
  Complementa, no reemplaza, a la skill "seo" (principios generales de
  SEO técnico y de contenido).
---

# SEO en Next.js (App Router)

Esta skill asume que ya se aplicaron los principios generales de la skill
`seo` (metadatos únicos, Core Web Vitals, JSON-LD, sitemap/robots, etc.) y
se enfoca en **cómo implementarlos con las APIs propias de Next.js**.

Usar **App Router + Metadata API** como default para proyectos nuevos.
Usar Pages Router (`next/head`, `next-seo`) solo si el proyecto ya está en
Pages Router y migrar no es viable a corto plazo.

## 1. Metadata API: static vs dynamic

Regla clave: si el metadato **no depende de datos externos ni de
parámetros de ruta**, usar el objeto estático `metadata`. Solo usar
`generateMetadata` (async) cuando dependa de un fetch o de `params`/
`searchParams` — es más costoso y no debe usarse "por defecto".

```tsx
// app/about/page.tsx — metadata estática
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre nosotros | Mi Marca',
  description: 'Conocé la historia y el equipo detrás de Mi Marca.',
  alternates: { canonical: 'https://misitio.com/about' },
}

export default function AboutPage() { /* ... */ }
```

```tsx
// app/blog/[slug]/page.tsx — metadata dinámica
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await fetch(`https://api.misitio.com/posts/${slug}`).then(r => r.json())

  return {
    title: `${post.title} | Mi Blog`,
    description: post.excerpt,
    alternates: { canonical: `https://misitio.com/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
    },
  }
}

export default async function PostPage({ params }: Props) { /* ... */ }
```

Reglas importantes:
- `metadata`/`generateMetadata` **solo funcionan en Server Components**.
  Si la página necesita ser Client Component (`'use client'`), mover la
  metadata al `layout.tsx` del segmento (que sí puede ser Server Component)
  y dejar la página como componente hijo cliente.
- Nunca exportar `metadata` y `generateMetadata` en el mismo segmento.
- Los `fetch` dentro de `generateMetadata` se memoizan automáticamente si
  se repiten en `generateStaticParams`/`page`/`layout` — no hay problema
  de duplicar la llamada.
- Los campos anidados (`openGraph`, `robots`) **no hacen merge profundo**
  entre segmentos: si un layout padre define `openGraph.description` y el
  hijo redefine `openGraph` sin ese campo, se pierde. Si hay que compartir
  campos, extraerlos a una constante e hacer spread manual.
- `title` puede usar plantillas por segmento:
  ```tsx
  export const metadata: Metadata = {
    title: { default: 'Mi Marca', template: '%s | Mi Marca' },
  }
  // en una subpágina: title: 'Blog' -> renderiza "Blog | Mi Marca"
  ```

### `metadataBase`

Definir siempre `metadataBase` en el `layout.tsx` raíz para que las URLs
relativas de OG/Twitter/canonical se resuelvan a absolutas automáticamente:
```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://misitio.com'),
}
```

## 2. sitemap.ts y robots.ts (file-based, en `/app`)

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetch('https://api.misitio.com/posts').then(r => r.json())

  const postEntries: MetadataRoute.Sitemap = posts.map((post: { slug: string; updatedAt: string }) => ({
    url: `https://misitio.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    { url: 'https://misitio.com', lastModified: new Date(), changeFrequency: 'yearly', priority: 1 },
    { url: 'https://misitio.com/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    ...postEntries,
  ]
}
```

```ts
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/checkout/'] },
    sitemap: 'https://misitio.com/sitemap.xml',
  }
}
```

Para sitios grandes (miles de URLs) o multi-idioma, considerar la
librería `next-sitemap` en vez de mantener `sitemap.ts` a mano. Para
listas muy grandes, Next.js soporta generar múltiples sitemaps con
`generateSitemaps()`.

## 3. JSON-LD en App Router

Renderizar el `<script>` directamente en el Server Component de la
página (no hace falta un paquete externo):
```tsx
export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* resto de la página */}
    </>
  )
}
```
Crear un componente `<JsonLd data={...} />` reutilizable si se repite en
varios tipos de página (Article, Product, BreadcrumbList, FAQPage, etc.).

## 4. Imágenes Open Graph dinámicas (`ImageResponse`)

Next.js permite generar imágenes OG por ruta usando JSX + `ImageResponse`,
sin depender de diseñar cada imagen a mano:
```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#111', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
        {post.title}
      </div>
    ),
    { ...size }
  )
}
```
Next.js detecta el archivo por convención y lo enlaza automáticamente en
`og:image` — no hace falta declararlo en `generateMetadata`.

## 5. next/image y next/font (Core Web Vitals)

- Usar siempre `next/image` en vez de `<img>`: optimiza formato
  (WebP/AVIF), lazy-loading automático, y **reserva el espacio** (evita
  CLS) siempre que se pase `width`/`height` o `fill` con un contenedor
  con tamaño definido.
- Marcar `priority` en la imagen LCP (la imagen principal above-the-fold)
  para que no se lazy-loadee y mejore el LCP.
- Usar `next/font` (`next/font/google` o `next/font/local`) en vez de
  `<link>` a Google Fonts: hace self-hosting automático y evita el layout
  shift por carga de fuentes (mejora CLS y elimina una conexión externa).

## 6. Errores comunes en Next.js (revisar siempre)

- **No usar `generateMetadata` para páginas estáticas.** Agrega overhead
  innecesario; usar el objeto `metadata` estático.
- **Client Components no pueden exportar metadata.** Mover la lógica de
  metadata al `layout.tsx` (Server Component) del segmento.
- **Canonical mal seteado o ausente** en rutas dinámicas y paginadas →
  contenido duplicado (`/blog?page=2` sin canonical apuntando a sí misma).
- **Streaming metadata y bots:** Next.js puede streamear metadata después
  del HTML inicial en páginas con render dinámico; para bots que esperan
  la metadata en el `<head>` inicial (algunos crawlers no-Google), Next.js
  ya desactiva el streaming automáticamente — no hace falta configurarlo,
  pero conviene saber que existe si algo no aparece bien en un validador.
- **Rutas App Router vs Pages Router mezcladas:** si el proyecto está en
  migración, verificar que no queden `<Head>` de `next/head` conviviendo
  con `generateMetadata` en la misma ruta — generan tags duplicados.
- **i18n:** usar `alternates.languages` en cada `generateMetadata` con
  todas las variantes de idioma + canonical self-referencing por locale;
  nunca reusar el mismo `title`/`description` en inglés para todos los
  idiomas.

## 7. Checklist específico de Next.js

- [ ] `metadataBase` definido en el layout raíz.
- [ ] Todas las rutas dinámicas (`[slug]`, `[id]`) tienen `generateMetadata`
      con `title`, `description` y `alternates.canonical` únicos.
- [ ] `app/sitemap.ts` incluye todas las URLs canónicas, con `lastModified`
      real.
- [ ] `app/robots.ts` apunta al sitemap y bloquea solo rutas privadas.
- [ ] JSON-LD implementado con `ImageResponse`/componente reutilizable en
      home, artículos/productos y breadcrumbs.
- [ ] `opengraph-image` (estática o dinámica) definida por sección
      relevante; validada con Facebook Sharing Debugger / LinkedIn Post
      Inspector.
- [ ] Todas las imágenes usan `next/image`; la imagen LCP tiene `priority`.
- [ ] Fuentes cargadas con `next/font` (sin `<link>` externo a Google
      Fonts).
- [ ] Verificado con "Ver código fuente" que el HTML servido (no el DOM
      hidratado) contiene título, descripción y contenido principal.
- [ ] `next.config` con `images.formats: ['image/avif', 'image/webp']` y
      compresión habilitada.