'use client'

import * as React from 'react'
import { AuthHoldContext } from './authHold'

/**
 * Supplies the hold that `./authHold`'s hooks read. See that file for why the
 * hold exists at all.
 *
 * SPLIT FROM THE HOOKS because `react-refresh/only-export-components` is
 * right: a module that exports both a component and plain functions loses
 * fast refresh for the component. The context and its two hooks live next
 * door; this file is the component half.
 */
export function AuthHoldProvider({ children }: { children: React.ReactNode }) {
  const [held, setHeld] = React.useState(false)
  const value = React.useMemo(() => ({ held, setHeld }), [held])
  return <AuthHoldContext.Provider value={value}>{children}</AuthHoldContext.Provider>
}
