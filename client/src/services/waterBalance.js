// Die drei Balkendiagramme aus dem ATI-Originalportal: Zusammensetzung des
// Aquarienwassers, Elementverhältnisse und Wachstumsfaktoren.
//
// Grundlage ist immer das Paar aus Messwert und dem vom Labor für genau diese
// Probe ausgewiesenen Sollwert. Der Sollwert ist bereits auf die gemessene
// Salinität bezogen – deshalb zeigt die Abweichung, ob ein Element zur
// Salinität passt oder unabhängig davon angereichert bzw. verbraucht ist.
import { ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'

// Reihenfolge wie im Laborbericht.
const COMPOSITION_KEYS = Object.freeze([
  'chloride', 'sodium', 'magnesium', 'sulfur', 'calcium',
  'potassium', 'bromine', 'strontium', 'boron', 'fluoride',
])

// Elemente mit sehr unterschiedlichen Konzentrationen teilen sich sonst eine
// Achse, auf der Fluorid neben Chlorid unsichtbar wäre. Jede Größenordnung
// bekommt deshalb ihren eigenen Maßstab – wie im Originalbericht.
const SCALE_STEPS = Object.freeze([3, 10, 30, 300, 1000])

export function scaleForIdeal(ideal) {
  const value = Math.abs(Number(ideal) || 0)
  if (value > 2000) return 1000
  if (value > 100) return 300
  if (value > 10) return 30
  if (value > 2) return 10
  return 3
}

function numeric(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null
}

function usable(parameter) {
  if (!parameter) return false
  if (parameter.resultStatus === 'below_detection') return false
  return numeric(parameter.value) !== null && (numeric(parameter.sourceIdealValue) ?? 0) > 0
}

// Verhältniszahl: 1,0 bedeutet exakt auf Soll, 1,2 bedeutet 20 % darüber.
function index(parameter) {
  return numeric(parameter.value) / numeric(parameter.sourceIdealValue)
}

function byKey(parameters = []) {
  return Object.fromEntries(parameters.filter(Boolean).map((item) => [item.key, item]))
}

function symbolFor(key) {
  return ELEMENT_DEFINITION_MAP[key]?.symbol || key
}

function labelFor(key) {
  return ELEMENT_DEFINITION_MAP[key]?.label || key
}

/* ───────────────────────── Zusammensetzung ───────────────────────── */

export function compositionRows(parameters = []) {
  const map = byKey(parameters)
  const rows = []
  for (const key of COMPOSITION_KEYS) {
    const parameter = map[key]
    if (!usable(parameter)) continue
    const measured = numeric(parameter.value)
    const ideal = numeric(parameter.sourceIdealValue)
    const scale = scaleForIdeal(ideal)
    const delta = measured - ideal
    rows.push({
      key,
      symbol: symbolFor(key),
      label: labelFor(key),
      unit: parameter.unit || '',
      measured,
      ideal,
      delta,
      scale,
      // Anteil der Achse, geklammert: ein Ausreißer sprengt die Darstellung nicht.
      extent: Math.min(1, Math.abs(delta) / scale),
      clamped: Math.abs(delta) > scale,
      direction: delta >= 0 ? 'high' : 'low',
      tone: parameter.tone || 'good',
    })
  }
  // Zusammenhängende Zeilen gleicher Größenordnung bilden eine Achsengruppe.
  return rows.map((row, position) => ({
    ...row,
    endsBand: position === rows.length - 1 || rows[position + 1].scale !== row.scale,
  }))
}

/* ─────────────────────── Verhältnisse ───────────────────────────── */

const RATIO_PAIRS = Object.freeze([
  { key: 'psu', left: 'psu-nacl', right: 'psu-else' },
  { key: 'na-cl', left: 'sodium', right: 'chloride' },
  { key: 'mg-s', left: 'magnesium', right: 'sulfur' },
  { key: 'mg-ca', left: 'magnesium', right: 'calcium' },
  { key: 'ca-sr', left: 'calcium', right: 'strontium' },
  { key: 'ca-k', left: 'calcium', right: 'potassium' },
])

const GROWTH_PAIRS = Object.freeze([
  { key: 'kh-p', left: 'kh', right: 'phosphorus' },
  { key: 'kh-ca', left: 'kh', right: 'calcium' },
])

// Salinität aus Kochsalz gegen Salinität aus allen übrigen Hauptelementen.
// Beide Seiten werden als Summe der Messwerte geteilt durch die Summe der
// zugehörigen Sollwerte gebildet, damit die Einheiten sich herauskürzen.
const NACL_KEYS = Object.freeze(['sodium', 'chloride'])
const OTHER_KEYS = Object.freeze(['magnesium', 'sulfur', 'calcium', 'potassium', 'bromine', 'strontium', 'boron', 'fluoride'])

function groupIndex(map, keys) {
  const usableKeys = keys.filter((key) => usable(map[key]))
  if (!usableKeys.length) return null
  const measured = usableKeys.reduce((sum, key) => sum + numeric(map[key].value), 0)
  const ideal = usableKeys.reduce((sum, key) => sum + numeric(map[key].sourceIdealValue), 0)
  return ideal > 0 ? measured / ideal : null
}

function sideIndex(map, key) {
  if (key === 'psu-nacl') return groupIndex(map, NACL_KEYS)
  if (key === 'psu-else') return groupIndex(map, OTHER_KEYS)
  return usable(map[key]) ? index(map[key]) : null
}

function sideLabel(key) {
  if (key === 'psu-nacl') return 'PSU NaCl'
  if (key === 'psu-else') return 'PSU übrige'
  return symbolFor(key)
}

// Eigene Einstufung: Das Labor weist für Verhältnisse keinen Status aus.
function ratioTone(percent) {
  const value = Math.abs(percent)
  if (value < 10) return 'good'
  if (value < 25) return 'watch'
  return 'critical'
}

function buildPairs(parameters, pairs) {
  const map = byKey(parameters)
  const rows = []
  for (const pair of pairs) {
    const left = sideIndex(map, pair.left)
    const right = sideIndex(map, pair.right)
    if (!(left > 0) || !(right > 0)) continue
    // Positiv bedeutet: die linke Seite ist relativ stärker vertreten.
    const percent = (left / right - 1) * 100
    rows.push({
      key: pair.key,
      leftLabel: sideLabel(pair.left),
      rightLabel: sideLabel(pair.right),
      leftName: pair.left.startsWith('psu-') ? sideLabel(pair.left) : labelFor(pair.left),
      rightName: pair.right.startsWith('psu-') ? sideLabel(pair.right) : labelFor(pair.right),
      percent,
      direction: percent >= 0 ? 'left' : 'right',
      tone: ratioTone(percent),
    })
  }
  if (!rows.length) return { rows: [], scale: 0 }
  // Achse wächst in 25er-Schritten mit dem größten Ausschlag mit.
  const largest = Math.max(...rows.map((row) => Math.abs(row.percent)))
  const scale = Math.min(200, Math.max(25, Math.ceil(largest / 25) * 25))
  return {
    scale,
    rows: rows.map((row) => ({
      ...row,
      extent: Math.min(1, Math.abs(row.percent) / scale),
      clamped: Math.abs(row.percent) > scale,
    })),
  }
}

export function ratioRows(parameters = []) {
  return buildPairs(parameters, RATIO_PAIRS)
}

export function growthRows(parameters = []) {
  return buildPairs(parameters, GROWTH_PAIRS)
}

export function waterBalance(parameters = []) {
  return {
    composition: compositionRows(parameters),
    ratios: ratioRows(parameters),
    growth: growthRows(parameters),
  }
}

export const WATER_BALANCE_SCALE_STEPS = SCALE_STEPS

/* ──────────────── Zusammensetzung in Prozent vom Sollwert ──────────────── */

// Der Sollwert des Labors ist schon auf die gemessene Salinität bezogen. Die Abweichung in
// Prozent macht alle Elemente auf einer Achse vergleichbar – in mg/l wirkt Chlorid mit −2 %
// sonst dramatischer als Fluorid mit −26 %.
const PERCENT_SCALES = Object.freeze([5, 10, 20, 30, 50])

export function compositionPercent(rows = [], { sort = 'lab' } = {}) {
  const withPercent = rows.map((row) => ({ ...row, percent: (row.delta / row.ideal) * 100 }))
  const largest = Math.max(0, ...withPercent.map((row) => Math.abs(row.percent)))
  const scale = PERCENT_SCALES.find((step) => step >= largest) || PERCENT_SCALES.at(-1)
  const half = scale / 2
  const items = withPercent.map((row) => ({
    ...row,
    extent: Math.min(1, Math.abs(row.percent) / scale),
    clamped: Math.abs(row.percent) > scale,
  }))
  if (sort === 'deviation') items.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent))
  return { scale, ticks: [-scale, -half, 0, half, scale], rows: items }
}

