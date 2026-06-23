import { TextInput, NumberInput, Button, ActionIcon, Group, Stack, Text, Grid, Select, Radio, Box } from '@mantine/core'
import { IconTrash, IconPlus } from '@tabler/icons-react'
import { useRecettes } from '../../hooks/useRecettes'

function IngredientCard({ ingredient, onUpdate, onRemove, onSelectRecette, recettesOptions }) {
  const isRecette = ingredient.type === 'recette'

  return (
    <Box
      mb={6}
      style={{
        borderLeft: '3px solid var(--mantine-color-green-3)',
        paddingLeft: 12,
        paddingTop: 10,
        paddingBottom: 10,
        paddingRight: 8,
        background: 'white',
        borderRadius: '0 6px 6px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Grid align="flex-end" gutter="sm">
        {/* Radio inline */}
        <Grid.Col span={{ base: 12, sm: 2 }}>
          <Text fz={11} c="dimmed" mb={4} style={{ fontFamily: 'var(--mantine-font-family-monospace)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Type
          </Text>
          <Radio.Group
            value={ingredient.type}
            onChange={(val) => onUpdate(ingredient.id, 'type', val)}
          >
            <Stack gap={4}>
              <Radio value="ingredient" label="Ingrédient" size="xs" />
              <Radio value="recette" label="Recette" size="xs" />
            </Stack>
          </Radio.Group>
        </Grid.Col>

        {isRecette ? (
          <Grid.Col span={{ base: 10, sm: 9 }}>
            <Select
              label="Recette enregistrée"
              placeholder="Choisir une recette…"
              data={recettesOptions}
              value={ingredient.recetteId ? String(ingredient.recetteId) : null}
              onChange={(val) => {
                const found = recettesOptions.find((r) => r.value === val)
                onSelectRecette(ingredient.id, val, found ? found.label : '')
              }}
              searchable
              nothingFoundMessage="Aucune recette trouvée"
            />
          </Grid.Col>
        ) : (
          <>
            <Grid.Col span={{ base: 5, sm: 3 }}>
              <TextInput
                label="Marque"
                placeholder="Non précisée"
                value={ingredient.marque}
                onChange={(e) => onUpdate(ingredient.id, 'marque', e.target.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 7, sm: 4 }}>
              <TextInput
                label="Nom du produit"
                placeholder="ex : Farine T55"
                value={ingredient.nom}
                onChange={(e) => onUpdate(ingredient.id, 'nom', e.target.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 10, sm: 2 }}>
              <NumberInput
                label="Quantité (g)"
                placeholder="0"
                min={0}
                suffix=" g"
                value={ingredient.quantite}
                onChange={(val) => onUpdate(ingredient.id, 'quantite', val)}
              />
            </Grid.Col>
          </>
        )}

        <Grid.Col span={{ base: 2, sm: 1 }} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => onRemove(ingredient.id)}
            aria-label="Supprimer cet ingrédient"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Grid.Col>
      </Grid>
    </Box>
  )
}

export function IngredientBuilder({ ingredients, onUpdate, onAdd, onRemove, onSelectRecette }) {
  const { data: recettesData } = useRecettes()
  const recettesOptions = (recettesData?.member ?? []).map((r) => ({
    value: String(r.id),
    label: r.nom,
  }))

  return (
    <Stack gap="sm" p={{ base: 16, sm: 24 }}>
      <Text size="sm" c="dimmed">
        Saisissez vos ingrédients et leurs valeurs nutritionnelles pour obtenir le récapitulatif complet de votre recette.
      </Text>
      <Stack gap={0}>
        {ingredients.map((ingredient) => (
          <IngredientCard
            key={ingredient.id}
            ingredient={ingredient}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onSelectRecette={onSelectRecette}
            recettesOptions={recettesOptions}
          />
        ))}
      </Stack>

      <Button
        variant="light"
        color="green"
        leftSection={<IconPlus size={16} />}
        onClick={onAdd}
        w="fit-content"
        size="sm"
      >
        Ajouter un ingrédient
      </Button>
    </Stack>
  )
}
