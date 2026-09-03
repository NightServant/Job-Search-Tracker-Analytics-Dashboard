'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { OAUTH_PROVIDERS, type OAuthProviderId } from '@/lib/oauthProviders'

/**
 * The faster way in.
 *
 * BELOW THE EMAIL FORM, with the divider above it. This component argued the
 * opposite until 2026-09-02 -- that a provider user should not have to read
 * past a password field to learn they could skip it -- and Gabe overruled it,
 * pointing at the reference layout where the manual fields come first.
 *
 * The overruled argument was also weaker than it read. Putting the providers
 * first makes the page open on someone else's brands, and it asks the visitor
 * to weigh an identity decision before they have seen how small the form
 * actually is. Fields first states the default -- an email and a password --
 * and the divider then offers the shortcut to anyone who wants it. Nobody is
 * hunting for a Google button; it is the most recognisable thing on the page
 * either way.
 *
 * THEY CARRY THE PROVIDERS' OWN MARKS, which reverses what this file used to
 * say. The old argument was that Google's guidelines are specific about how
 * its mark may be drawn and an approximated logo is worse than none. True, and
 * the conclusion did not follow: the answer to an approximation is an accurate
 * mark. Both are drawn from the vendors' published geometry and palettes in
 * @/components/brand/provider-marks, which is a separate directory precisely
 * because they are fixed-colour artwork rather than members of this design
 * system's one stroke-icon vocabulary.
 *
 * A provider button is also the one place a logo does real work. People do not
 * read these buttons, they recognise them, and the four-colour G is faster to
 * find than the word Google in the middle of a sentence.
 */
export interface OAuthButtonsProps {
  onSelect: (provider: OAuthProviderId) => Promise<void> | void
  disabled?: boolean
}

export function OAuthButtons({ onSelect, disabled = false }: OAuthButtonsProps) {
  const [busy, setBusy] = React.useState<OAuthProviderId | null>(null)

  return (
    <div data-oauth-buttons className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-body-s text-text-muted">or</span>
        <Separator className="flex-1" />
      </div>

      <div className="flex flex-col gap-2">
        {OAUTH_PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="secondary"
            size="m"
            data-provider={provider.id}
            // The spinner goes on the button that was CLICKED; the others are
            // merely disabled. One provider redirecting is not three providers
            // thinking, and three spinners would say it was.
            loading={busy === provider.id}
            disabled={disabled || busy !== null}
            onClick={async () => {
              setBusy(provider.id)
              try {
                await onSelect(provider.id)
              } finally {
                // In a finally: an OAuth start that rejects (misconfigured
                // provider, blocked popup) must not strand every button
                // disabled with no way back.
                setBusy(null)
              }
            }}
          >
            <provider.mark size={18} />
            {provider.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
