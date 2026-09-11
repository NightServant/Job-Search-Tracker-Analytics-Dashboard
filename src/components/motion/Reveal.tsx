'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Moves children in the first time they scroll into view.
 *
 * FOUR ENTRANCES, NOT ONE FADE (Gabe, 2026-09-11: "apply other animations and
 * transitions instead of fade-in specifically homepage"). Every section of the
 * landing page used the same 8px rise, so a page built out of six distinct
 * arguments animated as one undifferentiated drift. The variants below give a
 * section header, a row of cards and a media panel each their own entrance,
 * which is what makes a long page read as composed rather than as a list that
 * happens to be long.
 *
 * SPRINGS, NOT EASING CURVES. `easeOut` at 240ms is the motion of something
 * being placed; a spring settles, which is the difference between an interface
 * that moves and one that feels physical. Damping is high enough that nothing
 * visibly overshoots -- this is a landing page, not a toy.
 *
 * Under reduced motion the children render immediately with no transition --
 * not a faster one, none. A 60ms fade is still a fade, and the setting is a
 * request to stop moving things, not to move them briskly.
 *
 * Two escape hatches, both for the same reason: a missing animation is a
 * cosmetic loss, invisible content is a broken page.
 *
 * IntersectionObserver may be absent (jsdom, older Safari). And a hidden
 * document -- a background tab, a prerender, a headless pane -- delivers no
 * intersection records at all, so waiting for one there means holding the
 * content at opacity 0 for as long as the tab stays unfocused. In both cases
 * the children are simply shown; there is nobody watching an entrance anyway.
 */
/**
 * The entrances, as motion states.
 *
 * TRANSFORMS AND OPACITY ONLY. Both are compositor properties, so a dozen of
 * these running at once on a scroll costs no layout passes -- the same rule
 * `index.css` holds every other motion in this app to.
 */
const VARIANTS = {
  /** The default. Straight up, for anything that reads as a block. */
  rise: { opacity: 0, y: 24, x: 0, scale: 1 },
  /** In from the leading edge, for section headers and prose columns. */
  slideLeft: { opacity: 0, y: 0, x: -28, scale: 1 },
  /** In from the trailing edge, for the panel beside them. */
  slideRight: { opacity: 0, y: 0, x: 28, scale: 1 },
  /** Settles into place, for cards in a grid. */
  zoom: { opacity: 0, y: 12, x: 0, scale: 0.96 },
} as const

export type RevealVariant = keyof typeof VARIANTS

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which entrance. Defaults to `rise`. */
  variant?: RevealVariant
  /**
   * Stagger, in SECONDS -- it is handed straight to motion's
   * `transition.delay`, which is a seconds API.
   *
   * Stated because it has already been got wrong once: a caller staggering a
   * four-card row passed `i * 60` meaning milliseconds, which is one to three
   * MINUTES, and three of the four cards sat at opacity 0 looking like a
   * rendering bug rather than a slow animation.
   */
  delay?: number
}

export function Reveal({
  delay = 0,
  variant = 'rise',
  className,
  children,
  ...props
}: RevealProps) {
  const reduced = usePrefersReducedMotion()
  const ref = React.useRef<HTMLDivElement>(null)
  const [shown, setShown] = React.useState(false)

  /**
   * Whether the entrance cannot run, so the motion wrapper is skipped entirely.
   *
   * Setting `shown` alone is not enough: motion animates opacity on
   * requestAnimationFrame, and a hidden document -- a background tab, a
   * prerender, a headless capture -- has rAF paused, so an element started at
   * opacity 0 never advances however the flag is set. That shipped once and
   * rendered whole landing sections blank.
   *
   * IT IS STATE SET FROM AN EFFECT, NOT A VALUE COMPUTED DURING RENDER, and
   * that distinction is the whole fix for a hydration error. `document` does
   * not exist on the server, so a render-time `document.visibilityState` check
   * makes the server emit a motion.div while the client emits a plain div --
   * two different trees for the same node, which is exactly the mismatch React
   * reported at this component. Reading it in an effect keeps the first client
   * render identical to the server's and moves the swap into a second,
   * post-hydration render, which React is happy with.
   *
   * `reduced` is safe to read during render: usePrefersReducedMotion is
   * useSyncExternalStore, which has a server snapshot and a hydration-safe
   * contract of its own.
   */
  const [cannotAnimate, setCannotAnimate] = React.useState(false)
  const noAnimation = reduced || cannotAnimate

  React.useEffect(() => {
    if (reduced) return setShown(true)

    const blocked =
      typeof IntersectionObserver === 'undefined' || document.visibilityState === 'hidden'
    if (blocked) {
      setCannotAnimate(true)
      setShown(true)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        // First intersection only. Re-animating on every scroll past turns a
        // long page into a flicker gallery.
        observer.disconnect()
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [reduced])

  if (noAnimation) {
    return (
      <div
        ref={ref}
        data-reveal
        data-reduced={reduced ? '' : undefined}
        className={className}
        {...props}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      data-reveal
      className={className}
      data-reveal-variant={variant}
      initial={VARIANTS[variant]}
      animate={shown ? { opacity: 1, y: 0, x: 0, scale: 1 } : VARIANTS[variant]}
      transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.9, delay }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}
