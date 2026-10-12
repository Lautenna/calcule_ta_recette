import { useState } from 'react'
import { Modal, Stack, Box, Text, Slider } from '@mantine/core'
import { computeTotals, computePerPortion } from '../../utils/nutrition'
import { NutritionTable } from '../calculateur/NutritionTable'
import { MacroPieChart } from '../calculateur/MacroPieChart'

// Contenu séparé du Modal et monté avec `key={recette.id}` : le curseur de
// portions repart ainsi de la valeur enregistrée à chaque recette ouverte.
function RecetteView({ recette }) {
  const [portions, setPortions] = useState(recette.nombrePersonnes ?? 1)
  const { rows, total } = computeTotals(recette.composition ?? [])
  const perPortion = computePerPortion(total, portions)

  return (
    <Stack gap="lg">
      <Box>
        <Text size="sm" fw={500} mb={8}>
          Nombre de portions :{' '}
          <Text component="span" fw={700} c="green.7" data-testid="vue-portions-valeur">{portions}</Text>
        </Text>
        <Slider value={portions} onChange={setPortions} min={1} max={15} step={1}
          color="green" label={null} mb={4} data-testid="vue-curseur-portions"
          marks={Array.from({ length: 15 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
        />
      </Box>

      <NutritionTable rows={rows} total={total} perPortion={perPortion} hideDetail />
      <MacroPieChart perPortion={perPortion} />
    </Stack>
  )
}

// Consultation en lecture seule d'une recette enregistrée : portions ajustables
// et macros, sans détail ni modification des ingrédients.
export function RecetteViewModal({ recette, onClose }) {
  return (
    <Modal opened={Boolean(recette)} onClose={onClose} title={recette?.nom} size="xl" centered
      data-testid="vue-recette">
      {recette && <RecetteView key={recette.id} recette={recette} />}
    </Modal>
  )
}
