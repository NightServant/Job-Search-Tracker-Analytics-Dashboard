import type { Metadata } from 'next'

/**
 * Metadata only. The page beside this file is a client component, and a client
 * component cannot export `metadata`.
 *
 * The title is STATIC even though the route is dynamic. Naming the company in
 * the tab would be nicer, and it would mean fetching the row on the server to
 * build the title -- a second read of a row the client is already fetching,
 * on a route that is private and noindex, purely to change a browser tab. The
 * generic title is the right trade until the page is server-rendered anyway.
 */
export const metadata: Metadata = {
  title: 'Application',
  description: 'One application, its history, its contacts and the CV you sent.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
