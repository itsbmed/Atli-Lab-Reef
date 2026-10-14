<template>
  <!-- Kurzes Linienstück mit Punktform – derselbe Schlüssel wie im Diagramm -->
  <svg width="26" height="12" aria-hidden="true">
    <line x1="1" y1="6" x2="25" y2="6" :stroke="color" stroke-width="2.5" :stroke-dasharray="styleDef.dash.join(' ')" stroke-linecap="round" />
    <circle v-if="styleDef.point === 'circle'" cx="13" cy="6" r="3.2" fill="#fff" :stroke="color" stroke-width="2" />
    <rect v-else-if="styleDef.point === 'rect'" x="9.8" y="2.8" width="6.4" height="6.4" fill="#fff" :stroke="color" stroke-width="2" />
    <polygon v-else-if="styleDef.point === 'triangle'" points="13,2.2 16.8,9 9.2,9" fill="#fff" :stroke="color" stroke-width="2" stroke-linejoin="round" />
    <polygon v-else points="13,1.8 17.2,6 13,10.2 8.8,6" fill="#fff" :stroke="color" stroke-width="2" stroke-linejoin="round" />
  </svg>
</template>

<script setup>
defineProps({
  styleDef: { type: Object, required: true }, // { dash, point } aus LINE_STYLES
  color: { type: String, required: true },
})
</script>
