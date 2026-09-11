'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/core'
import { cn } from '@/lib/utils'
import { icons, type IconName } from '@/components/icons'

/**
 * The formatting ribbon, in Word's groups rather than one undifferentiated row.
 *
 * WHAT IT REPLACES: five buttons -- bold, italic, bullets, H1, H2 -- in a flat
 * `flex-wrap`. Everything here beyond those five was already installed;
 * StarterKit 3 ships underline, strike, ordered lists, blockquote, code,
 * horizontal rule and history, so this adds no dependency and no editor
 * configuration. It was simply never surfaced.
 *
 * GROUPED AND SEPARATED BY RULES, which is the whole reason it reads as a
 * ribbon rather than a toolbar. Word's groups are history / text / paragraph /
 * insert, and a hairline between them is what lets the eye find "the list
 * buttons" without reading every icon. The design system separates with
 * hairlines rather than boxes, so the ribbon gets that for free.
 *
 * RESPONSIVENESS IS BY DROPPING GROUPS, NOT BY WRAPPING. A wrapped ribbon
 * becomes two or three rows on a phone and eats the document it sits above --
 * on a 375px screen the sheet is the point and the toolbar is not. So the
 * groups carry a `priority`: text formatting is always present, paragraph
 * styling appears from `sm`, and history and insert from `md`. Everything
 * dropped is still reachable by keyboard shortcut, which is what makes
 * dropping it honest rather than lossy -- Ctrl/Cmd-Z and Ctrl/Cmd-B work at
 * every width because they are the editor's, not the toolbar's.
 *
 * ICON-ONLY WITH A REAL LABEL. Each button is an icon with `aria-label` and
 * `title`, so it is announced and hovers a name. Text labels for fourteen
 * commands would not fit any phone, and a ribbon of words is not a ribbon.
 * The two heading buttons keep their text because "H1" IS the icon.
 */

const BUTTON =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-[4px] border px-2 text-body-s ' +
  'transition-colors duration-(--duration-fast) active:scale-[0.97] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

interface Command {
  id: string
  label: string
  icon?: IconName
  text?: string
  run: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
  isDisabled?: (editor: Editor) => boolean
  shortcut?: string
}

interface Group {
  id: string
  /** Tailwind visibility, lowest breakpoint at which the group appears. */
  visibility: string
  commands: Command[]
}

/**
 * `focus()` BEFORE EVERY COMMAND, which is not decorative. Clicking a toolbar
 * button moves focus out of the document; without returning it first the
 * command applies to a selection the editor no longer considers current, and
 * on some of these it silently does nothing at all.
 */
