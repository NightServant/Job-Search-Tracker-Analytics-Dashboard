import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

/**
 * The "you are looking at a demo" notice, in the two shapes the shell has room
 * for.
 *
 * IT IS NOT DISMISSIBLE, deliberately, in either shape. A visitor who closes it
 * in the first second and then spends the rest of the session wondering why
 * nothing saves is exactly the confusion it exists to prevent.
 *
 * The Badge is the one place in this application a Badge is correct. The Global
 * Constraint forbids pills and StatusMarker replaced them everywhere -- but
 * that rule is about STATUS, and this labels a MODE. A demo is not a pipeline
 * stage.
 *
 * Both shapes say the same three things, because a visitor needs all three:
 * this is a demo, the data is invented, and here is how to get a real account.
 * Neither claims the demo is read-only in a security sense -- there is no
 * session and no write path at all, which is a stronger statement and the one
 * the copy makes.
 */

/** One sentence, one source. Two components must not drift apart on the claim. */
const CLAIM =
  'Every figure on these pages is invented. Nothing you do here is saved, because there is nothing to save it to.'

/**
 * Above <main>, below lg only.
 *
 * MOBILE IS UNCHANGED: a full-bleed band with a single bottom rule, flush to
 * the top bar. On a 375px screen a card would spend its horizontal margins on
 * nothing and push the page heading further down a viewport that has none to
 * spare.
 *
 * TABLET GETS A CARD (Gabe, 2026-09-06): from md it takes the gutter as margin
 * and the borders and radius back, so it reads as a panel sitting on the page
 * rather than as chrome welded to the header. A 768px band of full-width prose
 * looks like part of the application; a card looks like a notice about it.
 *
 * From lg it is gone entirely and `DemoSidebarNotice` carries the message in
 * the sidebar -- a wide screen should not spend a whole horizontal band on a
 * sentence that has already been read.
 */
export function DemoBanner() {
  return (
    <Alert
      data-demo-banner
      className="rounded-none border-x-0 border-t-0 md:mx-gutter md:mt-gutter md:w-auto md:rounded-md md:border-x md:border-t lg:hidden"
    >
      <AlertDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant="secondary">demo</Badge>
        <span>{CLAIM}</span>
        <Link href="/signup" className="text-accent-default underline underline-offset-4">
          create an account
        </Link>
      </AlertDescription>
    </Alert>
  )
}

/**
 * The same notice inside the sidebar, so it exists only from lg up.
 *
 * Stacked rather than inline: the expanded rail is 240px wide with a 24px lead,
 * which leaves ~200px -- one short measure, not a row. `text-caption` matches
 * the sidebar footer beside it rather than the body scale of the page, because
 * this is chrome copy sitting in a chrome column.
 *
 * The claim is the shared constant, so the two shapes cannot come to disagree
 * about what the demo is.
 */
export function DemoSidebarNotice() {
  return (
    <div
      data-demo-sidebar-notice
      className="flex flex-col items-start gap-2 rounded-md border border-border-subtle p-3"
    >
      <Badge variant="secondary">demo</Badge>
      <p className="text-caption leading-[1.5] text-text-muted">{CLAIM}</p>
      <Link
        href="/signup"
        className="text-caption text-accent-default underline underline-offset-4"
      >
        create an account
      </Link>
    </div>
  )
}
