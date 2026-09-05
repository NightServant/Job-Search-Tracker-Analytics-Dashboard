import { Landing } from '@/components/landing/Landing'
import { SignedInRedirect } from '@/components/auth/SignedInRedirect'
import { InstantSignedInRedirect } from '@/components/auth/InstantSignedInRedirect'
import { SCREENS } from '@/components/landing/screens'

/**
 * The public landing page, and the homepage for everyone.
 *
 * SIGNED-OUT VISITORS GET THE LANDING PAGE; SIGNED-IN ONES GO TO /dashboard.
 * That is Gabe's 2026-09-03 ruling and it partially reverses 2026-09-02, when
 * `/` was made the homepage for everyone and redirected nobody. What survives
 * from that decision is the important half: this route is still STATIC and
 * still renders Landing for the anonymous traffic that is nearly all of it.
 *
 * The redirect is a client island rather than a server `redirect()`, and it
 * has to be -- reading the session here would make the route dynamic, and the
 * session is not on the server to read in the first place. See
 * SignedInRedirect for why, and for the one frame it costs.
 *
 * Moving the demo to `/demo/*` is what removed the last objection to any of
 * this. The CTA is a link to a page rather than a session swap, so a
 * signed-in visitor following it stays signed in.
 */
export default function Page() {
  return (
    <>
      {/* First, so the browser decides before it parses anything below. */}
      <InstantSignedInRedirect />
      <SignedInRedirect />
      <Landing
        screens={SCREENS}
        heroPosterSrc="/hero-poster.jpg"
        heroVideoSrc="/hero.mp4"
      />
    </>
  )
}
