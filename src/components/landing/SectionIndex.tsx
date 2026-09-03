'use client'

import { cn } from '@/lib/utils'
import type { RailSection } from './SectionRail'

/**
 * The left margin's counterweight: where you are, set vertically.
 *
 * The page has a fixed rail down the right and nothing down the left, which
 * reads as an unfinished margin rather than a deliberate one -- the content
 * column sits centred but the furniture is one-sided. This fills it with the
 * one thing worth putting there: a position read-out.
 *
 * WHY A COUNTER AND A NAME rather than links or social icons. The navbar
 * already carries every destination and the footer carries the rest, so a
 * third set of links would be a third navigation. What no element on the page
 * currently says is "you are on the fourth of six things" -- the rail implies
 * it through dot position, but never states it. A counter is information the
 * page does not otherwise have, which is the test for whether furniture earns
 * its space.
 *
 * `aria-hidden`, deliberately. It is a second presentation of the state the
 * rail already exposes with real links and `aria-current`; announcing both
 * would read the section list twice. The rail is the accessible version, this
 * is the visible one.
 *
 * Vertical type via `writing-mode: vertical-rl` plus a 180deg rotation, which
 * sets it bottom-to-top -- the editorial convention for a spine, and the
 * direction that keeps the text reading upward alongside a downward-filling
 * rail. Rotating a flex container rather than each glyph keeps the tabular
 * figures aligned.
 *
 * Hidden below lg for the same reason as the rail: below that there is no
 * margin to sit in, only content to sit on top of.
 */
export interface SectionIndexProps {
  sections: RailSection[]
  activeId: string | null
  /** True while it sits over the dark hero, matching the navbar and the rail. */
  overHero?: boolean
}

export function SectionIndex({ sections, activeId, overHero = false }: SectionIndexProps) {
  if (sections.length === 0) return null

  const index = sections.findIndex((s) => s.id === activeId)
  // Before the first measurement there is no active section. Showing the first
  // is truthful -- the reader is at the top -- and avoids a frame of "00".
  const position = index >= 0 ? index + 1 : 1
  const current = sections[index >= 0 ? index : 0]

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div
      data-section-index
      data-over-hero={overHero ? 'true' : 'false'}
      aria-hidden
      className={cn(
        'fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 select-none rounded-md px-3 py-4 lg:block',
        'transition-colors duration-150 motion-reduce:transition-none',
        // Its own plate over the hero, for the same reason the rail has one:
        // the footage behind it is video, and its brightness changes as the
        // clip plays.
        overHero && 'bg-[rgba(5,5,7,0.32)] backdrop-blur-sm'
      )}
    >
      <div className="flex flex-col items-center gap-4 [writing-mode:vertical-rl] rotate-180">
        <span
          data-section-index-label
          className={cn(
            'text-label-caps uppercase',
            overHero ? 'text-white/70' : 'text-text-muted'
          )}
        >
          {current.label}
        </span>

        <span
          aria-hidden
          className={cn('h-10 w-px', overHero ? 'bg-white/40' : 'bg-border-default')}
        />

        <span className="tabular text-data-s">
          <span
            data-section-index-position
            className={overHero ? 'text-white' : 'text-accent-default'}
          >
            {pad(position)}
          </span>
          <span className={overHero ? 'text-white/50' : 'text-text-muted'}>
            {' / '}
            {pad(sections.length)}
          </span>
        </span>
      </div>
    </div>
  )
}
