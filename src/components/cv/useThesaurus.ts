'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/core'
import {
  matchCase,
  singleWord,
  thesaurusUrl,
  toSynonyms,
  type Synonym,
} from '@/services/thesaurus'

/**
 * Synonyms for the word under the caret, as Word's Review tab offers.
 *
 * IT FOLLOWS THE SELECTION rather than sitting behind a button, because that
 * is the moment the question arises: you have highlighted "managed" precisely
 * because you are wondering what else it could be. A button would add a click
 * to an answer the editor already knows to look for.
 *
 * DEBOUNCED, AND NOT ONLY FOR POLITENESS. Dragging a selection across a line
 * fires `selectionUpdate` on every character, and each one is a request to
 * somebody's free, unauthenticated, per-IP-rate-limited service. 350ms is
 * long enough that a drag costs one call rather than forty.
 *
 * A STALE RESPONSE IS DISCARDED. Two lookups in flight can return out of
 * order, and the wrong one landing last would show synonyms for a word the
 * caret has already left -- which looks exactly like a broken thesaurus. The
 * request id is checked before anything is stored.
 */

export interface ThesaurusState {
  /** The word being looked up, or null when the selection is not one word. */
  word: string | null
  synonyms: Synonym[]
  loading: boolean
  /** True once a lookup has returned nothing, so the panel can say so. */
  empty: boolean
  /** Replaces the selected word, preserving its capitalisation. */
  apply: (replacement: string) => void
}

export function useThesaurus(editor: Editor | null): ThesaurusState {
  const [word, setWord] = React.useState<string | null>(null)
  const [synonyms, setSynonyms] = React.useState<Synonym[]>([])
  const [loading, setLoading] = React.useState(false)
  const [empty, setEmpty] = React.useState(false)
  const requestId = React.useRef(0)

  // The raw selected text, recomputed whenever the selection moves.
  const [selected, setSelected] = React.useState('')
  React.useEffect(() => {
    if (!editor) return
    const read = () => {
      const { from, to, empty: collapsed } = editor.state.selection
      setSelected(collapsed ? '' : editor.state.doc.textBetween(from, to, ' '))
    }
    read()
    editor.on('selectionUpdate', read)
    return () => {
      editor.off('selectionUpdate', read)
    }
  }, [editor])

  React.useEffect(() => {
    const candidate = singleWord(selected)
    setWord(candidate)
    if (!candidate) {
      setSynonyms([])
      setEmpty(false)
      return
    }

    const id = ++requestId.current
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(thesaurusUrl(candidate))
        const data = await response.json()
        // See the docblock: a late response for an old word must not land.
        if (requestId.current !== id) return
        const next = toSynonyms(data, candidate)
        setSynonyms(next)
        setEmpty(next.length === 0)
      } catch {
        if (requestId.current !== id) return
        setSynonyms([])
        setEmpty(true)
      } finally {
        if (requestId.current === id) setLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [selected])

  const apply = React.useCallback(
    (replacement: string) => {
      if (!editor) return
      const { from, to } = editor.state.selection
      const original = editor.state.doc.textBetween(from, to, ' ')
      // Case is carried over so taking a suggestion at the start of a bullet
      // does not quietly lower-case the line.
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, matchCase(original.trim(), replacement))
        .run()
    },
    [editor]
  )

  return { word, synonyms, loading, empty, apply }
}
