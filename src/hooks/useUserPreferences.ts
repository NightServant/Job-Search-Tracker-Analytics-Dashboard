import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userPreferencesService } from '@/services/userPreferencesService'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { SupportedCurrency } from '@/services/userPreferences'

/**
 * The read half of the currency seam: `/applications` and `/settings` both
 * need the signed-in user's stored preferences row, and both read it through
 * this hook so a write from Settings invalidates the one cache entry every
 * consumer shares -- the same reasoning `useJobs`'s docblock gives for why
 * every write on `/applications` goes through its hooks rather than
 * `jobService` directly.
 */
export function useUserPreferences() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: () => userPreferencesService.get(supabase),
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useSetDefaultCurrency() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: SupportedCurrency) => userPreferencesService.setDefaultCurrency(supabase, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] })
    },
  })
}
