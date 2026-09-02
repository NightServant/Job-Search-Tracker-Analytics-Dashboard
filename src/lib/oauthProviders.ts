/**
 * The OAuth providers this app offers, and the ones it cannot.
 *
 * YAHOO IS NOT AVAILABLE, and that is a platform fact rather than a decision:
 * Supabase Auth ships a fixed provider list (Google, GitHub, GitLab, Azure,
 * Apple, Discord, Facebook, and others) and Yahoo is not on it. Offering a
 * Yahoo button would mean either standing up a custom OIDC integration or
 * drawing a button that cannot work. GitHub takes the second slot instead,
 * which also suits a portfolio whose main call to action is "read the source".
 *
 * Each provider must ALSO be enabled and given a client ID and secret in the
 * Supabase dashboard before its button does anything -- the secret lives
 * there, never in this repo. See docs/SECURITY.md.
 */
export type OAuthProviderId = 'google' | 'github'

export interface OAuthProvider {
  id: OAuthProviderId
  label: string
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'github', label: 'Continue with GitHub' },
]
