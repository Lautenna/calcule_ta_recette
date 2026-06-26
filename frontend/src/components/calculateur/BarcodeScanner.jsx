import { useEffect, useRef, useState } from 'react'
import { Modal, Box, Text, Alert, Loader, Center, Stack } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

// On restreint aux formats de codes-barres alimentaires courants : décodage plus
// rapide et moins de faux positifs que le mode « tous formats ».
const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
])

/**
 * Ouvre la caméra (arrière sur mobile) et lit un code-barres en continu.
 * Appelle onDetected(code) au premier code lu, puis se referme via onClose.
 */
export function BarcodeScanner({ opened, onClose, onDetected }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  // onDetected change d'identité à chaque rendu parent : on le garde dans une ref
  // pour ne pas relancer la caméra (effet dépendant uniquement de `opened`).
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

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result) => {
          if (result && !detected && !cancelled) {
            detected = true
            onDetectedRef.current(result.getText())
          }
        },
      )
      .then((ctrl) => {
        if (cancelled) {
          ctrl.stop()
          return
        }
        controls = ctrl
        setReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        const denied = err?.name === 'NotAllowedError' || err?.name === 'NotFoundError'
        setError(
          denied
            ? "Accès à la caméra refusé ou indisponible. Autorisez la caméra ou saisissez le code à la main."
            : "Impossible de démarrer la caméra. Saisissez le code à la main.",
        )
      })

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [opened])

  return (
    <Modal opened={opened} onClose={onClose} title="Scanner un code-barres" centered>
      <Stack gap="sm">
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
              {!ready && (
                <Center style={{ position: 'absolute', inset: 0 }}>
                  <Loader color="green" />
                </Center>
              )}
            </Box>
            <Text fz="sm" c="dimmed" ta="center">
              Placez le code-barres du produit dans le cadre.
            </Text>
          </>
        )}
      </Stack>
    </Modal>
  )
}
