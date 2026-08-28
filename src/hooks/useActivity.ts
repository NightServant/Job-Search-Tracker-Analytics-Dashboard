import { useQuery } from '@tanstack/react-query'
import { activityService } from '@/services/activityService'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to fetch the activity log for one application.
 *
 * Follows `useJob`'s shape exactly -- keyed on `['activity', user?.id, jobId]`,
 * enabled only once both the id and the user are known. A bare `useEffect`
 * fetch here would be a second, cache-independent read on a screen that
 * already loads three other things through hooks, which is the failure mode
 * Tasks 3 and 4 were both sent back for.
 */
export function useActivity(jobId?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['activity', user?.id, jobId],
    queryFn: () => activityService.listForJob(supabase, jobId as string),
    enabled: !!jobId && !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
