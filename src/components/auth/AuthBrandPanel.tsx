import { BrandLockup } from '@/components/ui/brand-mark'

/**
 * The left half of the auth split, desktop only. Figma `Panel / Brand`
 * (50:566 light, 101:2032 dark).
 *
 * IT IS THEME-AWARE NOW, AND IT WAS NOT. This panel shipped as
 * `bg-[#050507]` with `#fafafa` text in BOTH themes, on the reasoning that
 * "an auth screen that inverts with the OS theme while the marketing page
 * beside it does not reads as two products". That reasoning has one factual
 * error in it, which is why the whole conclusion fell over: the hero is dark
 * in both themes because it lays a SCRIM OVER VIDEO -- it is dark because
 * there is footage under it, not because darkness is this product's auth
 * language. There is no video here, so the panel was borrowing a constraint
 * it does not have.
 *
 * The prototype was never ambiguous about it. Both Figma frames are the SAME
 * LAYERS with the Semantic variable collection switched between Light and
 * Dark, which is exactly why the design-context call returns byte-identical
 * markup for the two nodes: every colour is a token, not a literal. Read from
 * the frame:
 *
 *   surface            bg/surface        (#fafafa light, near-black dark)
 *   right edge         border/subtle
 *   headline           text/primary      Display/L, 40px
 *   subhead            text/secondary    Body/L
 *   footer             text/muted        Data/S, 12px
 *   logo active cell   accent/default
 *
 * SO THE LOCKUP LOSES ITS OVERRIDES. It used to force dark-mode colours and
 * redefine `--color-accent-default` to accent-400, because accent-700 fails
 * contrast on near-black. On `bg-surface` that is no longer true in either
 * theme -- the token already resolves to the right weight per mode -- and
 * keeping the override would have pinned the mark to one theme's palette on a
 * surface that follows both. This is the same argument the navbar makes for
 * KEEPING its override over the hero: the override belongs where the ground
 * is fixed, and this ground no longer is.
 *
 * `flex-1` spacers above and below the copy, from the frame's two Spacer
 * layers: the block sits optically centred and the lockup and footer stay
 * pinned to the edges at any viewport height. Padding is the frame's 64/56.
 *
 * FIFTY-FIFTY, WHICH IS GABE'S CALL AND NOT THE FRAME'S. Figma draws 620 and
 * 820 -- 43/57 -- and this was built that way first; Gabe asked for equal
 * columns on 2026-09-03 and that is what ships. The frame's asymmetry buys
 * the form a wider measure, which is a real argument, but it also puts the
 * seam off-centre on a screen whose entire composition is one vertical line,
 * and a split that is nearly but not quite even reads as a mistake rather
 * than as a decision. This is the one place the implementation departs from
 * the prototype on purpose; the theming, tokens, spacers and padding above
 * are all transcribed from it exactly.
 *
 * THE WIDTH IS A BASIS AND IT DOES NOT SHRINK. Stating it as `w-` alone was
 * not enough: a flex item defaults to `flex-shrink: 1`, so a declared width
 * is a starting point the browser may take back the moment anything in either
 * column asks for more room -- and this column carries 64px of padding a side
 * plus a 40px headline, which is exactly the kind of content that asks.
 * `basis` + `shrink-0` + `grow-0` is what turns the number into the width it
 * actually gets, and it is what keeps the seam on the centre line.
 */
export function AuthBrandPanel() {
  return (
    <aside
      data-brand-panel
      className="hidden w-1/2 shrink-0 grow-0 basis-1/2 flex-col items-start gap-8 border-r border-border-subtle bg-bg-surface px-16 py-14 lg:flex"
    >
      <BrandLockup />

      {/* Figma 50:574 — pushes the copy off the top edge. */}
      <div aria-hidden className="flex-1" />

      <div className="flex flex-col gap-8">
        <p className="text-display-l text-text-primary">
          every application, every version of your cv, in one place.
        </p>
        <ul className="flex flex-col gap-3 text-body-l text-text-secondary">
          <li>Row-level security on every table — one row, one owner.</li>
          <li>Open source, including the parts that are unfinished.</li>
          <li>A demo that needs no account, if you would rather look first.</li>
        </ul>
      </div>

      {/* Figma 50:577 — the matching spacer that keeps the block centred. */}
      <div aria-hidden className="flex-1" />

      <p className="text-caption text-text-muted">
        open source · read the schema before you trust it
      </p>
    </aside>
  )
}
