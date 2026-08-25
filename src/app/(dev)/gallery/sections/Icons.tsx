'use client'

import { icons } from '@/components/icons'

/**
 * Every icon at three sizes.
 *
 * 20 is the authored size; 18 and 44 are the sizes the chrome actually uses on
 * desktop and mobile. Rendering all three is deliberate -- the Sun and Search
 * rings drifted off-centre only when scaled away from 20, so a gallery that
 * shows one size would have missed it.
 */
const SIZES = [18, 20, 44] as const

export function Icons() {
  return (
    <section className="space-y-4">
      <h2 className="text-heading-l">Icons</h2>
      <p className="text-body-s text-text-muted">
        {Object.keys(icons).length} icons, drawn in Figma, generated from the export. They inherit
        colour from the text around them.
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
        <p className="text-label-caps uppercase text-text-muted">Colour follows the text</p>
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
