import { NavLink } from 'react-router-dom'
import { Group, Text } from '@mantine/core'

const links = [
  { to: '/accueil', label: 'Accueil' },
  { to: '/calculateur', label: 'Calculateur' },
  { to: '/metabolisme', label: 'Métabolisme de base' },
  { to: '/profil', label: 'Profil' },
]

export function Navbar() {
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
      </Group>
    </header>
  )
}
