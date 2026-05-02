import { supabase } from '@/lib/supabase'
import { Job, JobFormData, JobStatus, JobStatusHistoryEntry } from '@/types'

export const jobService = {
  /**
   * Get all jobs for the current user
   */
  async getJobs(): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
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

    if (error) throw error
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

    if (error) throw error
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

    if (error) throw error
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

    if (error) throw error
    return data
  },

  /**
   * Delete a job
   */
  async deleteJob(id: string): Promise<void> {
    const { error } = await supabase.from('jobs').delete().eq('id', id)

    if (error) throw error
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

    if (error) throw error
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

    if (error) throw error
    return data || []
  },
}
