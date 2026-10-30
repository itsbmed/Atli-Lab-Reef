// Tabellenansicht des Berichts: Gruppen auf zwei Spalten verteilen – am Bildschirm und im PDF gleich.
// Mit `leftKeys` stehen diese Gruppen fest links, der Rest rechts; sonst kommt jede in die kürzere Spalte,
// so enden beide etwa gleich. Die ursprüngliche Reihenfolge bleibt als `order` erhalten, für die einspaltige
// Ansicht am Telefon.
export const VALUES_LEFT_GROUPS = ['basis', 'quantity', 'nutrients']
export const OSMOSIS_LEFT_GROUPS = ['trace']

export function balanceColumns(sections, leftKeys = null) {
  const columns = [[], []]
  const heights = [0, 0]
  sections.forEach((group, order) => {
    const target = leftKeys ? (leftKeys.includes(group.key) ? 0 : 1) : heights[0] <= heights[1] ? 0 : 1
    columns[target].push({ ...group, order })
    heights[target] += group.items.length + 2 // Kopf und Spaltenzeile zählen mit
  })
  return columns.filter((column) => column.length)
}
