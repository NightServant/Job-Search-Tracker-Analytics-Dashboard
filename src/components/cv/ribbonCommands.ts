import type { ComponentType } from 'react'
import type { Editor } from '@tiptap/core'
import type { IconName } from '@/components/icons'
import {
  AlignCenterGlyph,
  AlignLeftGlyph,
  AlignRightGlyph,
  BulletListGlyph,
  HighlightGlyph,
  JustifyGlyph,
  OrderedListGlyph,
} from './ribbonGlyphs'

/**
 * Word's Home tab, as data.
 *
 * THE GROUPS ARE WORD'S OWN, in Word's order: Styles, Font, Paragraph,
 * Insert, with Undo ahead of them. FIVE, NOT NINE -- the first attempt split
 * script, align and spacing into bands of their own, which printed nine
 * captions across the bar, overflowed it at desktop width and clipped the
 * last group. Word does not have a "script" group; sub/superscript live in
 * Font and alignment lives in Paragraph, which is both correct and what makes
 * the row fit.
 *
 * WHAT THE DESIGN SYSTEM CHANGES, AND WHAT IT DOES NOT. Word's ribbon is
 * chrome-heavy: raised buttons, gradient group bands, a boxed style gallery.
 * None of that survives here, and none of it is what makes a ribbon legible.
 * What does survive is the STRUCTURE -- the same commands, in the same groups,
 * in the same order, with a rule between groups where Word draws a separator.
 * Buttons are hairline-bordered and square-ish at the 4px cap, there are no
 * shadows, and the accent marks the ACTIVE format and nothing else, because
 * "the current action" is exactly what the accent is reserved for.
 *
 * ICON-ONLY WITH A REAL NAME. Every button carries `aria-label` and a `title`
 * with its shortcut, because a ribbon of words is not a ribbon and an
 * unlabelled glyph is not a control. The letter buttons (B, I, U, H1) keep
 * their text: for those the letter IS the icon, exactly as in Word.
 *
 * `focus()` BEFORE EVERY COMMAND is not decorative. Clicking a toolbar button
 * moves focus out of the document; without returning it first the command
 * applies to a selection the editor no longer considers current, and several
 * of these silently do nothing at all.
 */

export interface RibbonCommand {
  id: string
  label: string
  /** Rendered when there is no icon: the letter IS the control, as in Word. */
  text?: string
  icon?: IconName
  /** A drawn mark, for the things the icon set has no word for. */
  glyph?: ComponentType
  shortcut?: string
  run: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
  isDisabled?: (editor: Editor) => boolean
}

export interface RibbonGroup {
  id: string
  /** Word prints a group name under each band; this is that name. */
  label: string
  /**
   * Lowest breakpoint at which the group appears.
   *
   * RESPONSIVENESS IS DROPPING GROUPS, NOT WRAPPING ROWS: on a phone the sheet
   * is the point, and a three-row ribbon eats the document it sits above.
   * Font is never dropped; everything droppable has a keyboard shortcut, so a
   * narrow screen loses a button and not a capability.
   */
  visibility: string
  commands: RibbonCommand[]
}

/** Word's own default face list, trimmed to what a CV is ever set in. */
export const FONT_FAMILIES = [
  { label: 'Aptos', value: 'Aptos, Calibri, system-ui, sans-serif' },
  { label: 'Calibri', value: 'Calibri, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Garamond', value: 'Garamond, Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
]

/** Word's size dropdown. */
export const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36']

/** Word's Styles gallery, as the headings this editor actually has. */
export const STYLE_PRESETS = [
  { id: 'normal', label: 'Normal', apply: (e: Editor) => e.chain().focus().setParagraph().run(), isActive: (e: Editor) => e.isActive('paragraph') },
  { id: 'h1', label: 'Title', apply: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 1 }) },
  { id: 'h2', label: 'Heading 1', apply: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 2 }) },
  { id: 'h3', label: 'Heading 2', apply: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 3 }) },
  { id: 'quote', label: 'Quote', apply: (e: Editor) => e.chain().focus().toggleBlockquote().run(), isActive: (e: Editor) => e.isActive('blockquote') },
]

export const LINE_SPACINGS = ['1', '1.15', '1.5', '2']

