import type { Metadata } from 'next'
import { Arimo } from 'next/font/google'
import '../index.css'
import { Providers } from './providers'

/**
 * Helvetica Neue is licensed and cannot be self-hosted, and there is no free
 * weights package for it. Mac visitors have it; nobody else does. Arimo is
 * metric-compatible with Arial (and therefore with Helvetica), so it holds the
 * same line breaks, and it ships a real 700 -- which matters now that the type
 * scale sets weights and `font-synthesis: none` forbids a faked bold.
 *
 * Licence: SIL Open Font License 1.1. Self-hosted at build time by next/font,
 * so no request leaves the origin at runtime.
 */
const arimo = Arimo({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-fallback',
  display: 'swap',
})

/**
 * No custom domain is registered for this project yet -- `VERCEL_URL` is the
 * per-deployment host Vercel injects automatically (preview and production
 * alike), so metadataBase tracks wherever this actually deploys rather than
 * a fabricated domain. Falls back to localhost for `next dev`/tests, where
 * the var is unset.
 *
 * `icons` is deliberately absent: icon.svg / apple-icon.png / favicon.ico /
 * opengraph-image.png in this directory are Next 15's file-convention names,
 * and Next generates the <link rel="icon"> etc. tags from them on its own --
 * hand-writing `icons` here would just be a second, driftable source of truth.
 *
 * `description` stays a sentence fragment, lowercase chrome under the item-10
 * rule ("Worktrack" itself is the product's proper noun and keeps its case).
 * `openGraph.description` reuses the sidebar footer's retired M5 line rather
 * than inventing a tagline; `CV` keeps its case as an acronym.
 */
const siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Worktrack',
  description: 'job search tracker and analytics dashboard',
  openGraph: {
    title: 'Worktrack',
    description: 'every application, every version of your CV.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning is required: next-themes sets the class on <html>
  // before React hydrates, which would otherwise log a mismatch on every load.
  return (
    <html lang="en" className={arimo.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
