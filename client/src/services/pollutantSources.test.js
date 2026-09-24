import test from 'node:test'
import assert from 'node:assert/strict'
import { ELEMENT_DEFINITION_MAP } from './analysisCatalog.js'
import { POLLUTANT_SOURCES, sourcesForElements, suspectElements } from './pollutantSources.js'

test('every source points at elements that exist in the catalogue', () => {
  for (const source of POLLUTANT_SOURCES) {
    assert.ok(source.elements.length, `${source.key} lists no elements`)
    for (const key of source.elements) assert.ok(ELEMENT_DEFINITION_MAP[key], `${source.key} references unknown element ${key}`)
  }
})

test('filtering returns only matching sources, most relevant first', () => {
  const sources = sourcesForElements(['lanthanum', 'aluminium'])
  assert.equal(sources[0].key, 'phosphate-adsorber', 'the adsorber matches both elements')
  assert.ok(sources.every((source) => source.matches.length))
  assert.ok(sources.every((source) => source.matches.every((key) => ['lanthanum', 'aluminium'].includes(key))))
  assert.ok(!sources.some((source) => source.key === 'food'), 'unrelated sources stay hidden')
})

test('an empty or clean report suggests nothing', () => {
  assert.deepEqual(sourcesForElements([]), [])
  assert.deepEqual(suspectElements([]), [])
  assert.deepEqual(suspectElements([{ key: 'lead', groupKey: 'pollutants', evaluation: { score: 5 } }]), [])
})

test('only elevated trace and pollutant readings become suspects', () => {
  const parameters = [
    { key: 'lead', groupKey: 'pollutants', evaluation: { score: 8 } },
    { key: 'zinc', groupKey: 'trace', evaluation: { score: 6 } },
    { key: 'iron', groupKey: 'trace', evaluation: { score: 2 } },
    { key: 'calcium', groupKey: 'quantity', evaluation: { score: 9 } },
  ]
  assert.deepEqual(suspectElements(parameters), ['lead', 'zinc'])
})
