'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { motionQuery, prefersReducedMotion, subscribeToMotionPreference } from '@/lib/motion'

/**
 * The React face of the motion gate. Every animated surface reads this one.
 *
 * useSyncExternalStore rather than useState-plus-useEffect. With an effect the
 * first render always reports "motion allowed" and only corrects on the next
 * pass, which is long enough for a child effect to have already built an
 * IntersectionObserver and started an animation for someone who asked for
 * neither. The server snapshot keeps hydration honest; the client snapshot is
 * read before the first commit.
 */
export function usePrefersReducedMotion(): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeToMotionPreference(motionQuery(), onChange),
    []
  )
  return useSyncExternalStore(
    subscribe,
    () => prefersReducedMotion(motionQuery()),
    () => false // the server cannot know; see prefersReducedMotion
  )
}
