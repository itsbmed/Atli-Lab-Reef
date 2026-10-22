<template>
  <DeviationCard
    eyebrow="Zusammensetzung"
    title="Passen die Hauptelemente zu Ihrer Salinität?"
    :verdict="verdict"
    :items="items"
    :band="BALANCE_BAND"
    :legend="LEGEND"
    legend-title="Abweichung vom Soll"
    dots-hint="Konzentration je PSU als Index – 100 passt zur Salinität"
    columns-hint="Abweichung vom Soll in % als Säulen"
    :dots-guide="dotsGuide"
    :columns-guide="columnsGuide"
  />
</template>

<script setup>
import { computed } from 'vue'
import DeviationCard from './DeviationCard.vue'
import { BALANCE_BAND, compositionSummary, compositionTone, withSulfate } from '@/services/waterBalance'

const props = defineProps({
  rows: { type: Array, required: true }, // compositionRows()
  salinity: { type: Number, default: null },
  unit: { type: String, default: 'mg/l' },
})

// Farbe nach Lage zum grünen Band – dieselbe Regel wie das Fazit darüber.
const LEGEND = [
  { tone: 'good', label: `ausgewogen (±${BALANCE_BAND} %)` },
  { tone: 'watch', label: `auffällig (bis ±${BALANCE_BAND * 2} %)` },
  { tone: 'critical', label: `kritisch (über ±${BALANCE_BAND * 2} %)` },
]
const BAND_LABEL = { good: 'Ausgewogen', watch: 'Auffällig', critical: 'Kritisch' }
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
  const tone = compositionTone(index)
  return {
    key: row.key,
    axis: row.symbol,
    index,
    tone,
    derived: row.derived,
    name: row.label,
    toneLabel: BAND_LABEL[tone],
    facts: [
      { label: 'Messwert', value: `${formatValue(row.measured)} ${row.unit || props.unit}` },
      { label: 'Soll', value: `${formatValue(row.ideal)} ${row.unit || props.unit}` },
      { label: 'Abweichung', value: formatPercent(index - 100), lead: true },
      { label: 'Index', value: index.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) },
      { label: 'Labor', value: LAB[row.tone] || 'ohne Bewertung' },
    ],
    note: row.derived ? 'Sulfat ist aus dem gemessenen Schwefel abgeleitet.' : '',
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

// Lesehilfe: drei Schritte mit kleiner Skizze, je Darstellung.
const salinityText = computed(() => (Number.isFinite(props.salinity)
  ? `Ihrer gemessenen Salinität von ${props.salinity.toLocaleString('de-DE', { maximumFractionDigits: 2 })} PSU`
  : 'Ihrer gemessenen Salinität'))
const dotsGuide = computed(() => ({
  hint: 'Punkt antippen für Messwert und Soll',
  steps: [
    { art: 'dots-base', title: 'Die Linie bei 100', text: `So viel sollte von jedem Element bei ${salinityText.value} im Wasser sein.` },
    { art: 'dots-band', title: 'Das grüne Band', text: `Zwischen ${100 - BALANCE_BAND} und ${100 + BALANCE_BAND} ist alles ausgewogen – der Punkt ist grün. Bis ±${BALANCE_BAND * 2} % wird er gelb, darüber rot.` },
    { art: 'dots-offset', title: 'Darüber oder darunter', text: 'Über 100 ist mehr vorhanden, als zur Salinität passt, darunter weniger – 110 heißt 10 % zu viel.' },
  ],
}))
const columnsGuide = computed(() => ({
  hint: 'Säule antippen für Messwert und Soll',
  steps: [
    { art: 'cols-base', title: 'Die Nulllinie', text: `Hier liegt der Sollwert – die Menge, die bei ${salinityText.value} zu erwarten ist.` },
    { art: 'cols-band', title: 'Das grüne Band', text: `Innerhalb von ±${BALANCE_BAND} % ist alles ausgewogen – die Säule ist grün. Bis ±${BALANCE_BAND * 2} % wird sie gelb, darüber rot.` },
    { art: 'cols-offset', title: 'Nach oben oder unten', text: 'Nach oben heißt zu viel, nach unten zu wenig. Je länger die Säule, desto größer die Abweichung.' },
  ],
}))
</script>
