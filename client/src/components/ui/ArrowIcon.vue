<template>
  <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path :d="paths[direction] || paths.right" />
  </svg>
</template>

<script setup>
defineProps({ direction: { type: String, default: 'right' } })

const paths = {
  right: 'M5 12h14m-6-6 6 6-6 6',
  left: 'M19 12H5m6-6-6 6 6 6',
  external: 'M6 18 18 6M6 6h12v12',
  down: 'm6 9 6 6 6-6',
  next: 'm9 6 6 6-6 6',
}
</script>

<style scoped>
.arrow-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex: 0 0 auto;
  margin-inline: .2em;
  vertical-align: -.125em;
}
</style>
