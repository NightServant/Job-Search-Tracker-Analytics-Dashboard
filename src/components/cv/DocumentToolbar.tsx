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
  type RibbonCommand,
} from './ribbonCommands'

/**
 * Word's Home ribbon, under this system's rules.
 *
 * WHAT WAS WRONG WITH THE LAST ONE (Gabe, 2026-09-11: "still not implemented
 * properly... 1v1 replica"): it was fourteen bare buttons in a row. Word's
 * ribbon is not a row of buttons -- it is NAMED GROUPS, and the two controls
 * people reach for first, the font face and its size, were not there at all
 * because the extensions backing them were never installed.
 *
 * SO THE GROUPS ARE WORD'S, IN WORD'S ORDER, with Word's group captions
 * printed under each band. `ribbonCommands` holds that list; this file is only
 * how it draws.
 *
 * THE DESIGN SYSTEM TAKES THE CHROME AND LEAVES THE STRUCTURE. Word raises its
 * buttons, bands its groups in gradients and boxes its style gallery; none of
 * that survives, and none of it is what makes a ribbon readable. Hairline
 * rules separate groups where Word draws a separator, every control is capped
 * at 4px, nothing has a shadow, and the accent marks the ACTIVE format only --
 * which is precisely the "current action" the accent is reserved for. An
 * active button is the one place a filled block is correct here, because it is
 * a pressed control and not a status.
 *
 * SELECTS, NOT DROPDOWN MENUS, for font/size/style/spacing. A native select is
 * one tap on a phone, is keyboard-navigable for free, and reports its value
 * without a popover -- and the value IS the information here ("this paragraph
 * is Calibri 11"). A custom menu would have to reimplement all of that to look
 * marginally more like Word.
 */

const CONTROL =
  'h-8 rounded-[4px] border border-border-default bg-bg-canvas px-1.5 text-body-s ' +
  'text-text-primary transition-colors duration-(--duration-fast) ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

const BUTTON =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-[4px] border px-2 ' +
  'text-body-s transition-colors duration-(--duration-fast) active:scale-[0.97] ' +
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
      {Glyph ? <Glyph /> : Icon ? <Icon size={14} aria-hidden /> : <span aria-hidden>{command.text}</span>}
    </button>
  )
}

/** A group of controls with Word's caption under it. */
function Group({
  label,
  visibility,
  first,
  children,
}: {
  label: string
  visibility: string
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      data-ribbon-group={label}
      className={cn(
        'flex-col items-center gap-1 px-2.5',
        visibility,
        // A rule between groups, where Word draws its separator.
        !first && 'border-l border-border-subtle'
      )}
    >
      <div className="flex items-center gap-1">{children}</div>
      {/* WORD PRINTS THE GROUP NAME UNDER THE BAND, and it is what turns a row
          of glyphs into findable groups -- "the list buttons" becomes a place
          rather than a shape you have to recognise. */}
      <span className="text-label-caps uppercase leading-none text-text-muted">{label}</span>
    </div>
  )
}

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

  const currentFamily =
    (editor?.getAttributes('textStyle').fontFamily as string | undefined) ?? ''
  const currentSize = String(
    (editor?.getAttributes('textStyle').fontSize as string | undefined) ?? ''
  ).replace('px', '')
  const currentStyle = STYLE_PRESETS.find((s) => editor && s.isActive(editor))?.id ?? 'normal'

  return (
    <div
      role="toolbar"
      aria-label="formatting"
      aria-controls="document-sheet"
      // `min-w-0` + `overflow-x-auto` so a ribbon wider than the column
      // SCROLLS rather than being clipped by it, which is what the nine-group
      // version did -- the last band was simply cut off with no way to reach
      // it. Wrapping is not the alternative: a three-row ribbon eats the
      // document it sits above.
      className="flex min-w-0 items-stretch overflow-x-auto"
      data-document-toolbar
    >
      {/* STYLES FIRST at this width rather than last as Word has it: the
          heading level is the single most-used control in a CV, and a ribbon
          that scrolls should put its most-used control where it cannot. */}
      <Group label="styles" visibility="flex" first>
        <select
          aria-label="paragraph style"
          value={currentStyle}
          disabled={!editor}
          onChange={(event) => {
            const preset = STYLE_PRESETS.find((s) => s.id === event.target.value)
            if (preset && editor) preset.apply(editor)
          }}
          className={cn(CONTROL, 'w-[104px]')}
        >
          {STYLE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </Group>

      <Group label="typeface" visibility="hidden md:flex">
        <select
          aria-label="font"
          value={currentFamily}
          disabled={!editor}
          onChange={(event) =>
            event.target.value
              ? editor?.chain().focus().setFontFamily(event.target.value).run()
              : editor?.chain().focus().unsetFontFamily().run()
          }
          className={cn(CONTROL, 'w-[116px]')}
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
          value={currentSize}
          disabled={!editor}
          onChange={(event) =>
            event.target.value
              ? editor?.chain().focus().setFontSize(`${event.target.value}px`).run()
              : editor?.chain().focus().unsetFontSize().run()
          }
          className={cn(CONTROL, 'w-[58px]')}
        >
          <option value="">–</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        {/* LINE SPACING SITS WITH THE FACE AND SIZE rather than in a band of
            its own. Word files it under Paragraph, but it is a select and the
            other two selects are here; a lone dropdown in its own captioned
            group is what made the first ribbon nine bands wide. */}
        <select
          aria-label="line spacing"
          disabled={!editor}
          defaultValue=""
          onChange={(event) =>
            event.target.value
              ? editor?.chain().focus().setLineHeight(event.target.value).run()
              : editor?.chain().focus().unsetLineHeight().run()
          }
          className={cn(CONTROL, 'w-[58px]')}
        >
          <option value="">↕</option>
          {LINE_SPACINGS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Group>

      {RIBBON_GROUPS.map((group) => (
        <Group key={group.id} label={group.label} visibility={group.visibility}>
          {group.commands.map((command) => (
            <CommandButton key={command.id} command={command} editor={editor} />
          ))}
        </Group>
      ))}

    </div>
  )
}
