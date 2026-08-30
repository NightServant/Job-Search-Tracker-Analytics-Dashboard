'use client'

import { icons } from '@/components/icons'

/**
 * Every icon at three sizes.
 *
 * 20 is this app's authored default; 18 and 44 are the sizes the chrome
 * actually uses on desktop and mobile.
 *
 * The custom 34-icon set drawn in Figma (node 103:2066) was replaced wholesale
 * on 2026-08-29 (Task 2b) with AnimateIcons (MIT, vendored via the shadcn
 * CLI). "Match the Figma" is no longer the acceptance test for icons -- every
 * frame still draws the old glyphs. See docs/superpowers/notes/2026-08-25-icon-gap.md
 * for the full record.
 */
const SIZES = [18, 20, 44] as const

export function Icons() {
  return (
    <section className="space-y-4">
      <h2 className="text-heading-l">icons</h2>
      <p className="text-body-s text-text-muted">
        {Object.keys(icons).length} icons from AnimateIcons (MIT), vendored via the shadcn CLI. They
        inherit colour from the text around them.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(icons).map(([name, Icon]) => (
          <div
            key={name}
            className="flex flex-col items-center gap-3 rounded-md border border-border-subtle p-4"
          >
            <div className="flex items-end gap-3 text-text-primary">
              {SIZES.map((s) => <Icon key={s} size={s} />)}
            </div>
            <span className="text-body-s text-text-muted font-mono">{name}</span>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border-subtle p-4 space-y-2">
        <p className="text-label-caps uppercase text-text-muted">colour follows the text</p>
        <div className="flex items-center gap-6">
          <span className="text-accent-default flex items-center gap-2 text-body-m">
            {(() => { const I = icons.Check; return <I size={18} /> })()} accent
          </span>
          <span className="text-status-offer-mark flex items-center gap-2 text-body-m">
            {(() => { const I = icons.Check; return <I size={18} /> })()} offer
          </span>
          <span className="text-status-rejected-mark flex items-center gap-2 text-body-m">
            {(() => { const I = icons.Close; return <I size={18} /> })()} rejected
          </span>
        </div>
      </div>
    </section>
  )
}
