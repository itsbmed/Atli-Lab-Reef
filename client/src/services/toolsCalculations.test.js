import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAnalysisSeries,
  calculateConsumption,
  isoWeekValue,
  simulateWaterChanges,
  waterChangeFraction,
} from './toolsCalculations.js'

test('litre mode preserves the exact requested water volume', () => {
  const fraction = waterChangeFraction({ amount: 33, unit: 'l', volume: 500 })
  assert.equal(fraction, 0.066)
  assert.equal(500 * fraction, 33)
})

test('repeated water changes use the remaining concentration each time', () => {
  const result = simulateWaterChanges(
    [{ key: 'nitrate', aquarium: 20 }],
    { nitrate: 0 },
    2,
    0.2,
  )
  assert.equal(result.nitrate, 12.8)
})

test('analysis series keeps labels and values aligned and applies the period', () => {
  const analyses = [
    { id: 'old', createdAt: '2025-01-10', parameters: [{ key: 'calcium', value: 410 }] },
    { id: 'new', createdAt: '2026-08-10', parameters: [{ key: 'calcium', value: 425 }] },
    { id: 'missing', createdAt: '2026-09-01', parameters: [] },
  ]
  const series = buildAnalysisSeries(analyses, 'calcium', { months: 3, now: new Date('2026-09-15') })
  assert.deepEqual(series.map((point) => [point.analysisId, point.value]), [['new', 425]])
})

test('documented dosing is included in calculated consumption', () => {
  const result = calculateConsumption({
    olderValue: 430,
    newerValue: 416,
    intervalDays: 7,
    dosingMode: 'regular',
    documentedDose: 1,
  })
  assert.equal(result.consumptionPerDay, 3)
  assert.equal(result.recommendedAdditionalPerDay, 2)
})

test('ISO week defaults can be derived from the current date', () => {
  assert.equal(isoWeekValue(new Date('2026-09-15T12:00:00')), '2026-W38')
})
