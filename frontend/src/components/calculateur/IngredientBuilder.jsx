import { TextInput, NumberInput, Button, ActionIcon, Group, Stack, Text, Grid, Select, Autocomplete, Radio, Box, Slider, Tooltip, Divider, Anchor, Loader } from '@mantine/core'
import { IconTrash, IconPlus, IconChevronDown, IconChevronUp, IconCheck, IconPencil, IconSearch, IconStar, IconStarFilled, IconBarcode, IconCamera } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useRecettes } from '../../hooks/useRecettes'
import { useIngredients, useSaveIngredient } from '../../hooks/useIngredients'
import { useAliments } from '../../hooks/useAliments'
import { useProduitCodeBarre } from '../../hooks/useProduitCodeBarre'
import { useAuth } from '../../context/AuthContext'
import { recipePer100g } from '../../utils/nutrition'
import { BarcodeScanner } from './BarcodeScanner'

const PERSO_PREFIX = '⭐ '

function IngredientCard({ ingredient, onUpdate, onRemove, onSelectRecette, onFillFromCiqual, onFillFromBarcode, onFillFromIngredient, recettes, mesIngredients, canSave, onSaveIngredient, onRequireLogin }) {
  const isRecette = ingredient.type === 'recette'
  const [showExtra, setShowExtra] = useState(false)
  const [validated, setValidated] = useState(ingredient._validated ?? false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [savedNow, setSavedNow] = useState(false)

  // Recherche par code-barres (OpenFoodFacts) — saisie sur ordinateur ou scan caméra.
  const [codeBarre, setCodeBarre] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const lookupProduit = useProduitCodeBarre()

  const handleLookup = async (code) => {
    const c = String(code ?? '').replace(/\D/g, '')
    if (c.length < 8) return
    try {
      const produit = await lookupProduit.mutateAsync(c)
      onFillFromBarcode(ingredient.id, produit)
      clearError('nom'); clearError('energie_kcal'); clearError('proteines'); clearError('glucides'); clearError('graisses')
      setScannerOpen(false)
      notifications.show({ color: 'green', message: `« ${produit.nom} » importé depuis son code-barres.` })
    } catch (err) {
      setScannerOpen(false)
      notifications.show({
        color: 'red',
        message: err?.status === 404
          ? 'Aucun produit trouvé pour ce code-barres. Renseignez les informations à la main.'
          : (err?.message || 'Échec de la recherche du produit. Renseignez les informations à la main.'),
      })
    }
  }

  // Recherche Ciqual (ANSES) — directement pilotée par le nom saisi dans le champ.
  const [debouncedSearch] = useDebouncedValue(ingredient.nom ?? '', 250)
  const { data: alimentsData, isFetching } = useAliments(debouncedSearch)
  const aliments = alimentsData?.member ?? []

  // Options « Mes ingrédients » filtrées côté client sur le terme saisi.
  const term = (ingredient.nom ?? '').trim().toLowerCase()
  const persoMatches = term.length >= 1
    ? mesIngredients.filter((i) => i.nom.toLowerCase().includes(term))
    : mesIngredients
  const persoLabel = (i) => `${PERSO_PREFIX}${i.nom}${i.marque ? ` (${i.marque})` : ''}`

  // Autocomplete travaille sur des chaînes : on affiche « nom · groupe » et on
  // retrouve l'aliment d'origine via ce même libellé. dedup pour éviter les clés en double.
  const labelFor = (a) => (a.groupe ? `${a.nom} · ${a.groupe}` : a.nom)
  const ciqualOptions = [...new Set(aliments.map(labelFor))]

  // Données groupées : mes ingrédients d'abord, puis la base Ciqual.
  const autocompleteData = []
  if (persoMatches.length) {
    autocompleteData.push({ group: '⭐ Mes ingrédients', items: [...new Set(persoMatches.map(persoLabel))] })
  }
  if (ciqualOptions.length) {
    autocompleteData.push({ group: 'Base Ciqual (ANSES)', items: ciqualOptions })
  }

  const handleSelect = (val) => {
    // Ingrédient personnel ?
    if (val.startsWith(PERSO_PREFIX)) {
      const found = persoMatches.find((i) => persoLabel(i) === val)
      if (found) {
        onFillFromIngredient(ingredient.id, found)
        clearError('nom'); clearError('energie_kcal'); clearError('proteines'); clearError('glucides'); clearError('graisses')
        return
      }
    }
    // Aliment Ciqual ?
    const aliment = aliments.find((a) => labelFor(a) === val)
    if (aliment) {
      onFillFromCiqual(ingredient.id, aliment)
      clearError('nom'); clearError('energie_kcal'); clearError('proteines'); clearError('glucides'); clearError('graisses')
      return
    }
    // Sinon saisie libre.
    onUpdate(ingredient.id, 'nom', val)
    clearError('nom')
  }

  const nomAffiche = ingredient.nom || (isRecette ? 'Recette' : 'Ingrédient sans nom')

  const isEmpty = (v) => v === '' || v === null || v === undefined

  const handleValidate = () => {
    const errs = {}
    if (isRecette) {
      if (!ingredient.recetteId) errs.recetteId = 'Choisissez une recette'
      if (isEmpty(ingredient.quantite)) errs.quantite = 'Quantité obligatoire'
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

  const handleSaveToProfile = async () => {
    // Pas connectée : on propose la connexion plutôt que d'enregistrer.
    if (!canSave) {
      onRequireLogin()
      return
    }
    setSaving(true)
    try {
      await onSaveIngredient(ingredient)
      setSavedNow(true)
      notifications.show({ color: 'green', message: `« ${ingredient.nom} » ajouté à vos ingrédients.` })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message || "Échec de l'enregistrement." })
    } finally {
      setSaving(false)
    }
  }

  // Bouton « enregistrer dans mon profil » : ingrédient saisi à la main,
  // ni issu de Ciqual (déjà dans la base) ni d'un ingrédient déjà enregistré.
  // Visible même déconnectée (clic → connexion).
  const peutEnregistrer = !isRecette && !ingredient.sourceIngredientId && !ingredient.sourceCiqual

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
              {isRecette && <Text fz={11} c="green.7" fw={600} style={{ flexShrink: 0 }}>· recette</Text>}
              {ingredient.marque && <Text fz={11} c="dimmed" truncate>· {ingredient.marque}</Text>}
              <Text fz={11} c="dimmed" style={{ flexShrink: 0 }}>· {ingredient.quantite || 0} g</Text>
            </Group>
            <Text fz={11} c="dimmed" mt={2}>
              Pour 100g : {ingredient.energie_kcal || 0} kcal · P {ingredient.proteines || 0} g · G {ingredient.glucides || 0} g · L {ingredient.graisses || 0} g
            </Text>
            {peutEnregistrer && (
              <Button
                size="compact-xs"
                mt={6}
                variant={savedNow ? 'light' : 'filled'}
                color={savedNow ? 'green' : 'yellow'}
                loading={saving}
                disabled={savedNow}
                leftSection={savedNow ? <IconStarFilled size={13} /> : <IconStar size={13} />}
                onClick={handleSaveToProfile}
              >
                {savedNow ? 'Enregistré dans mes ingrédients' : 'Enregistrer dans mes ingrédients'}
              </Button>
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
      {!isRecette && (
        <Group gap="sm" mb={12} align="flex-end" wrap="wrap">
          <Button
            color="green"
            variant="light"
            leftSection={<IconCamera size={16} />}
            onClick={() => setScannerOpen(true)}
          >
            Scanner un code-barres
          </Button>
          <TextInput
            label={<Text fz={11} c="dimmed">…ou saisir le code à la main</Text>}
            placeholder="ex : 3017620422003"
            leftSection={<IconBarcode size={15} />}
            rightSection={
              <ActionIcon
                variant="subtle"
                color="green"
                disabled={codeBarre.length < 8}
                loading={lookupProduit.isPending}
                onClick={() => handleLookup(codeBarre)}
                aria-label="Rechercher ce code-barres"
              >
                <IconSearch size={15} />
              </ActionIcon>
            }
            value={codeBarre}
            onChange={(e) => setCodeBarre(e.currentTarget.value.replace(/\D/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(codeBarre) } }}
            style={{ flex: 1, minWidth: 200, maxWidth: 280 }}
          />
        </Group>
      )}

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
                      label="Utilisez une de vos recettes enregistrées comme ingrédient : indiquez la quantité en grammes."
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
          <>
            <Grid.Col span={{ base: 10, sm: 7 }}>
              <Select
                label="Recette enregistrée"
                placeholder="Choisir une recette…"
                data={recettes.map((r) => ({ value: String(r.id), label: r.nom }))}
                value={ingredient.recetteId ? String(ingredient.recetteId) : null}
                error={errors.recetteId}
                onChange={(val) => {
                  const recette = recettes.find((r) => String(r.id) === val) ?? null
                  onSelectRecette(ingredient.id, recette, recette ? recipePer100g(recette.composition) : null)
                  clearError('recetteId')
                }}
                searchable
                nothingFoundMessage="Aucune recette trouvée"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 10, sm: 2 }}>
              <NumberInput
                label="Quantité (g)"
                labelProps={{ style: { whiteSpace: 'nowrap' } }}
                withAsterisk
                placeholder="0"
                min={0}
                value={ingredient.quantite}
                error={errors.quantite}
                onChange={(val) => { onUpdate(ingredient.id, 'quantite', val); clearError('quantite') }}
              />
            </Grid.Col>
          </>
        ) : (
          <>
            <Grid.Col span={{ base: 12, sm: 2 }}>
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
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Autocomplete
                label="Nom du produit"
                withAsterisk
                placeholder="ex : carotte, farine…"
                leftSection={<IconSearch size={15} />}
                rightSection={isFetching ? <Loader size={14} /> : null}
                data={autocompleteData}
                value={ingredient.nom}
                error={errors.nom}
                onChange={handleSelect}
                filter={({ options }) => options}
                comboboxProps={{ withinPortal: true }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 10, sm: 2 }}>
              <NumberInput
                label="Quantité (g/ml)"
                labelProps={{ style: { whiteSpace: 'nowrap' } }}
                withAsterisk
                placeholder="0"
                min={0}
                stepHoldDelay={500}
                stepHoldInterval={(count) => Math.max(1000 / (count + 1), 50)}
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

      <BarcodeScanner
        opened={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => { setCodeBarre(code.replace(/\D/g, '')); handleLookup(code) }}
      />

      {isRecette && ingredient.recetteId && (
        <Text fz={11} c="dimmed" mt={8}>
          Profil calculé pour 100 g : {Math.round(ingredient.energie_kcal || 0)} kcal · P {Math.round(ingredient.proteines || 0)} g · G {Math.round(ingredient.glucides || 0)} g · L {Math.round(ingredient.graisses || 0)} g
        </Text>
      )}

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

export function IngredientBuilder({ ingredients, portions, setPortions, onUpdate, onAdd, onRemove, onSelectRecette, onFillFromCiqual, onFillFromBarcode, onFillFromIngredient }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data: recettesData } = useRecettes()
  const { data: ingredientsData } = useIngredients()
  const saveIngredient = useSaveIngredient()

  const recettes = recettesData?.member ?? []
  const mesIngredients = ingredientsData?.member ?? []

  const onSaveIngredient = (ingredient) => saveIngredient.mutateAsync(ingredient)
  const onRequireLogin = () => navigate('/login', { state: { from: { pathname: '/calculateur' } } })

  return (
    <Stack gap="md" p={{ base: 16, sm: 24 }}>
      <Text size="sm" c="dimmed">
        Saisissez vos ingrédients et leurs valeurs nutritionnelles pour obtenir le récapitulatif complet de votre recette.
        {' Après avoir cliqué sur « Valider », un bouton ⭐ « Enregistrer dans mes ingrédients » apparaît pour le garder en mémoire'}
        {isAuthenticated ? '.' : ' (une connexion vous sera proposée).'}
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
            onFillFromCiqual={onFillFromCiqual}
            onFillFromBarcode={onFillFromBarcode}
            onFillFromIngredient={onFillFromIngredient}
            recettes={recettes}
            mesIngredients={mesIngredients}
            canSave={isAuthenticated}
            onSaveIngredient={onSaveIngredient}
            onRequireLogin={onRequireLogin}
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
