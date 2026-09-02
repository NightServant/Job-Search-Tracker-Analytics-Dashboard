'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The vertical progress rail down the side of the landing page.
 *
 * It does three jobs at once, which is why it earns the space: it says how far
 * through the page you are, it says which section you are in, and it lets you
 * jump. A long scrolling page without one asks the reader to hold their own
 * position in their head.
 *
 * PURELY PRESENTATIONAL, AND THAT IS DELIBERATE. It takes `progress` and
 * `activeId` and computes neither. Right now `Landing` derives them from page
 * scroll via useSectionProgress; when 6.1a lands, the pinned sequence has its
 * own notion of progress -- the hero and the carousel each hold the viewport
 * while their internal progress runs 0..1, so page scrollY stops being a
 * truthful measure of "how far through the content" the reader is. Task 3 can
 * feed this component that value instead and nothing here changes. Owning the
 * measurement here would have made that a rewrite.
 *
 * It is also the same "the parent computes once, children consume" rule the
 * navbar's overHero follows, and for the same reason: two components deriving
 * their own idea of the active section is how they end up disagreeing.
 *
 * Hidden below lg. The rail lives in the margin beside a 1200px container, and
 * below lg there is no margin -- it would sit on top of the content. On a
 * phone the scrollbar is the progress indicator and the nav is the jump.
 *
 * `overHero` inverts it for the dark hero, exactly as the navbar does. Without
 * it the rail is a near-black line on near-black footage for the whole first
 * screen.
 */
export interface RailSection {
  id: string
  label: string
}

export interface SectionRailProps {
  sections: RailSection[]
  /** The section the reader is in. Null renders the rail with no active dot. */
  activeId: string | null
  /** 0..1 down the page. Drives the fill height. */
  progress: number
  /** True while the rail sits over the dark hero. */
  overHero?: boolean
}

export function SectionRail({
  sections,
  activeId,
  progress,
  overHero = false,
}: SectionRailProps) {
  if (sections.length === 0) return null

  return (
    <nav
      data-section-rail
      data-over-hero={overHero ? 'true' : 'false'}
      aria-label="Page sections"
      className="fixed right-8 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <ol className="relative flex flex-col gap-6">
        {/*
          The track sits behind the dots rather than between them, so the fill
          is one continuous line instead of segments that have to be kept in
          step with the dot spacing.
        */}
        <span
          aria-hidden
          className={cn(
            'absolute left-[3px] top-1 -z-10 w-px',
            'bottom-1',
            overHero ? 'bg-[rgba(250,250,250,0.28)]' : 'bg-border-subtle'
          )}
        />
        <span
          aria-hidden
          data-rail-fill
          // Height as a percentage of the track, so the fill is correct at any
          // number of sections without the component knowing the pixel height.
          style={{ height: `${Math.round(progress * 100)}%` }}
          className={cn(
            'absolute left-[3px] top-1 -z-10 w-px transition-[height] duration-150 ease-out',
            'motion-reduce:transition-none',
            overHero ? 'bg-[#fafafa]' : 'bg-accent-default'
          )}
        />

        {sections.map((section) => {
          const active = section.id === activeId
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                data-rail-item={section.id}
                data-active={active ? 'true' : undefined}
                aria-current={active ? 'true' : undefined}
                className="group flex items-center gap-3 outline-none"
              >
                <span
                  aria-hidden
                  className={cn(
                    'block h-[7px] w-[7px] shrink-0 rounded-full transition-colors',
                    'motion-reduce:transition-none',
                    active
                      ? overHero
                        ? 'bg-[#fafafa]'
                        : 'bg-accent-default'
                      : overHero
                        ? 'bg-[rgba(250,250,250,0.35)] group-hover:bg-[rgba(250,250,250,0.7)]'
                        : 'bg-border-default group-hover:bg-text-muted'
                  )}
                />
                {/*
                  The label is revealed on hover and focus rather than always
                  shown. Six permanent labels in the margin is a second
                  navigation competing with the one in the header; the dots are
                  the indicator, and the words are there when you go looking.
                  Opacity rather than conditional rendering, so the label is in
                  the accessibility tree and reachable by screen readers at all
                  times.
                */}
                <span
                  className={cn(
                    'whitespace-nowrap text-body-s opacity-0 transition-opacity',
                    'group-hover:opacity-100 group-focus-visible:opacity-100',
                    'motion-reduce:transition-none',
                    active && 'opacity-100',
                    overHero ? 'text-[#fafafa]' : 'text-text-secondary'
                  )}
                >
                  {section.label}
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
