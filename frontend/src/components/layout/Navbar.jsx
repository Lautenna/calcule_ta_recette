import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Group, Text, Avatar, Menu, Button, UnstyledButton, ThemeIcon } from '@mantine/core'
import { IconChefHat } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/accueil', label: 'Accueil' },
  { to: '/calculateur', label: 'Calculateur' },
  { to: '/metabolisme', label: 'Métabolisme de base' },
]

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header style={{
      borderBottom: '3px solid var(--mantine-color-green-4)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 68,
      position: 'sticky',
      top: 0,
      background: 'var(--mantine-color-body)',
      zIndex: 100,
    }}>
      {/* Logo de marque — cliquable, ramène à l'accueil */}
      <UnstyledButton
        component={Link}
        to="/accueil"
        style={{ display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <ThemeIcon size={40} radius="xl" variant="light" color="green">
          <IconChefHat size={24} />
        </ThemeIcon>
        <Text ff="monospace" fw={700} fz={20} tt="uppercase" c="green.7" style={{ letterSpacing: '0.12em' }}>
          Calculateur recette
        </Text>
      </UnstyledButton>

      <Group gap={6}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding: '9px 18px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: isActive ? 700 : 500,
              color: isActive
                ? 'var(--mantine-color-green-7)'
                : 'var(--mantine-color-dimmed)',
              background: isActive ? 'var(--mantine-color-green-0)' : 'transparent',
            })}
          >
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
          <Button
            component={Link}
            to="/login"
            size="sm"
            variant="light"
            color="green"
            ml={12}
          >
            Connexion
          </Button>
        )}
      </Group>
    </header>
  )
}
