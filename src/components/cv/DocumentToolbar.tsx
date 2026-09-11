'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/core'
import { cn } from '@/lib/utils'
import { icons } from '@/components/icons'
import {
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_SPACINGS,
  RIBBON_GROUPS,
  STYLE_PRESETS,
  currentFontPx,
  type RibbonCommand,
} from './ribbonCommands'

/**
 * Word's Home ribbon.
 *
 * THE THIRD ATTEMPT, and the two before it missed the same thing: Word's
 * ribbon is TWO ROWS PER GROUP with a STYLES GALLERY, not one row of buttons
 * with a style dropdown. Gabe put the reference on screen twice before this
 * landed, so the corrections are worth recording rather than quietly fixing:
 *
 *   ATTEMPT 1 -- fourteen bare buttons in a single flat row. No font, no
 *   size, no groups at all.
 *   ATTEMPT 2 -- groups, but NINE of them, each captioned, still one row.
 *   That overflowed a 1200px column and clipped the last band, and Word has
 *   no "script" or "spacing" group to begin with.
 *   THIS ONE -- Font and Paragraph as two stacked rows, a real Styles
 *   gallery, no captions, three bands.
 *
 * THE TWO-ROW SHAPE IS ALSO WHAT MAKES IT FIT. The same controls in one line
 * needed ~1200px; stacked they need about half that, at the height the styles
 * gallery already sets.
 *
 * NO GROUP CAPTIONS, because the reference has none -- bands are told apart by
 * the vertical rule between them, which is what this design system reaches for
 * anyway.
 *
 * THE GALLERY SHOWS EACH STYLE IN ITS OWN TYPE, which is the one thing a
 * dropdown cannot do and the entire reason Word spends that much ribbon on it.
 * The active card takes an accent BORDER rather than a fill: it marks the
 * current action without turning a state into a filled block.
 */

const CONTROL =
  'h-7 rounded-[4px] border border-border-default bg-bg-canvas px-1 text-body-s ' +
  'text-text-primary transition-colors duration-(--duration-fast) ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

const BUTTON =
  'inline-flex h-7 min-w-7 items-center justify-center rounded-[4px] border px-1.5 ' +
  'text-body-s leading-none transition-colors duration-(--duration-fast) active:scale-[0.97] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

function CommandButton({ command, editor }: { command: RibbonCommand; editor: Editor | null }) {
  const Icon = command.icon ? icons[command.icon] : null
  const Glyph = command.glyph
  const active = editor && command.isActive ? command.isActive(editor) : false
  const disabled = !editor || (command.isDisabled ? command.isDisabled(editor) : false)

  return (
    <button
      type="button"
      aria-label={command.label}
      aria-pressed={command.isActive ? active : undefined}
      title={command.shortcut ? `${command.label} (${command.shortcut})` : command.label}
      disabled={disabled}
      onClick={() => editor && command.run(editor)}
      className={cn(
        BUTTON,
        active
          ? 'border-accent-default bg-accent-default text-accent-on-accent'
          : 'border-border-default bg-bg-canvas text-text-secondary hover:bg-bg-inset'
      )}
    >
      {Glyph ? (
        <Glyph />
      ) : Icon ? (
        <Icon size={13} aria-hidden />
      ) : (
        <span aria-hidden>{command.text}</span>
      )}
    </button>
  )
}

/** A band of the ribbon: stacked rows, with a rule before it. */
function Band({
  id,
  visibility,
  first,
  grow,
  children,
}: {
  id: string
  visibility: string
  first?: boolean
  /** Takes the remaining width. Exactly one band should. */
  grow?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      data-ribbon-group={id}
      className={cn(
        'flex-col justify-center gap-1 px-3',
        grow ? 'min-w-0 flex-1' : 'shrink-0',
        visibility,
        !first && 'border-l border-border-subtle'
      )}
    >
      {children}
    </div>
  )
}

const ROW = 'flex items-center gap-1'

