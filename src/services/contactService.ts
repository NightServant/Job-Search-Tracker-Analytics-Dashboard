import type { SupabaseClient } from '@supabase/supabase-js'
import { requireUserId, toError } from './supabaseHelpers'
import type { Contact } from './contacts'

export interface ContactInput {
  name: string
  email?: string | null
  linkedin?: string | null
  notes?: string | null
}

/**
 * People, stored once and linked to any number of applications.
 *
 * There is no /contacts route by design; these surface on the application
 * detail page. The join carries user_id of its own so RLS can scope it without
 * a subquery back to jobs.
 */
export const contactService = {
  async create(client: SupabaseClient, input: ContactInput): Promise<Contact> {
    const userId = await requireUserId(client)
    const { data, error } = await client
      .from('contacts')
      .insert({ ...input, user_id: userId })
      .select()
      .single()
    if (error) throw toError(error)
    return data as Contact
  },

  async update(client: SupabaseClient, id: string, patch: Partial<ContactInput>): Promise<Contact> {
    const { data, error } = await client
      .from('contacts')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw toError(error)
    return data as Contact
  },

  async remove(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('contacts').delete().eq('id', id)
    if (error) throw toError(error)
  },

  async list(client: SupabaseClient): Promise<Contact[]> {
    const { data, error } = await client
      .from('contacts')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw toError(error)
    return (data ?? []) as Contact[]
  },

  /**
   * Idempotent link. The join's primary key is (job_id, contact_id), so
   * re-linking is a conflict rather than a duplicate; upsert makes calling it
   * twice harmless instead of an error the caller has to special-case.
   */
  async linkToJob(client: SupabaseClient, jobId: string, contactId: string): Promise<void> {
    const userId = await requireUserId(client)
    const { error } = await client
      .from('application_contacts')
      .upsert(
        { job_id: jobId, contact_id: contactId, user_id: userId },
        { onConflict: 'job_id,contact_id' }
      )
    if (error) throw toError(error)
  },

  async unlinkFromJob(client: SupabaseClient, jobId: string, contactId: string): Promise<void> {
    const { error } = await client
      .from('application_contacts')
      .delete()
      .eq('job_id', jobId)
      .eq('contact_id', contactId)
    if (error) throw toError(error)
  },

  async listForJob(client: SupabaseClient, jobId: string): Promise<Contact[]> {
    const { data, error } = await client
      .from('application_contacts')
      .select('contacts(*)')
      .eq('job_id', jobId)
    if (error) throw toError(error)
    return (data ?? []).flatMap((row) => (row.contacts ? [row.contacts as unknown as Contact] : []))
  },
}
