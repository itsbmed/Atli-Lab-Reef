import test from 'node:test'
import assert from 'node:assert/strict'
import { asksForBottles, asksForLine, describeSupply, supplyParts } from './supplySystem.js'

test('the supply system maps to the parts the V2.2 evaluation counts', () => {
  assert.equal(supplyParts({ supply_mode: 'none' }), 0)
  assert.equal(supplyParts({ supply_mode: 'ati' }), 2)
  assert.equal(supplyParts({ supply_mode: 'nyos' }), 2, 'NYOS ION-B is a two-part system')
  assert.equal(supplyParts({ supply_mode: 'other', supply_bottles: 3 }), 3)
  assert.equal(supplyParts({ supply_mode: 'other' }), null, 'another product without a bottle count is unknown')
  assert.equal(supplyParts({}), null)
})

test('only other products ask for bottles; ATI and NYOS ask for their line', () => {
  assert.deepEqual(['none', 'ati', 'nyos', 'other'].map(asksForBottles), [false, false, false, true])
  assert.deepEqual(['none', 'ati', 'nyos', 'other'].map(asksForLine), [false, true, true, false])
})

test('the readable supply text names NYOS and the bottles', () => {
  assert.equal(describeSupply({ supply_mode: 'nyos', supply_line: 'ION-B liquid' }), 'NYOS ION-B liquid')
  assert.equal(describeSupply({ supply_mode: 'nyos' }), 'NYOS ION-B')
  assert.equal(describeSupply({ supply_mode: 'other', supply_bottles: 3, supply_product: 'Balling Light' }), 'Balling Light · 3 Flaschen (Balling-Methode)')
  assert.equal(describeSupply({ supply_mode: 'ati', supply_line: 'Essentials SPS' }), 'ATI Essentials SPS')
})

test('NYOS recommends both ION-B parts of the chosen form, trace elements on request', async () => {
  const { nyosRecommendation, NYOS_ION_ELEMENTS } = await import('./nyosProductCatalog.js')
  const powder = nyosRecommendation('ION-B powder mix')
  assert.deepEqual(powder.products.map((item) => item.name), ['ION-B CA/MG+ powder mix', 'ION-B ALK/PH+ powder mix'])
  assert.ok(powder.alternatives.some((item) => item.name === 'ION-B CA/MG+ liquid'))
  assert.equal(powder.alternatives.at(-1).url, 'https://www.nyos.info/de/haendler')
  assert.equal(nyosRecommendation('').line.key, 'ION-B liquid', 'without a choice the ready-to-use form is shown')
  assert.equal(nyosRecommendation('ION-B liquid', { trace: true }).products.length, 2 + NYOS_ION_ELEMENTS.length)
  for (const item of [...powder.products, ...NYOS_ION_ELEMENTS]) assert.match(item.url, /^https:\/\/www\.nyos\.info\/de\/ionb\//)
})
