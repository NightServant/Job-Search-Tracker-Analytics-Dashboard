const SEMANTIC = [
  ['bg/canvas', 'bg-bg-canvas'], ['bg/surface', 'bg-bg-surface'], ['bg/inset', 'bg-bg-inset'],
  ['text/primary', 'bg-text-primary'], ['text/secondary', 'bg-text-secondary'],
  ['text/muted', 'bg-text-muted'], ['text/inverse', 'bg-text-inverse'],
  ['border/subtle', 'bg-border-subtle'], ['border/default', 'bg-border-default'],
  ['border/strong', 'bg-border-strong'],
  ['accent/default', 'bg-accent-default'], ['accent/hover', 'bg-accent-hover'],
  ['accent/subtle', 'bg-accent-subtle'], ['accent/on-accent', 'bg-accent-on-accent'],
  ['accent/surface', 'bg-accent-surface'], ['accent/on-surface', 'bg-accent-on-surface'],
  ['chart/1', 'bg-chart-1'], ['chart/2', 'bg-chart-2'], ['chart/3', 'bg-chart-3'],
] as const

// Written out in full, never interpolated. Tailwind scans source text for
// complete class strings, so `bg-status-${s}-fill` generates no CSS at all --
// the swatches render transparent and nothing errors.
const STATUS = [
  ['wishlist', 'bg-status-wishlist-fill', 'bg-status-wishlist-mark'],
  ['applied', 'bg-status-applied-fill', 'bg-status-applied-mark'],
  ['interviewing', 'bg-status-interviewing-fill', 'bg-status-interviewing-mark'],
  ['offer', 'bg-status-offer-fill', 'bg-status-offer-mark'],
  ['rejected', 'bg-status-rejected-fill', 'bg-status-rejected-mark'],
] as const

const TYPE = [
  ['Display/XL', 'text-display-xl'], ['Display/L', 'text-display-l'],
  ['Display/M', 'text-display-m'], ['Heading/L', 'text-heading-l'],
  ['Heading/M', 'text-heading-m'], ['Heading/S', 'text-heading-s'],
  ['Body/L', 'text-body-l'], ['Body/M', 'text-body-m'], ['Body/S', 'text-body-s'],
  ['Label/M', 'text-label-m'], ['Label/Caps', 'text-label-caps uppercase'],
  ['Caption', 'text-caption'],
] as const

const DATA = [
  ['Data/XL', 'text-data-xl'], ['Data/L', 'text-data-l'],
  ['Data/M', 'text-data-m'], ['Data/S', 'text-data-s'],
] as const

function Swatch({ label, cls }: { label: string; cls: string }) {
  return (
    <div className="space-y-1">
      <div className={`h-14 rounded-md border border-border-subtle ${cls}`} />
      <p className="text-body-s text-text-muted font-mono">{label}</p>
    </div>
  )
}

export function Tokens() {
  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <h2 className="text-heading-l">semantic colour</h2>
        <p className="text-body-s text-text-muted">
          The only colour names components may use. Primitives are referenced by these and nowhere else.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {SEMANTIC.map(([label, cls]) => <Swatch key={label} label={label} cls={cls} />)}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-heading-l">status</h2>
        <p className="text-body-s text-text-muted">
          Marks are identical in both themes — the hue carries the meaning. Orange is never a status.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STATUS.map(([label, fill, mark]) => (
            <div key={label} className="space-y-1">
              <div className={`h-14 rounded-md border border-border-subtle ${fill}`} />
              <div className={`h-[2px] ${mark}`} />
              <p className="text-body-s text-text-muted font-mono">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-heading-l">type scale</h2>
        {TYPE.map(([label, cls]) => (
          <div key={label} className="flex items-baseline gap-6 border-b border-border-subtle pb-2">
            <span className="w-28 shrink-0 text-body-s text-text-muted font-mono">{label}</span>
            <span className={cls}>every application, every version of your CV</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-heading-l">data</h2>
        <p className="text-body-s text-text-muted">
          Tabular figures. Helvetica has proportional digits, so without this the columns drift.
        </p>
        {DATA.map(([label, cls]) => (
          <div key={label} className="flex items-baseline gap-6 border-b border-border-subtle pb-2">
            <span className="w-28 shrink-0 text-body-s text-text-muted font-mono">{label}</span>
            <span className={`${cls} tabular`}>1,111,111 · 0,000,000</span>
          </div>
        ))}
      </div>
    </section>
  )
}
