"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useAttendanceQuery(courseId?: string, sessionId?: string) {
  return useQuery({
    queryKey: ['attendance', courseId, sessionId],
    queryFn: async () => {
      if (!courseId || !sessionId) return []
      const res = await fetch(`/api/admin/courses/${courseId}/sessions/${sessionId}/attendance`)
      if (!res.ok) throw new Error('Errore caricamento presenze')
      return res.json()
    },
    enabled: !!courseId && !!sessionId,
  })
}

export function useUpdateAttendanceMutation(courseId: string, sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { employeeId: string; isPresent: boolean; note?: string }) => {
      const res = await fetch(`/api/admin/courses/${courseId}/sessions/${sessionId}/attendance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore aggiornamento presenza')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', courseId, sessionId] }),
  })
}

export function useBulkUpdateAttendanceMutation(courseId: string, sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { attendances: { employeeId: string; isPresent: boolean; note?: string }[] }) => {
      const res = await fetch(`/api/admin/courses/${courseId}/sessions/${sessionId}/attendance/bulk`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore aggiornamento presenze')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', courseId, sessionId] }),
  })
}
