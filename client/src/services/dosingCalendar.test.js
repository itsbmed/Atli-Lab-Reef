import test from 'node:test'
import assert from 'node:assert/strict'
import { splitDose, doseSchedule, weekStart } from './dosingCalendar.js'

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
test('the schedule pads every row to the longest course so the day columns stay aligned', () => {
  const long = splitDose({ deficit: 10, raisesBy: 1, mlPer100Liters: 10, maxDailyIncrease: 1, volume: 100 })
  const short = splitDose({ deficit: 2, raisesBy: 1, mlPer100Liters: 10, maxDailyIncrease: 1, volume: 100 })
  const schedule = doseSchedule([
    { key: 'calcium', label: 'Calcium', dose: { ...long, productName: 'Calcium' } },
    { key: 'iron', label: 'Eisen', dose: { ...short, productName: 'Eisen' } },
  ])
  assert.equal(schedule.days, 10)
  assert.ok(schedule.rows.every(row => row.amounts.length === 10))
  assert.equal(schedule.rows[1].amounts.filter(amount => amount).length, 2)
  assert.equal(schedule.rows[1].amounts[5], null)
  assert.equal(schedule.rows[0].maxDailyMl, long.maxDailyMl)
  assert.deepEqual(doseSchedule([]), { days: 0, rows: [] })
  assert.equal(weekStart('2026-W38'), '2026-09-14')
})
