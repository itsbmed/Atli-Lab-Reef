import assert from 'node:assert/strict'
import test from 'node:test'
import { eligibleProductKeys } from './productEligibility.js'

test('supplements are only suggested for valid deficiencies in the source report', () => {
  const parameters = [
    { key: 'calcium', value: 350, referenceRange: { min: 400 } },
    { key: 'iron', value: 30, referenceRange: { min: 2 } },
    { key: 'iodine', value: 60, referenceRange: { min: 60 } },
    { key: 'magnesium', value: 1000, referenceRange: { min: 1200 }, resultStatus: 'failed' },
    { key: 'copper', value: 0, referenceRange: { min: 1 }, groupKey: 'pollutants' },
    { key: 'boron', value: null, referenceRange: { min: 4 } },
    { key: 'strontium', value: 1, referenceRange: { min: 8 }, resultStatus: 'math_error' },
    { key: 'potassium', value: 200, referenceRange: { min: 380 }, resultStatus: 'invalid' },
  ]
  assert.deepEqual(eligibleProductKeys(parameters.map((parameter) => parameter.key), parameters), ['calcium'])
})

test('grouped suggestions preserve multiple low parameters and support legacy target ranges', () => {
  const parameters = [
    { key: 'calcium', value: 350, target: '400–450' },
    { key: 'iodine', value: 0.03, target: '0,06–0,09' },
    { key: 'magnesium', value: 1100, target: '1200–1400' },
    { key: 'iron', value: 1 },
  ]
  assert.deepEqual(eligibleProductKeys(['calcium', 'iodine', 'magnesium', 'iron'], parameters), ['calcium', 'iodine', 'magnesium'])
  assert.deepEqual(eligibleProductKeys(['calcium']), [])
})
