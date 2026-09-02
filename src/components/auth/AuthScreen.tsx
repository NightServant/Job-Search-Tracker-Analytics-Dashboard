'use client'

import * as React from 'react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/input'
import { SmoothInput } from '@/components/v1/skiper106'
import { AuthBrandPanel } from './AuthBrandPanel'

/**
 * Sign in and sign up, as one screen in two modes.
 *
 * TWO ROUTES, ONE COMPONENT -- the opposite of what it replaces. The old
 * src/screens/LoginPage.tsx served both behind a local `isLogin` boolean, so
 * the two states shared a URL: no way to link someone to sign-up, no way for
 * the browser to remember which you were on, and a back button that did
 * nothing. Here `/login` and `/signup` are real routes and `mode` is a prop,
 * which is also why the switch between them is a LINK rather than a button.
 *
 * It takes plain props and renders without Next routing or AuthProvider, the
 * same split every (app) route already uses: the route owns the call and the
 * navigation, this owns the form.
 *
 * `onSubmit` REJECTS on failure -- that is useAuth's contract, where signIn and
 * signUp throw rather than returning an error object. The rejection is caught
 * here, its message is rendered, and THE FIELDS ARE NOT CLEARED. This milestone
 * has already shipped that defect twice (a failed save that discarded nineteen
 * typed fields, an editor that dropped keystrokes mid-save), so it is a test
 * rather than an intention.
 *
 * The email field is skiper106's SmoothInput; the password fields are M4's
 * PasswordInput. On a masked field there is no visible caret to smooth -- the
 * characters are dots -- so the technique buys nothing there, while the
 * redrawn caret would have to share a box with PasswordInput's absolutely
 * positioned reveal control. That control's `right-2` anchor is M4's fix for
 * the Figma frame's off-canvas button at 335px, and reusing it is the point.
 */
export type AuthMode = 'signin' | 'signup'

export interface AuthScreenProps {
  mode: AuthMode
  /** Rejects with an Error whose message is shown to the user. */
  onSubmit: (email: string, password: string) => Promise<void>
}

const COPY = {
  signin: {
    title: 'sign in',
    lede: 'Pick up where you left off.',
    submit: 'Sign in',
    switchPrompt: 'no account yet?',
    switchLabel: 'sign up',
    switchHref: '/signup',
  },
  signup: {
    title: 'create an account',
    lede: 'An email and a password. Nothing else.',
    submit: 'Create account',
    switchPrompt: 'have an account?',
    switchLabel: 'sign in',
    switchHref: '/login',
  },
} as const

export function AuthScreen({ mode, onSubmit }: AuthScreenProps) {
  const copy = COPY[mode]
  const isSignUp = mode === 'signup'

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (isSignUp && password !== confirm) {
      // Checked before the network call, not after: there is nothing to ask
      // the server about, and a round trip to learn what we already know
      // spends the visitor's time to tell them off.
      setError('Those passwords do not match.')
      return
    }

    setBusy(true)
    try {
      await onSubmit(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      // In a finally, so a rejection cannot strand the button disabled and
      // leave the visitor with a form they can see but not resubmit.
      setBusy(false)
    }
  }

  const switchLink = (
    <>
      <span className="text-text-muted">{copy.switchPrompt} </span>
      <Link href={copy.switchHref} className="text-accent-default underline underline-offset-4">
        {copy.switchLabel}
      </Link>
    </>
  )

  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel />

      <div className="relative flex w-full flex-col px-5 py-10 lg:w-1/2 lg:px-16">
        {/*
          Two switch links, one per breakpoint. A top-right link on a 375px
          screen is an awkward tap target beside nothing else, so mobile gets
          it under the form where the thumb already is.
        */}
        <div data-switch-desktop className="hidden text-body-s lg:block lg:self-end">
          {switchLink}
        </div>

        {/* Two flex-1 spacers keep the form optically centred on tall screens. */}
        <div className="flex-1" />

        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[400px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-heading-l text-text-primary">{copy.title}</h1>
            <p className="text-body-m text-text-secondary">{copy.lede}</p>
          </div>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Field id="auth-email" label="Email" required>
            <SmoothInput
              id="auth-email"
              name="email"
              type="text"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              wrapperClassName="rounded-md border border-border-default bg-bg-canvas px-3 py-2 focus-within:border-accent-default"
              className="text-body-m text-text-primary placeholder:text-text-muted"
            />
          </Field>

          <Field id="auth-password" label="Password" required>
            <PasswordInput
              id="auth-password"
              name="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {isSignUp && (
            <Field id="auth-confirm" label="Confirm password" required>
              <PasswordInput
                id="auth-confirm"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          )}

          <Button type="submit" variant="primary" size="m" disabled={busy}>
            {copy.submit}
          </Button>

          <div data-switch-mobile className="text-body-s lg:hidden">
            {switchLink}
          </div>
        </form>

        <div className="flex-1" />

        <p className="mx-auto w-full max-w-[400px] text-caption text-text-muted">
          By continuing you agree to how this application stores your data, which is described
          on the{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            privacy page
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
