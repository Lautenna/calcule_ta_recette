import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from '@mantine/form'
import {
  Paper, Stack, Title, Text, TextInput, PasswordInput, Button, Anchor, Alert,
} from '@mantine/core'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/profil'

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Email invalide'),
      password: (v) => (v.length > 0 ? null : 'Mot de passe requis'),
    },
  })

  const handleSubmit = async (values) => {
    setError(null)
    setLoading(true)
    try {
      await login(values.email, values.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack align="center" pt={64} px="md">
      <Paper withBorder shadow="sm" radius="md" p={32} w="100%" maw={400}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={1} fz={26} fw={600} lts="-0.5px">Connexion</Title>
              <Text c="dimmed" size="sm">Content de te revoir 👋</Text>
            </Stack>

            {error && <Alert color="red" variant="light">{error}</Alert>}

            <TextInput
              label="Email"
              placeholder="ton@email.com"
              withAsterisk
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label="Mot de passe"
              placeholder="Ton mot de passe"
              withAsterisk
              {...form.getInputProps('password')}
            />

            <Button type="submit" color="green" loading={loading} fullWidth mt="xs">
              Se connecter
            </Button>

            <Text size="sm" c="dimmed" ta="center">
              Pas encore de compte ?{' '}
              <Anchor component={Link} to="/register" c="green">Créer un compte</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
