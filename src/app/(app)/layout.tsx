'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'

/**
 * The authenticated shell.
 *
 * This is the client-side half of the guard and exists so a signed-out visitor
 * is not left staring at an empty frame. It is not the security boundary --
 * every table is behind owner-only RLS, so an unauthenticated request returns
 * nothing regardless of what the UI renders.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  // Render nothing while auth resolves. Showing the shell and then redirecting
  // flashes protected chrome at someone who is not signed in.
  if (loading || !user) return null

  return <Layout>{children}</Layout>
}
