import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { BrandLockup } from '@/components/ui/brand-mark'
import { ArrowRightIcon } from '@/components/icons'

/**
 * The 404 page.
 *
 * IT DOES NOT BLAME THE VISITOR, and the heading is where that shows. "Page
 * not found" is the convention and it is passive to the point of being
 * useless; "You have reached a page that does not exist" makes a wrong turn
 * sound like a wrong choice. "That page does not exist" states the fact about
 * the page rather than about the person, which is the only true version --
 * most 404s here will be our own stale links, not mistyped URLs.
 *
 * IT NEVER ECHOES THE PATH. Reflecting the requested URL back into the
 * document is the small, standard mistake that turns a 404 into a reflected
 * XSS sink, and even escaped it is a way to render attacker-chosen text on
 * your own domain -- "your account has been suspended, call this number" as a
 * 404 body. This component reads no location at all, which is why the copy
 * cannot name what was asked for. A test asserts the absence.
 *
 * RECOVERY LINKS, ONE PRIMARY. A 404 whose only control is "go home" makes a
 * signed-in visitor start over from the marketing page to get back to the
 * thing they were doing. The overview is primary because it is what most
 * people want; applications is secondary, because two equal buttons is two
 * decisions at the moment the visitor is already lost.
 *
 * The way home moved into the HEADER, matching /privacy -- it is the one
 * destination every visitor to this page can use whether or not they have an
 * account, and repeating it in the body made the group of three read as three
 * peers when only two of them are about resuming work.
 *
 * OUTSIDE THE AUTH GUARD, deliberately: this renders from `app/not-found.tsx`
 * at the root, so it is not inside `(app)/layout.tsx`. A 404 that redirects a
 * signed-out visitor to `/login` is a worse 404 than Next's default one -- it
 * turns "this link is broken" into "you are not allowed", which is a different
 * and wrong claim. The dashboard links still point into the guarded area; a
 * signed-out visitor following one lands on the sign-in screen, which is
 * correct, because by then they have asked for a private page.
 *
 * NO SITE FOOTER, matching /privacy. The footer is the marketing page's own
 * navigation -- a second, denser set of destinations underneath a page whose
 * entire job is to offer two or three good ones. It also carries the
 * attribution block, which is a strange thing to read at the bottom of a
 * broken link.
 *
 * It carries the landing chrome rather than the app shell. The shell needs a
 * session and a sidebar full of the visitor's own data; a 404 is reachable by
 * anyone, including crawlers.
 */
export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-canvas">
      {/*
        The lockup sits in the SAME container as the content below it, so both
        start on one vertical line. A header padded to the viewport while the
        body is centred in a max-width container puts them a few pixels apart
        at every width -- the kind of misalignment that reads as sloppiness
        without anyone being able to say what is wrong.

        The explicit way-back button matches /privacy. A clickable wordmark is
        a convention people who build websites know and people who have just
        hit a broken link do not.
      */}
      <header className="w-full border-b border-border-subtle px-5 py-5 md:px-8">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6">
          <Link href="/" aria-label="Worktrack home">
            <BrandLockup />
          </Link>
          <Link
            href="/"
            data-variant="secondary"
            className={`${buttonVariants({ variant: 'secondary', size: 's' })} group`}
          >
            Back to the home page
            <ArrowRightIcon size={14} aria-hidden />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center px-5 py-20 md:px-8">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex max-w-2xl flex-col gap-6">
            {/*
              The code is an eyebrow, not the headline. "404" is the most
              prominent thing on most error pages and it is the least useful --
              it names a protocol status to somebody who wants a sentence.
            */}
            <p className="text-label-caps font-bold uppercase text-accent-default">404</p>

            <h1 className="text-display-m font-bold text-text-primary">
              That page does not exist
            </h1>

            <p className="text-body-l font-normal text-text-secondary">
              The link may be out of date, or the page may have moved. Nothing is
              wrong with your account.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/dashboard"
                data-variant="primary"
                className={buttonVariants({ variant: 'primary', size: 'm' })}
              >
                Go to the overview
              </Link>
              <Link
                href="/applications"
                data-variant="secondary"
                className={buttonVariants({ variant: 'secondary', size: 'm' })}
              >
                Go to your applications
              </Link>
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}
