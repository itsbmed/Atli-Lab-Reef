import test from 'node:test'
import assert from 'node:assert/strict'
// node exposes a localStorage object without working methods, so back it with a map
const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
}

import { ELEMENT_DEFINITIONS } from './analysisCatalog.js'
import { DEFAULT_PARAMETER_CONTENT, loadAnalysisContent, saveAnalysisContent } from './analysisContent.js'

test('every element uses the analytical knowledge and structured advice model', () => {
  for (const definition of ELEMENT_DEFINITIONS) {
    const content = DEFAULT_PARAMETER_CONTENT[definition.key]
    assert.ok(content, `${definition.key} has content`)
    assert.ok(content.analytics.length >= 1, `${definition.key} has an analytical method`)
    assert.ok(content.analytics.some((row) => row.method), `${definition.key} names its method`)
    assert.ok(content.advice.low.causes.length >= 1, `${definition.key} has low causes`)
    assert.ok(content.advice.high.causes.length >= 1, `${definition.key} has high causes`)
    assert.ok(content.advice.low.corrections.length >= 1, `${definition.key} has low corrections`)
    assert.ok(content.advice.high.corrections.length >= 1, `${definition.key} has high corrections`)
  }
})

test('Cobalt keeps the client supplied analytical limits and full guidance', () => {
  const cobalt = DEFAULT_PARAMETER_CONTENT.cobalt
  assert.deepEqual(cobalt.analytics.map((row) => row.method), ['ICP-OES', 'ICP-MS'])
  assert.equal(cobalt.targetMin, 0.1)
  assert.equal(cobalt.targetMax, 0.25)
  assert.equal(cobalt.attentionThreshold, 0.6)
  assert.ok(cobalt.advice.low.effects.length)
  assert.ok(cobalt.advice.high.effects.length)
})

test('an empty attention threshold survives a save without becoming zero', () => {
  const content = loadAnalysisContent()
  assert.equal(content.calcium.attentionThreshold, '', 'no threshold is configured for calcium')

  saveAnalysisContent(content)
  const reloaded = loadAnalysisContent()

  assert.equal(reloaded.calcium.attentionThreshold, '', 'saving must not invent a threshold of zero')
  assert.equal(reloaded.cobalt.attentionThreshold, 0.6, 'a configured threshold is kept')
})
