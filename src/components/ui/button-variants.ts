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
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
    'transition-colors duration-(--duration-fast) ' +
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
        m: 'h-10 px-4 text-body-m',
        s: 'h-8 px-3 text-body-s',
      },
    },
    defaultVariants: { variant: 'primary', size: 'm' },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
