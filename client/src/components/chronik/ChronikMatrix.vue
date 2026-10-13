<template>
  <div class="mx-wrap">
    <table class="mx">
      <caption class="sr-only">Letzte Messwerte je Aquarium und Parameter. Markiert ist die Lage zum Zielbereich.</caption>
      <thead>
        <tr>
          <th scope="col" class="mx-corner">Parameter</th>
          <th v-for="tank in tanks" :key="tank.id" scope="col" :class="['mx-tank', { dim: emphasis && emphasis !== tank.id }]">
            <i :style="{ background: tank.color }"></i>
            <strong>{{ tank.name }}</strong>
            <small>{{ tank.latestReport ? formatDate(tank.latestReport.date) : 'kein Bericht' }}</small>
          </th>
        </tr>
      </thead>
      <tbody v-for="group in groups" :key="group.key">
        <tr class="mx-group">
          <th :colspan="tanks.length + 1" scope="colgroup"><i :style="{ background: group.color }"></i>{{ group.label }}</th>
        </tr>
        <tr v-for="meta in group.items" :key="meta.key">
          <th scope="row" class="mx-param">
            <span class="mx-symbol">{{ meta.symbol }}</span>
            <span class="mx-name">
              <strong>{{ meta.label }}</strong>
              <small>{{ format(meta.min) }}–{{ format(meta.max) }} {{ meta.unit }}</small>
            </span>
          </th>
          <td v-for="tank in tanks" :key="tank.id" :class="['mx-cell', cell(tank, meta).position, { dim: emphasis && emphasis !== tank.id }]">
            <RouterLink v-if="cell(tank, meta).item" :to="`/analyses/${tank.latestReport.id}`" :title="cell(tank, meta).title">
              <span class="mx-mark" aria-hidden="true">{{ cell(tank, meta).mark }}</span>
              <span class="mx-value">{{ cell(tank, meta).text }}</span>
              <span class="sr-only">{{ cell(tank, meta).spoken }}</span>
            </RouterLink>
            <span v-else class="mx-empty" title="In diesem Bericht nicht gemessen">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { formatDate, formatValue, position } from '@/services/chronik'

const props = defineProps({
  tanks: { type: Array, required: true }, // { id, name, color, latestReport }
  groups: { type: Array, required: true }, // [{ key, label, color, items: [meta] }]
  emphasis: { type: String, default: '' },
})

const format = (value) => formatValue(value)
const SPOKEN = { in: 'im Zielbereich', 'near-low': 'leicht unter Ziel', 'far-low': 'deutlich unter Ziel', 'near-high': 'leicht über Ziel', 'far-high': 'deutlich über Ziel', none: 'nicht nachweisbar' }
const MARK = { in: '', 'near-low': '↓', 'far-low': '↓↓', 'near-high': '↑', 'far-high': '↑↑', none: '' }

// Pro Render nur einmal je Zelle rechnen.
const cache = new Map()
function cell(tank, meta) {
  const id = `${tank.id}:${tank.latestReport?.id}:${meta.key}:${meta.min}:${meta.max}`
  if (cache.has(id)) return cache.get(id)
  const item = tank.latestReport?.values[meta.key] || null
  let result = { item: null, position: 'missing' }
  if (item) {
    const where = item.undetectable ? 'none' : position(item.value, meta.min, meta.max)
    const lab = item.tone === 'good' ? 'normal' : item.tone === 'critical' ? 'kritisch' : 'auffällig'
    const text = item.undetectable ? 'n. n.' : format(item.value)
    result = {
      item,
      position: where,
      text,
      mark: MARK[where],
      spoken: `, ${SPOKEN[where]}`,
      title: `${tank.name} · ${meta.label}: ${item.undetectable ? 'nicht nachweisbar' : `${text} ${meta.unit}`} (${SPOKEN[where]}) · Labor: ${lab}`,
    }
  }
  cache.set(id, result)
  return result
}
</script>

<style scoped>
.mx-wrap { position: relative; max-width: 100%; overflow: auto; max-height: min(78vh, 980px); border: 1px solid var(--border); border-radius: 18px; background: #fff; box-shadow: 0 1px 2px rgba(10,27,67,0.04); }
.mx { width: 100%; border-collapse: separate; border-spacing: 0; font-variant-numeric: tabular-nums; }
.mx th, .mx td { padding: 0; border-bottom: 1px solid #eef2f6; text-align: left; }

.mx thead th { position: sticky; z-index: 2; top: 0; padding: 14px 12px 12px; background: #fff; box-shadow: inset 0 -1px 0 #dfe6ee; vertical-align: bottom; }
.mx-corner { left: 0; z-index: 3; min-width: 200px; color: #94a3b8; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.mx-tank { min-width: 112px; transition: opacity .15s; }
.mx-tank i { display: block; width: 18px; height: 3px; margin-bottom: 7px; border-radius: 2px; }
.mx-tank strong { display: block; max-width: 150px; overflow: hidden; color: var(--text); font-size: 12.5px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.mx-tank small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 10.5px; font-weight: 500; }

.mx .mx-group th { position: sticky; left: 0; padding: 14px 14px 6px; background: #fbfcfe; color: var(--text); font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.mx-group i { display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; vertical-align: 1px; }

.mx .mx-param { position: sticky; z-index: 1; left: 0; padding: 7px 12px; background: #fff; box-shadow: inset -1px 0 0 #eef2f6; }
.mx-param { display: table-cell; }
.mx-param > * { vertical-align: middle; }
.mx-symbol { display: inline-grid; place-items: center; width: 30px; height: 30px; margin-right: 10px; border-radius: 9px; background: var(--teal-50, #eef7fd); color: var(--brand-blue); font-size: 10.5px; font-weight: 700; }
.mx-name { display: inline-grid; gap: 1px; }
.mx-name strong { color: var(--text); font-size: 12.5px; font-weight: 700; }
.mx-name small { color: var(--text-muted); font-size: 10.5px; }

.mx-cell { transition: opacity .15s; }
.mx-cell a, .mx-empty { display: flex; align-items: center; justify-content: flex-end; gap: 6px; min-height: 44px; padding: 0 12px; color: var(--text); font-size: 13px; font-weight: 600; text-decoration: none; }
.mx-cell a:hover, .mx-cell a:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--brand-blue); }
.mx-mark { font-size: 11px; font-weight: 800; letter-spacing: -0.12em; }
.mx-empty { color: #c0cad5; }

/* Tönung nach Lage zum Ziel; Pfeil und Text tragen dieselbe Aussage ohne Farbe. */
.mx-cell.in { background: rgba(16,185,129,0.07); }
.mx-cell.near-low, .mx-cell.near-high { background: rgba(245,158,11,0.13); }
.mx-cell.near-low .mx-mark, .mx-cell.near-high .mx-mark { color: #b45309; }
.mx-cell.far-low, .mx-cell.far-high { background: rgba(224,80,63,0.14); }
.mx-cell.far-low .mx-mark, .mx-cell.far-high .mx-mark { color: #b42318; }
.mx-cell.none a { color: #94a3b8; font-weight: 500; }
.mx-cell.dim, .mx-tank.dim { opacity: 0.35; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
