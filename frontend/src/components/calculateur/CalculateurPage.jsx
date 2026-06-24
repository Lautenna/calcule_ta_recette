import { useState } from 'react'
import { Stack, Title, Box, Text, ThemeIcon } from '@mantine/core'
import { IconChefHat } from '@tabler/icons-react'
import { computeTotals, computePerPortion, NUTRIENT_KEYS } from '../../utils/nutrition'
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

function SectionHeader({ title }) {
  return (
    <Box
      py={14}
      px={24}
      style={{
        background: 'var(--mantine-color-green-0)',
        borderTop: '1px solid var(--mantine-color-green-1)',
        borderBottom: '1px solid var(--mantine-color-green-1)',
        textAlign: 'center',
      }}
    >
      <Text fz={16} fw={700} tt="uppercase" ff="monospace" c="green.7" style={{ letterSpacing: '0.15em' }}>
        {title}
      </Text>
    </Box>
  )
}

export function CalculateurPage() {
  const [portions, setPortions] = useState(4)
  const [ingredients, setIngredients] = useState([emptyIngredient()])

  const onAdd = () => setIngredients((prev) => [...prev, emptyIngredient()])

  // S'il ne reste qu'un ingrédient, la poubelle ne le supprime pas (on garde
  // toujours une ligne) mais réinitialise tous ses champs. Sinon on l'enlève.
  const onRemove = (id) =>
    setIngredients((prev) => prev.length === 1 ? [emptyIngredient()] : prev.filter((i) => i.id !== id))

  const onUpdate = (id, field, value) =>
    setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))

  const onSelectRecette = (id, recetteId, recetteNom) =>
    setIngredients((prev) =>
      prev.map((i) => i.id === id ? { ...i, recetteId, nom: recetteNom } : i)
    )

  // Pré-remplit un ingrédient à partir d'un aliment Ciqual (valeurs pour 100g).
  // Les champs restent ensuite modifiables à la main.
  const onFillFromCiqual = (id, aliment) =>
    setIngredients((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const next = { ...i, nom: aliment.nom ?? '' }
        for (const key of NUTRIENT_KEYS) {
          next[key] = aliment[key] ?? ''
        }
        return next
      })
    )

  const { rows, total } = computeTotals(ingredients)
  const perPortion = computePerPortion(total, portions)

  return (
    <Stack gap={0} align="stretch">
      <Box
        p={{ base: 24, sm: 40 }}
        style={{
          borderBottom: '3px solid var(--mantine-color-green-4)',
          textAlign: 'center',
          background: 'linear-gradient(180deg, var(--mantine-color-green-0) 0%, transparent 100%)',
        }}
      >
        <ThemeIcon size={56} radius="xl" variant="light" color="green" mb={12}>
          <IconChefHat size={30} />
        </ThemeIcon>
        <Title order={1} fz={{ base: 26, sm: 42 }} fw={700} lts="-1.5px">
          Calculer les valeurs nutritionnelles
        </Title>
        <Text c="dimmed" size="md" mt={10} maw={620} mx="auto" style={{ lineHeight: 1.6 }}>
          Composez votre recette ingrédient par ingrédient et obtenez aussitôt
          son tableau nutritionnel complet ainsi que la répartition des
          macronutriments, par portion comme pour 100&nbsp;g.
        </Text>
      </Box>

      <SectionHeader title="Composition de la recette" />
      <IngredientBuilder
        ingredients={ingredients}
        portions={portions}
        setPortions={setPortions}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
        onSelectRecette={onSelectRecette}
        onFillFromCiqual={onFillFromCiqual}
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
