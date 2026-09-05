'use client'

import { NAV, type NavEntry } from '@/components/ui/sidebar'
import { NavItem } from '@/components/ui/nav-item'

/**
 * Mobile only. The same five destinations as the sidebar, numberless -- see
 * NavItem's own note on why the number does not fit alongside icon and label
 * at 375px.
 *
 * Settings has no entry here: it moved to the Top Bar when it left the nav,
 * so nothing in this bar is ever active on /settings.
 */
export function BottomNav({
  activeHref,
  nav = NAV,
}: {
  activeHref: string | null
  /** Overridden by /demo/*, whose links must stay inside /demo. */
  nav?: NavEntry[]
}) {
  return (
    <nav
      aria-label="Primary"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border-subtle bg-bg-canvas pb-safe md:hidden"
    >
      {nav.map((item) => (
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
