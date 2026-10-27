// Wasserwechsel-Simulator nach der Arbeitsmappe „WW Simulator für Mo“.
// Neues Wasser = Osmosewasser + Salz. Jeder Wechsel tauscht denselben Anteil aus:
//   neu = alt × (100 − p) / 100 + Neuwasser × p / 100,  p = WW-Liter × 100 / Nettoliter
// Bewertet wird jedes Element in % seines Idealwerts; die Abweichung ist |100 − %|.
// Die Summe der Abweichungen vorher minus nachher sind die „verbesserten Punkte“.

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

const finite = (value) => value !== null && value !== '' && Number.isFinite(Number(value))

// Anteil eines Wechsels in Prozent des Nettovolumens.
export function changePercent(changeLitres, netLitres) {
  const net = Number(netLitres)
  const litres = Number(changeLitres)
  if (!(net > 0) || !(litres > 0)) return 0
  return Math.min(100, (litres * 100) / net)
}

export function mixStep(value, newWater, percent) {
  return (value * (100 - percent)) / 100 + (newWater * percent) / 100
}

// % vom Ideal. Nitrat unter seinem Idealwert gilt als ideal – zu wenig Nitrat bewertet die Mappe nicht.
export function percentOfIdeal(key, value, ideal) {
  if (key === 'nitrate' && value < ideal) return 100
  return (value * 100) / ideal
}

function round(value) {
  return Math.round(value * 1e9) / 1e9
}

// aquarium, osmosis, salt, ideal: { [elementKey]: Zahl }. Fehlt im Aquarium, im Salz oder beim Ideal
// ein Wert, wird das Element übersprungen statt mit 0 gerechnet. Fehlendes Osmosewasser ist 0 (n. n.).
export function simulateWaterChange({ aquarium = {}, osmosis = {}, salt = {}, ideal = {}, percent = 0, count = 1 } = {}) {
  const changes = Math.round(Math.min(MAX_WATER_CHANGES, Math.max(0, Number(count) || 0)))
  const share = Math.min(100, Math.max(0, Number(percent) || 0))
  const rows = []
  const skipped = []
  for (const { key, unit } of SIMULATION_ELEMENTS) {
    const idealValue = Number(ideal[key])
    if (!finite(aquarium[key]) || !finite(salt[key]) || !(idealValue > 0)) {
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
      key, unit, before, newWater, steps, after: value, ideal: idealValue,
      pctBefore, pctAfter,
      devBefore: Math.abs(100 - pctBefore),
      devAfter: Math.abs(100 - pctAfter),
    })
  }
  const sum = (field) => round(rows.reduce((total, row) => total + row[field], 0))
  const mean = (field) => (rows.length ? round(sum(field) / rows.length) : 0)
  const deviationBefore = sum('devBefore')
  const deviationAfter = sum('devAfter')
  return {
    rows,
    skipped,
    percent: share,
    count: changes,
    deviationBefore,
    deviationAfter,
    improvement: round(deviationBefore - deviationAfter),
    meanBefore: mean('pctBefore'),
    meanAfter: mean('pctAfter'),
  }
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
  for (let index = 1; index < curve.length; index += 1) {
    const gainNext = index + 1 < curve.length ? curve[index].deviation - curve[index + 1].deviation : 0
    if (gainNext < minGain) return index
  }
  return curve.length - 1
}

// Werte eines Laborberichts für die Simulation: Messwert (n. n. = 0) und der Idealwert des Labors.
export function valuesFromParameters(parameters = []) {
  const values = {}
  const ideals = {}
  for (const parameter of parameters) {
    if (!SIMULATION_KEYS.includes(parameter.key)) continue
    const undetectable = parameter.resultStatus === 'below_detection'
    const value = undetectable ? 0 : Number(parameter.value)
    if (Number.isFinite(value)) values[parameter.key] = value
    const ideal = Number(parameter.sourceIdealValue ?? parameter.correctionTarget)
    if (ideal > 0) ideals[parameter.key] = ideal
  }
  return { values, ideals }
}
