import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPrintJob, savePrintJob } from './pdfExport.js'
import { PDF_NOTE_LIMIT, availableSections, defaultSettings, estimatePages, loadPdfSettings, matchPreset, presetSettings, savePdfSettings, sectionSelectable, valueRowCount } from './pdfExport.js'

const context = {
  groups: [
    { key: 'base', label: 'Basiswerte', total: 2, issueCount: 2 },
    { key: 'major', label: 'Mengenelemente', total: 10, issueCount: 2 },
    { key: 'trace', label: 'Spurenelemente', total: 18, issueCount: 5 },
  ],
  osmosisCount: 29,
  osmosisFound: 3,
  charts: { composition: true, ratios: true, growth: true },
  recommendationCount: 4,
  openRecommendationCount: 2,
  dosingCount: 5,
  productCount: 5,
}
const memoryStorage = () => {
  const data = new Map()
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) }
}

test('the full report includes every section the report has', () => {
  const settings = defaultSettings(context)
  assert.ok(Object.values(settings.sections).every(Boolean))
  assert.deepEqual(settings.values.groups, ['base', 'major', 'trace'])
  assert.equal(matchPreset(settings, context), 'full')
})

test('sections without content cannot be chosen', () => {
  const lean = { ...context, osmosisCount: 0, dosingCount: 0, productCount: 0, charts: { composition: false, ratios: false, growth: false } }
  const available = availableSections(lean)
  assert.deepEqual([available.osmosis, available.dosing, available.charts], [false, false, false])
  const settings = defaultSettings(lean)
  assert.deepEqual([settings.sections.osmosis, settings.sections.dosing, settings.sections.charts, settings.sections.products], [false, false, false, false])
})

test('the short report keeps only what needs doing', () => {
  const settings = presetSettings('short', context)
  assert.equal(settings.values.scope, 'issues')
  assert.equal(settings.osmosis.scope, 'found')
  assert.equal(settings.sections.charts, false)
  assert.equal(matchPreset(settings, context), 'short')
  assert.equal(valueRowCount(settings, context), 9)
})

test('the dosing preset prints landscape and keeps the customer’s note and format', () => {
  const current = { ...defaultSettings(context), note: 'Für Freitag', format: { orientation: 'portrait', color: 'eco', barcode: false, aquarium: true } }
  const settings = presetSettings('dosing', context, current)
  assert.equal(settings.format.orientation, 'landscape')
  assert.equal(settings.format.color, 'eco')
  assert.equal(settings.note, 'Für Freitag')
  assert.deepEqual(Object.keys(settings.sections).filter((key) => settings.sections[key]), ['cover', 'dosing'], 'no products without the recommendations')
})

test('any change away from a preset counts as an own selection', () => {
  const settings = defaultSettings(context)
  settings.values.groups = ['trace']
  assert.equal(matchPreset(settings, context), 'custom')
  settings.values.groups = ['base', 'major', 'trace']
  settings.format.orientation = 'landscape'
  assert.equal(matchPreset(settings, context), 'full', 'paper orientation alone is not a different preset')
})

test('the page estimate follows the selection', () => {
  const full = estimatePages(defaultSettings(context), context)
  assert.deepEqual(full.map((page) => page.section), ['cover', 'values', 'osmosis', 'charts', 'charts', 'recommendations', 'recommendations', 'dosing', 'products'])
  const many = { ...context, groups: [{ key: 'all', label: 'Alle', total: 60, issueCount: 0 }] }
  assert.equal(estimatePages(defaultSettings(many), many).filter((page) => page.section === 'values').length, 2, 'the two-column table holds 48 values per page')
  const short = estimatePages(presetSettings('short', context), context)
  assert.equal(short.length, 5)
  assert.equal(short[1].title, 'Messwerte')
  const withNote = { ...defaultSettings(context), note: 'Hallo' }
  assert.equal(estimatePages(withNote, context)[0].note, true)
})

test('saved settings come back per account and are fitted to the next report', () => {
  const storage = memoryStorage()
  const settings = presetSettings('short', context)
  settings.values.groups = ['trace', 'gone']
  settings.note = 'x'.repeat(400)
  savePdfSettings(storage, 'u1', settings)
  const restored = loadPdfSettings(storage, 'u1', { ...context, dosingCount: 0 })
  assert.deepEqual(restored.values.groups, ['trace'])
  assert.equal(restored.sections.dosing, false)
  assert.equal(restored.note.length, PDF_NOTE_LIMIT)
  assert.equal(loadPdfSettings(storage, 'u2', context), null)
})

test('products come from the recommendations and need them', () => {
  const settings = defaultSettings(context)
  assert.equal(sectionSelectable('products', settings, context), true)
  settings.sections.recommendations = false
  assert.equal(sectionSelectable('products', settings, context), false)
  assert.equal(loadPdfSettings({ getItem: () => JSON.stringify(settings) }, 'u1', context).sections.products, false, 'a saved selection is fitted too')
})

test('values and osmosis always print as the table; an old style choice is dropped', () => {
  const storage = memoryStorage()
  savePdfSettings(storage, 'u1', { ...defaultSettings(context), values: { scope: 'all', groups: ['base', 'major', 'trace'], style: 'scale' } })
  const restored = loadPdfSettings(storage, 'u1', context)
  assert.equal('style' in restored.values, false)
  assert.equal(matchPreset(restored, context), 'full')
})

test('print: the job is kept per report in the browser', () => {
  const storage = memoryStorage()
  assert.equal(loadPrintJob(storage, 'r1'), null)
  assert.ok(savePrintJob(storage, 'r1', { sections: { cover: true } }))
  assert.deepEqual(loadPrintJob(storage, 'r1').settings, { sections: { cover: true } })
})
