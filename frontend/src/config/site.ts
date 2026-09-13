/** URL pública del sitio (SEO: metadataBase, sitemap, robots). */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://bolivianpets.io";

export const siteName = "BolivianPets";
