"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Filters = {
  page?: number
  limit?: number
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  packageId?: string
}

export function useCoursesQuery(filters: Filters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.packageId) params.set('package', filters.packageId)

  return useQuery({
    queryKey: ['admin-courses', Object.fromEntries(params)],
    queryFn: async () => {
      const res = await fetch(`/api/admin/courses?${params.toString()}`)
      if (!res.ok) throw new Error('Errore caricamento corsi')
      return res.json() as Promise<{ data: any[]; total: number; page: number; totalPages: number }>
    },
    placeholderData: (prev) => prev,
  })
}

export function useCourseQuery(id?: string) {
  return useQuery({
    queryKey: ['admin-course', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/admin/courses/${id}`)
      if (!res.ok) throw new Error('Errore caricamento corso')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateCourseMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore creazione corso')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
    },
  })
}

export function useUpdateCourseMutation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/courses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore aggiornamento corso')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      qc.invalidateQueries({ queryKey: ['admin-course', id] })
    },
  })
}

export function usePublishCourseMutation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/courses/${id}/publish`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore pubblicazione corso')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      qc.invalidateQueries({ queryKey: ['admin-course', id] })
    },
  })
}
