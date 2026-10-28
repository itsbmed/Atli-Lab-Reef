// Logik des Assistenten „Neues Aquarium“: Schnellauswahl, Volumenrechner,
// Profil-Fortschritt und Entwurf. Ohne Vue, damit sie sich testen lässt.

import { formatWaterFieldValue, readWaterFieldValue, waterTypeGroups } from './waterTypeFields.js'
import { supportsSupplySystem } from './supplySystem.js'

// Die Angaben, die die Empfehlungen am stärksten verbessern – als Kacheln statt im Formular.
// Je Wassertyp erscheinen nur die, die es dort gibt.
export const QUICK_KEYS = Object.freeze(['aquarium_type', 'lighting_type', 'stocking_density', 'skimmer', 'sump', 'refugium', 'filter_type', 'resin_filter', 'storage_tank'])

// Die Bewertung gehört in den letzten Schritt, nicht zur Ausstattung.
export const EVALUATION_GROUP = 'Auswertung'

export function quickFields(waterType) {
  const fields = waterTypeGroups(waterType)
    .filter((group) => group.title !== EVALUATION_GROUP)
    .flatMap((group) => group.fields)
  return QUICK_KEYS.map((key) => fields.find((field) => field.key === key)).filter(Boolean)
}

// US-Kunden rechnen in Gallonen und Zoll. Gespeichert wird das Volumen immer in Litern.
export const LITRES_PER_GALLON = 3.785411784
export const CM_PER_INCH = 2.54
export const VOLUME_UNITS = Object.freeze({
  l: { short: 'L', length: 'cm' },
  gal: { short: 'gal', length: 'in' },
})
const VOLUME_UNIT_KEY = 'reef-pilot:volume-unit'

export function loadVolumeUnit(storage) {
  try { return storage.getItem(VOLUME_UNIT_KEY) === 'gal' ? 'gal' : 'l' } catch { return 'l' }
}
export function saveVolumeUnit(storage, unit) {
  try { storage.setItem(VOLUME_UNIT_KEY, unit) } catch { /* nichts zu tun */ }
}

// Eingabe in der gewählten Einheit → ganze Liter (null, wenn nichts Sinnvolles eingegeben ist).
export function litresFrom(value, unit) {
  const number = Number(value)
  if (value === '' || value === null || !(number > 0)) return null
  return Math.max(1, Math.round(unit === 'gal' ? number * LITRES_PER_GALLON : number))
}

// Liter → Anzeige in der gewählten Einheit, Gallonen auf eine Nachkommastelle.
export function litresTo(litres, unit) {
  const number = Number(litres)
  if (!(number > 0)) return null
  return unit === 'gal' ? Math.round((number / LITRES_PER_GALLON) * 10) / 10 : number
}

export function formatVolume(litres, unit) {
  const number = Number(litres)
  if (!(number > 0)) return ''
  const shown = unit === 'gal' ? Math.round(number / LITRES_PER_GALLON) : Math.round(number)
  return `${shown.toLocaleString('de-DE')} ${VOLUME_UNITS[unit === 'gal' ? 'gal' : 'l'].short}`
}

// Gestein, Bodengrund und Technik verdrängen Wasser; netto bleiben erfahrungsgemäß rund 85 %.
export const NET_SHARE = 0.85

// Seiten in cm (oder in Zoll mit lengthUnit 'in'); Ergebnis immer in Litern.
export function volumeFromDimensions(length, width, height, lengthUnit = 'cm') {
  const factor = lengthUnit === 'in' ? CM_PER_INCH : 1
  const sides = [length, width, height].map((side) => Number(side) * factor)
  if (!sides.every((side) => Number.isFinite(side) && side > 0)) return null
  const gross = (sides[0] * sides[1] * sides[2]) / 1000
  return { gross: Math.round(gross), net: Math.max(1, Math.round((gross * NET_SHARE) / 5) * 5) }
}

// „120×50×50 cm“, „120 x 50 x 50“ oder „120*50*50“ – zurück in Zahlen.
export function parseDimensions(text) {
  const numbers = String(text || '').match(/\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(',', '.'))) || []
  return numbers.length >= 3 ? numbers.slice(0, 3) : null
}

