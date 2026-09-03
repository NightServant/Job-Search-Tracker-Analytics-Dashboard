import type { Metadata } from 'next'

/**
 * Metadata only. The page beside this file is a client component, and a client
 * component cannot export `metadata` -- so it lives in a server layout that
 * renders its children and nothing else.
 */
export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a Worktrack account. An email and a password, then a six-digit code.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
