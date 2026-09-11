import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { BLOCK_SEPARATOR, buildOffsetMap, toPosition, toRange } from '../editorOffsets'

function editorWith(html: string) {
  return new Editor({ content: html, extensions: [StarterKit] })
}

describe('buildOffsetMap', () => {
  it('produces exactly the string the checker will be sent', () => {
    // THE INVARIANT EVERYTHING ELSE RESTS ON. The text measured here and the
    // text posted to GrammarBot must be one string; if they differ by even a
    // newline, every offset past that point addresses the wrong character.
    for (const html of [
      '<p>One paragraph.</p>',
      '<h1>Title</h1><p>Body text.</p>',
      '<h1>Title</h1><p>First.</p><p>Second.</p>',
      '<p>Before</p><ul><li>alpha</li><li>beta</li></ul><p>After</p>',
      '<p>With <strong>bold</strong> inside.</p>',
    ]) {
      const editor = editorWith(html)
      const map = buildOffsetMap(editor)
      expect(map.text, html).toBe(editor.getText({ blockSeparator: BLOCK_SEPARATOR }))
      editor.destroy()
    }
  })

  it('round-trips every character offset back to the same character', () => {
    const editor = editorWith('<h1>Title</h1><p>Some body text here.</p>')
    const map = buildOffsetMap(editor)

    // Offsets STRICTLY INSIDE a text run address a character. The offset at a
    // run's end is deliberately also mappable -- `toRange` needs it to express
    // a range that ends on the last character -- but it is an insertion point,
    // and the flat string has the block separator there, so it is not a
    // character comparison and is covered by the separator test below.
    const interior = (offset: number) =>
      map.segments.some(
        (segment) => offset >= segment.textFrom && offset < segment.textFrom + segment.length
      )

    let checked = 0
    for (let offset = 0; offset < map.text.length; offset += 1) {
      if (!interior(offset)) continue
      const pos = toPosition(map, offset)!
      expect(editor.state.doc.textBetween(pos, pos + 1), `offset ${offset}`).toBe(
        map.text[offset]
      )
      checked += 1
    }
    // Guards the loop against silently checking nothing.
    expect(checked).toBeGreaterThan(20)
    editor.destroy()
  })

  it('maps a word in the SECOND block, where the two systems have diverged', () => {
    // By the second paragraph the flat offset and the document position differ
    // by the node boundaries plus the separator. A mapping that works on a
    // single-paragraph document proves nothing.
    const editor = editorWith('<p>First para.</p><p>manged the team</p>')
    const map = buildOffsetMap(editor)
    const start = map.text.indexOf('manged')

    const range = toRange(map, start, start + 'manged'.length)
    expect(range).not.toBeNull()
    expect(editor.state.doc.textBetween(range!.from, range!.to)).toBe('manged')
    editor.destroy()
  })

  it('picks the SECOND occurrence when that is the one flagged', () => {
    // The whole reason offsets beat search-and-replace: a CV that misspells
    // the same word twice must fix the one the checker pointed at.
    const editor = editorWith('<p>manged one</p><p>and manged two</p>')
    const map = buildOffsetMap(editor)
    const second = map.text.lastIndexOf('manged')

    const range = toRange(map, second, second + 'manged'.length)!
    expect(editor.state.doc.textBetween(range.from, range.to)).toBe('manged')
    // And it is genuinely the later one.
    expect(range.from).toBeGreaterThan(map.segments[0].posFrom + 5)
    editor.destroy()
  })

  it('refuses a range that would merge two blocks', () => {
    const editor = editorWith('<p>alpha</p><p>beta</p>')
    const map = buildOffsetMap(editor)
    // Spanning from inside the first paragraph into the second.
    expect(toRange(map, 3, map.text.length - 1)).toBeNull()
    editor.destroy()
  })

  it('returns null inside a block separator rather than a nearby position', () => {
    const editor = editorWith('<p>alpha</p><p>beta</p>')
    const map = buildOffsetMap(editor)
    const sep = map.text.indexOf(BLOCK_SEPARATOR)
    // The interior of the separator belongs to no text node.
    expect(toPosition(map, sep + 1)).toBeNull()
    editor.destroy()
  })
})
