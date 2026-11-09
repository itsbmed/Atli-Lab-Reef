// Wasserwechsel-Simulator nach der Arbeitsmappe „WW Simulator für Mo“.
// Neues Wasser = Osmosewasser + Salz. Jeder Wechsel tauscht denselben Anteil aus:
//   neu = alt × (100 − p) / 100 + Neuwasser × p / 100,  p = WW-Liter × 100 / Nettoliter
// Bewertet wird jedes Element in % seines Idealwerts; die Abweichung ist |100 − %|.
// Die Summe der Abweichungen vorher minus nachher sind die „verbesserten Punkte“.
// Die Mappe zeigt die Rechnung an 14 Elementen; dieselbe Formel gilt für jedes Element des Berichts.
// Die Punkte bleiben bei den 14 der Mappe, damit sie mit ihr vergleichbar sind.
// Bewertet wird nach der Mappe „WW Simulator mit QI Auswertung“ mit dem Qualitätsindex (QI):
// 16 Parameter in vier Gruppen, jede Gruppe startet bei 100 und verliert je Parameter 5, 10, 20
// oder 30 Punkte nach Schwellen; der QI ist die schwächste Gruppe.

export const MAX_WATER_CHANGES = 10

// Die 14 Elemente der Arbeitsmappe, in ihrer Reihenfolge. Einheiten wie im Laborbericht.
export const SIMULATION_ELEMENTS = Object.freeze([
  { key: 'chloride', unit: 'mg/l' },
  { key: 'sodium', unit: 'mg/l' },
  { key: 'magnesium', unit: 'mg/l' },
  { key: 'sulfur', unit: 'mg/l' },
  { key: 'calcium', unit: 'mg/l' },
  { key: 'potassium', unit: 'mg/l' },
  { key: 'bromine', unit: 'mg/l' },
  { key: 'strontium', unit: 'mg/l' },
  { key: 'boron', unit: 'mg/l' },
  { key: 'fluoride', unit: 'mg/l' },
  { key: 'nitrate', unit: 'mg/l' },
  { key: 'silicon', unit: 'µg/l' },
  { key: 'lithium', unit: 'µg/l' },
  { key: 'zinc', unit: 'µg/l' },
])
export const SIMULATION_KEYS = Object.freeze(SIMULATION_ELEMENTS.map((element) => element.key))

// Spalte „Ideal“ der Arbeitsmappe – nur, wenn der Laborbericht keinen eigenen Idealwert mitbringt.
export const DEFAULT_IDEALS = Object.freeze({
  chloride: 19800, sodium: 11000, magnesium: 1320, sulfur: 900, calcium: 420, potassium: 408, bromine: 67,
  strontium: 8.1, boron: 4.5, fluoride: 1.3, nitrate: 2, silicon: 50, lithium: 180, zinc: 2,
})

// Absolute Ocean, angesetzt auf 35 PSU – Spalte „Salz B“ der Arbeitsmappe
// (Ca 420, Mg 1320, Zn 2 wie in der Auswertung V2.2).
export const ABSOLUTE_OCEAN = Object.freeze({
  chloride: 19800, sodium: 11000, magnesium: 1320, sulfur: 900, calcium: 420, potassium: 408, bromine: 67,
  strontium: 8.1, boron: 4.5, fluoride: 1.3, nitrate: 0, silicon: 30, lithium: 180, zinc: 2,
})

// Salinität und KH von Absolute Ocean – Spalte „Salz B“ der QI-Mappe (KH 7,5 °dKH, angesetzt auf 35 PSU).
const ABSOLUTE_OCEAN_BASIS = Object.freeze({ salinity: 35, kh: 7.5 })

// Weniger ist hier kein Mangel: Nitrat (wie in der Mappe) und die unerwünschten Elemente.
// Unter oder auf dem Idealwert gelten sie als ideal.
export const LOWER_IS_FINE = Object.freeze([
  'nitrate', 'aluminium', 'antimony', 'bismuth', 'cadmium', 'lanthanum', 'lead', 'mercury', 'thallium', 'titanium', 'tungsten',
])
// Was ein frisch angesetztes Salz nicht mitbringt: Nährstoffe und unerwünschte Elemente.
const NOT_IN_SALT = Object.freeze(['nitrate', 'phosphate', 'phosphorus', ...LOWER_IS_FINE])

// Absolute Ocean für alle Elemente: die 14 Werte der Mappe, sonst die ATI-Referenz (= Idealwert
// des Labors); Nährstoffe und unerwünschte Elemente mit 0.
export function referenceSalt(ideals = {}) {
  const salt = {}
  for (const [key, ideal] of Object.entries(ideals)) {
    if (finite(ideal)) salt[key] = NOT_IN_SALT.includes(key) ? 0 : Number(ideal)
  }
  return { ...salt, ...ABSOLUTE_OCEAN_BASIS, ...ABSOLUTE_OCEAN }
}

