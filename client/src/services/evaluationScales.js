import { ELEMENT_DEFINITIONS, ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'

const STORAGE_KEY = 'ati_evaluation_scales:v1'
const ACTIVE_KEY = 'ati_evaluation_scale_active:v1'

// Nine bands from "crit low" to "crit high"; 5 is the optimum the dosing plan corrects towards.
export const SCORE_BANDS = Object.freeze([
  { score: 1, key: 'crit_low', label: 'Kritisch niedrig', short: 'Krit. niedrig', tone: 'critical', direction: 'low' },
  { score: 2, key: 'too_low', label: 'Zu niedrig', short: 'Zu niedrig', tone: 'critical', direction: 'low' },
  { score: 3, key: 'low', label: 'Niedrig', short: 'Niedrig', tone: 'watch', direction: 'low' },
  { score: 4, key: 'reduced', label: 'Vermindert', short: 'Vermindert', tone: 'watch', direction: 'low' },
  { score: 5, key: 'ok', label: 'Optimal', short: 'Optimal', tone: 'good', direction: 'in_range' },
  { score: 6, key: 'increased', label: 'Erhöht', short: 'Erhöht', tone: 'watch', direction: 'high' },
  { score: 7, key: 'high', label: 'Hoch', short: 'Hoch', tone: 'watch', direction: 'high' },
  { score: 8, key: 'too_high', label: 'Zu hoch', short: 'Zu hoch', tone: 'critical', direction: 'high' },
  { score: 9, key: 'crit_high', label: 'Kritisch hoch', short: 'Krit. hoch', tone: 'critical', direction: 'high' },
])

export const SCORE_BAND_MAP = Object.freeze(Object.fromEntries(SCORE_BANDS.map((band) => [band.score, band])))

// Ascending order is what the classifier walks; the editor renders them in the same order.
export const THRESHOLD_FIELDS = Object.freeze([
  { key: 'critLow', label: 'Kritisch niedrig unter', short: 'Krit −', band: 1 },
  { key: 'tooLow', label: 'Zu niedrig unter', short: 'Zu −', band: 2 },
  { key: 'low', label: 'Niedrig unter', short: 'Niedrig', band: 3 },
  { key: 'min', label: 'Optimum ab', short: 'Min', band: 4 },
  { key: 'max', label: 'Optimum bis', short: 'Max', band: 5 },
  { key: 'increased', label: 'Erhöht bis', short: 'Erhöht', band: 6 },
  { key: 'high', label: 'Hoch bis', short: 'Hoch', band: 7 },
  { key: 'tooHigh', label: 'Zu hoch bis', short: 'Zu +', band: 8 },
])

export const THRESHOLD_KEYS = Object.freeze(THRESHOLD_FIELDS.map((field) => field.key))

// How far each group may drift before a band flips. Bulk elements are held tight,
// trace elements and pollutants tolerate far larger multiples of the optimum.
const GROUP_SPREAD = Object.freeze({
  basis: { low: [0.75, 0.86, 0.94], high: [1.06, 1.18, 1.35] },
  quantity: { low: [0.60, 0.80, 0.92], high: [1.08, 1.22, 1.40] },
  nutrients: { low: [0.70, 0.80, 0.90], high: [1.75, 2.25, 4.50] },
  trace: { low: [0.12, 0.40, 0.70], high: [2.00, 3.50, 6.00] },
  pollutants: { low: [0, 0, 0], high: [2.00, 4.00, 8.00] },
})

const BUILT_IN_SCALES = Object.freeze([
  {
    id: 'ati-standard',
    name: 'ATI Standard',
    description: 'Referenzbewertung des ATI Labors. Grundlage für alle Berichte ohne eigene Auswahl.',
    tolerance: 1,
    ranges: {},
  },
  {
    id: 'nyos',
    name: 'NYOS Reefer',
    description: 'Engere Optimumfenster für Mengenelemente und Nährstoffe nach NYOS Zielwerten.',
    tolerance: 0.85,
    ranges: {
      kh: [7, 8],
      calcium: [420, 440],
      magnesium: [1300, 1400],
      nitrate: [1, 10],
      phosphate: [0.02, 0.06],
      potassium: [390, 410],
    },
  },
  {
    id: 'fauna-marin',
    name: 'Fauna Marin',
    description: 'Niedrigere Nährstoff- und KH-Zielwerte für ULNS-geführte Systeme.',
    tolerance: 1.15,
    ranges: {
      kh: [6.5, 7.5],
      calcium: [400, 430],
      magnesium: [1280, 1380],
      nitrate: [0.5, 5],
      phosphate: [0.02, 0.05],
      phosphorus: [6, 16],
    },
  },
])

function significant(value, digits = 4) {
  if (!Number.isFinite(value) || value === 0) return 0
  const factor = 10 ** (digits - 1 - Math.floor(Math.log10(Math.abs(value))))
  return Math.round(value * factor) / factor
}

// `tolerance` widens or narrows every band around the optimum without touching Min/Max.
function applyTolerance(factor, tolerance, side) {
  if (tolerance === 1) return factor
  return side === 'low' ? 1 - (1 - factor) * tolerance : 1 + (factor - 1) * tolerance
}

function generateThresholds(definition, scale) {
  const spread = GROUP_SPREAD[definition.groupKey] || GROUP_SPREAD.trace
  const [min, max] = scale.ranges?.[definition.key] || [definition.referenceRanges.Meerwasser.min, definition.referenceRanges.Meerwasser.max]
  const tolerance = Number(scale.tolerance) || 1
  const [critLow, tooLow, low] = spread.low.map((factor) => significant(min * applyTolerance(factor, tolerance, 'low')))
  const [increased, high, tooHigh] = spread.high.map((factor) => significant(max * applyTolerance(factor, tolerance, 'high')))
  return { critLow, tooLow, low, min, max, increased, high, tooHigh }
}

function generateScale(scale) {
  return {
    id: scale.id,
    name: scale.name,
    description: scale.description,
    builtIn: true,
    thresholds: Object.fromEntries(ELEMENT_DEFINITIONS.map((definition) => [definition.key, generateThresholds(definition, scale)])),
  }
}

export const DEFAULT_SCALE_ID = 'ati-standard'

export const BUILT_IN_SCALE_MAP = Object.freeze(Object.fromEntries(BUILT_IN_SCALES.map((scale) => [scale.id, Object.freeze(generateScale(scale))])))

export function emptyThresholds(elementKey) {
  const definition = ELEMENT_DEFINITION_MAP[elementKey]
  return definition ? { ...generateThresholds(definition, BUILT_IN_SCALES[0]) } : null
}

function sanitizeThresholds(raw, fallback) {
  const result = { ...fallback }
  for (const key of THRESHOLD_KEYS) {
    const value = Number(raw?.[key])
    if (Number.isFinite(value)) result[key] = value
  }
  return result
}

function sanitizeScale(raw) {
  const id = String(raw?.id || '').trim()
  if (!id) return null
  const base = BUILT_IN_SCALE_MAP[id]
  const thresholds = {}
  for (const definition of ELEMENT_DEFINITIONS) {
    const fallback = base?.thresholds[definition.key] || generateThresholds(definition, BUILT_IN_SCALES[0])
    thresholds[definition.key] = sanitizeThresholds(raw?.thresholds?.[definition.key], fallback)
  }
  return {
    id,
    name: String(raw?.name || base?.name || id).trim(),
    description: String(raw?.description || base?.description || '').trim(),
    builtIn: Boolean(base),
    thresholds,
  }
}

export function loadEvaluationScales() {
  const scales = Object.values(BUILT_IN_SCALE_MAP).map((scale) => sanitizeScale(scale))
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    for (const raw of Array.isArray(stored) ? stored : []) {
      const scale = sanitizeScale(raw)
      if (!scale) continue
      const index = scales.findIndex((item) => item.id === scale.id)
      if (index >= 0) scales[index] = scale
      else scales.push(scale)
    }
  } catch {
    // A corrupt store falls back to the built-in scales.
  }
  return scales
}

