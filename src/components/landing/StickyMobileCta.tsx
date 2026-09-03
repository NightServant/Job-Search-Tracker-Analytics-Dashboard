'use client'

import * as React from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { ArrowRightIcon } from '@/components/icons'
import { CLOSING_CTA } from './content'

/**
 * The call to action, kept within thumb reach on a phone.
 *
 * WHY ONLY ON MOBILE. On a desktop the hero CTA and the closing CTA are both
 * a short scroll away and the page is one column of argument; a bar pinned
 * over it would be covering content to offer something already offered. On a
 * phone the same page is roughly six screens tall, so the two real calls to
 * action are minutes of scrolling apart and the middle of the page has none.
 *
 * IT DOES NOT APPEAR UNTIL THE HERO IS GONE. Showing it immediately would put
 * a second, competing button on top of the hero's own -- the one moment the
 * page already has a call to action in view. It appears once the hero has
 * scrolled past, which is exactly when the page stops having one.
 *
 * It hides again over the closing section for the same reason: that section IS
 * this button, at full size and with the sentence that explains it, so a
 * floating copy would be asking twice.
 *
 * `open the demo` and not `create an account`, matching the closing section's
 * primary. The demo needs nothing from the visitor, and a persistent bar
 * asking a stranger to sign up is the pattern this page's whole restraint
 * argues against.
 */
export function StickyMobileCta() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const hero = document.querySelector('[data-landing-section="hero"]')
    const closing = document.querySelector('[data-landing-section="cta"]')
    if (!hero || !closing) return

    // Two observers rather than a scroll listener: the browser reports the
    // crossings itself, so nothing runs on every frame of a scroll on the
    // device least able to afford it.
    let heroGone = false
    let closingHere = false
    const apply = () => setVisible(heroGone && !closingHere)

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        heroGone = !entry.isIntersecting
        apply()
      },
      { threshold: 0 }
    )
    const closingObserver = new IntersectionObserver(
      ([entry]) => {
        closingHere = entry.isIntersecting
        apply()
      },
      { threshold: 0 }
    )
    heroObserver.observe(hero)
    closingObserver.observe(closing)
    return () => {
      heroObserver.disconnect()
      closingObserver.disconnect()
    }
  }, [])

  return (
    <div
      data-sticky-cta
      data-visible={visible ? 'true' : 'false'}
      // `aria-hidden` and `pointer-events-none` while hidden, not just
      // translated off-screen: a button that is invisible but still tabbable
      // is a focus stop in the middle of the page that nobody can see.
      aria-hidden={!visible}
      className={[
        'fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-bg-canvas px-5 py-3 md:hidden',
        'transition-transform duration-200 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      ].join(' ')}
    >
      <Link
        href={CLOSING_CTA.primary.href}
        data-variant="primary"
        tabIndex={visible ? undefined : -1}
        className={`${buttonVariants({ variant: 'primary', size: 'm' })} w-full`}
      >
        {CLOSING_CTA.primary.label}
        <ArrowRightIcon size={16} aria-hidden />
      </Link>
    </div>
  )
}
