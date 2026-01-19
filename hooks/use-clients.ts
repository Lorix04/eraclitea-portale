"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Filters = { page?: number; limit?: number; search?: string; isActive?: string }

export function useClientsQuery(filters: Filters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', String(filters.search))
  if (filters.isActive) params.set('isActive', String(filters.isActive))

  return useQuery({
    queryKey: ['admin-clients', Object.fromEntries(params)],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clients?${params.toString()}`)
      if (!res.ok) throw new Error('Errore caricamento clienti')
      return res.json() as Promise<{ data: any[]; total: number; page: number; totalPages: number }>
    },
    placeholderData: (prev) => prev,
  })
}

export function useClientQuery(id?: string) {
  return useQuery({
    queryKey: ['admin-client', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/admin/clients/${id}`)
      if (!res.ok) throw new Error('Errore caricamento cliente')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateClientMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore creazione cliente')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clients'] }),
  })
}

export function useUpdateClientMutation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore aggiornamento cliente')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
      qc.invalidateQueries({ queryKey: ['admin-client', id] })
    },
  })
}

export function useToggleClientActiveMutation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/clients/${id}/toggle-active`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore attiva/disattiva')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
      qc.invalidateQueries({ queryKey: ['admin-client', id] })
    },
  })
}

export function useResetClientPasswordMutation(id: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/clients/${id}/reset-password`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore reset password')
      return res.json()
    },
  })
}