export function DocumentToolbar({ editor }: { editor: Editor | null }) {
  // Re-render on selection and document change, so every `isActive` below
  // reflects the CARET rather than the last button anyone pressed. Without
  // this a ribbon lies the moment you click into differently formatted text.
  const [, force] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    if (!editor) return
    editor.on('selectionUpdate', force)
    editor.on('transaction', force)
    return () => {
      editor.off('selectionUpdate', force)
      editor.off('transaction', force)
    }
  }, [editor])

  const currentFamily = (editor?.getAttributes('textStyle').fontFamily as string | undefined) ?? ''
  const fontPx = currentFontPx(editor)
  const history = RIBBON_GROUPS[0]
  const [fontRow, markRow] = RIBBON_GROUPS[1].rows
  const paragraph = RIBBON_GROUPS[2]

  return (
    <div
      role="toolbar"
      aria-label="formatting"
      aria-controls="document-sheet"
      // Scrolls rather than clips when the column is narrower than the bands.
      // Wrapping is not the alternative: a ribbon that grows to four rows eats
      // the document it sits above.
      className="flex min-w-0 items-stretch overflow-x-auto py-1"
      data-document-toolbar
    >
      <Band id="history" visibility={history.visibility} first>
        {history.rows.map((row, index) => (
          <div key={index} className={ROW}>
            {row.map((command) => (
              <CommandButton key={command.id} command={command} editor={editor} />
            ))}
          </div>
        ))}
      </Band>

      {/* FONT: the selects and size stepping above, the marks below --
          Word's arrangement exactly. */}
      <Band id="font" visibility="flex">
        <div className={ROW}>
          <select
            aria-label="font"
            value={currentFamily}
            disabled={!editor}
            onChange={(event) =>
              event.target.value
                ? editor?.chain().focus().setFontFamily(event.target.value).run()
                : editor?.chain().focus().unsetFontFamily().run()
            }
            className={cn(CONTROL, 'w-[124px]')}
          >
            <option value="">(default)</option>
            {FONT_FAMILIES.map((font) => (
              <option key={font.label} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <select
            aria-label="font size"
            value={String(fontPx)}
            disabled={!editor}
            onChange={(event) =>
              editor?.chain().focus().setFontSize(`${event.target.value}px`).run()
            }
            className={cn(CONTROL, 'w-[52px]')}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {fontRow.map((command) => (
            <CommandButton key={command.id} command={command} editor={editor} />
          ))}
        </div>
        <div className={ROW}>
          {markRow.map((command) => (
            <CommandButton key={command.id} command={command} editor={editor} />
          ))}
        </div>
      </Band>

      {/* PARAGRAPH: lists and indents above, alignment below. */}
      <Band id="paragraph" visibility={paragraph.visibility}>
        <div className={ROW}>
          {paragraph.rows[0].map((command) => (
            <CommandButton key={command.id} command={command} editor={editor} />
          ))}
        </div>
        <div className={ROW}>
          {paragraph.rows[1].map((command) => (
            <CommandButton key={command.id} command={command} editor={editor} />
          ))}
          <select
            aria-label="line spacing"
            disabled={!editor}
            defaultValue=""
            onChange={(event) =>
              event.target.value
                ? editor?.chain().focus().setLineHeight(event.target.value).run()
                : editor?.chain().focus().unsetLineHeight().run()
            }
            className={cn(CONTROL, 'w-[52px]')}
          >
            <option value="">↕</option>
            {LINE_SPACINGS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </Band>

      {/* STYLES: the gallery, spanning the band's height as Word's does. */}
      {/* THE GALLERY TAKES THE REST OF THE BAR (Gabe, 2026-09-11: "toolbar has
          unused space at the right side"). It was capped at a fixed width,
          which left 341px empty at 1440 and 101px at 1200 -- measured, not
          guessed. Growing fills that AND is what Word does: a wider window
          shows more style cards rather than more blank ribbon. It still
          scrolls internally, so a narrow column shows fewer cards instead of
          pushing the other bands off. */}
      <Band id="styles" visibility="hidden lg:flex" grow>
        <div
          role="group"
          aria-label="styles"
          className="flex h-full items-center gap-1 overflow-x-auto"
        >
          {STYLE_PRESETS.map((preset) => {
            const active = editor ? preset.isActive(editor) : false
            return (
              <button
                key={preset.id}
                type="button"
                aria-label={preset.label}
                aria-pressed={active}
                title={preset.label}
                disabled={!editor}
                onClick={() => editor && preset.apply(editor)}
                data-style-card={preset.id}
                className={cn(
                  'flex h-[46px] w-[76px] shrink-0 flex-col items-center justify-center gap-1',
                  'rounded-[4px] border px-1 transition-colors duration-(--duration-fast)',
                  'active:scale-[0.98] focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-accent-default/30',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  active
                    ? 'border-accent-default bg-bg-surface'
                    : 'border-border-default bg-bg-canvas hover:bg-bg-inset'
                )}
              >
                {/* THE SAMPLE, SET IN THE STYLE IT APPLIES. This is the whole
                    reason the gallery is cards and not a dropdown. */}
                <span aria-hidden className={cn('leading-none text-text-primary', preset.preview)}>
                  AaBbCc
                </span>
                <span className="w-full truncate text-center text-[9px] leading-none text-text-muted">
                  {preset.label}
                </span>
              </button>
            )
          })}
        </div>
      </Band>
    </div>
  )
}
