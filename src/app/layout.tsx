import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'Worktrack',
  description: 'Job search tracker and analytics dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning is required: next-themes sets the class on <html>
  // before React hydrates, which would otherwise log a mismatch on every load.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
