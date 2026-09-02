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
   * Render the children plainly, with no motion wrapper at all.
   *
   * Setting `shown` is NOT enough on its own, which is what an earlier version
   * of this component got wrong. motion animates opacity on requestAnimationFrame,
   * and a hidden document -- a background tab, a prerender, a headless capture --
   * has rAF paused, so the element stays at its `initial` opacity of 0 no
   * matter what `shown` says. The escape hatch flipped the flag and the
   * content stayed invisible anyway.
   *
   * So in every case where the entrance cannot be watched or should not run,
   * this skips the animation entirely rather than starting one that may never
   * advance. A missing animation is a cosmetic loss; invisible content is a
   * broken page, and this is a landing page.
   */
  const noAnimation =
    reduced ||
    typeof IntersectionObserver === 'undefined' ||
    (typeof document !== 'undefined' && document.visibilityState === 'hidden')

  React.useEffect(() => {
    if (noAnimation) return setShown(true)

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
  }, [noAnimation])

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
