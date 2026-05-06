import * as Sentry from '@sentry/react'
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw this._toError(error)
    return data || []
  },

  /**
   * Get a single job by ID
   */
  async getJob(id: string): Promise<Job> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw this._toError(error)
    if (!data) throw new Error('Not found')
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

    Sentry.addBreadcrumb({
      category: 'job.mutation',
      message: 'Creating job',
      level: 'info',
      data: { company: jobData.company, role: jobData.role },
    })

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...jobData,
        user_id: user.id,
      })
      .select()
      .maybeSingle()

    if (error) throw this._toError(error)
    if (!data) throw new Error('Insert failed')
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    Sentry.addBreadcrumb({
      category: 'job.mutation',
      message: 'Updating job',
      level: 'info',
      data: { jobId: id, keys: Object.keys(updates) },
    })

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) throw this._toError(error)
    if (!data) throw new Error('Update failed or not authorized')
    return data
  },

  /**
   * Delete a job
   */
  async deleteJob(id: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    Sentry.addBreadcrumb({
      category: 'job.mutation',
      message: 'Deleting job',
      level: 'info',
      data: { jobId: id },
    })

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

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
    // Ensure the job belongs to the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const jobCheck = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobCheck.error || !jobCheck.data) {
      throw new Error('Not found or not authorized')
    }

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
    // Only return status history for jobs owned by the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Get job IDs for the user
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', user.id)

    if (jobsErr) throw this._toError(jobsErr)

    const ids = (jobs || []).map((j: any) => j.id)

    if (ids.length === 0) return []

    const { data, error } = await supabase
      .from('job_status_history')
      .select('*')
      .in('job_id', ids)
      .order('changed_at', { ascending: true })
      .limit(5000)

    if (error) throw this._toError(error)
    return data || []
  },

  /**
   * Attempt to auto-fill job form fields from a public posting URL.
   */
  async autofillFromUrl(url: string): Promise<JobAutofillResult> {
    const requestId = `autofill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    
    Sentry.addBreadcrumb({
      category: 'job.autofill',
      message: 'Autofill request initiated',
      level: 'info',
      data: { url: url.substring(0, 100), requestId },
    })

    try {
      const { data, error } = await supabase.functions.invoke('job-url-autofill', {
        body: { url },
      })

      if (error) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
        Sentry.captureException(error, {
          tags: {
            function: 'job-url-autofill',
            requestId,
          },
          extra: {
            url: url.substring(0, 100),
            errorMessage: errorMsg,
          },
        })
        throw this._toError(error)
      }

      if (!data || typeof data !== 'object' || !('values' in data)) {
        const invalidErr = new Error('Auto-fill returned an invalid response')
        Sentry.captureException(invalidErr, {
          tags: {
            function: 'job-url-autofill',
            requestId,
          },
          extra: {
            url: url.substring(0, 100),
            responseData: JSON.stringify(data).substring(0, 200),
          },
        })
        throw invalidErr
      }

      Sentry.addBreadcrumb({
        category: 'job.autofill',
        message: 'Autofill successful',
        level: 'info',
        data: { requestId, fieldsExtracted: Object.keys(data.values) },
      })

      return data as JobAutofillResult
    } catch (err) {
      Sentry.addBreadcrumb({
        category: 'job.autofill',
        message: 'Autofill failed',
        level: 'error',
        data: { requestId, error: err instanceof Error ? err.message : String(err) },
      })
      throw err
    }
  },
}