// Schwellen der QI-Mappe (Tabelle1!X5:AI20). low: unter dem Wert 30 / 20 / 10 / 5 Punkte Abzug,
// high: über dem Wert 5 / 10 / 20 / 30 Punkte. Zwischen low[3] (Min) und high[0] (Max) gibt es keinen Abzug.
export const QI_GROUPS = Object.freeze([
  { key: 'basis', label: 'Basis' },
  { key: 'major', label: 'Mengenelemente' },
  { key: 'nutrients', label: 'Nährstoffe' },
  { key: 'trace', label: 'Spurenelemente' },
])
export const QI_PARAMETERS = Object.freeze([
  { key: 'salinity', group: 'basis', unit: 'PSU', low: [28.5, 30, 31.5, 33], high: [37, 38.5, 40, 41.5] },
  { key: 'kh', group: 'basis', unit: '°dKH', low: [4, 5, 6, 7], high: [9, 10, 11, 12] },
  { key: 'chloride', group: 'major', unit: 'mg/l', low: [13860, 15840, 17820, 18810], high: [20790, 21780, 23760, 25740] },
  { key: 'sodium', group: 'major', unit: 'mg/l', low: [7720.999999999999, 8824, 9927, 10478.5], high: [11581.5, 12133, 13236, 14339] },
  { key: 'magnesium', group: 'major', unit: 'mg/l', low: [920.5, 1052, 1183.5, 1249.25], high: [1380.75, 1446.5, 1578, 1709.5] },
  { key: 'sulfur', group: 'major', unit: 'mg/l', low: [630, 720, 810, 855], high: [945, 990, 1080, 1170] },
  { key: 'calcium', group: 'major', unit: 'mg/l', low: [250, 300, 350, 400], high: [440, 500, 600, 800] },
  { key: 'potassium', group: 'major', unit: 'mg/l', low: [250, 300, 360, 390], high: [430, 450, 510, 575] },
  { key: 'bromine', group: 'major', unit: 'mg/l', low: [30, 40, 50, 60.3], high: [80, 90, 100, 110] },
  { key: 'strontium', group: 'major', unit: 'mg/l', low: [4, 5, 6, 7], high: [9, 10, 11, 12] },
  { key: 'boron', group: 'major', unit: 'mg/l', low: [1, 2, 3, 4], high: [5, 6, 7, 8] },
  { key: 'fluoride', group: 'major', unit: 'mg/l', low: [0.4, 0.7, 1.04, 1.17], high: [1.5, 1.8, 2.1, 2.4] },
  { key: 'nitrate', group: 'nutrients', unit: 'mg/l', low: [null, null, null, 0], high: [5, 15, 30, 45] },
  { key: 'silicon', group: 'nutrients', unit: 'µg/l', low: [25, 50, 75, 100], high: [200, 300, 500, 700] },
  { key: 'lithium', group: 'trace', unit: 'µg/l', low: [18, 63, 108, 153], high: [200, 700, 1200, 2400] },
  { key: 'zinc', group: 'trace', unit: 'µg/l', low: [0.2, 0.7, 1.2, 1.7], high: [3.3, 9, 12, 21] },
])
export const QI_KEYS = Object.freeze(QI_PARAMETERS.map((parameter) => parameter.key))
const QI_STEPS = [30, 20, 10, 5]

// Abzug für einen Wert. Anders als die verschachtelte WENN-Formel der Mappe, die jeden Wert unter dem
// Minimum nur mit 5 Punkten bewertet, wird unten wie oben von der schärfsten Schwelle aus geprüft –
// so, wie es die Schwellentabelle beschreibt (Mg 800 mg/l: kritisch niedrig, 30 Punkte).
export function qiDeduction(key, value) {
  const parameter = QI_PARAMETERS.find((item) => item.key === key)
  if (!parameter || !Number.isFinite(value)) return null
  for (let index = 0; index < 4; index += 1) {
    const limit = parameter.low[index]
    if (limit !== null && value < limit) return QI_STEPS[index]
  }
  for (let index = 3; index >= 0; index -= 1) {
    if (value > parameter.high[index]) return QI_STEPS[3 - index]
  }
  return 0
}

