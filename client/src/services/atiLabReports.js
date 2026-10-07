import { ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'

// Three real ATI laboratory reports. The salt water rows are the original CSV exports
// verbatim, parsed at load, so no measured or ideal value is ever re-typed by hand.
// Only what the CSV cannot express is added next to it: the laboratory's verdict for
// rows below the detection limit, and ideal values the CSV rounds away to 0,00.

const ELEMENT_BY_LAB_NAME = Object.freeze({
  Salinity: 'salinity',
  'Carbonate hardness': 'kh',
  Chloride: 'chloride',
  Sodium: 'sodium',
  Magnesium: 'magnesium',
  Sulfur: 'sulfur',
  Calcium: 'calcium',
  Potassium: 'potassium',
  Bromine: 'bromine',
  Strontium: 'strontium',
  Boron: 'boron',
  Fluorine: 'fluoride',
  Lithium: 'lithium',
  Silicon: 'silicon',
  Iodine: 'iodine',
  Barium: 'barium',
  Molybdenum: 'molybdenum',
  Nickel: 'nickel',
  Manganese: 'manganese',
  Arsenic: 'arsenic',
  Beryllium: 'beryllium',
  Chrome: 'chromium',
  Cobalt: 'cobalt',
  Iron: 'iron',
  Copper: 'copper',
  Selenium: 'selenium',
  Silver: 'silver',
  Vanadium: 'vanadium',
  Zinc: 'zinc',
  Tin: 'tin',
  Nitrate: 'nitrate',
  Phosphorus: 'phosphorus',
  Phosphate: 'phosphate',
  Aluminium: 'aluminium',
  Antimony: 'antimony',
  Bismuth: 'bismuth',
  Lead: 'lead',
  Cadmium: 'cadmium',
  Lanthanum: 'lanthanum',
  Thallium: 'thallium',
  Titanium: 'titanium',
  Tungsten: 'tungsten',
  Mercury: 'mercury',
})

// ATI status code -> our tone and direction.
const STATUS_CODES = Object.freeze({
  o: ['good', 'in_range'],
  '+': ['watch', 'high'],
  '++': ['critical', 'high'],
  '-': ['watch', 'low'],
  '--': ['critical', 'low'],
})

// The CSV rounds every ideal value to two decimals, which flattens these to 0,00.
const IDEAL_BELOW_CSV_PRECISION = Object.freeze({ lanthanum: 0.001, tungsten: 0.001, mercury: 0.001 })

function decimal(value) {
  return Number(String(value).replace(/\s/g, '').replace(',', '.'))
}

// A row reported as "n.n." carries no direction in the CSV; the printed report still
// rates some of them as below normal, so those are listed per analysis.
function parseCsv(csv, { belowNormal = {}, idealOverrides = {} } = {}) {
  return csv.trim().split('\n')
    .map((line) => line.trim().replace(/^"|"$/g, '').split('";"'))
    .filter((cells) => cells.length === 7 && ELEMENT_BY_LAB_NAME[cells[0]])
    .map((cells) => {
      const [name, , rawValue, rawIdeal, , , status] = cells
      const key = ELEMENT_BY_LAB_NAME[name]
      const undetectable = status === 'n.n.'
      const [tone, direction] = undetectable
        ? (STATUS_CODES[belowNormal[key]] || STATUS_CODES.o)
        : (STATUS_CODES[status] || STATUS_CODES.o)
      return {
        key,
        measured: undetectable ? null : decimal(rawValue),
        ideal: idealOverrides[key] ?? IDEAL_BELOW_CSV_PRECISION[key] ?? decimal(rawIdeal),
        tone,
        direction,
      }
    })
}

function sourceStatus(tone, direction, undetectable) {
  if (tone === 'critical') return direction === 'low' ? 'Kritisch niedrig (ATI)' : 'Kritisch hoch (ATI)'
  if (tone === 'good') return undetectable ? 'Nicht nachweisbar · Normal (ATI)' : 'Normal (ATI)'
  return direction === 'low' ? 'Unter Soll (ATI)' : 'Über Soll (ATI)'
}

export function labParameter({ key, measured, ideal, tone, direction }) {
  const definition = ELEMENT_DEFINITION_MAP[key]
  if (!definition) throw new Error(`Unknown ATI parameter: ${key}`)
  const undetectable = measured === null
  return {
    key,
    label: definition.label,
    symbol: definition.symbol,
    groupKey: definition.groupKey,
    group: definition.group,
    source: definition.source,
    value: undetectable ? 0 : measured,
    reportedValue: undetectable ? 'Nicht nachweisbar' : measured,
    unit: definition.unit,
    target: String(ideal),
    sourceIdealValue: ideal,
    correctionTarget: ideal,
    referenceRange: { ...definition.referenceRanges.Meerwasser, waterType: 'Meerwasser' },
    precision: definition.precision,
    tone,
    sourceDirection: direction,
    sourceStatusLabel: sourceStatus(tone, direction, undetectable),
    resultStatus: undetectable ? 'below_detection' : 'valid',
    calibrationStatus: undetectable ? 'BelowDetection' : direction === 'low' ? 'UnderRange' : direction === 'high' ? 'OverRange' : 'InRange',
    history: [],
  }
}

// Osmosis samples are only in the printed report; every ideal value there is 0.001.
function osmosisRows(detected = {}, keys = []) {
  return keys.map((key) => {
    const measured = detected[key] ?? null
    return { key, measured, ideal: 0.001, tone: measured === null ? 'good' : 'critical', direction: measured === null ? 'in_range' : 'high' }
  })
}

const OSMOSIS_KEYS = Object.freeze([
  'lithium', 'silicon', 'barium', 'molybdenum', 'nickel', 'manganese', 'arsenic', 'beryllium',
  'chromium', 'cobalt', 'iron', 'copper', 'selenium', 'silver', 'vanadium', 'zinc', 'tin',
  'phosphorus', 'phosphate', 'aluminium', 'antimony', 'bismuth', 'lead', 'cadmium',
  'lanthanum', 'thallium', 'titanium', 'tungsten', 'mercury',
])

/* ───────────────────────── 394463 · Aquarium Neu ───────────────────────── */

export const REPORT_394463_ID = 'ati-real-394463'
export const REPORT_394463_AQUARIUM_ID = 'demo-aquarium-neu'
export const REPORT_394463_OSMOSIS_ID = 'demo-aquarium-neu-osmose'

const CSV_394463 = `
"Salinity";"Sal. total";"35,78";"35,00";"+0,78";"PSU";"o"
"Carbonate hardness";"KH";"8,36";"7,50";"+0,86";"dKH";"o"
"Chloride";"Cl";"20061,30";"20035,70";"+25,60";"mg/l";"o"
"Sodium";"Na";"11116,70";"11130,90";"-14,20";"mg/l";"o"
"Magnesium";"Mg";"1415,36";"1330,65";"+84,71";"mg/l";"o"
"Sulfur";"S";"976,35";"920,83";"+55,52";"mg/l";"o"
"Calcium";"Ca";"422,58";"426,01";"-3,43";"mg/l";"o"
"Potassium";"K";"464,27";"412,86";"+51,42";"mg/l";"+"
"Bromine";"Br";"75,80";"67,80";"+8,00";"mg/l";"o"
"Strontium";"Sr";"8,14";"8,20";"+-0,06";"mg/l";"o"
"Boron";"B";"5,98";"4,55";"+1,43";"mg/l";"+"
"Fluorine";"F";"1,32";"1,32";"+0,01";"mg/l";"o"
"Lithium";"Li";"392,19";"172,02";"+220,16";"ug/l";"o"
"Silicon";"Si";"23,99";"101,19";"-77,20";"ug/l";"-"
"Iodine";"I";"46,26";"65,77";"-19,51";"ug/l";"o"
"Barium";"Ba";"13,84";"10,12";"+3,72";"ug/l";"o"
"Molybdenum";"Mo";"14,51";"12,14";"+2,37";"ug/l";"o"
"Nickel";"Ni";"3,11";"0,51";"+2,60";"ug/l";"o"
"Manganese";"Mn";"0,00";"1,01";"0,00";"ug/l";"n.n."
"Arsenic";"As";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Iron";"Fe";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Copper";"Cu";"1,44";"0,51";"+0,94";"ug/l";"o"
"Selenium";"Se";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Silver";"Ag";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Vanadium";"V";"2,39";"1,52";"+0,87";"ug/l";"o"
"Zinc";"Zn";"8,96";"2,02";"+6,94";"ug/l";"+"
"Tin";"Sn";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Nitrate";"NO3";"6,56";"2,00";"+4,56";"mg/l";"o"
"Phosphorus";"P";"101,87";"15,18";"+86,69";"ug/l";"++"
"Phosphate";"PO4";"0,31";"0,05";"+0,27";"mg/l";"++"
"Aluminium";"Al.";"36,69";"0,10";"+36,59";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,20";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_394463_ROWS = Object.freeze(parseCsv(CSV_394463, {
  belowNormal: { manganese: '-', iron: '-' },
}))

const RECOMMENDATIONS_394463 = [
  {
    key: 'ati-phosphorus-394463', groupKey: 'nutrients', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Phosphor senken', parameterKeys: ['phosphorus', 'phosphate'],
    summary: 'Phosphor ist zu hoch. Filterung verbessern und/oder Futtermenge reduzieren. Einen eisenbasierten PO₄-Adsorber (zum Beispiel ATI Phosphate Stop) einsetzen, um den Phosphorwert auf 13–17 µg/l zu senken.',
    why: 'ATI bewertete Phosphor mit 101,87 µg/l und Phosphat mit 0,31 mg/l als kritisch hoch.',
    steps: ['Filterung verbessern und Futtereintrag reduzieren.', 'Eisenbasierten PO₄-Adsorber einsetzen.', 'Phosphor auf 13–17 µg/l zurückführen.'],
  },
  {
    key: 'ati-potassium-394463', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Kaliumzufuhr reduzieren', parameterKeys: ['potassium'],
    summary: 'Kaliumzugabe reduzieren oder stoppen, um den Wert auf 400–415 mg/l (35 PSU) zu senken.',
    why: 'ATI bewertete Kalium mit 464,27 mg/l als erhöht.',
    steps: ['Kaliumzugabe reduzieren oder stoppen.', 'Wert auf 400–415 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-boron-394463', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Borzufuhr reduzieren', parameterKeys: ['boron'],
    summary: 'Borzugabe reduzieren oder stoppen, um den Wert auf 4,3–4,7 mg/l (35 PSU) zu senken.',
    why: 'ATI bewertete Bor mit 5,98 mg/l als erhöht.',
    steps: ['Borzugabe reduzieren oder stoppen.', 'Wert auf 4,3–4,7 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-zinc-394463', groupKey: 'trace', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Zinkquelle beseitigen', parameterKeys: ['zinc'],
    summary: 'Zink ist erhöht. Die Quelle finden und beseitigen, zum Beispiel korrodierende Metalle, belastete Wasserpflegeprodukte oder Osmosewasser.',
    why: 'ATI bewertete Zink mit 8,96 µg/l als erhöht.',
    steps: ['Korrodierende Metalle im System prüfen.', 'Wasserpflegeprodukte und Osmosewasser kontrollieren.', 'Quelle entfernen statt den Wert zu behandeln.'],
  },
  {
    key: 'ati-silicon-394463', groupKey: 'nutrients', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Osmoseanlage warten', parameterKeys: ['silicon'],
    summary: 'Osmoseanlage warten beziehungsweise das Mischbettharz tauschen.',
    why: 'Die Osmoseprobe zeigt Silizium mit 540,8 µg/l kritisch hoch.',
    steps: ['Mischbettharz tauschen.', 'Leitwert direkt nach dem Harz messen.', 'Osmosewasser erneut prüfen.'],
  },
]

export function createReport394463() {
  const issues = [
    'Kalium über Soll', 'Bor über Soll', 'Zink über Soll', 'Silizium unter Soll',
    'Mangan nicht nachweisbar', 'Eisen nicht nachweisbar',
    'Phosphor kritisch hoch', 'Phosphat kritisch hoch',
    'Osmosewasser: Silizium, Lithium, Barium, Mangan, Kupfer und Zinn kritisch hoch',
  ]
  return {
    id: REPORT_394463_ID,
    scenario: 'real-ati-394463',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'BU7Y-A4B3-3UWT-6W35',
    reportNumber: '394463',
    aquariumName: 'Aquarium Neu',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 89,
    resultLevel: 'watch',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 100, quantity: 95, trace: 89, pollutants: 100 },
    createdAt: '2026-09-22T12:00:00+02:00',
    receivedAt: '2026-09-24T12:00:00+02:00',
    completedAt: '2026-09-24T21:41:47+02:00',
    aquariumId: REPORT_394463_AQUARIUM_ID,
    osmoseAquariumId: REPORT_394463_OSMOSIS_ID,
    sample: { voucherCode: 'BU7Y-A4B3-3UWT-6W35', type: 'Meerwasser', comment: 'Aquarium Neu', receivedAt: '2026-09-24T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '394463' },
    parameters: REPORT_394463_ROWS.map(labParameter),
    osmosisParameters: osmosisRows(
      { lithium: 16.05, silicon: 540.8, barium: 19.2, manganese: 0.85, copper: 5.42, tin: 11.05 },
      OSMOSIS_KEYS,
    ).map(labParameter),
    recommendations: RECOMMENDATIONS_394463.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_394463.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'manganese', totalMl: 3.54, portions: [3.54] },
        { key: 'iron', totalMl: 1.77, portions: [1.77] },
      ],
      supplements: [
        { key: 'manganese', totalMl: 7.08, portions: [7.08] },
        { key: 'iron', totalMl: 3.54, portions: [0.59, 0.59, 0.59, 0.59, 0.59, 0.59] },
      ],
    },
  }
}

/* ────────────────────── 394527 · Grosses Becken 500L ────────────────────── */

export const REPORT_394527_ID = 'ati-real-394527'
export const REPORT_394527_AQUARIUM_ID = 'demo-grosses-becken-500l'

const CSV_394527 = `
"Salinity";"Sal. total";"34,58";"35,00";"+-0,42";"PSU";"o"
"Carbonate hardness";"KH";"8,01";"7,50";"+0,51";"dKH";"o"
"Chloride";"Cl";"19627,80";"19495,80";"+132,00";"mg/l";"o"
"Sodium";"Na";"10757,70";"10831,00";"-73,30";"mg/l";"o"
"Magnesium";"Mg";"1286,59";"1294,80";"-8,21";"mg/l";"o"
"Sulfur";"S";"862,20";"896,02";"-33,82";"mg/l";"o"
"Calcium";"Ca";"480,00";"414,53";"+65,47";"mg/l";"+"
"Potassium";"K";"422,85";"401,73";"+21,12";"mg/l";"o"
"Bromine";"Br";"65,58";"65,97";"+-0,39";"mg/l";"o"
"Strontium";"Sr";"7,01";"7,98";"+-0,97";"mg/l";"o"
"Boron";"B";"3,99";"4,43";"+-0,44";"mg/l";"o"
"Fluorine";"F";"6,09";"1,28";"+4,81";"mg/l";"++"
"Lithium";"Li";"237,93";"167,39";"+70,54";"ug/l";"o"
"Silicon";"Si";"403,10";"98,46";"+304,64";"ug/l";"+"
"Iodine";"I";"224,30";"64,00";"+160,30";"ug/l";"++"
"Barium";"Ba";"18,51";"9,85";"+8,67";"ug/l";"o"
"Molybdenum";"Mo";"12,15";"11,82";"+0,33";"ug/l";"o"
"Nickel";"Ni";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Manganese";"Mn";"0,00";"0,98";"0,00";"ug/l";"n.n."
"Arsenic";"As";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Iron";"Fe";"1,57";"0,49";"+1,08";"ug/l";"o"
"Copper";"Cu";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Selenium";"Se";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Silver";"Ag";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Vanadium";"V";"0,00";"1,48";"0,00";"ug/l";"n.n."
"Zinc";"Zn";"0,00";"1,97";"0,00";"ug/l";"n.n."
"Tin";"Sn";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Nitrate";"NO3";"71,38";"2,00";"+69,38";"mg/l";"++"
"Phosphorus";"P";"40,67";"14,77";"+25,90";"ug/l";"+"
"Phosphate";"PO4";"0,12";"0,04";"+0,08";"mg/l";"+"
"Aluminium";"Al.";"19,71";"0,10";"+19,62";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,20";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_394527_ROWS = Object.freeze(parseCsv(CSV_394527, {
  belowNormal: { manganese: '-', vanadium: '-', zinc: '--' },
}))

