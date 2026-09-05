import type { SVGProps } from 'react'

/**
 * The glyphs the vendored AnimateIcons set has no answer for.
 *
 * WHY THIS FILE EXISTS. Gabe asked for icons on the application form's fields
 * (2026-09-05). Nine of them -- company, salary, currency, status, location,
 * work mode, source, tags, tech stack -- have no glyph anywhere in the
 * installed set, and a nineteen-field form where half the boxes carry an icon
 * reads as a rendering fault rather than as a system. The first pass therefore
 * shipped section icons and no field icons, which Gabe then asked about
 * directly. This is the answer: draw the missing nine rather than hand nine
 * fields a near-match that means something else.
 *
 * PLAIN <svg>, NOT AnimateIcons COMPONENTS, and that is the cheap part. Every
 * file in this directory is a ~150-line `motion` component with animation
 * controls, an imperative handle and a reduced-motion hook -- and the barrel
 * turns all of it OFF (`isAnimated: false`), because this app drives icon
 * motion from CSS keyed on the CONTROL, not from the glyph. So a new glyph
 * needs none of that machinery: it needs a path and `stroke="currentColor"`.
 * The `.icon-motion-*` classes apply to whatever element carries them, so
 * these answer the same hover, focus and press vocabulary as every other icon
 * in the app. ./briefcase.tsx is the existing precedent for a plain glyph in
 * this directory.
 *
 * ONE FILE, NOT NINE, which departs from the one-glyph-per-file convention
 * the vendored set follows. That convention exists because each of those files
 * is 150 lines of animation; these are four lines of path data each, and nine
 * files to hold thirty-six lines is filing for its own sake. If one of these
 * ever grows real behaviour it earns its own file then.
 *
 * GEOMETRY IS LUCIDE'S (ISC), the same source the AnimateIcons set draws, so
 * these sit beside the vendored glyphs at the same weight and optical size
 * rather than looking like a second illustrator's work: a 24-unit viewBox,
 * 2-unit stroke, round caps and joins, no fill.
 *
 * DEFAULT SIZE IS 20, matching the barrel's `withDefaultSize`. They are NOT
 * put through that wrapper: it also passes `isAnimated: false`, which is a
 * real prop on an AnimateIcons component and an unknown attribute on an
 * `<svg>` -- React would warn on every render.
 */
export interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  /** Rendered size in px. Defaults to 20, this system's authored icon size. */
  size?: number
}

function Glyph({ size = 20, children, ...props }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

/** An employer. Not Briefcase, which this app already uses for "a job". */
export function BuildingIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </Glyph>
  )
}

/** Pay. Both salary bounds carry it -- they are one range in two boxes. */
export function BankNoteIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </Glyph>
  )
}

/** The currency the figures are stored in, which is a fact about the row. */
export function CoinsIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </Glyph>
  )
}

/** Where the application stands. A stage marker, not a state of approval. */
export function FlagIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </Glyph>
  )
}

/** Where the job is. */
export function MapPinIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </Glyph>
  )
}

/** Remote, hybrid or on-site: how the work is done rather than where it is. */
export function MonitorIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </Glyph>
  )
}

/** The channel the posting came through. */
export function GlobeIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </Glyph>
  )
}

/**
 * A URL typed into a field.
 *
 * Distinct from `External` (an outbound arrow), which marks a link you can
 * FOLLOW. Nothing is followed from inside a text box.
 */
export function LinkIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Glyph>
  )
}

/** Free-text labels of your own. */
export function TagIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </Glyph>
  )
}

/** The technologies named in the posting. */
export function CodeIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </Glyph>
  )
}

/**
 * Edit.
 *
 * ./motion.ts has had an `edit` variant since the icon pass -- "nudges
 * up-right, along the axis a pencil is held on" -- with no pencil to put it
 * on, because the vendored set has none. The record's `edit` button was the
 * one action in the dialog's header bar with no glyph while `delete` had one.
 */
export function PencilIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </Glyph>
  )
}

/** Leaving. The settings screen's sign-out control. */
export function LogOutIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </Glyph>
  )
}

/** Copy to the clipboard. The LaTeX editor's "copy LaTeX". */
export function CopyIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Glyph>
  )
}

/** Run it. The LaTeX editor compiles on demand as well as automatically. */
export function PlayIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M5 4.5a1 1 0 0 1 1.53-.848l11 6.5a1 1 0 0 1 0 1.696l-11 6.5A1 1 0 0 1 5 17.5z" />
    </Glyph>
  )
}
