'use client'

import * as React from 'react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, PasswordInput } from '@/components/ui/input'
import { CheckIcon, CircleCheckIcon, ShieldCheckIcon, UserRoundIcon } from '@/components/icons'
import {
  isPasswordStrong,
  isValidEmail,
  normalizeEmail,
  PASSWORD_MAX_LENGTH,
} from '@/lib/credentials'
import { takeAuthAttempt, resetAuthAttempts } from '@/lib/authRateLimit'
import type { OAuthProviderId } from '@/lib/oauthProviders'
import { AuthBrandPanel } from './AuthBrandPanel'
import { OAuthButtons } from './OAuthButtons'
import { OtpStep } from './OtpStep'
import { PasswordRequirements } from './PasswordRequirements'
import { RegistrationProgress } from './RegistrationProgress'

/**
 * Registration, as three steps over one layout.
 *
 * credentials -> verify -> done. The steps are state rather than routes: a
 * half-finished sign-up is not a place you should be able to link someone to,
 * bookmark, or return to with the back button, because the only thing that
 * makes step two meaningful is having just completed step one.
 *
 * VALIDATION HAPPENS BEFORE THE NETWORK, and that is the rate-limiting story
 * as much as the usability one. Every request this form does not send is a row
 * the auth server does not have to reject, and a malformed address or a weak
 * password was never going to succeed. What remains is throttled per browser
 * -- see lib/authRateLimit, which is candid about being an affordance rather
 * than a boundary.
 *
 * The email is NORMALISED before it goes anywhere: trimmed and lowercased, so
 * Gabe@x.com and gabe@x.com are one identity. Without that, walking the case
 * permutations of a single address is a way to create many rows that all
 * belong to one person.
 */
export interface SignUpFlowProps {
  onSignUp: (email: string, password: string) => Promise<void>
  onVerify: (email: string, code: string) => Promise<void>
  onResend: (email: string) => Promise<void>
  onProvider: (provider: OAuthProviderId) => Promise<void>
  /** Called after the thank-you has been shown. */
  onDone: () => void
  /** How long the thank-you holds before leaving. Injectable for tests. */
  doneDelayMs?: number
}

/**
 * The glyphs are chosen to say what the step ASKS OF YOU, not what it is
 * called. A person for the details you hand over, a shield for the check that
 * the address is really yours, a tick for being through. A numbered circle
 * would have said nothing the label does not already say.
 */
const STEPS = [
  { label: 'your details', icon: UserRoundIcon },
  { label: 'verify', icon: ShieldCheckIcon },
  { label: 'done', icon: CircleCheckIcon },
]
type Step = 0 | 1 | 2

export function SignUpFlow({
  onSignUp,
  onVerify,
  onResend,
  onProvider,
  onDone,
  doneDelayMs = 2500,
}: SignUpFlowProps) {
  const [step, setStep] = React.useState<Step>(0)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (step !== 2) return
    const id = setTimeout(onDone, doneDelayMs)
    // Cleared on unmount so a navigation away cannot fire a redirect into a
    // page the person has already left.
    return () => clearTimeout(id)
  }, [step, onDone, doneDelayMs])

  async function handleDetails(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const cleanEmail = normalizeEmail(email)

    if (!isValidEmail(cleanEmail)) {
      setError('That does not look like an email address we can reach.')
      return
    }
    if (!isPasswordStrong(password)) {
      setError(
        password.length > PASSWORD_MAX_LENGTH
          ? `Passwords are limited to ${PASSWORD_MAX_LENGTH} characters.`
          : 'Your password does not meet every requirement below yet.'
      )
      return
    }
    if (password !== confirm) {
      setError('Those passwords do not match.')
      return
    }

    // Only now does anything leave the browser.
    const limit = takeAuthAttempt('signup')
    if (!limit.allowed) {
      setError(
        `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`
      )
      return
    }

    setBusy(true)
    try {
      await onSignUp(cleanEmail, password)
      setEmail(cleanEmail)
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel />

      <div className="flex w-full flex-col px-5 py-10 lg:w-1/2 lg:px-16">
        <div data-switch-desktop className="hidden text-body-s lg:block lg:self-end">
          <span className="text-text-muted">have an account? </span>
          <Link href="/login" className="text-accent-default underline underline-offset-4">
            sign in
          </Link>
        </div>

        <div className="flex-1" />

        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-8">
          <RegistrationProgress steps={STEPS} current={step} />

          {step === 0 && (
            <form onSubmit={handleDetails} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-heading-l text-text-primary">create an account</h1>
                <p className="text-body-m text-text-secondary">
                  An email and a password. We will send a code to check the address works.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Field id="signup-email" label="Email" required>
                <Input
                  id="signup-email"
                  name="email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  required
                  smoothCaret
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <div className="flex flex-col gap-3">
                <Field id="signup-password" label="Password" required>
                  <PasswordInput
                    id="signup-password"
                    name="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <PasswordRequirements password={password} />
              </div>

              <Field id="signup-confirm" label="Confirm password" required>
                <PasswordInput
                  id="signup-confirm"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>

              <Button type="submit" variant="primary" size="m" disabled={busy}>
                Create account
              </Button>

              <OAuthButtons onSelect={onProvider} disabled={busy} />

              <div data-switch-mobile className="text-body-s lg:hidden">
                <span className="text-text-muted">have an account? </span>
                <Link href="/login" className="text-accent-default underline underline-offset-4">
                  sign in
                </Link>
              </div>
            </form>
          )}

          {step === 1 && (
            <OtpStep
              email={email}
              onVerify={async (code) => {
                await onVerify(email, code)
                resetAuthAttempts('signup')
                setStep(2)
              }}
              onResend={() => onResend(email)}
              onBack={() => {
                setStep(0)
                setError(null)
              }}
            />
          )}

          {step === 2 && (
            <div data-signup-done className="flex flex-col items-center gap-4 text-center">
              <span
                aria-hidden
                className="grid h-12 w-12 place-items-center rounded-full bg-status-offer-mark/10 text-status-offer-mark"
              >
                <CheckIcon size={24} />
              </span>
              <h1 className="text-heading-l text-text-primary">you are all set</h1>
              <p className="text-body-m text-text-secondary">
                Your account is verified. Taking you to your dashboard now.
              </p>
              {/*
                A link beside the automatic redirect, not instead of it: an
                automatic navigation that fails silently leaves someone on a
                thank-you page forever, and this is the way out.
              */}
              <Link
                href="/dashboard"
                className="text-body-s text-accent-default underline underline-offset-4"
              >
                go to the dashboard now
              </Link>
            </div>
          )}
        </div>

        <div className="flex-1" />
      </div>
    </div>
  )
}
