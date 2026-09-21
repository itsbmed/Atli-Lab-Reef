import test from 'node:test'
import assert from 'node:assert/strict'
import { BUILT_IN_SCALE_MAP } from './evaluationScales.js'
import { buildDirectRecommendations, evaluateAnalysis } from './directRecommendations.js'

const scale = BUILT_IN_SCALE_MAP['ati-standard']
const parameter = (key, label, groupKey, value, extra = {}) => ({ key, label, symbol: label.slice(0, 2), groupKey, unit: 'mg/l', value, ...extra })

test('the scale classifies unlabelled values and the source verdict wins when present', () => {
  const evaluated = evaluateAnalysis([
    parameter('calcium', 'Calcium', 'quantity', 300),
    parameter('magnesium', 'Magnesium', 'quantity', 1310),
    parameter('copper', 'Kupfer', 'trace', 0, { tone: 'good', sourceDirection: 'in_range' }),
  ], scale)
  assert.deepEqual(evaluated.map((item) => item.score), [2, 5, 5])
  assert.equal(evaluated[0].evaluation.label, 'Zu niedrig')
  assert.equal(evaluated[2].evaluation.label, 'Optimal')
})

test('a stable report produces no recommendation at all', () => {
  const evaluated = evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 425)], scale)
  assert.deepEqual(buildDirectRecommendations(evaluated), [])
})

test('at most three recommendations come back, most severe first', () => {
  const evaluated = evaluateAnalysis([
    parameter('calcium', 'Calcium', 'quantity', 700),
    parameter('magnesium', 'Magnesium', 'quantity', 1400),
    parameter('nitrate', 'Nitrat', 'nutrients', 0.2),
    parameter('lead', 'Blei', 'pollutants', 3),
    parameter('iron', 'Eisen', 'trace', 0.1),
  ], scale)
  const recommendations = buildDirectRecommendations(evaluated, { dosingKeys: ['iron'] })
  assert.ok(recommendations.length <= 3)
  assert.equal(recommendations[0].key, 'water-change')
  for (let index = 1; index < recommendations.length; index += 1) {
    assert.ok(recommendations[index - 1].rank >= recommendations[index].rank)
  }
})

test('an elevated supply element asks for a reduction with a concrete percentage', () => {
  const evaluated = evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 500)], scale)
  const [recommendation] = buildDirectRecommendations(evaluated)
  assert.equal(recommendation.key, 'reduce-supply')
  assert.equal(recommendation.elements[0].percent, 20)
  assert.ok(recommendation.steps[0].includes('20 %'))
})

test('a dosing recommendation only appears when a released product dose exists', () => {
  const evaluated = evaluateAnalysis([parameter('iron', 'Eisen', 'trace', 0.1)], scale)
  assert.deepEqual(buildDirectRecommendations(evaluated).map((item) => item.key), [])
  assert.deepEqual(buildDirectRecommendations(evaluated, { dosingKeys: ['iron'] }).map((item) => item.key), ['dosing'])
})
