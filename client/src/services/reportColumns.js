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
