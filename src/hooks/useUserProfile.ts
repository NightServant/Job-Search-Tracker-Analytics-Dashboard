import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userProfileService } from '@/services/userProfileService'
import { importLinkedInExport, type ImportResult } from '@/services/linkedinExport'
import { authedFetch } from '@/lib/authedFetch'
import { EMPTY_PROFILE, type UserProfile } from '@/services/profile'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * The stored profile, and the import that fills it.
 *
 * THERE IS A FETCH AGAIN, and this time it is Firecrawl's (Gabe, Worktrack
 * Revisions item 8). Two earlier versions of this hook called a route -- one
 * to a Composio connector, which returned eight OIDC fields, and one to a page
 * scraper, which got an authentication wall from a datacenter address. What is
 * different now is the fetcher: Firecrawl runs the page and proxies it, so
 * what comes back is the logged-out profile a browser would see, JSON-LD and
 * all. See `scraper/extractor/profile.py` for exactly what that does and does
 * not carry.
 *
 * `useImportProfile` -- the CSV-export parser -- is left in place and unused,
 * on Gabe's instruction not to remove what this supersedes. It is still the
 * only source that has ever carried the bullet text under a role, so it is
 * worth having when the fetch turns out not to be enough.
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

/** What `/api/profile` resolves to. Mirrors `extract_profile`'s return. */
export interface ProfileFetchResult {
  profile: UserProfile
  warnings: string[]
}

/**
 * Reads a public LinkedIn profile through Firecrawl and stores the result.
 *
 * IT MERGES RATHER THAN REPLACES, the same rule the CSV import follows: a
 * fetch that came back with a name and no work history must not blank the work
 * history somebody typed in by hand. Only the fields the fetch actually filled
 * are written over.
 */
export function useImportProfileFromUrl() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<ProfileFetchResult, Error, string>({
    mutationFn: async (url) => {
      const response = await authedFetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const payload = (await response.json()) as
        | { profile?: Partial<UserProfile>; warnings?: string[] }
        | { error?: string }
      if (!response.ok) {
        throw new Error(
          ('error' in payload && payload.error) || 'Could not read that profile.'
        )
      }
      const fetched = ('profile' in payload && payload.profile) || {}
      const existing = await userProfileService.get(supabase)

      const merged: UserProfile = { ...EMPTY_PROFILE, ...(existing ?? {}) }
      for (const [key, value] of Object.entries(fetched) as [keyof UserProfile, unknown][]) {
        // An empty string, an empty array and null all mean "the page did not
        // have this", and none of them should overwrite something that does.
        if (value === null || value === undefined) continue
        if (Array.isArray(value) && value.length === 0) continue
        if (typeof value === 'string' && value.trim() === '') continue
        ;(merged as unknown as Record<string, unknown>)[key] = value
      }
      merged.fetchedAt = new Date().toISOString()

      await userProfileService.saveProfile(supabase, merged)
      return {
        profile: merged,
        warnings: ('warnings' in payload && payload.warnings) || [],
      }
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
