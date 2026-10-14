import test from 'node:test'
import assert from 'node:assert/strict'
import { clearDraft, loadDraft, parseDimensions, profileScore, quickFields, saveDraft, volumeFromDimensions } from './aquariumWizard.js'

const memory = () => {
  const data = new Map()
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) }
}
const seawater = (extra = {}) => ({ name: '', net_volume: null, water_type: 'Meerwasser', supply_mode: '', water_details: {}, image: null, ...extra })

test('quick fields are the high-value questions that exist for the water type', () => {
  assert.deepEqual(quickFields('Meerwasser').map((field) => field.key), ['aquarium_type', 'lighting_type', 'stocking_density', 'skimmer', 'sump', 'refugium'])
  assert.ok(quickFields('Osmosewasser').some((field) => field.key === 'resin_filter'))
  assert.deepEqual(quickFields('Unbekannt'), [])
})

test('the volume calculator gives gross litres and a rounded net estimate', () => {
  assert.deepEqual(volumeFromDimensions(120, 50, 50), { gross: 300, net: 255 })
  assert.deepEqual(volumeFromDimensions(60, 30, 36), { gross: 65, net: 55 })
  assert.equal(volumeFromDimensions(120, 0, 50), null)
  assert.deepEqual(parseDimensions('120×50×50 cm'), [120, 50, 50])
  assert.deepEqual(parseDimensions('80 x 40,5 x 45'), [80, 40.5, 45])
  assert.equal(parseDimensions('120 cm'), null)
})

test('the profile grows from a skeleton to a top profile and names the next step', () => {
  const empty = profileScore(seawater())
  assert.equal(empty.percent, 0)
  assert.equal(empty.level, 'Grundgerüst')
  assert.equal(empty.next, 'Grunddaten vervollständigen')

  const basics = profileScore(seawater({ name: 'Riff', net_volume: 300, supply_mode: 'ati' }))
  assert.equal(basics.percent, 30)
  assert.equal(basics.next, 'Aquarium', 'the first quick question comes next')

  const full = profileScore(seawater({
    name: 'Riff', net_volume: 300, supply_mode: 'ati', aquarium_type: 'SPS', lighting_type: 'LED', stocking_density: 'Mittel', skimmer: true, sump: true, refugium: true,
    image: 'data:image/png;base64,x', osmosis_source_id: 'ro',
    water_details: { livestock: 'Acropora', running_since: '2024', decoration_type: 'Totgestein', flow_pump_count: 2, flow_total_lh: 12000 },
  }), { osmosisSupported: true })
  assert.equal(full.percent, 100)
  assert.equal(full.level, 'Top-Profil')
  assert.equal(full.next, '')
})

test('a draft survives a reload and is cleared after creating the aquarium', () => {
  const storage = memory()
  assert.equal(saveDraft(storage, 'u1', seawater(), 0), false, 'an untouched form is not a draft')
  assert.equal(saveDraft(storage, 'u1', seawater({ name: 'Nano' }), 1), true)
  assert.equal(loadDraft(storage, 'u1').form.name, 'Nano')
  assert.equal(loadDraft(storage, 'u1').step, 1)
  assert.equal(loadDraft(storage, 'u2'), null, 'drafts belong to one account')
  clearDraft(storage, 'u1')
  assert.equal(loadDraft(storage, 'u1'), null)
})

test('a draft too large for the storage is kept without its photo', () => {
  const storage = memory()
  const strict = { ...storage, setItem: (key, value) => { if (value.length > 400) throw new Error('quota'); storage.setItem(key, value) } }
  assert.equal(saveDraft(strict, 'u1', seawater({ name: 'Riff', image: `data:${'x'.repeat(1000)}` }), 2), true)
  assert.equal(loadDraft(storage, 'u1').form.image, null)
})
