import assert from 'node:assert/strict'
import test from 'node:test'
import { balanceColumns } from './reportColumns.js'

test('columns: fixed left groups on screen, evenly filled columns for landscape print', () => {
  const groups = [['basis', 2], ['quantity', 10], ['trace', 18], ['nutrients', 3], ['pollutants', 10]].map(([key, size]) => ({ key, items: Array(size).fill({}) }))
  assert.deepEqual(balanceColumns(groups, ['basis', 'quantity', 'nutrients']).map((column) => column.map((group) => group.key)), [['basis', 'quantity', 'nutrients'], ['trace', 'pollutants']])
  assert.deepEqual(balanceColumns(groups, null, 3).map((column) => column.map((group) => group.key)), [['basis', 'nutrients', 'pollutants'], ['quantity'], ['trace']])
})
