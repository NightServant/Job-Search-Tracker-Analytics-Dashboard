'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/core'
import { cn } from '@/lib/utils'
import { icons } from '@/components/icons'
import { Select } from '@/components/ui/select'
import {
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_SPACINGS,
  RIBBON_GROUPS,
  STYLE_PRESETS,
  currentFontPx,
  currentLineHeight,
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

/**
 * The ribbon's dropdowns are `ui/select`, and the height is the only thing
 * this has to say about them.
 *
 * NO NATIVE `<select>` IN HERE ANY MORE. Three of them survived the 2026-09-05
 * move because they are small and the ribbon is dense -- but the option list
 * of a native select is drawn by macOS, so clicking font or size in a Word
 * ribbon rendered in black, white and orange opened a dark grey system panel
 * with system checkmarks. `ui/select` already owns that popup; these were the
 * last three controls that did not use it.
 *
 * The trigger ships at `h-10` for form rows. The ribbon runs at 28px, so each
 * one is handed the row height and the tighter padding, and wrapped in a fixed
 * width because the component is `w-full` by design.
 */
const TRIGGER = 'h-7 rounded-[4px] px-2 pr-2 text-body-s'

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
        'flex-col justify-center gap-1.5 px-4',
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
      className="flex min-w-0 items-stretch overflow-x-auto"
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
          <div className="w-[128px]">
            {/* THE PLACEHOLDER IS THE DOCUMENT'S OWN VALUE (found in review,
                2026-09-13). `Select` shows `placeholder` whenever `value`
                matches no item, and its default is the word `select` -- so a
                caret in imported text set in a face this list does not carry
                (mammoth hands back whatever the .docx declared) made the
                control read "select", which looks like an instruction rather
                than a report. Naming the face is the truth: this ribbon cannot
                offer it as an option, but it can say what it is. */}
            <Select
              aria-label="font"
              value={currentFamily}
              placeholder={currentFamily ? currentFamily.split(',')[0].replace(/["']/g, '') : '(default)'}
              disabled={!editor}
              onValueChange={(value) =>
                value
                  ? editor?.chain().focus().setFontFamily(value).run()
                  : editor?.chain().focus().unsetFontFamily().run()
              }
              items={[{ value: '', label: '(default)' }, ...FONT_FAMILIES]}
              className={TRIGGER}
            />
          </div>
          <div className="w-[76px]">
            {/* Same reason as the face above: `FONT_SIZES` is Word's list and
                an imported document is under no obligation to use it. 13pt and
                11.5pt are ordinary in a .docx; both would have read "select". */}
            <Select
              aria-label="font size"
              value={String(fontPx)}
              placeholder={String(fontPx)}
              disabled={!editor}
              onValueChange={(value) => editor?.chain().focus().setFontSize(`${value}px`).run()}
              items={FONT_SIZES.map((size) => ({ value: size, label: size }))}
              className={TRIGGER}
            />
          </div>
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
          {/* `spacing` rather than the old bare ↕, which was a glyph chosen to
              fit a 52px native control and read as nothing at all to a screen
              reader. It means the paragraph's own spacing, so choosing it
              unsets the mark rather than setting a number. */}
          <div className="w-[76px]">
            <Select
              aria-label="line spacing"
              value={currentLineHeight(editor)}
              disabled={!editor}
              onValueChange={(value) =>
                value
                  ? editor?.chain().focus().setLineHeight(value).run()
                  : editor?.chain().focus().unsetLineHeight().run()
              }
              items={[
                { value: '', label: 'spacing' },
                ...LINE_SPACINGS.map((value) => ({ value, label: value })),
              ]}
              className={TRIGGER}
            />
          </div>
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
