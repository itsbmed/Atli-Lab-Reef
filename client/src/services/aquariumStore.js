// ── Lokaler Aquarien-Speicher (Frontend-Stub) ─────────────────────────
// Analog zum Auth-Speicher: Aquarien liegen in localStorage als "lokale
// Datei", bis das Backend steht. Jedes Aquarium gehört einem Nutzer
// (ownerId) und wird nur diesem angezeigt.

const AQUARIUMS_KEY = 'reef-pilot:aquariums'

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

function makeId() {
  return `aq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Standardwerte eines neuen Aquariums (Formular-Grundzustand).
export function emptyAquarium() {
  return {
    name: '', water_type: 'Meerwasser', net_volume: null,
    aquarium_type: '', dimensions: '', target_mode: 'ati',
    stocking_density: '', lighting_type: '', supply_system: '',
    sump: false, refugium: false, skimmer: false, skimmer_model: '',
    notes: '', image_theme: 'reef-mixed',
  }
}

// Alle Aquarien lesen – optional nach Besitzer gefiltert.
export function getAquariums(ownerId) {
  const all = read(AQUARIUMS_KEY, [])
  return ownerId ? all.filter((a) => a.ownerId === ownerId) : all
}

export function getAquarium(id) {
  return read(AQUARIUMS_KEY, []).find((a) => a.id === id) || null
}

export function addAquarium(ownerId, data) {
  const all = read(AQUARIUMS_KEY, [])
  const aquarium = {
    ...emptyAquarium(),
    ...data,
    id: makeId(),
    ownerId,
    createdAt: new Date().toISOString(),
  }
  all.push(aquarium)
  write(AQUARIUMS_KEY, all)
  return aquarium
}

export function updateAquarium(id, patch) {
  const all = read(AQUARIUMS_KEY, [])
  const i = all.findIndex((a) => a.id === id)
  if (i === -1) throw { error: 'Aquarium nicht gefunden' }
  all[i] = { ...all[i], ...patch, id, updatedAt: new Date().toISOString() }
  write(AQUARIUMS_KEY, all)
  return all[i]
}

export function removeAquarium(id) {
  const all = read(AQUARIUMS_KEY, [])
  write(AQUARIUMS_KEY, all.filter((a) => a.id !== id))
}

// Demo-Aquarien für das Vollkonto (demo-full), damit die Liste befüllt ist.
const DEMO_OWNER = 'demo-full'
const DEMO_AQUARIUMS = [
  { name: 'Wohnzimmer Reef', water_type: 'Meerwasser', net_volume: 350, aquarium_type: 'Mischbecken', dimensions: '120×55×55 cm', target_mode: 'ati', stocking_density: 'Mittel', lighting_type: 'LED', supply_system: 'ATI Essentials', sump: true, refugium: true, skimmer: true, skimmer_model: 'ATI PowerCone 250', notes: 'Hauptbecken im Wohnzimmer.', image_theme: 'reef-mixed' },
  { name: 'Nano SPS Cube', water_type: 'Meerwasser', net_volume: 90, aquarium_type: 'SPS', dimensions: '45×45×45 cm', target_mode: 'ati', stocking_density: 'Gering', lighting_type: 'LED', supply_system: 'ION Balancer', sump: false, refugium: false, skimmer: true, skimmer_model: 'ATI Nano', notes: '', image_theme: 'reef-sps' },
]

export function ensureDemoAquariums() {
  const all = read(AQUARIUMS_KEY, [])
  if (all.some((a) => a.ownerId === DEMO_OWNER)) return
  for (const a of DEMO_AQUARIUMS) {
    all.push({ ...emptyAquarium(), ...a, id: makeId(), ownerId: DEMO_OWNER, createdAt: new Date().toISOString() })
  }
  write(AQUARIUMS_KEY, all)
}
