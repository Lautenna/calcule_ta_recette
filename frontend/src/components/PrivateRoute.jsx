import { Navigate, useLocation } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { useAuth } from '../context/AuthContext'

/**
 * Protège une route : redirige vers /login si l'utilisateur n'est pas connecté.
 * Pendant la restauration de session (token présent), affiche un loader.
 */
export function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Center h="60vh">
        <Loader color="green" />
      </Center>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
