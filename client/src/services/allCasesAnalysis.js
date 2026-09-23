import { ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'
import { BUILT_IN_SCALE_MAP, SCORE_BAND_MAP, scoreValue } from './evaluationScales.js'

export const ALL_CASES_ANALYSIS_ID = 'demo-analysis-all-cases'
export const ALL_CASES_AQUARIUM_ID = 'demo-all-cases-system'

const scale = BUILT_IN_SCALE_MAP['ati-standard']

// One value per band so the report exercises every recommendation at once:
// score 9 and 8 trigger the water change, 6 and 7 the supply reduction,
// nutrients cover both directions, pollutants the source hunt, and the low
// trace elements feed the dosing course.
const RESULT_ROWS = [
  ['salinity', 35],
  ['kh', 8],
  ['fluoride', 1.3],

  ['calcium', 700],
  ['magnesium', 1900],
  ['boron', 5.4],
  ['bromine', 78],
  ['potassium', 400],
  ['chloride', 19200],
  ['sodium', 10800],
  ['sulfur', 900],
  ['strontium', 8],

  ['nitrate', 15],
  ['phosphate', 0.055],
  ['phosphorus', 6],
  ['silicon', 270],

  ['iron', 0.1],
  ['manganese', 0.05],
  ['iodine', 65],
  ['cobalt', 0.12],
  ['chromium', 0.3],
  ['copper', 1.5],
  ['lithium', 185],
  ['molybdenum', 11],
  ['nickel', 2],
  ['selenium', 1],
  ['vanadium', 2],
  ['zinc', 2.5],

  ['aluminium', 45],
  ['lanthanum', 0.6],
  ['lead', 1.4],
  ['silver', 0],
  ['arsenic', 0.5],
  ['barium', 8],
  ['beryllium', 0],
  ['bismuth', 0],
  ['cadmium', 0],
  ['mercury', 0],
  ['antimony', 0],
  ['tin', 0],
  ['titanium', 0],
  ['thallium', 0],
  ['tungsten', 0],
]

function buildParameter([key, value]) {
  const definition = ELEMENT_DEFINITION_MAP[key]
  if (!definition) throw new Error(`Unknown element in all-cases analysis: ${key}`)
  const thresholds = scale.thresholds[key]
  const band = SCORE_BAND_MAP[scoreValue(value, thresholds)]
  return {
    key,
    label: definition.label,
    symbol: definition.symbol,
    groupKey: definition.groupKey,
    group: definition.group,
    source: definition.source,
    value,
    unit: definition.unit,
    target: `${thresholds.min}–${thresholds.max}`,
    referenceRange: { min: thresholds.min, max: thresholds.max, waterType: 'Meerwasser' },
    precision: definition.precision,
    tone: band.tone,
    resultStatus: 'valid',
    calibrationStatus: 'InRange',
    history: [],
  }
}

export const ALL_CASES_PARAMETERS = Object.freeze(RESULT_ROWS.map(buildParameter))

export function createAllCasesAnalysis() {
  const parameters = ALL_CASES_PARAMETERS.map((parameter) => ({ ...parameter }))
  const issues = parameters.filter((parameter) => parameter.tone !== 'good').map((parameter) => `${parameter.label} ${parameter.value} ${parameter.unit}`)
  return {
    id: ALL_CASES_ANALYSIS_ID,
    scenario: 'all-cases',
    barcode: 'ATI-DEMO-ALLCASES',
    reportNumber: 'ICP-ALLCASES',
    aquariumName: 'Referenzbecken Alle Fälle',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 62,
    resultLevel: 'critical',
    issueCount: issues.length,
    issues,
    createdAt: '2026-09-18T09:00:00+02:00',
    receivedAt: '2026-09-20T09:00:00+02:00',
    completedAt: '2026-09-22T09:00:00+02:00',
    aquariumId: ALL_CASES_AQUARIUM_ID,
    sample: { voucherCode: 'ATI-DEMO-ALLCASES', type: 'Meerwasser', comment: 'Testbericht für alle Empfehlungsfälle' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Demodaten', processed: true },
    parameters,
    recommendations: [],
    recommendationGroups: [],
  }
}