export function saveEvaluationScales(scales) {
  const safe = (Array.isArray(scales) ? scales : []).map(sanitizeScale).filter(Boolean)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  return safe
}

export function resetEvaluationScales() {
  localStorage.removeItem(STORAGE_KEY)
  return loadEvaluationScales()
}

export function scaleId(name, existing = []) {
  const base = String(name || 'skala').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'skala'
  const taken = new Set(existing.map((scale) => scale.id))
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function createScale(name, sourceScale) {
  const scales = loadEvaluationScales()
  const source = sourceScale || scales.find((scale) => scale.id === DEFAULT_SCALE_ID) || scales[0]
  return {
    id: scaleId(name, scales),
    name: String(name || '').trim() || 'Neue Bewertungsgrundlage',
    description: '',
    builtIn: false,
    thresholds: Object.fromEntries(Object.entries(source.thresholds).map(([key, value]) => [key, { ...value }])),
  }
}

export function findScale(scales, id) {
  return scales.find((scale) => scale.id === id) || scales.find((scale) => scale.id === DEFAULT_SCALE_ID) || scales[0] || null
}

export function loadActiveScaleId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || DEFAULT_SCALE_ID
  } catch {
    return DEFAULT_SCALE_ID
  }
}

export function saveActiveScaleId(id) {
  localStorage.setItem(ACTIVE_KEY, String(id || DEFAULT_SCALE_ID))
}

