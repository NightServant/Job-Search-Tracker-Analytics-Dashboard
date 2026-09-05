'use client'

import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
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
 * NO THEME TOGGLE. Removed by Gabe on 2026-09-02.
 *
 * The theme control now lives only in the navbar, which is why that bar shows
 * its toggle at EVERY width rather than hiding it below md as Figma 64:1020
 * draws. Removing both would have left a phone visitor no way to change the
 * theme anywhere on the page; the two decisions only work as a pair.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle px-gutter py-12 md:px-16">
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

        {/*
          COMPUTED, NEVER TYPED. A hard-coded year is wrong from the first of
          January and stays wrong until somebody notices, which on a portfolio
          site is the single most common way a page announces that nobody has
          looked at it in a while.

          `new Date()` in a server component is evaluated at BUILD time for a
          static route, not per request -- so this says the year the site was
          last deployed. That is the honest reading of a copyright line anyway,
          and a redeploy is what a live project has regularly.
        */}
        <p className="text-caption text-text-muted">
          © {new Date().getFullYear()} Worktrack
        </p>
      </div>
    </footer>
  )
}
