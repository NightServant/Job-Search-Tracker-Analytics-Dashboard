import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

/**
 * The persistent "you are looking at a demo" banner, above <main> on every
 * /demo/* route.
 *
 * IT IS NOT DISMISSIBLE, deliberately. A visitor who closes it in the first
 * second and then spends the rest of the session wondering why nothing saves
 * is exactly the confusion it exists to prevent.
 *
 * The Badge is the one place in this application a Badge is correct. The
 * Global Constraint forbids pills and StatusMarker replaced them everywhere --
 * but that rule is about STATUS, and this labels a MODE. A demo is not a
 * pipeline stage.
 *
 * It says three things because a visitor needs all three: this is a demo, the
 * data is invented, and here is how to get a real account. Nothing here claims
 * the demo is read-only in a security sense -- there is no session and no
 * write path at all, which is a stronger statement and the one the copy makes.
 */
export function DemoBanner() {
  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <AlertDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant="secondary">demo</Badge>
        <span>
          Every figure on these pages is invented. Nothing you do here is saved, because there is
          nothing to save it to.
        </span>
        <Link href="/signup" className="text-accent-default underline underline-offset-4">
          create an account
        </Link>
      </AlertDescription>
    </Alert>
  )
}
