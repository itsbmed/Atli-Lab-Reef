import test from 'node:test'
import assert from 'node:assert/strict'
import { LINE_STYLES, TARGET_CLIP, availableModes, buildSeries, changePercent, chartParameters, defaultMode, describeOffset, formatChange, seriesStats, sharedUnit, targetPercent } from './chronikChart.js'

const calcium = { key: 'calcium', label: 'Calcium', unit: 'mg/l', min: 410, max: 440 }
const magnesium = { key: 'magnesium', label: 'Magnesium', unit: 'mg/l', min: 1280, max: 1350 }
const nitrate = { key: 'nitrate', label: 'Nitrat', unit: 'mg/l', min: 2, max: 10 }
const kh = { key: 'kh', label: 'Karbonathärte', unit: 'dKH', min: 7.5, max: 8.5 }

const report = (id, date, values) => ({ id, date, time: new Date(date).getTime(), values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, undetectable: value === null, tone: 'good' }])) })
const reef = { id: 'reef', name: 'Riff', color: '#2a78d6', reports: [report('r1', '2026-03-01', { calcium: 400, kh: 7, nitrate: 70 }), report('r2', '2026-06-01', { calcium: 440, kh: 8, nitrate: 4 })] }
const nano = { id: 'nano', name: 'Nano', color: '#eb6834', reports: [report('n1', '2026-05-01', { calcium: 380, kh: 9, nitrate: 0 })] }

test('real values only share an axis when the unit is shared', () => {
  assert.equal(sharedUnit([calcium, magnesium]), 'mg/l')
  assert.equal(sharedUnit([calcium, kh]), null)
  assert.deepEqual(availableModes([calcium, kh]), ['target', 'change'])
  assert.deepEqual(availableModes([calcium, magnesium]), ['value', 'target', 'change'])
})

test('the starting scale follows what is selected', () => {
  assert.equal(defaultMode([kh]), 'value')
  assert.equal(defaultMode([calcium, magnesium]), 'value')
  assert.equal(defaultMode([calcium, nitrate]), 'target') // gleiche Einheit, aber 50-fach verschieden
  assert.equal(defaultMode([calcium, kh]), 'target')
})

test('target percent puts the lower limit at 0 and the upper at 100', () => {
  assert.equal(targetPercent(410, 410, 440), 0)
  assert.equal(targetPercent(440, 410, 440), 100)
  assert.equal(targetPercent(395, 410, 440), -50)
  assert.equal(targetPercent(null, 410, 440), null)
  assert.equal(describeOffset(14.7, kh), '6,2 dKH über Ziel')
  assert.equal(describeOffset(395, calcium), '15 mg/l unter Ziel')
  assert.equal(describeOffset(420, calcium), 'im Ziel')
})

test('change is relative to the first value and refuses a zero base', () => {
  assert.equal(changePercent(440, 400), 10)
  assert.equal(changePercent(5, 0), null)
  assert.equal(formatChange(10), '+10 %')
  assert.equal(formatChange(-2.345), '−2,3 %')
  assert.equal(formatChange(0), '±0 %')
})

test('several tanks: colour per tank, line style per parameter', () => {
  const series = buildSeries({ tanks: [reef, nano], metas: [calcium, kh], mode: 'target' })
  assert.deepEqual(series.map((item) => item.id), ['reef:calcium', 'reef:kh', 'nano:calcium', 'nano:kh'])
  assert.equal(series[1].color, '#2a78d6')
  assert.deepEqual(series[1].style, LINE_STYLES[1])
  assert.equal(series[0].label, 'Calcium · Riff')
})

test('one tank: colour per parameter, solid lines', () => {
  const series = buildSeries({ tanks: [reef], metas: [calcium, kh], mode: 'target' })
  assert.notEqual(series[0].color, series[1].color)
  assert.deepEqual(series[1].style, LINE_STYLES[0])
  assert.equal(series[0].label, 'Calcium')
})

test('outliers on the target scale are clipped and flagged, the real value kept', () => {
  const [nitrateLine] = buildSeries({ tanks: [reef], metas: [nitrate], mode: 'target' })
  assert.equal(nitrateLine.points[0].scaled, 850)
  assert.equal(nitrateLine.points[0].y, TARGET_CLIP.high)
  assert.equal(nitrateLine.points[0].clipped, 'high')
  assert.equal(nitrateLine.points[0].value, 70)
  assert.equal(nitrateLine.points[1].clipped, '')
})

test('a line that starts at zero cannot be shown as change', () => {
  const [line] = buildSeries({ tanks: [nano], metas: [nitrate], mode: 'change' })
  assert.equal(line.indexable, false)
  const [calciumLine] = buildSeries({ tanks: [reef], metas: [calcium], mode: 'change' })
  assert.deepEqual(calciumLine.points.map((point) => point.y), [0, 10])
})

test('the diagram holds four parameters for several tanks, six for one', () => {
  const metas = [calcium, magnesium, nitrate, kh, calcium, magnesium, nitrate]
  assert.equal(chartParameters(metas, 2).shown.length, 4)
  assert.equal(chartParameters(metas, 2).hidden.length, 3)
  assert.equal(chartParameters(metas, 1).shown.length, 6)
})

test('stats are in real values', () => {
  const [line] = buildSeries({ tanks: [reef], metas: [calcium], mode: 'target' })
  assert.deepEqual(seriesStats(line.points), { count: 2, last: 440, min: 400, max: 440, avg: 420, change: 10 })
})
