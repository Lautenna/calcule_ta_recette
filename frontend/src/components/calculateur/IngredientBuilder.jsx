import { TextInput, NumberInput, Button, ActionIcon, Group, Stack, Paper, Text, Grid } from '@mantine/core'
import { IconTrash, IconPlus } from '@tabler/icons-react'

function IngredientCard({ ingredient, onUpdate, onRemove }) {
  return (
    <Paper withBorder p="sm" mb="xs">
      <Grid align="flex-end" gutter="sm">
        <Grid.Col span={{ base: 6, sm: 5 }}>
          <TextInput
            label="Nom du produit"
            placeholder="ex : Farine T55"
            value={ingredient.nom}
            onChange={(e) => onUpdate(ingredient.id, 'nom', e.target.value)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <TextInput
            label="Marque"
            placeholder="Non précisée"
            value={ingredient.marque}
            onChange={(e) => onUpdate(ingredient.id, 'marque', e.target.value)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 10, sm: 3 }}>
          <NumberInput
            label="Quantité (g)"
            placeholder="0"
            min={0}
            suffix=" g"
            value={ingredient.quantite}
            onChange={(val) => onUpdate(ingredient.id, 'quantite', val)}
          />
        </Grid.Col>
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
    </Paper>
  )
}

export function IngredientBuilder({ ingredients, portions, setPortions, onUpdate, onAdd, onRemove }) {
  return (
    <Stack gap="md" p={{ base: 'md', sm: 32 }} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <Group justify="space-between" wrap="wrap">
        <Text size="xs" tt="uppercase" ff="monospace" c="green" fw={500} style={{ letterSpacing: '0.12em' }}>
          Composition de la recette
        </Text>
        <Group gap="xs" align="flex-end">
          <Text size="sm">Nombre de portions</Text>
          <NumberInput
            value={portions}
            onChange={(val) => setPortions(val || 1)}
            min={1}
            step={1}
            w={70}
          />
        </Group>
      </Group>

      <Stack gap={0}>
        {ingredients.map((ingredient) => (
          <IngredientCard
            key={ingredient.id}
            ingredient={ingredient}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </Stack>

      <Button
        variant="light"
        color="green"
        leftSection={<IconPlus size={16} />}
        onClick={onAdd}
        w="fit-content"
      >
        Ajouter un ingrédient
      </Button>
    </Stack>
  )
}
