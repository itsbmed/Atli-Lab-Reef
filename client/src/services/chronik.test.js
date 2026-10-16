import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PARAMETERS, clearStartView, loadStartView, resolveStart, sameView, saveStartView, assignColors, buildTanks, delta, flaggedParameters, niceTicks, position, rangeStart, readQuery, reportsInRange, series, sharedScale, toCsv, valueAt } from './chronik.js'

const parameter = (key, value, extra = {}) => ({ key, value, unit: 'mg/l', tone: 'good', resultStatus: 'valid', ...extra })
const analysis = (id, aquariumId, createdAt, parameters, extra = {}) => ({ id, aquariumId, createdAt, status: 'completed', parameters, ...extra })

const analyses = [
  analysis('a1', 'reef', '2026-03-01T12:00:00Z', [parameter('calcium', 400), parameter('nitrate', 0, { resultStatus: 'below_detection' })]),
  analysis('a2', 'reef', '2026-09-01T12:00:00Z', [parameter('calcium', 430, { tone: 'good' }), parameter('nitrate', 12, { tone: 'critical' })]),
  analysis('b1', 'nano', '2026-08-15T12:00:00Z', [parameter('calcium', 380, { tone: 'watch' })]),
  analysis('x1', 'nano', '2026-09-20T12:00:00Z', [], { status: 'in_analysis' }),
]
const aquariums = [{ id: 'reef', name: 'Riff 500', water_type: 'Meerwasser', net_volume: 500 }, { id: 'nano', name: 'Nano' }]

test('tanks collect only completed reports, oldest first, newest tank first', () => {
  const tanks = buildTanks(analyses, aquariums)
  assert.deepEqual(tanks.map((tank) => tank.id), ['reef', 'nano'])
  assert.deepEqual(tanks[0].reports.map((report) => report.id), ['a1', 'a2'])
  assert.equal(tanks[0].latest.id, 'a2')
  assert.equal(tanks[0].volume, 500)
  assert.equal(tanks[1].reports.length, 1)
})

test('undetectable values carry no number', () => {
  const [reef] = buildTanks(analyses, aquariums)
  assert.deepEqual([reef.reports[0].values.nitrate.value, reef.reports[0].values.nitrate.undetectable], [null, true])
})

test('the time range cuts reports for every view alike', () => {
  const [reef] = buildTanks(analyses, aquariums)
  const now = new Date('2026-10-13T12:00:00Z').getTime()
  assert.deepEqual(reportsInRange(reef, '3m', now).map((report) => report.id), ['a2'])
  assert.deepEqual(reportsInRange(reef, 'all', now).map((report) => report.id), ['a1', 'a2'])
  assert.equal(rangeStart('all'), -Infinity)
})

test('tank colours stick to the tank when others come and go', () => {
  const first = assignColors(['a', 'b', 'c'])
  assert.deepEqual(first, { a: 0, b: 1, c: 2 })
  const without = assignColors(['a', 'c'], first)
  assert.deepEqual(without, { a: 0, c: 2 })
  assert.deepEqual(assignColors(['a', 'c', 'd'], without), { a: 0, c: 2, d: 1 })
  const many = assignColors(['1', '2', '3', '4', '5', '6', '7'])
  assert.equal(many['7'], -1)
})

test('flagged parameters are the ones outside the target in the latest report', () => {
  const content = { calcium: { targetMin: 410, targetMax: 440 }, nitrate: { targetMin: 2, targetMax: 10 } }
  // Riff: Calcium 430 im Ziel, Nitrat 12 darüber; Nano: Calcium 380 darunter.
  assert.deepEqual(flaggedParameters(buildTanks(analyses, aquariums), content), ['calcium', 'nitrate'])
  assert.deepEqual(flaggedParameters(buildTanks(analyses, aquariums).slice(0, 1), content), ['nitrate'])
})

test('position describes where a number sits against the target', () => {
  assert.equal(position(420, 410, 440), 'in')
  assert.equal(position(400, 410, 440), 'near-low')
  assert.equal(position(500, 410, 440), 'far-high')
  assert.equal(position(null, 410, 440), 'none')
})

test('a shared scale holds the target and every value', () => {
  const scale = sharedScale(410, 440, [380, 470])
  assert.ok(scale.start <= 380 && scale.end >= 470)
  assert.deepEqual(sharedScale(410, 440, []), { start: 380, end: 470 })
})