const RECOMMENDATIONS_394527 = [
  {
    key: 'ati-zinc-394527', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Spurenelemente täglich versorgen', parameterKeys: ['zinc', 'manganese', 'vanadium'],
    summary: 'Wenn Chrom, Cobalt, Eisen, Kupfer, Mangan, Nickel und Zink regelmäßig zu niedrig sind, empfehlen wir die tägliche Dosierung von „Daily Traces A“.',
    why: 'ATI bewertete Zink als kritisch niedrig sowie Mangan und Vanadium als unter Soll.',
    steps: ['„Daily Traces A“ täglich dosieren.', 'Spurenelemente bei der nächsten Analyse gemeinsam kontrollieren.'],
  },
  {
    key: 'ati-iodine-394527', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Iod über Aktivkohle senken', parameterKeys: ['iodine'],
    summary: 'Aktivkohle einsetzen (50 g je 100 l).',
    why: 'ATI bewertete Iod mit 224,30 µg/l als kritisch hoch.',
    steps: ['50 g Aktivkohle je 100 l einsetzen.', 'Iodzugabe pausieren.', 'Wert nach einer Woche erneut prüfen.'],
  },
  {
    key: 'ati-nitrate-394527', groupKey: 'nutrients', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Nitrat senken', parameterKeys: ['nitrate'],
    summary: 'Der Nitratwert ist erhöht. Filterung optimieren und/oder Futtereintrag reduzieren. Das Osmosewasser auf Nitrat prüfen.',
    why: 'ATI bewertete Nitrat mit 71,38 mg/l als kritisch hoch.',
    steps: ['Filterung optimieren.', 'Futtereintrag reduzieren.', 'Osmosewasser auf Nitrat prüfen.'],
  },
  {
    key: 'ati-fluoride-394527', groupKey: 'basis', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Fluoridzufuhr stoppen', parameterKeys: ['fluoride'],
    summary: 'Fluoridzugabe stoppen, um den Wert auf 1,1–1,5 mg/l (35 PSU) zu senken. Mehrere Wasserwechsel mit Absolute Ocean beschleunigen die Korrektur.',
    why: 'ATI bewertete Fluorid mit 6,09 mg/l als kritisch hoch.',
    steps: ['Fluoridzugabe stoppen.', 'Mehrere Wasserwechsel mit Absolute Ocean durchführen.', 'Wert auf 1,1–1,5 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-silicon-394527', groupKey: 'nutrients', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Siliziumquelle beseitigen', parameterKeys: ['silicon'],
    summary: 'Silizium ist erhöht. Die Ursache finden und beseitigen, zum Beispiel Osmosewasser oder Frostfutter.',
    why: 'ATI bewertete Silizium mit 403,10 µg/l als erhöht.',
    steps: ['Osmosewasser prüfen.', 'Frostfutter abspülen.', 'Mischbettharz kontrollieren.'],
  },
  {
    key: 'ati-phosphorus-394527', groupKey: 'nutrients', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Phosphor leicht senken', parameterKeys: ['phosphorus', 'phosphate'],
    summary: 'Phosphor ist leicht zu hoch. Filterung verbessern und/oder Futtermenge reduzieren. Das Osmosewasser prüfen.',
    why: 'ATI bewertete Phosphor mit 40,67 µg/l als erhöht.',
    steps: ['Filterung verbessern.', 'Futtermenge reduzieren.', 'Osmosewasser prüfen.'],
  },
  {
    key: 'ati-calcium-394527', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Calciumzufuhr reduzieren', parameterKeys: ['calcium'],
    summary: 'Calciumzugabe reduzieren oder stoppen, um den Wert auf 410–440 mg/l (35 PSU) zu senken.',
    why: 'ATI bewertete Calcium mit 480,00 mg/l als erhöht.',
    steps: ['Calciumzugabe reduzieren oder stoppen.', 'Wert auf 410–440 mg/l bei 35 PSU zurückführen.'],
  },
]

export function createReport394527() {
  const issues = [
    'Calcium über Soll', 'Fluorid kritisch hoch', 'Silizium über Soll', 'Iod kritisch hoch',
    'Mangan unter Soll', 'Vanadium unter Soll', 'Zink kritisch niedrig',
    'Nitrat kritisch hoch', 'Phosphor über Soll', 'Phosphat über Soll',
  ]
  return {
    id: REPORT_394527_ID,
    scenario: 'real-ati-394527',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'TK3D-EJBL-UAG9-L4BV',
    reportNumber: '394527',
    aquariumName: 'Grosses Becken 500L',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 80,
    resultLevel: 'watch',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 100, quantity: 88, trace: 80, pollutants: 100 },
    createdAt: '2026-09-23T12:00:00+02:00',
    receivedAt: '2026-09-24T12:00:00+02:00',
    completedAt: '2026-09-24T21:41:57+02:00',
    aquariumId: REPORT_394527_AQUARIUM_ID,
    sample: { voucherCode: 'TK3D-EJBL-UAG9-L4BV', type: 'Meerwasser', comment: 'Grosses Becken 500L', receivedAt: '2026-09-24T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '394527' },
    parameters: REPORT_394527_ROWS.map(labParameter),
    osmosisParameters: osmosisRows({}, OSMOSIS_KEYS).map(labParameter),
    recommendations: RECOMMENDATIONS_394527.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_394527.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'vanadium', totalMl: 1.48, portions: [1.48] },
        { key: 'zinc', totalMl: 0.98, portions: [0.98] },
        { key: 'manganese', totalMl: 1.23, portions: [1.23] },
      ],
      supplements: [
        { key: 'vanadium', totalMl: 3.69, portions: [1.85, 1.85] },
        { key: 'zinc', totalMl: 4.92, portions: [4.92] },
        { key: 'manganese', totalMl: 2.46, portions: [2.46] },
      ],
    },
  }
}

