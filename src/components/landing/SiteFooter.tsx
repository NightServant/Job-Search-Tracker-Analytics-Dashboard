'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { BrandLockup } from '@/components/ui/brand-mark'
import { SKIPER_ATTRIBUTION } from '@/lib/attribution'
import { LANDING_RHYTHM } from './rhythm'
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
 * IT SITS ON THE PAGE'S GRID NOW, AND IT DID NOT BEFORE. Measured in the
 * browser at 1440 on 2026-09-14: every section heading on this page starts at
 * x=115 -- `px-gutter` plus a centred 1200px container -- and the footer's
 * brand lockup started at x=64, because this element carried `px-gutter
 * md:px-16` and no container at all. So the last block on the page was the one
 * block that lined up with nothing above it, by 51px, which is far enough to
 * read as a mistake and close enough that it reads as a sloppy one.
 *
 * Section.tsx's docblock already makes the argument -- one vertical line
 * through every heading, card edge and accordion row is "the single thing that
 * most separates a page that was designed from a page that was assembled" -- it
 * just never reached down here. The same `px-gutter` + `max-w-wide` pair is
 * copied rather than imported because Section is a `<section>` with a `tone`
 * and an `id` and a scroll margin, none of which a footer wants.
 *
 * THE NAVBAR IS DOING THIS TOO SINCE 2026-09-15, which reverses what stood
 * here. The rule used to be "page CONTENT aligns to the column, and fixed
 * chrome that frames the viewport spans it", with the navbar named as frame.
 * Gabe overruled it -- "top navigation bar must have the same width with the
 * footer" -- and the reason the old rule was wrong about that one element is
 * that the bar carries a wordmark, which the eye lines up against the wordmark
 * down here whatever the element is positioned as. SectionRail, SectionIndex
 * and StickyMobileCta are still frame and still span; none of them carries
 * anything that has a counterpart in the content column.
 *
 * THE COLUMN IS 1440 NOW, not 1200 (same day, same instruction: "expand the
 * width of all sections in the homepage"). `max-w-wide` is the app's own
 * `--container-wide` token, so this footer, every section and the signed-in
 * shell's grid screens are all one number rather than three that agree.
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
    <footer className={cn('border-t border-border-subtle px-gutter', LANDING_RHYTHM.band)}>
      <div className="mx-auto w-full max-w-wide">
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
            last deployed. That is the honest reading of a copyright line
            anyway, and a redeploy is what a live project has regularly.
          */}
          <p className="text-caption text-text-muted">
            © {new Date().getFullYear()} Worktrack
          </p>
        </div>
      </div>
    </footer>
  )
}
