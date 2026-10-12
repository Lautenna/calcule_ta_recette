import { useEffect, useRef, useState } from 'react'
import { Modal, Box, Text, Alert, Loader, Center, Stack, ActionIcon, Tooltip } from '@mantine/core'
import { IconAlertCircle, IconCameraRotate } from '@tabler/icons-react'
import { BrowserMultiFormatReader, BrowserCodeReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
])

export function BarcodeScanner({ opened, onClose, onDetected }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  // Caméra demandée : null = celle de l'arrière par défaut, sinon un deviceId.
  const [deviceId, setDeviceId] = useState(null)
  const [devices, setDevices] = useState([])
  // Caméra réellement utilisée (le navigateur peut ne pas la renseigner).
  const currentIdRef = useRef(null)

  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  useEffect(() => {
    if (!opened) return

    let controls = null
    let cancelled = false
    let detected = false
    setError(null)
    setReady(false)

    const reader = new BrowserMultiFormatReader(hints)

    // Par défaut on vise la caméra arrière ("ideal" : sans effet bloquant sur
    // un ordinateur, qui n'en a qu'une). Un deviceId précis est demandé quand
    // l'utilisatrice bascule de caméra.
    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' } },
    }

    reader
      .decodeFromConstraints(constraints, videoRef.current, (result) => {
        if (result && !detected && !cancelled) {
          detected = true
          onDetectedRef.current(result.getText())
        }
      })
      .then(async (ctrl) => {
        if (cancelled) { ctrl.stop(); return }
        controls = ctrl
        const track = videoRef.current?.srcObject?.getVideoTracks?.()[0]
        currentIdRef.current = track?.getSettings?.().deviceId ?? deviceId
        // Les noms et ids ne sont fiables qu'une fois la permission accordée.
        const found = await BrowserCodeReader.listVideoInputDevices().catch(() => [])
        if (cancelled) return
        setDevices(found)
        setReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        // Caméra mémorisée devenue introuvable : retour à la caméra par défaut.
        if (deviceId) { setDeviceId(null); return }
        const denied = err?.name === 'NotAllowedError' || err?.name === 'NotFoundError'
        setError(
          denied
            ? 'Accès à la caméra refusé ou indisponible. Autorisez la caméra ou saisissez le code à la main.'
            : 'Impossible de démarrer la caméra. Saisissez le code à la main.',
        )
      })

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [opened, deviceId])

  const basculerCamera = () => {
    const index = devices.findIndex((d) => d.deviceId === currentIdRef.current)
    setDeviceId(devices[(index + 1) % devices.length].deviceId)
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Scanner un code-barres" centered>
      {/* Repère E2E posé sur le CONTENU du modal, et non sur le composant :
          Mantine rend une racine sans boîte propre, qu'un test ne peut pas voir
          apparaître ni disparaître. */}
      <Stack gap="sm" data-testid="modale-scanner">
        {error ? (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        ) : (
          <>
            <Box
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#000',
                aspectRatio: '4 / 3',
              }}
            >
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
                playsInline
              />
              {devices.length > 1 && (
                <Tooltip label="Changer de caméra" withArrow>
                  <ActionIcon
                    variant="filled"
                    color="dark"
                    size="lg"
                    radius="xl"
                    onClick={basculerCamera}
                    disabled={!ready}
                    aria-label="Changer de caméra"
                    data-testid="bouton-changer-camera"
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                  >
                    <IconCameraRotate size={20} />
                  </ActionIcon>
                </Tooltip>
              )}
              {!ready && (
                <Center style={{ position: 'absolute', inset: 0 }}>
                  <Loader color="green" />
                </Center>
              )}
            </Box>
            <Text fz="sm" c="dimmed" ta="center" data-testid="consigne-scanner">
              Placez le code-barres du produit dans le cadre.
            </Text>
          </>
        )}
      </Stack>
    </Modal>
  )
}
