import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_CASES_PARAMETERS, createAllCasesAnalysis } from './allCasesAnalysis.js'
import { BUILT_IN_SCALE_MAP } from './evaluationScales.js'
import { buildDirectRecommendations, evaluateAnalysis } from './directRecommendations.js'

const scale = BUILT_IN_SCALE_MAP['ati-standard']
const evaluated = evaluateAnalysis(ALL_CASES_PARAMETERS, scale)

test('the reference report triggers every recommendation card at once', () => {
  const keys = buildDirectRecommendations(evaluated, { dosingKeys: ['iron', 'manganese', 'phosphorus'] }).map((item) => item.key)
  for (const expected of ['water-change', 'reduce-supply', 'nutrients', 'pollutants', 'dosing']) {
    assert.ok(keys.includes(expected), `${expected} is missing from the reference report`)
  }
  assert.equal(keys.at(-1), 'dosing', 'the dosing card stays pinned to the bottom')
})

test('the reference report covers the low, optimal and high bands', () => {
  const scores = new Set(evaluated.map((parameter) => parameter.score))
  for (const band of [1, 2, 5, 6, 7, 8, 9]) assert.ok(scores.has(band), `no value lands on score ${band}`)
})

test('the reference analysis is a completed report with matching issue count', () => {
  const analysis = createAllCasesAnalysis()
  assert.equal(analysis.status, 'completed')
  assert.equal(analysis.issueCount, analysis.issues.length)
  assert.equal(analysis.parameters.length, ALL_CASES_PARAMETERS.length)
  assert.ok(analysis.parameters.every((parameter) => parameter.target.includes('–')))
})
