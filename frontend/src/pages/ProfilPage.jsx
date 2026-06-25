import { useRef, useState } from 'react'
import {
  Stack, Title, Text, Avatar, Group, Button, TextInput, PasswordInput,
  FileButton, Box, Modal, ActionIcon, Divider, Tooltip,
} from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../context/AuthContext'
import { MesIngredients } from '../components/profil/MesIngredients'
import { MesRecettes } from '../components/profil/MesRecettes'

export function ProfilPage() {
  const { user, updateProfile, uploadPhoto, logout } = useAuth()
  const [savingInfos, setSavingInfos] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [uploading, setUploading] = useState(false)
  const resetRef = useRef(null)

  const [settingsOpen, setSettingsOpen] = useState(false)

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
    <Stack gap={0} align="stretch">
      {/* En-tête profil — compact, avec accès aux réglages via la roue crantée */}
      <Box
        pos="relative"
        p={{ base: 24, sm: 32 }}
        style={{
          borderBottom: '3px solid var(--mantine-color-green-4)',
          textAlign: 'center',
          background: 'linear-gradient(180deg, var(--mantine-color-green-0) 0%, transparent 100%)',
        }}
      >
        <Tooltip label="Paramètres du compte" withArrow position="left">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            onClick={() => setSettingsOpen(true)}
            aria-label="Paramètres du compte"
            style={{ position: 'absolute', top: 16, right: 16 }}
          >
            <IconSettings size={22} />
          </ActionIcon>
        </Tooltip>

        <Group justify="center" gap="md" wrap="nowrap">
          <Avatar
            src={user.photoProfil || null}
            size={64}
            radius={64}
            color="green"
            style={{ border: '3px solid var(--mantine-color-green-3)' }}
          >
            <Text fz={24} fw={700}>{user.pseudo?.charAt(0).toUpperCase()}</Text>
          </Avatar>
          <Box style={{ textAlign: 'left' }}>
            <Title order={1} fz={{ base: 22, sm: 28 }} fw={700} lts="-0.5px">{user.pseudo}</Title>
            <FileButton
              resetRef={resetRef}
              onChange={handlePhoto}
              accept="image/png,image/jpeg,image/webp,image/gif"
            >
              {(props) => (
                <Button {...props} variant="subtle" color="green" size="compact-xs" loading={uploading}>
                  Changer la photo
                </Button>
              )}
            </FileButton>
          </Box>
        </Group>
      </Box>

      {/* Contenu principal : recettes & ingrédients mis en avant */}
      <Box p={{ base: 16, sm: 32 }}>
        <Stack gap="xl" maw={840} mx="auto">
          <MesRecettes />
          <MesIngredients />
        </Stack>
      </Box>

      {/* Réglages du compte — derrière la roue crantée */}
      <Modal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Paramètres du compte"
        centered
      >
        <Stack gap="lg">
          <form onSubmit={infosForm.onSubmit(handleInfos)}>
            <Stack gap="sm">
              <Text fw={600} fz="sm">Informations</Text>
              <TextInput label="Pseudo" {...infosForm.getInputProps('pseudo')} />
              <TextInput label="Email" {...infosForm.getInputProps('email')} />
              <Group justify="flex-end">
                <Button type="submit" color="green" loading={savingInfos}>Enregistrer</Button>
              </Group>
            </Stack>
          </form>

          <Divider />

          <form onSubmit={pwdForm.onSubmit(handlePassword)}>
            <Stack gap="sm">
              <Text fw={600} fz="sm">Changer le mot de passe</Text>
              <PasswordInput label="Nouveau mot de passe" {...pwdForm.getInputProps('plainPassword')} />
              <PasswordInput label="Confirmer" {...pwdForm.getInputProps('confirm')} />
              <Group justify="flex-end">
                <Button type="submit" color="green" loading={savingPwd}>Modifier</Button>
              </Group>
            </Stack>
          </form>

          <Divider />

          <Group justify="flex-end">
            <Button variant="subtle" color="red" onClick={logout}>Se déconnecter</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
