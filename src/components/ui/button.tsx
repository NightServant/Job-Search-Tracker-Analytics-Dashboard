'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ICON_MOTION_GROUP } from '@/components/icons/motion'
import { buttonVariants, type ButtonVariantProps } from './button-variants'
import { CssSpinner } from './css-spinner'

/**
 * Three intents times two sizes -- the six buttons drawn in Figma.
 *
 * THE CLASS RECIPE LIVES IN ./button-variants, which carries no `'use client'`
 * directive, and it is NOT re-exported from here. It used to live in this
 * file, which quietly made it a client-only export and threw at request time
 * in any server component that called it -- discovered as a 500 on the 404
 * page, which is a memorable place to find it.
 *
 * Re-exporting it would have been the smaller diff and would not have fixed
 * anything: a re-export from a `'use client'` module is itself client-marked,
 * so the next server component to reach for `@/components/ui/button` would
 * have hit exactly the same error. One canonical import path is what makes
 * the failure unrepeatable rather than merely fixed once.
 *
 * `loading` IS A STATE OF THE BUTTON, NOT SOMETHING THE CALLER DRAWS. Before
 * this, a pending submit was a `disabled` prop and, in the better cases, a
 * relabelled string -- so "the system has your request" was communicated
 * inconsistently, or as nothing at all but a dead control. A disabled button
 * with no motion is indistinguishable from a broken one, which on a sign-in
 * form is the exact moment people click again.
 *
 * Three things happen together, and they have to, which is why this is one
 * prop rather than three:
 *   - a CssSpinner appears before the label
 *   - the button disables itself, so a second submit is impossible
 *   - `aria-busy` is set, so a screen reader is told rather than shown
 *
 * THE BUTTON DOES NOT COLLAPSE TO A SPINNER. Swapping "Sign in" for a bare
 * glyph loses the only text saying what is being waited on.
 *
 * THE LABEL *DOES* CHANGE NOW, IF THE CALLER GIVES IT SOMETHING TO CHANGE TO
 * (Gabe, 2026-09-15: "add dynamic text behavior when the button is clicked").
 * This reverses what this docblock used to say, and the old sentence is worth
 * quoting because its reasoning is still half-right: "a button that changes
 * width mid-click moves the pointer off whatever is beside it". That is true
 * and it is the reason `loadingText` is implemented the way it is rather than
 * the reason not to implement it.
 *
 * BOTH LABELS ARE ALWAYS IN THE DOM, stacked in one grid cell, and only one is
 * visible. The cell is therefore as wide as the LONGER of the two at all
 * times, so "Save" -> "Saving..." does not resize the control, does not reflow
 * the row it sits in, and does not move the pointer. That is the whole trick,
 * and it is why this is six lines of JSX rather than a ternary.
 *
 * `invisible`, NOT `hidden` or `sr-only`. `visibility: hidden` keeps the box
 * -- which is what reserves the width -- AND removes the element from the
 * accessibility tree. `display: none` would collapse the box and give back the
 * width jump; `sr-only` would keep the element announced.
 *
 * `aria-hidden` IS ON THE INACTIVE HALF AS WELL, and it is not redundant with
 * that. The CSS answer only works where the CSS is loaded, and the place it is
 * not is jsdom -- where `getByRole('button', { name: 'Sign in' })` computed
 * "Sign in Signing in..." and forty auth tests went red the moment this
 * shipped. Those tests were right: an accessible name built from both labels
 * at once is what a screen reader in any environment that misses the
 * visibility rule would read, and belt-and-braces on a control's NAME is
 * cheap. It is the same lesson as the vendored tabs that were inert rather
 * than hidden -- jsdom hid the defect, then stopped hiding it.
 *
 * WHAT IT IS NOT: a success state. There is no "Saved" that appears for two
 * seconds and fades. That needs a timer, a second piece of state and an
 * opinion about how long -- none of which a button should own, and all of
 * which the app's toast already has. `loadingText` says what is HAPPENING; the
 * toast says what happened.
 */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  /** Shows a spinner, disables the control, and sets aria-busy. */
  loading?: boolean
  /**
   * The label to show while `loading`, e.g. "Saving...".
   *
   * Optional, and omitting it keeps the old behaviour exactly: the label
   * stands and only the spinner and `aria-busy` say anything. That matters for
   * the buttons whose label is already the right thing to read while it runs.
   *
   * Say what is HAPPENING, not what will have happened -- "Saving", not
   * "Saved". The control is disabled while this shows, so a past tense would
   * be a claim the button is in no position to make yet.
   */
  loadingText?: React.ReactNode
}

