<template>
  <div :class="['atl', `atl-${size}`]" :style="{ '--tl-progress': progress }">
    <div v-if="size === 'full'" class="atl-status">
      <span>Status</span>
      <strong>{{ headline }}</strong>
      <em v-if="detail">{{ detail }}</em>
    </div>
    <ol class="atl-track" :aria-label="size === 'full' ? 'Ablauf der Analyse' : undefined" :aria-hidden="size === 'compact' ? 'true' : undefined">
      <li
        v-for="step in steps"
        :key="step.key"
        :class="['atl-step', { done: step.done, current: step.current }]"
        :aria-current="step.current ? 'step' : undefined"
        :title="step.date ? `${step.label} · ${step.date}` : step.label"
      >
        <i aria-hidden="true">
          <svg v-if="size === 'full' && step.done && (!step.current || analysis.status === 'completed')" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.5l4.5-5" /></svg>
        </i>
        <small>
          <template v-if="size === 'full'"><span class="atl-long">{{ step.label }}</span><span class="atl-short">{{ step.short }}</span></template>
          <template v-else>{{ step.short }}</template>
        </small>
        <em>{{ step.date || (step.done ? ' ' : '–') }}</em>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  analysis: { type: Object, required: true },
  // compact: eine Zeile in der Analyseliste · full: Kopf des Analyseberichts
  size: { type: String, default: 'compact' },
})

// Drei Stationen: Registriert, Analyse, Fertig. Ein eigener „Eingang“ entfällt – sobald die
// Probe im Labor ist, läuft die Analyse, und die Station trägt das Eingangsdatum.
const STATIONS = [
  { key: 'registered', label: 'Registriert', short: 'Registriert' },
  { key: 'analysis', label: 'In Analyse', short: 'In Analyse' },
  { key: 'completed', label: 'Fertig', short: 'Fertig' },
]
const STATUS_RANK = { registered: 1, received: 2, in_analysis: 2, completed: 3 }

const currentRank = computed(() => STATUS_RANK[props.analysis.status] || 0)
const dates = computed(() => ({
  registered: props.analysis.createdAt,
  received: props.analysis.receivedAt || props.analysis.sample?.receivedAt,
  completed: props.analysis.completedAt,
}))
const stationDates = computed(() => ({ registered: dates.value.registered, analysis: dates.value.received, completed: dates.value.completed }))

const steps = computed(() => STATIONS.map((station, index) => ({
  ...station,
  done: index + 1 <= currentRank.value,
  current: index + 1 === currentRank.value,
  date: shortDate(stationDates.value[station.key]),
})))

// Wie weit die gefüllte Schiene läuft, als Anteil zwischen erster und letzter Station.
const progress = computed(() => Math.max(0, Math.min(1, (currentRank.value - 1) / (STATIONS.length - 1))))

const headline = computed(() => ({
  registered: 'Wartet auf die Probe',
  received: 'Probe wird analysiert',
  in_analysis: 'Probe wird analysiert',
  completed: 'Bericht ist fertig',
}[props.analysis.status] || 'Offen'))

const detail = computed(() => {
  const { registered, received, completed } = dates.value
  if (props.analysis.status === 'completed' && completed) {
    const days = daysBetween(registered, completed)
    return days > 0 ? `seit ${longDate(completed)} · nach ${days} ${days === 1 ? 'Tag' : 'Tagen'}` : `seit ${longDate(completed)}`
  }
  if (received) return `im Labor seit ${longDate(received)}`
  if (registered) return `registriert am ${longDate(registered)}`
  return ''
})

function shortDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }).replace(/\.$/, '')
}

function longDate(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

function daysBetween(from, to) {
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.round((end - start) / 86400000)
}
</script>

<style scoped>
.atl {
  /* Punktgröße und Schienenstärke stehen zusammen, damit die Schiene exakt
     auf der Punktmitte sitzt und beides nicht getrennt verstellt werden kann. */
  --tl-dot: 14px;
  --tl-rail: 2px;
  --tl-top: 2px;
  min-width: 0;
}
.atl-track {
  position: relative; display: grid; grid-template-columns: repeat(3, 1fr); align-items: start;
  margin: 0; padding: var(--tl-top) 0 0; list-style: none;
}
/* Eine durchgehende Schiene von der ersten bis zur letzten Punktmitte,
   waagerecht auf den Spaltenmitten bei 1/6 und 5/6. */
.atl-track::before,
.atl-track::after {
  content: ''; position: absolute; left: calc(100% / 6);
  top: calc(var(--tl-top) + (var(--tl-dot) - var(--tl-rail)) / 2);
  height: var(--tl-rail); border-radius: 999px;
}
.atl-track::before { right: calc(100% / 6); background: #e4ecf3; }
.atl-track::after { width: calc(100% * 2 / 3 * var(--tl-progress, 0)); background: var(--brand-blue); transition: width .3s ease; }

.atl-step { position: relative; z-index: 1; display: grid; justify-items: center; gap: 6px; min-width: 0; text-align: center; }
.atl-step i {
  display: grid; place-items: center; width: var(--tl-dot); height: var(--tl-dot);
  border: 2px solid #d5dfe9; border-radius: 50%; background: #fff; transition: background .2s, border-color .2s;
}
.atl-step.done i { border-color: var(--brand-blue); background: var(--brand-blue); }
.atl-step.current i { box-shadow: 0 0 0 5px rgba(0,114,206,0.14); }
.atl-step small { color: var(--text-muted); font-size: 11px; font-weight: var(--fw-bold); line-height: 1.1; white-space: nowrap; }
.atl-step.done small { color: #5f7488; }
.atl-step.current small { color: var(--brand-blue); }
.atl-step em { color: #a9b8c6; font-size: 10px; font-style: normal; font-weight: var(--fw-semibold); line-height: 1; font-variant-numeric: tabular-nums; }
.atl-step.done em { color: #8fa2b3; }

/* Bericht: größer, mit Statussatz und ausgeschriebenen Stationen */
.atl-full {
  --tl-dot: 22px;
  --tl-rail: 3px;
  --tl-top: 4px;
  display: grid; grid-template-columns: minmax(200px, 260px) 1fr; align-items: center; gap: 28px;
  padding: 20px 26px;
}
.atl-status { display: grid; gap: 3px; padding-right: 24px; border-right: 1px solid var(--border); }
.atl-status span { color: var(--brand-blue); font-size: 11px; font-weight: var(--fw-bold); letter-spacing: 0.1em; text-transform: uppercase; }
.atl-status strong { color: var(--text); font-size: 18px; font-weight: var(--fw-bold); letter-spacing: -0.01em; }
.atl-status em { color: var(--text-muted); font-size: 13px; font-style: normal; }
.atl-full .atl-step { gap: 8px; }
.atl-full .atl-step i svg { width: 12px; height: 12px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.atl-full .atl-step.current i { box-shadow: 0 0 0 6px rgba(0,114,206,0.16); }
.atl-full .atl-step small { font-size: 13px; }
.atl-full .atl-step em { font-size: 12px; }
.atl-short { display: none; }

@media (max-width: 720px) {
  .atl-full { grid-template-columns: 1fr; gap: 18px; padding: 18px 16px; }
  .atl-status { padding: 0 0 14px; border-right: 0; border-bottom: 1px solid var(--border); }
}
@media (max-width: 480px) {
  .atl-long { display: none; }
  .atl-short { display: inline; }
  .atl-full .atl-step small { font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .atl-track::after, .atl-step i { transition: none; }
}
</style>
