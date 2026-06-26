// ── Lokaler Test-Speicher (Frontend-Stub) ──────────────────────────────
// Browser dürfen aus Sicherheitsgründen keine echten Dateien schreiben.
// Deshalb nutzen wir localStorage als "lokale Datei": ein persistenter
// Schlüssel-Wert-Speicher pro Website. Das ersetzt vorübergehend die
// Datenbank, bis das Backend steht.
//
// WICHTIG: Passwörter werden hier im Klartext abgelegt — nur zum Testen.
// Im echten Backend werden Passwörter serverseitig gehasht.

const USERS_KEY = 'reef-pilot:users'
const SESSION_KEY = 'reef-pilot:session'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// Öffentliche Sicht auf einen Nutzer (ohne Passwort)
function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    name: u.name || u.username,
    kind: u.kind || 'new', // 'new' = leeres Dashboard, 'full' = mit Daten
  }
}

export function getUsers() {
  return read(USERS_KEY, [])
}

export function registerUser(data) {
  const users = getUsers()
  const taken = users.some(
    (u) => u.username === data.username || u.email === data.email
  )
  if (taken) throw { error: 'Benutzername oder E-Mail ist bereits vergeben.' }

  const user = {
    id: crypto.randomUUID(),
    username: data.username,
    email: data.email,
    password: data.password,
    country: data.country,
    kind: 'new',
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  write(USERS_KEY, users)
  return publicUser(user)
}

export function loginUser({ login, password }) {
  const users = getUsers()
  const user = users.find((u) => u.username === login || u.email === login)
  if (!user || user.password !== password) {
    throw { error: 'Benutzername/E-Mail oder Passwort ist falsch.' }
  }
  return publicUser(user)
}

// ── Session ──
export function saveSession(session) {
  write(SESSION_KEY, session)
}
export function loadSession() {
  return read(SESSION_KEY, null)
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// ── Demo-Konten (zum Testen, wie im Prototyp) ──
// Werden beim App-Start angelegt, falls noch nicht vorhanden.
const DEMO_USERS = [
  { id: 'demo-full', username: 'demo',     email: 'demo@reefpilot.de', password: 'demo123', name: 'Mohamed',      kind: 'full' },
  { id: 'demo-neu',  username: 'neukunde', email: 'neu@reefpilot.de',  password: 'demo123', name: 'Neuer Kunde', kind: 'new' },
]

export function ensureDemoUsers() {
  const users = getUsers()
  let changed = false
  for (const demo of DEMO_USERS) {
    if (!users.some((u) => u.username === demo.username)) {
      users.push({ ...demo, country: 'DE', createdAt: new Date().toISOString() })
      changed = true
    }
  }
  if (changed) write(USERS_KEY, users)
}
