/**
 * Third-party components whose SOURCE ships in this repository.
 *
 * Skiper UI's free tier reads: "Free to use and modify in both personal and
 * commercial projects. Attribution to Skiper UI is required when using the
 * free version." The registry copies source in-tree rather than installing a
 * package, so the obligation attaches to these two files and no others.
 *
 * skiper106 is listed ahead of Task 4 installing it, deliberately: the gate is
 * already red if Task 4 lands the component without touching the README, so it
 * cannot add its own credit line as an afterthought.
 *
 * skiper4 and skiper26 are deliberately absent. Neither was ever installed --
 * ui/theme-toggle.tsx was written against skiper4's crossfade-and-counter-
 * rotate technique with our own icons and the app's own next-themes provider,
 * and its docblock records why skiper26 was declined. Studying a component and
 * reimplementing it against our own tokens is the same line already drawn
 * around CVJunction, and it carries no licence obligation. They are still
 * named in the README's prose as influences, which is honesty rather than
 * compliance.
 *
 * `credit` is the exact sentence rendered in the landing footer AND asserted
 * verbatim against README.md, so the two cannot drift.
 */
export interface AttributionEntry {
  id: string
  name: string
  href: string
  credit: string
}

export const SKIPER_ATTRIBUTION: AttributionEntry[] = [
  {
    id: 'skiper51',
    name: 'Creative carousel 002',
    href: 'https://skiper-ui.com/components',
    credit:
      'Carousel adapted from Skiper UI (Creative carousel 002), built on Swiper.js, with illustrations by AarzooAly.',
  },
  {
    id: 'skiper106',
    name: 'Smooth caret input',
    href: 'https://skiper-ui.com/components',
    credit: 'Smooth caret input adapted from Skiper UI (Smooth caret input).',
  },
]
