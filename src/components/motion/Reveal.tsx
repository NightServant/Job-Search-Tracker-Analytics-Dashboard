'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Fades children in the first time they scroll into view.
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
export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
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

export function Reveal({ delay = 0, className, children, ...props }: RevealProps) {
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
      initial={{ opacity: 0, y: 8 }}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.24, delay, ease: 'easeOut' }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}
