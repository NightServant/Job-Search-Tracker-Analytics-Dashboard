/**
 * Whether development-only routes should render.
 *
 * The gallery is a working surface, not a page, so it stays out of production by
 * default. The opt-in exists because design review of a deployed build is exactly
 * when you most want it, and rebuilding to look at a button is worse.
 *
 * An absent NODE_ENV counts as development: the safe default for a *route* is to
 * be hidden, but the safe default for a *build without NODE_ENV set* is a local
 * one, and treating it as production would hide the gallery during development.
 */
export function isDevSurfaceEnabled(source: Record<string, string | undefined>): boolean {
  if (source.NEXT_PUBLIC_ENABLE_GALLERY === 'true') return true
  return source.NODE_ENV !== 'production'
}
