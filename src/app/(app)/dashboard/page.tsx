'use client'

import { useEffect, useState } from 'react'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { Spinner } from '@/components/ui/spinner'
import { jobService } from '@/services/jobService'
import type { Job } from '@/types'

/**
 * Thin route wrapper. All the layout lives in `Dashboard`, which takes its
 * data as props so it can be rendered directly in tests without going
 * through Next routing -- this component's only job is to fetch and hand it
 * off.
 */
export default function Page() {
  const [jobs, setJobs] = useState<Job[] | null>(null)

  useEffect(() => {
    let active = true
    jobService
      .getJobs()
      .then((data) => {
        if (active) setJobs(data)
      })
      .catch((error) => {
        console.error('Failed to load dashboard jobs', error)
        if (active) setJobs([])
      })
    return () => {
      active = false
    }
  }, [])

  if (jobs === null) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={24} />
      </div>
    )
  }

  return <Dashboard jobs={jobs} />
}
