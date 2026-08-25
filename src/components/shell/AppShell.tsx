'use client'

import { usePathname } from 'next/navigation'
import { Sidebar, NAV } from '@/components/ui/sidebar'
import { activeNavHref } from '@/lib/activeNav'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'

/**
 * The authenticated chrome every route renders inside.
 *
 * Sidebar for desktop, Top Bar plus Bottom Nav for mobile -- both driven by
 * the same activeNavHref helper so the two never disagree about which
 * destination a route belongs to.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const active = activeNavHref(pathname, NAV.map((n) => n.href))
  const settingsActive = pathname.startsWith('/settings')

  return (
    <div className="flex min-h-screen bg-bg-canvas">
      <Sidebar pathname={pathname} className="hidden md:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar settingsActive={settingsActive} />
        {/* pb-20 clears the fixed bottom nav; without it the last row of every
            list sits under it and looks like the page is cut off. */}
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
        <BottomNav activeHref={active} />
      </div>
    </div>
  )
}
