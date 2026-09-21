import test from 'node:test'
import assert from 'node:assert/strict'
import { BUILT_IN_SCALE_MAP, SCORE_BANDS, THRESHOLD_KEYS, correctionTargetFor, scaleId, scoreValue } from './evaluationScales.js'

const ati = BUILT_IN_SCALE_MAP['ati-standard']

test('every built-in scale keeps its thresholds in ascending order for every element', () => {
  for (const scale of Object.values(BUILT_IN_SCALE_MAP)) {
    for (const [key, thresholds] of Object.entries(scale.thresholds)) {
      const values = THRESHOLD_KEYS.map((field) => thresholds[field])
      assert.ok(values.every(Number.isFinite), `${scale.id}/${key} has a non-numeric threshold`)
      for (let index = 1; index < values.length; index += 1) {
        assert.ok(values[index] >= values[index - 1], `${scale.id}/${key} is not ascending at ${THRESHOLD_KEYS[index]}`)
      }
    }
  }
})

test('the classifier returns every band and puts the optimum window on score 5', () => {
  const thresholds = ati.thresholds.calcium
  assert.deepEqual([200, 300, 380, 400, 425, 450, 500, 560, 700].map((value) => scoreValue(value, thresholds)), [1, 2, 4, 4, 5, 6, 7, 8, 9])
  assert.equal(scoreValue(thresholds.min, thresholds), 5)
  assert.equal(scoreValue(thresholds.max, thresholds), 5)
  assert.equal(scoreValue(null, thresholds), null)
  assert.equal(scoreValue(5, null), null)
  assert.deepEqual(SCORE_BANDS.map((band) => band.score), [1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test('pollutants can never score below the optimum because there is no low band', () => {
  const lead = ati.thresholds.lead
  assert.deepEqual(THRESHOLD_KEYS.slice(0, 3).map((key) => lead[key]), [0, 0, 0])
  assert.equal(scoreValue(0, lead), 5)
  assert.equal(scoreValue(3, lead), 8)
})

test('the correction target is the midpoint of the approved window', () => {
  assert.equal(correctionTargetFor(ati.thresholds.calcium), 425)
  assert.equal(correctionTargetFor(ati.thresholds.phosphorus), 18)
  assert.equal(correctionTargetFor(null), null)
})

test('new scale ids stay unique next to the existing ones', () => {
  const existing = [{ id: 'nyos' }, { id: 'nyos-2' }]
  assert.equal(scaleId('NYOS', existing), 'nyos-3')
  assert.equal(scaleId('Fauna Marin Löw', existing), 'fauna-marin-low')
  assert.equal(scaleId('', []), 'skala')
})
