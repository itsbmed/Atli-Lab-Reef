// Chronik: alle ausgewerteten Laborberichte eines Kontos als Verlauf je Aquarium.
// Reine Datenaufbereitung – keine Vue-, Store- oder DOM-Abhängigkeiten, damit sich
// Vergleich, Verlauf und Übersicht dieselben Zahlen teilen und testbar bleiben.

import { ANALYSIS_GROUPS, ELEMENT_DEFINITIONS, ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'
import { gaugeScale } from './targetGauge.js'

// Farben je Aquarium (Reihenfolge geprüft auf Farbfehlsichtigkeit, siehe dataviz-Validator).
// Mehr als sechs farbige Linien unterscheidet niemand sicher – weitere Aquarien bleiben grau.
export const TANK_COLORS = Object.freeze(['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'])
export const TANK_COLOR_OTHER = '#9aa8b6'

export const PARAMETER_SETS = Object.freeze([
  { key: 'core', label: 'Hauptelemente', keys: ['kh', 'calcium', 'magnesium'] },
  { key: 'nutrients', label: 'Nährstoffe', keys: ['nitrate', 'phosphate'] },
  { key: 'balance', label: 'Salzbalance', keys: ['salinity', 'sodium', 'chloride', 'potassium', 'sulfur'] },
])

// Ohne gespeicherte Startansicht: die zwei zuletzt untersuchten Aquarien und drei Hauptwerte.
export const DEFAULT_PARAMETERS = Object.freeze(['kh', 'calcium', 'magnesium'])
export const DEFAULT_TANK_COUNT = 2

export const RANGES = Object.freeze([
  { key: '3m', label: '3 Monate', months: 3 },
  { key: '6m', label: '6 Monate', months: 6 },
  { key: '12m', label: '12 Monate', months: 12 },
  { key: 'all', label: 'Alles', months: null },
])

const DAY = 24 * 60 * 60 * 1000

// Das Probendatum: registriert wird die Probe am Tag der Entnahme.
export function reportDate(analysis) {
  return analysis.createdAt || analysis.receivedAt || analysis.completedAt || null
}

function reading(parameter) {
  const undetectable = parameter.resultStatus === 'below_detection'
  const value = Number(parameter.value)
  return {
    value: undetectable || !Number.isFinite(value) ? null : value,
    reported: parameter.reportedValue ?? parameter.value,
    undetectable,
    tone: parameter.tone || 'good',
    direction: parameter.sourceDirection || '',
    unit: parameter.unit,
  }
}

// Aquarien mit mindestens einem ausgewerteten Bericht, je Aquarium chronologisch.
export function buildTanks(analyses = [], aquariums = []) {
  const byTank = new Map()
  for (const analysis of analyses) {
    if (analysis.status !== 'completed' || !analysis.parameters?.length || !analysis.aquariumId) continue
    const date = reportDate(analysis)
    if (!date) continue
    const values = Object.fromEntries(analysis.parameters.map((parameter) => [parameter.key, reading(parameter)]))
    const list = byTank.get(analysis.aquariumId) || []
    list.push({ id: analysis.id, date, time: new Date(date).getTime(), score: analysis.score ?? null, severity: analysis.severity || '', number: analysis.reportNumber || '', values, parameters: analysis.parameters })
    byTank.set(analysis.aquariumId, list)
  }
  const names = new Map(aquariums.map((aquarium) => [aquarium.id, aquarium]))
  return [...byTank.entries()]
    .map(([id, reports]) => {
      reports.sort((a, b) => a.time - b.time)
      const aquarium = names.get(id)
      const fallback = analyses.find((analysis) => analysis.aquariumId === id)
      return {
        id,
        name: aquarium?.name || fallback?.aquariumName || 'Aquarium',
        waterType: aquarium?.water_type || fallback?.waterType || '',
        volume: Number(aquarium?.net_volume) || null,
        reports,
        latest: reports.at(-1),
      }
    })
    // Zuletzt untersuchte Aquarien zuerst – das sind die, über die man gerade nachdenkt.
    .sort((a, b) => b.latest.time - a.latest.time || a.name.localeCompare(b.name, 'de'))
}

export function rangeStart(rangeKey, now = Date.now()) {
  const range = RANGES.find((item) => item.key === rangeKey)
  if (!range?.months) return -Infinity
  const start = new Date(now)
  start.setMonth(start.getMonth() - range.months)
  return start.getTime()
}

// Berichte im Zeitraum; der Filter wirkt auf alle Ansichten gleich.
export function reportsInRange(tank, rangeKey, now = Date.now()) {
  const start = rangeStart(rangeKey, now)
  return tank.reports.filter((report) => report.time >= start)
}

// Farben bleiben am Aquarium haften: wer dazukommt, nimmt den ersten freien Platz,
// wer geht, gibt seinen frei – die anderen behalten ihre Farbe.
export function assignColors(selectedIds, previous = {}) {
  const next = {}
  const taken = new Set()
  for (const id of selectedIds) {
    const slot = previous[id]
    if (Number.isInteger(slot) && slot < TANK_COLORS.length && !taken.has(slot)) { next[id] = slot; taken.add(slot) }
  }
  for (const id of selectedIds) {
    if (id in next) continue
    const free = TANK_COLORS.findIndex((_, index) => !taken.has(index))
    next[id] = free === -1 ? -1 : free
    if (free !== -1) taken.add(free)
  }
  return next
}

export function colorFor(slot) {
  return slot >= 0 ? TANK_COLORS[slot] : TANK_COLOR_OTHER
}

export function parameterMeta(key, content = {}) {
  const definition = ELEMENT_DEFINITION_MAP[key]
  if (!definition) return null
  const guide = content[key] || {}
  const pick = (a, b) => (Number.isFinite(Number(a)) && a !== null && a !== '' ? Number(a) : b)
  const range = definition.referenceRanges.Meerwasser
  return {
    key,
    label: definition.label,
    symbol: definition.symbol,
    unit: guide.unit || definition.unit,
    groupKey: definition.groupKey,
    group: definition.group,
    min: pick(guide.targetMin, range.min),
    max: pick(guide.targetMax, range.max),
  }
}

export function parameterCatalog(content = {}) {
  return ANALYSIS_GROUPS.map((group) => ({
    ...group,
    items: ELEMENT_DEFINITIONS.filter((definition) => definition.groupKey === group.key).map((definition) => parameterMeta(definition.key, content)),
  }))
}

// Parameter, die im jeweils letzten Bericht der Auswahl außerhalb des Zielbereichs liegen.
export function flaggedParameters(tanks, content = {}) {
  return ELEMENT_DEFINITIONS.map((definition) => definition.key).filter((key) => {
    const meta = parameterMeta(key, content)
    return tanks.some((tank) => {
      const item = tank.latest?.values[key]
      return item && !item.undetectable && position(item.value, meta.min, meta.max) !== 'in'
    })
  })
}

// Lage eines Werts zum Zielbereich, nach der Zahl – nicht nach dem Laborurteil.
export function position(value, min, max) {
  if (!Number.isFinite(value)) return 'none'
  const span = max - min || Math.abs(max) || 1
  const off = value < min ? min - value : value > max ? value - max : 0
  if (off === 0) return 'in'
  return `${off > span ? 'far' : 'near'}-${value < min ? 'low' : 'high'}`
}

// Eine gemeinsame Skala für mehrere Werte: Zielbereich in der Mitte, Ausreißer gedehnt.
export function sharedScale(min, max, values = []) {
  const finite = values.filter(Number.isFinite)
  if (!finite.length) return gaugeScale(min, max, null)
  const high = gaugeScale(min, max, Math.max(...finite))
  const low = gaugeScale(min, max, Math.min(...finite))
  return { start: Math.min(low.start, high.start), end: Math.max(low.end, high.end) }
}

// Veränderung gegenüber dem vorigen Bericht desselben Aquariums.
export function delta(reports, key) {
  const withValue = reports.filter((report) => Number.isFinite(report.values[key]?.value))
  if (withValue.length < 2) return null
  const [previous, current] = withValue.slice(-2)
  const change = current.values[key].value - previous.values[key].value
  const days = Math.round((current.time - previous.time) / DAY)
  return { change, previous: previous.values[key].value, since: previous.date, days }
}

// Zeitreihe eines Parameters für ein Aquarium.
export function series(reports, key) {
  return reports
    .filter((report) => report.values[key])
    .map((report) => ({ time: report.time, date: report.date, reportId: report.id, ...report.values[key] }))
}

// Der Wert eines Aquariums an einem Datum: der letzte Bericht bis dahin.
export function valueAt(points, time) {
  let found = null
  for (const point of points) if (point.time <= time + DAY / 2) found = point
  return found
}

// Gerundete Achsenteilung mit 3–5 Strichen.
export function niceTicks(start, end, count = 4) {
  const span = end - start
  if (!(span > 0)) return [start]
  const raw = span / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => span / candidate <= count + 0.5)
  const first = Math.ceil(start / step - 1e-9) * step
  const ticks = []
  for (let value = first; value <= end + step * 1e-9; value += step) ticks.push(Number(value.toPrecision(12)))
  return ticks
}

