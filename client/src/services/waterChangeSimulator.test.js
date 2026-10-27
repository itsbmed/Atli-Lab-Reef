import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ABSOLUTE_OCEAN,
  DEFAULT_IDEALS,
  changePercent,
  deviationCurve,
  percentOfIdeal,
  sensibleCount,
  simulateWaterChange,
  valuesFromParameters,
} from './waterChangeSimulator.js'

// „Aquarium B“, „Osmose A“ (alles 0) und „Salz B“ der Arbeitsmappe „WW Simulator für Mo“.
const aquariumB = {
  chloride: 19830, sodium: 11000, magnesium: 1400, sulfur: 900, calcium: 430, potassium: 400, bromine: 60,
  strontium: 7, boron: 4.5, fluoride: 1.3, nitrate: 0, silicon: 75, lithium: 180, zinc: 0,
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`)

test('the change share is WW litres in percent of the net volume', () => {
  assert.equal(changePercent(125, 500), 25)
  assert.equal(changePercent(40, 250), 16)
  assert.equal(changePercent(0, 500), 0)
  assert.equal(changePercent(900, 500), 100, 'never more than the whole tank')
})

test('two 25 % changes give exactly the values of the workbook', () => {
  const result = simulateWaterChange({ aquarium: aquariumB, osmosis: {}, salt: ABSOLUTE_OCEAN, ideal: DEFAULT_IDEALS, percent: 25, count: 2 })
  const after = Object.fromEntries(result.rows.map((row) => [row.key, row.after]))
  close(after.chloride, 19816.875)
  close(after.magnesium, 1365)
  close(after.calcium, 425.625)
  close(after.potassium, 403.5)
  close(after.bromine, 63.0625)
  close(after.strontium, 7.48125)
  close(after.silicon, 55.3125)
  close(after.zinc, 0.875)
  // Zusammenfassung der Mappe: Summe vorher (AB48), nachher (Y48), „Verbessert“ (AA50), Mittelwert (X50)
  close(result.deviationBefore, 184.581866014)
  close(result.deviationAfter, 86.327299633)
  close(result.improvement, 98.254566381)
  close(result.meanAfter, 96.042136297)
})

test('each change starts from the result of the one before', () => {
  const result = simulateWaterChange({ aquarium: aquariumB, salt: ABSOLUTE_OCEAN, ideal: DEFAULT_IDEALS, percent: 25, count: 2 })
  const calcium = result.rows.find((row) => row.key === 'calcium')
  assert.deepEqual(calcium.steps, [427.5, 425.625])
})

test('new water is osmosis plus salt', () => {
  const result = simulateWaterChange({ aquarium: aquariumB, osmosis: { silicon: 100, zinc: 3 }, salt: ABSOLUTE_OCEAN, ideal: DEFAULT_IDEALS, percent: 25, count: 1 })
  const silicon = result.rows.find((row) => row.key === 'silicon')
  assert.equal(silicon.newWater, 130)
  assert.equal(silicon.after, 75 * 0.75 + 130 * 0.25)
})

test('nitrate below its ideal counts as ideal', () => {
  assert.equal(percentOfIdeal('nitrate', 0, 2), 100)
  assert.equal(percentOfIdeal('nitrate', 5, 2), 250)
  assert.equal(percentOfIdeal('calcium', 210, 420), 50)
})

test('missing values are skipped instead of counted as zero', () => {
  const { potassium, ...withoutPotassium } = aquariumB
  const result = simulateWaterChange({ aquarium: withoutPotassium, salt: ABSOLUTE_OCEAN, ideal: DEFAULT_IDEALS, percent: 25, count: 1 })
  assert.deepEqual(result.skipped, ['potassium'])
  assert.equal(result.rows.length, 13)
})

test('the curve shows where another change stops paying off', () => {
  const curve = deviationCurve({ aquarium: aquariumB, salt: ABSOLUTE_OCEAN, ideal: DEFAULT_IDEALS, percent: 25 })
  assert.equal(curve.length, 11)
  close(curve[0].deviation, 184.581866014)
  assert.ok(curve.every((point, index) => index === 0 || point.deviation <= curve[index - 1].deviation))
  const count = sensibleCount(curve, 5)
  assert.ok(count >= 2 && count <= 10)
})

test('report values: n. n. counts as 0 and the lab ideal is taken over', () => {
  const { values, ideals } = valuesFromParameters([
    { key: 'calcium', value: 422.58, sourceIdealValue: 426.01, resultStatus: 'valid' },
    { key: 'zinc', value: 0, reportedValue: 'Nicht nachweisbar', sourceIdealValue: 1.97, resultStatus: 'below_detection' },
    { key: 'iodine', value: 64, sourceIdealValue: 64 },
  ])
  assert.deepEqual(values, { calcium: 422.58, zinc: 0 })
  assert.deepEqual(ideals, { calcium: 426.01, zinc: 1.97 })
})