// QI aus Werten { [key]: Zahl }. Gruppen ohne einen einzigen Wert zählen nicht mit; eine Gruppe fällt
// nicht unter 0. Der QI ist die schwächste Gruppe.
export function qualityIndex(values = {}) {
  const groups = QI_GROUPS.map((group) => {
    const parameters = QI_PARAMETERS
      .filter((parameter) => parameter.group === group.key && Number.isFinite(values[parameter.key]))
      .map((parameter) => ({ key: parameter.key, value: values[parameter.key], deduction: qiDeduction(parameter.key, values[parameter.key]) }))
    const deducted = parameters.reduce((total, parameter) => total + parameter.deduction, 0)
    return { ...group, parameters, score: parameters.length ? Math.max(0, 100 - deducted) : null }
  })
  const scored = groups.filter((group) => group.score !== null)
  return {
    groups,
    overall: scored.length ? Math.min(...scored.map((group) => group.score)) : null,
    missing: QI_KEYS.filter((key) => !Number.isFinite(values[key])),
  }
}

// Salinität aus der Zusammensetzung wie in der QI-Mappe: (Cl … NO3 + 2 × S + 21 × KH) / 1024.
// Die Summe enthält S schon einmal – zusammen also etwa das Sulfat. Fehlt ein Wert, gibt es keine Schätzung.
const PSU_KEYS = ['chloride', 'sodium', 'magnesium', 'sulfur', 'calcium', 'potassium', 'bromine', 'strontium', 'boron', 'fluoride', 'nitrate']
export function estimatedSalinity(values = {}) {
  if (![...PSU_KEYS, 'kh'].every((key) => finite(values[key]))) return null
  const sum = PSU_KEYS.reduce((total, key) => total + Number(values[key]), 0)
  return (sum + 2 * Number(values.sulfur) + 21 * Number(values.kh)) / 1024
}
const withSalinity = (values) => {
  if (finite(values.salinity)) return values
  const estimate = estimatedSalinity(values)
  return estimate === null ? values : { ...values, salinity: estimate }
}

const finite = (value) => (
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
  && Number.isFinite(Number(value))
)

// Anteil eines Wechsels in Prozent des Nettovolumens.
export function changePercent(changeLitres, netLitres) {
  const net = Number(netLitres)
  const litres = Number(changeLitres)
  if (!finite(netLitres) || !finite(changeLitres) || !(net > 0) || !(litres > 0)) return 0
  return Math.min(100, (litres * 100) / net)
}

export function mixStep(value, newWater, percent) {
  return (value * (100 - percent)) / 100 + (newWater * percent) / 100
}

// % vom Ideal. Nitrat unter seinem Idealwert gilt als ideal – zu wenig Nitrat bewertet die Mappe nicht;
// dasselbe gilt für die unerwünschten Elemente. Ohne positiven Idealwert gibt es keinen Prozentwert.
export function percentOfIdeal(key, value, ideal) {
  if (LOWER_IS_FINE.includes(key) && value <= ideal) return 100
  if (!(ideal > 0)) return null
  return (value * 100) / ideal
}

function round(value) {
  return Math.round(value * 1e9) / 1e9
}

