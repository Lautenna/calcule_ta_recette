import { useEffect, useRef, useState } from 'react'
import { Modal, Box, Text, Alert, Loader, Center, Stack } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
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

    BrowserCodeReader.listVideoInputDevices()
      .then((devices) => {
        if (cancelled) return
        if (devices.length === 0) {
          setError('Aucune caméra détectée. Saisissez le code à la main.')
          return
        }
        // Use first available device — avoids facingMode:'environment' issues on desktop
        const deviceId = devices[0].deviceId
        return reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (result && !detected && !cancelled) {
            detected = true
            onDetectedRef.current(result.getText())
          }
        })
      })
      .then((ctrl) => {
        if (!ctrl) return
        if (cancelled) { ctrl.stop(); return }
        controls = ctrl
        setReady(true)
      })
      .catch((err) => {
        if (cancelled) return
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
  }, [opened])

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
