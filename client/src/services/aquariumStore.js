// ── Lokaler Aquarien-Speicher (Frontend-Stub) ─────────────────────────
// Analog zum Auth-Speicher: Aquarien liegen in localStorage als "lokale
// Datei", bis das Backend steht. Jedes Aquarium gehört einem Nutzer
// (ownerId) und wird nur diesem angezeigt.

import { DEFAULT_SCALE_ID } from '@/services/evaluationScales'

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
    notes: '', image_theme: 'reef-mixed', image: null, water_details: {},
    osmosis_source_id: '', evaluation_scale_id: DEFAULT_SCALE_ID,
  }
}

export function supportsOsmosisSource(waterType) {
  return ['Meerwasser', 'Süßwasser', 'Meersalz', 'Aquakultur'].includes(waterType)
}

export function osmosisSources(ownerId) {
  return getAquariums(ownerId).filter((a) => a.water_type === 'Osmosewasser')
}

export function linkedOsmosisSource(aquarium) {
  if (!aquarium?.osmosis_source_id) return null
  return getAquarium(aquarium.osmosis_source_id)
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
  { id: 'demo-aquarium-neu-osmose', name: 'Aquarium Neu · Osmose', water_type: 'Osmosewasser', net_volume: null, notes: 'Osmoseprobe aus dem ATI-Originalbericht 394463.', image_theme: 'osmosis', water_details: { resin_filter: true } },
  { id: 'demo-aquarium-neu', name: 'Aquarium Neu', water_type: 'Meerwasser', net_volume: 1400, aquarium_type: '', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 394463.', image_theme: 'reef-mixed', osmosis_source_id: 'demo-aquarium-neu-osmose' },
  { id: 'demo-grosses-becken-500l', name: 'Grosses Becken 500L', water_type: 'Meerwasser', net_volume: 500, aquarium_type: '', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 394527.', image_theme: 'reef-mixed' },
  { id: 'demo-meerwasser-xxl-osmose', name: 'Meerwasser xxl · Osmose', water_type: 'Osmosewasser', net_volume: null, notes: 'Osmoseprobe aus dem ATI-Originalbericht 394091.', image_theme: 'osmosis', water_details: { resin_filter: true } },
  { id: 'demo-meerwasser-xxl', name: 'Meerwasser xxl', water_type: 'Meerwasser', net_volume: 625, aquarium_type: '', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 394091.', image_theme: 'reef-mixed', osmosis_source_id: 'demo-meerwasser-xxl-osmose' },
  { id: 'demo-meerwasser-55', name: 'Meerwasser55', water_type: 'Meerwasser', net_volume: 574, aquarium_type: '', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 394456.', image_theme: 'reef-mixed' },
  { id: 'demo-wolfis-aquarium-500-osmose', name: 'Wolfis Aquarium 500 · Osmose', water_type: 'Osmosewasser', net_volume: null, notes: 'Osmoseprobe aus dem ATI-Originalbericht 394515.', image_theme: 'osmosis', water_details: { resin_filter: true } },
  { id: 'demo-wolfis-aquarium-500', name: 'Wolfis Aquarium 500', water_type: 'Meerwasser', net_volume: 575, aquarium_type: '', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 394515.', image_theme: 'reef-mixed', osmosis_source_id: 'demo-wolfis-aquarium-500-osmose' },
  { id: 'demo-mias-reef', name: "Mia's Reef", water_type: 'Meerwasser', net_volume: 208, aquarium_type: '', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 392933.', image_theme: 'reef-mixed' },
  { id: 'demo-red-sea-nano-osmose', name: 'Red Sea Nano Test Flawil · Osmose', water_type: 'Osmosewasser', net_volume: null, notes: 'Osmoseprobe aus dem ATI-Originalbericht 393984.', image_theme: 'osmosis', water_details: { resin_filter: true } },
  { id: 'demo-red-sea-nano', name: 'Red Sea Nano Test Flawil', water_type: 'Meerwasser', net_volume: 75, aquarium_type: '', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 393984.', image_theme: 'reef-nano', osmosis_source_id: 'demo-red-sea-nano-osmose' },
  { id: 'demo-nanoriff-osmose', name: 'NanoRiff · Osmose', water_type: 'Osmosewasser', net_volume: null, notes: 'Osmoseprobe aus dem ATI-Originalbericht 394949.', image_theme: 'osmosis', water_details: { resin_filter: true } },
  { id: 'demo-nanoriff', name: 'NanoRiff', water_type: 'Meerwasser', net_volume: 375, aquarium_type: '', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 394949.', image_theme: 'reef-nano', osmosis_source_id: 'demo-nanoriff-osmose' },
  { id: 'demo-nyos-opus-g2-440', name: 'Nyos Opus G2 440 LPS', water_type: 'Meerwasser', net_volume: 378, aquarium_type: 'LPS', target_mode: 'ati', stocking_density: '', supply_system: '', sump: false, refugium: false, skimmer: false, notes: 'Reales Aquarium aus dem ATI-Originalbericht 394770.', image_theme: 'reef-mixed' },
]

const demoAquariumIds = new Set(DEMO_AQUARIUMS.map((a) => a.id).filter(Boolean))

export function ensureDemoAquariums() {
  const before = read(AQUARIUMS_KEY, [])
  // Früher gesäte Beispielbecken aus dem Browser-Speicher entfernen.
  const all = before.filter((item) => item.ownerId !== DEMO_OWNER || demoAquariumIds.has(item.id))
  let changed = all.length !== before.length
  for (const a of DEMO_AQUARIUMS) {
    const exists = all.some((item) => item.ownerId === DEMO_OWNER && (a.id ? item.id === a.id : item.name === a.name))
    if (exists) continue
    all.push({ ...emptyAquarium(), ...a, id: a.id || makeId(), ownerId: DEMO_OWNER, createdAt: new Date().toISOString() })
    changed = true
  }
  if (changed) write(AQUARIUMS_KEY, all)
}
