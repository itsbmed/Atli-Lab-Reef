import { daysAgoDate } from '@/services/dashboardDemo'

export const ANALYSIS_GROUPS = Object.freeze([
  { key: 'basis', label: 'Basiswerte', color: '#1686d9', description: 'Grundlage für Härte, Dichte und die chemische Stabilität.' },
  { key: 'quantity', label: 'Mengenelemente', color: '#6b9f36', description: 'Hauptbestandteile des Wassers und Basis für Wachstum und Ionengleichgewicht.' },
  { key: 'nutrients', label: 'Nährstoffe', color: '#f59e0b', description: 'Stickstoff-, Phosphor- und Siliziumwerte für die biologische Versorgung.' },
  { key: 'trace', label: 'Spurenelemente', color: '#0f9f8f', description: 'Niedrig konzentrierte Elemente für Enzyme, Farbe und Stoffwechsel.' },
  { key: 'pollutants', label: 'Unerwünschte Elemente', color: '#d45f72', description: 'Metalle und Begleitelemente, deren Eintrag besonders beobachtet wird.' },
])

const groupLabels = Object.fromEntries(ANALYSIS_GROUPS.map((group) => [group.key, group.label]))
const seawaterOnlySymbols = new Set(['PSU', 'Bi', 'Hg', 'I', 'Sb', 'Se', 'Tl', 'W'])

function element(key, label, symbol, groupKey, unit, min, max, precision = 2, source = 'ICP-OES') {
  return Object.freeze({
    key,
    label,
    symbol,
    groupKey,
    group: groupLabels[groupKey],
    unit,
    precision,
    source,
    waterTypes: seawaterOnlySymbols.has(symbol) ? ['Meerwasser'] : ['Meerwasser', 'Süßwasser'],
    referenceRanges: {
      Meerwasser: { basis: 'ati', min, max, unit, provisional: true },
    },
  })
}