// Kurzfazit über dem Diagramm – nach derselben Regel wie die Farben der Punkte,
// damit Text und Bild nie widersprechen.
export function compositionSummary(rows = []) {
  const withTone = rows.map((row) => ({ ...row, band: compositionTone((row.measured / row.ideal) * 100) }))
  const flagged = withTone.filter((row) => row.band !== 'good')
  return {
    total: rows.length,
    fitting: rows.length - flagged.length,
    flagged: flagged
      .map((row) => ({ key: row.key, label: row.label, percent: (row.delta / row.ideal) * 100, tone: row.band }))
      .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent)),
  }
}

/* ──────────────── Vorschlag des Kunden: Index 100 und Säulen ──────────────── */

// Konzentration im Verhältnis zum salinitätsbezogenen Sollwert: 100 = passt zur Salinität.
// Der grüne Bereich der Kunden-Arbeitsmappe liegt bei etwa ±15 %.
export const BALANCE_BAND = 15

// Farbe nach Lage zum grünen Band: darin ausgewogen, bis zum doppelten Abstand auffällig, darüber kritisch.
export function compositionTone(index, band = BALANCE_BAND) {
  if (!Number.isFinite(index)) return 'good'
  const off = Math.abs(index - 100)
  return off <= band ? 'good' : off <= band * 2 ? 'watch' : 'critical'
}

