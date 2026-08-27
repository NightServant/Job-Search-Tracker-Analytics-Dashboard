import { useQuery } from '@tanstack/react-query'
import { eventService } from '@/services/eventService'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to fetch every scheduled item from now onward, for the calendar
 * screen. Named `useEvents` rather than `useUpcomingEvents` to mirror
 * `useJobs`/`useJob`'s naming (the plural hook is the list read); see
 * `useJobEvents`'s docblock for why that one hook, over
 * `eventService.listForJob`, is named the way it is instead of colliding
 * with this one.
 *
 * `fromIso` is computed once per render via `useMemo`-free `Date.now()` at
 * call time rather than passed in, since every caller wants "upcoming from
 * right now" and there is no second caller yet that would need a different
 * anchor.
 */
export function useEvents() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['events', user?.id, 'upcoming'],
    queryFn: () => eventService.listUpcoming(supabase, new Date().toISOString()),
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
