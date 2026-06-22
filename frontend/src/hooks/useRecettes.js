import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

export function useRecettes() {
  return useQuery({
    queryKey: ['recettes'],
    queryFn: () => apiFetch('/recettes'),
  })
}
