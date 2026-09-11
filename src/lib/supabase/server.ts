import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

import { currentEnvSource, readSupabaseConfig } from '@/lib/env'

/**
 * A Supabase client that reads the session from COOKIES rather than
 * localStorage, so the server can see who is asking.
 *
 * WHY THIS EXISTS. Every redirect in this app used to be a client-side
 * correction made after something was already on screen -- the sign-in form to
 * a signed-in visitor, the app shell to a signed-out one -- because
 * `supabase-js` stores its session in localStorage and a server cannot read
 * localStorage. Two components and an inline `<script>` existed to paper over
 * exactly that, and each of them had a window it could not cover.
 *
 * A cookie is sent with the request. That is the whole difference: middleware
 * can decide BEFORE a response is produced, so the wrong page is never sent at
 * all rather than being retracted a moment later.
 *
 * THE COST, PAID ONCE AND STATED: moving the session from localStorage to
 * cookies means existing sessions are not carried over. Everybody signed in at
 * the moment this deploys is signed out and signs in again. There is no
 * migration path that avoids it -- the old session lives somewhere the server
 * has never been able to reach.
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  const { url, anonKey, isConfigured } = readSupabaseConfig(currentEnvSource())
  if (!isConfigured) return null

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      /**
       * Written to BOTH the request and the response, which looks redundant
       * and is not. The request copy is what any later read in this same pass
       * sees -- without it a refreshed token would be invisible to the very
       * check that triggered the refresh. The response copy is what reaches
       * the browser.
       */
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })
}
