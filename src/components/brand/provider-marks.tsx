/**
 * Provider brand marks for the OAuth buttons.
 *
 * THESE ARE NOT ICONS AND THEY DO NOT LIVE IN @/components/icons. Everything
 * in that barrel is a stroke drawing that inherits `currentColor`, sized
 * through a numeric prop, and the barrel's own test asserts no hex ever
 * appears in one. These are the opposite by definition: a brand mark is fixed
 * artwork in fixed colours, and recolouring Google's G to match a theme is the
 * one thing its guidelines actually forbid. Separate directory, separate
 * rules, so neither set has to bend for the other.
 *
 * OAuthButtons argued against carrying logos at all -- "an approximated logo
 * is worse than none". That was the right instinct and the wrong conclusion:
 * the answer to an approximation is an accurate mark, not a bare label. Gabe
 * asked for them on 2026-09-03. Both are drawn from the vendors' own published
 * geometry and palettes rather than traced by eye, which is what makes the
 * original objection moot.
 *
 * Both render at a fixed 24-unit viewBox and take a numeric `size`, matching
 * how every icon in this app is sized, so a caller does not have to learn a
 * second convention. `aria-hidden` by default: the button label beside the
 * mark already says which provider it is, and announcing both reads the
 * provider's name twice.
 */
export interface ProviderMarkProps {
  /** Rendered size in px. */
  size?: number
  className?: string
}

/**
 * Google's four-colour G, per the Google Identity branding guidelines.
 *
 * The colours are Google's own: #4285F4 blue, #34A853 green, #FBBC05 yellow,
 * #EA4335 red. They are literals rather than tokens on purpose -- this artwork
 * must look identical in both themes, and a token would invert it in dark.
 */
export function GoogleMark({ size = 18, className }: ProviderMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.57z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.1 0 5.7-1.03 7.62-2.78l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 23.5z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.18a6.9 6.9 0 0 1 0-4.36V6.84H1.7a11.5 11.5 0 0 0 0 10.32l3.85-2.98z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.7 1.29 15.1.25 12 .25A11.5 11.5 0 0 0 1.7 6.84l3.85 2.98C6.46 7.09 9 4.75 12 4.75z"
      />
    </svg>
  )
}

/**
 * Microsoft's four squares, per the Microsoft brand guidelines.
 *
 * Four equal squares with a gap of one unit between them, in Microsoft's own
 * palette: #F25022 orange-red, #7FBA00 green, #00A4EF blue, #FFB900 yellow.
 * There is deliberately no wordmark and no outer container -- the squares are
 * the mark, and the button's label supplies the name.
 */
export function MicrosoftMark({ size = 18, className }: ProviderMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  )
}
