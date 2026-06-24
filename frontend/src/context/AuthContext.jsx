import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiFetch, apiUpload, getToken, setToken, clearToken, ApiError } from '../api/client'

const AuthContext = createContext(null)

/**
 * Connexion bas niveau : le firewall json_login attend du `application/json`
 * pur (pas de JSON-LD), donc on fait un fetch dédié.
 */
async function requestToken(email, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(body?.message || 'Identifiants invalides.', { status: res.status })
  }
  return body.token
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // `loading` couvre la restauration de session au démarrage (token déjà présent).
  const [loading, setLoading] = useState(Boolean(getToken()))

  const fetchMe = useCallback(async () => {
    const me = await apiFetch('/me')
    setUser(me)
    return me
  }, [])

  // Au montage : si un token est stocké, on tente de restaurer la session.
  useEffect(() => {
    if (!getToken()) return
    fetchMe()
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [fetchMe])

  const login = useCallback(async (email, password) => {
    const token = await requestToken(email, password)
    setToken(token)
    return fetchMe()
  }, [fetchMe])

  const register = useCallback(async ({ email, pseudo, plainPassword, codeInvitation }) => {
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({ email, pseudo, plainPassword, codeInvitation }),
    })
    // Connexion automatique dans la foulée.
    return login(email, plainPassword)
  }, [login])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const uploadPhoto = useCallback(async (file) => {
    if (!user) return
    const formData = new FormData()
    formData.append('photo', file)
    await apiUpload(`/users/${user.id}/photo`, formData)
    return fetchMe()
  }, [user, fetchMe])

  const updateProfile = useCallback(async (patch) => {
    if (!user) return
    const updated = await apiFetch(`/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(patch),
    })
    setUser(updated)
    return updated
  }, [user])

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    uploadPhoto,
    updateProfile,
    refreshUser: fetchMe,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
