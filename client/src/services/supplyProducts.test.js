import assert from 'node:assert/strict'
import test from 'node:test'
import { supplyChannelProduct } from './supplyProducts.js'

test('ATI: the bottle of the Essentials line stands behind KH and Ca/Mg', () => {
  assert.equal(supplyChannelProduct('kh', { mode: 'ati', line: 'Essentials SPS' }).name, 'Essentials SPS #1 (KH)')
  assert.equal(supplyChannelProduct('calcium', { mode: 'ati', line: 'Essentials Mixed Reef' }).name, 'Essentials Mixed Reef #2 (Ca/Mg)')
  assert.match(supplyChannelProduct('kh', { mode: 'ati', line: 'Essentials SPS' }).url, /essentials-sps-1-kh/)
})

test('without a chosen system the line follows the tank type, as in the product suggestions', () => {
  assert.equal(supplyChannelProduct('kh', {}).name, 'Essentials SPS #1 (KH)')
  assert.equal(supplyChannelProduct('kh', { aquariumType: 'Mischbecken' }).name, 'Essentials Mixed Reef #1 (KH)')
  assert.equal(supplyChannelProduct('magnesium', {}), null, 'no single ICP element in the supply system')
  assert.equal(supplyChannelProduct('trace', {}), null, 'ATI has no trace bottle in the line')
})

test('NYOS: ION-B parts and ION ELEMENTS 2 for the trace elements', () => {
  assert.equal(supplyChannelProduct('kh', { mode: 'nyos', line: 'ION-B powder mix' }).name, 'ION-B ALK/PH+ powder mix')
  assert.equal(supplyChannelProduct('calcium', { mode: 'nyos' }).name, 'ION-B CA/MG+ liquid')
  assert.equal(supplyChannelProduct('trace', { mode: 'nyos' }).name, 'ION ELEMENTS 2 CA/MG')
})

test('a third-party system or no supply has no product of ours', () => {
  assert.equal(supplyChannelProduct('kh', { mode: 'other' }), null)
  assert.equal(supplyChannelProduct('kh', { mode: 'none' }), null)
})
