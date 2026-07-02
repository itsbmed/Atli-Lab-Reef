// ── Dummy-Daten für das Bestandskunden-Dashboard ──────────────────────
// Nur für das Demo/Vollkonto. Ersetzt später echte Analyse-Daten aus dem
// Backend. Scores, Hinweise und Berichte sind erfundene Beispielwerte.

export function daysAgoDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// Pseudo-Gesundheitswerte je Aquarium (stabil nach Reihenfolge).
const TANK_STATS = [
  { score: 88, issueCount: 2, tone: 'good', daysAgo: 4 },
  { score: 71, issueCount: 5, tone: 'warn', daysAgo: 11 },
  { score: 94, issueCount: 0, tone: 'good', daysAgo: 2 },
]

export function tankStat(index) {
  const s = TANK_STATS[index % TANK_STATS.length]
  return { ...s, lastDate: daysAgoDate(s.daysAgo) }
}

// Beispiel-Analyseberichte (neueste zuerst).
export const demoAnalyses = [
  { id: 'an-1', profile_name: 'Nano SPS Cube', barcode: 'ATI-2402-7781', package: 'ICP Pro', score: 71, issue_count: 5, tone: 'warn', created_at: daysAgoDate(4) },
  { id: 'an-2', profile_name: 'Wohnzimmer Reef', barcode: 'ATI-2402-6650', package: 'ICP Basis', score: 88, issue_count: 2, tone: 'good', created_at: daysAgoDate(11) },
  { id: 'an-3', profile_name: 'Wohnzimmer Reef', barcode: 'ATI-2401-5521', package: 'ICP Basis', score: 82, issue_count: 3, tone: 'good', created_at: daysAgoDate(25) },
  { id: 'an-4', profile_name: 'Nano SPS Cube', barcode: 'ATI-2401-4410', package: 'ICP Pro', score: 64, issue_count: 7, tone: 'crit', created_at: daysAgoDate(33) },
]
