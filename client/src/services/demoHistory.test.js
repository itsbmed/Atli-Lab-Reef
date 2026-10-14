import test from 'node:test'
import assert from 'node:assert/strict'
import { createAtiLabReports } from './atiLabReports.js'
import { createDemoHistory, demoHistoryFor, withDemoHistory } from './demoHistory.js'

const reports = createAtiLabReports()
const nano = reports.find((report) => report.id === 'ati-real-394949')

test('every real report gets two earlier example reports', () => {
  const examples = createDemoHistory(reports)
  assert.equal(examples.length, reports.length * 2)
  assert.equal(new Set(examples.map((item) => item.id)).size, examples.length)
  assert.ok(examples.every((item) => item.demo === true && item.status === 'completed'))
  assert.ok(examples.every((item) => item.reportNumber.startsWith('B-')))
})

test('examples are dated five and ten weeks before, oldest first', () => {
  const [older, newer] = demoHistoryFor(nano)
  const real = new Date(nano.createdAt).getTime()
  const days = (iso) => Math.round((real - new Date(iso).getTime()) / 86400000)
  assert.ok(days(older.createdAt) >= 64 && days(older.createdAt) <= 76, days(older.createdAt))
  assert.ok(days(newer.createdAt) >= 30 && days(newer.createdAt) <= 40, days(newer.createdAt))
  assert.ok(new Date(newer.completedAt) < new Date(nano.createdAt))
})

test('the same input always gives the same values', () => {
  assert.deepEqual(demoHistoryFor(nano), demoHistoryFor(nano))
})

test('values stay plausible: salinity barely moves, nutrients may', () => {
  for (const report of reports) {
    for (const example of demoHistoryFor(report)) {
      const salinity = example.parameters.find((item) => item.key === 'salinity').value
      const real = report.parameters.find((item) => item.key === 'salinity').value
      assert.ok(Math.abs(salinity / real - 1) < 0.05, `${report.id} salinity ${salinity} vs ${real}`)
      assert.ok(example.parameters.every((item) => item.value >= 0))
    }
  }
})

test('values keep the decimals of the lab report and n. n. stays n. n.', () => {
  const [older] = demoHistoryFor(nano)
  const decimals = (value) => (String(value).split('.')[1] || '').length
  for (const parameter of nano.parameters) {
    const example = older.parameters.find((item) => item.key === parameter.key)
    if (parameter.resultStatus === 'below_detection') assert.equal(example.resultStatus, 'below_detection')
    else assert.ok(decimals(example.value) <= decimals(parameter.value), `${parameter.key}: ${example.value} vs ${parameter.value}`)
  }
})

test('examples never claim an ATI verdict', () => {
  const [older] = demoHistoryFor(nano)
  assert.ok(older.parameters.every((item) => item.sourceStatusLabel.endsWith('(Beispiel)')))
  assert.match(older.lab.method, /Beispielbericht/)
})

test('each report carries its tank history up to itself', () => {
  const all = withDemoHistory(reports)
  const real = all.find((report) => report.id === 'ati-real-394949')
  const calcium = real.parameters.find((item) => item.key === 'calcium')
  assert.equal(calcium.history.length, 3)
  assert.equal(calcium.history.at(-1).value, 429.73)
  assert.ok(new Date(calcium.history[0].date) < new Date(calcium.history[1].date))
  const firstExample = all.find((report) => report.id === 'ati-real-394949-beispiel-1')
  assert.equal(firstExample.parameters[0].history.length, 1)
})
