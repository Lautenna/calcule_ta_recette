import { useRef, useState } from 'react'
import {
  Stack, Title, Text, Paper, Avatar, Group, Button, TextInput, PasswordInput,
  Divider, FileButton,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../context/AuthContext'

export function ProfilPage() {
  const { user, updateProfile, uploadPhoto, logout } = useAuth()
  const [savingInfos, setSavingInfos] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [uploading, setUploading] = useState(false)
  const resetRef = useRef(null)

  const infosForm = useForm({
    initialValues: { pseudo: user?.pseudo ?? '', email: user?.email ?? '' },
    validate: {
      pseudo: (v) => (v.trim().length >= 2 ? null : 'Au moins 2 caractères'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Email invalide'),
    },
  })

  const pwdForm = useForm({
    initialValues: { plainPassword: '', confirm: '' },
    validate: {
      plainPassword: (v) => (v.length >= 6 ? null : 'Au moins 6 caractères'),
      confirm: (v, values) =>
        v === values.plainPassword ? null : 'Les mots de passe ne correspondent pas',
    },
  })

  const applyServerErrors = (err, form) => {
    if (err.violations?.length) {
      const fieldErrors = {}
      for (const v of err.violations) fieldErrors[v.propertyPath] = v.message
      form.setErrors(fieldErrors)
    }
  }

  const handleInfos = async (values) => {
    setSavingInfos(true)
    try {
      await updateProfile({ pseudo: values.pseudo, email: values.email })
      notifications.show({ color: 'green', message: 'Profil mis à jour.' })
    } catch (err) {
      applyServerErrors(err, infosForm)
      notifications.show({ color: 'red', message: err.message || 'Échec de la mise à jour.' })
    } finally {
      setSavingInfos(false)
    }
  }

  const handlePassword = async (values) => {
    setSavingPwd(true)
    try {
      await updateProfile({ plainPassword: values.plainPassword })
      pwdForm.reset()
      notifications.show({ color: 'green', message: 'Mot de passe modifié.' })
    } catch (err) {
      applyServerErrors(err, pwdForm)
      notifications.show({ color: 'red', message: err.message || 'Échec du changement de mot de passe.' })
    } finally {
      setSavingPwd(false)
    }
  }

  const handlePhoto = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      await uploadPhoto(file)
      notifications.show({ color: 'green', message: 'Photo mise à jour.' })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message || "Échec de l'upload." })
    } finally {
      setUploading(false)
      resetRef.current?.()
    }
  }

  if (!user) return null

  return (
    <Stack p={32} gap="lg" maw={560}>
      <Title order={1} fz={32} fw={500} lts="-1px">Mon profil</Title>

      {/* Photo de profil */}
      <Paper withBorder radius="md" p="lg">
        <Group>
          <Avatar src={user.photoProfil || null} size={72} radius="md" color="green">
            {user.pseudo?.charAt(0).toUpperCase()}
          </Avatar>
          <Stack gap={4} style={{ flex: 1 }}>
            <Text fw={600} fz="lg">{user.pseudo}</Text>
            <Text c="dimmed" size="sm">{user.email}</Text>
          </Stack>
          <FileButton
            resetRef={resetRef}
            onChange={handlePhoto}
            accept="image/png,image/jpeg,image/webp,image/gif"
          >
            {(props) => (
              <Button {...props} variant="light" color="green" loading={uploading}>
                Changer la photo
              </Button>
            )}
          </FileButton>
        </Group>
      </Paper>

      {/* Infos */}
      <Paper withBorder radius="md" p="lg">
        <form onSubmit={infosForm.onSubmit(handleInfos)}>
          <Stack gap="md">
            <Text fw={600}>Informations</Text>
            <TextInput label="Pseudo" {...infosForm.getInputProps('pseudo')} />
            <TextInput label="Email" {...infosForm.getInputProps('email')} />
            <Group justify="flex-end">
              <Button type="submit" color="green" loading={savingInfos}>Enregistrer</Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {/* Mot de passe */}
      <Paper withBorder radius="md" p="lg">
        <form onSubmit={pwdForm.onSubmit(handlePassword)}>
          <Stack gap="md">
            <Text fw={600}>Changer le mot de passe</Text>
            <PasswordInput label="Nouveau mot de passe" {...pwdForm.getInputProps('plainPassword')} />
            <PasswordInput label="Confirmer" {...pwdForm.getInputProps('confirm')} />
            <Group justify="flex-end">
              <Button type="submit" color="green" loading={savingPwd}>Modifier</Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      <Divider />
      <Group justify="flex-end">
        <Button variant="subtle" color="red" onClick={logout}>Se déconnecter</Button>
      </Group>
    </Stack>
  )
}
