import test from 'node:test'
import assert from 'node:assert/strict'
import { splitDose, calendarWeeks, weekStart } from './dosingCalendar.js'

test('split doses conserve total and never exceed the daily limit, including rounding boundaries', () => {
  for (const deficit of [1, 1.001, 2.999, 10.01]) {
    const dose = splitDose({ deficit, raisesBy: 1, mlPer100Liters: 0.333, maxDailyIncrease: 0.5, volume: 420 })
    assert.ok(dose.dailyAmounts.every(amount => amount <= dose.maxDailyMl))
    assert.ok(Math.abs(dose.dailyAmounts.reduce((a, b) => a + b, 0) - dose.totalMl) < 1e-9)
    assert.ok(dose.totalMl <= deficit * 0.333 * 4.2)
  }
})
test('missing daily limits and invalid quantities never produce a plan', () => {
  for (const maxDailyIncrease of [0, null, -1, Infinity]) assert.equal(splitDose({ deficit: 2, raisesBy: 1, mlPer100Liters: 10, maxDailyIncrease, volume: 100 }), null)
})
test('a 90 litre lithium limit stays exactly 0.9 ml without floating point artifacts', () => {
  const dose = splitDose({ deficit: 59.5, raisesBy: 15, mlPer100Liters: 1, maxDailyIncrease: 15, volume: 90 })
  assert.equal(dose.maxDailyMl, 0.9)
  assert.equal(dose.totalMl, 3.57)
})
test('calendar includes all course days beyond one week and crosses year boundaries', () => {
  const dose = splitDose({ deficit: 10, raisesBy: 1, mlPer100Liters: 10, maxDailyIncrease: 1, volume: 100 })
  const weeks = calendarWeeks([{ key: 'calcium', label: 'Calcium', dose: { ...dose, productName: 'Calcium' } }], '2026-12-28')
  assert.equal(weeks.length, 2)
  assert.equal(weeks[1][2].date, '2027-01-06')
  assert.equal(weeks.flat().filter(day => day.doses.length).length, 10)
  assert.equal(weeks[1][3].doses.length, 0)
  assert.deepEqual(calendarWeeks([], '2026-02-31'), [])
  assert.equal(weekStart('2026-W38'), '2026-09-14')
})
