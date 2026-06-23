import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

// Recherche d'aliments dans la table Ciqual (ANSES) par nom.
// La requête n'est lancée qu'à partir de 2 caractères pour éviter les appels inutiles.
export function useAliments(search) {
  const term = (search ?? '').trim()
  return useQuery({
    queryKey: ['aliments', term],
    queryFn: () => apiFetch(`/aliments?nom=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
  })
}
