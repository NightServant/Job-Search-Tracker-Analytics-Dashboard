'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/core'
import { PanelSection } from '@/components/ui/panel-section'
import { cn } from '@/lib/utils'
import {
  outlineOf,
  paragraphCount,
  statsOf,
  type OutlineEntry,
} from './documentOutline'

/**
 * Word's Navigation Pane and its word count, in the left rail.
 *
 * WHAT THIS FILLS. The rail was a 280px column holding two tab buttons and
 * otherwise nothing, and Gabe has called the emptiness out twice. These are
 * the two things Word actually puts in that space, both read straight off the
 * editor with no service behind them.
 *
 * THE OUTLINE IS THE USEFUL HALF. A CV is all headings, and the thing you do
 * most while editing one is move between them; scrolling three pages to reach
 * the education section is the motion this removes. Clicking a row puts the
 * caret in that heading and scrolls it into view, which is exactly what
 * Word's pane does.
 *
 * IT RE-READS ON EVERY TRANSACTION rather than on a timer. An outline that
 * lags the document is worse than none -- you click "Experience" and land in
 * the section above it -- and the walk is over headings only, so it is cheap
 * enough to do on each change.
 */

function OutlineRow({
  entry,
  active,
  onSelect,
}: {
  entry: OutlineEntry
  active: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        title={entry.text}
        data-outline-row={entry.level}
        className={cn(
          'w-full truncate border-l-2 py-1.5 pr-2 text-left text-body-s transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30',
          active
            ? 'border-l-accent-default font-medium text-text-primary'
            : 'border-l-transparent text-text-secondary hover:border-l-border-default hover:text-text-primary'
        )}
        // Indent by DEPTH, which is normalised -- see documentOutline for why
        // a CV of all-h2 sections would otherwise render entirely indented.
        style={{ paddingLeft: `${0.75 + entry.depth * 0.75}rem` }}
      >
        {entry.text}
      </button>
    </li>
  )
}

export function DocumentNavigator({ editor }: { editor: Editor | null }) {
  // Re-read on every transaction: an outline that lags the document sends you
  // to the wrong section, which is worse than not having one.
  const [, force] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    if (!editor) return
    editor.on('transaction', force)
    editor.on('selectionUpdate', force)
    return () => {
      editor.off('transaction', force)
      editor.off('selectionUpdate', force)
    }
  }, [editor])

  const outline = outlineOf(editor)
  const stats = statsOf(editor?.getText() ?? '', paragraphCount(editor))

  // The heading the caret is currently inside: the last one at or before it.
  const caret = editor?.state.selection.from ?? 0
  const activePos = [...outline].reverse().find((entry) => entry.pos <= caret)?.pos

  const goTo = (entry: OutlineEntry) => {
    if (!editor) return
    editor.chain().focus().setTextSelection(entry.pos + 1).scrollIntoView().run()
  }

  return (
    <div className="flex flex-col gap-6" data-document-navigator>
      <PanelSection title="navigation" icon="Menu">
        {outline.length === 0 ? (
          <p className="text-body-s text-text-muted">
            no headings yet. apply a heading style and its sections appear here.
          </p>
        ) : (
          <ul className="flex flex-col">
            {outline.map((entry) => (
              <OutlineRow
                key={`${entry.pos}-${entry.text}`}
                entry={entry}
                active={entry.pos === activePos}
                onSelect={() => goTo(entry)}
              />
            ))}
          </ul>
        )}
      </PanelSection>

      <PanelSection title="statistics" icon="Info">
        <dl className="flex flex-col">
          {[
            ['words', stats.words.toLocaleString()],
            ['characters', stats.characters.toLocaleString()],
            ['without spaces', stats.charactersNoSpaces.toLocaleString()],
            ['paragraphs', stats.paragraphs.toLocaleString()],
            // Both are estimates and are labelled as such below rather than
            // presented as measurements the app cannot actually make.
            ['pages, about', String(stats.pages)],
            ['read time', stats.readingMinutes ? `${stats.readingMinutes} min` : '—'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-border-subtle py-1.5 last:border-b-0"
            >
              <dt className="text-body-s text-text-secondary">{label}</dt>
              <dd className="text-body-s tabular-nums text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="pt-2 text-body-s text-text-muted">
          pages and read time are estimates, at 500 words a page and 200 a minute.
        </p>
      </PanelSection>
    </div>
  )
}
