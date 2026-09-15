'use client'

import * as React from 'react'

/**
 * Whether this browser can reach the network, and whether it is worth waiting
 * on.
 *
 * TWO DIFFERENT FACTS, AND THEY ARE NOT DEGREES OF ONE. Gabe asked for a "no
 * internet state" and a "slow internet state" as separate items on 2026-09-15,
 * and they genuinely are: offline is binary and the app should stop asking the
 * user to wait, while slow is a warning that the thing they started WILL
 * finish, just not now. Collapsing them would mean either telling somebody on
 * a 2G train that they are offline -- they are not, and the request is still
 * running -- or telling somebody in a lift with no signal to be patient.
 *
 * `navigator.onLine` IS WEAKER THAN IT SOUNDS, and that is worth writing down
 * rather than discovering. `false` is reliable: the browser knows there is no
 * route out, and nothing will succeed. `true` only means an interface is up --
 * a captive portal, a router with no uplink, and a VPN that has dropped all
 * report `true`. So this is used ONE WAY ONLY: to say "definitely offline",
 * never to promise that a request will work. Nothing in the app gates a fetch
 * on it; the fetches still run and still fail on their own terms.
 *
 * THE SLOW SIGNAL IS THE NETWORK INFORMATION API, which Chrome, Edge and
 * Android browsers implement and Safari and Firefox do not. That is fine for
 * what it is used for: a notice that appears for SOME people on a bad
 * connection is strictly better than no notice for anybody, and its absence
 * degrades to "not slow", which is the state every browser is in most of the
 * time anyway. It is deliberately NOT replaced by timing our own requests --
 * that would mean instrumenting every fetch in the app to light one banner.
 *
 * `saveData` COUNTS AS SLOW even on a fast connection, and that is not a
 * mistake. Somebody who has turned on data saver is telling the browser to
 * spend less, and the honest thing to show them is the same "this may take a
 * while, nothing is broken" notice -- the app does not change what it fetches,
 * so the wait is the part they can act on.
 *
 * SSR-SAFE BY CONSTRUCTION. The initial state is "online, not slow" and every
 * read of `navigator` happens inside an effect, so the server render and the
 * first client render agree. Starting from `navigator.onLine` would be a
 * hydration mismatch on every offline load -- and an offline visitor is
 * exactly the one who cannot afford React throwing the tree away and
 * re-rendering it.
 */
export interface ConnectionState {
  /** False only when the browser is certain there is no route out. */
  online: boolean
  /** True on a 2G-class connection, or when the user has asked to save data. */
  slow: boolean
}

/** The `effectiveType` values worth warning about. `3g` is usable; `2g` is not. */
const SLOW_TYPES = new Set(['slow-2g', '2g'])

interface NetworkInformation extends EventTarget {
  effectiveType?: string
  saveData?: boolean
}

function connectionOf(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null
  // Not in lib.dom yet, and prefixed on older Android.
  const nav = navigator as Navigator & {
    connection?: NetworkInformation
    mozConnection?: NetworkInformation
    webkitConnection?: NetworkInformation
  }
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null
}

export function useConnection(): ConnectionState {
  const [state, setState] = React.useState<ConnectionState>({ online: true, slow: false })

  React.useEffect(() => {
    const connection = connectionOf()

    const read = () =>
      setState({
        online: navigator.onLine,
        slow: Boolean(
          connection &&
            (SLOW_TYPES.has(connection.effectiveType ?? '') || connection.saveData === true)
        ),
      })

    read()

    window.addEventListener('online', read)
    window.addEventListener('offline', read)
    // `change` fires when the radio switches -- wifi to cellular, 4G to 2G --
    // which is the whole reason the slow state can appear mid-session rather
    // than only on load.
    connection?.addEventListener('change', read)

    return () => {
      window.removeEventListener('online', read)
      window.removeEventListener('offline', read)
      connection?.removeEventListener('change', read)
    }
  }, [])

  return state
}
