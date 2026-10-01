import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paper, Stack, Group, Text, ActionIcon, Button, Loader, Box, Modal } from '@mantine/core'
import { IconTrash, IconChefHat, IconPencil } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRecettes, useDeleteRecette } from '../../hooks/useRecettes'

export function MesRecettes() {
  const navigate = useNavigate()
  const { data, isLoading } = useRecettes()
  const deleteRecette = useDeleteRecette()
  const recettes = data?.member ?? []
  const [confirming, setConfirming] = useState(null) // recette en attente de confirmation

  const confirmDelete = async () => {
    const recette = confirming
    try {
      await deleteRecette.mutateAsync(recette.id)
      notifications.show({ color: 'green', message: `« ${recette.nom} » supprimée.` })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message || 'Échec de la suppression.' })
    } finally {
      setConfirming(null)
    }
  }

  // Ouvre la recette dans le calculateur pour la consulter / la mettre à jour.
  const handleEdit = (recette) => navigate('/calculateur', { state: { recette } })

  return (
    <Paper withBorder radius="md" p="lg" data-testid="mes-recettes">
      <Stack gap="md">
        <Group gap={10}>
          <IconChefHat size={24} color="var(--mantine-color-green-6)" />
          <Text fw={700} fz="lg">Mes recettes</Text>
          <Text c="dimmed" fz="sm">({recettes.length})</Text>
        </Group>

        {isLoading ? (
          <Loader size="sm" color="green" />
        ) : recettes.length === 0 ? (
          <Text c="dimmed" size="sm" data-testid="aucune-recette">
            Aucune recette enregistrée. Composez une recette dans le calculateur
            puis cliquez sur « Enregistrer cette recette ».
          </Text>
        ) : (
          <Stack gap={6}>
            {recettes.map((recette) => (
              <Group key={recette.id} justify="space-between" wrap="nowrap" gap="xs"
                data-testid="recette-enregistree"
                style={{
                  borderLeft: '3px solid var(--mantine-color-green-4)',
                  background: 'var(--mantine-color-green-0)',
                  borderRadius: '0 6px 6px 0',
                  padding: '6px 8px 6px 12px',
                }}
              >
                <Box style={{ minWidth: 0 }}>
                  <Text fw={600} fz="sm" truncate data-testid="recette-nom">{recette.nom}</Text>
                  <Text fz={11} c="dimmed" data-testid="recette-resume">
                    {recette.nombrePersonnes} portion{recette.nombrePersonnes > 1 ? 's' : ''}
                    {' · '}{recette.composition?.length ?? 0} ingrédient{(recette.composition?.length ?? 0) > 1 ? 's' : ''}
                  </Text>
                </Box>
                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="green"
                    leftSection={<IconPencil size={13} />}
                    onClick={() => handleEdit(recette)}
                    data-testid="bouton-modifier-recette"
                  >
                    Modifier
                  </Button>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => setConfirming(recette)}
                    aria-label={`Supprimer ${recette.nom}`}
                    data-testid="bouton-supprimer-recette"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>

      <Modal opened={Boolean(confirming)} onClose={() => setConfirming(null)} title="Supprimer la recette" centered>
        <Stack>
          <Text size="sm">
            Voulez-vous vraiment supprimer « {confirming?.nom} » de vos recettes ?
            Cette action est définitive.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirming(null)}>Annuler</Button>
            <Button color="red" loading={deleteRecette.isPending} onClick={confirmDelete}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  )
}
