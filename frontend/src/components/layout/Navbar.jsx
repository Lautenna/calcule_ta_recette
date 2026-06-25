import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Group, Text, Avatar, Menu, Button, UnstyledButton, ThemeIcon,
  Burger, Drawer, Stack, Divider,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconChefHat } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/accueil', label: 'Accueil' },
  { to: '/calculateur', label: 'Calculateur' },
  { to: '/metabolisme', label: 'Métabolisme de base' },
]

const navLinkStyle = ({ isActive }) => ({
  padding: '9px 18px',
  borderRadius: 8,
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: isActive ? 700 : 500,
  color: isActive ? 'var(--mantine-color-green-7)' : 'var(--mantine-color-dimmed)',
  background: isActive ? 'var(--mantine-color-green-0)' : 'transparent',
})

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [opened, { toggle, close }] = useDisclosure(false)

  const handleLogout = () => {
    close()
    logout()
    navigate('/login')
  }

  return (
    <header style={{
      borderBottom: '3px solid var(--mantine-color-green-4)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 68,
      position: 'sticky',
      top: 0,
      background: 'var(--mantine-color-body)',
      zIndex: 100,
      paddingInline: 'clamp(14px, 4vw, 28px)',
    }}>
      {/* Logo de marque — cliquable, ramène à l'accueil */}
      <UnstyledButton
        component={Link}
        to="/accueil"
        onClick={close}
        style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
      >
        <ThemeIcon size={40} radius="xl" variant="light" color="green" style={{ flexShrink: 0 }}>
          <IconChefHat size={24} />
        </ThemeIcon>
        <Text
          ff="monospace"
          fw={700}
          fz={{ base: 15, sm: 20 }}
          tt="uppercase"
          c="green.7"
          truncate
          style={{ letterSpacing: '0.12em' }}
        >
          Calculateur recette
        </Text>
      </UnstyledButton>

      {/* Navigation desktop — masquée sous le breakpoint md (la nav inline a besoin d'~900px+) */}
      <Group gap={6} visibleFrom="md">
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to} style={navLinkStyle}>
            {label}
          </NavLink>
        ))}

        {isAuthenticated ? (
          <Menu shadow="md" width={180} position="bottom-end">
            <Menu.Target>
              <UnstyledButton style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar src={user.photoProfil || null} size={36} radius="xl" color="green">
                  {user.pseudo?.charAt(0).toUpperCase()}
                </Avatar>
                <Text fz={15} fw={600}>{user.pseudo}</Text>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item component={Link} to="/profil">Mon profil</Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" onClick={handleLogout}>Se déconnecter</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Button component={Link} to="/login" size="sm" variant="light" color="green" ml={12}>
            Connexion
          </Button>
        )}
      </Group>

      {/* Bouton burger mobile/tablette — masqué à partir du breakpoint md */}
      <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" aria-label="Ouvrir le menu" />

      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="75%"
        padding="lg"
        hiddenFrom="md"
        title={
          isAuthenticated ? (
            <Group gap={10}>
              <Avatar src={user.photoProfil || null} size={32} radius="xl" color="green">
                {user.pseudo?.charAt(0).toUpperCase()}
              </Avatar>
              <Text fw={600}>{user.pseudo}</Text>
            </Group>
          ) : (
            <Text fw={600} ff="monospace" tt="uppercase" c="green.7" fz={14} style={{ letterSpacing: '0.1em' }}>
              Menu
            </Text>
          )
        }
      >
        <Stack gap={4}>
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={close} style={navLinkStyle}>
              {label}
            </NavLink>
          ))}

          <Divider my="sm" />

          {isAuthenticated ? (
            <>
              <NavLink to="/profil" onClick={close} style={navLinkStyle}>
                Mon profil
              </NavLink>
              <Button variant="light" color="red" onClick={handleLogout} mt="xs">
                Se déconnecter
              </Button>
            </>
          ) : (
            <Button component={Link} to="/login" onClick={close} variant="light" color="green">
              Connexion
            </Button>
          )}
        </Stack>
      </Drawer>
    </header>
  )
}
