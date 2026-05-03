import { supabase } from '@/lib/supabase'
import {
  CreateResumeDocumentInput,
  ExportResumePdfInput,
  ExportResumePdfResult,
  ResumeDocument,
} from '@/types'

const RESUME_BUCKET = 'resume-documents'

function buildStoragePath(userId: string, fileName: string): string {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${userId}/${uniquePrefix}-${safeFileName}`
}

export const resumeService = {
  async getDocuments(): Promise<ResumeDocument[]> {
    const { data, error } = await supabase
      .from('resume_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createDocument(input: CreateResumeDocumentInput): Promise<ResumeDocument> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const filePath = buildStoragePath(user.id, input.file.name)

    const { error: uploadError } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(filePath, input.file, {
        contentType: input.file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from('resume_documents')
      .insert({
        user_id: user.id,
        title: input.title,
        doc_type: input.docType,
        file_name: input.file.name,
        file_path: filePath,
        mime_type: input.file.type || null,
        file_size: input.file.size,
      })
      .select('*')
      .single()

    if (error) {
      await supabase.storage.from(RESUME_BUCKET).remove([filePath])
      throw error
    }

    return data
  },

  async deleteDocument(doc: ResumeDocument): Promise<void> {
    const { error } = await supabase.from('resume_documents').delete().eq('id', doc.id)

    if (error) throw error

    const { error: storageError } = await supabase.storage.from(RESUME_BUCKET).remove([doc.file_path])
    if (storageError) throw storageError
  },

  async getDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(filePath, 60 * 5)

    if (error) throw error
    if (!data?.signedUrl) throw new Error('Could not generate download link')

    return data.signedUrl
  },

  async exportLatexToPdf(input: ExportResumePdfInput): Promise<ExportResumePdfResult> {
    const { data, error } = await supabase.functions.invoke('export-resume-pdf', {
      body: {
        latex: input.latex,
        title: input.title,
        docType: input.docType,
      },
    })

    if (error) throw error
    if (!data || !data.document || !data.signedUrl) {
      throw new Error('Export succeeded but returned an invalid response payload')
    }

    return data as ExportResumePdfResult
  },
}
