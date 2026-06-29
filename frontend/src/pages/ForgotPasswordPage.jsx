import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from '@mantine/form'
import {
  Paper, Stack, Title, Text, TextInput, Button, Anchor, Alert, ThemeIcon,
} from '@mantine/core'
import { IconMailCheck } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm({
    // Reprend l'email éventuellement saisi sur la page de connexion.
    initialValues: { email: location.state?.email || '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Email invalide'),
    },
  })

  const handleSubmit = async (values) => {
    setError(null)
    setLoading(true)
    try {
      await forgotPassword(values.email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Demande impossible.')
    } finally {
      setLoading(false)
    }
  }

  // Réponse neutre côté serveur : on confirme l'envoi sans révéler si le compte existe.
  if (sent) {
    return (
      <Stack align="center" pt={{ base: 32, sm: 64 }} px="md" pb={48}>
        <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={440}>
          <Stack gap="md" align="center" ta="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="green">
              <IconMailCheck size={30} />
            </ThemeIcon>
            <Title order={1} fz={24} fw={600} lts="-0.5px">Vérifie ta boîte mail</Title>
            <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>
              Si un compte existe pour <strong>{form.getValues().email}</strong>, un lien
              de réinitialisation vient d'être envoyé. Il est valable 1 heure. Pense à
              regarder dans les spams.
            </Text>
            <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>
              Si tu ne reçois rien, cette adresse n'est associée à aucun compte.{' '}
            </Text>
            <Text size="sm" c="dimmed">
              <Anchor component={Link} to="/login" c="green">Retour à la connexion</Anchor>
            </Text>
          </Stack>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack align="center" pt={{ base: 32, sm: 64 }} px="md">
      <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={400}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={1} fz={26} fw={600} lts="-0.5px">Mot de passe oublié</Title>
              <Text c="dimmed" size="sm">
                Saisis ton email : on t'envoie un lien pour en choisir un nouveau.
              </Text>
            </Stack>

            {error && <Alert color="red" variant="light">{error}</Alert>}

            <TextInput
              label="Email"
              placeholder="ton@email.com"
              withAsterisk
              {...form.getInputProps('email')}
            />

            <Button type="submit" color="green" loading={loading} fullWidth mt="xs">
              Envoyer le lien
            </Button>

            <Text size="sm" c="dimmed" ta="center">
              <Anchor component={Link} to="/login" c="green">Retour à la connexion</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
