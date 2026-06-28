import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Paper, Stack, Title, Text, Button, Loader, ThemeIcon, TextInput, Alert } from '@mantine/core'
import { IconCircleCheck, IconCircleX, IconMailCheck } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'

// Page atteinte via le lien reçu par mail : /confirmation?token=xxx
export function ConfirmationPage() {
  const { confirmEmail, resendConfirmation } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error | expired
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
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
        if (err.status === 410) {
          setStatus('expired')
        } else {
          setStatus('error')
          setMessage(err.message || 'Ce lien de confirmation est invalide ou a expiré.')
        }
      })
  }, [token, confirmEmail])

  const handleResend = async () => {
    setResending(true)
    try {
      await resendConfirmation(resendEmail)
    } catch {
      // réponse neutre : on confirme dans tous les cas
    } finally {
      setResent(true)
      setResending(false)
    }
  }

  return (
    <Stack align="center" pt={{ base: 32, sm: 64 }} px="md" pb={48}>
      <Paper withBorder shadow="sm" radius="md" p={{ base: 24, sm: 32 }} w="100%" maw={440}>
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

          {status === 'expired' && !resent && (
            <>
              <ThemeIcon size={56} radius="xl" variant="light" color="orange">
                <IconCircleX size={32} />
              </ThemeIcon>
              <Title order={1} fz={24} fw={600} lts="-0.5px">Lien expiré</Title>
              <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>
                Ce lien n'est plus valide (il expire après 24 h). Saisis ton adresse email
                pour recevoir un nouveau lien de confirmation.
              </Text>
              <TextInput
                w="100%"
                placeholder="ton@email.com"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.currentTarget.value)}
              />
              <Button
                color="green"
                fullWidth
                loading={resending}
                disabled={!/^\S+@\S+\.\S+$/.test(resendEmail)}
                onClick={handleResend}
              >
                Recevoir un nouveau lien
              </Button>
            </>
          )}

          {status === 'expired' && resent && (
            <>
              <ThemeIcon size={56} radius="xl" variant="light" color="green">
                <IconMailCheck size={32} />
              </ThemeIcon>
              <Title order={1} fz={24} fw={600} lts="-0.5px">Email envoyé</Title>
              <Alert color="green" variant="light" w="100%" ta="left">
                Si un compte non confirmé existe pour cet email, un nouveau lien vient d'être
                envoyé. Pense à vérifier tes spams.
              </Alert>
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
