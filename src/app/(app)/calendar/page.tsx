'use client'

import { useEvents } from '@/hooks/useEvents'
import { Calendar } from '@/components/calendar/Calendar'
import { RouteLoading, RouteError } from '@/components/ui/route-states'

/**
 * Thin route wrapper, same split as `dashboard/page.tsx`: `Calendar` takes
 * its events as props so it renders without Next routing or react-query,
 * and this file owns the single `useEvents()` read (which wraps
 * `eventService.listUpcoming`).
 */
export default function Page() {
  const { data: events = [], isLoading, error } = useEvents()

  if (isLoading) {
    return <RouteLoading />
  }

  if (error) {
    return (
      <RouteError
        title="Could not load your calendar."
        message={error instanceof Error ? error.message : 'An error occurred while loading your events.'}
      />
    )
  }

  return <Calendar events={events} />
}
