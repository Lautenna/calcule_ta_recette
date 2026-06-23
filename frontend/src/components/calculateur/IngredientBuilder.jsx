import { TextInput, NumberInput, Button, ActionIcon, Group, Stack, Text, Grid, Select, Radio, Box, Slider, Tooltip, Divider, Anchor } from '@mantine/core'
import { IconTrash, IconPlus, IconQuestionMark, IconChevronDown, IconChevronUp, IconCheck, IconPencil } from '@tabler/icons-react'
import { useState } from 'react'
import { useRecettes } from '../../hooks/useRecettes'

function IngredientCard({ ingredient, onUpdate, onRemove, onSelectRecette, recettesOptions }) {
  const isRecette = ingredient.type === 'recette'
  const [showExtra, setShowExtra] = useState(false)
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})

  const nomAffiche = ingredient.nom || (isRecette ? 'Recette' : 'Ingrédient sans nom')

  const isEmpty = (v) => v === '' || v === null || v === undefined

  const handleValidate = () => {
    const errs = {}
    if (isRecette) {
      if (!ingredient.recetteId) errs.recetteId = 'Choisissez une recette'
    } else {
      if (isEmpty(ingredient.nom)) errs.nom = 'Nom obligatoire'
      if (isEmpty(ingredient.quantite)) errs.quantite = 'Quantité obligatoire'
      if (isEmpty(ingredient.energie_kcal)) errs.energie_kcal = 'Obligatoire'
      if (isEmpty(ingredient.proteines)) errs.proteines = 'Obligatoire'
      if (isEmpty(ingredient.glucides)) errs.glucides = 'Obligatoire'
      if (isEmpty(ingredient.graisses)) errs.graisses = 'Obligatoire'
    }
    setErrors(errs)
    if (Object.keys(errs).length === 0) setValidated(true)
  }

  const clearError = (field) => setErrors((prev) => {
    if (!prev[field]) return prev
    const next = { ...prev }
    delete next[field]
    return next
  })

  // Vue repliée une fois l'ingrédient validé
  if (validated) {
    return (
      <Box
        mb={6}
        style={{
          borderLeft: '3px solid var(--mantine-color-green-5)',
          paddingLeft: 12,
          paddingTop: 8,
          paddingBottom: 8,
          paddingRight: 8,
          background: 'var(--mantine-color-green-0)',
          borderRadius: '0 6px 6px 0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Box style={{ minWidth: 0 }}>
            <Group gap={6} wrap="nowrap" align="baseline">
              <IconCheck size={14} color="var(--mantine-color-green-6)" style={{ flexShrink: 0 }} />
              <Text fw={600} fz="sm" truncate>{nomAffiche}</Text>
              {ingredient.marque && <Text fz={11} c="dimmed" truncate>· {ingredient.marque}</Text>}
              <Text fz={11} c="dimmed" style={{ flexShrink: 0 }}>· {ingredient.quantite || 0} g</Text>
            </Group>
            {!isRecette && (
              <Text fz={11} c="dimmed" mt={2}>
                Pour 100g : {ingredient.energie_kcal || 0} kcal · P {ingredient.proteines || 0} g · G {ingredient.glucides || 0} g · L {ingredient.graisses || 0} g
              </Text>
            )}
          </Box>
          <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
            <ActionIcon variant="subtle" color="gray" onClick={() => setValidated(false)} aria-label="Modifier cet ingrédient">
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" onClick={() => onRemove(ingredient.id)} aria-label="Supprimer cet ingrédient">
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>
    )
  }

  return (
    <Box
      mb={6}
      style={{
        borderLeft: '3px solid var(--mantine-color-green-3)',
        paddingLeft: 12,
        paddingTop: 10,
        paddingBottom: 10,
        paddingRight: 8,
        background: 'white',
        borderRadius: '0 6px 6px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Grid align="flex-end" gutter="sm">
        {/* Radio type */}
        <Grid.Col span={{ base: 12, sm: 2 }}>
          <Text fz={11} c="dimmed" mb={4} style={{ fontFamily: 'var(--mantine-font-family-monospace)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Type
          </Text>
          <Radio.Group
            value={ingredient.type}
            onChange={(val) => onUpdate(ingredient.id, 'type', val)}
          >
            <Stack gap={4}>
              <Radio value="ingredient" label="Ingrédient" size="xs" />
              <Radio
                value="recette"
                size="xs"
                label={
                  <Group gap={4} align="center" wrap="nowrap">
                    <Text size="xs">Recette</Text>
                    <Tooltip
                      label="Pour utiliser une recette existante comme ingrédient, un compte est nécessaire."
                      withArrow
                      multiline
                      maw={220}
                      position="right"
                    >
                      <Box
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          background: 'var(--mantine-color-dimmed)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'help',
                          flexShrink: 0,
                        }}
                      >
                        <Text fz={7} c="white" fw={700} lh={1}>?</Text>
                      </Box>
                    </Tooltip>
                  </Group>
                }
              />
            </Stack>
          </Radio.Group>
        </Grid.Col>

        {isRecette ? (
          <Grid.Col span={{ base: 10, sm: 9 }}>
            <Select
              label="Recette enregistrée"
              placeholder="Choisir une recette…"
              data={recettesOptions}
              value={ingredient.recetteId ? String(ingredient.recetteId) : null}
              error={errors.recetteId}
              onChange={(val) => {
                const found = recettesOptions.find((r) => r.value === val)
                onSelectRecette(ingredient.id, val, found ? found.label : '')
                clearError('recetteId')
              }}
              searchable
              nothingFoundMessage="Aucune recette trouvée"
            />
          </Grid.Col>
        ) : (
          <>
            <Grid.Col span={{ base: 5, sm: 3 }}>
              <TextInput
                label={<Text fz={12} c="dimmed">Marque</Text>}
                placeholder="Non précisée"
                value={ingredient.marque}
                onChange={(e) => onUpdate(ingredient.id, 'marque', e.target.value)}
                styles={{
                  input: {
                    color: 'var(--mantine-color-dimmed)',
                    background: 'var(--mantine-color-gray-0)',
                  },
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 7, sm: 4 }}>
              <TextInput
                label="Nom du produit"
                withAsterisk
                placeholder="ex : Farine T55"
                value={ingredient.nom}
                error={errors.nom}
                onChange={(e) => { onUpdate(ingredient.id, 'nom', e.target.value); clearError('nom') }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 10, sm: 2 }}>
              <NumberInput
                label="Quantité"
                withAsterisk
                placeholder="0"
                min={0}
                suffix=" g"
                value={ingredient.quantite}
                error={errors.quantite}
                onChange={(val) => { onUpdate(ingredient.id, 'quantite', val); clearError('quantite') }}
              />
            </Grid.Col>
          </>
        )}

        <Grid.Col span={{ base: 2, sm: 1 }} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => onRemove(ingredient.id)}
            aria-label="Supprimer cet ingrédient"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Grid.Col>
      </Grid>

      {!isRecette && (
        <Box mt={10}>
          <Divider mb={8} />
          <Text fz={11} c="dimmed" mb={6} style={{ fontFamily: 'var(--mantine-font-family-monospace)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Valeurs nutritionnelles pour 100g
          </Text>
          <Grid gutter="xs">
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <NumberInput size="xs" label="Énergie (kcal)" min={0} placeholder="0" withAsterisk value={ingredient.energie_kcal || ''} error={errors.energie_kcal} onChange={(val) => { onUpdate(ingredient.id, 'energie_kcal', val); clearError('energie_kcal') }} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <NumberInput size="xs" label="Protéines (g)" min={0} placeholder="0" withAsterisk value={ingredient.proteines || ''} error={errors.proteines} onChange={(val) => { onUpdate(ingredient.id, 'proteines', val); clearError('proteines') }} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <NumberInput size="xs" label="Glucides (g)" min={0} placeholder="0" withAsterisk value={ingredient.glucides || ''} error={errors.glucides} onChange={(val) => { onUpdate(ingredient.id, 'glucides', val); clearError('glucides') }} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <NumberInput size="xs" label="Lipides (g)" min={0} placeholder="0" withAsterisk value={ingredient.graisses || ''} error={errors.graisses} onChange={(val) => { onUpdate(ingredient.id, 'graisses', val); clearError('graisses') }} />
            </Grid.Col>
          </Grid>

          <Anchor component="button" fz={11} c="dimmed" mt={8} onClick={() => setShowExtra((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {showExtra ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            {showExtra ? 'Masquer les détails' : 'Afficher les détails'}
          </Anchor>

          {showExtra && (
            <Grid gutter="xs" mt={6}>
              <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
                <NumberInput size="xs" label="dont Sucres (g)" min={0} placeholder="0" value={ingredient.sucres || ''} onChange={(val) => onUpdate(ingredient.id, 'sucres', val)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
                <NumberInput size="xs" label="dont Saturées (g)" min={0} placeholder="0" value={ingredient.graisses_sat || ''} onChange={(val) => onUpdate(ingredient.id, 'graisses_sat', val)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
                <NumberInput size="xs" label="Fibres (g)" min={0} placeholder="0" value={ingredient.fibres || ''} onChange={(val) => onUpdate(ingredient.id, 'fibres', val)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
                <NumberInput size="xs" label="Sel (g)" min={0} placeholder="0" value={ingredient.sel || ''} onChange={(val) => onUpdate(ingredient.id, 'sel', val)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
                <NumberInput size="xs" label="Fer (mg)" min={0} placeholder="0" value={ingredient.fer || ''} onChange={(val) => onUpdate(ingredient.id, 'fer', val)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
                <NumberInput size="xs" label="Calcium (mg)" min={0} placeholder="0" value={ingredient.calcium || ''} onChange={(val) => onUpdate(ingredient.id, 'calcium', val)} />
              </Grid.Col>
            </Grid>
          )}
        </Box>
      )}

      <Group justify="flex-end" mt={12}>
        <Button
          size="xs"
          color="green"
          variant="filled"
          leftSection={<IconCheck size={14} />}
          onClick={handleValidate}
        >
          Valider
        </Button>
      </Group>
    </Box>
  )
}

export function IngredientBuilder({ ingredients, portions, setPortions, onUpdate, onAdd, onRemove, onSelectRecette }) {
  const { data: recettesData } = useRecettes()
  const recettesOptions = (recettesData?.member ?? []).map((r) => ({
    value: String(r.id),
    label: r.nom,
  }))

  return (
    <Stack gap="md" p={{ base: 16, sm: 24 }}>
      <Text size="sm" c="dimmed">
        Saisissez vos ingrédients et leurs valeurs nutritionnelles pour obtenir le récapitulatif complet de votre recette.
      </Text>

      {/* Slider portions */}
      <Box>
        <Text size="sm" fw={500} mb={8}>
          Nombre de portions :{' '}
          <Text component="span" fw={700} c="green.7">{portions}</Text>
        </Text>
        <Slider
          value={portions}
          onChange={setPortions}
          min={1}
          max={15}
          step={1}
          color="green"
          label={null}
          mb={8}
        />
        <Group justify="space-between">
          <Text fz={11} c="dimmed">1</Text>
          <Text fz={11} c="dimmed">15</Text>
        </Group>
      </Box>

      <Stack gap={0}>
        {ingredients.map((ingredient) => (
          <IngredientCard
            key={ingredient.id}
            ingredient={ingredient}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onSelectRecette={onSelectRecette}
            recettesOptions={recettesOptions}
          />
        ))}
      </Stack>

      <Button
        variant="light"
        color="green"
        leftSection={<IconPlus size={16} />}
        onClick={onAdd}
        w="fit-content"
        size="sm"
      >
        Ajouter un ingrédient
      </Button>
    </Stack>
  )
}
