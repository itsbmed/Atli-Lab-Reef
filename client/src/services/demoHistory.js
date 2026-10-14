// Beispielverlauf für die Demo-Aquarien.
// Jedes Demo-Aquarium hat genau einen echten ATI-Bericht – ohne zweiten Bericht gibt es
// keinen Verlauf. Hier entstehen je Aquarium zwei frühere Beispielberichte, abgeleitet
// vom echten: gleiche Elemente, gleiche Nachkommastellen, plausible Schwankung je
// Elementgruppe. Sie sind als `demo` markiert und tragen „Beispiel“ im Namen, damit sie
// nie mit Laborergebnissen verwechselt werden; entfernt werden sie an genau einer Stelle
// (analysisStore → DEMO_ANALYSES).

import { ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'
import { labParameter } from './atiLabReports.js'

const DAY = 24 * 60 * 60 * 1000

// Relative Schwankung je Bericht (eine Standardabweichung). Salz und KH sind träge,
// Spurenelemente und Nährstoffe springen – so wie es Riffaquarianer kennen.
const SPREAD = Object.freeze({
  salinity: 0.009,
  kh: 0.07,
  calcium: 0.035,
  magnesium: 0.03,
  potassium: 0.035,
  strontium: 0.06,
  boron: 0.06,
  fluoride: 0.08,
  basis: 0.03,
  quantity: 0.025,
  nutrients: 0.35,
  trace: 0.18,
  pollutants: 0.3,
})

// Wie weit vor dem echten Bericht die Beispiele liegen (Tage), mit etwas Streuung.
const STEPS = Object.freeze([{ days: 70, jitter: 6 }, { days: 35, jitter: 5 }])

// Kleiner, reproduzierbarer Zufall: dieselbe Eingabe ergibt immer dieselben Werte.
function seeded(text) {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  let state = hash >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

// Normalverteilt um 0 (Box-Muller), auf ±2,5 begrenzt – keine absurden Ausreißer.
function gaussian(random) {
  const value = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
  return Math.max(-2.5, Math.min(2.5, value))
}

function decimals(value) {
  return (String(value).split('.')[1] || '').length
}

function round(value, places) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

// Lage zum Referenzbereich – Beispielberichte haben kein Laborurteil, also zählt die Zahl.
function judge(value, range) {
  if (value === null) return ['good', 'in_range']
  const span = range.max - range.min || Math.abs(range.max) || 1
  if (value < range.min) return [range.min - value > span ? 'critical' : 'watch', 'low']
  if (value > range.max) return [value - range.max > span ? 'critical' : 'watch', 'high']
  return ['good', 'in_range']
}

// Rückwärts vom echten Wert: jeder frühere Bericht weicht etwas vom nächsten ab, und die
// Abweichungen hängen zusammen, damit die Linie wie ein Verlauf aussieht und nicht wie Rauschen.
function earlierValues(real, key, groupKey, random) {
  const spread = SPREAD[key] ?? SPREAD[groupKey] ?? 0.05
  const recent = gaussian(random) * spread
  const older = recent * 0.55 + gaussian(random) * spread * 0.85
  const places = decimals(real)
  const at = (offset) => Math.max(0, round(real * (1 + offset), places))
  return [at(older + recent), at(recent)]
}

// Dieselben Worte wie im ATI-Bericht: „unter Soll“, „kritisch hoch“.
function verdict(tone, direction) {
  if (tone === 'critical') return direction === 'low' ? 'Kritisch niedrig' : 'Kritisch hoch'
  return direction === 'low' ? 'Unter Soll' : 'Über Soll'
}

function isoAt(time, hour) {
  const date = new Date(time)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

// Zwei Beispielberichte zu einem echten Bericht, ältester zuerst.
export function demoHistoryFor(report) {
  const random = seeded(report.id)
  const rows = report.parameters.map((parameter) => {
    const definition = ELEMENT_DEFINITION_MAP[parameter.key]
    const undetectable = parameter.resultStatus === 'below_detection'
    const values = undetectable ? [null, null] : earlierValues(Number(parameter.value), parameter.key, definition.groupKey, seeded(`${report.id}:${parameter.key}`))
    return { parameter, definition, values }
  })
  const realIssues = report.parameters.filter((parameter) => parameter.tone !== 'good').length
  const created = new Date(report.createdAt).getTime()

  return STEPS.map((step, index) => {
    const time = created - (step.days + Math.round((random() - 0.5) * 2 * step.jitter)) * DAY
    const parameters = rows.map(({ parameter, definition, values }) => {
      const measured = values[index]
      const [tone, direction] = judge(measured, definition.referenceRanges.Meerwasser)
      const row = labParameter({ key: parameter.key, measured, ideal: parameter.sourceIdealValue, tone, direction })
      const status = tone === 'good' ? (measured === null ? 'Nicht nachweisbar · Normal' : 'Normal') : verdict(tone, direction)
      return { ...row, sourceStatusLabel: `${status} (Beispiel)` }
    })
    const flagged = parameters.filter((parameter) => parameter.tone !== 'good')
    const issues = flagged.map((parameter) => `${parameter.label} ${verdict(parameter.tone, parameter.sourceDirection).toLowerCase()}`)
    // Bewertung: die des echten Berichts, verschoben um die Zahl der auffälligen Werte.
    const score = Math.max(20, Math.min(97, (report.score ?? 75) + (realIssues - flagged.length) * 3))
    const groupScores = Object.fromEntries(Object.entries(report.groupScores || {}).map(([group, value]) => {
      const real = report.parameters.filter((parameter) => parameter.groupKey === group && parameter.tone !== 'good').length
      const now = parameters.filter((parameter) => parameter.groupKey === group && parameter.tone !== 'good').length
      return [group, Math.max(15, Math.min(100, value + (real - now) * 5))]
    }))
    const number = `B-${report.reportNumber}-${index + 1}`
    const createdAt = isoAt(time, 12)
    const receivedAt = isoAt(time + 3 * DAY, 11)
    return {
      id: `${report.id}-beispiel-${index + 1}`,
      demo: true,
      scenario: 'demo-history',
      sourceType: 'demo-history',
      preserveSourceEvaluation: true,
      preserveSourceRecommendations: false,
      barcode: number,
      reportNumber: number,
      aquariumName: report.aquariumName,
      aquariumId: report.aquariumId,
      waterType: report.waterType,
      package: report.package,
      reason: 'routine',
      status: 'completed',
      score,
      resultLevel: score >= 85 ? 'good' : score >= 60 ? 'watch' : 'critical',
      issueCount: issues.length,
      issues,
      groupScores,
      createdAt,
      receivedAt,
      completedAt: isoAt(time + 5 * DAY, 9),
      osmoseAquariumId: '',
      sample: { voucherCode: number, type: report.sample?.type || 'Meerwasser', comment: `Beispielbericht · ${report.aquariumName}`, receivedAt },
      lab: { provider: 'ATI Aquaristik', method: `Beispielbericht – abgeleitet aus dem ATI-Bericht ${report.reportNumber}`, processed: true },
      parameters,
      osmosisParameters: [],
    }
  })
}

export function createDemoHistory(reports) {
  return reports.filter((report) => report.status === 'completed' && report.parameters?.length).flatMap(demoHistoryFor)
}

// Echte Berichte plus Beispiele, und jeder Parameter kennt seinen Verlauf bis zu diesem
// Bericht – damit zeigt auch der Reiter „Messverlauf“ im Bericht eine Linie.
export function withDemoHistory(reports) {
  const all = [...reports, ...createDemoHistory(reports)]
  const byTank = new Map()
  for (const report of all) {
    if (report.status !== 'completed' || !report.aquariumId) continue
    byTank.set(report.aquariumId, [...(byTank.get(report.aquariumId) || []), report])
  }
  for (const list of byTank.values()) list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  return all.map((report) => {
    const list = byTank.get(report.aquariumId)
    if (!list || report.status !== 'completed') return report
    const upTo = list.slice(0, list.indexOf(report) + 1)
    return {
      ...report,
      parameters: report.parameters.map((parameter) => ({
        ...parameter,
        history: upTo.map((item) => {
          const row = item.parameters.find((candidate) => candidate.key === parameter.key)
          return { date: item.createdAt, value: row && row.resultStatus !== 'below_detection' ? Number(row.value) : null }
        }),
      })),
    }
  })
}
