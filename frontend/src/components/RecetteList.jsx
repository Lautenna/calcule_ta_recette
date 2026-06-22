import { useRecettes } from '../hooks/useRecettes'

export function RecetteList() {
  const { data, isPending, isError, error } = useRecettes()

  if (isPending) return <p>Chargement…</p>
  if (isError) return <p>Erreur : {error.message}</p>

  const recettes = data['hydra:member']
  if (recettes.length === 0) return <p>Aucune recette. Créez-en une !</p>

  return (
    <ul>
      {recettes.map((r) => (
        <li key={r.id}>
          <strong>{r.nom}</strong> — {r.nombrePersonnes} personne(s)
          {r.description && <p>{r.description}</p>}
        </li>
      ))}
    </ul>
  )
}
