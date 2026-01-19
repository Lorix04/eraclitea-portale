"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useCourseRegistrationsQuery(courseId?: string, filters?: { page?: number; limit?: number }) {
  const params = new URLSearchParams()
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.limit) params.set('limit', String(filters.limit))
  return useQuery({
    queryKey: ['course-registrations', courseId, Object.fromEntries(params)],
    queryFn: async () => {
      if (!courseId) return { data: [], total: 0, page: 1, totalPages: 1 }
      const res = await fetch(`/api/admin/courses/${courseId}/registrations?${params.toString()}`)
      if (!res.ok) throw new Error('Errore caricamento iscritti')
      return res.json()
    },
    enabled: !!courseId,
    placeholderData: (prev) => prev,
  })
}

export function useBatchUpdateRegistrationsMutation(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { employees: any[] }) => {
      const res = await fetch(`/api/admin/courses/${courseId}/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore salvataggio iscritti')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-registrations', courseId] }),
  })
}

export function useDeleteRegistrationMutation(courseId: string, registrationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/courses/${courseId}/registrations/${registrationId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore eliminazione iscrizione')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-registrations', courseId] }),
  })
}
