'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion/Reveal'
import { LANDING_TYPE } from './typography'

/**
 * The landing page's layout grid, in one place.
 *
 * Before this existed every section set its own padding and its own width --
 * the cards ran to `px-16` while the FAQ was capped at `max-w-3xl` -- so
 * nothing lined up with anything and the FAQ read as a narrow column stranded
 * beside full-bleed content. One container fixes that: every heading, card
 * edge and accordion row now starts on the same vertical line, which is the
 * single thing that most separates a page that was designed from a page that
 * was assembled.
 *
 * 1200px because the content is text and cards, not a dashboard. Past roughly
 * 1200 a four-card row starts to look like four islands, and body copy runs
 * past a comfortable measure.
 *
 * `tone` alternates the ground rather than drawing boxes around sections. The
 * design system separates with hairlines and surface changes, never with
 * borders and shadows, and a full-bleed surface change is what gives a long
 * page rhythm without adding chrome.
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Becomes `data-landing-section`, which the tests assert order against. */
  name: string
  id?: string
  tone?: 'canvas' | 'surface'
  children: React.ReactNode
}

export function Section({
  name,
  id,
  tone = 'canvas',
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      id={id}
      data-landing-section={name}
      className={cn(
        'w-full px-5 py-20 md:px-8 md:py-28',
        tone === 'surface' ? 'bg-bg-surface' : 'bg-bg-canvas',
        className
      )}
      {...props}
    >
      <div className="mx-auto w-full max-w-[1200px]">{children}</div>
    </section>
  )
}

/**
 * A section's heading, with its animated glyph.
 *
 * The icon sits AFTER the heading rather than before it. Leading icons turn a
 * heading into a list item and pull the eye off the first word, which is the
 * one doing the work; a trailing glyph reads as punctuation and leaves the
 * type to start the line. It is `aria-hidden` for the same reason -- it
 * decorates a heading that already says what the section is, and announcing it
 * would make a screen reader read the section name twice.
 *
 * These are the AnimateIcons components, which animate on hover. The whole
 * heading row is the hover target rather than the glyph itself, because a
 * micro-interaction nobody can find is not an interaction.
 *
 * Every size here comes from LANDING_TYPE. Nothing in this file picks a type
 * class directly -- see that file for why the roles are named rather than the
 * sizes chosen per section.
 */
export interface SectionHeadingProps {
  eyebrow?: string
  title: string
  lede?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}

export function SectionHeading({ eyebrow, title, lede, icon: Icon }: SectionHeadingProps) {
  return (
    <Reveal className="mb-12 flex flex-col gap-3">
      {eyebrow && (
        <p className={LANDING_TYPE.eyebrow}>{eyebrow}</p>
      )}
      <div className="group flex items-center gap-3">
        <h2 className={LANDING_TYPE.sectionTitle}>{title}</h2>
        {Icon && (
          <span aria-hidden className="text-text-muted transition-colors group-hover:text-accent-default">
            <Icon size={26} />
          </span>
        )}
      </div>
      {lede && <p className={cn('max-w-2xl', LANDING_TYPE.sectionLede)}>{lede}</p>}
    </Reveal>
  )
}
