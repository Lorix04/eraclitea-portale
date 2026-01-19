"use client"
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useNotificationsQuery(filters?: { page?: number; limit?: number }) {
  const params = new URLSearchParams()
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.limit) params.set('limit', String(filters.limit))
  return useQuery({
    queryKey: ['admin-notifications', Object.fromEntries(params)],
    queryFn: async () => {
      const res = await fetch(`/api/admin/notifications?${params.toString()}`)
      if (!res.ok) throw new Error('Errore caricamento notifiche')
      return res.json() as Promise<{ data: any[]; total: number; page: number; totalPages: number }>
    },
    placeholderData: (prev) => prev,
  })
}

export function useClientNotificationsQuery(filters?: { unreadOnly?: boolean; limit?: number }) {
  const params = new URLSearchParams()
  if (filters?.unreadOnly) params.set('unreadOnly', 'true')
  if (filters?.limit) params.set('limit', String(filters.limit))
  return useQuery({
    queryKey: ['client-notifications', Object.fromEntries(params)],
    queryFn: async () => {
      const res = await fetch(`/api/client/notifications?${params.toString()}`)
      if (!res.ok) throw new Error('Errore caricamento notifiche')
      return res.json()
    },
    placeholderData: (prev) => prev,
  })
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: ['client-unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/client/notifications/unread-count')
      if (!res.ok) throw new Error('Errore conteggio')
      return res.json() as Promise<{ count: number }>
    },
    refetchInterval: 60000,
  })
}

export function useCreateNotificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Errore creazione notifica')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  })
}

export function useDeleteNotificationMutation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore eliminazione notifica')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  })
}

export function useMarkAsReadMutation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/client/notifications/${id}/read`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore segna letta')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notifications'] })
      qc.invalidateQueries({ queryKey: ['client-unread-count'] })
    },
  })
}

export function useMarkAllAsReadMutation(ids: string[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await Promise.all(ids.map(id => fetch(`/api/client/notifications/${id}/read`, { method: 'POST' })))
      return { ok: true }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notifications'] })
      qc.invalidateQueries({ queryKey: ['client-unread-count'] })
    },
  })
}
