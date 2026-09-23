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

test('one card per advisory type at most, most severe first, dosing pinned below', () => {
  const evaluated = evaluateAnalysis([
    parameter('calcium', 'Calcium', 'quantity', 700),
    parameter('magnesium', 'Magnesium', 'quantity', 1400),
    parameter('nitrate', 'Nitrat', 'nutrients', 0.2),
    parameter('lead', 'Blei', 'pollutants', 3),
    parameter('iron', 'Eisen', 'trace', 0.1),
  ], scale)
  const recommendations = buildDirectRecommendations(evaluated, { dosingKeys: ['iron'] })
  const advisory = recommendations.filter((item) => item.key !== 'dosing')
  assert.ok(advisory.length <= 4, 'never more than one card per advisory type')
  assert.equal(recommendations[0].key, 'water-change')
  assert.equal(recommendations.at(-1).key, 'dosing', 'the dosing card stays pinned to the bottom')
  for (let index = 1; index < advisory.length; index += 1) {
    assert.ok(advisory[index - 1].rank >= advisory[index].rank)
  }
})

test('an elevated supply element asks for a reduction with a concrete percentage', () => {
  const evaluated = evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 500)], scale)
  const [recommendation] = buildDirectRecommendations(evaluated)
  assert.equal(recommendation.key, 'reduce-supply')
  assert.equal(recommendation.detailLabel, 'Daher sollten Sie die tägliche Zugabe reduzieren')
  assert.deepEqual(recommendation.detailItems, [{ label: 'Calcium', value: '−20 %' }])
})

test('element names are bold inside the sentence instead of a separate chip row', () => {
  const evaluated = evaluateAnalysis([
    parameter('calcium', 'Calcium', 'quantity', 700),
    parameter('magnesium', 'Magnesium', 'quantity', 2200),
  ], scale)
  const [recommendation] = buildDirectRecommendations(evaluated)
  assert.deepEqual(recommendation.summaryParts.filter((part) => part.bold).map((part) => part.text), ['Calcium', 'Magnesium'])
  assert.ok(recommendation.summary.startsWith('Durch die Wasseranalyse wurden stark erhöhte Werte bei Calcium und Magnesium festgestellt.'))
  assert.ok(recommendation.summary.endsWith('empfehlen wir die Durchführung von Wasserwechseln.'))
})

test('static detail blocks come from the editable templates', () => {
  const evaluated = evaluateAnalysis([parameter('lead', 'Blei', 'pollutants', 3)], scale)
  const [recommendation] = buildDirectRecommendations(evaluated)
  assert.equal(recommendation.detailLabel, 'Mögliche Quellen')
  assert.ok(recommendation.detailItems.some((item) => item.label === 'Aktivkohle'))
  assert.equal(recommendation.detailAction.tool, 'sources', 'the source hunt links into the tools screen')
})

test('the water change blue box offers both correction routes, one carrying the action', () => {
  const [recommendation] = buildDirectRecommendations(evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 700)], scale))
  assert.equal(recommendation.options.length, 2)
  assert.ok(recommendation.options[0].text.includes('drei Wasserwechsel von jeweils 20 %'))
  assert.equal(recommendation.options[0].actionLabel, '', 'the standard route needs no button')
  assert.equal(recommendation.options[1].actionLabel, 'Hier geht es zum Wasserwechsel-Simulator')
  assert.equal(recommendation.action.tool, 'waterchange')
})

test('cards without a blue box simply carry no options', () => {
  const [recommendation] = buildDirectRecommendations(evaluateAnalysis([parameter('lead', 'Blei', 'pollutants', 3)], scale))
  assert.deepEqual(recommendation.options, [])
})

test('only the water change card carries tips for now', () => {
  const withTips = buildDirectRecommendations(evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 700)], scale))
  assert.ok(withTips[0].tips.length, 'the water change keeps its tips')
  for (const value of [[parameter('lead', 'Blei', 'pollutants', 3)], [parameter('calcium', 'Calcium', 'quantity', 500)], [parameter('nitrate', 'Nitrat', 'nutrients', 15)]]) {
    for (const card of buildDirectRecommendations(evaluateAnalysis(value, scale))) {
      if (card.key !== 'water-change') assert.deepEqual(card.tips, [], `${card.key} should not show tips yet`)
    }
  }
})

test('the nutrient card swaps template depending on the direction', () => {
  const card = (value) => buildDirectRecommendations(evaluateAnalysis([parameter('nitrate', 'Nitrat', 'nutrients', value)], scale)).find((item) => item.key === 'nutrients')
  assert.equal(card(15).title, 'Nährstoffmanagement optimieren')
  assert.equal(card(0.2).title, 'Nährstoffversorgung anheben')
  assert.ok(card(0.2).detailItems.some((item) => item.label === 'Fütterung behutsam erhöhen'))
})

test('a dosing recommendation only appears when a released product dose exists', () => {
  const evaluated = evaluateAnalysis([parameter('iron', 'Eisen', 'trace', 0.1)], scale)
  assert.deepEqual(buildDirectRecommendations(evaluated).map((item) => item.key), [])
  assert.deepEqual(buildDirectRecommendations(evaluated, { dosingKeys: ['iron'] }).map((item) => item.key), ['dosing'])
})
