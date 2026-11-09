import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ABSOLUTE_OCEAN,
  DEFAULT_IDEALS,
  SIMULATION_KEYS,
  changePercent,
  deviationCurve,
  percentOfIdeal,
  qiCurve,
  qiDeduction,
  qiPlateau,
  qualityIndex,
  estimatedSalinity,
  referenceSalt,
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

// Both source columns from Tabelle1!B5:Q18; compare the iterative implementation
// with the closed-form mass balance for every element and every supported count.
const aquariumA = {
  chloride: 19750, sodium: 11000, magnesium: 1600, sulfur: 900, calcium: 500, potassium: 390, bromine: 75,
  strontium: 10, boron: 3, fluoride: 0.3, nitrate: 5, silicon: 240, lithium: 500, zinc: 10,
}
const saltA = { ...ABSOLUTE_OCEAN, magnesium: 1450, calcium: 445, strontium: 9, fluoride: 1, silicon: 100, lithium: 200, zinc: 5 }

test('all 88 workbook scenarios reconcile all 14 elements and their deviation totals', () => {
  for (const [aquarium, percent] of [[aquariumA, 16], [aquariumB, 25]]) {
    for (const osmosis of [{}, { silicon: 100, zinc: 3 }]) {
      for (const salt of [saltA, ABSOLUTE_OCEAN]) {
        for (let count = 0; count <= 10; count += 1) {
          const result = simulateWaterChange({ aquarium, percent, osmosis, salt, count, ideal: DEFAULT_IDEALS })
          assert.equal(result.rows.length, 14)
          let total = 0
          for (const key of SIMULATION_KEYS) {
            const replacement = (osmosis[key] || 0) + salt[key]
            const expected = replacement + (aquarium[key] - replacement) * (1 - percent / 100) ** count
            const row = result.rows.find((item) => item.key === key)
            close(row.after, expected)
            assert.equal(row.steps.length, count)
            const pct = key === 'nitrate' && expected < 2 ? 100 : expected * 100 / DEFAULT_IDEALS[key]
            total += Math.abs(100 - pct)
          }
          close(result.deviationAfter, Math.round(total * 1e9) / 1e9)
        }
      }
    }
  }
})

test('zero changes and zero share preserve the aquarium; a full change gives replacement water', () => {
  const input = { aquarium: aquariumB, salt: ABSOLUTE_OCEAN, ideal: DEFAULT_IDEALS }
  for (const options of [{ count: 0, percent: 25 }, { count: 10, percent: 0 }]) {
    for (const row of simulateWaterChange({ ...input, ...options }).rows) close(row.after, aquariumB[row.key])
  }
  for (const row of simulateWaterChange({ ...input, count: 1, percent: 100 }).rows) close(row.after, ABSOLUTE_OCEAN[row.key])
  assert.equal(simulateWaterChange({ ...input, count: 11 }).count, 10)
})

test('missing report measurements stay missing while explicit zero and below detection remain valid', () => {
  const { values } = valuesFromParameters([
    { key: 'calcium', value: null },
    { key: 'magnesium', value: '' },
    { key: 'silicon', value: '   ' },
    { key: 'sodium', value: false },
    { key: 'zinc', value: null, resultStatus: 'below_detection' },
    { key: 'nitrate', value: 0 },
    { key: 'boron', value: '4.5' },
  ])
  assert.deepEqual(values, { zinc: 0, nitrate: 0, boron: 4.5 })
  const result = simulateWaterChange({ aquarium: values, salt: ABSOLUTE_OCEAN, ideal: DEFAULT_IDEALS })
  assert.ok(result.skipped.includes('calcium'))
  assert.ok(!result.rows.some((row) => row.key === 'magnesium'))
})

test('invalid volumes and infinite targets cannot produce plausible results', () => {
  assert.equal(changePercent(Infinity, 500), 0)
  assert.equal(changePercent(50, Infinity), 0)
  const result = simulateWaterChange({ aquarium: aquariumB, salt: ABSOLUTE_OCEAN, ideal: { ...DEFAULT_IDEALS, calcium: Infinity } })
  assert.ok(result.skipped.includes('calcium'))
})

test('cost-benefit hint allows no changes when even the first is unhelpful', () => {
  const curve = deviationCurve({ aquarium: DEFAULT_IDEALS, salt: saltA, ideal: DEFAULT_IDEALS, percent: 25 })
  assert.equal(sensibleCount(curve), 0)
  assert.equal(sensibleCount([]), 0)
  assert.equal(sensibleCount([{ count: 0, deviation: 0 }]), 0)
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
    { key: 'iodine', value: 64, sourceIdealValue: 64, unit: 'µg/l' },
  ])
  assert.deepEqual(values, { calcium: 422.58, zinc: 0, iodine: 64 })
  assert.deepEqual(ideals, { calcium: 426.01, zinc: 1.97, iodine: 64 })
})

