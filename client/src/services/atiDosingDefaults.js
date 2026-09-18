import { ATI_PRODUCT_CATALOG } from './atiProductCatalog.js'

// ATI shop dosage instructions checked 2026-09-18; source links are the exact
// catalog product pages. raisesBy and daily limits use the parameter's unit.
export const ATI_DOSING_FORMULAS = Object.freeze({
  kh: { mlPer100Liters: 1, raisesBy: 0.1, maxDailyIncrease: 4, unit: 'dKH' },
  fluoride: { mlPer100Liters: 10, raisesBy: 0.2, maxDailyIncrease: 0.3, unit: 'mg/l' },
  boron: { mlPer100Liters: 100, raisesBy: 0.5, maxDailyIncrease: 0.5, unit: 'mg/l' },
  bromine: { mlPer100Liters: 1, raisesBy: 1, maxDailyIncrease: 10, unit: 'mg/l' },
  calcium: { mlPer100Liters: 1, raisesBy: 2, maxDailyIncrease: 40, unit: 'mg/l' },
  potassium: { mlPer100Liters: 1, raisesBy: 1, maxDailyIncrease: 40, unit: 'mg/l' },
  magnesium: { mlPer100Liters: 1, raisesBy: 1, maxDailyIncrease: 100, unit: 'mg/l' },
  strontium: { mlPer100Liters: 1, raisesBy: 0.2, maxDailyIncrease: 2, unit: 'mg/l' },
  cobalt: { mlPer100Liters: 1, raisesBy: 4, maxDailyIncrease: 0.4, unit: 'µg/l' },
  chromium: { mlPer100Liters: 1, raisesBy: 1, maxDailyIncrease: 0.5, unit: 'µg/l' },
  copper: { mlPer100Liters: 1, raisesBy: 1, maxDailyIncrease: 0.5, unit: 'µg/l' },
  iron: { mlPer100Liters: 1, raisesBy: 4, maxDailyIncrease: 4, unit: 'µg/l' },
  iodine: { mlPer100Liters: 1, raisesBy: 10, maxDailyIncrease: 20, unit: 'µg/l' },
  lithium: { mlPer100Liters: 1, raisesBy: 15, maxDailyIncrease: 15, unit: 'µg/l' },
  manganese: { mlPer100Liters: 1, raisesBy: 4, maxDailyIncrease: 4, unit: 'µg/l' },
  molybdenum: { mlPer100Liters: 1, raisesBy: 6, maxDailyIncrease: 12, unit: 'µg/l' },
  nickel: { mlPer100Liters: 1, raisesBy: 3, maxDailyIncrease: 3, unit: 'µg/l' },
  selenium: { mlPer100Liters: 1, raisesBy: 0.5, maxDailyIncrease: 0.5, unit: 'µg/l' },
  vanadium: { mlPer100Liters: 1, raisesBy: 5, maxDailyIncrease: 1.5, unit: 'µg/l' },
  zinc: { mlPer100Liters: 1, raisesBy: 10, maxDailyIncrease: 2, unit: 'µg/l' },
})

export function defaultDosingEntry(key = '') {
  const product = ATI_PRODUCT_CATALOG[key]
  const formula = ATI_DOSING_FORMULAS[key]
  return {
    defaultsVersion: 2, enabled: Boolean(formula), verified: Boolean(formula), productOverride: false,
    productName: product?.name || '', productUrl: product?.url || '', productImage: product?.image || '',
    mlPer100Liters: 0, raisesBy: 0, maxDailyIncrease: 0, unit: '', ...formula,
    verificationSource: formula ? 'manufacturer' : '', sourceUrl: formula ? product.url : '', verifiedAt: formula ? '2026-09-18' : '',
    instructions: formula ? 'Tagesmenge langsam in einen gut durchströmten Bereich geben. Herstellerangaben beachten und nach dem Korrekturkurs erneut messen.' : '',
  }
}

function normalizeUrl(raw) {
  const value = String(raw || '').trim()
  return value ? (/^https?:\/\//i.test(value) ? value : `https://${value}`) : ''
}

export function normalizeDosingEntry(entry, key = '') {
  const standard = defaultDosingEntry(key)
  if (!entry) return standard
  const untouchedLegacy = !entry.defaultsVersion && !entry.enabled && !entry.verified && !entry.productOverride
    && (!entry.productName || entry.productName === standard.productName)
    && ['mlPer100Liters', 'raisesBy', 'maxDailyIncrease'].every(field => !Number(entry[field]))
    && !String(entry.instructions || '').trim()
  if (untouchedLegacy) return standard
  const productOverride = entry.productOverride ?? Boolean(entry.productName)
  const normalized = {
    ...standard, defaultsVersion: 2, enabled: Boolean(entry.enabled), verified: Boolean(entry.verified), productOverride: Boolean(productOverride),
    productName: productOverride ? String(entry.productName || '').trim() : standard.productName,
    productUrl: productOverride ? normalizeUrl(entry.productUrl) : standard.productUrl,
    productImage: productOverride ? normalizeUrl(entry.productImage) : standard.productImage,
    mlPer100Liters: Math.max(0, Number(entry.mlPer100Liters) || 0), raisesBy: Math.max(0, Number(entry.raisesBy) || 0), maxDailyIncrease: Math.max(0, Number(entry.maxDailyIncrease) || 0),
    unit: String(entry.unit || standard.unit), instructions: String(entry.instructions || '').trim(),
  }
  const usesManufacturerFormula = Boolean(ATI_DOSING_FORMULAS[key]) && normalized.productName === standard.productName
    && normalized.productUrl === standard.productUrl && normalized.unit === standard.unit
    && normalized.mlPer100Liters === standard.mlPer100Liters && normalized.raisesBy === standard.raisesBy
    && normalized.maxDailyIncrease === standard.maxDailyIncrease
  normalized.verificationSource = usesManufacturerFormula ? 'manufacturer' : 'lab'
  normalized.sourceUrl = usesManufacturerFormula ? standard.sourceUrl : ''
  normalized.verifiedAt = usesManufacturerFormula ? standard.verifiedAt : ''
  return normalized
}
