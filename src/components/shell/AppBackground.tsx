import * as React from 'react'

/**
 * The app shell's backdrop.
 *
 * The image is `public/backdrop.jpg` — Unsplash photo-1759640415499 by Liana S
 * (@cherstve_pechivo), an abstract blurred black-and-white texture, under the
 * Unsplash Licence. Credited in the README: the licence does not require it,
 * this repo's convention for third-party assets does. Swapping it is one
 * change, `--app-backdrop-image` in `index.css`.
 *
 * Greyscale and blurred on purpose. This sits behind dense text, tabular
 * figures and 2px status rules; a photo with subjects, edges or local colour
 * fights all three and no opacity value rescues that. Greyscale also lets one
 * asset serve both themes honestly rather than shipping two crops.
 *
 * Three things a background behind an app shell has to get right, and why each
 * is done the way it is:
 *
 * **Legibility comes first.** This sits at `-z-10` behind everything and is
 * heavily muted — 5% in light, 8% in dark (dark carries more because the
 * inverted texture has less contrast against near-black). A dashboard is dense
 * text, tabular figures and thin 2px status rules; a backdrop that competes
 * with those makes the product worse however good the photo is. Blur and
 * greyscale are what make those numbers safe: a photo with real subjects has
 * local contrast that varies across the frame, so text legible over one region
 * is not legible over another, and opacity alone does not fix that — it would
 * need a scrim. This one has no such regions.
 *
 * **Theme-aware means two treatments, not one image dimmed twice.** Light
 * leaves the photo as-is, so its dark regions settle the white canvas. Dark
 * INVERTS it, so those same regions lift a near-black canvas rather than
 * punching holes in it — an uninverted photo over dark reads as smudges. The
 * dark block is keyed off `:root:not([data-theme='light'])` under
 * `prefers-color-scheme` plus an explicit `[data-theme='dark']`, matching how
 * the rest of this system handles the three theme states.
 *
 * **It is decoration, so it announces nothing.** `aria-hidden`, no text, and
 * `print:hidden` — nobody wants this eating toner on a printed application
 * list.
 */
export function AppBackground() {
  return <div data-app-backdrop aria-hidden className="pointer-events-none fixed inset-0 -z-10 print:hidden" />
}
