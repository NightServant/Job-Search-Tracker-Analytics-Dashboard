import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ResumeContentRow {
  mode: string
  content: unknown
}

interface TiptapNode {
  text?: unknown
  content?: unknown
}

function isTiptapNode(value: unknown): value is TiptapNode {
  return typeof value === 'object' && value !== null
}

/**
 * Walks a tiptap document collecting every text node.
 *
 * The resume editor stores its content as tiptap `JSONContent`, which nests
 * text arbitrarily deep under headings, lists and paragraphs. Keyword
 * matching only cares about the words, so this flattens all of it into one
 * space-joined string rather than reproducing the document's structure.
 */
function flattenTiptapText(node: unknown): string {
  if (!isTiptapNode(node)) return ''
  const parts: string[] = []
  if (typeof node.text === 'string') parts.push(node.text)
  if (Array.isArray(node.content)) {
    for (const child of node.content) parts.push(flattenTiptapText(child))
  }
  return parts.join(' ')
}

/**
 * Plain text for a stored resume, for ATS keyword matching.
 *
 * Latex mode stores raw source rather than a tiptap tree, so it is used as-is
 * -- `matchKeywords`'s tokenizer already strips LaTeX commands' punctuation,
 * and the command names themselves ("section", "textbf") are stopworded or
 * harmless noise next to the real content around them.
 */
export function flattenResumeText(row: ResumeContentRow | null): string {
  if (!row) return ''
  if (row.mode === 'latex') {
    const source = (row.content as { source?: unknown } | null)?.source
    return typeof source === 'string' ? source : ''
  }
  return flattenTiptapText(row.content)
}

/**
 * Plain text of the CV pinned to an application, for `matchKeywords`.
 *
 * Reads the live resume by id rather than the pinned snapshot: scoring
 * against whatever the CV says right now is more useful for a still-open
 * application than reading a frozen copy of what was already sent, and it
 * means editing a CV updates every application's match without re-pinning it
 * anywhere.
 *
 * `resumeId` comes from `useDocumentLinks`, so this hook is only enabled once
 * a link exists to read.
 */
export function useCvText(resumeId?: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['cv-text', user?.id, resumeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select('mode, content')
        .eq('id', resumeId as string)
        .maybeSingle()
      if (error) throw error
      return flattenResumeText(data as ResumeContentRow | null)
    },
    enabled: !!resumeId && !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
