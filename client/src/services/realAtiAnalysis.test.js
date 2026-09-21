import assert from 'node:assert/strict'
import test from 'node:test'
import { createRealAtiAnalysis, REAL_ATI_PARAMETERS, REAL_ATI_OSMOSIS_PARAMETERS } from './realAtiAnalysis.js'

test('real ATI report 393026 preserves its source measurements and statuses', () => {
  const analysis = createRealAtiAnalysis()
  assert.equal(analysis.reportNumber, '393026')
  assert.equal(analysis.score, 91)
  assert.equal(analysis.aquariumId, 'demo-basement-system')
  assert.equal(REAL_ATI_PARAMETERS.length, 43)
  assert.equal(REAL_ATI_OSMOSIS_PARAMETERS.length, 29)

  const manganese = analysis.parameters.find((parameter) => parameter.key === 'manganese')
  const copper = analysis.parameters.find((parameter) => parameter.key === 'copper')
  const nitrate = analysis.parameters.find((parameter) => parameter.key === 'nitrate')
  const osmosisSilicon = analysis.osmosisParameters.find((parameter) => parameter.key === 'silicon')
  assert.deepEqual({ value: manganese.value, reportedValue: manganese.reportedValue, target: manganese.correctionTarget, tone: manganese.tone }, { value: 0, reportedValue: 'Nicht nachweisbar', target: 0.97, tone: 'watch' })
  assert.equal(copper.tone, 'good')
  assert.equal(nitrate.value, 0.18)
  assert.deepEqual({ product: nitrate.managedDose.productName, dailyMl: nitrate.managedDose.dailyMl }, { product: 'ATI Nutrition N/Nitro', dailyMl: 2.27 })
  assert.deepEqual({ value: osmosisSilicon.value, tone: osmosisSilicon.tone }, { value: 62.6, tone: 'critical' })
})

test('real ATI report keeps the original corrective instructions', () => {
  const analysis = createRealAtiAnalysis()
  assert.equal(analysis.sourceDosing.icpElements.find((item) => item.key === 'manganese').totalMl, 1.1)
  assert.deepEqual(analysis.sourceDosing.supplements.find((item) => item.key === 'iron').portions, [0.22, 0.22, 0.22, 0.22, 0.22])
  assert.ok(analysis.recommendationGroups.some((item) => item.summary.includes('2,27 ml Nutrition N/Nitro')))
  assert.ok(analysis.recommendationGroups.some((item) => item.summary.includes('Mischbettharz')))
})
