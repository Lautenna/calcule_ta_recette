import { useState } from 'react'
import { computeTotals, computePerPortion } from '../../utils/nutrition'
import { IngredientBuilder } from './IngredientBuilder'
import { NutritionTable } from './NutritionTable'
import { MacroPieChart } from './MacroPieChart'
import './calculateur.css'

function emptyIngredient() {
  return {
    id: crypto.randomUUID(),
    nom: '',
    marque: '',
    quantite: '',
    energie_kcal: '', energie_kj: '',
    graisses: '', graisses_sat: '',
    glucides: '', sucres: '',
    proteines: '', sel: '',
    fibres: '', fer: '', calcium: '',
  }
}

export function CalculateurPage() {
  const [portions, setPortions] = useState(4)
  const [ingredients, setIngredients] = useState([emptyIngredient()])

  const onAdd = () =>
    setIngredients((prev) => [...prev, emptyIngredient()])

  const onRemove = (id) =>
    setIngredients((prev) =>
      prev.length === 1 ? prev : prev.filter((i) => i.id !== id)
    )

  const onUpdate = (id, field, value) =>
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    )

  const { rows, total } = computeTotals(ingredients)
  const perPortion = computePerPortion(total, portions)

  return (
    <div className="calculateur-layout">
      <h1 className="page-title">Calculateur de recettes</h1>
      <p className="page-subtitle">
        Saisissez vos ingrédients et leurs valeurs nutritionnelles pour obtenir le récapitulatif complet de votre recette.
      </p>

      <IngredientBuilder
        ingredients={ingredients}
        portions={portions}
        setPortions={setPortions}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
      />

      <div className="calculateur-zone">
        <div className="zone-header">
          <p className="zone-eyebrow">Tableau nutritionnel</p>
        </div>
        <NutritionTable rows={rows} total={total} perPortion={perPortion} />
      </div>

      <div className="calculateur-zone">
        <div className="zone-header">
          <p className="zone-eyebrow">Répartition des macronutriments par portion</p>
        </div>
        <MacroPieChart perPortion={perPortion} />
      </div>
    </div>
  )
}
