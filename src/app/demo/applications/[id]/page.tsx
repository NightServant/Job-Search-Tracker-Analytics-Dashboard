'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RouteSkeleton } from '@/components/ui/loading-skeletons'

/**
 * The demo's half of the same redirect. See
 * `src/app/(app)/applications/[id]/page.tsx` for why this route no longer
 * renders a record: the bottom sheet on the list screen IS the mobile record
 * now, at every width, and this address exists only so the links that point at
 * it keep working.
 */
export default function Page() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()

  React.useEffect(() => {
    if (id) router.replace(`/demo/applications?application=${encodeURIComponent(id)}`)
  }, [id, router])

  return <RouteSkeleton variant="detail" />
}
