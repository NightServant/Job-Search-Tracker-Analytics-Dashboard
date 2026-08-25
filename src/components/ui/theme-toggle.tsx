'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { SunIcon, MoonIcon } from '@/components/icons'

/**
 * The theme control. One button, two icons, one of them visible.
 *
 * Written against skiper4's technique rather than installed from it. Every one
 * of its five variants holds the theme in a local `useState` that no provider
 * ever sees, hardcodes `bg-black`/`bg-white` instead of tokens, and carries its
 * own sun/moon geometry as a `clipPath` with a fixed DOM id -- which collides
 * the moment two toggles render, and which the custom-icon constraint forbids
 * anyway. Swapping its icons for ours deletes the part being kept, so what
 * survives is the idea: crossfade plus counter-rotation, framer-motion driven.
 *
 * Size is 32 on desktop chrome and 44 on mobile. That gap is deliberate -- a
 * finger needs the 44px target, a cursor does not, and matching them would make
 * the desktop sidebar look padded.
 */
export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 32 | 44
}

const SPIN = { type: 'spring', stiffness: 220, damping: 22 } as const

export function ThemeToggle({ size = 32, className, onClick, ...props }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // The server has no way to know the stored theme, so the first client render
  // must match the server's. Reading `resolvedTheme` before mount renders the
  // wrong icon and then swaps it -- a visible flicker on every page load.
  React.useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (e.defaultPrevented) return
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-theme-toggle
      // Before mount the label would be a guess, and a guess that changes after
      // hydration is worse for a screen reader than a neutral one.
      aria-label={mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Switch theme'}
      className={cn(
        'relative grid place-items-center rounded-md text-text-secondary',
        'transition-colors duration-[--duration-fast] hover:bg-bg-inset hover:text-text-primary',
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