export const RIBBON_GROUPS: RibbonGroup[] = [
  {
    id: 'undo',
    label: 'undo',
    // Dropped first: undo is Cmd-Z everywhere, so it is the cheapest to hide.
    visibility: 'hidden lg:flex',
    commands: [
      { id: 'undo', label: 'undo', icon: 'RotateCcw', shortcut: '⌘Z', run: (e) => e.chain().focus().undo().run(), isDisabled: (e) => !e.can().undo() },
      { id: 'redo', label: 'redo', icon: 'ArrowRight', shortcut: '⇧⌘Z', run: (e) => e.chain().focus().redo().run(), isDisabled: (e) => !e.can().redo() },
    ],
  },
  {
    id: 'font',
    label: 'font',
    // NEVER HIDDEN. If one group survives at 320px it is this one.
    visibility: 'flex',
    commands: [
      { id: 'bold', label: 'bold', text: 'B', shortcut: '⌘B', run: (e) => e.chain().focus().toggleBold().run(), isActive: (e) => e.isActive('bold') },
      { id: 'italic', label: 'italic', text: 'I', shortcut: '⌘I', run: (e) => e.chain().focus().toggleItalic().run(), isActive: (e) => e.isActive('italic') },
      { id: 'underline', label: 'underline', text: 'U', shortcut: '⌘U', run: (e) => e.chain().focus().toggleUnderline().run(), isActive: (e) => e.isActive('underline') },
      { id: 'strike', label: 'strikethrough', text: 'S', run: (e) => e.chain().focus().toggleStrike().run(), isActive: (e) => e.isActive('strike') },
      { id: 'sub', label: 'subscript', text: 'X₂', run: (e) => e.chain().focus().toggleSubscript().run(), isActive: (e) => e.isActive('subscript') },
      { id: 'sup', label: 'superscript', text: 'X²', run: (e) => e.chain().focus().toggleSuperscript().run(), isActive: (e) => e.isActive('superscript') },
      { id: 'highlight', label: 'highlight', glyph: HighlightGlyph, run: (e) => e.chain().focus().toggleHighlight().run(), isActive: (e) => e.isActive('highlight') },
      { id: 'clear', label: 'clear formatting', icon: 'Close', run: (e) => e.chain().focus().unsetAllMarks().clearNodes().run() },
    ],
  },
  {
    id: 'paragraph',
    label: 'paragraph',
    visibility: 'hidden sm:flex',
    commands: [
      { id: 'bullets', label: 'bulleted list', glyph: BulletListGlyph, run: (e) => e.chain().focus().toggleBulletList().run(), isActive: (e) => e.isActive('bulletList') },
      { id: 'ordered', label: 'numbered list', glyph: OrderedListGlyph, run: (e) => e.chain().focus().toggleOrderedList().run(), isActive: (e) => e.isActive('orderedList') },
      { id: 'left', label: 'align left', glyph: AlignLeftGlyph, run: (e) => e.chain().focus().setTextAlign('left').run(), isActive: (e) => e.isActive({ textAlign: 'left' }) },
      { id: 'center', label: 'align centre', glyph: AlignCenterGlyph, run: (e) => e.chain().focus().setTextAlign('center').run(), isActive: (e) => e.isActive({ textAlign: 'center' }) },
      { id: 'right', label: 'align right', glyph: AlignRightGlyph, run: (e) => e.chain().focus().setTextAlign('right').run(), isActive: (e) => e.isActive({ textAlign: 'right' }) },
      { id: 'justify', label: 'justify', glyph: JustifyGlyph, run: (e) => e.chain().focus().setTextAlign('justify').run(), isActive: (e) => e.isActive({ textAlign: 'justify' }) },
    ],
  },
  {
    id: 'insert',
    label: 'insert',
    visibility: 'hidden xl:flex',
    commands: [
      { id: 'quote', label: 'block quote', text: '❝', run: (e) => e.chain().focus().toggleBlockquote().run(), isActive: (e) => e.isActive('blockquote') },
      { id: 'code', label: 'inline code', icon: 'Code', run: (e) => e.chain().focus().toggleCode().run(), isActive: (e) => e.isActive('code') },
      { id: 'rule', label: 'horizontal rule', text: '—', run: (e) => e.chain().focus().setHorizontalRule().run() },
    ],
  },
]
