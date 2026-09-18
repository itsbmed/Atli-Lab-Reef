import { createDemoAnalysis } from '@/services/analysisCatalog'
// Simulated measurements use the same central product configuration as every report.
const measurements = { calcium: 330, magnesium: 1100, potassium: 340, iodine: 15, phosphate: 0.14, phosphorus: 45.7 }

export function createSimulatedDosingAnalysis() {
  const base = createDemoAnalysis('demo-analysis-dosing', 'good')
  const parameters = base.parameters.map(parameter => {
    const value = measurements[parameter.key] ?? parameter.value
    const { min, max } = parameter.referenceRange
    const low = value < min
    const high = value > max
    return {
      ...parameter, value, reportedValue: value,
      tone: low || high ? 'critical' : 'good',
      calibrationStatus: low ? 'UnderRange' : high ? 'OverRange' : 'InRange',
      history: [],
      dosingRecommendation: null,
    }
  })
  const issues = parameters.filter(parameter => parameter.tone !== 'good').map(parameter => `${parameter.label} ${parameter.value < parameter.referenceRange.min ? 'niedrig' : 'erhöht'}`)
  return {
    ...base, scenario: 'dosing-test', simulation: true,
    barcode: 'SIM-ATI-20260918', reportNumber: 'SIM-ICP-20260918',
    aquariumName: '', aquariumProfile: null,
    score: 82, resultLevel: 'critical', issueCount: issues.length, issues, parameters,
    createdAt: '2026-09-18T07:00:00.000Z', completedAt: '2026-09-18T09:00:00.000Z',
    sample: { voucherCode: 'SIM-ATI-20260918', type: 'Meerwasser', receivedAt: '2026-09-18T08:00:00.000Z' },
    lab: { method: 'Simulierter ICP-OES-Bericht · keine reale Labormessung', methodVersion: '2026.09', processed: true },
    recommendations: [], recommendationGroups: [],
  }
}
