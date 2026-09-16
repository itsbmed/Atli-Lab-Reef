import { ELEMENT_DEFINITIONS } from '@/services/analysisCatalog'
import { ATI_PRODUCT_CATALOG } from '@/services/atiProductCatalog'
import { eligibleProductKeys } from '@/services/productEligibility'

const STORAGE_KEY = 'ati_dosing_config:v1'
const NON_DOSING_KEYS = new Set(['salinity', 'chloride', 'sodium', 'sulfur', 'phosphorus'])

export const DOSING_PARAMETERS = ELEMENT_DEFINITIONS.filter((parameter) => parameter.groupKey !== 'pollutants' && !NON_DOSING_KEYS.has(parameter.key))

function defaultEntry() {
  return {
    enabled: false,
    verified: false,
    productName: '',
    productUrl: '',
    mlPer100Liters: 0,
    raisesBy: 0,
    maxDailyIncrease: 0,
    instructions: '',
  }
}

function defaults() {
  return Object.fromEntries(DOSING_PARAMETERS.map((parameter) => [parameter.key, defaultEntry()]))
}

function normalizeUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function normalizeEntry(entry = {}) {
  return {
    enabled: Boolean(entry.enabled),
    verified: Boolean(entry.verified),
    productName: String(entry.productName || '').trim(),
    productUrl: normalizeUrl(entry.productUrl),
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

// Sammelt die empfohlenen Produkte für eine Menge an Parameter-Keys (z. B. aus
// einer Empfehlungsgruppe), dedupliziert nach Name. Ein im Admin-Bereich hinterlegtes
// Produkt hat Vorrang; ohne eigene Konfiguration greift automatisch das reale
// ATI-Produkt aus dem Shop-Katalog (siehe atiProductCatalog.js) inklusive Bild.
// Die exakte ml-Formel bleibt davon unberührt weiterhin laborgeprüft-gated.
export function recommendedProductsForKeys(keys = [], parameters = []) {
  const config = loadDosingConfig()
  const seen = new Set()
  const products = []
  for (const key of eligibleProductKeys(keys, parameters)) {
    const custom = config[key]?.enabled && config[key].productName ? config[key] : null
    const catalog = ATI_PRODUCT_CATALOG[key]
    const productName = custom?.productName || catalog?.name
    if (!productName) continue
    const dedupeKey = productName.toLocaleLowerCase('de-DE')
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    products.push({
      parameterKey: key,
      productName,
      productUrl: custom ? custom.productUrl : (catalog?.url || ''),
      productImage: custom ? '' : (catalog?.image || ''),
    })
  }
  return products
}
