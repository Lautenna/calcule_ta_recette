import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function useRecettes() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['recettes'],
    queryFn: () => apiFetch('/recettes'),
    enabled: isAuthenticated,
  })
}

export function useSaveRecette() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recette) =>
      apiFetch('/recettes', {
        method: 'POST',
        body: JSON.stringify(recette),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recettes'] }),
  })
}

export function useUpdateRecette() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) =>
      apiFetch(`/recettes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recettes'] }),
  })
}

export function useDeleteRecette() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiFetch(`/recettes/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recettes'] }),
  })
}
