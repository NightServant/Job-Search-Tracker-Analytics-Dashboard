'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/core'
import { supabase } from '@/lib/supabase'
import { readSupabaseConfig, currentEnvSource } from '@/lib/env'
import { useToast } from '@/contexts/ToastContext'

/**
 * Getting the open CV out of the browser, as PDF and as .docx.
 *
 * BOTH FORMATS, NOT ONE, and the reason is in the domain rather than the code:
 * ATS parsers still handle .docx more reliably than PDF and many application
 * forms accept Word only, while a human reviewer opening the file wants the
 * PDF's fixed layout. Which one matters depends on who is on the other end,
 * and the author is the only one who knows that.
 *
 * SPLIT OUT OF `WordResumeEditor` ON 2026-09-11 (509 lines). Two handlers and
 * two booleans that read the editor and talk to two endpoints, sharing nothing
 * else with the component -- not the revision counter, not the autosave
 * timers. The persistence logic next door touches all of those and stays.
 *
 * `saveDraft` IS A PARAMETER, AND THAT IS THE POINT OF THE SPLIT. A PDF built
 * from content the database refused is a PDF of something that does not exist
 * -- the editor once showed "Save failed" and "PDF ready" together and handed
 * over the second one. In a shared scope that dependency was invisible; here
 * it is in the signature, so the export cannot be reused somewhere that has
 * not thought about it.
 *
 * EACH EXPORT REVOKES ITS OBJECT URL. A blob URL created and never revoked
 * keeps the whole generated file in memory for the life of the tab.
 */

export interface ResumeExport {
  exportPdf: () => Promise<void>
  exportDocx: () => Promise<void>
  isExportingPdf: boolean
  isExportingDocx: boolean
}

export interface ResumeExportOptions {
  editor: Editor | null
  title: string
  /** Must resolve true before anything is generated. See the docblock. */
  saveDraft: (notify?: boolean) => Promise<boolean>
  /** Adds the bearer token; `/api/cv/docx` authenticates like every route. */
  authedFetch: (input: string, init?: RequestInit) => Promise<Response>
}

/** `my CV (final)` -> `my-cv-final`, so the download has a sane filename. */
function safeFileName(title: string): string {
  return (
    (title.trim() || 'cv')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cv'
  )
}

export function useResumeExport({
  editor,
  title,
  saveDraft,
  authedFetch,
}: ResumeExportOptions): ResumeExport {
  const { success, error: showError } = useToast()
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingDocx, setIsExportingDocx] = useState(false)

  const exportPdf = async () => {
    if (!editor) return
    setIsExportingPdf(true)
    try {
      if (!(await saveDraft(false))) return
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No active session found')
      const { url: supabaseUrl, anonKey: supabaseAnonKey } = readSupabaseConfig(currentEnvSource())
      const response = await fetch(`${supabaseUrl}/functions/v1/resume-export-pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title.trim() || 'Untitled CV', content: editor.getJSON() }),
      })
      if (!response.ok) throw new Error((await response.text()) || `Export failed (${response.status})`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeFileName(title)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      success('PDF ready', 'Your CV PDF has been downloaded.')
    } catch (err) {
      showError('Export failed', err instanceof Error ? err.message : 'Could not export PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const exportDocx = async () => {
    if (!editor) return
    setIsExportingDocx(true)
    try {
      const response = await authedFetch('/api/cv/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || 'CV', content: editor.getJSON() }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || `Export failed (${response.status})`)
      }
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${(title.trim() || 'cv').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cv'}.docx`
      anchor.click()
      // Revoked immediately: the click has already handed the blob to the
      // download, and holding it keeps the whole file in memory for the tab.
      URL.revokeObjectURL(url)
      success('Word file ready', 'Your CV has been downloaded as .docx.')
    } catch (err) {
      showError('Export failed', err instanceof Error ? err.message : 'Could not export Word file')
    } finally {
      setIsExportingDocx(false)
    }
  }

  return { exportPdf, exportDocx, isExportingPdf, isExportingDocx }
}
