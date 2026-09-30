// Kleine Datumshilfe für Demo- und Beispieldaten.
// Die erfundenen Dashboard-Kennzahlen sind entfallen; das Dashboard rechnet
// ausschließlich mit den importierten ATI-Laborberichten.

export function daysAgoDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
