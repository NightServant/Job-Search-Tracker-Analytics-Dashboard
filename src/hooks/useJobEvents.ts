import { useQuery } from '@tanstack/react-query'
import { eventService } from '@/services/eventService'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to fetch the calendar events scheduled against one application.
 *
 * Same shape as `useJob` -- keyed on `['job-events', user?.id, jobId]`,
 * enabled only once both the id and the user are known. Named `useJobEvents`
 * rather than `useEvents` so it does not collide with the calendar's own
 * hook over `eventService.listUpcoming`, which Task 6 adds.
 */
export function useJobEvents(jobId?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['job-events', user?.id, jobId],
    queryFn: () => eventService.listForJob(supabase, jobId as string),
    enabled: !!jobId && !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
