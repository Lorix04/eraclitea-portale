"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useSessionsQuery(courseId?: string) {
  return useQuery({
    queryKey: ['sessions', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const res = await fetch(`/api/admin/courses/${courseId}/sessions`)
      if (!res.ok) throw new Error('Errore caricamento sessioni')
      return res.json()
    },
    enabled: !!courseId,
  })
}

export function useCreateSessionMutation(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/courses/${courseId}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore creazione sessione')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions', courseId] }),
  })
}

export function useUpdateSessionMutation(courseId: string, sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/courses/${courseId}/sessions/${sessionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore aggiornamento sessione')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions', courseId] }),
  })
}

export function useDeleteSessionMutation(courseId: string, sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/courses/${courseId}/sessions/${sessionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore eliminazione sessione')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions', courseId] }),
  })
}

export function useCompleteSessionMutation(courseId: string, sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/courses/${courseId}/sessions/${sessionId}/complete`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore conclusione sessione')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions', courseId] }),
  })
}
