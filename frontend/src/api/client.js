export async function apiFetch(path, init = {}) {
  const res = await fetch(`/api${path}`, {
    headers: {
      'Accept': 'application/ld+json',
      'Content-Type': 'application/ld+json',
      ...init.headers,
    },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}
