import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getSnapshots } from '@/services/resumeSnapshotService'
import {
  resumeService,
  type ResumeCreateInput,
  type ResumeDraft,
  type ResumePatch,
  type ResumeSummary,
} from '@/services/resumeService'

/**
 * The `resumes` table through react-query, the same shape `useJobs` gives the
 * `jobs` table.
 *
 * `/documents` and `/cv` are two views of one table: saving in the editor has
 * to move the list's "updated" column and its version number, and deleting
 * from the list has to empty the editor. Both routes reading through these
 * hooks means that happens by invalidating one key rather than by either
 * screen knowing the other exists.
 */
const KEY = 'resumes'

export function useResumes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, user?.id],
    queryFn: () => resumeService.list(supabase),
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useResume(id?: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, user?.id, id],
    queryFn: () => resumeService.get(supabase, id as string),
    enabled: !!id && !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/**
 * A CV's snapshots, for the Documents list's version panel.
 *
 * Enabled only once a row has actually been expanded: loading every CV's
 * snapshots to render a list of CVs would be one query per row for something
 * almost nobody opens.
 */
export function useResumeVersions(resumeId?: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['resume-versions', user?.id, resumeId],
    queryFn: () => getSnapshots(resumeId as string, user!.id),
    enabled: !!resumeId && !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/**
 * Editing a CV changes its ATS match on every application it is pinned to, so
 * every write invalidates `cv-text` as well as the CV list. Without that, the
 * application detail screen keeps scoring against the CV as it was when the
 * page loaded.
 */
function useInvalidateResumes() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [KEY, user?.id] })
    void queryClient.invalidateQueries({ queryKey: ['cv-text', user?.id] })
  }
}

export function useCreateResume() {
  const invalidate = useInvalidateResumes()
  return useMutation({
    mutationFn: (input: ResumeCreateInput) => resumeService.create(supabase, input),
    onSuccess: invalidate,
  })
}

export function useUpdateResume() {
  const invalidate = useInvalidateResumes()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ResumePatch }) =>
      resumeService.update(supabase, id, patch),
    onSuccess: invalidate,
  })
}

export function useDeleteResume() {
  const invalidate = useInvalidateResumes()
  return useMutation({
    mutationFn: (id: string) => resumeService.remove(supabase, id),
    onSuccess: invalidate,
  })
}

export type { ResumeSummary, ResumeDraft }
