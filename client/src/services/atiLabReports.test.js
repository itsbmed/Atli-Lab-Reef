import test from 'node:test'
import assert from 'node:assert/strict'
import { ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'
import {
  REPORT_394463_ROWS, REPORT_394527_ROWS, REPORT_394770_ROWS,
  REPORT_394091_ROWS, REPORT_394456_ROWS, REPORT_394515_ROWS,
  REPORT_392933_ROWS, REPORT_393984_ROWS, REPORT_394949_ROWS,
  createReport392933, createReport393984, createReport394949,
  createReport394463, createReport394527, createReport394770,
  createReport394091, createReport394456, createReport394515, createAtiLabReports,
} from './atiLabReports.js'

// The fixture parses the CSV export. These expectations are read off the printed PDF
// instead, so a mistake in the parser or the status overrides cannot pass unnoticed.

const byKey = (rows) => Object.fromEntries(rows.map((row) => [row.key, row]))

const ALL_ROWS = [
  REPORT_394463_ROWS, REPORT_394527_ROWS, REPORT_394770_ROWS,
  REPORT_394091_ROWS, REPORT_394456_ROWS, REPORT_394515_ROWS,
  REPORT_392933_ROWS, REPORT_393984_ROWS, REPORT_394949_ROWS,
]

test('every report carries all 43 laboratory parameters and only known elements', () => {
  for (const rows of ALL_ROWS) {
    assert.equal(rows.length, 43)
    for (const row of rows) assert.ok(ELEMENT_DEFINITION_MAP[row.key], `unknown element ${row.key}`)
    assert.equal(new Set(rows.map((row) => row.key)).size, 43, 'no element appears twice')
  }
})

test('394463 Aquarium Neu matches the printed report', () => {
  const rows = byKey(REPORT_394463_ROWS)
  assert.deepEqual(REPORT_394463_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['potassium', 'boron', 'silicon', 'manganese', 'iron', 'zinc', 'phosphorus', 'phosphate'])

  assert.deepEqual([rows.salinity.measured, rows.salinity.ideal], [35.78, 35])
  assert.deepEqual([rows.kh.measured, rows.kh.ideal], [8.36, 7.5])
  assert.deepEqual([rows.chloride.measured, rows.chloride.ideal], [20061.3, 20035.7])
  assert.deepEqual([rows.magnesium.measured, rows.magnesium.ideal], [1415.36, 1330.65])
  assert.deepEqual([rows.potassium.measured, rows.potassium.ideal], [464.27, 412.86])
  assert.deepEqual([rows.boron.measured, rows.boron.ideal], [5.98, 4.55])
  assert.deepEqual([rows.silicon.measured, rows.silicon.ideal], [23.99, 101.19])
  assert.deepEqual([rows.zinc.measured, rows.zinc.ideal], [8.96, 2.02])
  assert.deepEqual([rows.phosphorus.measured, rows.phosphorus.ideal], [101.87, 15.18])
  assert.deepEqual([rows.phosphate.measured, rows.phosphate.ideal], [0.31, 0.05])
  assert.deepEqual([rows.aluminium.measured, rows.aluminium.ideal], [36.69, 0.1])
  assert.equal(rows.manganese.measured, null, 'manganese was not detectable')
  assert.equal(rows.iron.measured, null, 'iron was not detectable')
  assert.equal(REPORT_394463_ROWS.filter((row) => row.measured === null).length, 18)

  const analysis = createReport394463()
  assert.equal(analysis.score, 89)
  assert.equal(analysis.barcode, 'BU7Y-A4B3-3UWT-6W35')
  assert.deepEqual(analysis.groupScores, { basis: 100, quantity: 95, trace: 89, pollutants: 100 })
  assert.equal(analysis.aquariumName, 'Aquarium Neu')
  // the osmosis sample is the only place these six were detected
  const osmosis = byKey(analysis.osmosisParameters.map((item) => ({ key: item.key, measured: item.reportedValue })))
  assert.equal(osmosis.silicon.measured, 540.8)
  assert.equal(osmosis.lithium.measured, 16.05)
  assert.equal(osmosis.barium.measured, 19.2)
  assert.equal(osmosis.manganese.measured, 0.85)
  assert.equal(osmosis.copper.measured, 5.42)
  assert.equal(osmosis.tin.measured, 11.05)
  assert.equal(osmosis.zinc.measured, 'Nicht nachweisbar')
})

test('394527 Grosses Becken 500L matches the printed report', () => {
  const rows = byKey(REPORT_394527_ROWS)
  assert.deepEqual(REPORT_394527_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['calcium', 'fluoride', 'silicon', 'iodine', 'manganese', 'vanadium', 'zinc', 'nitrate', 'phosphorus', 'phosphate'])

  assert.deepEqual([rows.salinity.measured, rows.salinity.ideal], [34.58, 35])
  assert.deepEqual([rows.calcium.measured, rows.calcium.ideal], [480, 414.53])
  assert.deepEqual([rows.fluoride.measured, rows.fluoride.ideal], [6.09, 1.28])
  assert.deepEqual([rows.iodine.measured, rows.iodine.ideal], [224.3, 64])
  assert.deepEqual([rows.silicon.measured, rows.silicon.ideal], [403.1, 98.46])
  assert.deepEqual([rows.nitrate.measured, rows.nitrate.ideal], [71.38, 2])
  assert.deepEqual([rows.phosphorus.measured, rows.phosphorus.ideal], [40.67, 14.77])
  assert.deepEqual([rows.iron.measured, rows.iron.ideal], [1.57, 0.49], 'iron was detected here')
  assert.equal(rows.zinc.measured, null)
  assert.equal(rows.zinc.tone, 'critical')
  assert.equal(REPORT_394527_ROWS.filter((row) => row.measured === null).length, 21)

  const analysis = createReport394527()
  assert.equal(analysis.score, 80)
  assert.equal(analysis.barcode, 'TK3D-EJBL-UAG9-L4BV')
  assert.deepEqual(analysis.groupScores, { basis: 100, quantity: 88, trace: 80, pollutants: 100 })
  assert.ok(analysis.osmosisParameters.every((item) => item.reportedValue === 'Nicht nachweisbar'), 'its osmosis sample was clean')
})

test('394770 Nyos Opus G2 440 LPS matches the printed report', () => {
  const rows = byKey(REPORT_394770_ROWS)
  assert.deepEqual(REPORT_394770_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['calcium', 'potassium', 'fluoride', 'silicon', 'manganese', 'zinc', 'nitrate', 'phosphorus', 'phosphate'])

  assert.deepEqual([rows.salinity.measured, rows.salinity.ideal], [35.78, 35])
  assert.deepEqual([rows.calcium.measured, rows.calcium.ideal], [402.38, 432.22])
  assert.deepEqual([rows.potassium.measured, rows.potassium.ideal], [388.02, 418.88])
  assert.deepEqual([rows.fluoride.measured, rows.fluoride.ideal], [0.94, 1.33])
  assert.deepEqual([rows.nitrate.measured, rows.nitrate.ideal], [0.06, 2])
  assert.deepEqual([rows.phosphorus.measured, rows.phosphorus.ideal], [8.13, 15.4])
  assert.deepEqual([rows.phosphate.measured, rows.phosphate.ideal], [0.02, 0.05])
  assert.deepEqual([rows.copper.measured, rows.copper.ideal], [1.37, 0.51])
  assert.deepEqual([rows.cadmium.measured, rows.cadmium.ideal], [null, 0.21], 'cadmium ideal differs from the other two reports')
  assert.equal(rows.silicon.measured, null)
  assert.equal(rows.silicon.tone, 'watch')
  assert.equal(REPORT_394770_ROWS.filter((row) => row.measured === null).length, 20)

  const analysis = createReport394770()
  assert.equal(analysis.score, 87)
  assert.equal(analysis.aquariumName, 'Nyos Opus G2 440 LPS')
  assert.deepEqual(analysis.groupScores, { basis: 100, quantity: 93, trace: 87, pollutants: 100 })
  assert.equal(analysis.osmosisParameters, undefined, 'no osmosis sample was submitted')
})

test('ideal values below the CSV precision keep the printed 0.001', () => {
  for (const rows of ALL_ROWS) {
    const keyed = byKey(rows)
    for (const key of ['lanthanum', 'tungsten', 'mercury']) {
      assert.equal(keyed[key].ideal, 0.001, `${key} must not round to 0`)
    }
  }
})

test('the dosing advice from the reports is carried over exactly', () => {
  const [first, second, third] = createAtiLabReports()
  assert.deepEqual(first.sourceDosing.icpElements, [
    { key: 'manganese', totalMl: 3.54, portions: [3.54] },
    { key: 'iron', totalMl: 1.77, portions: [1.77] },
  ])
  assert.deepEqual(first.sourceDosing.supplements[1].portions, [0.59, 0.59, 0.59, 0.59, 0.59, 0.59], 'iron is split six times')
  assert.deepEqual(second.sourceDosing.icpElements.map((item) => item.totalMl), [1.48, 0.98, 1.23])
  assert.deepEqual(third.sourceDosing.icpElements.map((item) => item.key), ['calcium', 'potassium', 'zinc', 'manganese', 'fluoride'])
  assert.deepEqual(third.sourceDosing.icpElements[1].portions, [29.16, 29.16, 29.16, 29.16], 'potassium is split four times')
})

test('undetectable readings report as not detectable and never as a zero measurement', () => {
  for (const analysis of createAtiLabReports()) {
    for (const parameter of analysis.parameters) {
      if (parameter.resultStatus !== 'below_detection') continue
      assert.equal(parameter.reportedValue, 'Nicht nachweisbar')
      assert.equal(parameter.calibrationStatus, 'BelowDetection')
    }
  }
})

test('394091 Meerwasser xxl matches the printed report', () => {
  const rows = byKey(REPORT_394091_ROWS)
  assert.deepEqual(REPORT_394091_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['calcium', 'strontium', 'molybdenum', 'iron', 'nitrate', 'phosphorus', 'phosphate'])

  assert.deepEqual([rows.salinity.measured, rows.salinity.ideal], [33.79, 35])
  assert.deepEqual([rows.calcium.measured, rows.calcium.ideal], [534.03, 402.45])
  assert.deepEqual([rows.molybdenum.measured, rows.molybdenum.ideal], [106.63, 11.47])
  assert.deepEqual([rows.strontium.measured, rows.strontium.ideal], [10.17, 7.74])
  assert.deepEqual([rows.phosphorus.measured, rows.phosphorus.ideal], [337, 14.34])
  assert.deepEqual([rows.phosphate.measured, rows.phosphate.ideal], [1.03, 0.04])
  assert.deepEqual([rows.nitrate.measured, rows.nitrate.ideal], [39.66, 2])
  assert.deepEqual([rows.manganese.measured, rows.manganese.ideal], [2.87, 0.96], 'manganese was detected here')
  assert.deepEqual([rows.cobalt.measured, rows.cobalt.ideal], [0.66, 0.1])
  assert.equal(rows.iron.measured, null)
  assert.equal(REPORT_394091_ROWS.filter((row) => row.measured === null).length, 17)

  const analysis = createReport394091()
  assert.equal(analysis.score, 88)
  assert.equal(analysis.barcode, 'WN8T-E57B-LUBJ-L8WV')
  assert.deepEqual(analysis.groupScores, { basis: 100, quantity: 88, trace: 88, pollutants: 100 })
  const osmosis = Object.fromEntries(analysis.osmosisParameters.map((item) => [item.key, item.reportedValue]))
  assert.equal(osmosis.manganese, 1.01)
  assert.equal(osmosis.zinc, 2.25)
  assert.equal(osmosis.silicon, 'Nicht nachweisbar')
})

test('394456 Meerwasser55 matches the printed report', () => {
  const rows = byKey(REPORT_394456_ROWS)
  assert.deepEqual(REPORT_394456_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['salinity', 'kh', 'sulfur', 'iodine', 'manganese', 'iron', 'zinc'])

  assert.deepEqual([rows.salinity.measured, rows.salinity.ideal], [32.9, 35])
  assert.deepEqual([rows.kh.measured, rows.kh.ideal], [5.27, 7.5])
  assert.equal(rows.kh.tone, 'critical', 'the carbonate hardness was critically low')
  assert.deepEqual([rows.sulfur.measured, rows.sulfur.ideal], [925.65, 842.01])
  assert.deepEqual([rows.iodine.measured, rows.iodine.ideal], [29.67, 60.14])
  assert.deepEqual([rows.phosphate.measured, rows.phosphate.ideal], [0.04, 0.04], 'phosphate sat exactly on its ideal')
  assert.equal(rows.zinc.tone, 'critical')
  assert.equal(REPORT_394456_ROWS.filter((row) => row.measured === null).length, 19)

  const analysis = createReport394456()
  assert.equal(analysis.score, 58)
  assert.deepEqual(analysis.groupScores, { basis: 58, quantity: 98, trace: 86, pollutants: 100 })
  assert.ok(analysis.osmosisParameters.every((item) => item.reportedValue === 'Nicht nachweisbar'))
  assert.deepEqual(analysis.sourceDosing.icpElements.map((item) => item.key), ['iodine', 'zinc', 'manganese', 'iron', 'kh'])
})

test('394515 Wolfis Aquarium 500 matches the printed report', () => {
  const rows = byKey(REPORT_394515_ROWS)
  assert.deepEqual(REPORT_394515_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['calcium', 'iodine', 'manganese', 'vanadium', 'nitrate', 'phosphorus', 'phosphate'])

  assert.deepEqual([rows.calcium.measured, rows.calcium.ideal], [366.2, 408.76])
  assert.deepEqual([rows.vanadium.measured, rows.vanadium.ideal], [8.49, 1.46])
  assert.deepEqual([rows.lithium.measured, rows.lithium.ideal], [305.86, 165.06])
  assert.deepEqual([rows.selenium.measured, rows.selenium.ideal], [2.07, 0.49], 'selenium was detected here')
  assert.deepEqual([rows.nitrate.measured, rows.nitrate.ideal], [0.02, 2])
  assert.equal(rows.cobalt.measured, null, 'cobalt was not detectable in this sample')
  assert.equal(REPORT_394515_ROWS.filter((row) => row.measured === null).length, 16)

  const analysis = createReport394515()
  assert.equal(analysis.score, 91)
  assert.deepEqual(analysis.groupScores, { basis: 100, quantity: 98, trace: 91, pollutants: 100 })
  const osmosis = Object.fromEntries(analysis.osmosisParameters.map((item) => [item.key, item.reportedValue]))
  assert.equal(osmosis.silicon, 1572)
  assert.equal(osmosis.zinc, 3.56)
})

test("392933 Mia's Reef matches the printed report", () => {
  const rows = byKey(REPORT_392933_ROWS)
  assert.deepEqual(REPORT_392933_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['salinity', 'kh', 'chloride', 'sodium', 'magnesium', 'calcium', 'strontium', 'fluoride',
      'lithium', 'iodine', 'manganese', 'iron', 'phosphorus', 'phosphate'])

  assert.deepEqual([rows.salinity.measured, rows.salinity.ideal], [29.91, 35])
  assert.equal(rows.salinity.tone, 'critical', 'the salinity was critically low')
  assert.deepEqual([rows.magnesium.measured, rows.magnesium.ideal], [1561.68, 1074.15])
  assert.deepEqual([rows.calcium.measured, rows.calcium.ideal], [419.64, 343.89])
  assert.deepEqual([rows.strontium.measured, rows.strontium.ideal], [11.27, 6.62])
  assert.deepEqual([rows.magnesium.tone, rows.calcium.tone, rows.strontium.tone], ['critical', 'critical', 'critical'])
  assert.deepEqual([rows.lithium.measured, rows.lithium.ideal], [458.07, 138.86])
  assert.deepEqual([rows.barium.measured, rows.barium.ideal], [40.71, 8.17])
  assert.equal(rows.barium.tone, 'good', 'barium ran high but the report still rated it normal')
  assert.deepEqual([rows.zinc.measured, rows.zinc.ideal], [1.63, 1.63], 'zinc sat exactly on its ideal')
  assert.equal(rows.iodine.measured, null)
  assert.equal(rows.iodine.tone, 'critical', 'undetectable iodine was rated critically low')
  assert.deepEqual([rows.manganese.tone, rows.iron.tone], ['watch', 'watch'], 'both were undetectable and below normal')
  assert.equal(REPORT_392933_ROWS.filter((row) => row.measured === null).length, 17)

  const analysis = createReport392933()
  assert.equal(analysis.score, 25)
  assert.equal(analysis.barcode, 'HE7H-MG77-8BJK-XVEW')
  assert.deepEqual(analysis.groupScores, { basis: 25, quantity: 63, trace: 86, pollutants: 100 })
  assert.ok(analysis.osmosisParameters.every((item) => item.reportedValue === 'Nicht nachweisbar'))
  assert.deepEqual(analysis.sourceDosing.icpElements.map((item) => [item.key, item.totalMl, item.portions.length]),
    [['iodine', 11.04, 3], ['manganese', 0.42, 1], ['iron', 0.21, 1], ['fluoride', 48.04, 2]])
  const iron = analysis.sourceDosing.supplements.find((item) => item.key === 'iron')
  assert.deepEqual(iron.portions, [0.08, 0.08, 0.08, 0.08, 0.08], 'the supplement iron dose runs over five days')
})

test('393984 Red Sea Nano Test Flawil matches the printed report', () => {
  const rows = byKey(REPORT_393984_ROWS)
  assert.deepEqual(REPORT_393984_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['sulfur', 'calcium', 'fluoride', 'iodine', 'barium', 'manganese', 'vanadium', 'zinc',
      'nitrate', 'phosphorus', 'phosphate'])

  assert.deepEqual([rows.calcium.measured, rows.calcium.ideal], [500.33, 413.08])
  assert.deepEqual([rows.sulfur.measured, rows.sulfur.ideal], [761.99, 892.87])
  assert.deepEqual([rows.barium.measured, rows.barium.ideal], [1.43, 9.81])
  assert.equal(rows.barium.tone, 'critical', 'barium was critically low here')
  assert.deepEqual([rows.vanadium.measured, rows.vanadium.ideal], [59.45, 1.47])
  assert.deepEqual([rows.nitrate.measured, rows.nitrate.ideal], [62.52, 2])
  assert.deepEqual([rows.phosphorus.measured, rows.phosphorus.ideal], [126.35, 14.72])
  assert.deepEqual([rows.phosphate.measured, rows.phosphate.ideal], [0.39, 0.04])
  assert.deepEqual([rows.silicon.measured, rows.silicon.ideal], [96.81, 98.12], 'the tank silicon was normal')
  assert.equal(rows.manganese.measured, null)
  assert.equal(rows.manganese.tone, 'watch')
  assert.equal(REPORT_393984_ROWS.filter((row) => row.measured === null).length, 15)

  const analysis = createReport393984()
  assert.equal(analysis.score, 76)
  assert.equal(analysis.barcode, 'WPJC-N7ME-REDF-SFGR')
  assert.deepEqual(analysis.groupScores, { basis: 100, quantity: 85, trace: 76, pollutants: 100 })
  const osmosis = Object.fromEntries(analysis.osmosisParameters.map((item) => [item.key, item.reportedValue]))
  assert.equal(osmosis.silicon, 136.4, 'the osmosis sample carried critically high silicon')
  assert.equal(Object.values(osmosis).filter((value) => value !== 'Nicht nachweisbar').length, 1)
  const sulfur = analysis.sourceDosing.icpElements.find((item) => item.key === 'sulfur')
  assert.deepEqual([sulfur.totalMl, sulfur.portions, sulfur.unit], [43.49, [21.74, 21.74], 'g'],
    'the laboratory doses sulphur by weight')
})

test('394949 NanoRiff matches the printed report', () => {
  const rows = byKey(REPORT_394949_ROWS)
  assert.deepEqual(REPORT_394949_ROWS.filter((row) => row.tone !== 'good').map((row) => row.key),
    ['salinity', 'kh', 'boron', 'fluoride', 'silicon', 'iodine', 'barium', 'manganese', 'iron',
      'phosphorus', 'phosphate'])

  assert.deepEqual([rows.salinity.measured, rows.salinity.ideal], [36.93, 35])
  assert.equal(rows.salinity.direction, 'high', 'this sample is the first one running too salty')
  assert.deepEqual([rows.kh.measured, rows.kh.ideal], [14.69, 7.5])
  assert.equal(rows.kh.tone, 'critical')
  assert.deepEqual([rows.silicon.measured, rows.silicon.ideal], [366.28, 105.47])
  assert.deepEqual([rows.barium.measured, rows.barium.ideal], [98.19, 10.55])
  assert.deepEqual([rows.phosphorus.measured, rows.phosphorus.ideal], [78.93, 15.82])
  assert.deepEqual([rows.nitrate.measured, rows.nitrate.tone], [6.43, 'good'])
  assert.equal(REPORT_394949_ROWS.filter((row) => row.measured === null).length, 18)

  const analysis = createReport394949()
  assert.equal(analysis.score, 58)
  assert.equal(analysis.barcode, 'QGSE-C8S8-CRLF-3RFM')
  assert.equal(analysis.reason, 'cyanos')
  assert.deepEqual(analysis.groupScores, { basis: 58, quantity: 95, trace: 84, pollutants: 100 })

  const osmosis = Object.fromEntries(analysis.osmosisParameters.map((item) => [item.key, item.reportedValue]))
  assert.deepEqual([osmosis.silicon, osmosis.copper, osmosis.zinc], [97.03, 1.05, 8.18])
  assert.equal(analysis.osmosisParameters.filter((item) => item.tone === 'critical').length, 3)

  assert.deepEqual(analysis.sourceDosing.icpElements.map((item) => [item.key, item.totalMl, item.portions.length]),
    [['boron', 808.06, 3], ['iodine', 16.33, 3], ['manganese', 0.99, 1], ['iron', 0.49, 1], ['fluoride', 66.95, 2]])
  const iron = analysis.sourceDosing.supplements.find((item) => item.key === 'iron')
  assert.deepEqual(iron.portions, [0.16, 0.16, 0.16, 0.16, 0.16, 0.16], 'the supplement iron dose runs over six days')
})

test('an osmosis sample can only read normal or too high, never low', () => {
  for (const build of [createReport394949, createReport392933, createReport393984]) {
    for (const row of build().osmosisParameters) {
      assert.notEqual(row.sourceDirection, 'low', `${row.key} must not be rated low in osmosis water`)
      assert.ok(['in_range', 'high'].includes(row.sourceDirection))
      assert.ok(['good', 'critical'].includes(row.tone))
    }
  }
})

test('the element grouping follows the printed ATI report', () => {
  const groups = {}
  for (const definition of Object.values(ELEMENT_DEFINITION_MAP)) (groups[definition.groupKey] ||= []).push(definition.symbol)
  const sorted = (list) => list.slice().sort()
  assert.deepEqual(sorted(groups.basis), sorted(['PSU', 'KH']))
  assert.deepEqual(sorted(groups.quantity), sorted(['Cl', 'Na', 'Mg', 'S', 'Ca', 'K', 'Br', 'Sr', 'B', 'F']), 'fluorine is a major element')
  assert.deepEqual(sorted(groups.nutrients), sorted(['NO₃', 'P', 'PO₄']), 'silicon is not a nutrient')
  assert.equal(groups.trace.length, 18)
  assert.equal(groups.pollutants.length, 10)
})
