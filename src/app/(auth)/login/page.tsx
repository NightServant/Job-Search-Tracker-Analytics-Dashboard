'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'

/**
 * Thin route wrapper, the same split every (app) route uses: AuthScreen takes
 * plain props and renders without Next routing or AuthProvider, and this file
 * owns the call and the navigation.
 *
 * The redirect is inside the RESOLVED path only. The screen surfaces a
 * rejection as its own error and keeps what was typed; navigating on a
 * rejection is how the old single-screen version lost a form.
 */
export default function Page() {
  const router = useRouter()
  const { signIn } = useAuth()

  return (
    <AuthScreen
      mode="signin"
      onSubmit={async (email, password) => {
        await signIn(email, password)
        router.push('/dashboard')
      }}
    />
  )
}
