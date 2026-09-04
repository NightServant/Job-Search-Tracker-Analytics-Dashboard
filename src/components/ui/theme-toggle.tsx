'use client'

import * as React from 'react'
import { flushSync } from 'react-dom'
import { motion } from 'motion/react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { SunIcon, MoonIcon } from '@/components/icons'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * The theme control. One button, two icons, one of them visible.
 *
 * Written against skiper4's technique rather than installed from it. Every one
 * of its five variants holds the theme in a local `useState` that no provider
 * ever sees, hardcodes `bg-black`/`bg-white` instead of tokens, and carries its
 * own sun/moon geometry as a `clipPath` with a fixed DOM id -- which collides
 * the moment two toggles render, and which the custom-icon constraint forbids
 * anyway. Swapping its icons for ours deletes the part being kept, so what
 * survives is the idea: crossfade plus counter-rotation, driven by motion (formerly framer-motion).
 *
 * Size is 32 on desktop chrome and 44 on mobile. That gap is deliberate -- a
 * finger needs the 44px target, a cursor does not, and matching them would make
 * the desktop sidebar look padded.
 */
export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 32 | 44
}

const SPIN = { type: 'spring', stiffness: 220, damping: 22 } as const

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> }
}

export function ThemeToggle({ size = 32, className, onClick, ...props }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const reduced = usePrefersReducedMotion()
  const ref = React.useRef<HTMLButtonElement>(null)

  // The server has no way to know the stored theme, so the first client render
  // must match the server's. Reading `resolvedTheme` before mount renders the
  // wrong icon and then swaps it -- a visible flicker on every page load.
  React.useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  /**
   * The wipe is decoration; the theme change is the feature.
   *
   * Written against next-themes rather than installing skiper26, which pulls
   * in the icon package this codebase forbids and mounts a second theme
   * provider beside the one M3 already has. Three paths, and the two that
   * skip the animation are the ones that matter: reduced motion, and any
   * browser without View Transitions -- Safari and Firefox both shipped late.
   * In both the theme still flips, instantly.
   */
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (e.defaultPrevented) return

    const next = isDark ? 'light' : 'dark'
    const doc = typeof document === 'undefined' ? null : (document as ViewTransitionDocument)

    if (reduced || !doc?.startViewTransition) {
      setTheme(next)
      return
    }

    // The wipe grows from the button, so it needs the button's centre. Set as
    // custom properties because a pseudo-element cannot be styled inline.
    const box = ref.current?.getBoundingClientRect()
    if (box) {
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )
      doc.documentElement.style.setProperty('--theme-wipe-x', `${x}px`)
      doc.documentElement.style.setProperty('--theme-wipe-y', `${y}px`)
      doc.documentElement.style.setProperty('--theme-wipe-r', `${radius}px`)
    }

    // flushSync is required: startViewTransition snapshots the DOM when its
    // callback returns, and React would otherwise still be holding the update
    // in a batch, so the "after" snapshot would be identical to the "before".
    doc.startViewTransition(() => flushSync(() => setTheme(next)))
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      data-theme-toggle
      // Before mount the label would be a guess, and a guess that changes after
      // hydration is worse for a screen reader than a neutral one.
      aria-label={mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Switch theme'}
      className={cn(
        'relative grid place-items-center rounded-md text-text-secondary',
        'transition-colors duration-(--duration-fast) hover:bg-bg-inset hover:text-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
        'active:scale-95',
        size === 44 ? 'h-11 w-11' : 'h-8 w-8',
        className
      )}
      {...props}
    >
      <motion.span
        className="absolute grid place-items-center"
        animate={{ opacity: isDark ? 0 : 1, rotate: isDark ? -90 : 0, scale: isDark ? 0.6 : 1 }}
        transition={SPIN}
        aria-hidden
      >
        <SunIcon size={size === 44 ? 22 : 18} />
      </motion.span>
      <motion.span
        className="absolute grid place-items-center"
        animate={{ opacity: isDark ? 1 : 0, rotate: isDark ? 0 : 90, scale: isDark ? 1 : 0.6 }}
        transition={SPIN}
        aria-hidden
      >
        <MoonIcon size={size === 44 ? 22 : 18} />
      </motion.span>
    </button>
  )
}
