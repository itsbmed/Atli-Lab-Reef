// Eigene Anordnung von Kästen (Dashboard, Tabellen unter „Alle Werte“ und „Osmose“):
// Spalten von Schlüsseln, dazu ausgeblendete Schlüssel. Gespeichert je Konto und Bereich
// im Browser; fehlt etwas oder kommt etwas Neues dazu, gilt dafür die Grundordnung.
const STORAGE_KEY = 'reef-pilot:arrangement:v1'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function recordKey(ownerId, area) {
  return `${ownerId || 'guest'}:${area}`
}

export function loadArrangement(ownerId, area) {
  const stored = readAll()[recordKey(ownerId, area)]
  return stored && Array.isArray(stored.columns) ? stored : null
}

export function saveArrangement(ownerId, area, arrangement) {
  const stored = readAll()
  if (arrangement) stored[recordKey(ownerId, area)] = { columns: arrangement.columns, hidden: arrangement.hidden || [] }
  else delete stored[recordKey(ownerId, area)]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Ohne Speicher gilt die Anordnung nur bis zum Neuladen.
  }
}

// Die gespeicherte Anordnung auf die vorhandenen Schlüssel anwenden. Unbekanntes fällt
// weg, Neues kommt ans Ende der Spalte, in der es in der Grundordnung steht.
export function arrangeColumns(keys, saved, defaults) {
  const present = new Set(keys)
  const count = defaults.length
  const columns = Array.from({ length: count }, (_, index) => (saved?.columns?.[index] || []).filter((key) => present.has(key)))
  const hidden = (saved?.hidden || []).filter((key) => present.has(key))
  const placed = new Set([...columns.flat(), ...hidden])
  keys.forEach((key) => {
    if (placed.has(key)) return
    const home = defaults.findIndex((column) => column.includes(key))
    columns[home === -1 ? count - 1 : home].push(key)
    placed.add(key)
  })
  return { columns, hidden }
}

// Schlüssel in eine Spalte verschieben, vor `before` oder ans Ende. Ausgeblendetes
// kommt so wieder zurück.
export function moveKey(arrangement, key, column, before = null) {
  const columns = arrangement.columns.map((keys) => keys.filter((item) => item !== key))
  const hidden = arrangement.hidden.filter((item) => item !== key)
  const target = columns[column]
  const index = before ? target.indexOf(before) : -1
  target.splice(index === -1 ? target.length : index, 0, key)
  return { columns, hidden }
}

export function hideKey(arrangement, key) {
  return {
    columns: arrangement.columns.map((keys) => keys.filter((item) => item !== key)),
    hidden: [...arrangement.hidden.filter((item) => item !== key), key],
  }
}