// aquarium, osmosis, salt, ideal, units: { [elementKey]: Zahl | Einheit }. Gerechnet werden die 14 der
// Mappe und jedes weitere Element mit Aquariumwert. Fehlt im Aquarium, im Salz oder beim Ideal ein Wert,
// wird das Element übersprungen statt mit 0 gerechnet. Fehlendes Osmosewasser ist 0 (n. n.).
export function simulateWaterChange({ aquarium: measured = {}, osmosis = {}, salt: saltInput = {}, ideal: idealInput = {}, units = {}, percent = 0, count = 1 } = {}) {
  // Ohne gemessene Salinität rechnet die Mappe sie aus der Zusammensetzung; Idealwerte wie in der QI-Mappe.
  const aquarium = withSalinity(measured)
  const salt = withSalinity(saltInput)
  const ideal = { ...ABSOLUTE_OCEAN_BASIS, ...idealInput }
  const changes = Math.round(Math.min(MAX_WATER_CHANGES, Math.max(0, Number(count) || 0)))
  const share = Math.min(100, Math.max(0, Number(percent) || 0))
  const rows = []
  const skipped = []
  const elements = [
    ...SIMULATION_ELEMENTS,
    ...Object.keys(aquarium).filter((key) => !SIMULATION_KEYS.includes(key)).map((key) => ({ key, unit: units[key] || '' })),
  ]
  for (const { key, unit } of elements) {
    const scored = SIMULATION_KEYS.includes(key)
    const idealValue = Number(ideal[key])
    if (!finite(aquarium[key]) || !finite(salt[key]) || !finite(ideal[key]) || !(idealValue > 0 || (!scored && idealValue === 0))) {
      skipped.push(key)
      continue
    }
    const before = Number(aquarium[key])
    const newWater = (finite(osmosis[key]) ? Number(osmosis[key]) : 0) + Number(salt[key])
    const steps = []
    let value = before
    for (let index = 0; index < changes; index += 1) {
      value = mixStep(value, newWater, share)
      steps.push(value)
    }
    const pctBefore = percentOfIdeal(key, before, idealValue)
    const pctAfter = percentOfIdeal(key, value, idealValue)
    rows.push({
      key, unit, scored, before, newWater, steps, after: value, ideal: idealValue,
      pctBefore, pctAfter,
      devBefore: pctBefore === null ? null : Math.abs(100 - pctBefore),
      devAfter: pctAfter === null ? null : Math.abs(100 - pctAfter),
    })
  }
  const scoredRows = rows.filter((row) => row.scored)
  const sum = (field) => round(scoredRows.reduce((total, row) => total + row[field], 0))
  const mean = (field) => (scoredRows.length ? round(sum(field) / scoredRows.length) : 0)
  const deviationBefore = sum('devBefore')
  const deviationAfter = sum('devAfter')
  const valuesOf = (field) => Object.fromEntries(rows.map((row) => [row.key, row[field]]))
  const qiBefore = qualityIndex(valuesOf('before'))
  const qiAfter = qualityIndex(valuesOf('after'))
  for (const row of rows) {
    row.qiBefore = qiDeduction(row.key, row.before)
    row.qiAfter = qiDeduction(row.key, row.after)
  }
  return {
    rows,
    scoredCount: scoredRows.length,
    skipped,
    percent: share,
    count: changes,
    deviationBefore,
    deviationAfter,
    improvement: round(deviationBefore - deviationAfter),
    meanBefore: mean('pctBefore'),
    meanAfter: mean('pctAfter'),
    qiBefore,
    qiAfter,
    // Unterschied in Prozentpunkten, nicht in Prozent.
    qiGain: qiBefore.overall === null || qiAfter.overall === null ? null : qiAfter.overall - qiBefore.overall,
    estimatedSalinity: !finite(measured.salinity) && finite(aquarium.salinity),
  }
}

// QI nach 0 … 10 Wechseln.
export function qiCurve(input, max = MAX_WATER_CHANGES) {
  return Array.from({ length: max + 1 }, (_, count) => ({
    count,
    qi: simulateWaterChange({ ...input, count }).qiAfter.overall,
  }))
}

// Ab welchem Wechsel der QI nicht mehr steigt: der erste, der den höchsten QI der Kurve erreicht.
// Danach ändern sich die Werte zwar weiter, überschreiten aber keine Schwelle mehr.
export function qiPlateau(curve) {
  const values = curve.map((point) => point.qi).filter((qi) => qi !== null)
  if (!values.length) return 0
  const best = Math.max(...values)
  return curve.find((point) => point.qi === best).count
}

// Abweichungssumme nach 0 … 10 Wechseln – zeigt, ab wann ein weiterer Wechsel kaum noch etwas bringt.
export function deviationCurve(input, max = MAX_WATER_CHANGES) {
  return Array.from({ length: max + 1 }, (_, count) => ({
    count,
    deviation: simulateWaterChange({ ...input, count }).deviationAfter,
  }))
}

// Der Wechsel, ab dem der nächste weniger als `minGain` Punkte bringt (Kosten-Nutzen).
export function sensibleCount(curve, minGain = 5) {
  if (curve.length < 2 || curve[0].deviation - curve[1].deviation < minGain) return 0
  for (let index = 1; index < curve.length; index += 1) {
    const gainNext = index + 1 < curve.length ? curve[index].deviation - curve[index + 1].deviation : 0
    if (gainNext < minGain) return index
  }
  return curve.length - 1
}

// Werte eines Laborberichts für die Simulation: Messwert (n. n. = 0), Idealwert des Labors und Einheit –
// für alle Elemente des Berichts.
export function valuesFromParameters(parameters = []) {
  const values = {}
  const ideals = {}
  const units = {}
  for (const parameter of parameters) {
    if (!parameter.key) continue
    const undetectable = parameter.resultStatus === 'below_detection'
    if (undetectable || finite(parameter.value)) values[parameter.key] = undetectable ? 0 : Number(parameter.value)
    const ideal = parameter.sourceIdealValue ?? parameter.correctionTarget
    if (finite(ideal) && (Number(ideal) > 0 || (Number(ideal) === 0 && LOWER_IS_FINE.includes(parameter.key)))) ideals[parameter.key] = Number(ideal)
    if (parameter.unit) units[parameter.key] = parameter.unit
  }
  return { values, ideals, units }
}