// Ausschnitt der Index-Achse: der kleinste, der alle Werte mit etwas Luft fasst – so wird
// das grüne Band groß, wenn alles nah beieinander liegt. Ausreißer stehen am Rand.
const INDEX_WINDOWS = [
  { half: 20, step: 10 },
  { half: 30, step: 10 },
  { half: 50, step: 25 },
  { half: 100, step: 50 },
]
export function indexScale(values = []) {
  const largest = Math.max(0, ...values.filter(Number.isFinite).map((value) => Math.abs(value - 100)))
  const window = INDEX_WINDOWS.find((item) => largest <= item.half * 0.9) || INDEX_WINDOWS.at(-1)
  const lo = 100 - window.half
  const hi = 100 + window.half
  const ticks = []
  for (let tick = lo; tick <= hi; tick += window.step) ticks.push(tick)
  return { lo, hi, ticks }
}

// Sulfat wird wie in der Arbeitsmappe des Kunden aus Schwefel abgeleitet (SO₄ = S × 2,996);
// das Verhältnis zum Soll ist dasselbe, nur die Konzentration nicht.
const SULFATE_PER_SULFUR = 2.996

export function withSulfate(rows = []) {
  const index = rows.findIndex((row) => row.key === 'sulfur')
  if (index === -1) return rows
  const sulfur = rows[index]
  const sulfate = {
    ...sulfur,
    key: 'sulfate',
    symbol: 'SO₄',
    label: 'Sulfat',
    derived: true,
    measured: sulfur.measured * SULFATE_PER_SULFUR,
    ideal: sulfur.ideal * SULFATE_PER_SULFUR,
    delta: sulfur.delta * SULFATE_PER_SULFUR,
  }
  return [...rows.slice(0, index + 1), sulfate, ...rows.slice(index + 1)]
}

// Punkte auf der Index-Achse 0–200; Werte darüber stehen am Rand. Dazu Ø, Min und Max.
export function compositionIndex(rows = [], { top = 200 } = {}) {
  const items = rows.map((row) => {
    const index = (row.measured / row.ideal) * 100
    return { ...row, index, y: Math.min(index, top), clamped: index > top, inBand: Math.abs(index - 100) <= BALANCE_BAND }
  })
  const values = items.map((item) => item.index)
  const stats = values.length
    ? { avg: values.reduce((sum, value) => sum + value, 0) / values.length, min: Math.min(...values), max: Math.max(...values) }
    : null
  return { top, band: [100 - BALANCE_BAND, 100 + BALANCE_BAND], items, stats }
}
