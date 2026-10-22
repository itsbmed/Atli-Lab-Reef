import test from 'node:test'
import assert from 'node:assert/strict'
import { compositionRows, growthRows, ratioRows, scaleForIdeal } from './waterBalance.js'
import { createReport392933, createReport394770 } from './atiLabReports.js'

const row = (key, value, ideal, unit = 'mg/l', extra = {}) => ({
  key, value, sourceIdealValue: ideal, unit, tone: 'good', resultStatus: 'valid', ...extra,
})

test('each order of magnitude keeps its own axis, as the printed report does', () => {
  assert.deepEqual(
    [16173, 8985, 1074, 743, 344, 333, 54.7, 6.62, 3.68, 1.06].map(scaleForIdeal),
    [1000, 1000, 300, 300, 300, 300, 30, 10, 10, 3],
  )
})

test('composition measures the distance to the laboratory target, not to a fixed value', () => {
  const rows = compositionRows(createReport392933().parameters)
  const byKey = Object.fromEntries(rows.map((item) => [item.key, item]))

  assert.deepEqual(rows.map((item) => item.symbol),
    ['Cl', 'Na', 'Mg', 'S', 'Ca', 'K', 'Br', 'Sr', 'B', 'F'])

  // 17025,90 gemessen gegen 16173,50 Soll.
  assert.equal(Math.round(byKey.chloride.delta * 100) / 100, 852.4)
  assert.equal(byKey.chloride.direction, 'high')
  assert.equal(byKey.sodium.direction, 'low')
  assert.equal(byKey.magnesium.tone, 'critical', 'the tone follows the laboratory verdict')
  assert.equal(byKey.sulfur.tone, 'good')

  // Magnesium liegt 487 mg/l über Soll und sprengt damit die ±300er-Achse.
  assert.equal(byKey.magnesium.extent, 1)
  assert.equal(byKey.magnesium.clamped, true)
  assert.equal(byKey.sulfur.clamped, false)

  const bandEnds = rows.filter((item) => item.endsBand).map((item) => item.symbol)
  assert.deepEqual(bandEnds, ['Na', 'K', 'Br', 'B', 'F'], 'one scale footer per magnitude group')
})

test('undetectable elements are skipped instead of plotted as zero', () => {
  const rows = compositionRows([
    row('calcium', 420, 400),
    row('fluoride', 0, 1.06, 'mg/l', { resultStatus: 'below_detection', value: 0 }),
    row('boron', 4, 0),
  ])
  assert.deepEqual(rows.map((item) => item.key), ['calcium'])
})

test('a ratio arrow points at the side that is relatively richer', () => {
  // Natrium exakt auf Soll, Chlorid 20 % darüber: das Verhältnis kippt zu Chlorid.
  const { rows, scale } = ratioRows([row('sodium', 1000, 1000), row('chloride', 1200, 1000)])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].direction, 'right')
  assert.equal(Math.round(rows[0].percent * 10) / 10, -16.7)
  assert.equal(rows[0].tone, 'watch')
  assert.equal(scale, 25, 'the axis starts at 25 % and grows in steps')
})

test('an even imbalance reads as balanced and the axis grows with the largest arrow', () => {
  const even = ratioRows([row('sodium', 1020, 1000), row('chloride', 1000, 1000)])
  assert.equal(even.rows[0].tone, 'good')
  assert.equal(even.rows[0].direction, 'left')

  const wide = ratioRows([row('magnesium', 1800, 1000), row('sulfur', 1000, 1000)])
  assert.equal(Math.round(wide.rows[0].percent), 80)
  assert.equal(wide.scale, 100, '80 % imbalance lifts the axis to the next 25er step')
  assert.equal(wide.rows[0].tone, 'critical')
})

test('the salinity pair compares table salt against every other major element', () => {
  const rows = ratioRows([
    row('sodium', 1000, 1000), row('chloride', 1000, 1000),
    row('magnesium', 1500, 1000), row('sulfur', 1500, 1000),
  ]).rows
  const psu = rows.find((item) => item.key === 'psu')
  assert.equal(psu.leftLabel, 'PSU NaCl')
  assert.equal(psu.rightLabel, 'PSU übrige')
  // NaCl auf Soll, der Rest 50 % darüber -> Gleichgewicht liegt rechts.
  assert.equal(Math.round(psu.percent), -33)
  assert.equal(psu.direction, 'right')
})

test('pairs without both measurements are dropped rather than guessed', () => {
  assert.deepEqual(ratioRows([row('sodium', 1000, 1000)]).rows.map((item) => item.key), [])
  assert.deepEqual(growthRows([]).rows, [])

  const growth = growthRows(createReport394770().parameters).rows
  assert.deepEqual(growth.map((item) => item.key), ['kh-p', 'kh-ca'])
  assert.deepEqual(growth.map((item) => item.leftLabel), ['KH', 'KH'])
  assert.deepEqual(growth.map((item) => item.rightLabel), ['P', 'Ca'])
})

