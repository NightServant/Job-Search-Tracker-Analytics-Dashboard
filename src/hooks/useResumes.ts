import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resumeService } from '@/services/resumeService'
import { CreateResumeDocumentInput, ExportResumePdfInput, ResumeDocument } from '@/types'

export function useResumeDocuments() {
  return useQuery({
    queryKey: ['resume-documents'],
    queryFn: resumeService.getDocuments,
  })
}

export function useCreateResumeDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateResumeDocumentInput) => resumeService.createDocument(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-documents'] })
    },
  })
}

export function useDeleteResumeDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (doc: ResumeDocument) => resumeService.deleteDocument(doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-documents'] })
    },
  })
}

export function useExportResumePdf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ExportResumePdfInput) => resumeService.exportLatexToPdf(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-documents'] })
    },
  })
}
