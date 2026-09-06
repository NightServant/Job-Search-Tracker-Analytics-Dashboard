import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New CV · Worktrack',
  description: 'Start a CV from a template or a blank page.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
