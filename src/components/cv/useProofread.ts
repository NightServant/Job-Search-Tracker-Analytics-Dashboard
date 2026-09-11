'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/core'
import {
  LANGUAGETOOL_ENDPOINT,
  chunkText,
  splitByCategory,
  toIssues,
  type GrammarIssue,
} from '@/services/grammar'
import { BLOCK_SEPARATOR, buildOffsetMap, toRange } from './editorOffsets'
import { proofreadScore, type ProofreadScore } from './proofreadScore'

/**
 * Running the checker over the open document, and applying what it finds.
 *
 * ONE REQUEST FEEDS ALL THREE CATEGORIES, held here rather than in any pane,
 * because LanguageTool returns spelling, grammar and style together. Panes
 * owning their own fetch would check the same CV three times per pass.
 *
 * CALLED STRAIGHT FROM THE BROWSER, with no route in between. LanguageTool's
 * public endpoint is keyless and sends `access-control-allow-origin: *`
 * (verified 2026-09-11), so there is no secret to hide and nothing for a proxy
 * to do. Routing it through the server would actively hurt: the free tier is
 * rate limited PER IP, and every user sharing one server address is a far
 * lower ceiling than each using their own.
 *
 * THE ISSUE LIST IS CLEARED THE MOMENT ONE IS APPLIED, and that is the
 * important rule in this file rather than a tidiness preference. Every offset
 * after an accepted edit has moved by the length difference, so the remaining
 * issues are stale immediately -- applying a second one from the same list
 * would cut at the wrong index and corrupt the document. `services/grammar`
 * guards the clamp; this guarantees the situation does not arise.
 *
 * IGNORED WORDS ARE PER-SESSION AND NOT PERSISTED. "Ignore all" and "add to
 * dictionary" are the same operation here, which is honest: a real custom
 * dictionary belongs on the user row so it survives a reload, and pretending a
 * `useState` Set is one would lose somebody's dictionary silently. The pane
 * labels the button for what it does.
 */

export interface ProofreadState {
  running: boolean
  ran: boolean
  error: string | null
  spelling: GrammarIssue[]
  grammar: GrammarIssue[]
  style: GrammarIssue[]
  score: ProofreadScore
  /** Words the user has dismissed this session. */
  ignored: ReadonlySet<string>
  run: () => Promise<void>
  apply: (issue: GrammarIssue, replacement: string) => void
  ignore: (issue: GrammarIssue) => void
  ignoreAll: (issue: GrammarIssue) => void
  /** The document text the current issues were computed against. */
  text: string
}

const EMPTY_SCORE: ProofreadScore = {
  value: 100,
  spelling: 0,
  grammar: 0,
  style: 0,
  words: 0,
}

export function useProofread(editor: Editor | null): ProofreadState {
  const [running, setRunning] = React.useState(false)
  const [ran, setRan] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [issues, setIssues] = React.useState<GrammarIssue[]>([])
  const [text, setText] = React.useState('')
  const [ignored, setIgnored] = React.useState<Set<string>>(new Set())

  const wordFor = React.useCallback(
    (issue: GrammarIssue, source: string) =>
      source.slice(issue.start, issue.end).trim().toLowerCase(),
    []
  )

  const run = React.useCallback(async () => {
    if (!editor) return
    const current = editor.getText({ blockSeparator: BLOCK_SEPARATOR })

    setRunning(true)
    setError(null)
    try {
      const chunks = chunkText(current)
      // Sent in parallel; document order is restored by sorting on position.
      // A CV is a handful of requests at most, and serialising them would
      // multiply one round trip by the page count for no benefit.
      const responses = await Promise.all(
        chunks.map(async (chunk) => {
          const body = new URLSearchParams({ language: 'en-US', text: chunk.text })
          const response = await fetch(LANGUAGETOOL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          })
          if (!response.ok) throw new Error(String(response.status))
          return toIssues(await response.json(), chunk.offset)
        })
      )

      setIssues(responses.flat())
      setText(current)
      setRan(true)
    } catch {
      // ONE FAILED CHUNK FAILS THE CHECK. Showing the issues from four chunks
      // out of five presents a partial result as a complete one, and "3
      // problems" over a document with more reads as a clean bill of health.
      setError(
        'Could not reach the language checker. It is rate limited, so a long ' +
          'document checked repeatedly may need a moment.'
      )
      setIssues([])
    } finally {
      setRunning(false)
    }
  }, [editor])

  const apply = React.useCallback(
    (issue: GrammarIssue, replacement: string) => {
      if (!editor) return
      const map = buildOffsetMap(editor)
      const range = toRange(map, issue.start, issue.end)
      // Null means the range crosses a block boundary or landed in a
      // separator. Declining is correct; guessing at a nearby position would
      // edit text the user never saw flagged.
      if (!range) {
        setError('That correction spans a paragraph break and was not applied.')
        return
      }

      editor
        .chain()
        .focus()
        .insertContentAt({ from: range.from, to: range.to }, replacement)
        .run()

      // Every remaining offset is now wrong. See the docblock.
      setIssues([])
      setRan(false)
    },
    [editor]
  )

  const ignore = React.useCallback((issue: GrammarIssue) => {
    setIssues((current) => current.filter((candidate) => candidate !== issue))
  }, [])

  const ignoreAll = React.useCallback(
    (issue: GrammarIssue) => {
      const word = wordFor(issue, text)
      if (!word) return
      setIgnored((current) => new Set(current).add(word))
    },
    [text, wordFor]
  )

  const visible = React.useMemo(
    () => issues.filter((issue) => !ignored.has(wordFor(issue, text))),
    [issues, ignored, text, wordFor]
  )

  const { spelling, grammar, style } = React.useMemo(
    () => splitByCategory(visible),
    [visible]
  )

  const score = React.useMemo(
    () => (ran ? proofreadScore(text, visible) : EMPTY_SCORE),
    [ran, text, visible]
  )

  return {
    running,
    ran,
    error,
    spelling,
    grammar,
    style,
    score,
    ignored,
    run,
    apply,
    ignore,
    ignoreAll,
    text,
  }
}
