'use client'

import * as React from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { landingNavHeightPx, navOverHero } from '@/lib/landingNav'
import { LandingNavbar } from './LandingNavbar'
import { SectionRail } from './SectionRail'
import { useSectionProgress } from './useSectionProgress'
import { RAIL_SECTIONS } from './content'
import { Hero } from './Hero'
import { SocialProof } from './SocialProof'
import { ProblemStatement } from './ProblemStatement'
import { SolutionValue } from './SolutionValue'
import { ScreenCarousel } from './ScreenCarousel'
import { LandingFaq } from './LandingFaq'
import { ClosingCta } from './ClosingCta'
import { SiteFooter } from './SiteFooter'
import type { LandingScreen } from './screens'

/**
 * The public landing page: six sections in the order Gabe settled on
 * 2026-09-02 -- hero, social proof, problem, solution, FAQ, closing CTA.
 *
 * The argument the order makes is the one a stranger actually needs: here is
 * the problem you have, here is what it costs you, here is the thing that
 * fixes it, here is proof you can check, here is how to try it without
 * committing.
 *
 * BUILT IN NORMAL FLOW. Task 3 (6.1a) layers pinning on top by wrapping Hero
 * and ScreenCarousel in a PinnedBlock each, four sections apart. This task
 * ships the unpinned page first deliberately: the reduced-motion and mobile
 * path is the one that rots because nobody with a desktop and motion enabled
 * ever sees it, so it exists and is tested before the pinned path is layered
 * over it. `pinned`, `carouselProgress` and `heroUnpinned` are the seam Task 3
 * drives; their defaults here are the in-flow behaviour.
 *
 * THIS COMPONENT OWNS THE NAVBAR STATE, and it is the only thing that does.
 * LandingNavbar takes a boolean and reads nothing -- one component deciding it
 * is over the hero while another decides it is not is M5's sidebar-and-bottom-
 * nav defect, which cost a fix round and was ruled on: the parent computes
 * once and both consume.
 */
export interface LandingProps {
  screens: LandingScreen[]
  heroPosterSrc: string
  /** Empty ships the poster; a path ships a <video>. */
  heroVideoSrc?: string
  /** Task 3 drives these. In normal flow they are the defaults below. */
  pinned?: boolean
  carouselProgress?: number
  heroUnpinned?: boolean
}

export function Landing({
  screens,
  heroPosterSrc,
  heroVideoSrc,
  pinned = false,
  heroUnpinned = false,
}: LandingProps) {
  const reduced = usePrefersReducedMotion()
  const heroRef = React.useRef<HTMLDivElement>(null)
  const [overHero, setOverHero] = React.useState(false)

  // Measured, not computed from a pin height: the hero is pinned on desktop
  // and in normal flow on mobile and under reduced motion, so a computed
  // bottom edge would have to know which and would be wrong in two of three
  // cases. Starts false, so the first paint is the themed treatment rather
  // than light-on-light text on a themed page.
  React.useEffect(() => {
    const read = () => {
      const el = heroRef.current
      if (!el) return
      const heroBottom = el.getBoundingClientRect().bottom + window.scrollY
      setOverHero(
        navOverHero(window.scrollY, heroBottom, landingNavHeightPx(window.innerWidth))
      )
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [])

  // Computed once here and handed down, the same rule overHero follows. Two
  // components deriving their own idea of the active section is how they end
  // up disagreeing about it.
  const rail = useSectionProgress(RAIL_SECTIONS.map((s) => s.id))

  return (
    <>
      <LandingNavbar overHero={overHero} />
      {/*
        6.1a: when the pinned sequence lands, `progress` should come from it
        rather than from page scroll -- a thousand pixels of scroll inside a
        pinned hero advances the reader through the CONTENT not at all, so
        scrollY stops being a truthful measure. SectionRail takes props and
        computes nothing, so that is a one-line change here.
      */}
      <SectionRail
        sections={[...RAIL_SECTIONS]}
        activeId={rail.activeId}
        progress={rail.progress}
        overHero={overHero}
      />

      <main>
        <div ref={heroRef}>
          <Hero
            posterSrc={heroPosterSrc}
            videoSrc={heroVideoSrc}
            unpinned={heroUnpinned}
          />
        </div>

        <SocialProof />
        <ProblemStatement />

        <SolutionValue>
          {/*
            scrollDriven is `pinned`, passed straight down. ScreenCarousel must
            not call usePrefersReducedMotion or read a width itself; three
            conditions turn driving off and they collapse to one question.
            `reduced` is read here only so the in-flow page never claims to be
            scroll-driven before Task 3 wires the real pin.
          */}
          <ScreenCarousel screens={screens} scrollDriven={pinned && !reduced} />
        </SolutionValue>

        <LandingFaq />
        <ClosingCta />
      </main>

      <SiteFooter />
    </>
  )
}
