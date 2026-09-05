'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { scrollToSection } from '@/lib/scrollToSection'
import { BrandLockup } from '@/components/ui/brand-mark'
import { CloseIcon, MenuIcon } from '@/components/icons'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NAV_LINKS } from './content'

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
 * NO AUTH CONTROLS. Gabe removed `sign in` and `sign up` from the bar on
 * 2026-09-02, after the demo button went the same way. What is left is
 * identity (the lockup), orientation (three links) and one preference (the
 * theme toggle) -- the bar orients, it does not ask.
 *
 * Auth is still reachable: the closing CTA carries `create an account` AND
 * `sign in`, the latter having moved out of the footer on 2026-09-03. Both are
 * further down the page than a persistent bar, which is the trade being made
 * deliberately -- a landing page that asks for a decision in its top-right
 * corner asks before it has argued anything.
 *
 * Below md the links hide but the THEME TOGGLE DOES NOT. Figma 64:1020 draws
 * no toggle in the 375px bar, and that omission was only survivable while the
 * footer carried one; the footer's was removed on 2026-09-02, so following the
 * frame would leave a phone visitor unable to change the theme anywhere on the
 * page. The frame loses to the working product here.
 */
export interface LandingNavbarProps {
  /** True while the hero still covers the band the bar occupies. */
  overHero: boolean
}

export function LandingNavbar({ overHero }: LandingNavbarProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [menuOpen, setMenuOpen] = React.useState(false)

  // Close on Escape. A panel that covers the page and can only be dismissed by
  // finding its button again is a trap on a phone, where the button is small
  // and the panel is everything.
  React.useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    // The panel covers the page, so the page behind it must not scroll under
    // it -- otherwise dismissing the menu returns you somewhere else.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  /** Shared by both the desktop row and the mobile panel. */
  const linkHandler = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    const id = href.replace(/^#/, '')
    if (scrollToSection(id, { reducedMotion: prefersReducedMotion })) {
      event.preventDefault()
      setMenuOpen(false)
    }
  }

  return (
    <header
      data-landing-nav
      data-over-hero={overHero ? 'true' : 'false'}
      className={cn(
        'fixed inset-x-0 top-0 z-50 flex h-[60px] items-center gap-6 px-gutter',
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
            {...(link.external ? {} : { onClick: linkHandler(link.href) })}
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

      {/*
        Shown at EVERY width, including mobile. Figma 64:1020 draws no toggle
        in the 375px bar, and this deliberately departs from it: the footer's
        toggle was removed on 2026-09-02, and the frame's omission was only
        survivable while the footer carried one. Following it now would leave a
        phone visitor with no way to change the theme anywhere on the page.
      */}
      <div data-nav-toggle>
        <ThemeToggle size={32} className={cn(overHero && 'text-[#fafafa]')} />
      </div>

      {/*
        THE MOBILE MENU. Below md the three links were simply hidden, which
        left a phone visitor with no route to the FAQ or the repository from
        the top of the page -- the nav did not degrade, it disappeared.

        A disclosure rather than a Sheet or a Drawer: this is three links and
        the shadcn overlays bring a focus trap, a portal and an animation
        library for a panel that needs none of them. The trade is that the
        focus trap has to be replaced by something, which is why Escape closes
        it, the page beneath it stops scrolling, and the button owns
        aria-expanded and aria-controls.
      */}
      <button
        type="button"
        data-nav-menu-toggle
        aria-expanded={menuOpen}
        aria-controls="landing-mobile-nav"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen((v) => !v)}
        className={cn(
          'grid h-10 w-10 place-items-center rounded-md md:hidden',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
          overHero ? 'text-[#fafafa]' : 'text-text-primary'
        )}
      >
        {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
      </button>

      {menuOpen && (
        <div
          id="landing-mobile-nav"
          data-nav-mobile-panel
          className={cn(
            'fixed inset-x-0 top-[60px] z-40 flex flex-col gap-1 border-b border-border-subtle',
            'bg-bg-canvas px-gutter pb-6 pt-2 md:hidden'
          )}
        >
          {/*
            Opaque `bg-bg-canvas` even when the bar above it is transparent
            over the hero. A translucent panel over video is the case where
            these links stop being readable, and this panel exists because
            they were unreachable -- swapping unreachable for illegible is not
            a fix.
          */}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              {...(link.external
                ? { target: '_blank', rel: 'noreferrer noopener' }
                : { onClick: linkHandler(link.href) })}
              onClickCapture={() => link.external && setMenuOpen(false)}
              className="rounded-md px-2 py-3 text-body-l text-text-primary hover:bg-bg-inset"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
