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
 * These carry no provider logos. Google's brand guidelines are specific about
 * how its mark may be drawn, and an approximated logo is worse than none --
 * this design system also has exactly one icon vocabulary, and neither mark is
 * in it. The label carries the meaning.
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
            {provider.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
