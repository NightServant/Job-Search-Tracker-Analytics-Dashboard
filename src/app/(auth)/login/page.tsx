'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { safeNextPath } from '@/lib/authRoutes'

/**
 * Thin route wrapper, the same split every (app) route uses: AuthScreen takes
 * plain props and renders without Next routing or AuthProvider, and this file
 * owns the call and the navigation.
 *
 * The redirect is inside the RESOLVED path only. The screen surfaces a
 * rejection as its own error and keeps what was typed; navigating on a
 * rejection is how the old single-screen version lost a form.
 *
 * `?next=` IS HONOURED, and it is the other half of the middleware added on
 * 2026-09-11: a signed-out visitor who asked for `/applications?application=x`
 * is sent here with that path attached, and finishing the sign-in should
 * finish the journey rather than dropping them on a dashboard they never asked
 * for. `safeNextPath` is what stops that parameter being an open redirect --
 * it is in a URL somebody can send you, so `//evil.com` is refused rather than
 * trusted.
 */
function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { signIn, signInWithProvider } = useAuth()
  const next = safeNextPath(params.get('next')) ?? '/dashboard'

  return (
    <AuthScreen
      mode="signin"
      onSubmit={async (email, password) => {
        await signIn(email, password)
        router.push(next)
      }}
      // No router call on this path: signInWithProvider hands the browser to
      // the provider, so the page is on its way out. Pushing a route into a
      // navigation that is already happening is a race with no winner.
      onProvider={signInWithProvider}
    />
  )
}

/**
 * `useSearchParams` opts a client page out of static prerendering, which Next
 * 15 fails the build over unless the read sits behind a Suspense boundary --
 * the same wrapper `/applications` and `/cv` already need.
 */
export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}
