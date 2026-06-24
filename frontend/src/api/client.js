const TOKEN_KEY = 'auth_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Erreur API enrichie : conserve le code HTTP et les violations de validation
 * éventuelles (renvoyées par API Platform au format `violations`).
 */
export class ApiError extends Error {
  constructor(message, { status, violations } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.violations = violations
  }
}

async function buildError(res) {
  let body
  try {
    body = await res.json()
  } catch {
    body = null
  }

  const message =
    body?.['hydra:description'] ||
    body?.detail ||
    body?.description ||
    body?.message ||
    `${res.status} ${res.statusText}`

  return new ApiError(message, {
    status: res.status,
    violations: body?.violations,
  })
}

export async function apiFetch(path, init = {}) {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Accept': 'application/ld+json',
      'Content-Type': 'application/ld+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  // Token expiré ou invalide : on purge la session locale.
  if (res.status === 401) {
    clearToken()
  }

  if (!res.ok) throw await buildError(res)

  // 204 No Content (ex: DELETE) : pas de corps à parser.
  if (res.status === 204) return null
  return res.json()
}

/**
 * Upload multipart (photo de profil). On ne fixe pas `Content-Type` :
 * le navigateur ajoute lui-même la frontière multipart.
 */
export async function apiUpload(path, formData) {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (res.status === 401) clearToken()
  if (!res.ok) throw await buildError(res)
  return res.json()
}
