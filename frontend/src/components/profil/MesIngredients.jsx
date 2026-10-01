import { useState } from 'react'
import { Paper, Stack, Group, Text, ActionIcon, Loader, Box, Modal, Button } from '@mantine/core'
import { IconTrash, IconSalad } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useIngredients, useDeleteIngredient } from '../../hooks/useIngredients'

export function MesIngredients() {
  const { data, isLoading } = useIngredients()
  const deleteIngredient = useDeleteIngredient()
  const ingredients = data?.member ?? []
  const [confirming, setConfirming] = useState(null) // ingrédient en attente de confirmation

  const confirmDelete = async () => {
    const ing = confirming
    try {
      await deleteIngredient.mutateAsync(ing.id)
      notifications.show({ color: 'green', message: `« ${ing.nom} » supprimé.` })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message || 'Échec de la suppression.' })
    } finally {
      setConfirming(null)
    }
  }

  return (
    <Paper withBorder radius="md" p="lg" data-testid="mes-ingredients">
      <Stack gap="md">
        <Group gap={10}>
          <IconSalad size={24} color="var(--mantine-color-green-6)" />
          <Text fw={700} fz="lg">Mes ingrédients</Text>
          <Text c="dimmed" fz="sm">({ingredients.length})</Text>
        </Group>

        {isLoading ? (
          <Loader size="sm" color="green" />
        ) : ingredients.length === 0 ? (
          <Text c="dimmed" size="sm">
            Aucun ingrédient enregistré. Dans le calculateur, validez un ingrédient
            puis cliquez sur l’icône ⭐ pour l’ajouter ici.
          </Text>
        ) : (
          <Stack gap={6}>
            {ingredients.map((ing) => (
              <Group key={ing.id} justify="space-between" wrap="nowrap" gap="xs"
                data-testid="ingredient-enregistre"
                style={{
                  borderLeft: '3px solid var(--mantine-color-green-4)',
                  background: 'var(--mantine-color-green-0)',
                  borderRadius: '0 6px 6px 0',
                  padding: '6px 8px 6px 12px',
                }}
              >
                <Box style={{ minWidth: 0 }}>
                  <Group gap={6} wrap="nowrap" align="baseline">
                    <Text fw={600} fz="sm" truncate data-testid="ingredient-nom">{ing.nom}</Text>
                    {ing.marque && <Text fz={11} c="dimmed" truncate>· {ing.marque}</Text>}
                  </Group>
                  <Text fz={11} c="dimmed" data-testid="ingredient-resume">
                    Pour 100g : {ing.energie_kcal ?? 0} kcal · P {ing.proteines ?? 0} g · G {ing.glucides ?? 0} g · L {ing.graisses ?? 0} g
                  </Text>
                </Box>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => setConfirming(ing)}
                  aria-label={`Supprimer ${ing.nom}`}
                  data-testid="bouton-supprimer-ingredient"
                  style={{ flexShrink: 0 }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>

      <Modal opened={Boolean(confirming)} onClose={() => setConfirming(null)} title="Supprimer l’ingrédient" centered>
        <Stack>
          <Text size="sm">
            Voulez-vous vraiment supprimer « {confirming?.nom} » de vos ingrédients ?
            Cette action est définitive.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirming(null)}>Annuler</Button>
            <Button color="red" loading={deleteIngredient.isPending} onClick={confirmDelete}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  )
}
