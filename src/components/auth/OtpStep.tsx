'use client'

import * as React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ShieldCheckIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
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

/**
 * Seconds the resend link is unavailable after a send.
 *
 * NOT A UX FLOURISH -- A QUOTA GUARD. The auth logs for 2026-09-15 show five
 * `/resend` calls inside one second, then two more a minute later: the button
 * was disabled only by the VERIFY busy flag, so nothing stopped a second click
 * while the first request was still open. Somebody whose code has not arrived
 * clicks it repeatedly, which is the reasonable thing to do and which this
 * screen was rewarding with one email per click.
 *
 * `[auth.rate_limit] email_sent = 30` is per PROJECT per hour, not per person.
 * Seven wasted sends is a quarter of the hour's budget spent by one impatient
 * person, and the punishment for exhausting it lands on whoever signs up next:
 * they get no code at all, which looks exactly like the bug being clicked at.
 *
 * Thirty seconds is long enough to cover the delivery lag that provokes the
 * clicking -- an SMTP relay plus Gmail is rarely instant -- and short enough
 * that a genuinely lost email is not a long wait.
 */
const RESEND_COOLDOWN_SECONDS = 30

export function OtpStep({ email, onVerify, onResend, onBack }: OtpStepProps) {
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  // Separate from `busy`, which is the VERIFY flag. Sharing one boolean is
  // what left resend unguarded while its own request was in flight.
  const [resending, setResending] = React.useState(false)
  const [cooldown, setCooldown] = React.useState(0)

  React.useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

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
          // Six dots, not "Enter the code": this is the one field where the
          // SHAPE of the answer is the useful hint, and the label above
          // already names what it is.
          placeholder="······"
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
        loadingText="Checking the code..."
      >
        {!busy && <ShieldCheckIcon size={16} aria-hidden className={iconMotion('lift')} />}
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
          disabled={busy || resending || cooldown > 0}
          onClick={async () => {
            // Guarded three ways, and each one covers a click the others do
            // not: `busy` while a code is being verified, `resending` while
            // this request is open, `cooldown` for the burst of clicks that
            // follows a send which has not arrived yet.
            if (resending || cooldown > 0) return
            setError(null)
            setResending(true)
            try {
              await onResend()
              setNotice('A new code is on its way.')
              setCooldown(RESEND_COOLDOWN_SECONDS)
            } catch (err) {
              // No cooldown on failure: nothing was sent, so nothing was
              // spent, and making someone wait 30s to retry a request that
              // never left is punishing them for the server's problem.
              setError(err instanceof Error ? err.message : 'Could not resend the code.')
            } finally {
              setResending(false)
            }
          }}
          className="text-accent-default underline underline-offset-4 disabled:opacity-50"
        >
          {cooldown > 0 ? `resend in ${cooldown}s` : resending ? 'sending...' : 'resend the code'}
        </button>
      </div>
    </form>
  )
}
