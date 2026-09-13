'use client'

import * as React from 'react'

/**
 * WHICH WAY THE DOCUMENT IS DRAWN, and the seam between the chrome that owns
 * that choice and the editor that owns the paper.
 *
 * THE PROBLEM THIS SOLVES IS A DIRECTION PROBLEM. The toggle has to live in
 * the compact chrome -- it is a floating control over the canvas, pinned above
 * the tab dock, and only that component knows where the dock is. The thing it
 * changes is the sheet, which is `children`: an `<EditorContent>` the Word
 * editor builds and hands DOWN. Props cannot cross that seam, because the
 * chrome receives the sheet already built.
 *
 * So the state goes down the tree instead of up: the chrome provides, the
 * sheet reads. Two values, no setter -- the toggle is the chrome's business
 * and nothing inside the document may flip the view out from under it.
 *
 * `'print'` WHEN THERE IS NO PROVIDER, deliberately. The desktop chrome is
 * untouched by this work and renders no provider at all, and print is what it
 * has always drawn: a letter sheet, zoom-to-fit, page-break seams. A default
 * of `'scroll'` would have silently re-rendered every desktop CV as a
 * continuous document the first time this file was imported.
 */
export type DocumentView = 'scroll' | 'print'

const DocumentViewContext = React.createContext<DocumentView>('print')

export function DocumentViewProvider({
  view,
  children,
}: {
  view: DocumentView
  children: React.ReactNode
}) {
  return <DocumentViewContext.Provider value={view}>{children}</DocumentViewContext.Provider>
}

/**
 * Read the current view. Must be called from a component rendered INSIDE the
 * provider -- which means inside `children`, not in the editor component that
 * builds them. See `PageSheet` in WordResumeEditor for the shape that works.
 */
export function useDocumentView(): DocumentView {
  return React.useContext(DocumentViewContext)
}
