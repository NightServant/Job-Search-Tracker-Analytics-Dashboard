import * as React from 'react'

/**
 * The app shell's backdrop.
 *
 * `public/backdrop.jpg` — Unsplash photo-1751601454754 by Albert Salim
 * (@albertsalim), soft blurred colour in an abstract field, under the Unsplash
 * Licence. Credited in the README: the licence does not require it, this
 * repo's convention for third-party assets does. Swapping it is one change,
 * `--app-backdrop-image` in `index.css`.
 *
 * It replaced a greyscale texture that was technically present and practically
 * invisible at 5% on a white canvas. That was a calibration failure rather
 * than restraint — a backdrop nobody can see is not a subtle backdrop.
 *
 * Three things a background behind an app shell has to get right:
 *
 * **Legibility first.** `-z-10`, behind everything, 10% light and 14% dark.
 * This sits under dense text, tabular figures and 2px status rules. The reason
 * it can be raised to a level you actually notice is that the image is
 * out-of-focus colour with no edges or subjects: a photo with real detail has
 * local contrast that varies across the frame, so text legible over one region
 * is illegible over another, and that needs a scrim rather than an opacity
 * tweak. This one has no such regions.
 *
 * **Theme-aware means two treatments, not one image dimmed twice.** Dark
 * carries more opacity, because the same wash reads fainter against near-black,
 * plus a little desaturation so the tint does not compete with the accent.
 * Deliberately NO invert — the greyscale version inverted, which was right for
 * grey and would be wrong here: inverting a colour image maps every hue to its
 * complement, turning a warm wash cold. The dark block is keyed off
 * `:root:not([data-theme='light'])` under `prefers-color-scheme` plus an
 * explicit `[data-theme='dark']`, matching how the rest of this system handles
 * the three theme states.
 *
 * **It is decoration, so it announces nothing.** `aria-hidden`, no text, and
 * `print:hidden` — nobody wants this eating toner on a printed application
 * list.
 */
export function AppBackground() {
  return <div data-app-backdrop aria-hidden className="pointer-events-none fixed inset-0 -z-10 print:hidden" />
}
