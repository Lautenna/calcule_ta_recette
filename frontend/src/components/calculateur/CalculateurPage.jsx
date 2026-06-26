import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Stack, Title, Box, Text, ThemeIcon, Button, Group, Modal, TextInput } from '@mantine/core'
import { IconChefHat, IconDeviceFloppy } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { computeTotals, computePerPortion, NUTRIENT_KEYS } from '../../utils/nutrition'
import { useAuth } from '../../context/AuthContext'
import { useSaveRecette, useUpdateRecette } from '../../hooks/useRecettes'
import { IngredientBuilder } from './IngredientBuilder'
import { NutritionTable } from './NutritionTable'
import { MacroPieChart } from './MacroPieChart'

function emptyIngredient() {
  return {
    id: crypto.randomUUID(),
    type: 'ingredient',
    recetteId: null,
    sourceIngredientId: null,
    sourceCiqual: false,
    photo: null,
    nom: '', marque: '', quantite: '',
    energie_kcal: '', energie_kj: '',
    graisses: '', graisses_sat: '',
    glucides: '', sucres: '',
    proteines: '', sel: '',
    fibres: '', fer: '', calcium: '',
  }
}

// Normalise un ingrédient venant d'une composition enregistrée : on garantit un
// id et les champs attendus, et on marque la carte comme déjà validée (repliée).
function fromComposition(item) {
  return { ...emptyIngredient(), ...item, id: item.id || crypto.randomUUID(), _validated: true }
}

// Nettoie un ingrédient avant enregistrement (on retire les drapeaux transitoires).
function cleanForSave(ingredient) {
  const copy = { ...ingredient }
  delete copy._validated
  return copy
}

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

