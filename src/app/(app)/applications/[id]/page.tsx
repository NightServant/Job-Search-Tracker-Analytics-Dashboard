'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RouteSkeleton } from '@/components/ui/loading-skeletons'

/**
 * A REDIRECT, AT EVERY WIDTH.
 *
 * This used to be the mobile surface for one application: a full-screen page
 * with its own header, its own action row and its own copy of the form, while
 * desktop got a dialog on the list screen. Two surfaces, two editions of the
 * same record, kept in step by hand.
 *
 * The revision collapsed them (item 3: "View displays the bottom sheet
 * version of the new view"). `AppDialog` is a bottom sheet below 640 -- full
 * width, anchored to the edge a thumb reaches, top corners rounded -- so the
 * phone now gets the same record the desktop does, in the shape a phone
 * wants. There is nothing left for this route to render that the list screen
 * does not render better.
 *
 * It stays as a route because the address is real and shareable: the dashboard
 * links here, the follow-up nudge links here, and so does every bookmark
 * anybody has made. `?application=<id>` carries the intent across.
 *
 * `router.replace`, not `push`: the redirect must not become a history entry,
 * or Back from the list would bounce straight through here and forward again.
 */
export default function Page() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()

  React.useEffect(() => {
    if (id) router.replace(`/applications?application=${encodeURIComponent(id)}`)
  }, [id, router])

  return <RouteSkeleton variant="detail" />
}
