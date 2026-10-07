import test from 'node:test'
import assert from 'node:assert/strict'
import { ATI_ESSENTIALS_LINES, essentialsFor, essentialsRecommendation, packReachMonths } from './atiProductCatalog.js'

test('SPS is the default line and only a mixed tank switches away from it', () => {
  assert.equal(essentialsFor('SPS').key, 'sps')
  assert.equal(essentialsFor('SPS-dominiert').key, 'sps')
  assert.equal(essentialsFor('').key, 'sps', 'without a type SPS leads')
  assert.equal(essentialsFor('LPS').key, 'mixed')
  assert.equal(essentialsFor('Mischbecken').key, 'mixed')
  assert.equal(essentialsFor('Weichkorallen').key, 'mixed')
})

test('the pack size follows how long it lasts in that tank', () => {
  // 2,7 l reichen im Nano Jahre, im Großbecken keine zwei Monate.
  assert.equal(essentialsRecommendation('Mischbecken', 75).primary.bottleMl, 2700)
  assert.equal(essentialsRecommendation('Mischbecken', 375).primary.bottleMl, 2700)
  assert.equal(essentialsRecommendation('Mischbecken', 575).primary.bottleMl, 10000)
  assert.equal(essentialsRecommendation('Mischbecken', 1400).primary.bottleMl, 10000)
  // Die SPS-Linie wird höher dosiert, also kippt die Größe früher.
  assert.equal(essentialsRecommendation('SPS', 375).primary.bottleMl, 10000)
  assert.equal(essentialsRecommendation('SPS', 208).primary.bottleMl, 2700)
})

test('every alternative stays reachable and points at the same line', () => {
  const { line, primary, alternatives } = essentialsRecommendation('SPS', 500)
  assert.equal(line.key, 'sps')
  assert.equal(alternatives.length, 3, 'the other set plus both single bottles')
  assert.ok(!alternatives.includes(primary))
  for (const entry of [primary, ...alternatives]) {
    assert.match(entry.url, /^https:\/\/shop\.atiaquaristik\.com\//)
    assert.ok(entry.image, `${entry.name} has no picture`)
    assert.match(entry.name, /SPS/)
  }
})

test('the reach is derived from the published dosage range', () => {
  // Mixed Reef: 3–7 ml je 100 l und Tag. Bei 375 l sind das 11,25–26,25 ml.
  const reach = packReachMonths(2700, 375, ATI_ESSENTIALS_LINES.mixed.dailyMlPer100Liters)
  assert.equal(Math.round(reach.fast), 3)
  assert.equal(Math.round(reach.slow), 8)
  assert.equal(packReachMonths(2700, 0, [3, 7]), null, 'without a volume nothing is claimed')
})