export function CalculateurPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // Recette transmise depuis « Mon profil » pour consultation/modification.
  const recetteAEditer = location.state?.recette ?? null

  const [editingId, setEditingId] = useState(recetteAEditer?.id ?? null)
  const [portions, setPortions] = useState(recetteAEditer?.nombrePersonnes ?? 4)
  const [ingredients, setIngredients] = useState(() =>
    recetteAEditer?.composition?.length
      ? recetteAEditer.composition.map(fromComposition)
      : [emptyIngredient()]
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [nomRecette, setNomRecette] = useState(recetteAEditer?.nom ?? '')
  const saveRecette = useSaveRecette()
  const updateRecette = useUpdateRecette()
  const enregistrement = saveRecette.isPending || updateRecette.isPending

  const onAdd = () => setIngredients((prev) => [...prev, emptyIngredient()])

  // S'il ne reste qu'un ingrédient, la poubelle ne le supprime pas (on garde
  // toujours une ligne) mais réinitialise tous ses champs. Sinon on l'enlève.
  const onRemove = (id) =>
    setIngredients((prev) => prev.length === 1 ? [emptyIngredient()] : prev.filter((i) => i.id !== id))

  // Une saisie manuelle du nom « personnalise » l'ingrédient : il n'est plus
  // considéré comme issu de Ciqual / d'un enregistrement → on peut l'enregistrer.
  const onUpdate = (id, field, value) =>
    setIngredients((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const next = { ...i, [field]: value }
        if (field === 'nom') {
          next.sourceCiqual = false
          next.sourceIngredientId = null
          next.photo = null
        }
        return next
      })
    )

  // Pré-remplit un ingrédient à partir d'un aliment Ciqual (valeurs pour 100g).
  // Marqué « Ciqual » : déjà présent dans la base, inutile de proposer de l'enregistrer.
  const onFillFromCiqual = (id, aliment) =>
    setIngredients((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const next = { ...i, nom: aliment.nom ?? '', sourceCiqual: true, sourceIngredientId: null, photo: null }
        for (const key of NUTRIENT_KEYS) next[key] = aliment[key] ?? ''
        return next
      })
    )

  // Pré-remplit un ingrédient depuis un produit OpenFoodFacts (code-barres).
  // Non marqué « Ciqual » : absent de notre base, on propose donc de l'enregistrer.
  const onFillFromBarcode = (id, produit) =>
    setIngredients((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const next = { ...i, nom: produit.nom ?? '', marque: produit.marque ?? '', sourceCiqual: false, sourceIngredientId: null, photo: produit.photo ?? null }
        for (const key of NUTRIENT_KEYS) next[key] = produit[key] ?? ''
        return next
      })
    )

  // Pré-remplit à partir d'un ingrédient enregistré (mémorise sa provenance).
  const onFillFromIngredient = (id, ing) =>
    setIngredients((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const next = { ...i, nom: ing.nom ?? '', marque: ing.marque ?? '', sourceIngredientId: ing.id ?? null, sourceCiqual: false, photo: ing.photo ?? null }
        for (const key of NUTRIENT_KEYS) next[key] = ing[key] ?? ''
        return next
      })
    )

  // Sélection d'une recette enregistrée comme ingrédient : on calcule son profil
  // pour 100g (depuis sa composition) et on remplit les champs ; l'utilisateur
  // saisit ensuite une quantité en grammes, comme un ingrédient normal.
  const onSelectRecette = (id, recette, per100g) =>
    setIngredients((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const next = { ...i, recetteId: recette?.id ?? null, nom: recette?.nom ?? '' }
        for (const key of NUTRIENT_KEYS) next[key] = per100g?.[key] ?? ''
        return next
      })
    )

  const { rows, total } = computeTotals(ingredients)
  const perPortion = computePerPortion(total, portions)

  // Ingrédients réellement renseignés (nom/recette + quantité) — base de la recette.
  const ingredientsRemplis = ingredients.filter((i) =>
    (i.type === 'recette' ? i.recetteId : (i.nom ?? '').trim()) && i.quantite
  )

  // Clic sur « Enregistrer » : au moins 2 ingrédients, puis connexion si besoin.
  const handleSaveClick = () => {
    if (ingredientsRemplis.length < 2) {
      notifications.show({ color: 'red', message: 'Une recette doit contenir au moins 2 ingrédients renseignés.' })
      return
    }
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/calculateur' } } })
      return
    }
    setModalOpen(true)
  }

  const handleSaveRecette = async () => {
    const composition = ingredientsRemplis.map(cleanForSave)
    const body = { nom: nomRecette.trim(), nombrePersonnes: Number(portions), composition }
    try {
      if (editingId) {
        await updateRecette.mutateAsync({ id: editingId, patch: body })
        notifications.show({ color: 'green', message: 'Recette mise à jour.' })
      } else {
        const created = await saveRecette.mutateAsync(body)
        if (created?.id) setEditingId(created.id)
        notifications.show({ color: 'green', message: 'Recette enregistrée dans votre profil.' })
      }
      setModalOpen(false)
    } catch (err) {
      notifications.show({ color: 'red', message: err.message || "Échec de l'enregistrement." })
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
          <IconChefHat size={30} />
        </ThemeIcon>
        <Title order={1} fz={{ base: 28, sm: 44 }} fw={600} lts="-0.5px">
          {editingId ? `Modifier « ${nomRecette || 'ma recette'} »` : 'Calculer les valeurs nutritionnelles'}
        </Title>
        <Text c="dimmed" size="md" mt={10} maw={620} mx="auto" style={{ lineHeight: 1.6 }}>
          Composez votre recette ingrédient par ingrédient et obtenez aussitôt
          son tableau nutritionnel complet ainsi que la répartition des
          macronutriments, par portion comme pour 100&nbsp;g.
        </Text>
      </Box>

      <SectionHeader title="Composition de la recette" />
      <IngredientBuilder
        ingredients={ingredients}
        portions={portions}
        setPortions={setPortions}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdate={onUpdate}
        onSelectRecette={onSelectRecette}
        onFillFromCiqual={onFillFromCiqual}
        onFillFromBarcode={onFillFromBarcode}
        onFillFromIngredient={onFillFromIngredient}
      />

      {/* Enregistrer la recette — bloc mis en avant, juste après la composition */}
      <Box
        p={{ base: 20, sm: 28 }}
        style={{
          background: 'var(--mantine-color-green-0)',
          borderTop: '1px solid var(--mantine-color-green-2)',
          borderBottom: '1px solid var(--mantine-color-green-2)',
          textAlign: 'center',
        }}
      >
        <Stack gap={12} align="center">
          <Group justify="center" gap="sm">
            <Button
              size="md"
              color="green"
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleSaveClick}
            >
              {editingId ? 'Mettre à jour la recette' : 'Enregistrer cette recette'}
            </Button>
            {editingId && (
              <Button
                size="md"
                variant="default"
                onClick={() => {
                  setEditingId(null)
                  setNomRecette('')
                  navigate('/calculateur', { replace: true, state: null })
                }}
              >
                Nouvelle recette
              </Button>
            )}
          </Group>
          <Text c="dimmed" size="sm" maw={560}>
            Gardez cette recette dans votre profil pour la consulter, la modifier
            plus tard ou la réutiliser comme ingrédient d’une autre recette.
            {!isAuthenticated && ' Une connexion vous sera proposée.'}
          </Text>
        </Stack>
      </Box>

      <SectionHeader title="Tableau nutritionnel" />
      <Box p={{ base: 16, sm: 24 }}>
        <NutritionTable rows={rows} total={total} perPortion={perPortion} />
      </Box>

      <SectionHeader title="Répartition des macronutriments par portion" />
      <Box p={{ base: 16, sm: 24 }}>
        <MacroPieChart perPortion={perPortion} />
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Mettre à jour la recette' : 'Enregistrer la recette'}
        centered
      >
        <Stack>
          <TextInput
            label="Nom de la recette"
            placeholder="ex : Gâteau au yaourt"
            value={nomRecette}
            onChange={(e) => setNomRecette(e.target.value)}
            data-autofocus
            withAsterisk
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button
              color="green"
              loading={enregistrement}
              disabled={!nomRecette.trim()}
              onClick={handleSaveRecette}
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
