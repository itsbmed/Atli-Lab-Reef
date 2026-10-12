import test from 'node:test'
import assert from 'node:assert/strict'
import { formatReading, gaugePercent, gaugeScale, layoutLabels, overflow, tickFormatter } from './targetGauge.js'

test('the scale leaves one target width either side and stops at zero', () => {
  assert.deepEqual(gaugeScale(400, 450, 420), { start: 350, end: 500 })
  const cobalt = gaugeScale(0.1, 0.25, 0.18)
  assert.equal(cobalt.start, 0)
  assert.ok(Math.abs(cobalt.end - 0.4) < 1e-9)
})

test('an outlier stretches the scale, but not without limit', () => {
  assert.equal(gaugeScale(0.1, 0.25, 0.42).end, 0.5)
  assert.equal(gaugeScale(400, 450, 5000).end, 650)
})

test('positions are clamped to the track', () => {
  const scale = { start: 0, end: 0.4 }
  assert.equal(gaugePercent(0.1, scale), 25)
  assert.equal(gaugePercent(9, scale), 100)
  assert.equal(gaugePercent(null, scale), 0)
})

test('every tick uses the decimals the target bounds need', () => {
  const format = tickFormatter(0.1, 0.25)
  assert.equal(format(0), '0,00')
  assert.equal(format(0.4), '0,40')
  assert.equal(tickFormatter(400, 450)(500), '500')
})

test('readings are written the German way with the lab precision', () => {
  assert.equal(formatReading(20457.8), '20.457,8')
  assert.equal(formatReading('0.040'), '0,040')
  assert.equal(formatReading(25), '25')
  assert.equal(formatReading('Nicht nachweisbar'), 'Nicht nachweisbar')
})

test('values beyond the stretched scale are reported as overflow', () => {
  assert.equal(overflow(14.69, gaugeScale(7.5, 8.5, 14.69)), 'over')
  assert.equal(overflow(29.91, gaugeScale(34.8, 35.2, 29.91)), 'under')
  assert.equal(overflow(8, gaugeScale(7.5, 8.5, 8)), '')
})

test('scale labels never overlap; lower priority ones give way', () => {
  const labels = [
    { key: 'min', at: 33.3, width: 30, priority: 0 },
    { key: 'max', at: 66.7, width: 30, priority: 1 },
    { key: 'start', at: 0, align: 'start', width: 30, priority: 2 },
    { key: 'end', at: 100, align: 'end', width: 30, priority: 3 },
    { key: 'zone', at: 50, width: 56, priority: 4 },
  ]
  assert.deepEqual(layoutLabels(labels, 400).map((l) => l.key), ['start', 'min', 'zone', 'max', 'end'])
  assert.deepEqual(layoutLabels(labels, 200).map((l) => l.key), ['start', 'min', 'max', 'end'])
  const edge = layoutLabels([{ key: 'max', at: 99, width: 30, priority: 0 }], 200)[0]
  assert.equal(edge.right, 200)
})

test('a stretched scale ends on a tidy number', () => {
  assert.equal(gaugeScale(10500, 11500, 8511.68).start, 8000)
  assert.equal(gaugeScale(1280, 1350, 1561.68).end, 1630)
  assert.equal(gaugeScale(0.1, 0.25, 0.42).end, 0.5)
})

test('target bounds that would collide move outward instead of vanishing', () => {
  const placed = layoutLabels([
    { key: 'min', at: 40, width: 30, priority: 0, fallback: 'before' },
    { key: 'max', at: 50, width: 30, priority: 1, fallback: 'after' },
  ], 300)
  assert.deepEqual(placed.map((l) => [l.key, l.left, l.right]), [['min', 105, 135], ['max', 150, 180]])
})
