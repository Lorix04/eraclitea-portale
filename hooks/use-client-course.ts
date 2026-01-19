"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useClientCourse(courseId: string) {
  const qc = useQueryClient()
  const courseQuery = useQuery({
    queryKey: ['client-course', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/client/courses/${courseId}`)
      if (!res.ok) throw new Error('Errore corso')
      return res.json()
    },
  })
  const employeesQuery = useQuery({
    queryKey: ['client-course-employees', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/client/courses/${courseId}/employees`)
      if (!res.ok) throw new Error('Errore dipendenti')
      return res.json()
    },
  })
  const saveMutation = useMutation({
    mutationFn: async (employees: any[]) => {
      const res = await fetch(`/api/client/courses/${courseId}/employees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employees }) })
      if (!res.ok) throw new Error('Errore salvataggio')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-course-employees', courseId] }) },
  })
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/client/courses/${courseId}/submit`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore invio')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-course', courseId] })
      qc.invalidateQueries({ queryKey: ['client-course-employees', courseId] })
    },
  })

  return {
    course: courseQuery.data?.course,
    employees: employeesQuery.data,
    isLoading: courseQuery.isLoading || employeesQuery.isLoading,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    submit: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
  }
}
