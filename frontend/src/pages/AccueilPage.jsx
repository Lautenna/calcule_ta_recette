import { Stack, Title, Text } from '@mantine/core'

export function AccueilPage() {
  return (
    <Stack p={32} gap="xs">
      <Title order={1} fz={32} fw={500} lts="-1px">Accueil</Title>
      <Text c="dimmed" size="sm">Cette page sera disponible prochainement.</Text>
    </Stack>
  )
}
