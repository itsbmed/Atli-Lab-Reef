import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRecommendationItems, dueBucket, dueLabel, latestCompletedByAquarium } from './recommendationsHub.js'

test('only the newest completed report remains active for each aquarium', () => {
  const analyses = [
    { id: 'old-a', aquariumId: 'a', status: 'completed', completedAt: '2026-08-01' },
    { id: 'new-a', aquariumId: 'a', status: 'completed', completedAt: '2026-09-01' },
    { id: 'open-a', aquariumId: 'a', status: 'received', createdAt: '2026-09-10' },
    { id: 'new-b', aquariumId: 'b', status: 'completed', completedAt: '2026-08-15' },
  ]

  assert.deepEqual(latestCompletedByAquarium(analyses).map((analysis) => analysis.id), ['new-a', 'new-b'])
})

const report = (id, name, value) => ({
  id,
  aquariumId: id,
  aquariumName: name,
  reportNumber: `ICP-${id}`,
  status: 'completed',
  completedAt: '2026-09-01T12:00:00Z',
  parameters: [{ key: 'calcium', label: 'Calcium', symbol: 'Ca', groupKey: 'quantity', unit: 'mg/l', value }],
})

test('tasks come from the same engine as the report and are dated from it', () => {
  const [item] = buildRecommendationItems([report('a', 'Riff', 700)])
  assert.equal(item.analysisId, 'a')
  assert.equal(item.aquariumName, 'Riff')
  assert.equal(item.key, 'water-change')
  assert.deepEqual(item.elements, ['Calcium'])
  // the water change template rechecks after seven days
  assert.equal(item.dueDate.toISOString(), '2026-09-08T12:00:00.000Z')
  assert.ok(item.summary.includes('Calcium'))
})

test('a stable report produces no task at all', () => {
  assert.deepEqual(buildRecommendationItems([report('a', 'Riff', 425)]), [])
})

test('tasks from every aquarium land in one list, earliest due first', () => {
  const items = buildRecommendationItems([report('a', 'Riff', 700), report('b', 'Nano', 500)])
  assert.deepEqual([...new Set(items.map((item) => item.aquariumName))].sort(), ['Nano', 'Riff'])
  for (let index = 1; index < items.length; index += 1) {
    assert.ok(items[index - 1].dueDate <= items[index].dueDate)
  }
})

test('due dates bucket into now, this week and later', () => {
  const now = new Date('2026-09-20T09:00:00Z')
  const shift = (days) => new Date(new Date(now).setDate(now.getDate() + days))
  assert.equal(dueBucket(shift(-3), now), 'now')
  assert.equal(dueBucket(now, now), 'now')
  assert.equal(dueBucket(shift(4), now), 'week')
  assert.equal(dueBucket(shift(20), now), 'later')
})

test('due labels read as plain language', () => {
  const now = new Date('2026-09-20T09:00:00Z')
  const shift = (days) => new Date(new Date(now).setDate(now.getDate() + days))
  assert.equal(dueLabel(shift(-2), now), 'seit 2 Tagen fällig')
  assert.equal(dueLabel(shift(-1), now), 'seit 1 Tag fällig')
  assert.equal(dueLabel(now, now), 'heute fällig')
  assert.equal(dueLabel(shift(1), now), 'morgen fällig')
  assert.equal(dueLabel(shift(5), now), 'in 5 Tagen')
})
