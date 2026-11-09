// Tabellenansicht des Berichts: Gruppen auf Spalten verteilen – am Bildschirm und im PDF gleich.
// Mit `leftKeys` stehen diese Gruppen fest links, der Rest rechts (zwei Spalten); sonst kommt jede in die
// kürzeste von `count` Spalten, so enden alle etwa gleich. Die ursprüngliche Reihenfolge bleibt als `order` erhalten, für die einspaltige
// Ansicht am Telefon.
export const VALUES_LEFT_GROUPS = ['basis', 'quantity', 'nutrients']
export const OSMOSIS_LEFT_GROUPS = ['trace']

export function balanceColumns(sections, leftKeys = null, count = 2) {
  const columns = Array.from({ length: leftKeys ? 2 : count }, () => [])
  const heights = columns.map(() => 0)
  sections.forEach((group, order) => {
    const target = leftKeys ? (leftKeys.includes(group.key) ? 0 : 1) : heights.indexOf(Math.min(...heights))
    columns[target].push({ ...group, order })
    heights[target] += group.items.length + 2 // Kopf und Spaltenzeile zählen mit
  })
  return columns.filter((column) => column.length)
}

// Die Anordnung aus „Alle Werte“ und „Osmose“ (Spalten von Gruppenschlüsseln) auf die Gruppen
// anwenden, damit der Druck die Tabellen genauso zeigt. Was dort nicht steht, kommt in die letzte Spalte.
export function layoutColumns(sections, layout = []) {
  const byKey = new Map(sections.map((group, order) => [group.key, { ...group, order }]))
  const columns = layout.map((keys) => keys.filter((key) => byKey.has(key)).map((key) => byKey.get(key)))
  if (!columns.length) columns.push([])
  const placed = new Set(layout.flat())
  byKey.forEach((group, key) => { if (!placed.has(key)) columns[columns.length - 1].push(group) })
  return columns.filter((column) => column.length)
}
