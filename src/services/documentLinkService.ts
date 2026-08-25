import type { SupabaseClient } from '@supabase/supabase-js'
import { requireUserId, toError } from './supabaseHelpers'
import type { ApplicationDocument } from '@/types'
import type { DocumentLinkSummary } from './applicationDocuments'

export interface DocumentLinkInput {
  job_id: string
  resume_id: string
  /** null means the link tracks the CV as it evolves; an id pins one exact version. */
  snapshot_id?: string | null
  sent_at?: string
}

/**
 * Records which CV went to which application.
 *
 * snapshot_id is the point of the table. Without it a link says "this CV",
 * which keeps changing; with it the link says "this CV as it was when I sent
 * it", which is the thing you actually want to reread before an interview.
 */
export const documentLinkService = {
  /**
   * Attach a CV to an application, replacing any existing attachment.
   *
   * application_documents is UNIQUE (job_id, resume_id), so a second pin of the
   * same pair is a conflict rather than a second row. Upserting makes re-pinning
   * mean "change which snapshot I sent", which is what the UI action is.
   */
  async pin(client: SupabaseClient, input: DocumentLinkInput): Promise<ApplicationDocument> {
    const userId = await requireUserId(client)
    const { data, error } = await client
      .from('application_documents')
      .upsert({ ...input, user_id: userId }, { onConflict: 'job_id,resume_id' })
      .select()
      .single()
    if (error) throw toError(error)
    return data as ApplicationDocument
  },

  async unpin(client: SupabaseClient, jobId: string, resumeId: string): Promise<void> {
    const { error } = await client
      .from('application_documents')
      .delete()
      .eq('job_id', jobId)
      .eq('resume_id', resumeId)
    if (error) throw toError(error)
  },

  /**
   * Links for one application, flattened into what describeLink renders.
   *
   * The resume title and snapshot version live on other tables, so they are
   * embedded in the query rather than fetched per row. A null version means no
   * snapshot was pinned, which describeLink renders as "latest".
   */
  async listForJob(client: SupabaseClient, jobId: string): Promise<DocumentLinkSummary[]> {
    const { data, error } = await client
      .from('application_documents')
      .select('sent_at, resumes(title), resume_snapshots(version)')
      .eq('job_id', jobId)
    if (error) throw toError(error)

    return (data ?? []).map((row) => {
      const resume = row.resumes as unknown as { title: string } | null
      const snapshot = row.resume_snapshots as unknown as { version: number | null } | null
      return {
        title: resume?.title ?? 'untitled cv',
        version: snapshot?.version ?? null,
        sent_at: row.sent_at as string,
      }
    })
  },
}
