import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRecommendationItems, latestCompletedByAquarium } from './recommendationsHub.js'

test('only the newest completed report remains active for each aquarium', () => {
  const analyses = [
    { id: 'old-a', aquariumId: 'a', status: 'completed', completedAt: '2026-08-01' },
    { id: 'new-a', aquariumId: 'a', status: 'completed', completedAt: '2026-09-01' },
    { id: 'open-a', aquariumId: 'a', status: 'received', createdAt: '2026-09-10' },
    { id: 'new-b', aquariumId: 'b', status: 'completed', completedAt: '2026-08-15' },
  ]

  assert.deepEqual(latestCompletedByAquarium(analyses).map((analysis) => analysis.id), ['new-a', 'new-b'])
})

test('recommendations include report context and calculated control dates', () => {
  const [item] = buildRecommendationItems([{
    id: 'analysis-1', aquariumId: 'aquarium-1', aquariumName: 'Riff', reportNumber: 'ICP-1',
    completedAt: '2026-09-01T12:00:00Z', recommendationGroups: [{
      key: 'nutrients', title: 'Nährstoffe prüfen', summary: 'Langsam korrigieren.',
      priority: 'Hoch', recheckDays: 7, parameters: ['Nitrat'], steps: ['Filter prüfen.'],
    }],
  }])

  assert.equal(item.analysisId, 'analysis-1')
  assert.equal(item.aquariumName, 'Riff')
  assert.equal(item.dueDate.toISOString(), '2026-09-08T12:00:00.000Z')
  assert.deepEqual(item.parameters, ['Nitrat'])
})
