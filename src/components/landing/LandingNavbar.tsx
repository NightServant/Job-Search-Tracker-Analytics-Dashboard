'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BrandLockup } from '@/components/ui/brand-mark'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { buttonVariants } from '@/components/ui/button'
import { NAV_ACTIONS, NAV_LINKS } from './content'

/**
 * The landing page's navigation header.
 *
 * IT LIVES IN THE HERO AND CHANGES COLOUR AT SOCIAL PROOF. Gabe settled that
 * on 2026-09-02, and it overturns Figma frame 39:355, which is annotated
 * "hidden over the hero, slides down after the carousel". That was drawn when
 * the carousel was section 2; under the six-section order it is section 4, so
 * obeying the annotation would leave a stranger scrolling through three
 * sections with no navigation at all.
 *
 * Why two treatments rather than one bar: the hero is DARK IN BOTH THEMES -- a
 * background video under a scrim from rgba(5,5,7,0.92) to rgba(5,5,7,0.3),
 * with an eyebrow in accent-400 rather than accent-700 because accent-700 on
 * near-black fails contrast. Social proof is an ordinary bg-canvas surface. A
 * bar that blends into the first is illegible on the second. The swap is not
 * decoration; it is what lets one bar sit on two grounds.
 *
 * POSITIONED `fixed`, AND RENDERED FROM Landing's ROOT rather than from inside
 * the hero's JSX. This is the one place the implementation cannot follow
 * "included in the hero section" literally, and the reason is mechanical: Hero
 * and ScreenCarousel are wrapped in motion.divs that animate translateY, and a
 * transformed ancestor becomes the containing block for `position: fixed`
 * descendants -- so a bar nested in the hero would silently degrade to
 * `absolute`, scroll away with the hero, and never reach social proof. It is
 * visually part of the hero, which is what the decision is about; it is a DOM
 * sibling, which is what makes it work.
 *
 * `overHero` is a prop and nothing here computes it. Landing owns it via
 * navOverHero() so that one component cannot decide it is over the hero while
 * another decides it is not -- M5's sidebar and bottom nav each deriving their
 * own active route and disagreeing cost a fix round, and the ruling was that
 * the parent computes once and both consume.
 *
 * No theme toggle below md. Read from Figma 64:1020: at 375 the bar is 60px
 * and holds the lockup, sign in and sign up -- no links, no demo button, no
 * toggle. On mobile the theme control lives in the footer only, which still
 * satisfies 6.1's "navbar AND footer" because the desktop bar carries both.
 * This is a design decision, not an omission; do not "fix" it.
 */
export interface LandingNavbarProps {
  /** True while the hero still covers the band the bar occupies. */
  overHero: boolean
}

export function LandingNavbar({ overHero }: LandingNavbarProps) {
  return (
    <header
      data-landing-nav
      data-over-hero={overHero ? 'true' : 'false'}
      className={cn(
        'fixed inset-x-0 top-0 z-50 flex h-[60px] items-center gap-6 px-5',
        'md:h-20 md:gap-8 md:px-16',
        // Colour only, and only these three properties. A bar that resizes or
        // slides on scroll is the pattern this design system's restraint rules
        // out, and it would fight the pinned hero underneath it.
        'transition-[background-color,border-color,color] duration-150',
        'motion-reduce:transition-none',
        // No `border-b-0` on the blended branch: no border is already the
        // default, and the redundant class would make a "has no bottom border"
        // assertion pass on the substring while meaning nothing.
        overHero
          ? 'bg-transparent text-[#fafafa]'
          : 'border-b border-border-subtle bg-bg-canvas text-text-primary'
      )}
    >
      {overHero && (
        // The contrast fix Figma never needed, because its bar is opaque
        // white. Ours sits on video and the controls are on the right, where
        // the hero's own scrim has decayed to 0.3 alpha.
        <div
          data-nav-scrim
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[120%] bg-gradient-to-b from-[rgba(5,5,7,0.55)] to-transparent"
        />
      )}

      <Link href="/" aria-label="Worktrack home" className="shrink-0">
        {/*
          Over the hero the lockup renders its DARK-MODE colours whatever the
          page theme is, because the hero is dark in both. Two halves to that:

          `text-[#fafafa]` carries the wordmark and BrandMark's three static
          cells, which are `currentColor`.

          The accent cell is `fill="var(--color-accent-default)"`, which
          resolves to accent-700 (#c2410c) in the light theme -- too dark
          against near-black, and the same contrast problem that made the hero
          eyebrow accent-400 rather than accent-default in the frame. So the
          token itself is redefined for this subtree rather than the component
          being forked or given a variant prop, which is what BrandMark's own
          docblock asks callers to do.

          `[&>svg]:text-[#fafafa]` is NOT redundant with the container's
          `text-[#fafafa]`, and leaving it out is a bug that only shows in the
          light theme. BrandMark sets `text-text-primary` on its OWN <svg>, so
          the inherited colour never reaches the three currentColor cells --
          the svg re-declares it. In dark mode text-text-primary is near-white
          and the mark looks correct by accident; in light mode it is
          near-black and the cells vanish into the hero. The descendant
          selector out-specifies the svg's own class, which is what actually
          repaints them.
        */}
        <BrandLockup
          className={cn(
            overHero &&
              'text-[#fafafa] [&>svg]:text-[#fafafa] [--color-accent-default:var(--color-accent-400)]'
          )}
        />
      </Link>

      <div className="flex-1" />

      <nav
        data-nav-links
        aria-label="Landing sections"
        className="hidden items-center gap-8 md:flex"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            {...(link.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            className={cn(
              'text-body-s transition-colors',
              overHero
                ? 'text-[rgba(250,250,250,0.82)] hover:text-[#fafafa]'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <Link
        href={NAV_ACTIONS.signIn.href}
        className={cn(
          'text-body-s transition-colors',
          overHero
            ? 'text-[rgba(250,250,250,0.82)] hover:text-[#fafafa]'
            : 'text-text-secondary hover:text-text-primary'
        )}
      >
        {NAV_ACTIONS.signIn.label}
      </Link>

      {/*
        Identical in both treatments, deliberately. It is a filled accent
        button, it clears contrast on either ground, and a call to action that
        restyles itself mid-scroll reads as a different button.
      */}
      <Link
        href={NAV_ACTIONS.signUp.href}
        data-nav-signup
        data-variant="primary"
        className={buttonVariants({ variant: 'primary', size: 's' })}
      >
        {NAV_ACTIONS.signUp.label}
      </Link>

      <div data-nav-toggle className="hidden md:block">
        <ThemeToggle size={32} className={cn(overHero && 'text-[#fafafa]')} />
      </div>
    </header>
  )
}