/* ───────────────────── 394770 · Nyos Opus G2 440 LPS ───────────────────── */

export const REPORT_394770_ID = 'ati-real-394770'
export const REPORT_394770_AQUARIUM_ID = 'demo-nyos-opus-g2-440'

const CSV_394770 = `
"Salinity";"Sal. total";"35,78";"35,00";"+0,78";"PSU";"o"
"Carbonate hardness";"KH";"7,99";"7,50";"+0,49";"dKH";"o"
"Chloride";"Cl";"20262,90";"20327,90";"-65,00";"mg/l";"o"
"Sodium";"Na";"11329,40";"11293,30";"+36,10";"mg/l";"o"
"Magnesium";"Mg";"1274,59";"1350,06";"-75,47";"mg/l";"o"
"Sulfur";"S";"920,79";"934,26";"-13,47";"mg/l";"o"
"Calcium";"Ca";"402,38";"432,22";"-29,85";"mg/l";"-"
"Potassium";"K";"388,02";"418,88";"-30,85";"mg/l";"-"
"Bromine";"Br";"66,36";"68,79";"-2,42";"mg/l";"o"
"Strontium";"Sr";"7,61";"8,32";"+-0,70";"mg/l";"o"
"Boron";"B";"4,35";"4,62";"+-0,27";"mg/l";"o"
"Fluorine";"F";"0,94";"1,33";"+-0,39";"mg/l";"-"
"Lithium";"Li";"166,27";"174,53";"-8,26";"ug/l";"o"
"Silicon";"Si";"0,00";"102,67";"0,00";"ug/l";"n.n."
"Iodine";"I";"48,32";"66,73";"-18,42";"ug/l";"o"
"Barium";"Ba";"6,90";"10,27";"-3,36";"ug/l";"o"
"Molybdenum";"Mo";"11,57";"12,32";"+-0,75";"ug/l";"o"
"Nickel";"Ni";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Manganese";"Mn";"0,00";"1,03";"0,00";"ug/l";"n.n."
"Arsenic";"As";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Iron";"Fe";"0,68";"0,51";"+0,17";"ug/l";"o"
"Copper";"Cu";"1,37";"0,51";"+0,86";"ug/l";"o"
"Selenium";"Se";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Silver";"Ag";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Vanadium";"V";"0,85";"1,54";"+-0,69";"ug/l";"o"
"Zinc";"Zn";"0,00";"2,05";"0,00";"ug/l";"n.n."
"Tin";"Sn";"0,00";"0,51";"0,00";"ug/l";"n.n."
"Nitrate";"NO3";"0,06";"2,00";"-1,94";"mg/l";"-"
"Phosphorus";"P";"8,13";"15,40";"-7,27";"ug/l";"--"
"Phosphate";"PO4";"0,02";"0,05";"+-0,02";"mg/l";"--"
"Aluminium";"Al.";"12,41";"0,10";"+12,31";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,21";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_394770_ROWS = Object.freeze(parseCsv(CSV_394770, {
  belowNormal: { silicon: '-', manganese: '-', zinc: '--' },
}))

const RECOMMENDATIONS_394770 = [
  {
    key: 'ati-zinc-394770', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Spurenelemente täglich versorgen', parameterKeys: ['zinc', 'manganese'],
    summary: 'Wenn Chrom, Cobalt, Eisen, Kupfer, Mangan, Nickel und Zink regelmäßig zu niedrig sind, empfehlen wir die tägliche Dosierung von „Daily Traces A“.',
    why: 'ATI bewertete Zink als kritisch niedrig und Mangan als unter Soll.',
    steps: ['„Daily Traces A“ täglich dosieren.', 'Spurenelemente bei der nächsten Analyse gemeinsam kontrollieren.'],
  },
  {
    key: 'ati-phosphorus-394770', groupKey: 'nutrients', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Phosphor anheben', parameterKeys: ['phosphorus', 'phosphate'],
    summary: 'Täglich 3,78 ml Nutrition P/Phospho dosieren. Die Menge reduzieren, sobald der Heimtest mehr als 0,03 mg/l PO₄ anzeigt.',
    why: 'ATI bewertete Phosphor mit 8,13 µg/l und Phosphat mit 0,02 mg/l als kritisch niedrig.',
    steps: ['3,78 ml Nutrition P/Phospho pro Tag dosieren.', 'Phosphat mit dem Heimtest kontrollieren.', 'Bei mehr als 0,03 mg/l PO₄ die Tagesmenge reduzieren.'],
  },
  {
    key: 'ati-nitrate-394770', groupKey: 'nutrients', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Nitrat anheben', parameterKeys: ['nitrate'],
    summary: 'Täglich 1,89 ml Nutrition N/Nitro dosieren. Die Menge reduzieren, sobald der Nitratwert 2 mg/l überschreitet.',
    why: 'ATI bewertete Nitrat mit 0,06 mg/l als unter Soll.',
    steps: ['1,89 ml Nutrition N/Nitro pro Tag dosieren.', 'Nitrat regelmäßig kontrollieren.', 'Bei mehr als 2 mg/l die Tagesmenge reduzieren.'],
  },
  {
    key: 'ati-fluoride-394770', groupKey: 'basis', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Fluorid und Iod versorgen', parameterKeys: ['fluoride', 'iodine'],
    summary: 'Wenn Fluorid und Iod regelmäßig zu niedrig sind, empfehlen wir die tägliche Verwendung von „Daily Traces B“.',
    why: 'ATI bewertete Fluorid mit 0,94 mg/l als unter Soll.',
    steps: ['„Daily Traces B“ täglich verwenden.', 'Fluorid und Iod gemeinsam kontrollieren.'],
  },
]

export function createReport394770() {
  const issues = [
    'Calcium unter Soll', 'Kalium unter Soll', 'Fluorid unter Soll', 'Silizium nicht nachweisbar',
    'Mangan nicht nachweisbar', 'Zink kritisch niedrig', 'Nitrat unter Soll',
    'Phosphor kritisch niedrig', 'Phosphat kritisch niedrig',
  ]
  return {
    id: REPORT_394770_ID,
    scenario: 'real-ati-394770',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'ID 394770',
    reportNumber: '394770',
    aquariumName: 'Nyos Opus G2 440 LPS',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 87,
    resultLevel: 'watch',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 100, quantity: 93, trace: 87, pollutants: 100 },
    createdAt: '2026-09-25T06:23:22+02:00',
    receivedAt: '2026-09-25T08:00:00+02:00',
    completedAt: '2026-09-25T12:00:00+02:00',
    aquariumId: REPORT_394770_AQUARIUM_ID,
    sample: { voucherCode: 'ID 394770', type: 'Meerwasser', comment: 'Nyos Opus G2 440 LPS', receivedAt: '2026-09-25T08:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '394770' },
    parameters: REPORT_394770_ROWS.map(labParameter),
    recommendations: RECOMMENDATIONS_394770.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_394770.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'calcium', totalMl: 56.41, portions: [28.2, 28.2] },
        { key: 'potassium', totalMl: 116.63, portions: [29.16, 29.16, 29.16, 29.16] },
        { key: 'zinc', totalMl: 0.78, portions: [0.39, 0.39] },
        { key: 'manganese', totalMl: 0.97, portions: [0.97] },
        { key: 'fluoride', totalMl: 74.21, portions: [37.11, 37.11] },
      ],
      supplements: [
        { key: 'calcium', totalMl: 56.41, portions: [28.2, 28.2] },
        { key: 'potassium', totalMl: 116.63, portions: [29.16, 29.16, 29.16, 29.16] },
        { key: 'zinc', totalMl: 3.88, portions: [3.88] },
        { key: 'manganese', totalMl: 1.94, portions: [1.94] },
        { key: 'fluoride', totalMl: 74.21, portions: [37.11, 37.11] },
      ],
    },
  }
}

/* ───────────────────────── 394091 · Meerwasser xxl ───────────────────────── */

export const REPORT_394091_ID = 'ati-real-394091'
export const REPORT_394091_AQUARIUM_ID = 'demo-meerwasser-xxl'
export const REPORT_394091_OSMOSIS_ID = 'demo-meerwasser-xxl-osmose'

const CSV_394091 = `
"Salinity";"Sal. total";"33,79";"35,00";"-1,21";"PSU";"o"
"Carbonate hardness";"KH";"7,73";"7,50";"+0,23";"dKH";"o"
"Chloride";"Cl";"19060,60";"18927,50";"+133,10";"mg/l";"o"
"Sodium";"Na";"10441,40";"10515,30";"-73,90";"mg/l";"o"
"Magnesium";"Mg";"1258,13";"1257,06";"+1,07";"mg/l";"o"
"Sulfur";"S";"879,72";"869,90";"+9,82";"mg/l";"o"
"Calcium";"Ca";"534,03";"402,45";"+131,58";"mg/l";"++"
"Potassium";"K";"399,63";"390,02";"+9,61";"mg/l";"o"
"Bromine";"Br";"68,31";"64,05";"+4,26";"mg/l";"o"
"Strontium";"Sr";"10,17";"7,74";"+2,43";"mg/l";"+"
"Boron";"B";"4,08";"4,30";"+-0,22";"mg/l";"o"
"Fluorine";"F";"1,06";"1,24";"+-0,19";"mg/l";"o"
"Lithium";"Li";"196,00";"162,51";"+33,49";"ug/l";"o"
"Silicon";"Si";"177,12";"95,59";"+81,53";"ug/l";"o"
"Iodine";"I";"74,40";"62,14";"+12,26";"ug/l";"o"
"Barium";"Ba";"18,30";"9,56";"+8,74";"ug/l";"o"
"Molybdenum";"Mo";"106,63";"11,47";"+95,16";"ug/l";"++"
"Nickel";"Ni";"1,04";"0,48";"+0,57";"ug/l";"o"
"Manganese";"Mn";"2,87";"0,96";"+1,91";"ug/l";"o"
"Arsenic";"As";"0,00";"0,48";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,48";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,66";"0,10";"+0,57";"ug/l";"o"
"Iron";"Fe";"0,00";"0,48";"0,00";"ug/l";"n.n."
"Copper";"Cu";"0,00";"0,48";"0,00";"ug/l";"n.n."
"Selenium";"Se";"0,00";"0,48";"0,00";"ug/l";"n.n."
"Silver";"Ag";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Vanadium";"V";"1,90";"1,43";"+0,46";"ug/l";"o"
"Zinc";"Zn";"1,57";"1,91";"+-0,34";"ug/l";"o"
"Tin";"Sn";"0,00";"0,48";"0,00";"ug/l";"n.n."
"Nitrate";"NO3";"39,66";"2,00";"+37,66";"mg/l";"+"
"Phosphorus";"P";"337,00";"14,34";"+322,66";"ug/l";"++"
"Phosphate";"PO4";"1,03";"0,04";"+0,99";"mg/l";"++"
"Aluminium";"Al.";"5,85";"0,10";"+5,75";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,19";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_394091_ROWS = Object.freeze(parseCsv(CSV_394091, { belowNormal: { iron: '-' } }))

