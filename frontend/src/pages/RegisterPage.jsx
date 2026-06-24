import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from '@mantine/form'
import {
  Paper, Stack, Title, Text, TextInput, PasswordInput, Button, Anchor, Alert,
  FileInput, Avatar, Group,
} from '@mantine/core'
import { useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const { register, uploadPhoto } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [photo, setPhoto] = useState(null)

  const form = useForm({
    initialValues: { email: '', pseudo: '', plainPassword: '', confirm: '', codeInvitation: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Email invalide'),
      pseudo: (v) => (v.trim().length >= 2 ? null : 'Au moins 2 caractères'),
      plainPassword: (v) => (v.length >= 6 ? null : 'Au moins 6 caractères'),
      confirm: (v, values) =>
        v === values.plainPassword ? null : 'Les mots de passe ne correspondent pas',
      codeInvitation: (v) => (v.trim().length > 0 ? null : "Code d'autorisation requis"),
    },
  })

  // Aperçu local de la photo sélectionnée.
  const photoPreview = photo ? URL.createObjectURL(photo) : null

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
      // Photo optionnelle : envoyée seulement si fournie (après connexion auto).
      if (photo) {
        await uploadPhoto(photo)
      }
      navigate('/profil', { replace: true })
    } catch (err) {
      // Remonte les violations de validation du serveur sur les champs.
      if (err.violations?.length) {
        const fieldErrors = {}
        for (const v of err.violations) fieldErrors[v.propertyPath] = v.message
        form.setErrors(fieldErrors)
      }
      setError(err.message || "Inscription impossible.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack align="center" pt={48} px="md" pb={48}>
      <Paper withBorder shadow="sm" radius="md" p={32} w="100%" maw={420}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={1} fz={26} fw={600} lts="-0.5px">Créer un compte</Title>
              <Text c="dimmed" size="sm">Quelques infos et c'est parti 🚀</Text>
            </Stack>

            {error && <Alert color="red" variant="light">{error}</Alert>}

            <TextInput label="Email" placeholder="ton@email.com" withAsterisk
              {...form.getInputProps('email')} />
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

            <Group align="flex-end" gap="md" wrap="nowrap">
              <Avatar src={photoPreview} radius="md" size={54} color="green" />
              <FileInput
                label="Photo de profil (optionnel)"
                placeholder="Choisir une image"
                accept="image/png,image/jpeg,image/webp,image/gif"
                value={photo}
                onChange={setPhoto}
                clearable
                style={{ flex: 1 }}
              />
            </Group>

            <Button type="submit" color="green" loading={loading} fullWidth mt="xs">
              Créer mon compte
            </Button>

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
