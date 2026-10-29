import assert from 'node:assert/strict'
import test from 'node:test'
import { SEARCH_FUNCTIONS, foldText, quickFunctions, searchFunctions } from './searchCatalog.js'

const keys = (query, options) => searchFunctions(query, options).map((item) => item.key)

test('everyday words find the right function', () => {
  assert.equal(keys('wasserwechsel')[0], 'tool-waterchange')
  assert.equal(keys('passwort')[0], 'password')
  assert.equal(keys('pdf')[0], 'pdf')
  assert.equal(keys('testkit')[0], 'activate')
  assert.ok(keys('dosierung').includes('dosing'))
  assert.ok(keys('verlauf').includes('chronik'))
})

test('umlauts and ß may be typed without them', () => {
  assert.equal(foldText('Übersicht Maßnahmen'), 'ubersicht massnahmen')
  assert.equal(keys('ubersicht')[0], 'dashboard')
  assert.equal(keys('mogliche quellen')[0], 'tool-sources')
})

test('every word has to match, a title start ranks first', () => {
  assert.deepEqual(keys('analyse registrieren'), ['activate'])
  assert.equal(keys('ana')[0], 'analyses')
  assert.deepEqual(keys('xyz'), [])
  assert.deepEqual(keys('   '), [])
})

test('settings are only offered to admins and sub-admins', () => {
  assert.ok(!keys('einstellungen').includes('settings'))
  assert.ok(keys('einstellungen', { role: 'admin' }).includes('settings'))
  assert.ok(keys('benutzer', { role: 'subadmin' }).includes('settings'))
})

test('quick links work for every role and every entry has a target', () => {
  assert.equal(quickFunctions().length, 4)
  for (const item of SEARCH_FUNCTIONS) assert.match(item.to, /^\//, item.key)
  assert.equal(new Set(SEARCH_FUNCTIONS.map((item) => item.key)).size, SEARCH_FUNCTIONS.length)
})
