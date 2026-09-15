import { cva, type VariantProps } from 'class-variance-authority'

/**
 * The button's class recipe, in a module with NO `'use client'` directive.
 *
 * WHY IT IS NOT IN button.tsx ANY MORE. It was, and that made it a client
 * export -- so calling `buttonVariants({ ... })` from a server component threw
 * at request time: "Attempted to call buttonVariants() from the server but
 * buttonVariants is on the client." Nothing caught it, because every existing
 * caller happened to sit inside a `'use client'` tree, and jsdom tests do not
 * model the server/client boundary at all. It surfaced the moment
 * app/not-found.tsx -- a genuine server component -- tried to style a link,
 * and it surfaced as a 500 on the 404 page, which is a particularly bad place
 * to discover it.
 *
 * This is a pure function over strings. It has no state, no effects and no
 * browser API, so being marked client was never anything but an accident of
 * which file it lived in.
 *
 * A second thing falls out of the split: button.tsx now exports only
 * components, which clears the `react-refresh/only-export-components` warning
 * it had carried since it was written.
 *
 * Radius is capped at 4px (`rounded-md`) here and everywhere else. The design
 * separates things with hairline rules rather than rounded, shadowed cards, so
 * a softer corner on one control reads as a different design system.
 *
 * Primary fills with `accent-default`, which resolves to orange-700 in light
 * and orange-400 in dark. Both clear AA against their own `accent-on-accent`
 * foreground; orange-500 does not, which is why it is absent from this file.
 */
/**
 * THE SIZE SCALE, AND WHY EACH NUMBER IS THE NUMBER (Gabe, 2026-09-15:
 * "padding, margin, and size must adhere to the UI/UX standard because buttons
 * of the system are inconsistent in terms of design").
 *
 * The inconsistency was real and it was structural rather than sloppy: this
 * file described two sizes for buttons that carry a LABEL and said nothing
 * about a button that carries only a GLYPH, so every square control in the app
 * invented its own. skiper51's carousel arrows were
 * `buttonVariants({size:'m'}) + 'w-10 px-0'` -- a size class and then two
 * classes undoing half of it. ui/carousel's were a different component
 * entirely, shadcn-button, at `size-7` with an 8px radius and a 3px focus ring.
 * ui/dialog's and ui/sheet's close controls were a third thing again. Four
 * square buttons, four boxes, three focus treatments.
 *
 * So `icon-m` and `icon-s` exist now, and they are the label sizes SQUARED --
 * `size-10` beside `h-10`, `size-8` beside `h-8`. That is what makes a toolbar
 * holding "export" and a lone download glyph line up without anybody
 * measuring: the two controls are the same height by construction rather than
 * by two people picking 40.
 *
 * THE PADDING IS A RATIO, NOT A PAIR OF GUESSES. Horizontal padding is 40% of
 * the control's height at both sizes -- 16 on 40, 12 on 32 -- which is the
 * proportion the 40px button already had and the 32px one already had. Naming
 * it is what stops a third size being added at whatever looks right.
 *
 * THE GAP MOVES WITH THE SIZE, and until now it did not: both sizes were
 * `gap-2`, so on the 32px button the space between a 16px glyph and its label
 * was the same 8px as on the 40px one, which is 25% of the small button's
 * height against 20% of the large one -- the small button read as a glyph and
 * a word rather than as one control. `s` is `gap-1.5`.
 *
 * NO `margin` IN ANY VARIANT, and that is the third part of the request
 * answered by leaving something out. A button must not carry its own outer
 * spacing: the gap between two buttons belongs to the row that holds them
 * (`flex gap-2`), and a margin baked into the control would apply in the one
 * place it is wrong -- a button alone in a cell, or first in a row. Every
 * call site in this app already spaces buttons with a flex gap; this is the
 * note that says it is a rule rather than a coincidence.
 *
 * TOUCH TARGETS. 40px is 4px under the 44px iOS/WCAG-2.5.5 guideline and over
 * the 24px WCAG 2.2 AA minimum (2.5.8). The 4px is the trade this design
 * system already makes everywhere, and it is made once here rather than
 * re-litigated per screen; `s` at 32px is for dense rows where a 44px control
 * would push the content it belongs to.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium ' +
    // TRANSFORM JOINS THE TRANSITION (Gabe, 2026-09-11: "add tapped animations
    // across all buttons"). `transition-colors` alone meant a press changed
    // nothing that moved, so on a touch screen -- where there is no hover to
    // confirm the finger landed -- a button gave no feedback at all until the
    // work it started finished.
    //
    // NAMED PROPERTIES, NOT `transition-all`. `all` animates width, height and
    // every inherited property besides, so a button whose label swaps to
    // "Saving" would slide its own width and any ancestor layout change would
    // drag it along.
    'transition-[color,background-color,border-color,transform] duration-(--duration-fast) ' +
    // 0.97, not 0.9. The press should read as the control taking the weight,
    // not as it shrinking away; at a 40px control 0.97 is just over a pixel on
    // each edge, which is felt more than seen. `active:` rather than a JS
    // handler so it covers pointer, touch and keyboard-Enter alike.
    'active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent-default text-accent-on-accent hover:bg-accent-hover',
        secondary:
          'border border-border-default bg-bg-canvas text-text-primary hover:bg-bg-inset',
        ghost: 'text-text-secondary hover:bg-bg-inset hover:text-text-primary',
      },
      size: {
        /** 40px. The app's default: a header action, a form's submit. */
        m: 'h-10 gap-2 px-4 text-body-m',
        /** 32px. A dense row, a panel header, a control beside a table. */
        s: 'h-8 gap-1.5 px-3 text-body-s',
        /**
         * 40px square. `m` with the label removed, so the two sit level in a
         * row without either being nudged.
         *
         * `px-0` is stated rather than omitted because `cn`/twMerge resolves
         * conflicts by CLASS NAME, and `size-10` does not conflict with a
         * `px-4` a caller might still be passing -- an icon button with 16px
         * of horizontal padding inside a 40px box has 8px left for a 16px
         * glyph, which overflows.
         */
        'icon-m': 'size-10 gap-0 px-0',
        /** 32px square. `s` with the label removed. */
        'icon-s': 'size-8 gap-0 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'm' },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
