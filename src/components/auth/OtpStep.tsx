'use client'

import * as React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/**
 * Step two: the six digits emailed to the address just entered.
 *
 * WHY A CODE AND NOT A LINK. A magic link has to survive being opened in a
 * different browser from the one that started the sign-up -- the mail client's
 * in-app webview, most often -- which lands the person in a session on a
 * browser they were not using. A code is typed back into the tab that is
 * already open, so the flow finishes where it started.
 *
 * `inputMode="numeric"` and `autoComplete="one-time-code"` are what let iOS and
 * Android offer the code from the notification, which is the difference between
 * typing six digits and not having to.
 *
 * The address is shown back, because "check your email" without saying WHICH
 * email is the step where someone with three addresses gives up.
 */
export interface OtpStepProps {
  email: string
  onVerify: (code: string) => Promise<void>
  onResend: () => Promise<void>
  onBack: () => void
}

const CODE_LENGTH = 6

export function OtpStep({ email, onVerify, onResend, onBack }: OtpStepProps) {
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const ready = code.length === CODE_LENGTH

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      await onVerify(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-l text-text-primary">check your email</h1>
        <p className="text-body-m text-text-secondary">
          We sent a {CODE_LENGTH}-digit code to <strong className="text-text-primary">{email}</strong>.
          Enter it below to finish creating your account.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <Field id="auth-otp" label="Verification code" required>
        <Input
          id="auth-otp"
          name="otp"
          value={code}
          // Digits only, and capped at the code length: a paste that carries a
          // space or the word "code" should still work rather than failing
          // against the auth server for a reason nobody can see.
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          required
          autoFocus
          // The last field in the flow, so it gets the same caret as the three
          // before it. The wide tracking is not a problem for it: skiper106's
          // measuring span copies letterSpacing off the computed style, so the
          // caret lands between the digits rather than drifting left of them.
          smoothCaret
          className="tabular tracking-[0.4em]"
        />
      </Field>

      {/*
        Both props, and they mean different things: `disabled` is "the code is
        not six digits yet", `loading` is "it has gone to the server". Folding
        the first into the second would show a spinner for an incomplete field.
      */}
      <Button
        type="submit"
        variant="primary"
        size="m"
        disabled={!ready}
        loading={busy}
      >
        Verify and continue
      </Button>

      <div className="flex items-center justify-between text-body-s">
        <button
          type="button"
          onClick={onBack}
          className="text-text-secondary underline underline-offset-4 hover:text-text-primary"
        >
          use a different email
        </button>
        <button
          type="button"
          data-resend
          disabled={busy}
          onClick={async () => {
            setError(null)
            try {
              await onResend()
              setNotice('A new code is on its way.')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not resend the code.')
            }
          }}
          className="text-accent-default underline underline-offset-4 disabled:opacity-50"
        >
          resend the code
        </button>
      </div>
    </form>
  )
}
