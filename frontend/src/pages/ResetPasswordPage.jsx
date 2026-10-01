import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from '@mantine/form'
import {
  Paper, Stack, Title, Text, PasswordInput, Button, Anchor, Alert, ThemeIcon,
} from '@mantine/core'
import { IconCircleCheck } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'

// Page atteinte via le lien reçu par mail : /reset-password?token=xxx
export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const form = useForm({
    initialValues: { plainPassword: '', confirm: '' },
    validate: {
      plainPassword: (v) => (v.length >= 6 ? null : 'Au moins 6 caractères'),
      confirm: (v, values) =>
        v === values.plainPassword ? null : 'Les mots de passe ne correspondent pas',
    },
  })

  const handleSubmit = async (values) => {
    setError(null)
    setLoading(true)
    try {
      await resetPassword(token, values.plainPassword)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Réinitialisation impossible. Le lien est peut-être expiré.')
    } finally {
      setLoading(false)
    }
  }

  // Lien ouvert sans jeton : inutile d'afficher le formulaire.
  if (!token) {
    return (
      <Stack align="center" pt={{ base: 32, sm: 64 }} px="md" pb={48}>
        <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={440}>
          <Stack gap="md" align="center" ta="center">
            <Title order={1} fz={24} fw={600} lts="-0.5px" data-testid="titre-lien-invalide">
              Lien invalide
            </Title>
            <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>
              Ce lien de réinitialisation est incomplet : aucun jeton fourni.
            </Text>
            <Button component={Link} to="/forgot-password" variant="default" mt="xs"
              data-testid="lien-demander-nouveau-lien">
              Demander un nouveau lien
            </Button>
          </Stack>
        </Paper>
      </Stack>
    )
  }

  if (done) {
    return (
      <Stack align="center" pt={{ base: 32, sm: 64 }} px="md" pb={48}>
        <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={440}>
          <Stack gap="md" align="center" ta="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="green">
              <IconCircleCheck size={32} />
            </ThemeIcon>
            <Title order={1} fz={24} fw={600} lts="-0.5px" data-testid="titre-succes">
              Mot de passe mis à jour 🎉
            </Title>
            <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>
              Tu peux maintenant te connecter avec ton nouveau mot de passe.
            </Text>
            <Button component={Link} to="/login" color="green" mt="xs" data-testid="lien-se-connecter">
              Se connecter
            </Button>
          </Stack>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack align="center" pt={{ base: 32, sm: 64 }} px="md" pb={48}>
      <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={400}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={1} fz={26} fw={600} lts="-0.5px" data-testid="titre-nouveau-mot-de-passe">
                Nouveau mot de passe
              </Title>
              <Text c="dimmed" size="sm">Choisis un nouveau mot de passe pour ton compte.</Text>
            </Stack>

            {error && (
              <Alert color="red" variant="light">
                <Stack gap={8}>
                  <Text size="sm">{error}</Text>
                  <Anchor component={Link} to="/forgot-password" c="green" size="sm"
                    data-testid="lien-demander-nouveau-lien">
                    Demander un nouveau lien
                  </Anchor>
                </Stack>
              </Alert>
            )}

            <PasswordInput label="Mot de passe" placeholder="6 caractères minimum" withAsterisk
              data-testid="champ-mot-de-passe"
              {...form.getInputProps('plainPassword')} />
            <PasswordInput label="Confirmer le mot de passe" placeholder="Répète le mot de passe" withAsterisk
              data-testid="champ-confirmation"
              {...form.getInputProps('confirm')} />

            <Button type="submit" color="green" loading={loading} fullWidth mt="xs"
              data-testid="bouton-reinitialiser">
              Réinitialiser mon mot de passe
            </Button>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
