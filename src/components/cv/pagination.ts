import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/**
 * Real page breaks: content is pushed past a boundary, not painted under one.
 *
 * WHY THE BACKGROUND VERSION HAD TO GO. The first attempt drew page edges with
 * a repeating gradient -- first a hairline, then a band of the well's colour to
 * give the "space between" that was asked for. Both are painted BEHIND the
 * text, so where a break fell mid-paragraph the band struck straight through a
 * line of it. Gabe's screenshot has a grey stripe across "Smart Human Resource
 * Management System", and "weird" was the right word: a page boundary that
 * crosses a sentence is not a page boundary, it is a stripe.
 *
 * Nothing about a background can fix that, because the content flows over it
 * regardless. The break has to MOVE the content.
 *
 * HOW IT WORKS. Every top-level block is measured, and their heights are
 * accumulated. When the next block would straddle a page edge, a widget
 * decoration is inserted before it, tall enough to fill the remainder of the
 * page plus the gap between sheets -- so the block starts at the top of the
 * next page and the space between is genuinely empty. That is what Word's
 * Print Layout does and why a heading never lands half over a page edge there.
 *
 * BLOCKS ARE MEASURED, NOT ESTIMATED. Line counts, character counts and
 * average line heights all fail on the document that matters: a CV mixes 16pt
 * headings, 11pt body and tight bullet lists, and a guess that is 5% out is a
 * page out by the third page. `offsetHeight` is what the browser actually laid
 * out.
 *
 * IT CONVERGES BECAUSE IT MEASURES BLOCKS, NOT POSITIONS. The naive version --
 * read each block's `offsetTop`, decide breaks, insert spacers, read again --
 * never settles, because inserting a spacer moves everything after it and
 * changes the answer. Accumulating intrinsic block heights and ignoring the
 * spacers gives the same result whether or not decorations are present, so the
 * second pass agrees with the first and it stops.
 *
 * A BLOCK TALLER THAN A PAGE IS LEFT ALONE. A single paragraph longer than a
 * page cannot be made to fit one, and pushing it to the next page would loop:
 * it would not fit there either. It starts where it starts and runs over, which
 * is what Word does with one too.
 */

export const paginationKey = new PluginKey('worktrack-pagination')

export interface PaginationOptions {
  /** Usable page height in CSS pixels: page height less both margins. */
  pageHeight: number
  /** The empty band between two sheets, in CSS pixels. */
  gap: number
}

/**
 * Where the breaks fall, given each block's height.
 *
 * Pure, so the rule can be tested without a browser: the caller measures and
 * this decides. Returns the INDEX of each block that should start a new page.
 */
export function breakIndexes(
  heights: number[],
  pageHeight: number
): number[] {
  if (pageHeight <= 0) return []
  const breaks: number[] = []
  let used = 0

  for (let i = 0; i < heights.length; i += 1) {
    const height = heights[i]

    // Taller than a page on its own: it cannot be made to fit, and moving it
    // would not help. Let it run over and start the next page after it.
    if (height > pageHeight) {
      used = 0
      continue
    }

    if (used + height > pageHeight && used > 0) {
      breaks.push(i)
      used = height
    } else {
      used += height
    }
  }

  return breaks
}

/** How tall a spacer must be to push the next block onto a fresh page. */
export function spacerHeight(
  heights: number[],
  breakIndex: number,
  pageHeight: number,
  gap: number
): number {
  let used = 0
  for (let i = 0; i < breakIndex; i += 1) {
    const height = heights[i]
    if (height > pageHeight) {
      used = 0
      continue
    }
    if (used + height > pageHeight && used > 0) used = height
    else used += height
  }
  return Math.max(0, pageHeight - used) + gap
}

export const Pagination = Extension.create<PaginationOptions>({
  name: 'worktrackPagination',

  addOptions() {
    return { pageHeight: 0, gap: 24 }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: paginationKey,

        view(editorView) {
          let decorations = DecorationSet.empty
          let frame = 0

          const recompute = () => {
            const { pageHeight, gap } = extension.options
            const dom = editorView.dom as HTMLElement
            if (!pageHeight || pageHeight <= 0) return

            // Top-level blocks only, and spacers skipped: their height is a
            // result of this calculation, so counting them would feed the
            // answer back into itself.
            const blocks = Array.from(dom.children).filter(
              (el) => !el.hasAttribute('data-page-spacer')
            ) as HTMLElement[]
            const heights = blocks.map((el) => {
              const style = window.getComputedStyle(el)
              // Margins are part of how much page a block consumes, and
              // `offsetHeight` excludes them.
              return (
                el.offsetHeight +
                Number.parseFloat(style.marginTop || '0') +
                Number.parseFloat(style.marginBottom || '0')
              )
            })

            const indexes = breakIndexes(heights, pageHeight)
            const next = indexes.map((index) => {
              const height = spacerHeight(heights, index, pageHeight, gap)
              const pos = editorView.posAtDOM(blocks[index], 0)
              return Decoration.widget(
                Math.max(0, pos - 1),
                () => {
                  const spacer = document.createElement('div')
                  spacer.setAttribute('data-page-spacer', '')
                  spacer.setAttribute('aria-hidden', 'true')
                  spacer.style.height = `${height}px`
                  // The gap shows the well through the sheet, so two pages
                  // read as two sheets rather than one long one.
                  spacer.style.background = 'var(--color-bg-inset)'
                  spacer.style.marginLeft = 'calc(-1 * var(--page-margin-left, 0px))'
                  spacer.style.marginRight = 'calc(-1 * var(--page-margin-right, 0px))'
                  spacer.style.pointerEvents = 'none'
                  return spacer
                },
                // `side: -1` puts the spacer before the block rather than
                // after the previous one, which matters when the break lands
                // between two blocks that a transaction is editing.
                { side: -1, key: `page-${index}-${Math.round(height)}` }
              )
            })

            const set = DecorationSet.create(editorView.state.doc, next)
            // Only dispatch when something actually changed: a no-op
            // transaction on every measurement would re-enter this forever.
            if (set.find().length !== decorations.find().length) {
              decorations = set
              editorView.dispatch(editorView.state.tr.setMeta(paginationKey, set))
              return
            }
            decorations = set
          }

          const schedule = () => {
            cancelAnimationFrame(frame)
            // One frame later, so the measurement reads a laid-out document
            // rather than the one being replaced.
            frame = requestAnimationFrame(recompute)
          }

          schedule()
          const observer = new ResizeObserver(schedule)
          observer.observe(editorView.dom as HTMLElement)

          return {
            update: schedule,
            destroy() {
              cancelAnimationFrame(frame)
              observer.disconnect()
            },
          }
        },

        state: {
          init: () => DecorationSet.empty,
          apply(tr, value) {
            const meta = tr.getMeta(paginationKey) as DecorationSet | undefined
            if (meta) return meta
            return value.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return paginationKey.getState(state) as DecorationSet
          },
        },
      }),
    ]
  },
})
