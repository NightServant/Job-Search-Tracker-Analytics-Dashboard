'use client'

import { NAV } from '@/components/ui/sidebar'
import { NavItem } from '@/components/ui/nav-item'

/**
 * Mobile only. The same five destinations as the sidebar, numberless -- see
 * NavItem's own note on why the number does not fit alongside icon and label
 * at 375px.
 *
 * Settings has no entry here: it moved to the Top Bar when it left the nav,
 * so nothing in this bar is ever active on /settings.
 */
export function BottomNav({ activeHref }: { activeHref: string | null }) {
  return (
    <nav
      aria-label="Primary"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border-subtle bg-bg-canvas md:hidden"
    >
      {NAV.map((item) => (
        <NavItem
          key={item.href}
          {...item}
          variant="bottom"
          active={item.href === activeHref}
        />
      ))}
    </nav>
  )
}