test('delta compares the last two measured reports of one tank', () => {
  const [reef, nano] = buildTanks(analyses, aquariums)
  assert.equal(delta(reef.reports, 'calcium').change, 30)
  assert.equal(delta(reef.reports, 'calcium').days, 184)
  assert.equal(delta(reef.reports, 'nitrate'), null)
  assert.equal(delta(nano.reports, 'calcium'), null)
})

test('a tank’s value on a date is its last report up to then', () => {
  const [reef] = buildTanks(analyses, aquariums)
  const points = series(reef.reports, 'calcium')
  assert.equal(valueAt(points, new Date('2026-05-01').getTime()).value, 400)
  assert.equal(valueAt(points, new Date('2026-01-01').getTime()), null)
})

test('axis ticks land on round numbers', () => {
  assert.deepEqual(niceTicks(380, 470), [380, 400, 420, 440, 460])
  assert.deepEqual(niceTicks(0, 0.5), [0, 0.2, 0.4])
})

test('the CSV export is German: semicolons and decimal commas', () => {
  const tanks = buildTanks(analyses, aquariums)
  const csv = toCsv(tanks, ['calcium', 'nitrate'], { calcium: { targetMin: 410, targetMax: 440 } }).split('\n')
  assert.equal(csv[0], 'Parameter;Einheit;Ziel min;Ziel max;Riff 500 (01.09.26);Nano (15.08.26)')
  assert.equal(csv[1], 'Calcium;mg/l;410;440;430;380')
  assert.match(csv[2], /^Nitrat;mg\/l;2;10;12;$/)
})

test('the address bar restores a selection and ignores unknown entries', () => {
  const tanks = buildTanks(analyses, aquariums)
  assert.deepEqual(readQuery({ tanks: 'nano,ghost', params: 'calcium,unobtainium', view: 'trend', range: '6m' }, tanks), { tankIds: ['nano'], keys: ['calcium'], view: 'trend', range: '6m' })
  assert.deepEqual(readQuery({}, tanks), { tankIds: ['reef', 'nano'], keys: [], view: 'compare', range: 'all' })
})

const memoryStorage = () => {
  const data = new Map()
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) }
}
const threeTanks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
const known = ['kh', 'calcium', 'magnesium', 'nitrate', 'iodine']

test('without a link or saved view the Chronik starts lean: two tanks, three parameters', () => {
  const start = resolveStart({ tanks: threeTanks, knownKeys: known })
  assert.deepEqual(start, { source: 'default', tankIds: ['a', 'b'], keys: ['kh', 'calcium', 'magnesium'], view: 'trend', layout: 'combined', range: 'all' })
  assert.equal(DEFAULT_PARAMETERS.length, 3)
})

test('a saved start view is restored, without tanks or parameters that no longer exist', () => {
  const storage = memoryStorage()
  saveStartView(storage, 'u1', { tankIds: ['c', 'gone'], keys: ['iodine', 'unobtainium'], view: 'compare', layout: 'separate', range: '6m' })
  const start = resolveStart({ tanks: threeTanks, saved: loadStartView(storage, 'u1'), knownKeys: known })
  assert.deepEqual(start, { source: 'saved', tankIds: ['c'], keys: ['iodine'], view: 'compare', layout: 'separate', range: '6m' })
  assert.equal(loadStartView(storage, 'u2'), null, 'start views belong to one account')
  clearStartView(storage, 'u1')
  assert.equal(loadStartView(storage, 'u1'), null)
})

test('a shared link wins over the saved start view', () => {
  const start = resolveStart({ query: { tanks: 'b', params: 'nitrate', view: 'compare' }, tanks: threeTanks, saved: { tankIds: ['a'], keys: ['kh'] }, knownKeys: known })
  assert.equal(start.source, 'link')
  assert.deepEqual([start.tankIds, start.keys, start.view], [['b'], ['nitrate'], 'compare'])
})

test('the current selection is recognised as the saved one regardless of order', () => {
  const base = { tankIds: ['a', 'b'], keys: ['kh', 'calcium'], view: 'trend', layout: 'combined', range: 'all' }
  assert.ok(sameView(base, { ...base, tankIds: ['b', 'a'] }))
  assert.ok(!sameView(base, { ...base, range: '3m' }))
  assert.ok(!sameView(base, null))
})
