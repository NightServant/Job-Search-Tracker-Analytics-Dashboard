/**
 * Which nav destination a path belongs to.
 *
 * A detail route is a child of its section, so /applications/abc highlights
 * /applications. /settings deliberately returns null: it left the nav when the
 * Top Bar gained its own settings button, so nothing in the bar is its parent.
 */
export function activeNavHref(pathname: string, hrefs: string[]): string | null {
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return null
  const matches = hrefs.filter((h) => pathname === h || pathname.startsWith(`${h}/`))
  // Longest wins, so /applications/x picks /applications over a hypothetical /.
  return matches.sort((a, b) => b.length - a.length)[0] ?? null
}
