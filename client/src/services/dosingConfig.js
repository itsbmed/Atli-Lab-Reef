import { ELEMENT_DEFINITIONS } from '@/services/analysisCatalog'
import { ATI_PRODUCT_CATALOG } from '@/services/atiProductCatalog'
import { eligibleProductKeys } from '@/services/productEligibility'
import { defaultDosingEntry, normalizeDosingEntry } from '@/services/atiDosingDefaults'

const STORAGE_KEY = 'ati_dosing_config:v1'
const NON_DOSING_KEYS = new Set(['salinity', 'chloride', 'sodium', 'sulfur', 'phosphorus'])

export const DOSING_PARAMETERS = ELEMENT_DEFINITIONS.filter((parameter) => parameter.groupKey !== 'pollutants' && !NON_DOSING_KEYS.has(parameter.key))

function defaultEntry(key = '') {
  return defaultDosingEntry(key)
}

function defaults() {
  return Object.fromEntries(DOSING_PARAMETERS.map((parameter) => [parameter.key, defaultEntry(parameter.key)]))
}

export function loadDosingConfig() {
  const result = defaults()
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    for (const parameter of DOSING_PARAMETERS) result[parameter.key] = normalizeDosingEntry(stored[parameter.key], parameter.key)
  } catch {
    // Invalid or unavailable browser storage falls back to an empty configuration.
  }
  return result
}

export function saveDosingConfig(config) {
  const safeConfig = Object.fromEntries(DOSING_PARAMETERS.map((parameter) => [
    parameter.key,
    normalizeDosingEntry(config[parameter.key], parameter.key),
  ]))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig))
  return safeConfig
}

export function resetDosingEntry(key = '') {
  return defaultEntry(key)
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
    const custom = config[key]?.productOverride && config[key].productName ? config[key] : null
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
      productImage: custom ? custom.productImage : (catalog?.image || ''),
    })
  }
  return products
}

export function recommendedDosingProducts(items = [], parameters = []) {
  const eligible = new Set(eligibleProductKeys(items.map((item) => item.key), parameters))
  const seen = new Set()
  return items.flatMap((item) => {
    if (item.mode === 'water' || !eligible.has(item.key)) return []
    const products = item.dose ? [{
      parameterKey: item.key,
      productName: item.dose.productName,
      productUrl: item.dose.productUrl || '',
      productImage: recommendedProductsForKeys([item.key], parameters).find(product => product.productName === item.dose.productName)?.productImage || '',
    }] : recommendedProductsForKeys([item.key], parameters)
    return products.filter((product) => {
      const key = product.productName.toLocaleLowerCase('de-DE')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })
}
