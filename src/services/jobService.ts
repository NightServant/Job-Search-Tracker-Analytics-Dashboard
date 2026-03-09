import { supabase } from '@/lib/supabase'
import { Job, JobFormData, JobStatus } from '@/types'

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
}
