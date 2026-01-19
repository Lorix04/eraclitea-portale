"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useAttachmentsQuery(courseId?: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['attachments', courseId, filters],
    queryFn: async () => {
      if (!courseId) return []
      const params = new URLSearchParams(filters || {})
      const res = await fetch(`/api/admin/courses/${courseId}/attachments?${params.toString()}`)
      if (!res.ok) throw new Error('Errore caricamento allegati')
      return res.json()
    },
    enabled: !!courseId,
  })
}

export function useUploadAttachmentMutation(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/admin/courses/${courseId}/attachments`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Errore upload allegato')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', courseId] }),
  })
}

export function useDeleteAttachmentMutation(courseId: string, attachmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/courses/${courseId}/attachments/${attachmentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore eliminazione allegato')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', courseId] }),
  })
}
