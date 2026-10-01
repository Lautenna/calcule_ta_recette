import { TextInput, NumberInput, Button, ActionIcon, Group, Stack, Text, Grid, Select, Autocomplete, Box, SimpleGrid, Slider, Tooltip, Divider, Anchor, Loader } from '@mantine/core'
import { IconTrash, IconPlus, IconChevronDown, IconChevronUp, IconCheck, IconPencil, IconSearch, IconStar, IconStarFilled, IconCamera, IconBarcode } from '@tabler/icons-react'
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
const BARCODE_PREFIX = '🔍 Rechercher le code-barres '

// Couleurs et apports journaliers recommandés (AJR) pour chaque macro.
// `testId` reprend le vocabulaire affiché (« lipides ») plutôt que la clé
// technique (`graisses`) : les tests désignent un champ par ce qu'il signifie
// pour l'utilisateur (cf. CarteIngredient.js).
const MACRO = {
  proteines: { label: 'P', full: 'Protéines (g)', color: 'var(--mantine-color-blue-6)', rda: 50, testId: 'proteines' },
  glucides: { label: 'G', full: 'Glucides (g)', color: 'var(--mantine-color-orange-6)', rda: 260, testId: 'glucides' },
  graisses: { label: 'L', full: 'Lipides (g)', color: 'var(--mantine-color-grape-6)', rda: 70, testId: 'lipides' },
}

// Provenance d'une suggestion de la liste déroulante, déduite du préfixe que
// l'application accole au libellé. Elle devient un `data-testid` distinct par
// source : un test peut alors vérifier d'OÙ vient une suggestion (Ciqual, mes
// ingrédients, code-barres) sans dépendre du titre du groupe affiché.
function sourceSuggestion(valeur) {
  if (valeur.startsWith(BARCODE_PREFIX)) return 'code-barres'
  if (valeur.startsWith(PERSO_PREFIX)) return 'perso'
  return 'ciqual'
}

const isEmpty = (v) => v === '' || v === null || v === undefined

// Donut SVG montrant la contribution d'une macro (pour la quantité réelle de
// l'ingrédient) en % de l'AJR.
function MacroDonut({ macroKey, valuePerHundred, quantite }) {
  const { label, color, rda } = MACRO[macroKey]
  const val = (parseFloat(valuePerHundred) || 0) * (parseFloat(quantite) || 0) / 100
  const pct = Math.min(Math.round(val / rda * 100), 100)
  const size = 42
  const r = 15
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--mantine-color-gray-2)" strokeWidth={5} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 11, fontWeight: 700, fill: color }}>{label}</text>
      </svg>
      <Text fz={9} c="dimmed" ta="center">{val.toFixed(1)}g</Text>
      <Text fz={9} c="dimmed" ta="center">{pct}%</Text>
    </Box>
  )
}

// Carte cliquable pour les étapes de choix.
function ChoiceCard({ icon, title, desc, onClick, color = 'green', testId }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Box
      component="button"
      type="button"
      data-testid={testId}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        border: `2px solid ${hovered ? `var(--mantine-color-${color}-4)` : 'var(--mantine-color-gray-3)'}`,
        borderRadius: 10,
        padding: '18px 12px',
        background: hovered ? `var(--mantine-color-${color}-0)` : 'white',
        textAlign: 'center',
        width: '100%',
        transition: 'border-color 0.15s, background 0.15s',
        outline: 'none',
      }}
    >
      <Text fz={28} lh={1} mb={8}>{icon}</Text>
      <Text fw={700} fz="sm" lh={1.3}>{title}</Text>
      {desc && <Text fz={11} c="dimmed" mt={6} lh={1.4}>{desc}</Text>}
    </Box>
  )
}

