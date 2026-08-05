import { getAquarium } from '@/services/aquariumStore'
import { daysAgoDate } from '@/services/dashboardDemo'
import { createDemoAnalysis } from '@/services/analysisCatalog'
import { loadAnalysisContent } from '@/services/analysisContent'
import { evaluateRecommendationRules } from '@/services/recommendationRules'

const ANALYSES_KEY = 'reef-pilot:analyses'
const FAVORITES_KEY = 'reef-pilot:analysis-favorites'
const DEMO_OWNER = 'demo-full'
export const APPROVED_COMPLETED_ANALYSIS_IDS = Object.freeze(['demo-analysis-1', 'demo-analysis-2', 'demo-analysis-5'])
const approvedCompletedAnalysisIds = new Set(APPROVED_COMPLETED_ANALYSIS_IDS)

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
  if (['good', 'watch', 'critical'].includes(analysis.resultLevel)) return analysis.resultLevel
  if ((analysis.score ?? 100) < 75 || (analysis.issueCount ?? 0) >= 6) return 'critical'
  if ((analysis.score ?? 100) < 90 || (analysis.issueCount ?? 0) > 0) return 'watch'
  return 'good'
}

export function getAnalyses(ownerId) {
  if (!ownerId) return []
  const all = read(ANALYSES_KEY, [])
  return all.filter((a) => a.ownerId === ownerId)
    .map(enrichAnalysis)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function getAllAnalysisRecords() {
  return read(ANALYSES_KEY, [])
}

export function getAnalysis(id, ownerId) {
  if (!ownerId) return null
  const item = read(ANALYSES_KEY, []).find((a) => a.id === id && a.ownerId === ownerId)
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
  const configuredContent = loadAnalysisContent()
  const waterType = analysis.waterType || aquarium?.water_type || 'Meerwasser'
  const parameters = (analysis.parameters || []).map((parameter) => ({
    ...parameter,
    unit: configuredContent[parameter.key]?.unit || parameter.unit,
    target: configuredContent[parameter.key]
      ? `${configuredContent[parameter.key].targetMin} - ${configuredContent[parameter.key].targetMax}`
      : parameter.target,
    referenceRange: configuredContent[parameter.key]
      ? {
          ...(parameter.referenceRange || {}),
          min: configuredContent[parameter.key].targetMin,
          max: configuredContent[parameter.key].targetMax,
          unit: configuredContent[parameter.key].unit,
        }
      : parameter.referenceRange,
    history: parameter.history || analysis.parameterHistory?.[parameter.key] || demoParameterHistory(analysis.id, parameter.key),
  }))
  const usesRecommendationRules = analysis.status === 'completed'
  const recommendationGroups = usesRecommendationRules
    ? evaluateRecommendationRules({ ...analysis, waterType, parameters })
    : (analysis.recommendationGroups || [])

  return {
    ...analysis,
    aquariumName: analysis.aquariumName || aquarium?.name || 'Aquarium',
    waterType,
    packageLabel: packageLabel(analysis.package),
    reasonLabel: reasonLabel(analysis.reason),
    statusLabel: statusLabel(analysis.status),
    severity: severity(analysis),
    reportNumber: analysis.reportNumber || analysis.barcode?.replaceAll('-', ''),
    issueCount: analysis.issueCount ?? analysis.issues?.length ?? 0,
    parameters,
    recommendationEngineApplied: usesRecommendationRules,
    recommendations: usesRecommendationRules ? recommendationGroups.map((item) => item.summary) : (analysis.recommendations || []),
    recommendationGroups,
  }
}

function demoParameterHistory(analysisId, parameterKey) {
  return DEMO_ANALYSES.find((item) => item.id === analysisId)
    ?.parameters?.find((parameter) => parameter.key === parameterKey)?.history || []
}

const DEMO_ANALYSES = [
  createDemoAnalysis('demo-analysis-1', 'good'),
  createDemoAnalysis('demo-analysis-2', 'medium'),
  createDemoAnalysis('demo-analysis-5', 'bad'),
  { id: 'demo-analysis-3', barcode: 'ATI-2407-1044', reportNumber: 'ICP-1044', aquariumName: 'Wohnzimmer Reef', waterType: 'Meerwasser', package: 'standard', reason: 'routine', status: 'in_analysis', score: null, issueCount: 0, createdAt: daysAgoDate(1), issues: [], recommendations: [] },
  { id: 'demo-analysis-4', barcode: 'ATI-2407-9912', reportNumber: 'ICP-9912', aquariumName: 'Nano SPS Cube', waterType: 'Meerwasser', package: 'ultimate-ms', reason: 'stn', status: 'received', score: null, issueCount: 0, createdAt: daysAgoDate(2), issues: [], recommendations: [] },
]

export function syncDemoAnalyses(ownerId) {
  if (ownerId !== DEMO_OWNER) return
  const retained = read(ANALYSES_KEY, [])
  const liveExamples = DEMO_ANALYSES.filter((analysis) =>
    analysis.status !== 'completed' || approvedCompletedAnalysisIds.has(analysis.id)
  )

  for (const analysis of liveExamples) {
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
