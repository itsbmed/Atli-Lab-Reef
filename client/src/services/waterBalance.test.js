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