export function scoreValue(value, thresholds) {
  if (value === null || value === undefined || value === '') return null
  const reading = Number(value)
  if (!thresholds || !Number.isFinite(reading)) return null
  if (reading < thresholds.critLow) return 1
  if (reading < thresholds.tooLow) return 2
  if (reading < thresholds.low) return 3
  if (reading < thresholds.min) return 4
  if (reading > thresholds.tooHigh) return 9
  if (reading > thresholds.high) return 8
  if (reading > thresholds.increased) return 7
  if (reading > thresholds.max) return 6
  return 5
}

export function evaluateParameter(parameter, scale) {
  const thresholds = scale?.thresholds?.[parameter.key]
  const score = scoreValue(parameter.value, thresholds)
  if (score === null) return null
  return { score, thresholds, ...SCORE_BAND_MAP[score] }
}

// Open-ended on both outer bands: score 1 has no lower and score 9 no upper bound.
export function bandRange(score, thresholds) {
  if (!thresholds) return [null, null]
  return {
    1: [null, thresholds.critLow],
    2: [thresholds.critLow, thresholds.tooLow],
    3: [thresholds.tooLow, thresholds.low],
    4: [thresholds.low, thresholds.min],
    5: [thresholds.min, thresholds.max],
    6: [thresholds.max, thresholds.increased],
    7: [thresholds.increased, thresholds.high],
    8: [thresholds.high, thresholds.tooHigh],
    9: [thresholds.tooHigh, null],
  }[score] || [null, null]
}

export function thresholdOrderError(thresholds) {
  for (const key of THRESHOLD_KEYS) {
    if (!Number.isFinite(Number(thresholds?.[key]))) return `${THRESHOLD_FIELDS.find((field) => field.key === key).label} braucht einen Zahlenwert.`
  }
  for (let index = 1; index < THRESHOLD_KEYS.length; index += 1) {
    if (Number(thresholds[THRESHOLD_KEYS[index]]) < Number(thresholds[THRESHOLD_KEYS[index - 1]])) {
      return `${THRESHOLD_FIELDS[index].label} darf nicht kleiner sein als ${THRESHOLD_FIELDS[index - 1].label}.`
    }
  }
  return ''
}

// The optimum the dosing plan aims for: the midpoint of the approved window.
export function correctionTargetFor(thresholds) {
  if (!thresholds) return null
  return significant((Number(thresholds.min) + Number(thresholds.max)) / 2, 6)
}
