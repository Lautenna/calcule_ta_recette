import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from '@mantine/form'
import {
  Paper, Stack, Title, Text, TextInput, PasswordInput, Button, Anchor, Alert,
} from '@mantine/core'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)
  // Vrai quand l'échec vient d'un email non confirmé → on propose le renvoi.
  const [unverified, setUnverified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

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
    setUnverified(false)
    setResent(false)
    setLoading(true)
    try {
      await login(values.email, values.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const msg = err.message || 'Connexion impossible.'
      setError(msg)
      // Le UserChecker renvoie un message contenant « confirmée » si l'email
      // n'est pas validé : on propose alors de renvoyer le lien.
      if (/confirm/i.test(msg)) setUnverified(true)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendConfirmation(form.values.email)
      setResent(true)
    } catch {
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  return (
    <Stack align="center" pt={{ base: 32, sm: 64 }} px="md">
      <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={400}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={1} fz={26} fw={600} lts="-0.5px">Connexion</Title>
              <Text c="dimmed" size="sm">Content de te revoir 👋</Text>
            </Stack>

            {error && (
              <Alert color={unverified ? 'yellow' : 'red'} variant="light">
                <Stack gap={8}>
                  <Text size="sm">{error}</Text>
                  {unverified && !resent && (
                    <Button
                      variant="white"
                      color="green"
                      size="xs"
                      loading={resending}
                      onClick={handleResend}
                      w="fit-content"
                    >
                      Renvoyer l'email de confirmation
                    </Button>
                  )}
                  {resent && (
                    <Text size="sm" c="green.7">Nouveau lien envoyé — vérifie ta boîte mail.</Text>
                  )}
                </Stack>
              </Alert>
            )}

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
              <Anchor
                c="green"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/register', { state: { email: form.getValues().email } })}
              >
                Créer un compte
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
