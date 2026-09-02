'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'

/**
 * The sign-up half of 6.2, written out in full rather than sharing a factory
 * with /login. Two four-line files that differ in two identifiers are clearer
 * than one abstraction over them -- and the pair has a test asserting this one
 * calls signUp rather than signIn, because a copy-paste that gets it wrong
 * still compiles and still redirects.
 */
export default function Page() {
  const router = useRouter()
  const { signUp } = useAuth()

  return (
    <AuthScreen
      mode="signup"
      onSubmit={async (email, password) => {
        await signUp(email, password)
        router.push('/dashboard')
      }}
    />
  )
}
