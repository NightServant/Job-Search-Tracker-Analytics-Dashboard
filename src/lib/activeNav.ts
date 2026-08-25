/**
 * Whether a path is inside a section -- an exact match or a child route.
 *
 * `/settings/profile` is under `/settings`; `/settings-archive` is not, because
 * a bare `startsWith` has no notion of a path segment boundary.
 */
export function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/**
 * Which nav destination a path belongs to.
 *
 * A detail route is a child of its section, so /applications/abc highlights
 * /applications. /settings deliberately returns null: it left the nav when the
 * Top Bar gained its own settings button, so nothing in the bar is its parent.
 *
 * This is the one place that decides "which destination is active" -- the
 * sidebar and the bottom nav both consume its result rather than each running
 * their own startsWith check, which is what let them disagree before.
 */
export function activeNavHref(pathname: string, hrefs: string[]): string | null {
  if (isUnder(pathname, '/settings')) return null
  const matches = hrefs.filter((h) => isUnder(pathname, h))
  // Longest wins, so /applications/x picks /applications over a hypothetical /.
  return matches.sort((a, b) => b.length - a.length)[0] ?? null
}
