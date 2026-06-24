import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Group, Text, Avatar, Menu, Button, UnstyledButton } from '@mantine/core'
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
      borderBottom: '1px solid var(--mantine-color-default-border)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 48,
      position: 'sticky',
      top: 0,
      background: 'var(--mantine-color-body)',
      zIndex: 100,
    }}>
      <Text ff="monospace" fw={700} fz={12} tt="uppercase" c="green" style={{ letterSpacing: '0.15em' }}>
        Recettes
      </Text>

      <Group gap={2}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding: '5px 12px',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
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
              <UnstyledButton style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar src={user.photoProfil || null} size={28} radius="xl" color="green">
                  {user.pseudo?.charAt(0).toUpperCase()}
                </Avatar>
                <Text fz={13} fw={500}>{user.pseudo}</Text>
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
            size="xs"
            variant="light"
            color="green"
            ml={8}
          >
            Connexion
          </Button>
        )}
      </Group>
    </header>
  )
}
