// Zentraler Service-Layer. Die UI spricht ausschließlich über diese Datei
// mit dem Backend — so bleibt die Oberfläche backend-agnostisch.

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Login über das Laravel-Backend statt über den lokalen Test-Speicher.
export const useBackendAuth = import.meta.env.VITE_AUTH_BACKEND === 'true'

// Bearer-Token der aktuellen Session (setzt der Auth-Store).
let authToken = null
export function setAuthToken(token) {
  authToken = token || null
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw { status: res.status, ...body }
  }
  return res.status === 204 ? null : res.json()
}

export const authApi = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  updatePassword: (payload) => request('/auth/password', { method: 'PUT', body: JSON.stringify(payload) }),
}

// Das Backend führt verknüpfte Profile allgemein als links: { <typ>: <id> }.
// Die Oberfläche arbeitet weiter mit den flachen Feldern (z. B. osmosis_source_id).
const AQUARIUM_LINK_FIELDS = { osmosis_source: 'osmosis_source_id' }

function aquariumFromApi(aquarium) {
  const links = aquarium.links || {}
  const flat = Object.fromEntries(Object.entries(AQUARIUM_LINK_FIELDS).map(([type, field]) => [field, links[type] || '']))
  return { ...aquarium, ...flat }
}

function aquariumToApi(data) {
  const payload = { ...data }
  const links = {}
  for (const [type, field] of Object.entries(AQUARIUM_LINK_FIELDS)) {
    if (field in payload) links[type] = payload[field] || null
    delete payload[field]
  }
  delete payload.links
  if (Object.keys(links).length) payload.links = links
  return payload
}

export const aquariumApi = {
  list: () => request('/aquariums').then(({ aquariums }) => aquariums.map(aquariumFromApi)),
  create: (data) => request('/aquariums', { method: 'POST', body: JSON.stringify(aquariumToApi(data)) })
    .then(({ aquarium }) => aquariumFromApi(aquarium)),
  update: (id, data) => request(`/aquariums/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(aquariumToApi(data)) })
    .then(({ aquarium }) => aquariumFromApi(aquarium)),
  remove: (id) => request(`/aquariums/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
