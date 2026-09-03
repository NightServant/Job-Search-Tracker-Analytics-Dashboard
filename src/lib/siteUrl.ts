/**
 * The origin this build is deployed at.
 *
 * One definition, because three things need it and they must agree: the
 * metadataBase that resolves Open Graph image paths, the sitemap's <loc>
 * entries, and the Sitemap: line in robots.txt. A sitemap that names a
 * different host than the page it is served from is ignored by crawlers, and
 * that is the kind of mismatch nobody notices for months.
 *
 * VERCEL_URL is the deployment's own hostname and is set on every Vercel
 * build, including previews -- which is what makes a preview deployment
 * advertise itself rather than production. Falling back to localhost is
 * correct for `next dev` and for tests; it is wrong in production, and the
 * README says to set NEXT_PUBLIC_SITE_URL there.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
