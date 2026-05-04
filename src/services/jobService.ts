import { supabase } from '@/lib/supabase'
import {
  Job,
  JobAutofillResult,
  JobFormData,
  JobStatus,
  JobStatusHistoryEntry,
} from '@/types'

export const jobService = {
  // Convert Supabase/Postgrest error-like objects into standard Error
  _toError(err: unknown): Error {
    if (!err) return new Error('Unknown error')
    if (err instanceof Error) return err
    try {
      // Supabase/Postgrest errors usually have a `message` property
      const anyErr = err as any
      if (typeof anyErr.message === 'string' && anyErr.message.length > 0) {
        return new Error(anyErr.message)
      }
      // Fallback to details or full JSON
      if (typeof anyErr.details === 'string' && anyErr.details.length > 0) {
        return new Error(anyErr.details)
      }
      return new Error(JSON.stringify(anyErr))
    } catch (e) {
      return new Error('Unknown error')
    }
  },
  /**
   * Get all jobs for the current user
   */
  async getJobs(): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw this._toError(error)
    return data || []
  },

  /**
   * Get a single job by ID
   */
  async getJob(id: string): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw this._toError(error)
    return data
  },

  /**
   * Create a new job entry
   */
  async createJob(jobData: JobFormData): Promise<Job> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...jobData,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throw this._toError(error)
    return data
  },

  /**
   * Create multiple job entries (bulk insert)
   */
  async createJobsBulk(jobDatas: JobFormData[]): Promise<Job[]> {
    if (jobDatas.length === 0) return []

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const rows = jobDatas.map((jobData) => ({
      ...jobData,
      user_id: user.id,
    }))

    const { data, error } = await supabase.from('jobs').insert(rows).select('*')

    if (error) throw this._toError(error)
    return data || []
  },

  /**
   * Update an existing job
   */
  async updateJob(id: string, updates: Partial<JobFormData>): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw this._toError(error)
    return data
  },

  /**
   * Delete a job
   */
  async deleteJob(id: string): Promise<void> {
    const { error } = await supabase.from('jobs').delete().eq('id', id)

    if (error) throw this._toError(error)
  },

  /**
   * Update job status (convenience method)
   */
  async updateJobStatus(id: string, status: JobStatus): Promise<Job> {
    return this.updateJob(id, { status })
  },

  /**
   * Get status history for a job
   */
  async getJobStatusHistory(jobId: string): Promise<JobStatusHistoryEntry[]> {
    const { data, error } = await supabase
      .from('job_status_history')
      .select('*')
      .eq('job_id', jobId)
      .order('changed_at', { ascending: false })
      .limit(50)

    if (error) throw this._toError(error)
    return data || []
  },

  /**
   * Get status history across all jobs for the current user
   */
  async getAllJobStatusHistory(): Promise<JobStatusHistoryEntry[]> {
    const { data, error } = await supabase
      .from('job_status_history')
      .select('*')
      .order('changed_at', { ascending: true })
      .limit(5000)

    if (error) throw this._toError(error)
    return data || []
  },

  /**
   * Attempt to auto-fill job form fields from a public posting URL.
   */
  async autofillFromUrl(url: string): Promise<JobAutofillResult> {
    const { data, error } = await supabase.functions.invoke('job-url-autofill', {
      body: { url },
    })

    if (error) throw this._toError(error)
    if (!data || typeof data !== 'object' || !('values' in data)) {
      throw new Error('Auto-fill returned an invalid response')
    }

    return data as JobAutofillResult
  },
}
