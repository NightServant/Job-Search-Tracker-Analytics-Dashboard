'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Keeps `data-session` on <html> honest after the first paint.
 *
 * SessionAttributeScript sets it from localStorage before anything renders,
 * which is fast and slightly credulous: it believes a token that expired
 * while the tab was closed, and it cannot run at all where localStorage is
 * blocked. This is the authoritative half -- it waits for `useAuth()` to
 * resolve and then states the answer, including the answer "no".
 *
 * `loading` IS RESPECTED, and that matters more here than it looks. The
 * context reports `user: null` while it is still reading, so acting on the
 * first render would strip the attribute the script just set and produce
 * exactly the flicker the script exists to prevent -- only backwards.
 *
 * It also covers the states the script cannot see because they happen after
 * it: signing in or out while the page is open, and a session that expires
 * under a tab left sitting.
 */
export function SessionAttributeSync() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    const root = document.documentElement
    if (user) root.setAttribute('data-session', 'live')
    else root.removeAttribute('data-session')
  }, [user, loading])

  return null
}
