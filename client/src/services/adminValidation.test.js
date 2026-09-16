import assert from 'node:assert/strict'
import test from 'node:test'
import { dosingEntryErrors, elementEntryError, linkError } from './adminValidation.js'

test('a product can be saved without activating or completing a dosing formula', () => {
  assert.deepEqual(dosingEntryErrors({ productOverride: true, productName: 'ATI Calcium', productUrl: 'shop.atiaquaristik.com/calcium', enabled: false }), {})
  assert.ok(dosingEntryErrors({ productOverride: true, productName: '', enabled: false }).productName)
})

test('active formulas require positive finite amounts, effects, and daily limits', () => {
  const entry = { enabled: true, productName: 'ATI Calcium', mlPer100Liters: 10, raisesBy: 5, maxDailyIncrease: 2 }
  assert.deepEqual(dosingEntryErrors(entry), {})
  assert.ok(dosingEntryErrors({ ...entry, maxDailyIncrease: 0 }).maxDailyIncrease)
  assert.ok(dosingEntryErrors({ ...entry, raisesBy: Infinity }).raisesBy)
})

test('links support plain shop domains but reject unsupported schemes and malformed values', () => {
  for (const link of ['', 'shop.atiaquaristik.com', 'https://example.com/image.png']) assert.equal(linkError(link), '')
  for (const link of ['javascript:alert(1)', 'ftp://example.com', 'https://', 'not a link']) assert.ok(linkError(link))
})

test('element ranges must be complete and ordered', () => {
  assert.equal(elementEntryError({ unit: 'mg/l', targetMin: 400, targetMax: 450 }), '')
  assert.ok(elementEntryError({ unit: 'mg/l', targetMin: 450, targetMax: 400 }))
  assert.ok(elementEntryError({ unit: 'mg/l', targetMin: '', targetMax: 450 }))
})
