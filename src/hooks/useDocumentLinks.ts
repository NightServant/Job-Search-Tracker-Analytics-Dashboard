import { useQuery } from '@tanstack/react-query'
import { documentLinkService } from '@/services/documentLinkService'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to fetch the CVs linked to one application.
 *
 * Same shape as `useJob` -- keyed on `['document-links', user?.id, jobId]`,
 * enabled only once both the id and the user are known.
 */
export function useDocumentLinks(jobId?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['document-links', user?.id, jobId],
    queryFn: () => documentLinkService.listForJob(supabase, jobId as string),
    enabled: !!jobId && !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
