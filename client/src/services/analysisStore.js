import { getAquarium } from '@/services/aquariumStore'
import { daysAgoDate } from '@/services/dashboardDemo'

const ANALYSES_KEY = 'reef-pilot:analyses'
const FAVORITES_KEY = 'reef-pilot:analysis-favorites'
const DEMO_OWNER = 'demo-full'
const COMPLETED_DEMO_ANALYSIS_IDS = new Set(['demo-analysis-1', 'demo-analysis-2'])

export const ANALYSIS_PACKAGES = [
  { key: 'standard', label: 'Standard Laboranalyse', badge: 'STD', desc: 'Basiswerte, Makros & Nährstoffe', params: '24 Parameter' },
  { key: 'pro', label: 'Pro', badge: 'PRO', desc: 'Plus Osmosewasser & erweiterte Kontrolle', params: '36 Parameter' },
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

export const WORKFLOW_STEPS = [
  { key: 'registered', label: 'Registriert', rank: 1 },
  { key: 'received', label: 'Eingegangen', rank: 2 },
  { key: 'in_analysis', label: 'In Analyse', rank: 3 },
  { key: 'completed', label: 'Fertig', rank: 4 },
]

export const PARAMETER_GROUPS = [
  { key: 'salinity', label: 'Salinität', unit: 'PSU', target: '34.8 - 35.2' },
  { key: 'kh', label: 'KH', unit: 'dKH', target: '7.5 - 8.5' },
  { key: 'calcium', label: 'Calcium', unit: 'mg/l', target: '410 - 440' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg/l', target: '1280 - 1350' },
  { key: 'nitrate', label: 'Nitrat', unit: 'mg/l', target: '2 - 10' },
  { key: 'phosphate', label: 'Phosphat', unit: 'mg/l', target: '0.03 - 0.08' },
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

export function getFavoriteParameters(ownerId) {
  const favorites = read(FAVORITES_KEY, {})
  return favorites[ownerId || 'guest'] || []
}

export function saveFavoriteParameters(ownerId, parameters) {
  const favorites = read(FAVORITES_KEY, {})
  favorites[ownerId || 'guest'] = [...new Set(parameters)]
  write(FAVORITES_KEY, favorites)
  return favorites[ownerId || 'guest']
}

export function packageLabel(key) {
  if (key === 'ultimate') return 'Ultimate-MS'
  return ANALYSIS_PACKAGES.find((p) => p.key === key)?.label || key
}

export function reasonLabel(key) {
  return ANALYSIS_REASONS.find((r) => r.key === key)?.label || key
}

export function statusLabel(status) {
  return WORKFLOW_STEPS.find((step) => step.key === status)?.label || 'Offen'
}

export function severity(analysis) {
  if (analysis.status !== 'completed') return 'open'
  if ((analysis.score ?? 100) < 75 || (analysis.issueCount ?? 0) >= 6) return 'critical'
  if ((analysis.score ?? 100) < 90 || (analysis.issueCount ?? 0) > 0) return 'watch'
  return 'good'
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
  const aquarium = analysis.aquariumId ? getAquarium(analysis.aquariumId) : null
  return {
    ...analysis,
    aquariumName: analysis.aquariumName || aquarium?.name || 'Aquarium',
    waterType: analysis.waterType || aquarium?.water_type || 'Meerwasser',
    packageLabel: packageLabel(analysis.package),
    reasonLabel: reasonLabel(analysis.reason),
    statusLabel: statusLabel(analysis.status),
    severity: severity(analysis),
    reportNumber: analysis.reportNumber || analysis.barcode?.replaceAll('-', ''),
    issueCount: analysis.issueCount ?? analysis.issues?.length ?? 0,
    parameters: (analysis.parameters || []).map((parameter) => ({
      ...parameter,
      history: parameter.history || analysis.parameterHistory?.[parameter.key] || demoParameterHistory(analysis.id, parameter.key),
    })),
    recommendations: analysis.recommendations || [],
  }
}

function demoHistory(values) {
  const ages = [95, 64, 34, 4]
  return values.map((value, index) => ({ date: daysAgoDate(ages[index]), value }))
}

function demoParameterHistory(analysisId, parameterKey) {
  return DEMO_ANALYSES.find((item) => item.id === analysisId)
    ?.parameters?.find((parameter) => parameter.key === parameterKey)?.history || []
}

const DEMO_ANALYSES = [
  {
    id: 'demo-analysis-1',
    barcode: 'ATI-2402-7781',
    reportNumber: 'ICP-7781',
    aquariumName: 'Nano SPS Cube',
    waterType: 'Meerwasser',
    package: 'pro',
    reason: 'routine',
    status: 'completed',
    score: 71,
    createdAt: daysAgoDate(4),
    completedAt: daysAgoDate(3),
    issues: ['Phosphat erhöht', 'Jod niedrig', 'Kalium beobachten', 'Zink erhöht', 'Nitrat niedrig'],
    parameters: [
      { key: 'salinity', label: 'Salinität', value: 35.1, unit: 'PSU', target: '34.8 - 35.2', tone: 'good', history: demoHistory([34.9, 35.3, 35, 35.1]) },
      { key: 'kh', label: 'KH', value: 6.8, unit: 'dKH', target: '7.5 - 8.5', tone: 'watch', history: demoHistory([8.2, 7.9, 7.4, 6.8]) },
      { key: 'calcium', label: 'Calcium', value: 418, unit: 'mg/l', target: '410 - 440', tone: 'good', history: demoHistory([425, 432, 421, 418]) },
      { key: 'magnesium', label: 'Magnesium', value: 1260, unit: 'mg/l', target: '1280 - 1350', tone: 'watch', history: demoHistory([1320, 1305, 1284, 1260]) },
      { key: 'nitrate', label: 'Nitrat', value: 1.2, unit: 'mg/l', target: '2 - 10', tone: 'watch', history: demoHistory([4.8, 3.6, 2.1, 1.2]) },
      { key: 'phosphate', label: 'Phosphat', value: 0.14, unit: 'mg/l', target: '0.03 - 0.08', tone: 'critical', history: demoHistory([0.06, 0.08, 0.11, 0.14]) },
    ],
    recommendations: ['Fütterung und Adsorber-Einsatz prüfen.', 'Jod vorsichtig nachdosieren und in 14 Tagen kontrollieren.', 'KH über mehrere Tage langsam stabilisieren.'],
  },
  {
    id: 'demo-analysis-2',
    barcode: 'ATI-2402-6650',
    reportNumber: 'ICP-6650',
    aquariumName: 'Wohnzimmer Reef',
    waterType: 'Meerwasser',
    package: 'standard',
    reason: 'routine',
    status: 'completed',
    score: 88,
    createdAt: daysAgoDate(11),
    completedAt: daysAgoDate(10),
    issues: ['Strontium leicht niedrig', 'Phosphat beobachten'],
    parameters: [
      { key: 'salinity', label: 'Salinität', value: 35, unit: 'PSU', target: '34.8 - 35.2', tone: 'good', history: demoHistory([35.2, 35.1, 34.9, 35]) },
      { key: 'kh', label: 'KH', value: 8.1, unit: 'dKH', target: '7.5 - 8.5', tone: 'good', history: demoHistory([7.8, 8, 8.2, 8.1]) },
      { key: 'calcium', label: 'Calcium', value: 432, unit: 'mg/l', target: '410 - 440', tone: 'good', history: demoHistory([421, 427, 435, 432]) },
      { key: 'magnesium', label: 'Magnesium', value: 1315, unit: 'mg/l', target: '1280 - 1350', tone: 'good', history: demoHistory([1298, 1310, 1322, 1315]) },
      { key: 'nitrate', label: 'Nitrat', value: 6.4, unit: 'mg/l', target: '2 - 10', tone: 'good', history: demoHistory([7.2, 6.8, 5.9, 6.4]) },
      { key: 'phosphate', label: 'Phosphat', value: 0.09, unit: 'mg/l', target: '0.03 - 0.08', tone: 'watch', history: demoHistory([0.06, 0.07, 0.08, 0.09]) },
    ],
    recommendations: ['Strontium über Versorgungssystem kontrollieren.', 'Phosphat über Fütterung und Filtermedien stabil halten.'],
  },
  { id: 'demo-analysis-3', barcode: 'ATI-2407-1044', reportNumber: 'ICP-1044', aquariumName: 'Wohnzimmer Reef', waterType: 'Meerwasser', package: 'standard', reason: 'routine', status: 'in_analysis', score: null, issueCount: 0, createdAt: daysAgoDate(1), issues: [], recommendations: [] },
  { id: 'demo-analysis-4', barcode: 'ATI-2407-9912', reportNumber: 'ICP-9912', aquariumName: 'Nano SPS Cube', waterType: 'Meerwasser', package: 'ultimate-ms', reason: 'stn', status: 'received', score: null, issueCount: 0, createdAt: daysAgoDate(2), issues: [], recommendations: [] },
]

export function syncDemoAnalysisPlaceholders() {
  const all = read(ANALYSES_KEY, [])
  const retained = all.filter((analysis) => !COMPLETED_DEMO_ANALYSIS_IDS.has(analysis.id))
  const placeholders = DEMO_ANALYSES.filter((analysis) => analysis.status !== 'completed')

  for (const analysis of placeholders) {
    const seededAnalysis = {
      addons: ['sak254'],
      aquariumId: '',
      osmoseAquariumId: '',
      ...analysis,
      ownerId: DEMO_OWNER,
    }
    const existingIndex = retained.findIndex((item) => item.id === analysis.id)
    if (existingIndex === -1) retained.push(seededAnalysis)
    else retained[existingIndex] = seededAnalysis
  }

  write(ANALYSES_KEY, retained)
}