const RECOMMENDATIONS_394091 = [
  {
    key: 'ati-molybdenum-394091', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Molybdän über Wasserwechsel senken', parameterKeys: ['molybdenum'],
    summary: 'Drei Wasserwechsel von je 20 % mit natürlichem Meerwasser oder „Absolute Ocean“ im Wochenrhythmus durchführen.',
    why: 'ATI bewertete Molybdän mit 106,63 µg/l als kritisch hoch.',
    steps: ['Drei Wasserwechsel von je 20 % ansetzen.', 'Im Wochenrhythmus durchführen.', 'Molybdän danach erneut messen.'],
  },
  {
    key: 'ati-phosphorus-394091', groupKey: 'nutrients', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Phosphor senken', parameterKeys: ['phosphorus', 'phosphate'],
    summary: 'Phosphor ist zu hoch. Filterung verbessern und/oder Futtermenge reduzieren. Einen eisenbasierten PO₄-Adsorber (zum Beispiel ATI Phosphate Stop) einsetzen, um den Phosphorwert auf 13–17 µg/l zu senken.',
    why: 'ATI bewertete Phosphor mit 337,00 µg/l und Phosphat mit 1,03 mg/l als kritisch hoch.',
    steps: ['Filterung verbessern und Futtereintrag reduzieren.', 'Eisenbasierten PO₄-Adsorber einsetzen.', 'Phosphor auf 13–17 µg/l zurückführen.'],
  },
  {
    key: 'ati-calcium-394091', groupKey: 'quantity', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Calciumzufuhr stoppen', parameterKeys: ['calcium'],
    summary: 'Calciumzugabe stoppen, um den Wert auf 410–440 mg/l (35 PSU) zu senken. Mehrere Wasserwechsel mit Absolute Ocean beschleunigen die Korrektur.',
    why: 'ATI bewertete Calcium mit 534,03 mg/l als kritisch hoch.',
    steps: ['Calciumzugabe stoppen.', 'Mehrere Wasserwechsel mit Absolute Ocean durchführen.', 'Wert auf 410–440 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-strontium-394091', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Strontiumzufuhr reduzieren', parameterKeys: ['strontium'],
    summary: 'Strontiumzugabe reduzieren oder stoppen, um den Wert auf 7,8–8,2 mg/l (35 PSU) zu senken.',
    why: 'ATI bewertete Strontium mit 10,17 mg/l als erhöht.',
    steps: ['Strontiumzugabe reduzieren oder stoppen.', 'Wert auf 7,8–8,2 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-nitrate-394091', groupKey: 'nutrients', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Nitrat leicht senken', parameterKeys: ['nitrate'],
    summary: 'Nitrat ist leicht zu hoch. Filterung verbessern und/oder Futtermenge reduzieren.',
    why: 'ATI bewertete Nitrat mit 39,66 mg/l als erhöht.',
    steps: ['Filterung verbessern.', 'Futtermenge reduzieren.'],
  },
  {
    key: 'ati-osmosis-394091', groupKey: 'trace', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Mischbettharz vergrößern', parameterKeys: ['zinc', 'manganese'],
    summary: 'Das Volumen des Mischbettharzfilters reicht möglicherweise nicht aus. Je 120 Liter Tagesleistung der Osmoseanlage sollte 1 Liter Mischbettharz eingesetzt werden.',
    why: 'Die Osmoseprobe zeigt Mangan mit 1,01 µg/l und Zink mit 2,25 µg/l kritisch hoch.',
    steps: ['Tagesleistung der Osmoseanlage bestimmen.', 'Je 120 l Tagesleistung 1 l Mischbettharz einsetzen.', 'Osmosewasser erneut prüfen.'],
  },
]

export function createReport394091() {
  const issues = [
    'Calcium kritisch hoch', 'Strontium über Soll', 'Molybdän kritisch hoch',
    'Eisen nicht nachweisbar', 'Nitrat über Soll', 'Phosphor kritisch hoch', 'Phosphat kritisch hoch',
    'Osmosewasser: Mangan und Zink kritisch hoch',
  ]
  return {
    id: REPORT_394091_ID,
    scenario: 'real-ati-394091',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'WN8T-E57B-LUBJ-L8WV',
    reportNumber: '394091',
    aquariumName: 'Meerwasser xxl',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 88,
    resultLevel: 'watch',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 100, quantity: 88, trace: 88, pollutants: 100 },
    createdAt: '2026-09-20T12:00:00+02:00',
    receivedAt: '2026-09-23T12:00:00+02:00',
    completedAt: '2026-09-24T09:01:54+02:00',
    aquariumId: REPORT_394091_AQUARIUM_ID,
    osmoseAquariumId: REPORT_394091_OSMOSIS_ID,
    sample: { voucherCode: 'WN8T-E57B-LUBJ-L8WV', type: 'Meerwasser', comment: 'Meerwasser xxl', receivedAt: '2026-09-23T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '394091' },
    parameters: REPORT_394091_ROWS.map(labParameter),
    osmosisParameters: osmosisRows({ manganese: 1.01, zinc: 2.25 }, OSMOSIS_KEYS).map(labParameter),
    recommendations: RECOMMENDATIONS_394091.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_394091.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [{ key: 'iron', totalMl: 0.75, portions: [0.75] }],
      supplements: [{ key: 'iron', totalMl: 1.49, portions: [0.3, 0.3, 0.3, 0.3, 0.3] }],
    },
  }
}

/* ───────────────────────── 394456 · Meerwasser55 ───────────────────────── */

export const REPORT_394456_ID = 'ati-real-394456'
export const REPORT_394456_AQUARIUM_ID = 'demo-meerwasser-55'

const CSV_394456 = `
"Salinity";"Sal. total";"32,90";"35,00";"-2,10";"PSU";"-"
"Carbonate hardness";"KH";"5,27";"7,50";"-2,23";"dKH";"--"
"Chloride";"Cl";"18492,50";"18320,70";"+171,80";"mg/l";"o"
"Sodium";"Na";"10082,80";"10178,20";"-95,40";"mg/l";"o"
"Magnesium";"Mg";"1338,39";"1216,76";"+121,63";"mg/l";"o"
"Sulfur";"S";"925,65";"842,01";"+83,63";"mg/l";"+"
"Calcium";"Ca";"365,93";"389,55";"-23,62";"mg/l";"o"
"Potassium";"K";"405,13";"377,52";"+27,61";"mg/l";"o"
"Bromine";"Br";"62,67";"61,99";"+0,67";"mg/l";"o"
"Strontium";"Sr";"6,98";"7,49";"+-0,52";"mg/l";"o"
"Boron";"B";"4,33";"4,16";"+0,17";"mg/l";"o"
"Fluorine";"F";"1,16";"1,20";"+-0,04";"mg/l";"o"
"Lithium";"Li";"174,59";"157,30";"+17,29";"ug/l";"o"
"Silicon";"Si";"55,47";"92,53";"-37,06";"ug/l";"o"
"Iodine";"I";"29,67";"60,14";"-30,47";"ug/l";"-"
"Barium";"Ba";"8,73";"9,25";"+-0,53";"ug/l";"o"
"Molybdenum";"Mo";"10,20";"11,10";"+-0,91";"ug/l";"o"
"Nickel";"Ni";"0,83";"0,46";"+0,37";"ug/l";"o"
"Manganese";"Mn";"0,00";"0,93";"0,00";"ug/l";"n.n."
"Arsenic";"As";"0,00";"0,46";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,09";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,46";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,64";"0,09";"+0,55";"ug/l";"o"
"Iron";"Fe";"0,00";"0,46";"0,00";"ug/l";"n.n."
"Copper";"Cu";"0,00";"0,46";"0,00";"ug/l";"n.n."
"Selenium";"Se";"0,00";"0,46";"0,00";"ug/l";"n.n."
"Silver";"Ag";"0,00";"0,09";"0,00";"ug/l";"n.n."
"Vanadium";"V";"0,72";"1,39";"+-0,67";"ug/l";"o"
"Zinc";"Zn";"0,00";"1,85";"0,00";"ug/l";"n.n."
"Tin";"Sn";"0,00";"0,46";"0,00";"ug/l";"n.n."
"Nitrate";"NO3";"3,30";"2,00";"+1,30";"mg/l";"o"
"Phosphorus";"P";"13,28";"13,88";"+-0,60";"ug/l";"o"
"Phosphate";"PO4";"0,04";"0,04";"+0,00";"mg/l";"o"
"Aluminium";"Al.";"13,74";"0,09";"+13,65";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,09";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,09";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,09";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,19";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,09";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,09";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_394456_ROWS = Object.freeze(parseCsv(CSV_394456, {
  belowNormal: { manganese: '-', iron: '-', zinc: '--' },
}))

const RECOMMENDATIONS_394456 = [
  {
    key: 'ati-zinc-394456', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Spurenelemente täglich versorgen', parameterKeys: ['zinc', 'manganese', 'iron'],
    summary: 'Wenn Chrom, Cobalt, Eisen, Kupfer, Mangan, Nickel und Zink regelmäßig zu niedrig sind, empfehlen wir die tägliche Dosierung von „Daily Traces A“.',
    why: 'ATI bewertete Zink als kritisch niedrig sowie Mangan und Eisen als unter Soll.',
    steps: ['„Daily Traces A“ täglich dosieren.', 'Spurenelemente bei der nächsten Analyse gemeinsam kontrollieren.'],
  },
  {
    key: 'ati-kh-394456', groupKey: 'basis', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Karbonathärte anheben', parameterKeys: ['kh'],
    summary: 'Die Karbonathärte auf 7 bis 8 °dKH anheben.',
    why: 'ATI bewertete die Karbonathärte mit 5,27 °dKH als kritisch niedrig.',
    steps: ['KH-Versorgung in kleinen Schritten erhöhen.', 'Tagesanstieg begrenzen.', 'Auf 7–8 °dKH zurückführen.'],
  },
  {
    key: 'ati-sulfur-394456', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Schwefelzufuhr stoppen', parameterKeys: ['sulfur'],
    summary: 'Schwefelzugabe stoppen, um den Wert auf 900–920 mg/l (35 PSU) zu senken.',
    why: 'ATI bewertete Schwefel mit 925,65 mg/l als erhöht.',
    steps: ['Schwefelzugabe stoppen.', 'Wert auf 900–920 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-salinity-394456', groupKey: 'basis', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Salinität anheben', parameterKeys: ['salinity'],
    summary: 'Die Salinität auf 35 PSU anheben. Zum Beispiel 2061 ml Absolute Ocean #1 und 2061 ml Absolute Ocean #2 zugeben.',
    why: 'ATI bewertete die Salinität mit 32,90 PSU als unter Soll.',
    steps: ['2061 ml Absolute Ocean #1 zugeben.', '2061 ml Absolute Ocean #2 zugeben.', 'Salinität schrittweise auf 35 PSU führen.'],
  },
]

export function createReport394456() {
  const issues = [
    'Salinität unter Soll', 'Karbonathärte kritisch niedrig', 'Schwefel über Soll',
    'Iod unter Soll', 'Mangan nicht nachweisbar', 'Eisen nicht nachweisbar', 'Zink kritisch niedrig',
  ]
  return {
    id: REPORT_394456_ID,
    scenario: 'real-ati-394456',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'R5XC-GYH6-X6MG-7AGC',
    reportNumber: '394456',
    aquariumName: 'Meerwasser55',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 58,
    resultLevel: 'critical',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 58, quantity: 98, trace: 86, pollutants: 100 },
    createdAt: '2026-09-22T12:00:00+02:00',
    receivedAt: '2026-09-23T12:00:00+02:00',
    completedAt: '2026-09-24T11:11:03+02:00',
    aquariumId: REPORT_394456_AQUARIUM_ID,
    sample: { voucherCode: 'R5XC-GYH6-X6MG-7AGC', type: 'Meerwasser', comment: 'Meerwasser55', receivedAt: '2026-09-23T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '394456' },
    parameters: REPORT_394456_ROWS.map(labParameter),
    osmosisParameters: osmosisRows({}, OSMOSIS_KEYS).map(labParameter),
    recommendations: RECOMMENDATIONS_394456.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_394456.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'iodine', totalMl: 17.49, portions: [8.74, 8.74] },
        { key: 'zinc', totalMl: 1.06, portions: [1.06] },
        { key: 'manganese', totalMl: 1.33, portions: [1.33] },
        { key: 'iron', totalMl: 0.66, portions: [0.66] },
        { key: 'kh', totalMl: 128.19, portions: [128.19] },
      ],
      supplements: [
        { key: 'iodine', totalMl: 17.49, portions: [8.74, 8.74] },
        { key: 'zinc', totalMl: 5.31, portions: [5.31] },
        { key: 'manganese', totalMl: 2.66, portions: [2.66] },
        { key: 'iron', totalMl: 1.33, portions: [0.27, 0.27, 0.27, 0.27, 0.27] },
      ],
    },
  }
}

/* ────────────────────── 394515 · Wolfis Aquarium 500 ────────────────────── */

export const REPORT_394515_ID = 'ati-real-394515'
export const REPORT_394515_AQUARIUM_ID = 'demo-wolfis-aquarium-500'
export const REPORT_394515_OSMOSIS_ID = 'demo-wolfis-aquarium-500-osmose'

const CSV_394515 = `
"Salinity";"Sal. total";"34,22";"35,00";"+-0,78";"PSU";"o"
"Carbonate hardness";"KH";"7,17";"7,50";"+-0,33";"dKH";"o"
"Chloride";"Cl";"19348,80";"19224,40";"+124,40";"mg/l";"o"
"Sodium";"Na";"10611,10";"10680,20";"-69,10";"mg/l";"o"
"Magnesium";"Mg";"1365,58";"1276,77";"+88,81";"mg/l";"o"
"Sulfur";"S";"897,07";"883,55";"+13,52";"mg/l";"o"
"Calcium";"Ca";"366,20";"408,76";"-42,56";"mg/l";"-"
"Potassium";"K";"425,00";"396,14";"+28,86";"mg/l";"o"
"Bromine";"Br";"69,10";"65,05";"+4,05";"mg/l";"o"
"Strontium";"Sr";"7,32";"7,86";"+-0,54";"mg/l";"o"
"Boron";"B";"4,23";"4,37";"+-0,14";"mg/l";"o"
"Fluorine";"F";"1,17";"1,26";"+-0,09";"mg/l";"o"
"Lithium";"Li";"305,86";"165,06";"+140,81";"ug/l";"o"
"Silicon";"Si";"85,54";"97,09";"-11,55";"ug/l";"o"
"Iodine";"I";"30,06";"63,11";"-33,05";"ug/l";"-"
"Barium";"Ba";"7,87";"9,71";"-1,84";"ug/l";"o"
"Molybdenum";"Mo";"14,12";"11,65";"+2,47";"ug/l";"o"
"Nickel";"Ni";"1,27";"0,49";"+0,79";"ug/l";"o"
"Manganese";"Mn";"0,00";"0,97";"0,00";"ug/l";"n.n."
"Arsenic";"As";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Iron";"Fe";"0,80";"0,49";"+0,31";"ug/l";"o"
"Copper";"Cu";"2,06";"0,49";"+1,57";"ug/l";"o"
"Selenium";"Se";"2,07";"0,49";"+1,59";"ug/l";"o"
"Silver";"Ag";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Vanadium";"V";"8,49";"1,46";"+7,04";"ug/l";"+"
"Zinc";"Zn";"4,10";"1,94";"+2,16";"ug/l";"o"
"Tin";"Sn";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Nitrate";"NO3";"0,02";"2,00";"-1,98";"mg/l";"-"
"Phosphorus";"P";"9,80";"14,56";"-4,76";"ug/l";"-"
"Phosphate";"PO4";"0,03";"0,04";"+-0,01";"mg/l";"-"
"Aluminium";"Al.";"45,94";"0,10";"+45,84";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,19";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_394515_ROWS = Object.freeze(parseCsv(CSV_394515, { belowNormal: { manganese: '-' } }))

const RECOMMENDATIONS_394515 = [
  {
    key: 'ati-phosphorus-394515', groupKey: 'nutrients', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Phosphor anheben', parameterKeys: ['phosphorus', 'phosphate'],
    summary: 'Täglich 2,88 ml Nutrition P/Phospho dosieren. Die Menge reduzieren, sobald der Heimtest mehr als 0,03 mg/l PO₄ anzeigt.',
    why: 'ATI bewertete Phosphor mit 9,80 µg/l und Phosphat mit 0,03 mg/l als unter Soll.',
    steps: ['2,88 ml Nutrition P/Phospho pro Tag dosieren.', 'Phosphat mit dem Heimtest kontrollieren.', 'Bei mehr als 0,03 mg/l PO₄ die Tagesmenge reduzieren.'],
  },
  {
    key: 'ati-nitrate-394515', groupKey: 'nutrients', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Nitrat anheben', parameterKeys: ['nitrate'],
    summary: 'Täglich 2,88 ml Nutrition N/Nitro dosieren. Die Menge reduzieren, sobald der Nitratwert 2 mg/l überschreitet.',
    why: 'ATI bewertete Nitrat mit 0,02 mg/l als unter Soll.',
    steps: ['2,88 ml Nutrition N/Nitro pro Tag dosieren.', 'Nitrat regelmäßig kontrollieren.', 'Bei mehr als 2 mg/l die Tagesmenge reduzieren.'],
  },
  {
    key: 'ati-silicon-394515', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Osmoseanlage warten', parameterKeys: ['silicon'],
    summary: 'Osmoseanlage warten beziehungsweise das Mischbettharz tauschen.',
    why: 'Die Osmoseprobe zeigt Silizium mit 1572 µg/l und Zink mit 3,56 µg/l kritisch hoch.',
    steps: ['Mischbettharz tauschen.', 'Leitwert direkt nach dem Harz messen.', 'Osmosewasser erneut prüfen.'],
  },
]

export function createReport394515() {
  const issues = [
    'Calcium unter Soll', 'Iod unter Soll', 'Mangan nicht nachweisbar', 'Vanadium über Soll',
    'Nitrat unter Soll', 'Phosphor unter Soll', 'Phosphat unter Soll',
    'Osmosewasser: Silizium und Zink kritisch hoch',
  ]
  return {
    id: REPORT_394515_ID,
    scenario: 'real-ati-394515',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'SGKB-EUY5-BSYD-H4Q8',
    reportNumber: '394515',
    aquariumName: 'Wolfis Aquarium 500',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 91,
    resultLevel: 'good',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 100, quantity: 98, trace: 91, pollutants: 100 },
    createdAt: '2026-09-22T12:00:00+02:00',
    receivedAt: '2026-09-24T12:00:00+02:00',
    completedAt: '2026-09-24T21:41:37+02:00',
    aquariumId: REPORT_394515_AQUARIUM_ID,
    osmoseAquariumId: REPORT_394515_OSMOSIS_ID,
    sample: { voucherCode: 'SGKB-EUY5-BSYD-H4Q8', type: 'Meerwasser', comment: 'Wolfis Aquarium 500', receivedAt: '2026-09-24T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '394515' },
    parameters: REPORT_394515_ROWS.map(labParameter),
    osmosisParameters: osmosisRows({ silicon: 1572, zinc: 3.56 }, OSMOSIS_KEYS).map(labParameter),
    recommendations: RECOMMENDATIONS_394515.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_394515.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'iodine', totalMl: 19.01, portions: [9.5, 9.5] },
        { key: 'calcium', totalMl: 122.35, portions: [40.78, 40.78, 40.78] },
        { key: 'manganese', totalMl: 1.4, portions: [1.4] },
      ],
      supplements: [
        { key: 'iodine', totalMl: 19.01, portions: [9.5, 9.5] },
        { key: 'calcium', totalMl: 122.35, portions: [40.78, 40.78, 40.78] },
        { key: 'manganese', totalMl: 2.79, portions: [2.79] },
      ],
    },
  }
}

