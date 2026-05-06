import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobService } from '@/services/jobService'
import { Job, JobFormData, JobStatus } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to fetch all jobs
 */
export function useJobs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: jobService.getJobs,
    enabled: !!user,
  })
}

/**
 * Hook to fetch a single job
 */
export function useJob(id: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['jobs', user?.id, id],
    queryFn: () => jobService.getJob(id),
    enabled: !!id && !!user,
  })
}

/**
 * Hook to fetch status history for a job
 */
export function useJobStatusHistory(jobId?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['job-status-history', user?.id, jobId],
    queryFn: () => jobService.getJobStatusHistory(jobId!),
    enabled: !!jobId && !!user,
  })
}

/**
 * Hook to fetch status history across all jobs
 */
export function useAllJobStatusHistory() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['job-status-history', user?.id],
    queryFn: jobService.getAllJobStatusHistory,
    enabled: !!user,
  })
}

/**
 * Hook to create a new job
 */
export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: JobFormData) => jobService.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

/**
 * Hook to create multiple jobs (bulk import)
 */
export function useCreateJobsBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (datas: JobFormData[]) => jobService.createJobsBulk(datas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

/**
 * Hook to update a job
 */
export function useUpdateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobFormData> }) =>
      jobService.updateJob(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['jobs'] })

      // Snapshot previous value
      const previousJobs = queryClient.getQueryData<Job[]>(['jobs'])

      // Optimistically update
      queryClient.setQueryData<Job[]>(['jobs'], (old) =>
        old?.map((job) => (job.id === id ? { ...job, ...data } : job))
      )

      return { previousJobs }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs'], context.previousJobs)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({
        queryKey: ['job-status-history', variables.id],
      })
      queryClient.invalidateQueries({ queryKey: ['job-status-history'] })
    },
  })
}

/**
 * Hook to update job status
 */
export function useUpdateJobStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      jobService.updateJobStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] })
      const previousJobs = queryClient.getQueryData<Job[]>(['jobs'])

      queryClient.setQueryData<Job[]>(['jobs'], (old) =>
        old?.map((job) => (job.id === id ? { ...job, status } : job))
      )

      return { previousJobs }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs'], context.previousJobs)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({
        queryKey: ['job-status-history', variables.id],
      })
      queryClient.invalidateQueries({ queryKey: ['job-status-history'] })
    },
  })
}

/**
 * Hook to delete a job
 */
export function useDeleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => jobService.deleteJob(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] })
      const previousJobs = queryClient.getQueryData<Job[]>(['jobs'])

      queryClient.setQueryData<Job[]>(['jobs'], (old) =>
        old?.filter((job) => job.id !== id)
      )

      return { previousJobs }
    },
    onError: (_err, _id, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs'], context.previousJobs)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

/**
 * Hook to auto-fill job fields from a posting URL.
 */
export function useAutofillJobFromUrl() {
  return useMutation({
    mutationFn: (url: string) => jobService.autofillFromUrl(url),
  })
}
