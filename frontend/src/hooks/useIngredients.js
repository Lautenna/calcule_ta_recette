import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

// Les 11 champs nutritionnels (pour 100g) partagés avec le calculateur / Ciqual.
const NUTRIENT_KEYS = [
  'energie_kcal', 'energie_kj', 'graisses', 'graisses_sat',
  'glucides', 'sucres', 'proteines', 'sel', 'fibres', 'fer', 'calcium',
]

/**
 * Construit le corps d'un ingrédient personnel à partir d'un ingrédient du
 * calculateur (on ne garde que nom, marque et les valeurs pour 100g).
 * Les champs vides deviennent null pour rester cohérent côté API.
 */
export function ingredientPayload(src) {
  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
  const body = { nom: src.nom ?? '', marque: src.marque || null }
  for (const key of NUTRIENT_KEYS) body[key] = num(src[key])
  return body
}

export function useIngredients() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch('/ingredients'),
    enabled: isAuthenticated,
  })
}

export function useSaveIngredient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ingredient) =>
      apiFetch('/ingredients', {
        method: 'POST',
        body: JSON.stringify(ingredientPayload(ingredient)),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) =>
      apiFetch(`/ingredients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiFetch(`/ingredients/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}
