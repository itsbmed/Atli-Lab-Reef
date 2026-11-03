import test from 'node:test'
import assert from 'node:assert/strict'
import { activationToApi, analysisFromApi, issuesFor, parameterFromApi } from './analysisFromApi.js'

const calcium = { key: 'calcium', value: 318.7, band: 2, target: 419.9, min: 393.5, max: 463.6, precision: 1, isEvaluated: true, dosings: [] }

function apiAnalysis(overrides = {}) {
  return {
    id: 'an-1', ownerId: 'u-1', aquariumId: 'aq-1', aquariumName: 'Meerwasser 1', osmoseAquariumId: 'aq-2',
    barcode: 'ABCD-EFGH-JKLM-NPQR', reportNumber: '295393', package: 'icp-oes', method: 'meerwasser',
    methodName: { de: 'Meerwasser' }, waterType: 'Meerwasser', reason: 'routine', addons: [], status: 'completed',
    score: 78, issueCount: 1, groupScores: { quantity: 75 }, comment: '', labAdvice: 'KH stabilisieren.',
    createdAt: '2025-07-10T10:00:00.000000Z', receivedAt: null, completedAt: '2025-07-18T11:20:47.000000Z',
    parameters: [calcium, { key: 'copper', value: null, band: null, target: 0.5, min: null, max: 15, precision: 2, isEvaluated: true }],
    samples: [{ method: 'osmose', parameters: [{ key: 'copper', value: 5.42, band: 8, target: 0, min: null, max: 1, isEvaluated: true }] }],
    ...overrides,
  }
}

test('maps the band to the laboratory evaluation', () => {
  const parameter = parameterFromApi(calcium)

  assert.equal(parameter.tone, 'critical')
  assert.equal(parameter.sourceDirection, 'low')
  assert.equal(parameter.value, 318.7)
  assert.equal(parameter.target, '419.9')
  assert.equal(parameter.referenceRange.min, 393.5)
  assert.equal(parameter.referenceRange.max, 463.6)
  assert.equal(parameter.label, 'Calcium')
  assert.equal(parameterFromApi({ ...calcium, band: 6 }).tone, 'watch')
  assert.equal(parameterFromApi({ ...calcium, band: 6 }).sourceDirection, 'high')
  assert.equal(parameterFromApi({ ...calcium, band: 5 }).tone, 'good')
})

test('values below the detection limit and unevaluated values count as normal', () => {
  const undetectable = parameterFromApi({ ...calcium, value: null, band: null })
  assert.equal(undetectable.tone, 'good')
  assert.equal(undetectable.resultStatus, 'below_detection')

  const unevaluated = parameterFromApi({ ...calcium, key: 'kh', band: 8, isEvaluated: false })
  assert.equal(unevaluated.tone, 'good')
  assert.equal(unevaluated.sourceStatusLabel, 'Nicht bewertet')
})

test('skips elements the frontend catalog does not know', () => {
  assert.equal(parameterFromApi({ ...calcium, key: 'ratio-mg-ca' }), null)
  assert.equal(parameterFromApi({ ...calcium, key: 'rubidium' }), null)
})

test('maps a completed analysis with its osmosis sample', () => {
  const analysis = analysisFromApi(apiAnalysis())

  assert.equal(analysis.parameters.length, 2)
  assert.equal(analysis.osmosisParameters.length, 1)
  assert.equal(analysis.osmosisParameters[0].referenceRange.waterType, 'Osmosewasser')
  assert.deepEqual(analysis.issues, ['Calcium kritisch niedrig', 'Osmosewasser: Kupfer auffällig'])
  assert.equal(analysis.issueCount, 2)
  assert.equal(analysis.resultLevel, 'critical')
  assert.equal(analysis.preserveSourceEvaluation, true)
  assert.equal(analysis.osmoseAquariumId, 'aq-2')
  assert.equal(analysis.labAdvice, 'KH stabilisieren.')
})

test('open analyses and lists without details keep the backend counts', () => {
  const open = analysisFromApi(apiAnalysis({ status: 'registered', parameters: [], samples: [], score: null }))
  assert.deepEqual(open.issues, [])
  assert.equal(open.resultLevel, undefined)

  const summary = analysisFromApi(apiAnalysis({ parameters: undefined, samples: undefined, issueCount: 7 }))
  assert.equal(summary.issueCount, 7)
  assert.deepEqual(summary.parameters, [])
})

test('issues summarise osmosis findings', () => {
  assert.deepEqual(issuesFor([], [parameterFromApi({ ...calcium, key: 'silicon', band: 8 }), parameterFromApi({ ...calcium, key: 'tin', band: 9 })]), ['Osmosewasser: Silizium, Zinn auffällig'])
})

test('activation payload uses the backend field names', () => {
  assert.deepEqual(activationToApi({ barcode: 'ABCD', aquariumId: 'aq-1', reason: 'algen', addons: ['rush'], osmoseAquariumId: '' }), {
    barcode: 'ABCD', aquarium_id: 'aq-1', reason: 'algen', addons: ['rush'], osmosis_aquarium_id: null, comment: null,
  })
})
