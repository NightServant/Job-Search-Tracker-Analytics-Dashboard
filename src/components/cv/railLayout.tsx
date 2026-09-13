'use client'

import * as React from 'react'

/**
 * WHETHER THE RAIL IS A COLUMN OF ITS OWN OR SHARING ONE, and the seam between
 * the chrome that decides that and the tab strip that has to look right in
 * both.
 *
 * THE SAME DIRECTION PROBLEM `documentView` SOLVES, for the same reason. Only
 * the chrome knows the arrangement -- it measures the workspace and picks
 * three columns or two -- and the thing that has to respond is `railNav`, a
 * node the editor builds and hands DOWN. Props cannot cross that seam, because
 * the chrome receives the strip already built. So the state goes down the tree
 * instead of up: the chrome provides, the strip reads. No setter; which
 * arrangement is in force is the chrome's business and nothing inside a rail
 * may flip it.
 *
 * WHY THE TWO LOOK DIFFERENT AT ALL, since one flex-direction would be less
 * code. In its own 380px column the strip has height to spend and neighbours
 * below it, so a vertical list is right: each row carries its own hint, and
 * selection reads as a rule down the leading edge, which is how this app marks
 * a current item everywhere else. Sharing a 320px column with the pane it
 * selects, height is the scarce thing -- two stacked rows with hints cost
 * ~120px directly above the panel they open -- so the strip becomes one 45px
 * row and the hint collapses to a single line for the selected tab. Gabe,
 * 2026-09-13: horizontal "must be applied to smaller laptop screens", then
 * "restore the vertical tabs in larger screens".
 *
 * `'column'` WHEN THERE IS NO PROVIDER, deliberately: it is the older of the
 * two and the one a rail with room gets, so anything rendering the strip
 * outside a chrome keeps what it has always drawn.
 */
export type RailLayout = 'column' | 'row'

const RailLayoutContext = React.createContext<RailLayout>('column')

export function RailLayoutProvider({
  layout,
  children,
}: {
  layout: RailLayout
  children: React.ReactNode
}) {
  return <RailLayoutContext.Provider value={layout}>{children}</RailLayoutContext.Provider>
}

/**
 * Read the arrangement. Must be called from a component rendered INSIDE the
 * provider -- which means inside the chrome's rail, not in the editor that
 * builds the node. See `DocumentRailTabs`.
 */
export function useRailLayout(): RailLayout {
  return React.useContext(RailLayoutContext)
}