/* ────────────────────────── 392933 · Mia's Reef ────────────────────────── */

export const REPORT_392933_ID = 'ati-real-392933'
export const REPORT_392933_AQUARIUM_ID = 'demo-mias-reef'

const CSV_392933 = `
"Salinity";"Sal. total";"29,91";"35,00";"-5,09";"PSU";"--"
"Carbonate hardness";"KH";"9,24";"7,50";"+1,74";"dKH";"+"
"Chloride";"Cl";"17025,90";"16173,50";"+852,40";"mg/l";"+"
"Sodium";"Na";"8511,68";"8985,26";"-473,58";"mg/l";"-"
"Magnesium";"Mg";"1561,68";"1074,15";"+487,53";"mg/l";"++"
"Sulfur";"S";"741,65";"743,33";"-1,68";"mg/l";"o"
"Calcium";"Ca";"419,64";"343,89";"+75,75";"mg/l";"++"
"Potassium";"K";"340,73";"333,27";"+7,46";"mg/l";"o"
"Bromine";"Br";"62,17";"54,73";"+7,44";"mg/l";"o"
"Strontium";"Sr";"11,27";"6,62";"+4,65";"mg/l";"++"
"Boron";"B";"3,41";"3,68";"+-0,27";"mg/l";"o"
"Fluorine";"F";"0,60";"1,06";"+-0,46";"mg/l";"-"
"Lithium";"Li";"458,07";"138,86";"+319,21";"ug/l";"+"
"Silicon";"Si";"88,17";"81,68";"+6,48";"ug/l";"o"
"Iodine";"I";"0,00";"53,09";"0,00";"ug/l";"n.n."
"Barium";"Ba";"40,71";"8,17";"+32,54";"ug/l";"o"
"Molybdenum";"Mo";"13,29";"9,80";"+3,48";"ug/l";"o"
"Nickel";"Ni";"3,25";"0,41";"+2,84";"ug/l";"o"
"Manganese";"Mn";"0,00";"0,82";"0,00";"ug/l";"n.n."
"Arsenic";"As";"0,00";"0,41";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,08";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,41";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,00";"0,08";"0,00";"ug/l";"n.n."
"Iron";"Fe";"0,00";"0,41";"0,00";"ug/l";"n.n."
"Copper";"Cu";"1,57";"0,41";"+1,17";"ug/l";"o"
"Selenium";"Se";"2,11";"0,41";"+1,70";"ug/l";"o"
"Silver";"Ag";"0,00";"0,08";"0,00";"ug/l";"n.n."
"Vanadium";"V";"2,55";"1,23";"+1,33";"ug/l";"o"
"Zinc";"Zn";"1,63";"1,63";"+-0,01";"ug/l";"o"
"Tin";"Sn";"1,10";"0,41";"+0,69";"ug/l";"o"
"Nitrate";"NO3";"9,79";"2,00";"+7,79";"mg/l";"o"
"Phosphorus";"P";"8,86";"12,25";"-3,39";"ug/l";"-"
"Phosphate";"PO4";"0,03";"0,04";"+-0,01";"mg/l";"-"
"Aluminium";"Al.";"35,91";"0,08";"+35,83";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,08";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,08";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,08";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,16";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,08";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,08";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_392933_ROWS = Object.freeze(parseCsv(CSV_392933, {
  belowNormal: { iodine: '--', manganese: '-', iron: '-' },
}))

const RECOMMENDATIONS_392933 = [
  {
    key: 'ati-magnesium-392933', groupKey: 'quantity', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Magnesiumzufuhr stoppen', parameterKeys: ['magnesium'],
    summary: 'Magnesiumzugabe stoppen, um den Wert auf 1300–1350 mg/l (35 PSU) zu senken. Mehrere Wasserwechsel mit Absolute Ocean beschleunigen die Korrektur.',
    why: 'ATI bewertete Magnesium mit 1561,68 mg/l als kritisch hoch.',
    steps: ['Magnesiumzugabe stoppen.', 'Mehrere Wasserwechsel mit Absolute Ocean durchführen.', 'Wert auf 1300–1350 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-strontium-392933', groupKey: 'quantity', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Strontiumzufuhr stoppen', parameterKeys: ['strontium'],
    summary: 'Strontiumzugabe stoppen, um den Wert auf 7,8–8,2 mg/l zu senken. Mehrere Wasserwechsel mit Absolute Ocean beschleunigen die Korrektur.',
    why: 'ATI bewertete Strontium mit 11,27 mg/l als kritisch hoch.',
    steps: ['Strontiumzugabe stoppen.', 'Mehrere Wasserwechsel mit Absolute Ocean durchführen.', 'Wert auf 7,8–8,2 mg/l zurückführen.'],
  },
  {
    key: 'ati-calcium-392933', groupKey: 'quantity', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Calciumzufuhr stoppen', parameterKeys: ['calcium'],
    summary: 'Calciumzugabe stoppen, um den Wert auf 410–440 mg/l (35 PSU) zu senken. Mehrere Wasserwechsel mit Absolute Ocean beschleunigen die Korrektur.',
    why: 'ATI bewertete Calcium mit 419,64 mg/l als kritisch hoch.',
    steps: ['Calciumzugabe stoppen.', 'Mehrere Wasserwechsel mit Absolute Ocean durchführen.', 'Wert auf 410–440 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-salinity-392933', groupKey: 'basis', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Salinität anheben', parameterKeys: ['salinity'],
    summary: 'Die Salinität auf 35 PSU anheben. Zum Beispiel 1811 ml Absolute Ocean #1 und 1811 ml Absolute Ocean #2 zugeben.',
    why: 'ATI bewertete die Salinität mit 29,91 PSU als kritisch niedrig.',
    steps: ['1811 ml Absolute Ocean #1 zugeben.', '1811 ml Absolute Ocean #2 zugeben.', 'Salinität schrittweise auf 35 PSU führen.'],
  },
  {
    key: 'ati-lithium-392933', groupKey: 'trace', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Lithium beobachten', parameterKeys: ['lithium'],
    summary: 'Lithium ist erhöht. Steigt der Wert weiter, sollte er über wöchentliche Wasserwechsel mit Absolute Ocean gesenkt werden.',
    why: 'ATI bewertete Lithium mit 458,07 µg/l als erhöht.',
    steps: ['Lithium bei der nächsten Analyse erneut prüfen.', 'Bei weiterem Anstieg wöchentliche Wasserwechsel mit Absolute Ocean durchführen.'],
  },
  {
    key: 'ati-phosphorus-392933', groupKey: 'nutrients', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Phosphor anheben', parameterKeys: ['phosphorus', 'phosphate'],
    summary: 'Täglich 1,04 ml Nutrition P/Phospho dosieren. Die Menge reduzieren, sobald der Heimtest mehr als 0,03 mg/l PO₄ anzeigt.',
    why: 'ATI bewertete Phosphor mit 8,86 µg/l und Phosphat mit 0,03 mg/l als unter Soll.',
    steps: ['1,04 ml Nutrition P/Phospho pro Tag dosieren.', 'Phosphat mit dem Heimtest kontrollieren.', 'Bei mehr als 0,03 mg/l PO₄ die Tagesmenge reduzieren.'],
  },
  {
    key: 'ati-kh-392933', groupKey: 'basis', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Karbonathärte senken', parameterKeys: ['kh'],
    summary: 'KH-Zugabe reduzieren oder stoppen, um den Wert auf 7–8 °dKH zu senken.',
    why: 'ATI bewertete die Karbonathärte mit 9,24 °dKH als erhöht.',
    steps: ['KH-Zugabe reduzieren oder stoppen.', 'Wert auf 7–8 °dKH zurückführen.'],
  },
  {
    key: 'ati-fluoride-392933', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Fluorid und Iod versorgen', parameterKeys: ['fluoride', 'iodine'],
    summary: 'Wenn Fluorid und Iod regelmäßig zu niedrig sind, empfehlen wir die tägliche Verwendung von „Daily Traces B“.',
    why: 'ATI bewertete Fluorid mit 0,60 mg/l als unter Soll und Iod als kritisch niedrig.',
    steps: ['„Daily Traces B“ täglich verwenden.', 'Fluorid und Iod gemeinsam kontrollieren.'],
  },
]

export function createReport392933() {
  const issues = [
    'Salinität kritisch niedrig', 'Karbonathärte über Soll', 'Chlorid über Soll', 'Natrium unter Soll',
    'Magnesium kritisch hoch', 'Calcium kritisch hoch', 'Strontium kritisch hoch', 'Fluorid unter Soll',
    'Lithium über Soll', 'Iod kritisch niedrig', 'Mangan nicht nachweisbar', 'Eisen nicht nachweisbar',
    'Phosphor unter Soll', 'Phosphat unter Soll',
  ]
  return {
    id: REPORT_392933_ID,
    scenario: 'real-ati-392933',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'HE7H-MG77-8BJK-XVEW',
    reportNumber: '392933',
    aquariumName: "Mia's Reef",
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 25,
    resultLevel: 'critical',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 25, quantity: 63, trace: 86, pollutants: 100 },
    createdAt: '2026-09-11T12:00:00+02:00',
    receivedAt: '2026-09-23T12:00:00+02:00',
    completedAt: '2026-09-24T07:29:50+02:00',
    aquariumId: REPORT_392933_AQUARIUM_ID,
    sample: { voucherCode: 'HE7H-MG77-8BJK-XVEW', type: 'Meerwasser', comment: "Mia's Reef", receivedAt: '2026-09-23T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '392933' },
    parameters: REPORT_392933_ROWS.map(labParameter),
    osmosisParameters: osmosisRows({}, OSMOSIS_KEYS).map(labParameter),
    recommendations: RECOMMENDATIONS_392933.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_392933.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'iodine', totalMl: 11.04, portions: [3.68, 3.68, 3.68] },
        { key: 'manganese', totalMl: 0.42, portions: [0.42] },
        { key: 'iron', totalMl: 0.21, portions: [0.21] },
        { key: 'fluoride', totalMl: 48.04, portions: [24.02, 24.02] },
      ],
      supplements: [
        { key: 'iodine', totalMl: 11.04, portions: [3.68, 3.68, 3.68] },
        { key: 'manganese', totalMl: 0.85, portions: [0.85] },
        { key: 'iron', totalMl: 0.42, portions: [0.08, 0.08, 0.08, 0.08, 0.08] },
        { key: 'fluoride', totalMl: 48.04, portions: [24.02, 24.02] },
      ],
    },
  }
}

/* ──────────────────── 393984 · Red Sea Nano Test Flawil ─────────────────── */

export const REPORT_393984_ID = 'ati-real-393984'
export const REPORT_393984_AQUARIUM_ID = 'demo-red-sea-nano'
export const REPORT_393984_OSMOSIS_ID = 'demo-red-sea-nano-osmose'

const CSV_393984 = `
"Salinity";"Sal. total";"34,25";"35,00";"+-0,75";"PSU";"o"
"Carbonate hardness";"KH";"8,75";"7,50";"+1,25";"dKH";"o"
"Chloride";"Cl";"19818,60";"19427,40";"+391,20";"mg/l";"o"
"Sodium";"Na";"10575,60";"10793,00";"-217,40";"mg/l";"o"
"Magnesium";"Mg";"1237,56";"1290,25";"-52,69";"mg/l";"o"
"Sulfur";"S";"761,99";"892,87";"-130,88";"mg/l";"-"
"Calcium";"Ca";"500,33";"413,08";"+87,26";"mg/l";"++"
"Potassium";"K";"395,83";"400,32";"-4,49";"mg/l";"o"
"Bromine";"Br";"62,74";"65,74";"-3,00";"mg/l";"o"
"Strontium";"Sr";"7,82";"7,95";"+-0,13";"mg/l";"o"
"Boron";"B";"4,73";"4,42";"+0,31";"mg/l";"o"
"Fluorine";"F";"0,87";"1,28";"+-0,41";"mg/l";"-"
"Lithium";"Li";"194,63";"166,80";"+27,82";"ug/l";"o"
"Silicon";"Si";"96,81";"98,12";"-1,30";"ug/l";"o"
"Iodine";"I";"26,81";"63,78";"-36,97";"ug/l";"--"
"Barium";"Ba";"1,43";"9,81";"-8,39";"ug/l";"--"
"Molybdenum";"Mo";"18,20";"11,77";"+6,42";"ug/l";"o"
"Nickel";"Ni";"1,64";"0,49";"+1,15";"ug/l";"o"
"Manganese";"Mn";"0,00";"0,98";"0,00";"ug/l";"n.n."
"Arsenic";"As";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,84";"0,10";"+0,74";"ug/l";"o"
"Iron";"Fe";"0,82";"0,49";"+0,33";"ug/l";"o"
"Copper";"Cu";"4,50";"0,49";"+4,01";"ug/l";"o"
"Selenium";"Se";"0,00";"0,49";"0,00";"ug/l";"n.n."
"Silver";"Ag";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Vanadium";"V";"59,45";"1,47";"+57,98";"ug/l";"++"
"Zinc";"Zn";"0,70";"1,96";"-1,26";"ug/l";"-"
"Tin";"Sn";"0,20";"0,49";"+-0,30";"ug/l";"o"
"Nitrate";"NO3";"62,52";"2,00";"+60,52";"mg/l";"++"
"Phosphorus";"P";"126,35";"14,72";"+111,63";"ug/l";"++"
"Phosphate";"PO4";"0,39";"0,04";"+0,34";"mg/l";"++"
"Aluminium";"Al.";"42,20";"0,10";"+42,10";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,20";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,10";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_393984_ROWS = Object.freeze(parseCsv(CSV_393984, { belowNormal: { manganese: '-' } }))