// Demo target ranges are deliberately centralized so they can later be replaced by
// approved ATI ranges without changing report components or imported lab results.
export const ELEMENT_DEFINITIONS = Object.freeze([
  element('salinity', 'Salinität', 'PSU', 'basis', 'PSU', 34.8, 35.2, 1, 'Profil'),
  element('kh', 'Karbonathärte', 'KH', 'basis', 'dKH', 7.5, 8.5, 2, 'Titrator'),
  element('fluoride', 'Fluorid', 'F', 'basis', 'mg/l', 1.1, 1.5, 3, 'IC'),

  element('boron', 'Bor', 'B', 'quantity', 'mg/l', 4, 5, 2),
  element('bromine', 'Brom', 'Br', 'quantity', 'mg/l', 55, 70, 1),
  element('calcium', 'Calcium', 'Ca', 'quantity', 'mg/l', 410, 440, 1),
  element('chloride', 'Chlorid', 'Cl', 'quantity', 'mg/l', 18500, 20000, 0),
  element('potassium', 'Kalium', 'K', 'quantity', 'mg/l', 380, 420, 1),
  element('magnesium', 'Magnesium', 'Mg', 'quantity', 'mg/l', 1280, 1350, 1),
  element('sodium', 'Natrium', 'Na', 'quantity', 'mg/l', 10500, 11500, 0),
  element('sulfur', 'Schwefel', 'S', 'quantity', 'mg/l', 850, 950, 1),
  element('strontium', 'Strontium', 'Sr', 'quantity', 'mg/l', 7, 9, 2),

  element('nitrate', 'Nitrat', 'NO₃', 'nutrients', 'mg/l', 2, 10, 2, 'IC'),
  element('phosphate', 'Phosphat', 'PO₄', 'nutrients', 'mg/l', 0.03, 0.08, 3, 'ICP-OES · berechnet'),
  element('phosphorus', 'Phosphor', 'P', 'nutrients', 'µg/l', 10, 26, 1),
  element('silicon', 'Silizium', 'Si', 'nutrients', 'µg/l', 50, 500, 1),

  element('cobalt', 'Kobalt', 'Co', 'trace', 'µg/l', 0.05, 0.2, 2),
  element('chromium', 'Chrom', 'Cr', 'trace', 'µg/l', 0.1, 0.5, 2),
  element('copper', 'Kupfer', 'Cu', 'trace', 'µg/l', 0.5, 3, 2),
  element('iron', 'Eisen', 'Fe', 'trace', 'µg/l', 0.5, 5, 2),
  element('iodine', 'Iod', 'I', 'trace', 'µg/l', 50, 80, 1),
  element('lithium', 'Lithium', 'Li', 'trace', 'µg/l', 150, 220, 1),
  element('manganese', 'Mangan', 'Mn', 'trace', 'µg/l', 0.2, 2, 2),
  element('molybdenum', 'Molybdän', 'Mo', 'trace', 'µg/l', 8, 15, 2),
  element('nickel', 'Nickel', 'Ni', 'trace', 'µg/l', 0.5, 5, 2),
  element('selenium', 'Selen', 'Se', 'trace', 'µg/l', 0.2, 2, 2),
  element('vanadium', 'Vanadium', 'V', 'trace', 'µg/l', 1, 3, 2),
  element('zinc', 'Zink', 'Zn', 'trace', 'µg/l', 0.5, 5, 2),

  element('silver', 'Silber', 'Ag', 'pollutants', 'µg/l', 0, 0.1, 2),
  element('aluminium', 'Aluminium', 'Al', 'pollutants', 'µg/l', 0, 10, 1),
  element('arsenic', 'Arsen', 'As', 'pollutants', 'µg/l', 0, 2, 2),
  element('barium', 'Barium', 'Ba', 'pollutants', 'µg/l', 3, 15, 2),
  element('beryllium', 'Beryllium', 'Be', 'pollutants', 'µg/l', 0, 0.1, 2),
  element('bismuth', 'Bismut', 'Bi', 'pollutants', 'µg/l', 0, 0.1, 2),
  element('cadmium', 'Cadmium', 'Cd', 'pollutants', 'µg/l', 0, 0.1, 2),
  element('mercury', 'Quecksilber', 'Hg', 'pollutants', 'µg/l', 0, 0.1, 2),
  element('lanthanum', 'Lanthan', 'La', 'pollutants', 'µg/l', 0, 0.1, 2),
  element('lead', 'Blei', 'Pb', 'pollutants', 'µg/l', 0, 0.5, 2),
  element('antimony', 'Antimon', 'Sb', 'pollutants', 'µg/l', 0, 0.5, 2),
  element('tin', 'Zinn', 'Sn', 'pollutants', 'µg/l', 0, 1, 2),
  element('titanium', 'Titan', 'Ti', 'pollutants', 'µg/l', 0, 2, 2),
  element('thallium', 'Thallium', 'Tl', 'pollutants', 'µg/l', 0, 0.1, 2),
  element('tungsten', 'Wolfram', 'W', 'pollutants', 'µg/l', 0, 0.5, 2),
])

export const ELEMENT_DEFINITION_MAP = Object.freeze(Object.fromEntries(ELEMENT_DEFINITIONS.map((item) => [item.key, item])))

export const DEMO_AQUARIUM_PROFILE = Object.freeze({
  waterType: 'Meerwasser',
  targetMode: 'ati',
  volumeLiters: 420,
  aquariumType: 'SPS/LPS Mischbecken',
  dimensions: '120 × 60 × 60 cm',
  livestock: 'SPS, LPS, 11 Fische',
  stockingDensity: 'Mittel',
  runningSince: 'März 2023',
  supplySystem: 'Essentials Pro',
  filtration: ['Eiweißabschäumer', 'Aktivkohle sporadisch', 'Algenrefugium'],
})

const scenarioSettings = {
  good: { score: 98, title: 'Stabiles Referenzbecken', barcode: 'ATI-GOOD-2026', reportNumber: 'ICP-GOOD-26', age: 4 },
  medium: { score: 84, title: 'Beobachtungsbecken', barcode: 'ATI-MIXED-2026', reportNumber: 'ICP-MIX-26', age: 9 },
  bad: { score: 54, title: 'Sanierungsbecken', barcode: 'ATI-BAD-2026', reportNumber: 'ICP-BAD-26', age: 15 },
}

function round(value, precision) {
  return Number(Number(value).toFixed(precision))
}

function toneForScenario(scenario, index) {
  if (scenario === 'good') return 'good'
  if (scenario === 'medium') return index % 6 === 1 || index % 9 === 4 ? 'watch' : 'good'
  if (index % 3 === 0 || index % 5 === 2) return 'critical'
  if (index % 4 === 1) return 'watch'
  return 'good'
}