test('every report element is calculated with the same formula; points stay on the 14 of the workbook', () => {
  const aquarium = { ...aquariumB, iodine: 40, aluminium: 36.69, phosphate: 0.31 }
  const ideal = { ...DEFAULT_IDEALS, iodine: 65.77, aluminium: 0.1, phosphate: 0.05 }
  const salt = referenceSalt(ideal)
  assert.equal(salt.iodine, 65.77)
  assert.equal(salt.aluminium, 0)
  assert.equal(salt.phosphate, 0)
  assert.equal(salt.silicon, ABSOLUTE_OCEAN.silicon)
  const result = simulateWaterChange({ aquarium, salt, ideal, units: { iodine: 'µg/l' }, percent: 25, count: 2 })
  const iodine = result.rows.find((row) => row.key === 'iodine')
  close(iodine.after, 40 * 0.75 * 0.75 + 65.77 * (1 - 0.75 * 0.75))
  assert.equal(iodine.unit, 'µg/l')
  assert.equal(iodine.scored, false)
  close(result.rows.find((row) => row.key === 'aluminium').after, 36.69 * 0.5625)
  assert.equal(result.scoredCount, 14)
  const workbookOnly = simulateWaterChange({ aquarium: aquariumB, salt: ABSOLUTE_OCEAN, ideal: DEFAULT_IDEALS, percent: 25, count: 2 })
  close(result.deviationAfter, workbookOnly.deviationAfter)
})

test('pollutants under their ideal count as ideal; without a positive ideal there is no percentage', () => {
  assert.equal(percentOfIdeal('aluminium', 0.05, 0.1), 100)
  assert.equal(percentOfIdeal('mercury', 0, 0), 100)
  assert.equal(percentOfIdeal('iodine', 10, 0), null)
})

// „WW Simulator mit QI Auswertung“: Aquarium B (neue Startwerte), Osmose A, Salz B, 7 × 25 %.
const qiAquariumB = {
  kh: 7.5, chloride: 22000, sodium: 8900, magnesium: 800, sulfur: 600, calcium: 350, potassium: 250, bromine: 40,
  strontium: 2, boron: 6, fluoride: 2, nitrate: 0, silicon: 75, lithium: 250, zinc: 40,
}
const qiSaltB = { ...ABSOLUTE_OCEAN, kh: 7.5 }
const qiScenario = { aquarium: qiAquariumB, salt: qiSaltB, ideal: DEFAULT_IDEALS, percent: 25 }

test('salinity is estimated from the composition like in the QI workbook', () => {
  close(estimatedSalinity(qiAquariumB), 33.50341796875)
  close(estimatedSalinity(qiSaltB), 35.0453125)
  assert.equal(estimatedSalinity({ chloride: 19800 }), null, 'no estimate without the full composition')
})

test('seven 25 % changes give the new values of the QI workbook, including PSU and KH', () => {
  const result = simulateWaterChange({ ...qiScenario, count: 7 })
  const after = Object.fromEntries(result.rows.map((row) => [row.key, row.after]))
  const workbook = {
    salinity: 34.839494425058362, kh: 7.5, chloride: 20093.66455078125, sodium: 10719.683837890625, magnesium: 1250.58837890625,
    sulfur: 859.954833984375, calcium: 410.6561279296875, potassium: 386.9095458984375, bromine: 63.39593505859375,
    strontium: 7.2857482910156257, boron: 4.700225830078125, fluoride: 1.3934387207031249, nitrate: 0,
    silicon: 36.00677490234375, lithium: 189.3438720703125, zinc: 7.0723876953125,
  }
  for (const [key, value] of Object.entries(workbook)) close(after[key], value)
  assert.equal(result.estimatedSalinity, true)
})

test('low values are scored from the most severe threshold, as the threshold table describes', () => {
  // Die WENN-Formel der Mappe gibt hier dreimal 5 Punkte.
  assert.equal(qiDeduction('magnesium', 800), 30)
  assert.equal(qiDeduction('magnesium', 1052), 10)
  assert.equal(qiDeduction('magnesium', 1183), 10)
  assert.equal(qiDeduction('magnesium', 1249.25), 0)
  assert.equal(qiDeduction('magnesium', 1380.75), 0, 'the limits themselves are still fine')
  assert.equal(qiDeduction('magnesium', 1381), 5)
  assert.equal(qiDeduction('magnesium', 1800), 30)
  assert.equal(qiDeduction('nitrate', 0), 0, 'nitrate has no lower limit below 0')
  assert.equal(qiDeduction('calcium', 350), 5, 'a value on a threshold falls into the milder band')
  assert.equal(qiDeduction('phosphate', 1), null)
})

test('the QI is the weakest of four groups and a group never drops below 0', () => {
  const before = qualityIndex({ salinity: 33.50341796875, ...qiAquariumB })
  assert.deepEqual(before.groups.map((group) => group.score), [100, 0, 95, 65])
  assert.equal(before.overall, 0)
  const result = simulateWaterChange({ ...qiScenario, count: 7 })
  assert.deepEqual(result.qiAfter.groups.map((group) => group.score), [100, 95, 80, 95])
  assert.equal(result.qiAfter.overall, 80)
  assert.equal(result.qiGain, 80)
  assert.deepEqual(qualityIndex({ kh: 8 }).groups.map((group) => group.score), [100, null, null, null], 'groups without values do not count')
})

test('the QI curve shows from which change the QI stops rising', () => {
  const curve = qiCurve(qiScenario)
  assert.equal(curve.length, 11)
  assert.equal(curve[0].qi, 0)
  const plateau = qiPlateau(curve)
  assert.ok(curve.slice(plateau).every((point) => point.qi === curve[plateau].qi))
  assert.ok(curve.slice(0, plateau).every((point) => point.qi < curve[plateau].qi))
  assert.equal(qiPlateau([{ count: 0, qi: 90 }, { count: 1, qi: 90 }]), 0)
})

test('Absolute Ocean brings 35 PSU and 7.5 °dKH', () => {
  const salt = referenceSalt({ salinity: 35, kh: 8 })
  assert.equal(salt.salinity, 35)
  assert.equal(salt.kh, 7.5)
})
