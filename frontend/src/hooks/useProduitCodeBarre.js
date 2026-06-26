import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

// Recherche d'un produit par code-barres via OpenFoodFacts (proxy backend).
// Utilisé à la demande (saisie ou scan), d'où une mutation plutôt qu'une query.
export function useProduitCodeBarre() {
  return useMutation({
    mutationFn: (code) => apiFetch(`/produits/${encodeURIComponent(String(code).trim())}`),
  })
}
