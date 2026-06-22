export const NUTRIENT_KEYS = [
  'energie_kcal', 'energie_kj', 'graisses', 'graisses_sat',
  'glucides', 'sucres', 'proteines', 'sel', 'fibres', 'fer', 'calcium',
]

export const NUTRIENT_LABELS = {
  energie_kcal: { label: 'Énergie', unit: 'kcal' },
  energie_kj:   { label: 'Énergie', unit: 'kJ' },
  graisses:     { label: 'Matières grasses', unit: 'g' },
  graisses_sat: { label: 'dont Acides gras sat.', unit: 'g' },
  glucides:     { label: 'Glucides', unit: 'g' },
  sucres:       { label: 'dont Sucres', unit: 'g' },
  proteines:    { label: 'Protéines', unit: 'g' },
  sel:          { label: 'Sel', unit: 'g' },
  fibres:       { label: 'Fibres', unit: 'g' },
  fer:          { label: 'Fer', unit: 'mg' },
  calcium:      { label: 'Calcium', unit: 'mg' },
}

export function computeRow(ingredient) {
  const q = parseFloat(ingredient.quantite) || 0
  const row = { nom: ingredient.nom, quantite: q }
  for (const key of NUTRIENT_KEYS) {
    row[key] = ((parseFloat(ingredient[key]) || 0) * q) / 100
  }
  return row
}

export function computeTotals(ingredients) {
  const rows = ingredients.map(computeRow)
  const total = { nom: 'TOTAL', quantite: 0 }
  for (const key of NUTRIENT_KEYS) total[key] = 0
  for (const r of rows) {
    total.quantite += r.quantite
    for (const key of NUTRIENT_KEYS) total[key] += r[key]
  }
  return { rows, total }
}

export function computePerPortion(total, portions) {
  const n = Math.max(1, parseInt(portions) || 1)
  const out = { nom: 'PAR PORTION', quantite: total.quantite / n }
  for (const key of NUTRIENT_KEYS) out[key] = total[key] / n
  return out
}

export function fmt(n) {
  if (!n || n === 0) return '—'
  return n < 0.1 ? n.toFixed(2) : n.toFixed(1)
}
