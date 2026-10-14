<template>
  <!-- Fortschrittsring: wie gut das Aquarium beschrieben ist -->
  <span class="pr" :style="{ width: `${size}px`, height: `${size}px` }" role="img" :aria-label="`Profil zu ${percent} Prozent vollständig`">
    <svg :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <circle :cx="size / 2" :cy="size / 2" :r="radius" class="pr-track" />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        :class="['pr-fill', { full: percent >= 100 }]"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference * (1 - Math.min(100, percent) / 100)"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <b>{{ percent }}<small>%</small></b>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  percent: { type: Number, required: true },
  size: { type: Number, default: 48 },
})

const radius = computed(() => props.size / 2 - 4)
const circumference = computed(() => 2 * Math.PI * radius.value)
</script>

<style scoped>
.pr { position: relative; display: inline-grid; flex: none; place-items: center; }
.pr svg { position: absolute; inset: 0; }
.pr-track { fill: none; stroke: #e4edf5; stroke-width: 4; }
.pr-fill { fill: none; stroke: var(--brand-blue); stroke-width: 4; stroke-linecap: round; transition: stroke-dashoffset .5s cubic-bezier(.2,.8,.3,1), stroke .3s; }
.pr-fill.full { stroke: #10b981; }
.pr b { position: relative; color: var(--text); font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
.pr b small { font-size: 9px; font-weight: 700; }
@media (prefers-reduced-motion: reduce) { .pr-fill { transition: none; } }
</style>