export function formatValue(value, digits) {
  if (!Number.isFinite(value)) return '—'
  const decimals = digits ?? (Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : Math.abs(value) >= 1 ? 2 : 3)
  return value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

export function formatDate(iso, style = 'short') {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  if (style === 'long') return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  if (style === 'month') return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// CSV für die Übersicht: eine Zeile je Parameter, eine Spalte je Aquarium.
export function toCsv(tanks, keys, content = {}) {
  const escape = (text) => (/[";\n]/.test(text) ? `"${String(text).replaceAll('"', '""')}"` : String(text))
  const header = ['Parameter', 'Einheit', 'Ziel min', 'Ziel max', ...tanks.map((tank) => `${tank.name} (${formatDate(tank.latest.date)})`)]
  const rows = keys.map((key) => {
    const meta = parameterMeta(key, content)
    return [meta.label, meta.unit, meta.min, meta.max, ...tanks.map((tank) => {
      const item = tank.latest.values[key]
      if (!item) return ''
      return item.undetectable ? 'n. n.' : String(item.value).replace('.', ',')
    })]
  })
  return [header, ...rows].map((row) => row.map((cell) => escape(String(cell).replace(/^(-?\d+)\.(\d+)$/, '$1,$2'))).join(';')).join('\n')
}

// Auswahl in der Adresszeile: teilbar, Zurück-Taste funktioniert.
export function readQuery(query, tanks) {
  const list = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
  const known = new Set(tanks.map((tank) => tank.id))
  const tankIds = list(query.tanks).filter((id) => known.has(id))
  const keys = list(query.params).filter((key) => ELEMENT_DEFINITION_MAP[key])
  return {
    tankIds: tankIds.length ? tankIds : tanks.slice(0, DEFAULT_TANK_COUNT).map((tank) => tank.id),
    keys,
    view: ['compare', 'trend', 'matrix'].includes(query.view) ? query.view : 'compare',
    range: RANGES.some((range) => range.key === query.range) ? query.range : 'all',
  }
}

// Startansicht: was die Chronik beim Öffnen zeigt, je Konto im Browser gespeichert.
const START_VIEW_PREFIX = 'reef-pilot:chronik-start:'
const VIEW_KEYS = ['compare', 'trend']
const LAYOUT_KEYS = ['combined', 'separate']

function startViewKey(ownerId) {
  return `${START_VIEW_PREFIX}${ownerId || 'guest'}`
}

export function saveStartView(storage, ownerId, state) {
  const view = { tankIds: [...state.tankIds], keys: [...state.keys], view: state.view, layout: state.layout, range: state.range }
  try { storage.setItem(startViewKey(ownerId), JSON.stringify(view)); return view } catch { return null }
}

export function loadStartView(storage, ownerId) {
  try { return JSON.parse(storage.getItem(startViewKey(ownerId)) || 'null') } catch { return null }
}

export function clearStartView(storage, ownerId) {
  try { storage.removeItem(startViewKey(ownerId)) } catch { /* nichts zu tun */ }
}

export function sameView(a, b) {
  if (!a || !b) return false
  const same = (x, y) => x.length === y.length && x.every((item) => y.includes(item))
  return same(a.tankIds, b.tankIds) && same(a.keys, b.keys) && a.view === b.view && a.layout === b.layout && a.range === b.range
}

// Favoriten: benannte Auswahlen, je Konto im Browser. Eine Liste merkt sich Aquarien,
// Parameter oder beides; nur wer beides merkt, nimmt auch Ansicht und Zeitraum mit.
// Eine davon kann die Startansicht sein.
const FAVORITES_PREFIX = 'reef-pilot:chronik-favorites:'
export const MAX_FAVORITES = 12

function favoritesKey(ownerId) {
  return `${FAVORITES_PREFIX}${ownerId || 'guest'}`
}

export function makeFavorite({ name, state, tanks = true, params = true, id = '' }) {
  const full = tanks && params
  return {
    id: id || `fav-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: String(name || '').trim().slice(0, 40) || 'Meine Auswahl',
    tankIds: tanks ? [...state.tankIds] : null,
    keys: params ? [...state.keys] : null,
    ...(full ? { view: state.view, layout: state.layout, range: state.range } : {}),
  }
}

// Die alte einzelne Startansicht wird beim ersten Laden zum Favoriten „Meine Startansicht“.
export function loadFavorites(storage, ownerId) {
  let data = null
  try { data = JSON.parse(storage.getItem(favoritesKey(ownerId)) || 'null') } catch { data = null }
  if (data && Array.isArray(data.lists)) {
    const lists = data.lists.filter((item) => item && item.id && (item.tankIds || item.keys))
    return { lists, startId: lists.some((item) => item.id === data.startId) ? data.startId : '' }
  }
  const legacy = loadStartView(storage, ownerId)
  if (!legacy) return { lists: [], startId: '' }
  const migrated = makeFavorite({ name: 'Meine Startansicht', state: legacy, id: 'fav-start' })
  const result = { lists: [migrated], startId: migrated.id }
  if (saveFavorites(storage, ownerId, result)) clearStartView(storage, ownerId)
  return result
}

export function saveFavorites(storage, ownerId, data) {
  try {
    storage.setItem(favoritesKey(ownerId), JSON.stringify({ lists: data.lists.slice(0, MAX_FAVORITES), startId: data.startId || '' }))
    return true
  } catch {
    return false
  }
}

// Ein Favorit ersetzt nur, was er gemerkt hat – der Rest der Auswahl bleibt.
export function applyFavorite(favorite, state, { tanks = [], knownKeys = [] } = {}) {
  const known = new Set(tanks.map((tank) => tank.id))
  const allowed = new Set(knownKeys)
  const next = { ...state }
  if (favorite.tankIds) {
    const ids = favorite.tankIds.filter((id) => known.has(id))
    if (ids.length) next.tankIds = ids
  }
  if (favorite.keys) {
    const keys = favorite.keys.filter((key) => allowed.has(key))
    if (keys.length) next.keys = keys
  }
  if (VIEW_KEYS.includes(favorite.view)) next.view = favorite.view
  if (LAYOUT_KEYS.includes(favorite.layout)) next.layout = favorite.layout
  if (RANGES.some((item) => item.key === favorite.range)) next.range = favorite.range
  return next
}

// Aktiv ist ein Favorit, solange alles, was er gemerkt hat, der aktuellen Auswahl entspricht.
export function matchesFavorite(favorite, state) {
  if (!favorite || !state) return false
  const same = (x, y) => x.length === y.length && x.every((item) => y.includes(item))
  if (favorite.tankIds && !same(favorite.tankIds, state.tankIds)) return false
  if (favorite.keys && !same(favorite.keys, state.keys)) return false
  return ['view', 'layout', 'range'].every((key) => !favorite[key] || favorite[key] === state[key])
}

// Namensvorschlag aus der Auswahl, z. B. „Riff + Nano · KH, Calcium, Magnesium“.
export function suggestFavoriteName(state, { tanks = [], labels = {}, includeTanks = true, includeKeys = true } = {}) {
  const LIMIT = 40
  const names = state.tankIds.map((id) => tanks.find((tank) => tank.id === id)?.name).filter(Boolean)
  const keyLabels = state.keys.map((key) => labels[key] || key)
  const keyPart = keyLabels.length > 3 ? `${keyLabels.slice(0, 2).join(', ')} +${keyLabels.length - 2}` : keyLabels.join(', ')
  const join = (tankPart) => [includeTanks && tankPart, includeKeys && keyPart].filter(Boolean).join(' · ')
  // Zu lang: erst die Aquarien zählen statt nennen, dann am Wortende kürzen.
  let name = join(names.length > 2 ? `${names.length} Aquarien` : names.join(' + '))
  if (name.length > LIMIT && names.length > 1) name = join(`${names.length} Aquarien`)
  if (name.length <= LIMIT) return name
  const cut = name.slice(0, LIMIT - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s·,+]+$/, '')}…`
}

// Was die Chronik beim Öffnen zeigt: ein geteilter Link gewinnt, dann die gespeicherte
// Startansicht, sonst die schlanke Voreinstellung. Gelöschte Aquarien fallen heraus.
export function resolveStart({ query = {}, tanks = [], saved = null, knownKeys = [] }) {
  const fromLink = ['tanks', 'params', 'view', 'layout', 'range'].some((key) => query[key])
  const known = new Set(tanks.map((tank) => tank.id))
  const allowedKeys = new Set(knownKeys)
  const defaults = { tankIds: tanks.slice(0, DEFAULT_TANK_COUNT).map((tank) => tank.id), keys: [...DEFAULT_PARAMETERS], view: 'trend', layout: 'combined', range: 'all' }
  if (fromLink) {
    const state = readQuery(query, tanks)
    return {
      source: 'link',
      tankIds: state.tankIds,
      keys: state.keys.length ? state.keys : defaults.keys,
      view: query.view === 'compare' || query.view === 'matrix' ? 'compare' : 'trend',
      layout: query.layout === 'separate' ? 'separate' : 'combined',
      range: state.range,
    }
  }
  if (saved) {
    const tankIds = (saved.tankIds || []).filter((id) => known.has(id))
    const keys = (saved.keys || []).filter((key) => allowedKeys.has(key))
    return {
      source: 'saved',
      tankIds: tankIds.length ? tankIds : defaults.tankIds,
      keys: keys.length ? keys : defaults.keys,
      view: VIEW_KEYS.includes(saved.view) ? saved.view : defaults.view,
      layout: LAYOUT_KEYS.includes(saved.layout) ? saved.layout : defaults.layout,
      range: RANGES.some((item) => item.key === saved.range) ? saved.range : defaults.range,
    }
  }
  return { source: 'default', ...defaults }
}
