import { useState } from 'react'
import { Stack, Title, Box, Text, NumberInput, SegmentedControl, Group, Paper, Grid, ThemeIcon, Button } from '@mantine/core'
import { IconFlame, IconScaleOutline, IconRulerMeasure, IconCake, IconGenderBigender, IconDeviceFloppy, IconCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../../context/AuthContext'

function SectionHeader({ title }) {
  return (
    <Box
      py={14}
      px={24}
      style={{
        background: 'var(--mantine-color-green-0)',
        borderTop: '1px solid var(--mantine-color-green-1)',
        borderBottom: '1px solid var(--mantine-color-green-1)',
        textAlign: 'center',
      }}
    >
      <Text fz={16} fw={700} tt="uppercase" ff="monospace" c="green.7" style={{ letterSpacing: '0.15em' }}>
        {title}
      </Text>
    </Box>
  )
}

// Équations originales de Harris & Benedict (1919), métabolisme de base en kcal/jour.
// poids en kg, taille en cm, âge en années.
function harrisBenedict1919({ sexe, poids, taille, age }) {
  if ([poids, taille, age].some((v) => v === '' || v === null || v === undefined)) return null
  if (sexe === 'homme') {
    return 66.473 + 13.7516 * poids + 5.0033 * taille - 6.755 * age
  }
  return 655.0955 + 9.5634 * poids + 1.8496 * taille - 4.6756 * age
}

export function MetabolismePage() {
  const [sexe, setSexe] = useState('femme')
  const [poids, setPoids] = useState('')
  const [taille, setTaille] = useState('')
  const [age, setAge] = useState('')
  const [saving, setSaving] = useState(false)

  const { user, isAuthenticated, updateProfile } = useAuth()
  const mb = harrisBenedict1919({ sexe, poids, taille, age })

  const handleSave = async () => {
    if (mb === null) return
    setSaving(true)
    try {
      await updateProfile({ metabolismeBase: Math.round(mb) })
      notifications.show({ color: 'green', message: 'Métabolisme de base sauvegardé dans votre profil.' })
    } catch {
      notifications.show({ color: 'red', message: 'Échec de la sauvegarde.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap={0} align="stretch">
      <Box
        p={{ base: 24, sm: 40 }}
        style={{
          borderBottom: '3px solid var(--mantine-color-green-4)',
          textAlign: 'center',
          background: 'linear-gradient(180deg, var(--mantine-color-green-0) 0%, transparent 100%)',
        }}
      >
        <ThemeIcon size={56} radius="xl" variant="light" color="green" mb={12}>
          <IconFlame size={30} />
        </ThemeIcon>
        <Title order={1} fz={{ base: 28, sm: 44 }} fw={600} lts="-0.5px">
          Métabolisme de base
        </Title>
        <Text c="dimmed" size="md" mt={10} maw={620} mx="auto" style={{ lineHeight: 1.6 }}>
          Le métabolisme de base correspond à l'énergie minimale que votre corps
          dépense au repos pour assurer ses fonctions vitales (respiration,
          circulation, température…), sans aucune activité physique. Il est
          estimé ici avec la formule de <strong>Harris &amp; Benedict (1919)</strong>.
        </Text>
      </Box>

      <Box p={{ base: 16, sm: 32 }}>
        <Grid gutter={{ base: 16, sm: 32 }} align="stretch">
          {/* Saisie */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper withBorder radius="md" p={{ base: 20, sm: 28 }} h="100%">
              <Text fz={13} fw={700} tt="uppercase" ff="monospace" c="green.7" mb={20} style={{ letterSpacing: '0.12em' }}>
                Vos données
              </Text>
              <Stack gap="lg">
                <div>
                  <Group gap={6} mb={8}>
                    <IconGenderBigender size={16} color="var(--mantine-color-green-7)" />
                    <Text fz={13} fw={600}>Sexe</Text>
                  </Group>
                  <SegmentedControl
                    fullWidth
                    value={sexe}
                    onChange={setSexe}
                    color="green"
                    data={[
                      { label: 'Femme', value: 'femme' },
                      { label: 'Homme', value: 'homme' },
                    ]}
                  />
                </div>

                <NumberInput
                  label="Poids"
                  leftSection={<IconScaleOutline size={18} />}
                  placeholder="ex. 65"
                  suffix=" kg"
                  min={0}
                  value={poids}
                  onChange={setPoids}
                />
                <NumberInput
                  label="Taille"
                  leftSection={<IconRulerMeasure size={18} />}
                  placeholder="ex. 170"
                  suffix=" cm"
                  min={0}
                  value={taille}
                  onChange={setTaille}
                />
                <NumberInput
                  label="Âge"
                  leftSection={<IconCake size={18} />}
                  placeholder="ex. 30"
                  suffix=" ans"
                  min={0}
                  value={age}
                  onChange={setAge}
                />
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Résultat */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper
              radius="md"
              p={{ base: 24, sm: 28 }}
              h="100%"
              data-testid="metabolisme-resultat"
              style={{
                background: 'var(--mantine-color-green-0)',
                border: '1px solid var(--mantine-color-green-2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <Text fz={13} fw={700} tt="uppercase" ff="monospace" c="green.7" mb={16} style={{ letterSpacing: '0.12em' }}>
                Métabolisme de base
              </Text>
              {mb !== null ? (
                <>
                  <Group gap={8} align="baseline" justify="center">
                    <Text
                      fz={{ base: 52, sm: 72 }}
                      fw={600}
                      c="honey.7"
                      lh={1}
                      data-testid="metabolisme-valeur"
                      style={{ fontFamily: 'var(--mantine-font-family-headings)' }}
                    >
                      {Math.round(mb)}
                    </Text>
                  </Group>
                  <Text fz={18} fw={600} c="green.7" mt={4}>kcal / jour</Text>
                  <Text c="dimmed" size="sm" mt={16} style={{ lineHeight: 1.5 }}>
                    Énergie dépensée au repos sur une journée, hors activité physique.
                  </Text>
                  {isAuthenticated && (
                    <>
                      <Button
                        mt={20}
                        size="sm"
                        color="green"
                        variant="light"
                        leftSection={<IconDeviceFloppy size={16} />}
                        loading={saving}
                        onClick={handleSave}
                      >
                        Sauvegarder dans mon profil
                      </Button>
                      {user?.metabolismeBase && (
                        <Group gap={6} justify="center" mt={8}>
                          <IconCheck size={14} color="var(--mantine-color-green-6)" />
                          <Text size="xs" c="green.6">
                            Valeur enregistrée : {user.metabolismeBase} kcal/jour
                          </Text>
                        </Group>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <ThemeIcon size={48} radius="xl" variant="light" color="gray" mb={12}>
                    <IconFlame size={26} />
                  </ThemeIcon>
                  <Text c="dimmed" size="sm" style={{ lineHeight: 1.5 }}>
                    Renseignez votre sexe, poids, taille et âge pour estimer votre
                    métabolisme de base.
                  </Text>
                </>
              )}
            </Paper>
          </Grid.Col>
        </Grid>
      </Box>
    </Stack>
  )
}
