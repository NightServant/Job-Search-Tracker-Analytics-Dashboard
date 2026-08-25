/**
 * The single source of truth for motion preference.
 *
 * Mount-gating, the theme wipe and M6's pinned landing all read this. Three
 * separate checks is how a page ends up half-animating for someone who asked it
 * not to. Subscribed live, not read once: the OS setting can change with the
 * page open.
 */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Null means "no media query available" -- server render, or a browser without
 * matchMedia. That resolves to full motion rather than reduced, because the
 * server cannot know the preference and defaulting to reduced would ship a
 * static app to everyone whose first paint happens on the server.
 */
export function prefersReducedMotion(mql: MediaQueryList | null): boolean {
  return mql?.matches ?? false
}

export function motionQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(REDUCED_MOTION_QUERY)
}

/** Returns its own unsubscribe, so a caller never has to reconstruct the handler. */
export function subscribeToMotionPreference(
  mql: MediaQueryList | null,
  onChange: (reduced: boolean) => void
): () => void {
  if (!mql) return () => {}
  const handler = (e: MediaQueryListEvent) => onChange(e.matches)
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
