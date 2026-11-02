import test from 'node:test'
import assert from 'node:assert/strict'
import { arrangeColumns, hideKey, moveKey } from './arrangement.js'

const defaults = [['basis', 'quantity', 'nutrients'], ['trace', 'pollutants']]

test('without a saved arrangement the default columns apply', () => {
  assert.deepEqual(arrangeColumns(['basis', 'nutrients', 'trace'], null, defaults), {
    columns: [['basis', 'nutrients'], ['trace']],
    hidden: [],
  })
})

test('a saved arrangement wins, unknown keys drop out and new ones go to their default column', () => {
  const saved = { columns: [['trace', 'gone'], ['basis']], hidden: ['pollutants'] }
  assert.deepEqual(arrangeColumns(['basis', 'quantity', 'trace', 'pollutants'], saved, defaults), {
    columns: [['trace', 'quantity'], ['basis']],
    hidden: ['pollutants'],
  })
})

test('moving places a key before another one or at the end, and brings hidden keys back', () => {
  const start = { columns: [['basis', 'quantity'], ['trace']], hidden: ['pollutants'] }
  assert.deepEqual(moveKey(start, 'trace', 0, 'quantity').columns, [['basis', 'trace', 'quantity'], []])
  assert.deepEqual(moveKey(start, 'basis', 1).columns, [['quantity'], ['trace', 'basis']])
  assert.deepEqual(moveKey(start, 'pollutants', 1, 'trace'), { columns: [['basis', 'quantity'], ['pollutants', 'trace']], hidden: [] })
})

test('hiding takes a key out of its column', () => {
  assert.deepEqual(hideKey({ columns: [['basis'], ['trace']], hidden: [] }, 'trace'), { columns: [['basis'], []], hidden: ['trace'] })
})