const RECOMMENDATIONS_393984 = [
  {
    key: 'ati-vanadium-393984', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Vanadium über Wasserwechsel senken', parameterKeys: ['vanadium'],
    summary: 'Drei Wasserwechsel von je 20 % mit natürlichem Meerwasser oder „Absolute Ocean“ im Wochenrhythmus durchführen.',
    why: 'ATI bewertete Vanadium mit 59,45 µg/l als kritisch hoch.',
    steps: ['Drei Wasserwechsel von je 20 % ansetzen.', 'Im Wochenrhythmus durchführen.', 'Vanadium danach erneut messen.'],
  },
  {
    key: 'ati-phosphorus-393984', groupKey: 'nutrients', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Phosphor senken', parameterKeys: ['phosphorus', 'phosphate'],
    summary: 'Phosphor ist zu hoch. Filterung verbessern und/oder Futtermenge reduzieren. Einen eisenbasierten PO₄-Adsorber (zum Beispiel ATI Phosphate Stop) einsetzen, um den Phosphorwert auf 13–17 µg/l zu senken.',
    why: 'ATI bewertete Phosphor mit 126,35 µg/l und Phosphat mit 0,39 mg/l als kritisch hoch.',
    steps: ['Filterung verbessern und Futtereintrag reduzieren.', 'Eisenbasierten PO₄-Adsorber einsetzen.', 'Phosphor auf 13–17 µg/l zurückführen.'],
  },
  {
    key: 'ati-calcium-393984', groupKey: 'quantity', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Calciumzufuhr stoppen', parameterKeys: ['calcium'],
    summary: 'Calciumzugabe stoppen, um den Wert auf 410–440 mg/l (35 PSU) zu senken. Mehrere Wasserwechsel mit Absolute Ocean beschleunigen die Korrektur.',
    why: 'ATI bewertete Calcium mit 500,33 mg/l als kritisch hoch.',
    steps: ['Calciumzugabe stoppen.', 'Mehrere Wasserwechsel mit Absolute Ocean durchführen.', 'Wert auf 410–440 mg/l bei 35 PSU zurückführen.'],
  },
  {
    key: 'ati-nitrate-393984', groupKey: 'nutrients', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Nitrat senken', parameterKeys: ['nitrate'],
    summary: 'Der Nitratwert ist erhöht. Filterung optimieren und/oder Futtereintrag reduzieren. Das Osmosewasser auf Nitrat prüfen.',
    why: 'ATI bewertete Nitrat mit 62,52 mg/l als kritisch hoch.',
    steps: ['Filterung optimieren.', 'Futtereintrag reduzieren.', 'Osmosewasser auf Nitrat prüfen.'],
  },
  {
    key: 'ati-zinc-393984', groupKey: 'trace', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Spurenelemente täglich versorgen', parameterKeys: ['zinc', 'manganese'],
    summary: 'Wenn Chrom, Cobalt, Eisen, Kupfer, Mangan, Nickel und Zink regelmäßig zu niedrig sind, empfehlen wir die tägliche Dosierung von „Daily Traces A“.',
    why: 'ATI bewertete Zink und Mangan als unter Soll.',
    steps: ['„Daily Traces A“ täglich dosieren.', 'Spurenelemente bei der nächsten Analyse gemeinsam kontrollieren.'],
  },
  {
    key: 'ati-fluoride-393984', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Fluorid und Iod versorgen', parameterKeys: ['fluoride', 'iodine'],
    summary: 'Wenn Fluorid und Iod regelmäßig zu niedrig sind, empfehlen wir die tägliche Verwendung von „Daily Traces B“.',
    why: 'ATI bewertete Fluorid mit 0,87 mg/l als unter Soll und Iod als kritisch niedrig.',
    steps: ['„Daily Traces B“ täglich verwenden.', 'Fluorid und Iod gemeinsam kontrollieren.'],
  },
  {
    key: 'ati-silicon-393984', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Osmoseanlage warten', parameterKeys: ['silicon'],
    summary: 'Osmoseanlage warten beziehungsweise das Mischbettharz tauschen.',
    why: 'Die Osmoseprobe zeigt Silizium mit 136,4 µg/l kritisch hoch.',
    steps: ['Mischbettharz tauschen.', 'Leitwert direkt nach dem Harz messen.', 'Osmosewasser erneut prüfen.'],
  },
]