// In welcher Einheit eine Maßangabe geschrieben ist – „48×20×20 in“ oder 48"×20"×20" sind Zoll.
export function dimensionUnit(text) {
  return /\d\s*("|in\b|inch|zoll)/i.test(String(text || '')) ? 'in' : 'cm'
}

export function formatDimensions(length, width, height, lengthUnit = 'cm') {
  return `${length}×${width}×${height} ${lengthUnit === 'in' ? 'in' : 'cm'}`
}

function answered(form, field) {
  return field.type === 'checkbox' ? Boolean(readWaterFieldValue(form, field.model)) : Boolean(formatWaterFieldValue(form, field))
}

// Wie gut das Aquarium beschrieben ist, in Prozent – mit einem Hinweis, was als Nächstes am meisten bringt.
// Grunddaten 30, Schnellauswahl 40, weitere Details bis 20, Bild 10.
export function profileScore(form, { osmosisSupported = false } = {}) {
  const basics = [Boolean(form.name?.trim()), Number(form.net_volume) > 0]
  if (supportsSupplySystem(form.water_type)) basics.push(Boolean(form.supply_mode))
  const basicsPart = (basics.filter(Boolean).length / basics.length) * 30

  const quick = quickFields(form.water_type)
  const quickItems = quick.map((field) => ({ label: field.label, done: answered(form, field) }))
  if (osmosisSupported) quickItems.push({ label: 'Osmosequelle', done: Boolean(form.osmosis_source_id) })
  const quickPart = quickItems.length ? (quickItems.filter((item) => item.done).length / quickItems.length) * 40 : 40

  const quickKeys = new Set(quick.map((field) => field.key))
  const others = waterTypeGroups(form.water_type)
    .filter((group) => group.title !== EVALUATION_GROUP)
    .flatMap((group) => group.fields)
    .filter((field) => !quickKeys.has(field.key) && answered(form, field)).length
  const detailPart = Math.min(others, 5) * 4

  const imagePart = form.image ? 10 : 0
  const percent = Math.round(basicsPart + quickPart + detailPart + imagePart)
  const level = percent >= 100 ? 'Top-Profil' : percent >= 70 ? 'Fast komplett' : percent >= 40 ? 'Gut beschrieben' : 'Grundgerüst'
  const nextQuick = quickItems.find((item) => !item.done)
  const next = !basics.every(Boolean) ? 'Grunddaten vervollständigen'
    : nextQuick ? nextQuick.label
      : !form.image ? 'Ein Bild auswählen'
        : others < 5 ? 'Weitere Details ergänzen' : ''
  return { percent: Math.min(100, percent), level, next }
}

// Entwurf: ein angefangenes Aquarium übersteht Neuladen und Wegklicken.
const DRAFT_PREFIX = 'reef-pilot:aquarium-draft:'

export function draftKey(ownerId) {
  return `${DRAFT_PREFIX}${ownerId || 'guest'}`
}

export function hasContent(form) {
  return Boolean(form?.name?.trim() || Number(form?.net_volume) > 0 || form?.supply_mode || form?.image)
}

export function saveDraft(storage, ownerId, form, step) {
  if (!hasContent(form)) return false
  try {
    storage.setItem(draftKey(ownerId), JSON.stringify({ form, step, savedAt: new Date().toISOString() }))
    return true
  } catch {
    // Ein großes eigenes Foto kann das Kontingent sprengen – dann ohne Bild sichern.
    try {
      storage.setItem(draftKey(ownerId), JSON.stringify({ form: { ...form, image: null }, step, savedAt: new Date().toISOString() }))
      return true
    } catch {
      return false
    }
  }
}

export function loadDraft(storage, ownerId) {
  try {
    const draft = JSON.parse(storage.getItem(draftKey(ownerId)) || 'null')
    return draft && hasContent(draft.form) ? draft : null
  } catch {
    return null
  }
}

export function clearDraft(storage, ownerId) {
  try { storage.removeItem(draftKey(ownerId)) } catch { /* nichts zu tun */ }
}
