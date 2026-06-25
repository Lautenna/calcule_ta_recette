import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Paper, Stack, Title, Text, Button, Loader, ThemeIcon } from '@mantine/core'
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'

// Page atteinte via le lien reçu par mail : /confirmation?token=xxx
export function ConfirmationPage() {
  const { confirmEmail } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')
  // Évite un double appel en mode StrictMode (double montage en dev).
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    if (!token) {
      setStatus('error')
      setMessage('Lien de confirmation invalide : aucun jeton fourni.')
      return
    }

    confirmEmail(token)
      .then((res) => {
        setStatus('success')
        setMessage(res?.message || 'Adresse confirmée. Tu peux maintenant te connecter.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || 'Ce lien de confirmation est invalide ou a expiré.')
      })
  }, [token, confirmEmail])

  return (
    <Stack align="center" pt={64} px="md" pb={48}>
      <Paper withBorder shadow="sm" radius="md" p={32} w="100%" maw={440}>
        <Stack gap="md" align="center" ta="center">
          {status === 'loading' && (
            <>
              <Loader color="green" />
              <Title order={1} fz={22} fw={600} lts="-0.5px">Confirmation en cours…</Title>
            </>
          )}

          {status === 'success' && (
            <>
              <ThemeIcon size={56} radius="xl" variant="light" color="green">
                <IconCircleCheck size={32} />
              </ThemeIcon>
              <Title order={1} fz={24} fw={600} lts="-0.5px">Adresse confirmée 🎉</Title>
              <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>{message}</Text>
              <Button component={Link} to="/login" color="green" mt="xs">
                Se connecter
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ThemeIcon size={56} radius="xl" variant="light" color="red">
                <IconCircleX size={32} />
              </ThemeIcon>
              <Title order={1} fz={24} fw={600} lts="-0.5px">Confirmation impossible</Title>
              <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>{message}</Text>
              <Button component={Link} to="/register" variant="default" mt="xs">
                Revenir à l'inscription
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