const GROUPS: Group[] = [
  {
    id: 'history',
    // Last to appear: undo is Ctrl/Cmd-Z everywhere, so it is the least
    // costly thing to hide when space is short.
    visibility: 'hidden md:flex',
    commands: [
      {
        id: 'undo',
        label: 'undo',
        icon: 'RotateCcw',
        shortcut: '⌘Z',
        run: (editor) => editor.chain().focus().undo().run(),
        isDisabled: (editor) => !editor.can().undo(),
      },
      {
        id: 'redo',
        label: 'redo',
        icon: 'ArrowRight',
        shortcut: '⇧⌘Z',
        run: (editor) => editor.chain().focus().redo().run(),
        isDisabled: (editor) => !editor.can().redo(),
      },
    ],
  },
  {
    id: 'text',
    // ALWAYS VISIBLE. Bold and italic are what a CV actually needs at any
    // width; if only one group survives it is this one.
    visibility: 'flex',
    commands: [
      {
        id: 'bold',
        label: 'bold',
        text: 'B',
        shortcut: '⌘B',
        run: (editor) => editor.chain().focus().toggleBold().run(),
        isActive: (editor) => editor.isActive('bold'),
      },
      {
        id: 'italic',
        label: 'italic',
        text: 'I',
        shortcut: '⌘I',
        run: (editor) => editor.chain().focus().toggleItalic().run(),
        isActive: (editor) => editor.isActive('italic'),
      },
      {
        id: 'underline',
        label: 'underline',
        text: 'U',
        shortcut: '⌘U',
        run: (editor) => editor.chain().focus().toggleUnderline().run(),
        isActive: (editor) => editor.isActive('underline'),
      },
      {
        id: 'strike',
        label: 'strikethrough',
        text: 'S',
        run: (editor) => editor.chain().focus().toggleStrike().run(),
        isActive: (editor) => editor.isActive('strike'),
      },
    ],
  },
  {
    id: 'headings',
    visibility: 'flex',
    commands: [
      {
        id: 'h1',
        label: 'heading 1',
        text: 'H1',
        run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: (editor) => editor.isActive('heading', { level: 1 }),
      },
      {
        id: 'h2',
        label: 'heading 2',
        text: 'H2',
        run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: (editor) => editor.isActive('heading', { level: 2 }),
      },
      {
        id: 'h3',
        label: 'heading 3',
        text: 'H3',
        run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: (editor) => editor.isActive('heading', { level: 3 }),
      },
    ],
  },
  {
    id: 'paragraph',
    visibility: 'hidden sm:flex',
    commands: [
      {
        id: 'bullets',
        label: 'bulleted list',
        icon: 'Menu',
        run: (editor) => editor.chain().focus().toggleBulletList().run(),
        isActive: (editor) => editor.isActive('bulletList'),
      },
      {
        id: 'ordered',
        label: 'numbered list',
        text: '1.',
        run: (editor) => editor.chain().focus().toggleOrderedList().run(),
        isActive: (editor) => editor.isActive('orderedList'),
      },
      {
        id: 'quote',
        label: 'block quote',
        text: '❝',
        run: (editor) => editor.chain().focus().toggleBlockquote().run(),
        isActive: (editor) => editor.isActive('blockquote'),
      },
    ],
  },
  {
    id: 'insert',
    visibility: 'hidden md:flex',
    commands: [
      {
        id: 'code',
        label: 'inline code',
        icon: 'Code',
        run: (editor) => editor.chain().focus().toggleCode().run(),
        isActive: (editor) => editor.isActive('code'),
      },
      {
        id: 'rule',
        label: 'horizontal rule',
        text: '—',
        run: (editor) => editor.chain().focus().setHorizontalRule().run(),
      },
      {
        id: 'clear',
        label: 'clear formatting',
        icon: 'Close',
        run: (editor) => editor.chain().focus().unsetAllMarks().clearNodes().run(),
      },
    ],
  },
]

function ToolbarCommand({ command, editor }: { command: Command; editor: Editor | null }) {
  const Icon = command.icon ? icons[command.icon] : null
  const active = editor && command.isActive ? command.isActive(editor) : false
  const disabled = !editor || (command.isDisabled ? command.isDisabled(editor) : false)
  const title = command.shortcut ? `${command.label} (${command.shortcut})` : command.label

  return (
    <button
      type="button"
      aria-label={command.label}
      aria-pressed={command.isActive ? active : undefined}
      title={title}
      disabled={disabled}
      onClick={() => editor && command.run(editor)}
      className={cn(
        BUTTON,
        active
          ? 'border-accent-default bg-accent-default text-accent-on-accent'
          : 'border-border-default bg-bg-canvas text-text-secondary hover:bg-bg-inset'
      )}
    >
      {Icon ? <Icon size={14} aria-hidden /> : <span aria-hidden>{command.text}</span>}
    </button>
  )
}

export function DocumentToolbar({ editor }: { editor: Editor | null }) {
  return (
    <div
      role="toolbar"
      aria-label="formatting"
      aria-controls="document-sheet"
      className="flex items-center gap-1"
      data-document-toolbar
    >
      {GROUPS.map((group, index) => (
        <div
          key={group.id}
          className={cn(
            'items-center gap-1',
            group.visibility,
            // A hairline between groups, not a box around them.
            index > 0 && 'sm:ml-1 sm:border-l sm:border-border-subtle sm:pl-2'
          )}
        >
          {group.commands.map((command) => (
            <ToolbarCommand key={command.id} command={command} editor={editor} />
          ))}
        </div>
      ))}
    </div>
  )
}
