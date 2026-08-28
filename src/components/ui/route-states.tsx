import * as React from 'react'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon } from '@/components/icons'

/**
 * The route-level loading and error blocks every top-level `page.tsx` under
 * `(app)/` renders while its own data is in flight or failed outright --
 * "the whole page has nothing to show" rather than `PanelSection`'s `error`
 * prop, which covers one panel failing *inside* a screen that already
 * rendered. They are siblings, not duplicates: a route that fails here never
 * reached the panels `PanelSection` decorates, and a panel that fails there
 * does so underneath a route that loaded fine. A later reviewer should not
 * try to merge them.
 *
 * Dashboard, Applications and the application detail route each hand-rolled
 * this block independently and agreed on every class name: `flex
 * justify-center py-24` around a size-24 `Spinner` for loading, and `flex
 * flex-col items-center gap-3 py-24 text-center` around a size-32
 * `AlertCircleIcon text-status-rejected-mark`, a `text-body-m
 * text-text-primary` title and a `text-body-s text-text-muted` message for
 * the error state. Those three-of-three values are fixed here rather than
 * exposed as props.
 *
 * The one place they diverged was the action under the message. Dashboard
 * and Applications both retry with `<Button variant="secondary" size="s"
 * onClick={() => window.location.reload()}>Retry</Button>` -- their error is
 * a fetch that might just succeed the second time. The detail route used a
 * `Link` back to `/applications` instead, because its error is a job that
 * does not exist (RLS makes a bad id and someone else's job indistinguishable
 * from the query alone), so reloading the same URL would only fail again.
 * Two of three sites is the majority, so the reload button is the default;
 * `action` overrides it for the one site that cannot use a retry rather than
 * forcing that site into one that would not work.
 */
export function RouteLoading() {
  return (
    <div className="flex justify-center py-24">
      <Spinner size={24} />
    </div>
  )
}

export interface RouteErrorProps {
  title: React.ReactNode
  message: React.ReactNode
  /**
   * Defaults to the reload Retry button two of the three original sites
   * used. Pass a different action (e.g. a `Link` elsewhere) when a reload
   * cannot fix the error, as the detail route's not-found state does.
   */
  action?: React.ReactNode
}

export function RouteError({ title, message, action }: RouteErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <AlertCircleIcon size={32} className="text-status-rejected-mark" />
      <p className="text-body-m text-text-primary">{title}</p>
      <p className="text-body-s text-text-muted">{message}</p>
      {action ?? (
        <Button variant="secondary" size="s" onClick={() => window.location.reload()}>
          Retry
        </Button>
      )}
    </div>
  )
}