export function createReport393984() {
  const issues = [
    'Schwefel unter Soll', 'Calcium kritisch hoch', 'Fluorid unter Soll', 'Iod kritisch niedrig',
    'Barium kritisch niedrig', 'Mangan nicht nachweisbar', 'Vanadium kritisch hoch', 'Zink unter Soll',
    'Nitrat kritisch hoch', 'Phosphor kritisch hoch', 'Phosphat kritisch hoch',
    'Osmosewasser: Silizium kritisch hoch',
  ]
  return {
    id: REPORT_393984_ID,
    scenario: 'real-ati-393984',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'WPJC-N7ME-REDF-SFGR',
    reportNumber: '393984',
    aquariumName: 'Red Sea Nano Test Flawil',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'routine',
    status: 'completed',
    score: 76,
    resultLevel: 'watch',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 100, quantity: 85, trace: 76, pollutants: 100 },
    createdAt: '2026-09-18T12:00:00+02:00',
    receivedAt: '2026-09-23T12:00:00+02:00',
    completedAt: '2026-09-24T06:39:07+02:00',
    aquariumId: REPORT_393984_AQUARIUM_ID,
    osmoseAquariumId: REPORT_393984_OSMOSIS_ID,
    sample: { voucherCode: 'WPJC-N7ME-REDF-SFGR', type: 'Meerwasser', comment: 'Red Sea Nano Test Flawil', receivedAt: '2026-09-23T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '393984' },
    parameters: REPORT_393984_ROWS.map(labParameter),
    osmosisParameters: osmosisRows({ silicon: 136.4 }, OSMOSIS_KEYS).map(labParameter),
    recommendations: RECOMMENDATIONS_393984.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_393984.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'iodine', totalMl: 2.77, portions: [1.39, 1.39] },
        // the laboratory doses sulphur by weight, not by volume
        { key: 'sulfur', totalMl: 43.49, portions: [21.74, 21.74], unit: 'g' },
        { key: 'zinc', totalMl: 0.09, portions: [0.09] },
        { key: 'manganese', totalMl: 0.18, portions: [0.18] },
        { key: 'barium', totalMl: 6.29, portions: [6.29] },
        { key: 'fluoride', totalMl: 15.25, portions: [7.62, 7.62] },
      ],
      supplements: [
        { key: 'iodine', totalMl: 2.77, portions: [1.39, 1.39] },
        { key: 'zinc', totalMl: 0.47, portions: [0.47] },
        { key: 'manganese', totalMl: 0.37, portions: [0.37] },
        { key: 'barium', totalMl: 6.29, portions: [3.14, 3.14] },
        { key: 'fluoride', totalMl: 15.25, portions: [7.62, 7.62] },
      ],
    },
  }
}

/* ───────────────────────── 394949 · NanoRiff ───────────────────────── */

export const REPORT_394949_ID = 'ati-real-394949'
export const REPORT_394949_AQUARIUM_ID = 'demo-nanoriff'
export const REPORT_394949_OSMOSIS_ID = 'demo-nanoriff-osmose'

