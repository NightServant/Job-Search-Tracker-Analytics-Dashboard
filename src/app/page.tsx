import { Landing } from '@/components/landing/Landing'
import { SCREENS } from '@/components/landing/screens'

/**
 * The public landing page, and the homepage for everyone.
 *
 * This route used to be `redirect('/dashboard')`, which meant the only people
 * with an account never saw the landing page at all -- perverse for a
 * portfolio piece whose landing page is the thing a reviewer is meant to look
 * at. Settled by Gabe on 2026-09-02: `/` renders Landing unconditionally and
 * redirects nobody.
 *
 * Moving the demo to `/demo/*` is what removed the last objection. The CTA is
 * a link to a page rather than a session swap, so a signed-in visitor
 * following it stays signed in.
 *
 * No auth is read here, deliberately: reading session state would make this
 * route dynamic, and the whole page is static content.
 */
export default function Page() {
  return (
    <Landing
      screens={SCREENS}
      heroPosterSrc="/hero-poster.jpg"
      heroVideoSrc="/hero.mp4"
    />
  )
}
