'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
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
  delay?: number
}

export function Reveal({ delay = 0, className, children, ...props }: RevealProps) {
  const reduced = usePrefersReducedMotion()
  const ref = React.useRef<HTMLDivElement>(null)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    if (reduced) return setShown(true)
    if (typeof IntersectionObserver === 'undefined') return setShown(true)
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return setShown(true)
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

  if (reduced) {
    return (
      <div ref={ref} data-reveal data-reduced className={className} {...props}>
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
