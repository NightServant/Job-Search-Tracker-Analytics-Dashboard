import { BrandLockup } from '@/components/ui/brand-mark'

/**
 * The left half of the auth split, desktop only.
 *
 * It is the one piece of argument on a screen whose whole job is a form, so it
 * says the same three things the landing page's social proof does rather than
 * inventing new claims: the data is yours, the source is readable, the demo
 * needs nothing. Every line is true and checkable, which is the standing rule
 * for copy on this project.
 *
 * Dark in both themes, like the hero -- an auth screen that inverts with the
 * OS theme while the marketing page beside it does not reads as two products.
 * That is also why the colours here are literals rather than tokens.
 */
export function AuthBrandPanel() {
  return (
    <aside
      data-brand-panel
      className="hidden w-1/2 flex-col justify-between bg-[#050507] p-12 lg:flex"
    >
      <BrandLockup className="text-[#fafafa] [&>svg]:text-[#fafafa] [--color-accent-default:var(--color-accent-400)]" />

      <div className="flex flex-col gap-6">
        <p className="text-display-m text-[#fafafa]">
          every application, every version of your cv, in one place.
        </p>
        <ul className="flex flex-col gap-3 text-body-m text-[rgba(250,250,250,0.72)]">
          <li>Row-level security on every table — one row, one owner.</li>
          <li>Open source, including the parts that are unfinished.</li>
          <li>A demo that needs no account, if you would rather look first.</li>
        </ul>
      </div>

      <p className="text-caption text-[rgba(250,250,250,0.45)]">
        A job search tracker with analytics and a CV builder.
      </p>
    </aside>
  )
}