/**
 * One stacked label cell: a flex ROW that inherits the button's own gap.
 *
 * `flex`, NOT the default block flow, AND IT IS NOT COSMETIC. Tailwind's
 * preflight sets `svg { display: block }` -- correct, and harmless while an
 * icon is a direct child of the button, because the button is `inline-flex`
 * and a block-level flex ITEM still sits in the row. Wrapping `children` in a
 * plain `<span>` took that away: the icon became a block in normal flow, which
 * takes a line to itself, and `<Button><Icon/>Continue with Google</Button>`
 * rendered as a G stacked ON TOP OF its label. Reported from production on
 * 2026-09-15 ("button layout for OAuth is destroyed") on the one screen where
 * it was most visible, but every icon+text button with a `loadingText` had it.
 *
 * `gap-[inherit]` ON BOTH THIS AND THE GRID ABOVE IT, and the pair is the
 * point. The size variants own the icon-to-label distance (`gap-2` on `m`,
 * `gap-1.5` on `s`, `gap-0` on the icon-only sizes), and that gap applies
 * between the BUTTON's flex items -- of which there is now exactly one, this
 * wrapper. So the spacing silently became zero and the lock on "Sign in" sat
 * welded to the word. Inheriting it down the two levels restores the variant's
 * own value instead of hardcoding one, which would have been wrong for three
 * of the four sizes. The grid has a single track, so a gap on it draws no
 * gutter -- it is there only to carry the value down.
 *
 * `justify-center` centres the SHORTER label inside the shared cell, whose
 * width is set by the longer. Without it "Redirecting..." would sit left of
 * where "Continue with Google" was, and the label would appear to jump
 * sideways on click -- the exact reflow the stacking trick exists to prevent.
 */
const LABEL_CELL = 'col-start-1 row-start-1 flex items-center justify-center gap-[inherit]'

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      type = 'button',
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      data-variant={variant ?? 'primary'}
      data-loading={loading ? 'true' : undefined}
      // Disabled by loading OR by the caller. Deriving it here rather than
      // asking every call site to pass `disabled={busy || ...}` is what makes
      // a double submit unrepresentable instead of merely discouraged.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      // ICON_MOTION_GROUP is the named group an icon child's motion variant
      // listens to. It is inert unless a child asks for `group-hover/icon:`,
      // so every existing button is unchanged by it.
      className={cn(ICON_MOTION_GROUP, buttonVariants({ variant, size }), className)}
      {...props}
    >
      {/* Decorative only when `loadingText` speaks for it -- otherwise the
          button's accessible name becomes "Loading Signing in...". */}
      {loading && <CssSpinner size={14} decorative={loadingText !== undefined} />}
      {loadingText === undefined ? (
        children
      ) : (
        // Both labels in ONE grid cell, so the cell is as wide as the longer
        // and the control never resizes mid-click. See the docblock.
        <span data-button-label className="grid gap-[inherit]">
          <span
            className={cn(LABEL_CELL, loading && 'invisible')}
            aria-hidden={loading || undefined}
          >
            {children}
          </span>
          <span
            className={cn(LABEL_CELL, !loading && 'invisible')}
            aria-hidden={!loading || undefined}
          >
            {loadingText}
          </span>
        </span>
      )}
    </button>
  )
)
Button.displayName = 'Button'

