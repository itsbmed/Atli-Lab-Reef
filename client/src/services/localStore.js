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
    role: u.role || 'endnutzer',
    kind: u.kind || 'new', // 'new' = leeres Dashboard, 'full' = mit Daten
    country: u.country || 'DE',
    language: u.language || 'de',
    newsletter: !!u.newsletter,
    analysis_reminder: u.analysis_reminder !== false,
    reminder_interval_days: u.reminder_interval_days || 90,
    advisor_id: u.advisor_id || null,
    password_updated_at: u.password_updated_at || null,
    createdAt: u.createdAt || null,
    lastLoginAt: u.last_login_at || null,
    permissionsUpdatedAt: u.permissions_updated_at || null,
  }
}

export function getUsers() {
  return read(USERS_KEY, [])
}

export function getPublicUsers() {
  return getUsers().map(publicUser)
}

export function registerUser(data) {
  const users = getUsers()
  const uname = (data.username || '').trim().toLowerCase()
  const email = (data.email || '').trim().toLowerCase()
  const taken = users.some(
    (u) => u.username?.toLowerCase() === uname || u.email?.toLowerCase() === email
  )
  if (taken) throw { error: 'Benutzername oder E-Mail ist bereits vergeben.' }

  const user = {
    id: crypto.randomUUID(),
    username: data.username,
    email: data.email,
    password: data.password,
    country: data.country,
    role: 'endnutzer',
    kind: 'new',
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  write(USERS_KEY, users)
  return publicUser(user)
}

export function loginUser({ login, password }) {
  const users = getUsers()
  // Benutzername/E-Mail case-insensitiv vergleichen (Passwort bleibt exakt).
  const needle = (login || '').trim().toLowerCase()
  const user = users.find(
    (u) => u.username?.toLowerCase() === needle || u.email?.toLowerCase() === needle
  )
  if (!user || user.password !== password) {
    throw { error: 'Benutzername/E-Mail oder Passwort ist falsch.' }
  }
  user.last_login_at = new Date().toISOString()
  write(USERS_KEY, users)
  return publicUser(user)
}

export function updateUserRole(actorId, userId, role) {
  const allowedRoles = ['endnutzer', 'subadmin', 'admin']
  if (!allowedRoles.includes(role)) throw { error: 'Diese Rolle ist nicht zulässig.' }

  const users = getUsers()
  const actor = users.find((user) => user.id === actorId)
  const target = users.find((user) => user.id === userId)
  if (!actor || actor.role !== 'admin') throw { error: 'Nur Administratoren dürfen Rollen ändern.' }
  if (!target) throw { error: 'Konto wurde nicht gefunden.' }
  if (actorId === userId) throw { error: 'Die eigene Rolle kann nicht geändert werden.' }
  if (target.role === 'admin' && role !== 'admin' && users.filter((user) => user.role === 'admin').length <= 1) {
    throw { error: 'Der letzte Administrator kann nicht herabgestuft werden.' }
  }

  target.role = role
  target.permissions_updated_at = new Date().toISOString()
  write(USERS_KEY, users)
  return publicUser(target)
}

export function updateUserProfile(userId, data) {
  const users = getUsers()
  const user = users.find((u) => u.id === userId)
  if (!user) throw { error: 'Konto wurde nicht gefunden.' }

  const username = (data.username || '').trim()
  const email = (data.email || '').trim().toLowerCase()
  if (!username) throw { error: 'Bitte geben Sie einen Nutzernamen an.' }
  if (!email) throw { error: 'Bitte geben Sie eine E-Mail-Adresse an.' }

  const taken = users.some((u) =>
    u.id !== userId &&
    (u.username?.toLowerCase() === username.toLowerCase() || u.email?.toLowerCase() === email)
  )
  if (taken) throw { error: 'Benutzername oder E-Mail ist bereits vergeben.' }

  Object.assign(user, {
    username,
    email,
    name: (data.name || username).trim(),
    country: data.country || 'DE',
    language: data.language || 'de',
    newsletter: !!data.newsletter,
    analysis_reminder: !!data.analysis_reminder,
    reminder_interval_days: data.reminder_interval_days || 90,
    advisor_id: data.advisor_id || null,
  })
  write(USERS_KEY, users)
  return publicUser(user)
}

export function updateUserPassword(userId, data) {
  const users = getUsers()
  const user = users.find((u) => u.id === userId)
  if (!user) throw { error: 'Konto wurde nicht gefunden.' }
  if (user.password !== data.current_password) throw { error: 'Aktuelles Passwort ist falsch.' }
  if ((data.new_password || '').length < 8) throw { error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' }
  if (data.new_password !== data.confirm_password) throw { error: 'Die neuen Passwörter stimmen nicht überein.' }

  user.password = data.new_password
  user.password_updated_at = new Date().toISOString()
  write(USERS_KEY, users)
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


// Werden beim App-Start angelegt bzw. mit dieser Definition abgeglichen.
//  · demo     → Neukunde  (leeres Einrichtungs-Dashboard)
//  · kunde    → Bestandskunde (volles Dashboard mit Demo-Aquarien)
const DEMO_USERS = [
  { id: 'demo-full', username: 'kunde',    email: 'kunde@reefpilot.de', password: 'demo123', name: 'Mohamed',        role: 'endnutzer', kind: 'full' },
  { id: 'demo-new',  username: 'demo',     email: 'demo@reefpilot.de',  password: 'demo123', name: 'Neuer Kunde',    role: 'endnutzer', kind: 'new' },
  { id: 'demo-neu',  username: 'neukunde', email: 'neu@reefpilot.de',   password: 'demo123', name: 'Neuer Kunde',    role: 'endnutzer', kind: 'new' },
  { id: 'demo-admin', username: 'admin',    email: 'admin@reefpilot.de', password: 'demo123', name: 'ATI Admin',      role: 'admin',     kind: 'full' },
  { id: 'demo-sub', username: 'subadmin',   email: 'sub@reefpilot.de',   password: 'demo123', name: 'ATI Redaktion',  role: 'subadmin',  kind: 'full' },
]

export function ensureDemoUsers() {
  const users = getUsers()
  let changed = false
  for (const demo of DEMO_USERS) {
    const existing = users.find((u) => u.username === demo.username)
    if (!existing) {
      users.push({ ...demo, country: 'DE', createdAt: new Date().toISOString() })
      changed = true
    } else if (existing.kind !== demo.kind || existing.id !== demo.id || (existing.role !== demo.role && !existing.permissions_updated_at)) {
      // Bestehendes Demo-Konto an die aktuelle Definition angleichen.
      Object.assign(existing, { id: demo.id, kind: demo.kind, name: demo.name, email: demo.email })
      if (!existing.permissions_updated_at) existing.role = demo.role
      changed = true
    }
  }
  if (changed) write(USERS_KEY, users)

  // Aktive Session eines angepassten Demo-Kontos aktualisieren (z. B. demo war „full").
  const session = loadSession()
  const def = session?.user?.username && DEMO_USERS.find((d) => d.username === session.user.username)
  const storedSessionUser = def && getUsers().find((user) => user.username === def.username)
  if (storedSessionUser && (session.user.kind !== storedSessionUser.kind || session.user.id !== storedSessionUser.id || session.user.role !== storedSessionUser.role)) {
    session.user = publicUser(storedSessionUser)
    session.token = `local-${storedSessionUser.id}`
    saveSession(session)
  }
}
