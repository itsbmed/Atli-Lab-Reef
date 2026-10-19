<template>
  <section class="pg">
    <header class="pg-head">
      <span class="pg-eyebrow">{{ eyebrow }}</span>
      <h3>{{ title }}</h3>
      <p v-if="rows.length" class="pg-verdict">
        <strong :class="flagged.length ? 'warn' : 'ok'">{{ rows.length - flagged.length }} von {{ rows.length }} {{ noun }} ausgewogen</strong>
        <template v-if="flagged.length">
          · verschoben:
          <template v-for="(row, index) in flagged" :key="row.key"><template v-if="index">, </template><b>{{ shortName(row) }}</b> {{ formatPercent(row.percent) }}</template>
        </template>
        <template v-else> – alles im Gleichgewicht.</template>
      </p>
      <p class="pg-hint">{{ hint }}</p>
    </header>

    <p v-if="!rows.length" class="pg-empty">Für dieses Diagramm liegen keine auswertbaren Werte vor.</p>

    <!-- Je Paar eine Zeile wie unter „Alle Werte“: Name, Bewertung, Skala mit grünem Bereich, Wert -->
    <ol v-else class="pg-rows">
      <li v-for="row in rows" :key="row.key" :class="['pg-row', row.tone]">
        <span class="pg-symbol">{{ shortName(row) }}</span>
        <span class="pg-name">
          <strong>{{ row.leftName }} : {{ row.rightName }}</strong>
          <span class="pg-meta">
            <em :class="['pg-chip', row.tone]">{{ TONE_LABEL[row.tone] }}</em>
            <small>{{ leaning(row) }}</small>
          </span>
        </span>
        <TargetGauge
          class="pg-gauge"
          :value="row.percent"
          :min="-BAND"
          :max="BAND"
          :label="formatPercent(row.percent)"
          tick-suffix=" %"
          zone-label="ausgewogen"
          :far-beyond="CRITICAL - BAND"
          :title="describe(row)"
        />
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import TargetGauge from './TargetGauge.vue'

// Elementverhältnisse und Wachstumsfaktoren im Stil der Zeilen unter „Alle Werte“.
// Ein Paar ist ausgewogen, wenn beide Seiten im gleichen Verhältnis zu ihrem Sollwert
// stehen; Plus heißt, die linke Seite ist relativ stärker vertreten.
const props = defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  rows: { type: Array, required: true }, // ratioRows().rows oder growthRows().rows
  noun: { type: String, default: 'Verhältnissen' },
  hint: { type: String, default: '' },
})

// Dieselben Stufen wie die Bewertung der Paare: unter 10 % ausgewogen, ab 25 % stark verschoben.
const BAND = 10
const CRITICAL = 25
const TONE_LABEL = { good: 'Ausgewogen', watch: 'Verschoben', critical: 'Stark verschoben' }

// Der Salinitätsanteil heißt im Rohdatensatz „PSU NaCl“ und „PSU übrige“ – lesbarer so:
const NAMES = { psu: ['Kochsalz (Na + Cl)', 'übrige Hauptelemente', 'Kochsalz', 'übrige Hauptelemente'] }
const rows = computed(() => props.rows.map((row) => {
  const names = NAMES[row.key]
  return names ? { ...row, leftName: names[0], rightName: names[1], leftShort: names[2], rightShort: names[3] } : { ...row, leftShort: row.leftName, rightShort: row.rightName }
}))

const flagged = computed(() => rows.value.filter((row) => row.tone !== 'good').sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent)))

function shortName(row) {
  return row.key === 'psu' ? 'NaCl/übrige' : `${row.leftLabel}/${row.rightLabel}`
}

function formatPercent(value) {
  const abs = Math.abs(value)
  const text = abs.toLocaleString('de-DE', { maximumFractionDigits: abs < 10 ? 1 : 0 })
  return `${value > 0.05 ? '+' : value < -0.05 ? '−' : '±'}${text} %`
}

function leaning(row) {
  if (Math.abs(row.percent) < 0.5) return 'im Gleichgewicht'
  return `${row.percent > 0 ? row.leftShort : row.rightShort} höher`
}

function describe(row) {
  if (Math.abs(row.percent) < 0.5) return `${row.leftName} : ${row.rightName} – beide Seiten im Gleichgewicht`
  const higher = row.percent > 0 ? row.leftShort : row.rightShort
  return `${row.leftName} : ${row.rightName} – ${higher} relativ ${formatPercent(Math.abs(row.percent)).replace('+', '')} höher (ausgewogen: ±${BAND} %)`
}
</script>

<style scoped>
.pg { display: grid; gap: 14px; min-width: 0; padding: 20px 22px; border: 1px solid var(--border); border-radius: 18px; background: #fff; container-type: inline-size; }
.pg-eyebrow { display: block; color: var(--brand-blue); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.pg-head h3 { margin-top: 4px; color: var(--text); font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.pg-verdict { margin-top: 6px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
.pg-verdict strong.ok { color: #047857; }
.pg-verdict strong.warn, .pg-verdict b { color: var(--text); font-weight: 700; }
.pg-hint { margin-top: 4px; color: var(--text-muted); font-size: 12px; line-height: 1.5; }
.pg-empty { padding: 16px; border: 1px dashed var(--border); border-radius: 12px; color: var(--text-muted); font-size: 12px; }

.pg-rows { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
/* Gleiche Spalten wie eine Messwertzeile: Kürzel · Name · Skala · Wert */
.pg-row { display: grid; grid-template-columns: 64px minmax(150px, 0.9fr) minmax(200px, 1.6fr); align-items: center; gap: 16px; padding: 14px 16px; border: 1px solid var(--border); border-left: 5px solid #10b981; border-radius: 14px; background: #fff; }
.pg-row.watch { border-left-color: #f59e0b; }
.pg-row.critical { border-left-color: #e85d4f; }
.pg-symbol { display: grid; place-items: center; min-height: 44px; padding: 0 6px; border-radius: 12px; background: var(--teal-50, #eef7fd); color: var(--brand-blue); font-size: 12px; font-weight: 700; text-align: center; line-height: 1.15; }
.pg-name { display: grid; gap: 5px; min-width: 0; }
.pg-name strong { color: var(--text); font-size: 14px; font-weight: 700; }
.pg-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.pg-meta small { color: var(--text-muted); font-size: 11px; }
.pg-chip { justify-self: start; padding: 2px 8px; white-space: nowrap; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 10.5px; font-style: normal; font-weight: 700; }
.pg-chip.watch { background: #fff7ed; color: #9a4d0a; }
.pg-chip.critical { background: #fdecea; color: #b53a2e; }
.pg-gauge { min-width: 0; }

/* Schmal: Kopfzeile mit Kürzel, Name und Wert, die Skala darunter über die volle Breite */
@container (max-width: 620px) {
  .pg { padding: 18px 14px; }
  .pg-row { grid-template-columns: 56px minmax(0, 1fr); gap: 8px 12px; padding: 12px; }
  .pg-gauge { grid-column: 1 / -1; grid-row: 2; }
}
</style>
