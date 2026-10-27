import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAnalysisSeries, calculateConsumption } from './toolsCalculations.js'

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

