import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import TextAlign from '@tiptap/extension-text-align'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Highlight from '@tiptap/extension-highlight'
import {
  BackgroundColor,
  Color,
  FontFamily,
  FontSize,
  LineHeight,
  TextStyle,
} from '@tiptap/extension-text-style'

/**
 * What the Word editor can do, in one list.
 *
 * ONE DEFINITION, SHARED WITH THE TESTS, and that is the whole reason this is
 * a module rather than an inline array. The ribbon calls `setFontFamily`,
 * `setTextAlign`, `toggleHighlight` and friends; if the editor under test is
 * built from a different extension set than the real one, those commands are
 * simply absent and the test fails with "not a function" -- which is exactly
 * what happened on 2026-09-11 when the toolbar test still built a StarterKit
 * editor. A shared list makes that impossible: the ribbon is tested against
 * the same capabilities it ships with.
 *
 * STARTERKIT COVERS bold, italic, underline, strike, lists, headings, code,
 * blockquote, horizontal rule and history. EVERYTHING ELSE HERE HAD TO BE
 * ADDED for Word's Home tab -- alignment, font family, font size, colour,
 * highlight, line spacing, sub/superscript. Half the ribbon had nothing to
 * call before them.
 *
 * PINNED TO 3.22.5 to match `@tiptap/core`. The current releases want core
 * 3.31 and npm refuses the graph; upgrading core under a working editor to
 * gain a toolbar is the wrong trade.
 */
/**
 * The `doc` node, taught to carry the page it was imported at.
 *
 * AN ATTRIBUTE ON THE DOCUMENT IS THE ONLY PLACE THIS SURVIVES. The page
 * geometry read out of a .docx has to outlive being typed in and saved, and
 * tiptap re-serialises from the schema -- so a key sitting beside `type:
 * 'doc'` in the JSON is dropped the first time the editor writes it back, and
 * the imported margins would silently revert to the default on the first
 * autosave. Declared here, `getJSON()` returns it intact.
 *
 * `renderHTML` returns nothing for it, because this is geometry for the
 * editor's sheet and not something that belongs in exported markup.
 */
const DocumentWithPage = Document.extend({
  addAttributes() {
    return {
      pageGeometry: {
        default: null,
        // Not rendered to the DOM and not parsed back from it: the value is
        // carried in the JSON, which is what gets stored.
        renderHTML: () => ({}),
        parseHTML: () => null,
      },
      /** The face, size and spacing the document was set in. Same reasoning. */
      documentTypography: {
        default: null,
        renderHTML: () => ({}),
        parseHTML: () => null,
      },
    }
  },
})

export const WORD_EDITOR_EXTENSIONS = [
  // StarterKit's own Document is replaced by the one above.
  StarterKit.configure({ document: false }),
  DocumentWithPage,
  TextStyle,
  FontFamily,
  FontSize,
  Color,
  BackgroundColor,
  LineHeight,
  Highlight.configure({ multicolor: true }),
  Subscript,
  Superscript,
  // Headings included: Word aligns them like any other paragraph.
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
]
