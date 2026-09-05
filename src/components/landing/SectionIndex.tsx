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
 * Hidden below 2xl (1440) for the same reason as the rail, and it must stay in
 * step with it: these two are a matched pair in opposite margins, so a
 * threshold that differs by one step leaves the page visibly lopsided at every
 * width between them. See SectionRail for the margin arithmetic.
 *
 * THE COUNTER DROPS BELOW 1560, the same width at which the rail opposite
 * stops showing words. Between 1440 and 1560 both margins are at their
 * narrowest, and of the two things here the counter is the one carrying least
 * per pixel: the rail is already showing position as six dots, so "04 / 06"
 * restates that in a form you have to count against a list you cannot see,
 * while the section name is the only place on the page that says outright
 * which section you are in. The separator goes with it -- a rule under a
 * heading with nothing after it points at empty margin.
 *
 * (This reverses the note that was briefly here saying the LABEL dropped and
 * the counter survived. It was written from the wrong half of the instruction;
 * Gabe's call is the counter.)
 *
 * `display: none` here, where the rail deliberately clips its labels instead.
 * The difference is that this whole component is `aria-hidden` (see above) --
 * the rail is the accessible presentation of the same state -- so removing
 * anything here costs a screen reader nothing, and `hidden` is what makes the
 * flex gap collapse along with it. A clipped element still takes its gap; a
 * removed one does not participate in the layout at all, which is what leaves
 * the name centred rather than sitting against 32px of nothing.
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
        'fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 select-none rounded-md px-3 py-4 2xl:block',
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

        {/* The rule goes with the counter, not with the label: it exists to
            separate the two, and a separator under a heading with nothing
            after it is a line pointing at empty margin. */}
        <span
          aria-hidden
          data-section-index-rule
          className={cn(
            'hidden h-10 w-px min-[1560px]:block',
            overHero ? 'bg-white/40' : 'bg-border-default'
          )}
        />

        {/* The counter is what drops on a smaller laptop (Gabe, 2026-09-05).
            It is the piece with the least to say per pixel it occupies: the
            section name tells you where you are in words, while "04 / 06" says
            the same thing again in a form you have to count against a list you
            cannot see -- and the rail opposite is already showing position as
            six dots. The name survives because it is the one thing on this
            page that states the current section outright. */}
        <span className="hidden tabular text-data-s min-[1560px]:block">
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
