import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { DocumentToolbar } from '../DocumentToolbar'

/**
 * Driven against a REAL Tiptap editor rather than a mock, because the thing
 * worth testing is that each button actually changes the document. A mocked
 * editor would assert that a click calls a spy, which is true of a toolbar
 * wired to the wrong commands as well as a right one.
 */
function editorWith(html = '<p>hello world</p>') {
  return new Editor({ content: html, extensions: [StarterKit] })
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

  it('surfaces commands StarterKit always had but the old toolbar never showed', async () => {
    // The previous ribbon was bold/italic/bullets/H1/H2. Everything below was
    // installed and unreachable, which is the point of this test: it fails if
    // a command is dropped from the ribbon rather than from the editor.
    editor = editorWith()
    render(<DocumentToolbar editor={editor} />)

    for (const name of [
      'underline',
      'strikethrough',
      'numbered list',
      'block quote',
      'heading 3',
      'inline code',
      'horizontal rule',
      'clear formatting',
      'undo',
      'redo',
    ]) {
      expect(screen.getByRole('button', { name }), name).toBeInTheDocument()
    }
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
    const groups = [...container.querySelectorAll('[role="toolbar"] > div')]

    const always = groups.filter((g) => !g.className.includes('hidden'))
    const labels = always.flatMap((g) =>
      [...g.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    )
    expect(labels).toEqual(
      expect.arrayContaining(['bold', 'italic', 'heading 1', 'heading 2'])
    )

    // Undo is hidden on the smallest screens; it is ⌘Z regardless.
    const undo = screen.getByRole('button', { name: 'undo' })
    expect(undo.getAttribute('title')).toContain('⌘Z')
    expect(undo.closest('div')?.className).toContain('hidden')
  })

  it('is a labelled toolbar that points at the sheet it formats', () => {
    editor = editorWith()
    render(<DocumentToolbar editor={editor} />)
    const toolbar = screen.getByRole('toolbar', { name: 'formatting' })
    expect(toolbar).toHaveAttribute('aria-controls', 'document-sheet')
  })
})
