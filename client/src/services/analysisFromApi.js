import { ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'
import { labParameter } from './atiLabReports.js'

// Übersetzt Analysen aus dem Backend (GET /api/analyses?include=details) in die Form,
// die analysisStore.js und der Bericht für die ATI-Originalberichte verwenden. Die
// Laborbewertung kommt als Stufe 1–9 (5 = optimal) und bleibt erhalten
// (preserveSourceEvaluation); Empfehlungen berechnet weiter das Regelwerk im Frontend.

// Stufe => [Ton, Richtung] wie in den ATI-Originalberichten
const BAND_EVALUATION = Object.freeze({
  1: ['critical', 'low'],
  2: ['critical', 'low'],
  3: ['watch', 'low'],
  4: ['watch', 'low'],
  5: ['good', 'in_range'],
  6: ['watch', 'high'],
  7: ['watch', 'high'],
  8: ['critical', 'high'],
  9: ['critical', 'high'],
})

const OSMOSIS_METHOD = 'osmose'

// Elemente, die der Frontend-Katalog (noch) nicht kennt – etwa Kennzahlen wie Na/Cl, die das
// Frontend selbst berechnet, oder reine ICP-MS-Elemente – werden ausgelassen.
export function parameterFromApi(item, waterType = 'Meerwasser') {
  if (!ELEMENT_DEFINITION_MAP[item.key]) return null
  const [tone, direction] = (item.isEvaluated && BAND_EVALUATION[item.band]) || ['good', 'in_range']
  const parameter = labParameter({ key: item.key, measured: item.value ?? null, ideal: item.target ?? null, tone, direction })

  return {
    ...parameter,
    target: item.target === null || item.target === undefined ? '' : String(item.target),
    precision: item.precision ?? parameter.precision,
    referenceRange: {
      ...parameter.referenceRange,
      min: item.min ?? parameter.referenceRange.min,
      max: item.max ?? parameter.referenceRange.max,
      waterType,
      provisional: false,
    },
    band: item.band ?? null,
    isEvaluated: item.isEvaluated !== false,
    sourceStatusLabel: item.isEvaluated === false ? 'Nicht bewertet' : parameter.sourceStatusLabel,
    dosings: item.dosings || [],
  }
}

function issueText(parameter) {
  if (parameter.tone === 'critical') return `${parameter.label} kritisch ${parameter.sourceDirection === 'low' ? 'niedrig' : 'hoch'}`
  return `${parameter.label} ${parameter.sourceDirection === 'low' ? 'unter' : 'über'} Soll`
}

// Hinweise wie in den ATI-Originalberichten: je auffälligem Wert einer, Osmose zusammengefasst.
export function issuesFor(parameters = [], osmosisParameters = []) {
  const issues = parameters.filter((parameter) => parameter.tone !== 'good').map(issueText)
  const osmosis = osmosisParameters.filter((parameter) => parameter.tone !== 'good').map((parameter) => parameter.label)
  if (osmosis.length) issues.push(`Osmosewasser: ${osmosis.join(', ')} auffällig`)
  return issues
}

function resultLevel(parameters, osmosisParameters) {
  const all = [...parameters, ...osmosisParameters]
  if (all.some((parameter) => parameter.tone === 'critical')) return 'critical'
  if (all.some((parameter) => parameter.tone === 'watch')) return 'watch'
  return 'good'
}

export function analysisFromApi(analysis) {
  const waterType = analysis.waterType || 'Meerwasser'
  const hasDetails = Array.isArray(analysis.parameters)
  const parameters = (analysis.parameters || []).map((item) => parameterFromApi(item, waterType)).filter(Boolean)
  const osmosisSample = (analysis.samples || []).find((sample) => sample.method === OSMOSIS_METHOD)
  const osmosisParameters = (osmosisSample?.parameters || []).map((item) => parameterFromApi(item, 'Osmosewasser')).filter(Boolean)
  const completed = analysis.status === 'completed'
  const issues = completed ? issuesFor(parameters, osmosisParameters) : []

  return {
    id: analysis.id,
    ownerId: analysis.ownerId,
    aquariumId: analysis.aquariumId || '',
    aquariumName: analysis.aquariumName,
    osmoseAquariumId: analysis.osmoseAquariumId || '',
    barcode: analysis.barcode || '',
    reportNumber: analysis.reportNumber,
    package: analysis.package || '',
    method: analysis.method || '',
    methodName: analysis.methodName?.de || '',
    isFree: Boolean(analysis.isFree),
    waterType,
    reason: analysis.reason || '',
    addons: analysis.addons || [],
    status: analysis.status,
    score: analysis.score ?? null,
    issueCount: hasDetails ? issues.length : (analysis.issueCount ?? null),
    issues,
    resultLevel: completed && hasDetails ? resultLevel(parameters, osmosisParameters) : undefined,
    groupScores: analysis.groupScores || {},
    comment: analysis.comment || '',
    labAdvice: analysis.labAdvice || '',
    evaluationScaleId: analysis.evaluationScaleId || '',
    createdAt: analysis.createdAt,
    receivedAt: analysis.receivedAt,
    completedAt: analysis.completedAt,
    sourceType: 'ati-lab-api',
    preserveSourceEvaluation: true,
    lab: { provider: 'ATI Aquaristik', method: analysis.methodName?.de || '', processed: completed },
    parameters,
    osmosisParameters,
  }
}

// Eingaben aus ActivateView.vue für POST /api/analyses
export function activationToApi(data) {
  return {
    barcode: data.barcode,
    aquarium_id: data.aquariumId,
    reason: data.reason || null,
    addons: data.addons || [],
    osmosis_aquarium_id: data.osmoseAquariumId || null,
    comment: data.comment || null,
  }
}
