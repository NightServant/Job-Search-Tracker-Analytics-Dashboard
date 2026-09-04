'use client'

import * as React from 'react'

/**
 * Whether a document is open, and therefore whether the app's navigation
 * should get out of its way.
 *
 * WHY A CONTEXT AND NOT A ROUTE CHECK. The obvious alternative is for
 * `AppShell` to read the pathname and hide its chrome on `/cv`. That is wrong
 * twice over: `/cv` with no `?draft=` is the CV LIST, which needs the nav like
 * any other screen, and a shell that has to know which query parameters a
 * distant screen uses has taken on that screen's business.
 *
 * The document is the thing that knows it is open, so the document says so.
 * `AppShell` owns the boolean and publishes the setter; an editor calls
 * `useDocumentFocus()` and the effect clears itself on unmount -- which means
 * navigating away, closing the draft, or crashing all restore the nav without
 * anyone remembering to.
 *
 * Default is a no-op setter, so an editor rendered outside the shell -- in a
 * test, in the gallery -- behaves normally instead of throwing.
 */
const DocumentFocusContext = React.createContext<(focused: boolean) => void>(() => {})

export function DocumentFocusProvider({
  setFocused,
  children,
}: {
  setFocused: (focused: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DocumentFocusContext.Provider value={setFocused}>{children}</DocumentFocusContext.Provider>
  )
}

/**
 * Call from a screen that should take over the viewport. Focus is claimed on
 * mount and released on unmount.
 */
export function useDocumentFocus(active = true): void {
  const setFocused = React.useContext(DocumentFocusContext)
  React.useEffect(() => {
    setFocused(active)
    return () => setFocused(false)
  }, [setFocused, active])
}
