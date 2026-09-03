import type { Metadata } from 'next'
import { NotFound } from '@/components/errors/NotFound'

/**
 * A 404 needs a title like any other page -- without one the tab reads as the
 * homepage, which is exactly the wrong signal when the page is telling someone
 * their link is broken.
 *
 * `noindex` because a soft-404 that gets indexed competes with the real pages
 * for the same queries. Next already serves the correct 404 status here, so
 * this is belt and braces rather than the only defence.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

/**
 * Next's root not-found boundary.
 *
 * It renders inside the root layout and therefore OUTSIDE
 * `(app)/layout.tsx`'s auth guard, which is the point: a 404 that bounces a
 * signed-out visitor to `/login` turns "this link is broken" into "you are not
 * allowed", which is a different claim and a false one.
 */
export default function Page() {
  return <NotFound />
}
