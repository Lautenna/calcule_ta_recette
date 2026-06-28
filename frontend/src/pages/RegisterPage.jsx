import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from '@mantine/form'
import {
  Paper, Stack, Title, Text, TextInput, PasswordInput, Button, Anchor, Alert,
  ThemeIcon, Group,
} from '@mantine/core'
import { IconMailCheck, IconInfoCircle } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'

// Écran affiché après une inscription réussie : invite à confirmer l'email.
function VerifierEmail({ email, onResend, resending, resent }) {
  return (
    <Stack align="center" pt={{ base: 32, sm: 48 }} px="md" pb={48}>
      <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={440}>
        <Stack gap="md" align="center" ta="center">
          <ThemeIcon size={56} radius="xl" variant="light" color="green">
            <IconMailCheck size={30} />
          </ThemeIcon>
          <Title order={1} fz={24} fw={600} lts="-0.5px">Vérifie ta boîte mail</Title>
          <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>
            On vient d'envoyer un lien de confirmation à <strong>{email}</strong>.
            Clique dessus pour activer ton compte, puis connecte-toi. Pense à
            regarder dans les spams.
          </Text>

          {resent ? (
            <Alert color="green" variant="light" w="100%">
              Si un compte non confirmé existe pour cet email, un nouveau lien vient d'être envoyé.
            </Alert>
          ) : (
            <Button
              variant="subtle"
              color="green"
              size="sm"
              loading={resending}
              onClick={onResend}
            >
              Renvoyer l'email
            </Button>
          )}

          <Text size="sm" c="dimmed">
            <Anchor component={Link} to="/login" c="green">Aller à la connexion</Anchor>
          </Text>
        </Stack>
      </Paper>
    </Stack>
  )
}

export function RegisterPage() {
  const { register, resendConfirmation } = useAuth()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [resendingExists, setResendingExists] = useState(false)
  const [resentExists, setResentExists] = useState(false)

  const form = useForm({
    // Reprend l'email éventuellement saisi sur la page de connexion.
    initialValues: { email: location.state?.email || '', pseudo: '', plainPassword: '', confirm: '', codeInvitation: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Email invalide'),
      pseudo: (v) => (v.trim().length >= 2 ? null : 'Au moins 2 caractères'),
      plainPassword: (v) => (v.length >= 6 ? null : 'Au moins 6 caractères'),
      confirm: (v, values) =>
        v === values.plainPassword ? null : 'Les mots de passe ne correspondent pas',
      codeInvitation: (v) => (v.trim().length > 0 ? null : "Code d'autorisation requis"),
    },
  })

  const handleSubmit = async (values) => {
    setError(null)
    setLoading(true)
    try {
      await register({
        email: values.email,
        pseudo: values.pseudo,
        plainPassword: values.plainPassword,
        codeInvitation: values.codeInvitation,
      })
      setRegisteredEmail(values.email)
    } catch (err) {
      // Remonte les violations de validation du serveur sur les champs.
      if (err.violations?.length) {
        const fieldErrors = {}
        for (const v of err.violations) fieldErrors[v.propertyPath] = v.message
        form.setErrors(fieldErrors)
        // Email refusé côté serveur = email déjà utilisé (le format est validé côté client).
        if (fieldErrors.email) {
          setEmailExists(true)
          setResentExists(false)
          return
        }
      }
      setError(err.message || "Inscription impossible.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendConfirmation(registeredEmail)
      setResent(true)
    } catch {
      setResent(true) // réponse neutre : on confirme l'envoi dans tous les cas
    } finally {
      setResending(false)
    }
  }

  const handleResendExists = async () => {
    setResendingExists(true)
    try {
      await resendConfirmation(form.values.email)
    } catch {
      // réponse neutre
    } finally {
      setResentExists(true)
      setResendingExists(false)
    }
  }

  // Inscription faite : on bascule sur l'écran « vérifie ta boîte mail ».
  if (registeredEmail) {
    return (
      <VerifierEmail
        email={registeredEmail}
        onResend={handleResend}
        resending={resending}
        resent={resent}
      />
    )
  }

  return (
    <Stack align="center" pt={{ base: 32, sm: 48 }} px="md" pb={48}>
      <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={420}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={1} fz={26} fw={600} lts="-0.5px">Créer un compte</Title>
              <Text c="dimmed" size="sm">Quelques infos et c'est parti 🚀</Text>
            </Stack>

            {error && <Alert color="red" variant="light">{error}</Alert>}

            <TextInput label="Email" placeholder="ton@email.com" withAsterisk
              {...form.getInputProps('email')}
              onChange={(e) => {
                form.getInputProps('email').onChange(e)
                setEmailExists(false)
                setResentExists(false)
              }}
            />
            {emailExists && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
                p="sm"
              >
                <Stack gap={6}>
                  <Text size="sm">Un compte existe déjà avec cet email.</Text>
                  {resentExists ? (
                    <Text size="sm" c="dimmed">
                      Si ce compte n'est pas encore activé, un nouveau lien a été envoyé. Vérifie tes spams.
                    </Text>
                  ) : (
                    <Group gap="xs" wrap="nowrap">
                      <Button
                        size="xs"
                        variant="subtle"
                        color="green"
                        loading={resendingExists}
                        onClick={handleResendExists}
                      >
                        Renvoyer le lien de confirmation
                      </Button>
                      <Text size="xs" c="dimmed">ou</Text>
                      <Anchor component={Link} to="/login" size="xs" c="green">
                        Se connecter
                      </Anchor>
                    </Group>
                  )}
                </Stack>
              </Alert>
            )}
            <TextInput label="Pseudo" placeholder="Ton nom ou pseudo" withAsterisk
              {...form.getInputProps('pseudo')} />
            <PasswordInput label="Mot de passe" placeholder="6 caractères minimum" withAsterisk
              {...form.getInputProps('plainPassword')} />
            <PasswordInput label="Confirmer le mot de passe" placeholder="Répète le mot de passe" withAsterisk
              {...form.getInputProps('confirm')} />

            <TextInput
              label="Code d'autorisation"
              placeholder="Code fourni par Laura"
              description="Ce site est privé : un code est nécessaire pour créer un compte."
              withAsterisk
              {...form.getInputProps('codeInvitation')}
            />

            <Button type="submit" color="green" loading={loading} fullWidth mt="xs">
              Créer mon compte
            </Button>

            <Text size="sm" c="dimmed" ta="center">
              Tu pourras ajouter une photo de profil après confirmation, depuis ton profil.
            </Text>

            <Text size="sm" c="dimmed" ta="center">
              Déjà un compte ?{' '}
              <Anchor component={Link} to="/login" c="green">Se connecter</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
