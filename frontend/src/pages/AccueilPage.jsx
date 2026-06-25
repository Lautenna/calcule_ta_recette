import { Link } from 'react-router-dom'
import {
  Stack, Title, Box, Text, ThemeIcon, Paper, SimpleGrid, Button, Anchor, Flex,
} from '@mantine/core'
import { IconChefHat, IconFlame, IconArrowRight, IconArrowDown } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'

// Accès au compte présenté de façon discrète, sous le texte d'intro.
function ConnexionAccueil() {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated) {
    return (
      <Text size="sm" c="dimmed" mt={20}>
        Connectée en tant que {user.pseudo} ·{' '}
        <Anchor component={Link} to="/profil" c="green">Mon profil</Anchor>
      </Text>
    )
  }

  return (
    <Text size="sm" c="dimmed" mt={20}>
      Déjà un compte ?{' '}
      <Anchor component={Link} to="/login" c="green">Se connecter</Anchor>
      {' · ou '}
      <Anchor component={Link} to="/register" c="green">créer un compte</Anchor>
    </Text>
  )
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

// Une étape de la frise « Comment ça marche ? ».
function Etape({ num, titre, description }) {
  return (
    <Stack gap={8} align="center" style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
      <ThemeIcon size={40} radius="xl" variant="filled" color="green">
        <Text fw={700} fz={16}>{num}</Text>
      </ThemeIcon>
      <Text fw={600}>{titre}</Text>
      <Text c="dimmed" size="sm" style={{ lineHeight: 1.5 }}>
        {description}
      </Text>
    </Stack>
  )
}

// Flèche de liaison entre deux étapes : horizontale sur desktop, vers le bas sur mobile.
function FlecheEtape() {
  return (
    <Box c="green.4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Box hiddenFrom="sm"><IconArrowDown size={26} /></Box>
      <Box visibleFrom="sm" style={{ paddingTop: 20 }}><IconArrowRight size={28} /></Box>
    </Box>
  )
}

function OutilCard({ icon, titre, description, to, cta }) {
  return (
    <Paper withBorder radius="md" p={{ base: 20, sm: 28 }} h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <ThemeIcon size={48} radius="xl" variant="light" color="green" mb={14}>
        {icon}
      </ThemeIcon>
      <Text fz={20} fw={700} mb={6}>{titre}</Text>
      <Text c="dimmed" size="sm" style={{ lineHeight: 1.6, flex: 1 }}>
        {description}
      </Text>
      <Button
        component={Link}
        to={to}
        variant="light"
        color="green"
        rightSection={<IconArrowRight size={16} />}
        mt={18}
        w="fit-content"
      >
        {cta}
      </Button>
    </Paper>
  )
}

export function AccueilPage() {
  return (
    <Stack gap={0} align="stretch">
      <Box
        p={{ base: 24, sm: 48 }}
        style={{
          borderBottom: '3px solid var(--mantine-color-green-4)',
          textAlign: 'center',
          background: 'linear-gradient(180deg, var(--mantine-color-green-0) 0%, transparent 100%)',
        }}
      >
        <Title order={1} fz={{ base: 32, sm: 52 }} fw={600} lts="-0.5px">
          Bienvenue 👋
        </Title>
        <Text c="dimmed" size="lg" mt={12} maw={640} mx="auto" style={{ lineHeight: 1.6 }}>
          Cet outil vous aide à mieux connaître ce que vous mangez. Calculez les
          valeurs nutritionnelles de vos recettes et estimez vos besoins
          énergétiques, simplement, sans rien installer.
        </Text>
        <ConnexionAccueil />
      </Box>

      <SectionHeader title="Comment ça marche ?" />
      <Box p={{ base: 20, sm: 32 }}>
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          align={{ base: 'stretch', sm: 'flex-start' }}
          gap={{ base: 'sm', sm: 'md' }}
          maw={860}
          mx="auto"
        >
          <Etape
            num={1}
            titre="Choisissez un outil"
            description="Le calculateur de recette ou le calcul du métabolisme de base, selon ce que vous cherchez."
          />
          <FlecheEtape />
          <Etape
            num={2}
            titre="Renseignez vos informations"
            description="Vos ingrédients et leurs quantités, ou vos données personnelles."
          />
          <FlecheEtape />
          <Etape
            num={3}
            titre="Obtenez vos résultats"
            description="Les calculs s'affichent instantanément et se mettent à jour à chaque modification."
          />
        </Flex>
      </Box>

      <SectionHeader title="Que pouvez-vous faire ici ?" />
      <Box p={{ base: 16, sm: 32 }}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: 16, sm: 28 }}>
          <OutilCard
            icon={<IconChefHat size={26} />}
            titre="Calculateur de recette"
            to="/calculateur"
            cta="Calculer une recette"
            description="Ajoutez vos ingrédients un par un et renseignez leurs valeurs
              nutritionnelles — à la main ou en piochant directement dans la base
              officielle Ciqual (ANSES). L'outil calcule aussitôt le total de la
              recette, les valeurs par portion et pour 100 g, ainsi que la
              répartition entre lipides, glucides et protéines."
          />
          <OutilCard
            icon={<IconFlame size={26} />}
            titre="Métabolisme de base"
            to="/metabolisme"
            cta="Estimer mon métabolisme"
            description="Le métabolisme de base, c'est l'énergie que votre corps dépense
              au repos pour fonctionner (respirer, faire circuler le sang, maintenir
              sa température…). Indiquez votre sexe, poids, taille et âge : l'outil
              l'estime en kcal par jour avec la formule de Harris & Benedict."
          />
        </SimpleGrid>
      </Box>

      <Box p={{ base: 24, sm: 40 }} style={{ textAlign: 'center' }}>
        <Button
          component={Link}
          to="/calculateur"
          size="lg"
          color="green"
          rightSection={<IconArrowRight size={18} />}
        >
          Commencer maintenant
        </Button>
      </Box>
    </Stack>
  )
}
