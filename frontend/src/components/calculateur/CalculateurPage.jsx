import { useState } from 'react'
import { Stack, Title, Box, Group, NumberInput, Text } from '@mantine/core'
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

function SectionHeader({ title, right }) {
  return (
    <Box
      py={14}
      px={24}
      style={{
        background: 'var(--mantine-color-green-0)',
        borderTop: '1px solid var(--mantine-color-green-1)',
        borderBottom: '1px solid var(--mantine-color-green-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Text fz={16} fw={700} tt="uppercase" ff="monospace" c="green.7" style={{ letterSpacing: '0.15em', textAlign: 'center' }}>
        {title}
      </Text>
      {right && (
        <Box style={{ position: 'absolute', right: 24 }}>
          {right}
        </Box>
      )}
    </Box>
  )
}

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
      <Box p={{ base: 20, sm: 32 }} pb={20} style={{ borderBottom: '3px solid var(--mantine-color-green-4)' }}>
        <Title order={1} fz={{ base: 28, sm: 44 }} fw={700} lts="-1.5px">
          Calculer les valeurs nutritionnelles
        </Title>
      </Box>

      <SectionHeader
        title="Composition de la recette"
        right={
          <Group gap="sm" align="center">
            <Text size="sm" c="dimmed" fw={500}>Portions</Text>
            <NumberInput
              value={portions}
              onChange={(val) => setPortions(val || 1)}
              min={1}
              step={1}
              w={80}
              size="sm"
            />
          </Group>
        }
      />
      <IngredientBuilder
        ingredients={ingredients}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
        onSelectRecette={onSelectRecette}
      />

      <SectionHeader title="Tableau nutritionnel" />
      <Box p={{ base: 16, sm: 24 }}>
        <NutritionTable rows={rows} total={total} perPortion={perPortion} />
      </Box>

      <SectionHeader title="Répartition des macronutriments par portion" />
      <Box p={{ base: 16, sm: 24 }}>
        <MacroPieChart perPortion={perPortion} />
      </Box>
    </Stack>
  )
}
