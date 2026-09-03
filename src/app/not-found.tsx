import { NotFound } from '@/components/errors/NotFound'

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
