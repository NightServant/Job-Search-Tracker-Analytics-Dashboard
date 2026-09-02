'use client'

import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { BrandLockup } from '@/components/ui/brand-mark'
import { SKIPER_ATTRIBUTION } from '@/lib/attribution'
import { FOOTER } from './content'

/**
 * The landing footer.
 *
 * IT RENDERS SKIPER_ATTRIBUTION'S `credit` STRINGS DIRECTLY. Those are the
 * same sentences src/lib/__tests__/attribution.test.ts asserts verbatim
 * against README.md, so the page and the README cannot drift: editing one
 * without the other is a red test. Skiper UI's free tier requires attribution
 * and the registry copies source in-tree, so the obligation is on what ships,
 * and this page ships.
 *
 * The theme toggle here is not a duplicate of the navbar's. Below md the
 * navbar has no toggle at all (Figma 64:1020 draws none), so on a phone this
 * is the only theme control on the page.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle px-5 py-12 md:px-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <BrandLockup />
          <p className="text-body-s text-text-secondary">{FOOTER.tagline}</p>
        </div>

        <div className="flex items-center gap-6">
          <nav aria-label="Footer" className="flex items-center gap-6">
            {FOOTER.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                {...(link.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                className="text-body-s text-text-secondary hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle size={32} />
        </div>
      </div>

      <Separator className="my-8" />

      <div className="flex flex-col gap-2">
        {SKIPER_ATTRIBUTION.map((entry) => (
          <p key={entry.id} className="text-caption text-text-muted">
            {entry.credit}
          </p>
        ))}
        <p className="text-caption text-text-muted">{FOOTER.lineage}</p>
      </div>
    </footer>
  )
}
