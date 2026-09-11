import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Editor } from '@tiptap/core'
import { DocumentToolbar } from '../DocumentToolbar'
import { WORD_EDITOR_EXTENSIONS } from '../editorExtensions'

/**
 * Driven against a REAL Tiptap editor rather than a mock, because the thing
 * worth testing is that each button actually changes the document. A mocked
 * editor would assert that a click calls a spy, which is true of a toolbar
 * wired to the wrong commands as well as a right one.
 */
function editorWith(html = '<p>hello world</p>') {
  // THE SAME EXTENSIONS THE REAL EDITOR SHIPS. A StarterKit-only editor
  // here made half the ribbon's commands 'not a function'.
  return new Editor({ content: html, extensions: WORD_EDITOR_EXTENSIONS })
}

let editor: Editor | null = null
afterEach(() => {
  editor?.destroy()
  editor = null
  cleanup()
})

describe('the formatting ribbon', () => {
  it('applies the mark the button names, to the real document', async () => {
    editor = editorWith()
    editor.commands.selectAll()
    render(<DocumentToolbar editor={editor} />)

    await userEvent.click(screen.getByRole('button', { name: 'bold' }))
    expect(editor.isActive('bold')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'underline' }))
    expect(editor.isActive('underline')).toBe(true)
  })

  it('carries Word\'s Home commands, including the ones that needed extensions', async () => {
    // Half of these had no extension installed before 2026-09-11, so the
    // ribbon could not have offered them honestly. This fails if a command is
    // dropped from the ribbon OR if its extension is removed from the editor.
    editor = editorWith()
    render(<DocumentToolbar editor={editor} />)

    for (const name of [
      'underline',
      'strikethrough',
      'subscript',
      'superscript',
      'highlight',
      'numbered list',
      'align left',
      'align centre',
      'align right',
      'justify',
      'block quote',
      'inline code',
      'horizontal rule',
      'clear formatting',
      'undo',
      'redo',
    ]) {
      expect(screen.getByRole('button', { name }), name).toBeInTheDocument()
    }
  })

  it('offers the two controls Word puts first, which the old ribbon lacked entirely', () => {
    // Font face and size are the most-reached-for controls in a word
    // processor and simply were not there: `@tiptap/extension-text-style` was
    // not installed, so there was nothing to call.
    editor = editorWith()
    render(<DocumentToolbar editor={editor} />)
    expect(screen.getByLabelText('font')).toBeInTheDocument()
    expect(screen.getByLabelText('font size')).toBeInTheDocument()
    expect(screen.getByLabelText('paragraph style')).toBeInTheDocument()
  })

  it('applies a font family to the real document', async () => {
    editor = editorWith()
    editor.commands.selectAll()
    render(<DocumentToolbar editor={editor} />)

    await userEvent.selectOptions(screen.getByLabelText('font'), 'Georgia, serif')
    // Asserted on the DOCUMENT, not on the mark under the cursor: `focus()`
    // moves the selection, so `getAttributes` can read a caret that is no
    // longer inside the text that changed.
    expect(editor.getHTML()).toContain('Georgia, serif')
  })

  it('names every group, which is what makes a ribbon findable', () => {
    // Word prints its group captions under each band, and they are the
    // difference between "the list buttons" being a place and being a shape
    // you have to recognise.
    editor = editorWith()
    const { container } = render(<DocumentToolbar editor={editor} />)
    const groups = [...container.querySelectorAll('[data-ribbon-group]')].map((g) =>
      g.getAttribute('data-ribbon-group')
    )
    // Word's five, not the nine the first attempt printed across the bar.
    expect(groups).toEqual(
      expect.arrayContaining(['styles', 'typeface', 'font', 'paragraph'])
    )
    expect(groups.length).toBeLessThanOrEqual(6)
  })

  it('reflects the cursor position, not just the last click', async () => {
    // `aria-pressed` has to track the DOCUMENT. A toolbar that only toggles
    // its own state lies the moment the caret moves into different text.
    editor = editorWith('<p><strong>bold text</strong></p>')
    editor.commands.selectAll()
    const { rerender } = render(<DocumentToolbar editor={editor} />)
    rerender(<DocumentToolbar editor={editor} />)

    expect(screen.getByRole('button', { name: 'bold' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('disables undo when there is nothing to undo', () => {
    editor = editorWith()
    render(<DocumentToolbar editor={editor} />)
    expect(screen.getByRole('button', { name: 'undo' })).toBeDisabled()
  })

  it('renders every control disabled, not absent, before the editor exists', () => {
    // The editor mounts asynchronously. A toolbar that renders nothing until
    // then makes the whole chrome jump once it arrives.
    render(<DocumentToolbar editor={null} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(10)
    for (const button of buttons) expect(button).toBeDisabled()
  })

  it('keeps text formatting at every width, and hides only what a shortcut covers', () => {
    // RESPONSIVENESS IS ASSERTED ON THE CLASSES because jsdom has no viewport.
    // The rule being protected: bold/italic and the headings are never hidden,
    // and anything that IS hidden has a keyboard shortcut, so narrow screens
    // lose a button rather than a capability.
    editor = editorWith()
    const { container } = render(<DocumentToolbar editor={editor} />)
    const groups = [...container.querySelectorAll('[data-ribbon-group]')]

    const always = groups.filter((g) => !g.className.includes('hidden'))
    const labels = always.flatMap((g) =>
      [...g.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    )
    // Bold and italic survive at any width; the style select does too, because
    // heading level is the single most-used control in a CV.
    expect(labels).toEqual(expect.arrayContaining(['bold', 'italic']))
    expect(screen.getByLabelText('paragraph style')).toBeInTheDocument()

    // Undo is hidden on the smallest screens; it is ⌘Z regardless. Scoped to
    // the GROUP, because the button's nearest div is the row inside it.
    const undo = screen.getByRole('button', { name: 'undo' })
    expect(undo.getAttribute('title')).toContain('⌘Z')
    expect(undo.closest('[data-ribbon-group]')?.className).toContain('hidden')
  })

  it('is a labelled toolbar that points at the sheet it formats', () => {
    editor = editorWith()
    render(<DocumentToolbar editor={editor} />)
    const toolbar = screen.getByRole('toolbar', { name: 'formatting' })
    expect(toolbar).toHaveAttribute('aria-controls', 'document-sheet')
  })
})
