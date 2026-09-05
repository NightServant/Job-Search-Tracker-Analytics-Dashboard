'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { BrandLockup } from '@/components/ui/brand-mark'
import { SettingsIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'

/**
 * Mobile only. Logo, spacer, Theme Toggle, Settings.
 *
 * The bar is 64px because two 44px targets plus breathing room does not fit in
 * the 55px it used to be. Body scroll absorbs the difference; the bottom nav
 * does not move.
 *
 * STICKY, not static. The bottom nav was already pinned, so on a long list the
 * two halves of the mobile chrome disagreed: primary navigation stayed and the
 * theme and settings controls scrolled away. `z-20` sits above the bottom nav's
 * `z-10` -- they never overlap, but a shared stacking order is one fewer thing
 * to work out later -- and below the dialog overlay, which must cover both.
 */
export function TopBar({
  settingsActive,
  settingsHref = '/settings',
}: {
  settingsActive: boolean
  /** null omits the control. The demo has no settings screen to reach. */
  settingsHref?: string | null
}) {
  return (
    <header
      data-top-bar
      className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border-subtle bg-bg-canvas px-3 md:hidden"
    >
      <BrandLockup />
      <div className="flex-1" />
      <ThemeToggle size={44} />
      {settingsHref && (
      <Link
        href={settingsHref}
        data-settings-link
        data-active={settingsActive ? '' : undefined}
        aria-label="Settings"
        aria-current={settingsActive ? 'page' : undefined}
        className={cn(
          'grid h-11 w-11 place-items-center rounded-md',
          settingsActive ? 'text-accent-default' : 'text-text-secondary hover:text-text-primary'
        )}
      >
        <SettingsIcon size={18} className={iconMotion('turn')} />
      </Link>
      )}
    </header>
  )
}