function valueForScenario(definition, scenario, index, tone) {
  const range = definition.referenceRanges.Meerwasser
  const span = Math.max(range.max - range.min, Math.abs(range.max) * 0.12, 0.01)
  if (tone === 'good') return round(range.min + (range.max - range.min) * (0.42 + (index % 3) * 0.08), definition.precision)
  const high = range.min === 0 || index % 2 === 0
  const distance = scenario === 'bad' && tone === 'critical' ? 0.85 : 0.28
  return round(high ? range.max + span * distance : Math.max(0, range.min - span * distance), definition.precision)
}

function historyFor(value, definition, scenario, index) {
  const range = definition.referenceRanges.Meerwasser
  const span = Math.max(range.max - range.min, Math.abs(value) * 0.08, 0.01)
  const direction = index % 2 ? 1 : -1
  const strength = scenario === 'bad' ? 0.42 : scenario === 'medium' ? 0.2 : 0.06
  return [3, 2, 1, 0].map((step) => ({
    date: daysAgoDate(5 + step * 30),
    value: round(Math.max(0, value - direction * span * strength * step), definition.precision),
  }))
}

function buildParameters(scenario) {
  return ELEMENT_DEFINITIONS.map((definition, index) => {
    const tone = toneForScenario(scenario, index)
    const value = valueForScenario(definition, scenario, index, tone)
    const range = definition.referenceRanges.Meerwasser
    return {
      key: definition.key,
      label: definition.label,
      symbol: definition.symbol,
      groupKey: definition.groupKey,
      group: definition.group,
      source: definition.source,
      value,
      reportedValue: value,
      unit: definition.unit,
      target: `${range.min} - ${range.max}`,
      referenceRange: { ...range, waterType: 'Meerwasser' },
      tone,
      resultStatus: 'valid',
      calibrationStatus: tone === 'good' ? 'InRange' : value > range.max ? 'OverRange' : 'UnderRange',
      history: historyFor(value, definition, scenario, index),
    }
  })
}

function buildRecommendationGroups(parameters) {
  return ANALYSIS_GROUPS.map((group) => {
    const affected = parameters.filter((item) => item.groupKey === group.key && item.tone !== 'good')
    if (!affected.length) return null
    const critical = affected.some((item) => item.tone === 'critical')
    return {
      key: `${group.key}-stabilisieren`,
      groupKey: group.key,
      title: `${group.label} gemeinsam stabilisieren`,
      summary: `${affected.map((item) => item.label).join(', ')} zusammen bewerten und die gemeinsame Eintrags- oder Versorgungsquelle schrittweise korrigieren.`,
      parameterKeys: affected.map((item) => item.key),
      priority: critical ? 'Hoch' : 'Mittel',
      recheckDays: critical ? 7 : 14,
      steps: [
        `Dosierungen, Filterung und mögliche Quellen für ${group.label.toLowerCase()} dokumentieren.`,
        'Nur eine Anpassung gleichzeitig vornehmen und starke Sprünge vermeiden.',
        `Die betroffenen Werte nach ${critical ? 7 : 14} Tagen erneut kontrollieren.`,
      ],
    }
  }).filter(Boolean)
}

export function createDemoAnalysis(id, scenario) {
  const settings = scenarioSettings[scenario]
  const parameters = buildParameters(scenario)
  const recommendationGroups = buildRecommendationGroups(parameters)
  const issues = parameters.filter((item) => item.tone !== 'good').map((item) => `${item.label} ${item.calibrationStatus === 'OverRange' ? 'erhöht' : 'niedrig'}`)
  return {
    id,
    scenario,
    barcode: settings.barcode,
    reportNumber: settings.reportNumber,
    aquariumName: settings.title,
    aquariumProfile: { ...DEMO_AQUARIUM_PROFILE, name: settings.title },
    waterType: 'Meerwasser',
    targetMode: 'ati',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    resultLevel: scenario === 'good' ? 'good' : scenario === 'medium' ? 'watch' : 'critical',
    score: settings.score,
    createdAt: daysAgoDate(settings.age),
    completedAt: daysAgoDate(settings.age - 1),
    sample: { voucherCode: settings.barcode, type: 'Unknown', receivedAt: daysAgoDate(settings.age) },
    lab: { instrument: 'ARCOS II', method: 'Meerwasser ICP-OES · Demo', methodVersion: '2026.07', replicates: 3, processed: true },
    issues,
    parameters,
    recommendationGroups,
    recommendations: recommendationGroups.map((item) => item.summary),
  }
}