test('composition in percent puts every element on one comparable axis', async () => {
  const { compositionPercent, compositionSummary } = await import('./waterBalance.js')
  const rows = [
    { key: 'chloride', label: 'Chlorid', measured: 20457.8, ideal: 20882.3, delta: -424.5, tone: 'good' },
    { key: 'fluoride', label: 'Fluorid', measured: 1.01, ideal: 1.37, delta: -0.36, tone: 'watch' },
    { key: 'boron', label: 'Bor', measured: 3.67, ideal: 4.75, delta: -1.08, tone: 'watch' },
  ]
  const view = compositionPercent(rows)
  assert.equal(view.scale, 30, 'the smallest scale that holds −26 %')
  assert.deepEqual(view.ticks, [-30, -15, 0, 15, 30])
  const [cl, f] = view.rows
  assert.ok(Math.abs(cl.percent + 2.03) < 0.01)
  assert.ok(f.extent > cl.extent * 10, 'fluoride at −26 % is drawn far longer than chloride at −2 %')
  assert.deepEqual(compositionPercent(rows, { sort: 'deviation' }).rows.map((row) => row.key), ['fluoride', 'boron', 'chloride'])

  const outlier = compositionPercent([{ key: 'fluoride', ideal: 1, delta: 3.76, tone: 'critical' }])
  assert.equal(outlier.scale, 50)
  assert.equal(outlier.rows[0].clamped, true)
  assert.equal(outlier.rows[0].extent, 1)

  const summary = compositionSummary(rows)
  assert.deepEqual([summary.total, summary.fitting], [3, 1])
  assert.deepEqual(summary.flagged.map((item) => item.label), ['Fluorid', 'Bor'])
})

test('the colour follows the green band, so a dot never contradicts its position', async () => {
  const { compositionTone, compositionSummary } = await import('./waterBalance.js')
  assert.equal(compositionTone(100), 'good')
  assert.equal(compositionTone(115), 'good')
  assert.equal(compositionTone(84.9), 'watch')
  assert.equal(compositionTone(130), 'watch')
  assert.equal(compositionTone(69), 'critical')
  // Das Labor nennt Strontium „im Soll“, es liegt aber bei −18 % außerhalb des Bands: es zählt als auffällig.
  const rows = [
    { key: 'strontium', label: 'Strontium', measured: 82.4, ideal: 100, delta: -17.6, tone: 'good' },
    { key: 'calcium', label: 'Calcium', measured: 97, ideal: 100, delta: -3, tone: 'watch' },
  ]
  const summary = compositionSummary(rows)
  assert.deepEqual([summary.fitting, summary.flagged[0].label, summary.flagged[0].tone], [1, 'Strontium', 'watch'])
})

test('the index axis zooms to the smallest window that holds every value', async () => {
  const { indexScale } = await import('./waterBalance.js')
  assert.deepEqual(indexScale([97, 103, 110]), { lo: 80, hi: 120, ticks: [80, 90, 100, 110, 120] })
  assert.deepEqual(indexScale([73.7, 102]), { lo: 70, hi: 130, ticks: [70, 80, 90, 100, 110, 120, 130] })
  assert.deepEqual(indexScale([60, 140]), { lo: 50, hi: 150, ticks: [50, 75, 100, 125, 150] })
  assert.deepEqual(indexScale([20, 450]).ticks, [0, 50, 100, 150, 200], 'outliers fall back to the full axis')
})

test('the client view: index 100 per element, sulfate from sulfur, average min and max', async () => {
  const { compositionIndex, withSulfate, BALANCE_BAND } = await import('./waterBalance.js')
  const rows = withSulfate([
    { key: 'chloride', label: 'Chlorid', symbol: 'Cl', measured: 100, ideal: 100, delta: 0 },
    { key: 'sulfur', label: 'Schwefel', symbol: 'S', measured: 120, ideal: 100, delta: 20 },
    { key: 'potassium', label: 'Kalium', symbol: 'K', measured: 80, ideal: 100, delta: -20 },
    { key: 'boron', label: 'Bor', symbol: 'B', measured: 450, ideal: 100, delta: 350 },
  ])
  assert.deepEqual(rows.map((row) => row.symbol), ['Cl', 'S', 'SO₄', 'K', 'B'])
  assert.ok(Math.abs(rows[2].measured / rows[2].ideal - 1.2) < 1e-9, 'sulfate keeps the ratio of sulfur')
  const view = compositionIndex(rows)
  assert.deepEqual(view.band, [100 - BALANCE_BAND, 100 + BALANCE_BAND])
  assert.deepEqual(view.items.map((item) => Math.round(item.index)), [100, 120, 120, 80, 450])
  assert.deepEqual(view.items.map((item) => item.inBand), [true, false, false, false, false])
  assert.equal(view.items[4].y, 200)
  assert.equal(view.items[4].clamped, true)
  assert.deepEqual([Math.round(view.stats.avg), Math.round(view.stats.min), Math.round(view.stats.max)], [174, 80, 450])
})
