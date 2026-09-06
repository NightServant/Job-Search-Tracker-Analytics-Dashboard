import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demo · New CV',
  description: 'The CV template picker, over invented data. No account needed.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
