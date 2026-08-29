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

export const metadata: Metadata = {
  title: 'Worktrack',
  description: 'Job search tracker and analytics dashboard',
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
