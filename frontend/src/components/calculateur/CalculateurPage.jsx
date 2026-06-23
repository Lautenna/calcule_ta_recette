import { useState } from 'react'
import { Stack, Title, Text, Box } from '@mantine/core'
import { computeTotals, computePerPortion } from '../../utils/nutrition'
import { IngredientBuilder } from './IngredientBuilder'
import { NutritionTable } from './NutritionTable'
import { MacroPieChart } from './MacroPieChart'

function emptyIngredient() {
  return {
    id: crypto.randomUUID(),
    type: 'ingredient',
    recetteId: null,
    nom: '', marque: '', quantite: '',
    energie_kcal: '', energie_kj: '',
    graisses: '', graisses_sat: '',
    glucides: '', sucres: '',
    proteines: '', sel: '',
    fibres: '', fer: '', calcium: '',
  }
}

const sectionStyle = { borderTop: '1px solid var(--mantine-color-default-border)' }

export function CalculateurPage() {
  const [portions, setPortions] = useState(4)
  const [ingredients, setIngredients] = useState([emptyIngredient()])

  const onAdd = () => setIngredients((prev) => [...prev, emptyIngredient()])

  const onRemove = (id) =>
    setIngredients((prev) => prev.length === 1 ? prev : prev.filter((i) => i.id !== id))

  const onUpdate = (id, field, value) =>
    setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))

  const onSelectRecette = (id, recetteId, recetteNom) =>
    setIngredients((prev) =>
      prev.map((i) => i.id === id ? { ...i, recetteId, nom: recetteNom } : i)
    )

  const { rows, total } = computeTotals(ingredients)
  const perPortion = computePerPortion(total, portions)

  return (
    <Stack gap={0} align="stretch" style={{ textAlign: 'left' }}>
      <Box p={{ base: 16, sm: 24 }} pb="sm">
        <Title order={1} fz={{ base: 24, sm: 36 }} fw={500} lts="-1px" mb={4}>
          Calculateur de recettes
        </Title>
        <Text size="sm" c="dimmed">
          Saisissez vos ingrédients et leurs valeurs nutritionnelles pour obtenir le récapitulatif complet de votre recette.
        </Text>
      </Box>

      <IngredientBuilder
        ingredients={ingredients}
        portions={portions}
        setPortions={setPortions}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
        onSelectRecette={onSelectRecette}
      />

      <Box p={{ base: 16, sm: 24 }} style={sectionStyle}>
        <Text size="xs" tt="uppercase" ff="monospace" c="green" fw={500} mb="sm" style={{ letterSpacing: '0.12em' }}>
          Tableau nutritionnel
        </Text>
        <NutritionTable rows={rows} total={total} perPortion={perPortion} />
      </Box>

      <Box p={{ base: 16, sm: 24 }} style={sectionStyle}>
        <Text size="xs" tt="uppercase" ff="monospace" c="green" fw={500} mb="sm" style={{ letterSpacing: '0.12em' }}>
          Répartition des macronutriments par portion
        </Text>
        <MacroPieChart perPortion={perPortion} />
      </Box>
    </Stack>
  )
}
