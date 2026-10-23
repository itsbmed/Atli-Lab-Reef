// Einstellungen für den PDF-Export eines Laborberichts: Vorlagen, Inhalt, Format und
// eine Seitenschätzung für die Vorschau. Die PDF-Erzeugung selbst folgt später.

export const PDF_SECTIONS = Object.freeze([
  { key: 'cover', label: 'Deckblatt & Gesamtbewertung', hint: 'Aquarium, Bewertung und die wichtigsten Hinweise auf einen Blick', locked: true },
  { key: 'values', label: 'Messwerte', hint: 'Kompakte Tabelle mit Messwert und Zielbereich' },
  { key: 'osmosis', label: 'Osmosewasser', hint: 'Ergebnisse der Osmoseprobe als Tabelle' },
  { key: 'charts', label: 'Diagramme', hint: 'Zusammensetzung, Verhältnisse und Wachstumsfaktoren' },
  { key: 'recommendations', label: 'Empfehlungen', hint: 'Maßnahmen mit Begründung und Produkten' },
  { key: 'dosing', label: 'Dosierungsplan', hint: 'Tag für Tag mit Mengen und Tageslimits' },
  { key: 'products', label: 'Produkte mit QR-Code', hint: 'Die Produkte aus den Empfehlungen – scannen und direkt im Shop öffnen' },
])

// Was der PDF-Dialog auf der Website gerade zeigt. Fertig gebaut ist alles; freigegeben
// wird schrittweise. Alles auf true ergibt den vollständigen Dialog.
export const PDF_EXPORT_FEATURES = Object.freeze({
  presets: true, // alle drei Vorlagen zeigen (sonst nur der Kurzbericht)
  enabledPresets: null, // davon anklickbar (null = alle) – die übrigen sind sichtbar, aber gesperrt
  format: true, // Papier und Farbe
  details: true, // Aquariumdaten und Barcode ein/aus
  sections: true, // Bereiche einzeln schalten, mit Feineinstellungen (sonst Liste „Enthalten“)
  note: true, // persönliche Notiz auf dem Deckblatt
  remember: true, // Auswahl für das nächste Mal merken
  startPreset: 'full',
})

export const PDF_PRESETS = Object.freeze([
  { key: 'short', label: 'Kurzbericht', hint: 'Nur was zu tun ist' },
  { key: 'full', label: 'Vollständig', hint: 'Alles aus dem Bericht' },
  { key: 'dosing', label: 'Dosierplan', hint: 'Zum Aufhängen am Becken' },
])

const NOTE_LIMIT = 280
export const PDF_NOTE_LIMIT = NOTE_LIMIT

// Was der Bericht überhaupt hergibt – nicht vorhandene Bereiche lassen sich nicht wählen.
export function availableSections(context) {
  return {
    cover: true,
    values: (context.groups || []).length > 0,
    osmosis: Number(context.osmosisCount) > 0,
    charts: Boolean(context.charts && Object.values(context.charts).some(Boolean)),
    recommendations: Number(context.recommendationCount) > 0,
    dosing: Number(context.dosingCount) > 0,
    products: Number(context.productCount) > 0,
  }
}

function baseSettings(context) {
  return {
    sections: { cover: true, values: true, osmosis: true, charts: true, recommendations: true, dosing: true, products: true },
    values: { scope: 'all', groups: (context.groups || []).map((group) => group.key) },
    osmosis: { scope: 'all' },
    charts: { composition: true, ratios: true, growth: true },
    recommendations: { hideDone: false },
    dosing: { checkboxes: true },
    format: { orientation: 'portrait', color: 'color', barcode: true, aquarium: true },
    note: '',
  }
}

export function presetSettings(key, context, current = null) {
  const settings = baseSettings(context)
  // Format und Notiz gehören dem Kunden, nicht der Vorlage.
  if (current) {
    settings.format = { ...current.format }
    settings.note = current.note
  }
  if (key === 'short') {
    Object.assign(settings.sections, { charts: false, products: false })
    settings.values.scope = 'issues'
    settings.osmosis.scope = 'found'
    settings.recommendations.hideDone = true
  } else if (key === 'dosing') {
    Object.assign(settings.sections, { values: false, osmosis: false, charts: false, recommendations: false })
    settings.format.orientation = 'landscape'
  }
  return clampToContext(settings, context)
}

// Die Produkte stammen aus den Empfehlungen – ohne Empfehlungen gibt es sie nicht.
export function sectionSelectable(key, settings, context) {
  if (!availableSections(context)[key]) return false
  return key !== 'products' || Boolean(settings.sections.recommendations)
}

