import { ELEMENT_DEFINITIONS } from '@/services/analysisCatalog'

const STORAGE_KEY = 'ati_dosing_config:v1'
const NON_DOSING_KEYS = new Set(['salinity', 'chloride', 'sodium', 'sulfur', 'phosphorus'])

export const DOSING_PARAMETERS = ELEMENT_DEFINITIONS.filter((parameter) => parameter.groupKey !== 'pollutants' && !NON_DOSING_KEYS.has(parameter.key))

function defaultEntry() {
  return {
    enabled: false,
    verified: false,
    productName: '',
    mlPer100Liters: 0,
    raisesBy: 0,
    maxDailyIncrease: 0,
    instructions: '',
  }
}

function defaults() {
  return Object.fromEntries(DOSING_PARAMETERS.map((parameter) => [parameter.key, defaultEntry()]))
}

function normalizeEntry(entry = {}) {
  return {
    enabled: Boolean(entry.enabled),
    verified: Boolean(entry.verified),
    productName: String(entry.productName || '').trim(),
    mlPer100Liters: Math.max(0, Number(entry.mlPer100Liters) || 0),
    raisesBy: Math.max(0, Number(entry.raisesBy) || 0),
    maxDailyIncrease: Math.max(0, Number(entry.maxDailyIncrease) || 0),
    instructions: String(entry.instructions || '').trim(),
  }
}

export function loadDosingConfig() {
  const result = defaults()
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    for (const parameter of DOSING_PARAMETERS) result[parameter.key] = normalizeEntry(stored[parameter.key])
  } catch {
    // Invalid or unavailable browser storage falls back to an empty configuration.
  }
  return result
}

export function saveDosingConfig(config) {
  const safeConfig = Object.fromEntries(DOSING_PARAMETERS.map((parameter) => [
    parameter.key,
    normalizeEntry(config[parameter.key]),
  ]))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig))
  return safeConfig
}

export function resetDosingEntry() {
  return defaultEntry()
}
