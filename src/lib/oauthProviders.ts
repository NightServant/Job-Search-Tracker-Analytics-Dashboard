import type { ComponentType } from 'react'
import { GoogleMark, MicrosoftMark } from '@/components/brand/provider-marks'

/**
 * The OAuth providers this app offers, and the ones it cannot.
 *
 * MICROSOFT IS `azure`, NOT `microsoft`. Supabase Auth names this provider
 * after the identity platform behind it -- Microsoft Entra ID, still called
 * Azure in the SDK's union type -- so `signInWithOAuth({ provider: 'azure' })`
 * is what signs someone in with a Microsoft account, personal or work. Writing
 * 'microsoft' typechecks against nothing and fails at the call.
 *
 * It replaced GitHub on 2026-09-03 at Gabe's request. The trade is worth
 * naming: GitHub suited a portfolio whose main call to action is "read the
 * source", but it is a developer's account, and this product is for anyone
 * applying for a job. Microsoft carries Outlook, Hotmail and Live, plus every
 * work account, which is a far larger share of the addresses people actually
 * job-hunt from.
 *
 * YAHOO IS STILL NOT AVAILABLE, and that is a platform fact rather than a
 * decision: Supabase ships a fixed provider list and Yahoo is not on it.
 *
 * Each provider must ALSO be enabled and given a client ID and secret in the
 * Supabase dashboard before its button does anything -- the secret lives
 * there, never in this repo. See docs/SECURITY.md.
 */
export type OAuthProviderId = 'google' | 'azure'

export interface OAuthProvider {
  id: OAuthProviderId
  label: string
  /** The vendor's own mark, in the vendor's own colours. See provider-marks. */
  mark: ComponentType<{ size?: number; className?: string }>
}

/**
 * Extra OAuth scopes a provider needs beyond the defaults, by id.
 *
 * AZURE WILL NOT RETURN AN EMAIL WITHOUT BEING ASKED. Supabase Auth requires a
 * valid email address back from the provider -- it is the account's identity
 * in `auth.users` -- and Microsoft omits it from the token unless the `email`
 * scope is requested explicitly. Without this the Microsoft button completes
 * the whole round trip and then fails at the end, which reads like a Supabase
 * fault rather than a missing parameter.
 *
 * GOOGLE IS ABSENT ON PURPOSE. Its default scope set already carries email and
 * profile, so naming them would be a no-op that implies the list is exhaustive.
 * An entry here should mean "this provider needs something extra".
 */
export const OAUTH_SCOPES: Partial<Record<OAuthProviderId, string>> = {
  azure: 'email',
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  { id: 'google', label: 'Continue with Google', mark: GoogleMark },
  { id: 'azure', label: 'Continue with Microsoft', mark: MicrosoftMark },
]