const CSV_394949 = `
"Salinity";"Sal. total";"36,93";"35,00";"+1,93";"PSU";"+"
"Carbonate hardness";"KH";"14,69";"7,50";"+7,19";"dKH";"++"
"Chloride";"Cl";"20457,80";"20882,30";"-424,50";"mg/l";"o"
"Sodium";"Na";"11837,10";"11601,30";"+235,80";"mg/l";"o"
"Magnesium";"Mg";"1328,98";"1386,88";"-57,90";"mg/l";"o"
"Sulfur";"S";"938,42";"959,74";"-21,32";"mg/l";"o"
"Calcium";"Ca";"429,73";"444,01";"-14,28";"mg/l";"o"
"Potassium";"K";"416,91";"430,30";"-13,40";"mg/l";"o"
"Bromine";"Br";"72,94";"70,66";"+2,28";"mg/l";"o"
"Strontium";"Sr";"7,04";"8,54";"-1,50";"mg/l";"o"
"Boron";"B";"3,67";"4,75";"-1,08";"mg/l";"-"
"Fluorine";"F";"1,01";"1,37";"+-0,36";"mg/l";"-"
"Lithium";"Li";"259,63";"179,29";"+80,34";"ug/l";"o"
"Silicon";"Si";"366,28";"105,47";"+260,81";"ug/l";"+"
"Iodine";"I";"25,00";"68,55";"-43,55";"ug/l";"--"
"Barium";"Ba";"98,19";"10,55";"+87,65";"ug/l";"+"
"Molybdenum";"Mo";"23,75";"12,66";"+11,10";"ug/l";"o"
"Nickel";"Ni";"1,65";"0,53";"+1,12";"ug/l";"o"
"Manganese";"Mn";"0,00";"1,05";"0,00";"ug/l";"n.n."
"Arsenic";"As";"0,00";"0,53";"0,00";"ug/l";"n.n."
"Beryllium";"Be";"0,00";"0,11";"0,00";"ug/l";"n.n."
"Chrome";"Cr";"0,00";"0,53";"0,00";"ug/l";"n.n."
"Cobalt";"Co";"0,00";"0,11";"0,00";"ug/l";"n.n."
"Iron";"Fe";"0,00";"0,53";"0,00";"ug/l";"n.n."
"Copper";"Cu";"1,44";"0,53";"+0,91";"ug/l";"o"
"Selenium";"Se";"0,00";"0,53";"0,00";"ug/l";"n.n."
"Silver";"Ag";"0,00";"0,11";"0,00";"ug/l";"n.n."
"Vanadium";"V";"1,75";"1,58";"+0,17";"ug/l";"o"
"Zinc";"Zn";"2,87";"2,11";"+0,76";"ug/l";"o"
"Tin";"Sn";"0,00";"0,53";"0,00";"ug/l";"n.n."
"Nitrate";"NO3";"6,43";"2,00";"+4,43";"mg/l";"o"
"Phosphorus";"P";"78,93";"15,82";"+63,11";"ug/l";"++"
"Phosphate";"PO4";"0,24";"0,05";"+0,19";"mg/l";"++"
"Aluminium";"Al.";"45,40";"0,11";"+45,30";"ug/l";"o"
"Antimony";"Sb";"0,00";"0,11";"0,00";"ug/l";"n.n."
"Bismuth";"Bi";"0,00";"0,11";"0,00";"ug/l";"n.n."
"Lead";"Pb";"0,00";"0,11";"0,00";"ug/l";"n.n."
"Cadmium";"Cd";"0,00";"0,21";"0,00";"ug/l";"n.n."
"Lanthanum";"La.";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Thallium";"Tl";"0,00";"0,11";"0,00";"ug/l";"n.n."
"Titanium";"Ti";"0,00";"0,11";"0,00";"ug/l";"n.n."
"Tungsten";"W";"0,00";"0,00";"0,00";"ug/l";"n.n."
"Mercury";"Hg";"0,00";"0,00";"0,00";"ug/l";"n.n."
`

export const REPORT_394949_ROWS = Object.freeze(parseCsv(CSV_394949, {
  belowNormal: { manganese: '-', iron: '-' },
}))

const RECOMMENDATIONS_394949 = [
  {
    key: 'ati-phosphorus-394949', groupKey: 'nutrients', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Phosphor senken', parameterKeys: ['phosphorus', 'phosphate'],
    summary: 'Phosphor ist zu hoch. Filterung verbessern und/oder Futtermenge reduzieren. Einen eisenbasierten PO₄-Adsorber (zum Beispiel ATI Phosphate Stop) einsetzen, um den Phosphorwert auf 13–17 µg/l zu senken.',
    why: 'ATI bewertete Phosphor mit 78,93 µg/l und Phosphat mit 0,24 mg/l als kritisch hoch.',
    steps: ['Filterung verbessern und Futtereintrag reduzieren.', 'Eisenbasierten PO₄-Adsorber einsetzen.', 'Phosphor auf 13–17 µg/l zurückführen.'],
  },
  {
    key: 'ati-kh-394949', groupKey: 'basis', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Karbonathärte senken', parameterKeys: ['kh'],
    summary: 'KH-Zugabe reduzieren oder stoppen, um den Wert auf 7–8 °dKH zu senken.',
    why: 'ATI bewertete die Karbonathärte mit 14,69 °dKH als kritisch hoch.',
    steps: ['KH-Zugabe reduzieren oder stoppen.', 'Wert auf 7–8 °dKH zurückführen.'],
  },
  {
    key: 'ati-silicon-394949', groupKey: 'trace', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Siliziumquelle finden', parameterKeys: ['silicon'],
    summary: 'Silizium ist erhöht. Die Ursache finden und abstellen (zum Beispiel Osmosewasser, Frostfutter …).',
    why: 'ATI bewertete Silizium mit 366,28 µg/l als erhöht.',
    steps: ['Osmosewasser auf Silizium prüfen.', 'Frostfutter und weitere Eintragsquellen prüfen.', 'Ursache abstellen.'],
  },
  {
    key: 'ati-fluoride-394949', groupKey: 'quantity', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Fluorid und Iod versorgen', parameterKeys: ['fluoride', 'iodine'],
    summary: 'Wenn Fluorid und Iod regelmäßig zu niedrig sind, empfehlen wir die tägliche Verwendung von „Daily Traces B“.',
    why: 'ATI bewertete Fluorid mit 1,01 mg/l als unter Soll und Iod als kritisch niedrig.',
    steps: ['„Daily Traces B“ täglich verwenden.', 'Fluorid und Iod gemeinsam kontrollieren.'],
  },
  {
    key: 'ati-salinity-394949', groupKey: 'basis', tone: 'watch', priority: 'Mittel', recheckDays: 14,
    title: 'Salinität senken', parameterKeys: ['salinity'],
    summary: 'Die Salinität auf 35 PSU senken. Dafür 19,64 Liter Aquarienwasser entnehmen und durch dieselbe Menge Osmosewasser ersetzen.',
    why: 'ATI bewertete die Salinität mit 36,93 PSU als über Soll.',
    steps: ['19,64 Liter Aquarienwasser entnehmen.', 'Durch dieselbe Menge Osmosewasser ersetzen.', 'Salinität auf 35 PSU führen.'],
  },
  {
    key: 'ati-osmosis-394949', groupKey: 'trace', tone: 'critical', priority: 'Hoch', recheckDays: 7,
    title: 'Osmoseanlage warten', parameterKeys: ['silicon'],
    summary: 'Osmoseanlage warten beziehungsweise das Mischbettharz tauschen.',
    why: 'Die Osmoseprobe zeigt Silizium mit 97,03 µg/l, Zink mit 8,18 µg/l und Kupfer mit 1,05 µg/l kritisch hoch.',
    steps: ['Mischbettharz tauschen.', 'Leitwert direkt nach dem Harz messen.', 'Osmosewasser erneut prüfen.'],
  },
]

export function createReport394949() {
  const issues = [
    'Salinität über Soll', 'Karbonathärte kritisch hoch', 'Bor unter Soll', 'Fluorid unter Soll',
    'Silizium über Soll', 'Iod kritisch niedrig', 'Barium über Soll', 'Mangan nicht nachweisbar',
    'Eisen nicht nachweisbar', 'Phosphor kritisch hoch', 'Phosphat kritisch hoch',
    'Osmosewasser: Silizium, Zink und Kupfer kritisch hoch',
  ]
  return {
    id: REPORT_394949_ID,
    scenario: 'real-ati-394949',
    sourceType: 'ati-lab-import',
    preserveSourceEvaluation: true,
    preserveSourceRecommendations: true,
    barcode: 'QGSE-C8S8-CRLF-3RFM',
    reportNumber: '394949',
    aquariumName: 'NanoRiff',
    waterType: 'Meerwasser',
    package: 'ultimate-ms',
    reason: 'cyanos',
    status: 'completed',
    score: 58,
    resultLevel: 'critical',
    issueCount: issues.length,
    issues,
    groupScores: { basis: 58, quantity: 95, trace: 84, pollutants: 100 },
    createdAt: '2026-09-27T12:00:00+02:00',
    receivedAt: '2026-10-02T12:00:00+02:00',
    completedAt: '2026-10-06T08:40:39+02:00',
    aquariumId: REPORT_394949_AQUARIUM_ID,
    osmoseAquariumId: REPORT_394949_OSMOSIS_ID,
    sample: { voucherCode: 'QGSE-C8S8-CRLF-3RFM', type: 'Meerwasser', comment: 'NanoRiff', receivedAt: '2026-10-02T12:00:00+02:00' },
    lab: { provider: 'ATI Aquaristik', method: 'ATI ICP-Wasseranalyse · Originalbericht', processed: true, sourceReportId: '394949' },
    parameters: REPORT_394949_ROWS.map(labParameter),
    osmosisParameters: osmosisRows({ silicon: 97.03, copper: 1.05, zinc: 8.18 }, OSMOSIS_KEYS).map(labParameter),
    recommendations: RECOMMENDATIONS_394949.map((item) => item.summary),
    recommendationGroups: RECOMMENDATIONS_394949.map((item) => ({ ...item, steps: [...item.steps], parameterKeys: [...item.parameterKeys] })),
    sourceDosing: {
      icpElements: [
        { key: 'boron', totalMl: 808.06, portions: [269.35, 269.35, 269.35] },
        { key: 'iodine', totalMl: 16.33, portions: [5.44, 5.44, 5.44] },
        { key: 'manganese', totalMl: 0.99, portions: [0.99] },
        { key: 'iron', totalMl: 0.49, portions: [0.49] },
        { key: 'fluoride', totalMl: 66.95, portions: [33.47, 33.47] },
      ],
      supplements: [
        { key: 'iodine', totalMl: 16.33, portions: [5.44, 5.44, 5.44] },
        { key: 'manganese', totalMl: 1.98, portions: [1.98] },
        { key: 'iron', totalMl: 0.99, portions: [0.16, 0.16, 0.16, 0.16, 0.16, 0.16] },
        { key: 'fluoride', totalMl: 66.95, portions: [33.47, 33.47] },
      ],
    },
  }
}

export const ATI_LAB_REPORT_IDS = Object.freeze([REPORT_394463_ID, REPORT_394527_ID, REPORT_394770_ID, REPORT_394091_ID, REPORT_394456_ID, REPORT_394515_ID, REPORT_392933_ID, REPORT_393984_ID, REPORT_394949_ID])

export function createAtiLabReports() {
  return [createReport394463(), createReport394527(), createReport394770(), createReport394091(), createReport394456(), createReport394515(), createReport392933(), createReport393984(), createReport394949()]
}
