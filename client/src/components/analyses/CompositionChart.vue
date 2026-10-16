<template>
  <DeviationCard
    eyebrow="Zusammensetzung"
    title="Passen die Hauptelemente zu Ihrer Salinität?"
    :verdict="verdict"
    :context="context"
    :items="items"
    :band="BALANCE_BAND"
    :legend="LEGEND"
    legend-title="Bewertung des Labors"
    show-stats
    dots-hint="Konzentration je PSU als Index – 100 passt zur Salinität"
    columns-hint="Abweichung vom Soll in % als Säulen"
    :dots-note="`Konzentration je PSU: 100 heißt, das Element passt genau zur gemessenen Salinität. Grün: ausgewogen (±${BALANCE_BAND} %).`"
    readout-hint="Element antippen oder darauf zeigen, um Messwert und Soll zu sehen."
  />
</template>

<script setup>
import { computed } from 'vue'
import DeviationCard from './DeviationCard.vue'
import { BALANCE_BAND, compositionSummary, withSulfate } from '@/services/waterBalance'

const props = defineProps({
  rows: { type: Array, required: true }, // compositionRows()
  salinity: { type: Number, default: null },
  unit: { type: String, default: 'mg/l' },
})

const LEGEND = [{ tone: 'good', label: 'im Soll' }, { tone: 'watch', label: 'auffällig' }, { tone: 'critical', label: 'kritisch' }]
const LAB = { good: 'im Soll', watch: 'auffällig', critical: 'kritisch' }

function formatPercent(value) {
  const abs = Math.abs(value)
  const text = abs.toLocaleString('de-DE', { maximumFractionDigits: abs < 10 ? 1 : 0 })
  return `${value > 0.05 ? '+' : value < -0.05 ? '−' : '±'}${text} %`
}

function formatValue(value) {
  const abs = Math.abs(value)
  return Number(value).toLocaleString('de-DE', { maximumFractionDigits: abs >= 100 ? 0 : abs >= 10 ? 1 : 2 })
}

// Wie in der Arbeitsmappe des Kunden mit Sulfat, aus Schwefel abgeleitet.
const items = computed(() => withSulfate(props.rows).map((row) => {
  const index = (row.measured / row.ideal) * 100
  return {
    key: row.key,
    axis: row.symbol,
    index,
    tone: row.tone,
    derived: row.derived,
    detail: `${row.label}${row.derived ? ' (aus Schwefel)' : ''} · ${formatValue(row.measured)} / ${formatValue(row.ideal)} ${row.unit || props.unit} · Index ${index.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${formatPercent(index - 100)} · Labor: ${LAB[row.tone] || 'ohne Bewertung'}`,
  }
}))

const verdict = computed(() => {
  const summary = compositionSummary(props.rows)
  return {
    headline: `${summary.fitting} von ${summary.total} Hauptelementen passen`,
    flaggedLabel: 'auffällig',
    flagged: summary.flagged.map((item) => ({ key: item.key, label: item.label, value: formatPercent(item.percent) })),
    allGood: '– die Zusammensetzung ist ausgewogen.',
  }
})

const context = computed(() => (Number.isFinite(props.salinity)
  ? { prefix: 'Sollwerte bezogen auf', value: `${props.salinity.toLocaleString('de-DE', { maximumFractionDigits: 2 })} PSU`, hint: 'Das Labor rechnet jeden Sollwert auf die gemessene Salinität um.' }
  : null))
</script>
