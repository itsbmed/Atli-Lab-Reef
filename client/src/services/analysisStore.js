import { getAquarium } from '@/services/aquariumStore'
import { daysAgoDate } from '@/services/dashboardDemo'

const ANALYSES_KEY = 'reef-pilot:analyses'
const DEMO_OWNER = 'demo-full'

export const ANALYSIS_PACKAGES = [
  { key: 'standard', label: 'Standardanalyse', badge: 'STD', desc: 'Basiswerte, Makros & Nährstoffe', params: '24 Parameter' },
  { key: 'pro', label: 'Pro', badge: 'PRO', desc: 'Plus Osmosewasser & erweiterte Kontrolle', params: '36 Parameter' },
  { key: 'ultimate', label: 'Ultimate', badge: 'ULT', desc: 'Maximaler ICP-Umfang für kritische Systeme', params: '40+ Parameter' },
  { key: 'ultimate-ms', label: 'Ultimate-MS', badge: 'MS', desc: 'Meersalz & Osmose inkl. Ultra-Spurenelemente', params: '40+ Parameter' },
]

export const ANALYSIS_REASONS = [
  { key: 'routine', label: 'Routine' },
  { key: 'algen', label: 'Algen' },
  { key: 'cyanos', label: 'Cyanos' },
  { key: 'stn', label: 'STN' },
  { key: 'rtn', label: 'RTN' },
]

export const ANALYSIS_ADDONS = [
  { key: 'sak254', label: 'SAK254', desc: 'Organische Wasserbelastung einschätzen' },
  { key: 'rush', label: 'Expressauswertung', desc: 'Priorisierte Laborbearbeitung' },
  { key: 'advisor', label: 'Fachberater teilen', desc: 'Bericht automatisch an Händler freigeben' },
]

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
  return `an-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function packageLabel(key) {
  return ANALYSIS_PACKAGES.find((p) => p.key === key)?.label || key
}

export function reasonLabel(key) {
  return ANALYSIS_REASONS.find((r) => r.key === key)?.label || key
}

export function getAnalyses(ownerId) {
  const all = read(ANALYSES_KEY, [])
  return (ownerId ? all.filter((a) => a.ownerId === ownerId) : all)
    .map(enrichAnalysis)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function getAnalysis(id) {
  const item = read(ANALYSES_KEY, []).find((a) => a.id === id)
  return item ? enrichAnalysis(item) : null
}

export function activateAnalysis(ownerId, data) {
  const all = read(ANALYSES_KEY, [])
  const aquarium = getAquarium(data.aquariumId)
  const analysis = {
    id: makeId(),
    ownerId,
    aquariumId: data.aquariumId,
    aquariumName: aquarium?.name || 'Aquarium',
    barcode: data.barcode.trim(),
    package: data.package || 'standard',
    reason: data.reason || 'routine',
    addons: data.addons || [],
    osmoseAquariumId: data.osmoseAquariumId || '',
    status: 'registered',
    score: null,
    issueCount: null,
    createdAt: new Date().toISOString(),
  }
  all.push(analysis)
  write(ANALYSES_KEY, all)
  return enrichAnalysis(analysis)
}

function enrichAnalysis(analysis) {
  return {
    ...analysis,
    packageLabel: packageLabel(analysis.package),
    reasonLabel: reasonLabel(analysis.reason),
  }
}

const DEMO_ANALYSES = [
  { id: 'demo-analysis-1', barcode: 'ATI-2402-7781', aquariumName: 'Nano SPS Cube', package: 'pro', reason: 'routine', status: 'completed', score: 71, issueCount: 5, createdAt: daysAgoDate(4) },
  { id: 'demo-analysis-2', barcode: 'ATI-2402-6650', aquariumName: 'Wohnzimmer Reef', package: 'standard', reason: 'routine', status: 'completed', score: 88, issueCount: 2, createdAt: daysAgoDate(11) },
]

export function ensureDemoAnalyses() {
  const all = read(ANALYSES_KEY, [])
  if (all.some((a) => a.ownerId === DEMO_OWNER)) return
  for (const analysis of DEMO_ANALYSES) {
    all.push({
      addons: ['sak254'],
      aquariumId: '',
      osmoseAquariumId: '',
      ...analysis,
      ownerId: DEMO_OWNER,
    })
  }
  write(ANALYSES_KEY, all)
}
