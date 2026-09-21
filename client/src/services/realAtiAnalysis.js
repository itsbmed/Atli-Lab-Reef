import { ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'

export const REAL_ATI_ANALYSIS_ID = 'ati-real-393026'
export const REAL_ATI_AQUARIUM_ID = 'demo-basement-system'
export const REAL_ATI_OSMOSIS_ID = 'demo-basement-osmosis'

const RESULT_ROWS = [
  ['salinity', 34.23, 35, 'good'],
  ['kh', 7.68, 7.5, 'good'],
  ['chloride', 19209, 19130, 'good'],
  ['sodium', 10583, 10628, 'good'],
  ['magnesium', 1391, 1270, 'good'],
  ['sulfur', 934.7, 879.2, 'good'],
  ['calcium', 398.5, 406.7, 'good'],
  ['potassium', 386.7, 394.2, 'good'],
  ['bromine', 94.71, 64.73, 'watch', 'high'],
  ['strontium', 8.14, 7.83, 'good'],
  ['boron', 5.75, 4.35, 'watch', 'high'],
  ['fluoride', 1.01, 1.26, 'good'],
  ['lithium', 442.8, 164.2, 'good'],
  ['silicon', 99.3, 96.61, 'good'],
  ['iodine', 61.69, 62.8, 'good'],
  ['barium', 12.62, 9.66, 'good'],
  ['molybdenum', 10.27, 11.59, 'good'],
  ['nickel', 1.07, 0.48, 'good'],
  ['manganese', null, 0.97, 'watch', 'low'],
  ['arsenic', null, 0.48, 'good'],
  ['beryllium', null, 0.1, 'good'],
  ['chromium', null, 0.48, 'good'],
  ['cobalt', 1.34, 0.1, 'watch', 'high'],
  ['iron', null, 0.48, 'watch', 'low'],
  ['copper', null, 0.48, 'good'],
  ['selenium', null, 0.48, 'good'],
  ['silver', null, 0.1, 'good'],
  ['vanadium', 1.6, 1.45, 'good'],
  ['zinc', 1.26, 1.93, 'good'],
  ['tin', null, 0.48, 'good'],
  ['nitrate', 0.18, 2, 'watch', 'low'],
  ['phosphorus', 14.49, 14.49, 'good'],
  ['phosphate', 0.04, 0.04, 'good'],
  ['aluminium', 79.81, 0.1, 'watch', 'high'],
  ['antimony', null, 0.1, 'good'],
  ['bismuth', null, 0.1, 'good'],
  ['lead', null, 0.1, 'good'],
  ['cadmium', null, 0.19, 'good'],
  ['lanthanum', 18.55, 0.001, 'watch', 'high'],
  ['thallium', null, 0.1, 'good'],
  ['titanium', null, 0.1, 'good'],
  ['tungsten', null, 0.001, 'good'],
  ['mercury', null, 0.001, 'good'],
]

const OSMOSIS_ROWS = [
  ['lithium', null, 0.001, 'good'], ['silicon', 62.6, 0.001, 'critical', 'high'],
  ['barium', null, 0.001, 'good'], ['molybdenum', null, 0.001, 'good'], ['nickel', null, 0.001, 'good'],
  ['manganese', null, 0.001, 'good'], ['arsenic', null, 0.001, 'good'], ['beryllium', null, 0.001, 'good'],
  ['chromium', null, 0.001, 'good'], ['cobalt', null, 0.001, 'good'], ['iron', null, 0.001, 'good'],
  ['copper', null, 0.001, 'good'], ['selenium', null, 0.001, 'good'], ['silver', null, 0.001, 'good'],
  ['vanadium', null, 0.001, 'good'], ['zinc', null, 0.001, 'good'], ['tin', null, 0.001, 'good'],
  ['phosphorus', null, 0.001, 'good'], ['phosphate', null, 0.001, 'good'], ['aluminium', null, 0.001, 'good'],
  ['antimony', null, 0.001, 'good'], ['bismuth', null, 0.001, 'good'], ['lead', null, 0.001, 'good'],
  ['cadmium', null, 0.001, 'good'], ['lanthanum', null, 0.001, 'good'], ['thallium', null, 0.001, 'good'],
  ['titanium', null, 0.001, 'good'], ['tungsten', null, 0.001, 'good'], ['mercury', null, 0.001, 'good'],
]

function sourceStatus(tone, direction, undetectable) {
  if (tone === 'critical') return 'Kritisch hoch (ATI)'
  if (tone === 'good') return undetectable ? 'Nicht nachweisbar · Normal (ATI)' : 'Normal (ATI)'
  return direction === 'low' ? 'Unter Soll (ATI)' : 'Über Soll (ATI)'
}

function resultParameter([key, measured, idealValue, tone, direction = 'in_range']) {
  const definition = ELEMENT_DEFINITION_MAP[key]
  if (!definition) throw new Error(`Unknown ATI parameter: ${key}`)
  const undetectable = measured === null
  const parameter = {
    key,
    label: definition.label,
    symbol: definition.symbol,
    groupKey: definition.groupKey,
    group: definition.group,
    source: definition.source,
    value: undetectable ? 0 : measured,
    reportedValue: undetectable ? 'Nicht nachweisbar' : measured,
    unit: definition.unit,
    target: String(idealValue),
    sourceIdealValue: idealValue,
    correctionTarget: idealValue,
    referenceRange: { ...definition.referenceRanges.Meerwasser, waterType: 'Meerwasser' },
    precision: definition.precision,
    tone,
    sourceDirection: direction,
    sourceStatusLabel: sourceStatus(tone, direction, undetectable),
    resultStatus: undetectable ? 'below_detection' : 'valid',
    calibrationStatus: undetectable ? 'BelowDetection' : direction === 'low' ? 'UnderRange' : direction === 'high' ? 'OverRange' : 'InRange',
    history: [],
  }
  if (key === 'nitrate') {
    parameter.managedDose = {
      productName: 'ATI Nutrition N/Nitro',
      dailyMl: 2.27,
      threshold: 2,
      instructions: 'Täglich dosieren und die Menge reduzieren, sobald Nitrat 2 mg/l überschreitet.',
      source: 'ATI-Originalbericht 393026',
    }
  }
  return parameter
}

export const REAL_ATI_PARAMETERS = Object.freeze(RESULT_ROWS.map(resultParameter))
export const REAL_ATI_OSMOSIS_PARAMETERS = Object.freeze(OSMOSIS_ROWS.map(resultParameter))

const recommendationGroups = [
  {
    key: 'ati-bromine-393026', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Bromzufuhr reduzieren', parameterKeys: ['bromine'],
    summary: 'Bromidzugabe reduzieren oder pausieren, bis der Wert bei 35 PSU wieder 65–67 mg/l erreicht.',
    why: 'ATI bewertete Brom mit 94,71 mg/l als erhöht.',
    steps: ['Aktive Brom- oder Spurenversorgung prüfen.', 'Bromzugabe reduzieren oder pausieren.', 'Brom und Salinität bei der nächsten Analyse gemeinsam kontrollieren.'],
  },
  {
    key: 'ati-boron-393026', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Borzufuhr reduzieren', parameterKeys: ['boron'],
    summary: 'Borzugabe reduzieren oder pausieren, bis der Wert bei 35 PSU wieder 4,3–4,7 mg/l erreicht.',
    why: 'ATI bewertete Bor mit 5,75 mg/l als erhöht.',
    steps: ['Aktive Bor- oder Spurenversorgung prüfen.', 'Borzugabe reduzieren oder pausieren.', 'Bor und Salinität bei der nächsten Analyse gemeinsam kontrollieren.'],
  },
  {
    key: 'ati-nitrate-393026', groupKey: 'nutrients', tone: 'watch', priority: 'Hoch', recheckDays: 7,
    title: 'Nitrat kontrolliert anheben', parameterKeys: ['nitrate'],
    summary: 'Täglich 2,27 ml Nutrition N/Nitro dosieren. Die Menge reduzieren, sobald Nitrat 2 mg/l überschreitet.',
    why: 'ATI bewertete Nitrat mit 0,18 mg/l als zu niedrig.',
    steps: ['2,27 ml Nutrition N/Nitro pro Tag dosieren.', 'Nitrat regelmäßig kontrollieren.', 'Bei mehr als 2 mg/l die Tagesmenge reduzieren.'],
  },
  {
    key: 'ati-lanthanum-393026', groupKey: 'pollutants', tone: 'watch', priority: 'Hoch', recheckDays: 7,
    title: 'Lanthanquelle entfernen', parameterKeys: ['lanthanum'],
    summary: 'Flüssige Phosphatadsorber als mögliche Lanthanquelle prüfen und auf einen eisenbasierten PO₄-Adsorber wechseln.',
    why: 'ATI bewertete Lanthan mit 18,55 µg/l als erhöht und verweist auf flüssige Phosphatadsorber als typische Quelle.',
    steps: ['Verwendete flüssige Phosphatadsorber dokumentieren.', 'Auf einen eisenbasierten PO₄-Adsorber wechseln.', 'Lanthan und Phosphat erneut kontrollieren.'],
  },
  {
    key: 'ati-osmosis-silicon-393026', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Osmoseanlage warten', parameterKeys: ['silicon'],
    summary: 'Die Osmoseanlage warten und das Mischbettharz ersetzen; im Osmosewasser wurden 62,60 µg/l Silizium gemessen.',
    why: 'ATI bewertete Silizium im Osmosewasser als kritisch hoch.',
    steps: ['Osmoseanlage und Membran prüfen.', 'Mischbettharz ersetzen.', 'Osmosewasser vor weiterer Verwendung erneut testen.'],
  },
  {
    key: 'ati-supplements-393026', groupKey: 'trace', tone: 'watch', priority: 'Mittel', recheckDays: 7,
    title: 'Alternative Supplement-Dosierung', parameterKeys: ['manganese', 'iron'],
    summary: 'ATI nennt alternativ 2,19 ml Mangan einmalig und 1,10 ml Eisen in fünf Tagesportionen zu je 0,22 ml.',
    why: 'Der Originalbericht trennt ICP-Element-Produkte und Supplement-Produkte in zwei alternative Dosierwege.',
    steps: ['Nur einen der beiden Produktwege auswählen.', 'Mangan beziehungsweise Eisen gemäß gewähltem Produkt dosieren.', 'Pro Tag höchstens eine Portion zugeben.'],
  },
]

export function createRealAtiAnalysis() {
  const issues = [
    'Brom über Soll', 'Bor über Soll', 'Mangan nicht nachweisbar', 'Kobalt über Soll',
    'Eisen nicht nachweisbar', 'Nitrat unter Soll', 'Aluminium über Soll', 'Lanthan über Soll',
    'Osmosewasser: Silizium kritisch hoch',
  ]
  return {
    id: REAL_ATI_ANALYSIS_ID,
    scenario: 'real-ati-393026',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'RMPA-XVDP-AXSR-AQLL',
    reportNumber: '393026',
    aquariumName: 'Basement System',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 91,
    resultLevel: 'watch',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 100, quantity: 95, trace: 91, pollutants: 97 },
    createdAt: '2026-09-12T12:00:00+02:00',
    receivedAt: '2026-09-17T12:00:00+02:00',
    completedAt: '2026-09-21T10:11:36+02:00',
    aquariumId: REAL_ATI_AQUARIUM_ID,
    osmoseAquariumId: REAL_ATI_OSMOSIS_ID,
    sample: { voucherCode: 'RMPA-XVDP-AXSR-AQLL', type: 'Meerwasser', comment: 'Basement Tank', receivedAt: '2026-09-17T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '393026' },
    parameters: REAL_ATI_PARAMETERS.map((parameter) => ({ ...parameter })),
    osmosisParameters: REAL_ATI_OSMOSIS_PARAMETERS.map((parameter) => ({ ...parameter })),
    recommendations: recommendationGroups.map((item) => item.summary),
    recommendationGroups: recommendationGroups.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'manganese', totalMl: 1.1, portions: [1.1] },
        { key: 'iron', totalMl: 0.55, portions: [0.55] },
      ],
      supplements: [
        { key: 'manganese', totalMl: 2.19, portions: [2.19] },
        { key: 'iron', totalMl: 1.1, portions: [0.22, 0.22, 0.22, 0.22, 0.22] },
      ],
    },
  }
}
