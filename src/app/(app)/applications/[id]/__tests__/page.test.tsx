import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'

/**
 * This route stopped being a screen. `ApplicationRecordScreen` -- the
 * full-width record it used to render on a phone, while desktop got a
 * redirect to a dialog on the list -- is deleted. `AppDialog` is a bottom
 * sheet below 640 on its own, so the phone now gets the exact same dialog the
 * desktop does, and there is nothing left for a route at this address to
 * render that the list screen does not render better.
 *
 * WHAT THIS ROUTE IS NOW, at every width: `router.replace` to
 * `/applications?application=<id>`, and a skeleton while that happens. No
 * `useJob`, no secondary reads, no width check -- the component reads only
 * `useParams` and `useRouter`, so that is all this suite mocks.
 *
 * WHAT USED TO BE HERE, and why it did not migrate rather than shrink:
 *
 * - the wide-viewport-redirects / narrow-viewport-renders split, and the two
 *   tests that ran the transition through the real `useIsMobile` hook --
 *   removed: there is no width branch left to guard against regressing, the
 *   route no longer reads viewport at all.
 * - a breadcrumb back to the list -- removed: there is no screen here to put
 *   a breadcrumb on.
 * - a not-found panel for a bad id -- removed: this route never fetches the
 *   job any more, so it can no longer be the one to notice it is missing.
 * - a loading skeleton gated on `useJob`'s `isLoading` -- removed along with
 *   `useJob`: the skeleton below is unconditional now, not a loading state.
 * - the ATS-match-once-resolved, edit-in-place, and ask-before-delete tests
 *   -- removed: all of it lived in the record UI that moved into
 *   `record/ApplicationRecordDialog`, and is covered where that now renders,
 *   not on a route that no longer renders it.
 */
const useParamsMock = vi.hoisted(() => vi.fn())
const replaceMock = vi.hoisted(() => vi.fn())
const pushMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useParams: useParamsMock,
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))

import Page from '../page'
import DemoPage from '@/app/demo/applications/[id]/page'

beforeEach(() => {
  vi.clearAllMocks()
  useParamsMock.mockReturnValue({ id: 'job-1' })
})

afterEach(() => cleanup())

describe('the application record route', () => {
  it('replaces to the list, carrying the id as `?application=<id>`', async () => {
    render(<Page />)
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/applications?application=job-1')
    )
  })

  it('replaces rather than pushes, so Back does not bounce through this route', async () => {
    render(<Page />)
    await waitFor(() => expect(replaceMock).toHaveBeenCalledTimes(1))
    // A push would leave this route in the history stack, and going Back
    // from the list would land on it and be redirected forward again.
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('encodes the id into the query string', async () => {
    // Not load-bearing for `job-1`, but the id is a free-text value someone
    // could have typed into a URL bar, and `?application=` is built with
    // string interpolation right next to it.
    useParamsMock.mockReturnValue({ id: 'a b/c' })
    render(<Page />)
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        `/applications?application=${encodeURIComponent('a b/c')}`
      )
    )
  })

  it('does not redirect before an id is available', () => {
    // `useParams` can report an empty id for a moment before Next resolves
    // the route; redirecting to `?application=` with nothing after the `=`
    // would open the list on a param that names no application.
    useParamsMock.mockReturnValue({ id: undefined })
    render(<Page />)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('renders only the redirect skeleton -- there is no record left to show here', async () => {
    render(<Page />)
    // `findBy`, not `getBy`: the skeleton sits behind a 200ms gate (see
    // ui/loading-skeletons) so a warm navigation never flashes it for one
    // frame, which means nothing is in the DOM at t=0 by design.
    expect(await screen.findByRole('status')).toHaveAttribute('data-route-skeleton', 'detail')
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('the demo route, same redirect', () => {
  it('replaces to the demo list, carrying the id the same way', async () => {
    render(<DemoPage />)
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/demo/applications?application=job-1')
    )
    expect(pushMock).not.toHaveBeenCalled()
  })
})
