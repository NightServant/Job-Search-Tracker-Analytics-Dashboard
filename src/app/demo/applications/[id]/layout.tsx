import type { Metadata } from 'next'

/**
 * Metadata only. The page beside this file is a client component, and a client
 * component cannot export `metadata` -- so it lives in a server layout that
 * renders its children and nothing else.
 */
export const metadata: Metadata = {
  title: 'Demo · Application',
  description: 'One application, over invented data. No account needed.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
