import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userProfileService } from '@/services/userProfileService'
import { importLinkedInExport, type ImportResult } from '@/services/linkedinExport'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * The stored profile, and the import that fills it.
 *
 * NO FETCH ANY MORE. Two earlier versions of this hook called a route -- one
 * to a Composio connector, one to a page scraper. Both are gone: the parsing
 * now happens in the browser from a file the user already owns, so there is
 * no key to hold, no third party to reach and nothing to be blocked by.
 */
export function useUserProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => userProfileService.get(supabase),
    enabled: !!user,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/**
 * Parses the export and stores the result.
 *
 * The parse is synchronous and local, so the only thing that can fail here is
 * the write -- which is why the mutation resolves the `ImportResult` rather
 * than swallowing it: the caller needs to say which tables were understood and
 * which files were not.
 */
export function useImportProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<ImportResult, Error, { name: string; text: string }[]>({
    mutationFn: async (files) => {
      const result = importLinkedInExport(files)
      // A file set that matched nothing is not written -- storing an empty
      // profile over a good one because someone picked the wrong CSV is a
      // worse outcome than an error message.
      if (result.recognised.length) {
        await userProfileService.saveProfile(supabase, result.profile)
      }
      return result
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
    },
  })
}

export function useClearUserProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => userProfileService.clear(supabase),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
    },
  })
}
