import test from 'node:test'
import assert from 'node:assert/strict'
import { ATI_PRODUCT_CATALOG } from './atiProductCatalog.js'
import { ATI_DOSING_FORMULAS, defaultDosingEntry, normalizeDosingEntry } from './atiDosingDefaults.js'

test('every catalog product has enabled manufacturer defaults with a source and correct units', () => {
  assert.equal(Object.keys(ATI_DOSING_FORMULAS).length, 20)
  for (const key of Object.keys(ATI_PRODUCT_CATALOG)) {
    const entry = normalizeDosingEntry(undefined, key)
    assert.ok(entry.enabled && entry.verified)
    assert.equal(entry.sourceUrl, ATI_PRODUCT_CATALOG[key].url)
    assert.equal(entry.verificationSource, 'manufacturer')
    assert.ok(entry.mlPer100Liters > 0 && entry.raisesBy > 0 && entry.maxDailyIncrease > 0)
    assert.ok(['mg/l', 'µg/l', 'dKH'].includes(entry.unit))
  }
})
test('old empty settings receive defaults without resetting custom formulas or explicit new disables', () => {
  const legacy = { enabled: false, verified: false, productOverride: false, productName: ATI_PRODUCT_CATALOG.calcium.name, mlPer100Liters: 0, raisesBy: 0, maxDailyIncrease: 0 }
  assert.equal(normalizeDosingEntry(legacy, 'calcium').raisesBy, 2)
  assert.equal(normalizeDosingEntry({ ...defaultDosingEntry('calcium'), enabled: false }, 'calcium').enabled, false)
  const custom = { enabled: true, verified: true, productName: 'Custom Calcium', productUrl: 'example.com/calcium', mlPer100Liters: 2, raisesBy: 3, maxDailyIncrease: 10 }
  const preserved = normalizeDosingEntry(custom, 'calcium')
  assert.equal(preserved.productName, 'Custom Calcium')
  assert.equal(preserved.raisesBy, 3)
  assert.equal(preserved.productUrl, 'https://example.com/calcium')
  assert.equal(preserved.verificationSource, 'lab')
})
test('unmatched nutrients receive no invented formula or product', () => {
  for (const key of ['nitrate', 'phosphate', 'silicon']) {
    const entry = defaultDosingEntry(key)
    assert.equal(entry.enabled, false)
    assert.equal(entry.raisesBy, 0)
    assert.equal(entry.productUrl, '')
  }
})
test('editing manufacturer strengths removes the manufacturer attribution', () => {
  const result = normalizeDosingEntry({ ...defaultDosingEntry('calcium'), raisesBy: 20 }, 'calcium')
  assert.equal(result.verificationSource, 'lab')
  assert.equal(result.sourceUrl, '')
})