function IngredientCard({
  ingredient, onUpdate, onRemove, onSelectRecette,
  onFillFromCiqual, onFillFromBarcode, onFillFromIngredient,
  recettes, mesIngredients, canSave, onSaveIngredient, onRequireLogin,
}) {
  const isRecette = ingredient.type === 'recette'

  // Étapes : 'type' → 'method' ou 'recette_form'
  //          'method' → 'barcode' ou 'fill'
  //          'barcode' → 'fill' (en cas de succès) ou reste sur 'barcode' (erreur)
  // prevFillStep mémorise d'où l'on vient quand on entre dans 'fill'.
  const getInitialStep = () => {
    if (isRecette) return 'recette_form'
    if (ingredient.nom || !isEmpty(ingredient.energie_kcal)) return 'fill'
    return 'type'
  }
  const [step, setStep] = useState(getInitialStep)
  const [prevFillStep, setPrevFillStep] = useState('method')

  const [showExtra, setShowExtra] = useState(false)
  const [showMarque, setShowMarque] = useState(false)
  const [validated, setValidated] = useState(ingredient._validated ?? false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNow, setSavedNow] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeError, setBarcodeError] = useState(null)

  const lookupProduit = useProduitCodeBarre()

  const handleLookup = async (code) => {
    if (lookupProduit.isPending) return
    const c = String(code ?? '').replace(/\D/g, '')
    if (c.length < 8) return
    setBarcodeError(null)
    try {
      const produit = await lookupProduit.mutateAsync(c)
      onFillFromBarcode(ingredient.id, produit)
      setErrors({})
      setScannerOpen(false)
      setPrevFillStep('barcode')
      setStep('fill')
      notifications.show({ color: 'green', message: `« ${produit.nom} » importé depuis son code-barres.` })
    } catch (err) {
      setScannerOpen(false)
      setBarcodeError(
        err?.status === 404
          ? 'Aucun produit trouvé pour ce code-barres.'
          : (err?.message || 'Échec de la recherche du produit.')
      )
    }
  }

  // Recherche Ciqual pilotée par le nom saisi (désactivée si on tape un code-barres).
  const rawTerm = (ingredient.nom ?? '').trim()
  const isBarcode = /^\d{8,}$/.test(rawTerm)
  const [debouncedSearch] = useDebouncedValue(ingredient.nom ?? '', 250)
  const ciqualSearch = /^\d{6,}$/.test((debouncedSearch ?? '').trim()) ? '' : debouncedSearch
  const { data: alimentsData, isFetching } = useAliments(ciqualSearch)
  const aliments = alimentsData?.member ?? []

  const term = rawTerm.toLowerCase()
  const persoMatches = isBarcode ? []
    : (term.length >= 1 ? mesIngredients.filter((i) => i.nom.toLowerCase().includes(term)) : mesIngredients)
  const persoLabel = (i) => `${PERSO_PREFIX}${i.nom}${i.marque ? ` (${i.marque})` : ''}`
  const labelFor = (a) => (a.groupe ? `${a.nom} · ${a.groupe}` : a.nom)
  const ciqualOptions = [...new Set(aliments.map(labelFor))]

  const autocompleteData = []
  if (isBarcode) {
    autocompleteData.push({ group: 'Code-barres', items: [`${BARCODE_PREFIX}${rawTerm}`] })
  }
  if (persoMatches.length) {
    autocompleteData.push({ group: '⭐ Mes ingrédients', items: [...new Set(persoMatches.map(persoLabel))] })
  }
  if (ciqualOptions.length) {
    autocompleteData.push({ group: 'Base Ciqual (ANSES)', items: ciqualOptions })
  }

  const clearErrors = (...fields) => setErrors((prev) => {
    const next = { ...prev }
    for (const f of fields) delete next[f]
    return next
  })

  // Met à jour un champ et repose l'erreur en live après le premier « Terminer ».
  const onField = (field, value) => {
    onUpdate(ingredient.id, field, value)
    if (!touched) return
    setErrors((prev) => {
      const next = { ...prev }
      if (!isEmpty(value)) delete next[field]
      else if (['nom', 'quantite', 'energie_kcal', 'proteines', 'glucides', 'graisses', 'recetteId'].includes(field)) {
        next[field] = field === 'nom' ? 'Nom obligatoire' : field === 'quantite' ? 'Quantité obligatoire' : field === 'recetteId' ? 'Choisissez une recette' : 'Obligatoire'
      }
      return next
    })
  }

  const handleSelect = (val) => {
    if (val.startsWith(BARCODE_PREFIX)) {
      handleLookup(val.slice(BARCODE_PREFIX.length))
      return
    }
    if (val.startsWith(PERSO_PREFIX)) {
      const found = persoMatches.find((i) => persoLabel(i) === val)
      if (found) {
        onFillFromIngredient(ingredient.id, found)
        clearErrors('nom', 'energie_kcal', 'proteines', 'glucides', 'graisses')
        return
      }
    }
    const aliment = aliments.find((a) => labelFor(a) === val)
    if (aliment) {
      onFillFromCiqual(ingredient.id, aliment)
      clearErrors('nom', 'energie_kcal', 'proteines', 'glucides', 'graisses')
      return
    }
    onField('nom', val)
  }

  const validate = () => {
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
    return errs
  }

  const handleTerminer = () => {
    setTouched(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length === 0) setValidated(true)
  }

  const handleSaveToProfile = async () => {
    if (!canSave) { onRequireLogin(); return }
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

  const peutEnregistrer = !isRecette && !ingredient.sourceIngredientId && !ingredient.sourceCiqual
  const nomAffiche = ingredient.nom || (isRecette ? 'Recette' : 'Ingrédient sans nom')

  // `data-testid="carte-ingredient"`, posé sur la racine des DEUX vues (repliée et
  // déployée), délimite une carte quelle que soit son état : c'est le seul repère
  // qui permette de viser une carte précise quand la recette en compte plusieurs.
  // Les étapes de l'assistant portent de même un `data-testid="etape-…"`.
  const cardStyle = {
    borderLeft: `3px solid ${validated ? 'var(--mantine-color-green-5)' : 'var(--mantine-color-green-3)'}`,
    paddingLeft: 12, paddingTop: 10, paddingBottom: 10, paddingRight: 8,
    background: validated ? 'var(--mantine-color-green-0)' : 'white',
    borderRadius: '0 6px 6px 0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    marginBottom: 6,
  }

  // ── Vue repliée ─────────────────────────────────────────────────────────────
  if (validated) {
    return (
      <Box style={cardStyle} data-testid="carte-ingredient">
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            {ingredient.photo && (
              <img src={ingredient.photo} alt={nomAffiche} width={46} height={46}
                data-testid="photo-produit"
                style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid var(--mantine-color-gray-2)', background: 'white' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Group gap={6} wrap="nowrap" align="baseline" mb={8}>
                <Text fw={600} fz="sm" truncate data-testid="synthese-nom">{nomAffiche}</Text>
                {isRecette && <Text fz={11} c="green.7" fw={600} style={{ flexShrink: 0 }} data-testid="marqueur-recette">· recette</Text>}
                {ingredient.marque && <Text fz={11} c="dimmed" truncate>· {ingredient.marque}</Text>}
                <Text fz={11} c="dimmed" style={{ flexShrink: 0 }} data-testid="synthese-quantite">· {ingredient.quantite || 0} g</Text>
                <Text fz={11} c="dimmed" style={{ flexShrink: 0 }} data-testid="synthese-energie">· {ingredient.energie_kcal || 0} kcal</Text>
              </Group>
              {/* Donuts AJR par macro (contribution pour la quantité réelle) */}
              <Group gap={10} wrap="nowrap">
                {Object.keys(MACRO).map((k) => (
                  <MacroDonut key={k} macroKey={k} valuePerHundred={ingredient[k]} quantite={ingredient.quantite} />
                ))}
              </Group>
              {peutEnregistrer && (
                <Button size="compact-xs" mt={10}
                  variant={savedNow ? 'light' : 'filled'}
                  color={savedNow ? 'green' : 'yellow'}
                  loading={saving} disabled={savedNow}
                  leftSection={savedNow ? <IconStarFilled size={13} /> : <IconStar size={13} />}
                  onClick={handleSaveToProfile}
                  data-testid={savedNow ? 'bouton-ingredient-enregistre' : 'bouton-enregistrer-ingredient'}
                >
                  {savedNow ? 'Enregistré dans mes ingrédients' : 'Enregistrer dans mes ingrédients'}
                </Button>
              )}
            </Box>
          </Group>
          <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
            <ActionIcon variant="subtle" color="gray"
              onClick={() => { setValidated(false); setStep('fill'); setPrevFillStep('edit') }}
              aria-label="Modifier cet ingrédient" data-testid="bouton-modifier-ingredient">
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" onClick={() => onRemove(ingredient.id)}
              aria-label="Supprimer" data-testid="bouton-supprimer-ingredient">
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>
    )
  }

  // ── Vue déployée (étapes) ────────────────────────────────────────────────────
  return (
    <Box style={cardStyle} data-testid="carte-ingredient">

      {/* ÉTAPE 1 : Ingrédient ou Recette ? */}
      {step === 'type' && (
        <Stack gap="sm" data-testid="etape-type">
          <Group justify="space-between" align="center">
            <Text fz={11} c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
              Quel type ?
            </Text>
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onRemove(ingredient.id)}
              aria-label="Supprimer" data-testid="bouton-supprimer-ingredient">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
          <SimpleGrid cols={2} spacing="sm">
            <ChoiceCard icon="🥕" title="Ingrédient" desc="Un aliment ou produit du quotidien"
              testId="choix-type-ingredient"
              onClick={() => { onUpdate(ingredient.id, 'type', 'ingredient'); setStep('method') }} />
            <ChoiceCard icon="🍳" title="Recette" desc="Réutiliser une de vos recettes enregistrées"
              testId="choix-type-recette"
              onClick={() => { onUpdate(ingredient.id, 'type', 'recette'); setStep('recette_form') }} />
          </SimpleGrid>
        </Stack>
      )}

      {/* ÉTAPE 2 : Comment identifier l'ingrédient ? */}
      {step === 'method' && (
        <Stack gap="sm" data-testid="etape-methode">
          <Group justify="space-between" align="center">
            <Anchor component="button" type="button" fz={12} c="dimmed"
              onClick={() => setStep('type')}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Retour
            </Anchor>
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onRemove(ingredient.id)}
              aria-label="Supprimer" data-testid="bouton-supprimer-ingredient">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
          <Text fz={11} c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
            Comment identifier cet ingrédient ?
          </Text>
          <SimpleGrid cols={2} spacing="sm">
            <ChoiceCard icon="📷" title="Code-barres" desc="Scannez ou tapez un code EAN"
              testId="choix-methode-code-barres"
              onClick={() => setStep('barcode')} />
            <ChoiceCard icon="🔍" title="Chercher / saisir" desc="Base Ciqual, mes ingrédients, saisie libre"
              testId="choix-methode-recherche"
              onClick={() => { setPrevFillStep('method'); setStep('fill') }} />
          </SimpleGrid>
        </Stack>
      )}

      {/* ÉTAPE 2b (recette) : Sélection de recette + quantité */}
      {step === 'recette_form' && (
        <Stack gap="sm" data-testid="etape-recette">
          <Group justify="space-between" align="center">
            <Anchor component="button" type="button" fz={12} c="dimmed"
              onClick={() => { onUpdate(ingredient.id, 'type', 'ingredient'); setStep('type') }}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Retour
            </Anchor>
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onRemove(ingredient.id)}
              aria-label="Supprimer" data-testid="bouton-supprimer-ingredient">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
          {recettes.length === 0 && (
            <Text fz={12} c="dimmed">
              Vous n'avez pas encore de recette enregistrée. Créez-en une depuis le calculateur et enregistrez-la dans votre profil.
            </Text>
          )}
          <Grid align="flex-end" gutter="sm">
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <Select label="Recette enregistrée" placeholder="Choisir une recette…"
                data-testid="champ-recette"
                data={recettes.map((r) => ({ value: String(r.id), label: r.nom }))}
                value={ingredient.recetteId ? String(ingredient.recetteId) : null}
                error={errors.recetteId}
                disabled={recettes.length === 0}
                onChange={(val) => {
                  const recette = recettes.find((r) => String(r.id) === val) ?? null
                  onSelectRecette(ingredient.id, recette, recette ? recipePer100g(recette.composition) : null)
                  clearErrors('recetteId')
                }}
                renderOption={({ option }) => (
                  <span data-testid="option-recette">{option.label}</span>
                )}
                searchable nothingFoundMessage="Aucune recette trouvée" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput label="Quantité (g)" withAsterisk placeholder="0" min={0}
                data-testid="champ-quantite-recette"
                value={ingredient.quantite} error={errors.quantite}
                onChange={(val) => onField('quantite', val)} />
            </Grid.Col>
          </Grid>
          {ingredient.recetteId && (
            <Text fz={11} c="dimmed" data-testid="profil-recette">
              Profil pour 100 g : {Math.round(ingredient.energie_kcal || 0)} kcal ·{' '}
              <Text span fw={600} style={{ color: MACRO.proteines.color }}>P</Text> {Math.round(ingredient.proteines || 0)} g ·{' '}
              <Text span fw={600} style={{ color: MACRO.glucides.color }}>G</Text> {Math.round(ingredient.glucides || 0)} g ·{' '}
              <Text span fw={600} style={{ color: MACRO.graisses.color }}>L</Text> {Math.round(ingredient.graisses || 0)} g
            </Text>
          )}
          <Group justify="flex-end" mt={6}>
            <Button size="xs" color="green" leftSection={<IconCheck size={14} />} onClick={handleTerminer}
              data-testid="bouton-terminer">
              Terminer
            </Button>
          </Group>
        </Stack>
      )}

      {/* ÉTAPE 3a : Saisie / scan du code-barres */}
      {step === 'barcode' && (
        <Stack gap="sm" data-testid="etape-code-barres">
          <Group justify="space-between" align="center">
            <Anchor component="button" type="button" fz={12} c="dimmed"
              onClick={() => setStep('method')}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Retour
            </Anchor>
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onRemove(ingredient.id)}
              aria-label="Supprimer" data-testid="bouton-supprimer-ingredient">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
          <Text fz={11} c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
            Code-barres du produit
          </Text>
          <Group gap="xs" align="flex-end">
            <TextInput style={{ flex: 1 }}
              label="Numéro de code-barres"
              placeholder="ex : 3017620422003"
              leftSection={<IconBarcode size={15} />}
              data-testid="champ-code-barres"
              value={barcodeInput}
              error={barcodeError}
              onChange={(e) => { setBarcodeInput(e.currentTarget.value.replace(/\D/g, '')); setBarcodeError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(barcodeInput) } }}
              data-autofocus />
            <Tooltip label="Scanner avec la caméra" withArrow>
              <ActionIcon variant="light" color="green" size={36} onClick={() => setScannerOpen(true)}
                aria-label="Scanner un code-barres" data-testid="bouton-ouvrir-scanner">
                <IconCamera size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Button size="xs" color="green" loading={lookupProduit.isPending}
            disabled={barcodeInput.length < 8}
            data-testid="bouton-rechercher-produit"
            onClick={() => handleLookup(barcodeInput)}>
            Rechercher ce produit
          </Button>
          {barcodeError && (
            <Anchor component="button" type="button" fz={12} c="blue"
              data-testid="lien-saisie-manuelle"
              onClick={() => { setBarcodeError(null); setPrevFillStep('barcode'); setStep('fill') }}>
              Saisir les informations manuellement →
            </Anchor>
          )}
        </Stack>
      )}

      {/* ÉTAPE 3b / finale : Nom + quantité + nutrition */}
      {step === 'fill' && (
        <Stack gap={0} data-testid="etape-saisie">
          <Group justify="space-between" align="center" mb={12}>
            {prevFillStep === 'edit' ? (
              <Anchor component="button" type="button" fz={12} c="dimmed"
                data-testid="lien-annuler-modifications"
                onClick={() => setValidated(true)}>
                Annuler les modifications
              </Anchor>
            ) : (
              <Anchor component="button" type="button" fz={12} c="dimmed"
                onClick={() => setStep(prevFillStep === 'barcode' ? 'barcode' : 'method')}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                ← Retour
              </Anchor>
            )}
            <Group gap="xs" align="center">
              {ingredient.photo && (
                <img src={ingredient.photo} alt={ingredient.nom || 'Produit'} width={30} height={30}
                  data-testid="photo-produit"
                  style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid var(--mantine-color-gray-2)' }}
                  onError={(e) => { e.currentTarget.style.display = 'none' }} />
              )}
              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onRemove(ingredient.id)}
              aria-label="Supprimer" data-testid="bouton-supprimer-ingredient">
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Nom */}
          <Group gap="xs" wrap="nowrap" align="flex-end" mb={10}>
            <Autocomplete style={{ flex: 1 }}
              label="Nom du produit"
              withAsterisk
              placeholder="ex : carotte, farine… ou code-barres"
              leftSection={<IconSearch size={15} />}
              rightSection={isFetching ? <Loader size={14} /> : null}
              data-testid="champ-nom"
              data={autocompleteData}
              value={ingredient.nom}
              error={errors.nom}
              onChange={handleSelect}
              filter={({ options }) => options}
              /* Chaque suggestion porte un repère nommant sa PROVENANCE : les
                 tests peuvent ainsi vérifier qu'un aliment vient bien de Ciqual
                 (et non des ingrédients du compte) sans lire le titre du groupe. */
              renderOption={({ option }) => (
                <span data-testid={`suggestion-${sourceSuggestion(option.value)}`}>{option.value}</span>
              )}
              comboboxProps={{ withinPortal: true }}
            />
            <Tooltip label="Scanner un code-barres" withArrow>
              <ActionIcon variant="light" color="green" size={36} onClick={() => setScannerOpen(true)}
                aria-label="Scanner" data-testid="bouton-ouvrir-scanner-saisie">
                <IconCamera size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Quantité + marque */}
          <Grid align="flex-end" gutter="sm" mb={12}>
            <Grid.Col span={{ base: 5, sm: 4 }}>
              <NumberInput label="Quantité (g/ml)" withAsterisk placeholder="0" min={0}
                stepHoldDelay={500} stepHoldInterval={(c) => Math.max(1000 / (c + 1), 50)}
                data-testid="champ-quantite"
                value={ingredient.quantite} error={errors.quantite}
                onChange={(val) => onField('quantite', val)} />
            </Grid.Col>
            <Grid.Col span={{ base: 7, sm: 8 }}>
              {showMarque || !isEmpty(ingredient.marque) ? (
                <TextInput label="Marque" placeholder="Optionnel — ex : Nestlé…"
                  data-testid="champ-marque"
                  value={ingredient.marque}
                  onChange={(e) => onUpdate(ingredient.id, 'marque', e.target.value)} />
              ) : (
                <Anchor component="button" type="button" fz={12} c="dimmed"
                  data-testid="lien-ajouter-marque"
                  onClick={() => setShowMarque(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconPlus size={12} /> Ajouter une marque
                </Anchor>
              )}
            </Grid.Col>
          </Grid>

          {/* Valeurs nutritionnelles — toujours visibles (les 4 macros sont requises). */}
          <Divider mb={10} />
          <Text fz={11} c="dimmed" mb={8}
            style={{ fontFamily: 'var(--mantine-font-family-monospace)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Valeurs nutritionnelles pour 100g
          </Text>
          <Grid gutter="xs" mb={4}>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <NumberInput size="xs" label="Énergie (kcal)" min={0} placeholder="0" withAsterisk
                data-testid="champ-nutrition-energie"
                value={ingredient.energie_kcal || ''} error={errors.energie_kcal}
                onChange={(val) => onField('energie_kcal', val)} />
            </Grid.Col>
            {Object.entries(MACRO).map(([key, { full, color, testId }]) => (
              <Grid.Col key={key} span={{ base: 6, sm: 3 }}>
                <NumberInput size="xs" label={full} min={0} placeholder="0" withAsterisk
                  data-testid={`champ-nutrition-${testId}`}
                  value={ingredient[key] || ''} error={errors[key]}
                  onChange={(val) => onField(key, val)}
                  styles={{ label: { color, fontWeight: 700 } }} />
              </Grid.Col>
            ))}
          </Grid>

          <Anchor component="button" type="button" fz={11} c="dimmed" mt={6}
            onClick={() => setShowExtra((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {showExtra ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            {showExtra ? 'Masquer les détails' : 'Détails (sucres, sel, fibres…)'}
          </Anchor>

          {showExtra && (
            <Grid gutter="xs" mt={6}>
              {[
                ['sucres', 'dont Sucres (g)'],
                ['graisses_sat', 'dont Saturées (g)'],
                ['fibres', 'Fibres (g)'],
                ['sel', 'Sel (g)'],
                ['fer', 'Fer (mg)'],
                ['calcium', 'Calcium (mg)'],
              ].map(([field, label]) => (
                <Grid.Col key={field} span={{ base: 6, sm: 4, md: 2 }}>
                  <NumberInput size="xs" label={label} min={0} placeholder="0"
                    value={ingredient[field] || ''}
                    onChange={(val) => onUpdate(ingredient.id, field, val)} />
                </Grid.Col>
              ))}
            </Grid>
          )}

          {/* Pied : enregistrement + Terminer */}
          <Group justify={peutEnregistrer ? 'space-between' : 'flex-end'} mt={14} align="center" wrap="nowrap">
            {peutEnregistrer && (
              <Button size="compact-xs"
                variant={savedNow ? 'light' : 'filled'}
                color={savedNow ? 'green' : 'yellow'}
                loading={saving} disabled={savedNow || isEmpty(ingredient.nom)}
                leftSection={savedNow ? <IconStarFilled size={13} /> : <IconStar size={13} />}
                onClick={handleSaveToProfile}
                data-testid={savedNow ? 'bouton-ingredient-enregistre' : 'bouton-enregistrer-ingredient'}>
                {savedNow ? 'Enregistré' : 'Enregistrer dans mes ingrédients'}
              </Button>
            )}
            <Button size="xs" color="green" leftSection={<IconCheck size={14} />} onClick={handleTerminer}
              data-testid="bouton-terminer">
              Terminer
            </Button>
          </Group>
        </Stack>
      )}

      <BarcodeScanner opened={scannerOpen} onClose={() => setScannerOpen(false)}
        onDetected={(code) => handleLookup(code)} />
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

  const hasPending = ingredients.some((i) => !i.nom && !i.recetteId)

  const onSaveIngredient = (ingredient) => saveIngredient.mutateAsync(ingredient)
  const onRequireLogin = () => navigate('/login', { state: { from: { pathname: '/calculateur' } } })

  return (
    <Stack gap="md" p={{ base: 16, sm: 24 }} mb={16}>
      <Text size="sm" c="dimmed">
        Ajoutez vos ingrédients un par un pour obtenir le tableau nutritionnel complet de votre recette.
        {' Le bouton ⭐ permet de mémoriser un ingrédient saisi à la main'}
        {isAuthenticated ? '.' : (
          <Text component="span" data-testid="mention-connexion-proposee">
            {' (une connexion vous sera proposée).'}
          </Text>
        )}
      </Text>

      <Stack gap={0}>
        {ingredients.map((ingredient) => (
          <IngredientCard key={ingredient.id}
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

      <Button variant="light" color="green" leftSection={<IconPlus size={16} />}
        onClick={onAdd} w="fit-content" size="sm" disabled={hasPending}
        data-testid="bouton-ajouter-ingredient">
        Ajouter un ingrédient
      </Button>

      <Box>
        <Text size="sm" fw={500} mb={8}>
          Nombre de portions :{' '}
          <Text component="span" fw={700} c="green.7" data-testid="portions-valeur">{portions}</Text>
        </Text>
        <Slider value={portions} onChange={setPortions} min={1} max={15} step={1}
          color="green" label={null} mb={4} data-testid="curseur-portions"
          marks={Array.from({ length: 15 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
        />
      </Box>
    </Stack>
  )
}
