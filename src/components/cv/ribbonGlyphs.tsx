import * as React from 'react'

/**
 * The ribbon's own glyphs, drawn rather than borrowed.
 *
 * WHY NOT THE ICON SET: it has no alignment, list or indent marks, and
 * nothing in it means "align centre". The first ribbon reached for Unicode
 * instead -- `⇤ ↔ ⇥ ≡` for the four alignments -- and Gabe was right to call
 * it out: those are arrows and an identity sign, they read as navigation, and
 * three of the four are wrong about what they do.
 *
 * WORD'S ALIGNMENT ICONS ARE FOUR STACKED LINES whose ragged edge shows the
 * alignment, and that is the only mark people actually recognise for this.
 * They are trivial to draw and unambiguous at 14px, which no glyph substitute
 * was. The same applies to the list marks.
 *
 * `currentColor` throughout, so the active state inherits the accent-on-accent
 * foreground without the glyph knowing anything about the palette.
 */

function Lines({ widths }: { widths: number[] }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      {widths.map((w, i) => (
        <rect
          key={i}
          x={0}
          y={2 + i * 3}
          width={w}
          height={1.5}
          rx={0.5}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

/** Ragged right edge: every line starts at the left. */
export const AlignLeftGlyph = () => <Lines widths={[14, 9, 14, 8]} />

/** Ragged both edges, centred — drawn with an offset. */
export function AlignCenterGlyph() {
  const widths = [14, 9, 14, 8]
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      {widths.map((w, i) => (
        <rect
          key={i}
          x={(14 - w) / 2}
          y={2 + i * 3}
          width={w}
          height={1.5}
          rx={0.5}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

/** Ragged left edge: every line ends at the right. */
export function AlignRightGlyph() {
  const widths = [14, 9, 14, 8]
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      {widths.map((w, i) => (
        <rect
          key={i}
          x={14 - w}
          y={2 + i * 3}
          width={w}
          height={1.5}
          rx={0.5}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

/** Both edges flush — which is what justify means. */
export const JustifyGlyph = () => <Lines widths={[14, 14, 14, 14]} />

/** Dots and lines, as Word draws a bulleted list. */
export function BulletListGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      {[2, 6.5, 11].map((y, i) => (
        <g key={i}>
          <circle cx={1.5} cy={y + 0.75} r={1.25} fill="currentColor" />
          <rect x={5} y={y} width={9} height={1.5} rx={0.5} fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}

/** Numerals and lines, as Word draws a numbered list. */
export function OrderedListGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      {[2, 6.5, 11].map((y, i) => (
        <g key={i}>
          <text
            x={0}
            y={y + 3}
            fontSize="4.5"
            fill="currentColor"
            fontFamily="system-ui, sans-serif"
          >
            {i + 1}
          </text>
          <rect x={5} y={y} width={9} height={1.5} rx={0.5} fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}

/** A pen over a line: Word's highlighter, reduced to what reads at 14px. */
export function HighlightGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      <path
        d="M3 9.5 8.5 4l2 2L5 11.5H3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <rect x={1} y={12} width={12} height={1.8} rx={0.6} fill="currentColor" />
    </svg>
  )
}

/** An arrow into a stack of lines: Word's increase-indent mark. */
export function IndentGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      {[2, 11].map((y) => (
        <rect key={y} x={0} y={y} width={14} height={1.5} rx={0.5} fill="currentColor" />
      ))}
      {[5.5, 8.25].map((y) => (
        <rect key={y} x={5} y={y} width={9} height={1.5} rx={0.5} fill="currentColor" />
      ))}
      <path d="M0 5.5 3 7l-3 1.5z" fill="currentColor" />
    </svg>
  )
}

/** The same, pointing out: decrease indent. */
export function OutdentGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
      {[2, 11].map((y) => (
        <rect key={y} x={0} y={y} width={14} height={1.5} rx={0.5} fill="currentColor" />
      ))}
      {[5.5, 8.25].map((y) => (
        <rect key={y} x={5} y={y} width={9} height={1.5} rx={0.5} fill="currentColor" />
      ))}
      <path d="M3 5.5 0 7l3 1.5z" fill="currentColor" />
    </svg>
  )
}