// Nicht verfügbare Bereiche sind aus, unbekannte Gruppen fallen weg, mindestens eine Gruppe bleibt.
// Produkte gibt es nur zusammen mit den Empfehlungen.
export function clampToContext(settings, context) {
  const available = availableSections(context)
  const known = (context.groups || []).map((group) => group.key)
  const next = JSON.parse(JSON.stringify(settings))
  for (const key of Object.keys(next.sections)) next.sections[key] = Boolean(next.sections[key] && available[key])
  next.sections.cover = true
  if (!next.sections.recommendations) next.sections.products = false
  delete next.values.style // frühere Wahl „Mit Skala“ / „Kompakte Tabelle“ – gedruckt wird immer die Tabelle
  const groups = (next.values.groups || []).filter((key) => known.includes(key))
  next.values.groups = groups.length ? groups : [...known]
  if (context.charts) for (const key of ['composition', 'ratios', 'growth']) next.charts[key] = Boolean(next.charts[key] && context.charts[key])
  if (!['composition', 'ratios', 'growth'].some((key) => next.charts[key])) next.sections.charts = false
  next.note = String(next.note || '').slice(0, NOTE_LIMIT)
  return next
}

export function defaultSettings(context) {
  return presetSettings('full', context)
}

// Entspricht die Auswahl einer Vorlage? Sonst ist es eine eigene Auswahl.
export function matchPreset(settings, context) {
  const strip = (value) => JSON.stringify({ ...value, format: { ...value.format, orientation: null }, note: '' })
  return PDF_PRESETS.find((preset) => strip(presetSettings(preset.key, context, settings)) === strip(settings))?.key || 'custom'
}

// Messwerte und Osmose stehen als kompakte Tabelle in zwei Spalten wie unter „Alle Werte“.
const VALUE_ROWS_PER_PAGE = 48
const OSMOSIS_ROWS_PER_PAGE = 60

// Seiten in der Reihenfolge des PDFs, jede mit Bereich und Titel – Grundlage der Vorschau.
export function estimatePages(settings, context) {
  const pages = []
  const add = (section, title, count = 1, extra = {}) => {
    for (let index = 0; index < count; index += 1) pages.push({ id: `${section}-${index}`, section, title: count > 1 ? `${title} ${index + 1}/${count}` : title, ...extra })
  }
  const on = settings.sections
  add('cover', 'Deckblatt', 1, { note: Boolean(settings.note.trim()) })
  if (on.values) {
    const rows = valueRowCount(settings, context)
    if (rows) add('values', 'Messwerte', Math.ceil(rows / VALUE_ROWS_PER_PAGE))
  }
  if (on.osmosis) {
    const rows = settings.osmosis.scope === 'found' ? Number(context.osmosisFound || 0) : Number(context.osmosisCount || 0)
    add('osmosis', 'Osmosewasser', Math.max(1, Math.ceil(rows / OSMOSIS_ROWS_PER_PAGE)))
  }
  if (on.charts) {
    if (settings.charts.composition) add('charts', 'Zusammensetzung', 1, { chart: 'composition' })
    if (settings.charts.ratios || settings.charts.growth) add('charts', settings.charts.ratios && settings.charts.growth ? 'Verhältnisse & Wachstum' : settings.charts.ratios ? 'Elementverhältnisse' : 'Wachstumsfaktoren', 1, { chart: 'pairs' })
  }
  if (on.recommendations) {
    const count = settings.recommendations.hideDone ? Number(context.openRecommendationCount || 0) : Number(context.recommendationCount || 0)
    add('recommendations', 'Empfehlungen', Math.max(1, Math.ceil(count / 3)))
  }
  if (on.dosing) add('dosing', 'Dosierungsplan', Math.max(1, Math.ceil(Number(context.dosingCount || 0) / 8)), { checkboxes: settings.dosing.checkboxes })
  if (on.products) add('products', 'Produkte', Math.max(1, Math.ceil(Number(context.productCount || 0) / 6)))
  return pages
}

export function valueRowCount(settings, context) {
  return (context.groups || [])
    .filter((group) => settings.values.groups.includes(group.key))
    .reduce((sum, group) => sum + (settings.values.scope === 'issues' ? group.issueCount : group.total), 0)
}

// Die letzte Auswahl je Konto im Browser – beim nächsten Export ist alles wieder so eingestellt.
const STORAGE_PREFIX = 'reef-pilot:pdf-settings:'

export function savePdfSettings(storage, ownerId, settings) {
  try { storage.setItem(`${STORAGE_PREFIX}${ownerId || 'guest'}`, JSON.stringify(settings)); return true } catch { return false }
}

export function loadPdfSettings(storage, ownerId, context) {
  let saved = null
  try { saved = JSON.parse(storage.getItem(`${STORAGE_PREFIX}${ownerId || 'guest'}`) || 'null') } catch { saved = null }
  if (!saved || typeof saved !== 'object') return null
  const base = baseSettings(context)
  const merged = {
    ...base,
    ...saved,
    sections: { ...base.sections, ...saved.sections },
    values: { ...base.values, ...saved.values },
    osmosis: { ...base.osmosis, ...saved.osmosis },
    charts: { ...base.charts, ...saved.charts },
    recommendations: { ...base.recommendations, ...saved.recommendations },
    dosing: { ...base.dosing, ...saved.dosing },
    format: { ...base.format, ...saved.format },
  }
  return clampToContext(merged, context)
}

export function clearPdfSettings(storage, ownerId) {
  try { storage.removeItem(`${STORAGE_PREFIX}${ownerId || 'guest'}`) } catch { /* nichts zu tun */ }
}
