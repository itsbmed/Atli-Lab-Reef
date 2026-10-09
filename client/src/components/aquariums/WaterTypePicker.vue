<template>
  <fieldset class="wtp">
    <legend>Wassertyp</legend>
    <div class="wtp-grid" role="radiogroup" aria-label="Wassertyp">
      <label v-for="type in WATER_TYPE_CARDS" :key="type.value" :class="['wtp-card', type.tone, { on: modelValue === type.value }]">
        <input type="radio" name="water_type" :value="type.value" :checked="modelValue === type.value" @change="emit('update:modelValue', type.value)" />
        <svg class="wtp-art" viewBox="0 0 64 44" aria-hidden="true">
          <rect class="wtp-glass" x="2" y="2" width="60" height="40" rx="7" />
          <path class="wtp-water" d="M3 15c6-3 10 3 16 0s10-3 16 0 10 3 16 0 8-2 10-1v22a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z" />
          <g class="wtp-motif">
            <template v-if="type.value === 'Meerwasser'">
              <path d="M18 38c0-6-4-8-4-12M18 33c2-3 5-3 6-7M18 30c-2-2-5-2-6-5" />
              <path d="M40 27c3-3 8-3 11 0-3 3-8 3-11 0zM40 27l-3-2v4z" />
            </template>
            <template v-else-if="type.value === 'Süßwasser'">
              <path d="M16 39c0-8 2-13 6-17M16 39c-1-6-4-9-7-11M30 39c0-6 3-10 7-12" />
              <path d="M42 30c3-3 7-3 10 0-3 3-7 3-10 0zM42 30l-3-2v4z" />
            </template>
            <template v-else-if="type.value === 'Osmosewasser'">
              <path d="M32 21c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />
              <path d="M17 27v4M15 29h4M47 30v4M45 32h4" />
            </template>
            <template v-else-if="type.value === 'Meersalz'">
              <path d="M18 37l5-8 5 8zM29 37l4-6 4 6zM38 37l5-9 5 9z" />
            </template>
            <template v-else>
              <path d="M14 28c3-2 6-2 8 0-2 2-5 2-8 0zM14 28l-2-1.5v3zM30 34c3-2 6-2 8 0-2 2-5 2-8 0zM30 34l-2-1.5v3zM42 25c3-2 6-2 8 0-2 2-5 2-8 0zM42 25l-2-1.5v3z" />
            </template>
          </g>
        </svg>
        <strong>{{ type.value }}</strong>
        <small>{{ type.description }}</small>
        <span class="wtp-check" aria-hidden="true">✓</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup>
import { WATER_TYPE_CARDS } from '@/services/waterTypeFields'

defineProps({
  modelValue: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.wtp { min-width: 0; margin: 0; padding: 0; border: 0; }
.wtp legend { margin-bottom: 10px; padding: 0; color: var(--text); font-size: 16px; font-weight: var(--fw-bold); }
.wtp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 120px), 1fr)); gap: 10px; }

.wtp-card {
  --tone: var(--brand-blue);
  --tone-soft: var(--teal-100);
  position: relative; display: flex; flex-direction: column; gap: 4px;
  padding: 12px; border: 1px solid var(--border); border-radius: 16px; background: #fff;
  cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.wtp-card.fresh { --tone: #0f766e; --tone-soft: #ccfbf1; }
.wtp-card.osmo { --tone: #0e7490; --tone-soft: #e0f7fb; }
.wtp-card.salt { --tone: #7c3aed; --tone-soft: #ede9fe; }
.wtp-card.aqua { --tone: #047857; --tone-soft: #d1fae5; }

.wtp-card:hover { border-color: var(--tone); transform: translateY(-1px); }
.wtp-card.on { border-color: var(--tone); box-shadow: 0 0 0 1px var(--tone) inset; background: color-mix(in srgb, var(--tone-soft) 35%, #fff); }
.wtp-card input { position: absolute; opacity: 0; pointer-events: none; }
.wtp-card:has(input:focus-visible) { box-shadow: var(--shadow-focus); }

.wtp-art { width: 100%; height: auto; margin-bottom: 6px; }
.wtp-glass { fill: #fff; stroke: color-mix(in srgb, var(--tone) 35%, transparent); stroke-width: 1.5; }
.wtp-water { fill: var(--tone-soft); transition: fill 0.15s; }
.wtp-card.on .wtp-water { fill: color-mix(in srgb, var(--tone) 70%, #fff); }
.wtp-card.osmo .wtp-water { fill: #f0fbfd; }
.wtp-card.osmo.on .wtp-water { fill: #c4eef6; }
.wtp-motif path { fill: none; stroke: var(--tone); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.wtp-card.on .wtp-motif path { stroke: #fff; }
.wtp-card.osmo.on .wtp-motif path { stroke: var(--tone); }

.wtp-card strong { color: var(--text); font-size: 13px; font-weight: var(--fw-bold); }
.wtp-card small { color: var(--text-muted); font-size: 12px; line-height: 1.4; }
.wtp-check {
  position: absolute; top: 8px; right: 8px; display: grid; place-items: center;
  width: 20px; height: 20px; border-radius: 50%; background: var(--tone); color: #fff;
  font-size: 11px; font-weight: var(--fw-bold); opacity: 0; transform: scale(0.6); transition: opacity 0.15s, transform 0.15s;
}
.wtp-card.on .wtp-check { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  .wtp-card, .wtp-water, .wtp-check { transition: none; }
  .wtp-card:hover { transform: none; }
}
</style>
