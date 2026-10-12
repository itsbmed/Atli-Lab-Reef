<template>
  <span :class="['tg', `tg-${state}`, overflowSide && `tg-${overflowSide}`]" :style="{ '--tg-at': `${marker}%`, '--tg-lo': `${low}%`, '--tg-hi': `${high}%` }">
    <span class="tg-bubble">{{ label }}<i aria-hidden="true"></i></span>
    <span ref="track" class="tg-track" :style="{ background: trackBackground }">
      <span v-if="undetectable" class="tg-zone" aria-hidden="true"></span>
      <span v-if="undetectable" class="tg-hatch" aria-hidden="true"></span>
      <i v-if="low > 0" class="tg-tick" :style="{ left: `${low}%` }" aria-hidden="true"></i>
      <i v-if="high < 100" class="tg-tick" :style="{ left: `${high}%` }" aria-hidden="true"></i>
      <b class="tg-marker" aria-hidden="true"></b>
    </span>
    <span ref="scaleRow" class="tg-scale" aria-hidden="true">
      <small v-for="item in scaleLabels" :key="item.key" :class="{ 'tg-zone-label': item.key === 'zone' }" :style="{ left: `${item.left}px` }">{{ item.text }}</small>
    </span>
  </span>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gaugePercent, gaugeScale, layoutLabels, overflow, tickFormatter } from '@/services/targetGauge'

const props = defineProps({
  value: { type: Number, default: null },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  label: { type: String, required: true },
  undetectable: { type: Boolean, default: false },
})

const measuredValue = computed(() => (props.undetectable ? null : props.value))
const scale = computed(() => gaugeScale(props.min, props.max, measuredValue.value))
const low = computed(() => gaugePercent(props.min, scale.value))
const high = computed(() => gaugePercent(props.max, scale.value))
const format = computed(() => tickFormatter(props.min, props.max))
const overflowSide = computed(() => overflow(measuredValue.value, scale.value))

// Nicht nachweisbar heißt: irgendwo unterhalb der Nachweisgrenze – der Marker steht
// deshalb früh auf der Skala, links davon schraffiert.
const marker = computed(() => {
  if (props.undetectable) return Math.max(6, Math.min(12, low.value / 2))
  const at = gaugePercent(props.value, scale.value)
  // Ein Wert knapp außerhalb soll auch so aussehen: der Ring bleibt ganz neben der Grenzlinie.
  const clear = trackWidth.value ? (12 / trackWidth.value) * 100 : 0
  if (state.value === 'in' || !clear) return at
  if (props.value < props.min && at > low.value - clear) return Math.max(0, low.value - clear)
  if (props.value > props.max && at < high.value + clear) return Math.min(100, high.value + clear)
  return at
})

// Der Marker zeigt, was die Skala sagt – unabhängig vom Laborurteil daneben im Chip:
// im Zielbereich gefüllt, knapp daneben orange, mehr als eine Zielbreite daneben rot.
const state = computed(() => {
  if (props.undetectable) return 'none'
  const span = props.max - props.min || Math.abs(props.max) || 1
  const off = props.value < props.min ? props.min - props.value : props.value > props.max ? props.value - props.max : 0
  return off === 0 ? 'in' : off > span ? 'critical' : 'watch'
})

// Die Beschriftung richtet sich nach der echten Breite der Spur: was nicht passt, fällt weg.
// Zielgrenzen zuerst, dann die Skalenenden, zuletzt „Zielbereich“. Ragt der Wert über
// die Skala hinaus, sagt das Skalenende das mit „>“ bzw. „<“.
const track = ref(null)
const scaleRow = ref(null)
const trackWidth = ref(0)
let measureText = null
let observer = null
onMounted(() => {
  const { fontFamily } = getComputedStyle(scaleRow.value)
  const context = document.createElement('canvas').getContext('2d')
  measureText = (text, weight) => {
    context.font = `${weight} 10.5px ${fontFamily}`
    return Math.ceil(context.measureText(text).width) + 4
  }
  trackWidth.value = track.value.getBoundingClientRect().width
  observer = new ResizeObserver(([entry]) => { trackWidth.value = entry.contentRect.width })
  observer.observe(track.value)
})
onBeforeUnmount(() => observer?.disconnect())

const scaleLabels = computed(() => {
  if (!trackWidth.value || !measureText) return []
  const candidates = []
  const add = (key, text, at, priority, align, weight = 500, fallback) => candidates.push({ key, text, at, priority, align, fallback, width: measureText(text, weight) })
  if (low.value > 0) add('min', format.value(props.min), low.value, 0, 'center', 500, 'before')
  if (high.value < 100) add('max', format.value(props.max), high.value, 1, 'center', 500, 'after')
  const start = `${overflowSide.value === 'under' ? '< ' : ''}${format.value(scale.value.start)}`
  const end = `${overflowSide.value === 'over' ? '> ' : ''}${format.value(scale.value.end)}`
  add('start', start, 0, overflowSide.value === 'under' ? -1 : 2, 'start')
  add('end', end, 100, overflowSide.value === 'over' ? -1 : 3, 'end')
  add('zone', 'Zielbereich', (low.value + high.value) / 2, 4, 'center', 600)
  return layoutLabels(candidates, trackWidth.value)
})

// Rot an den Rändern, über Orange und Gelb zum grünen Zielbereich.
const trackBackground = computed(() => {
  if (props.undetectable) return null
  const lo = low.value
  const hi = high.value
  const after = (share) => hi + (100 - hi) * share
  const stops = lo > 0
    ? [`#e8665a 0%`, `#f0a04b ${lo * 0.45}%`, `#f2cf5b ${lo * 0.8}%`, `#5fca88 ${lo}%`]
    : [`#5fca88 0%`]
  stops.push(`#5fca88 ${hi}%`)
  if (hi < 100) stops.push(`#f2cf5b ${after(0.2)}%`, `#f0a04b ${after(0.55)}%`, `#e8665a 100%`)
  return `linear-gradient(90deg, ${stops.join(', ')})`
})
</script>

<style scoped>
.tg { position: relative; display: block; min-width: 0; padding: 34px 0 0; }

.tg-track { position: relative; display: block; height: 10px; border-radius: 999px; background: #e6ecf2; box-shadow: inset 0 1px 2px rgba(10,27,67,0.08); }
.tg-zone { position: absolute; inset: 0 calc(100% - var(--tg-hi)) 0 var(--tg-lo); border-radius: 999px; background: rgba(95,202,136,0.42); }
.tg-hatch { position: absolute; inset: 0 calc(100% - var(--tg-at)) 0 0; border-radius: 999px 0 0 999px; background: repeating-linear-gradient(-45deg, #cdd6df 0 2px, transparent 2px 5px); }
.tg-tick { position: absolute; top: -7px; bottom: -7px; width: 0; border-left: 1px dashed rgba(10,27,67,0.32); }

.tg-marker { position: absolute; z-index: 2; top: 50%; left: clamp(10px, var(--tg-at), calc(100% - 10px)); width: 20px; height: 20px; border-radius: 50%; transform: translate(-50%, -50%); transition: left .3s ease; }
.tg-in .tg-marker { border: 3px solid #fff; background: var(--brand-dark, #0a1b43); box-shadow: 0 2px 7px rgba(10,27,67,0.34); }
.tg-watch .tg-marker,
.tg-critical .tg-marker,
.tg-none .tg-marker { border: 3px solid currentColor; background: #fff; box-shadow: 0 2px 6px rgba(10,27,67,0.18); }
.tg-critical { color: #e0503f; }
.tg-watch { color: #e98a1c; }
.tg-none { color: #7d8b99; }

/* Die Sprechblase bleibt in der Spur: sie verschiebt sich um so viel ihrer eigenen
   Breite, wie der Marker auf der Skala steht – der Pfeil zeigt trotzdem auf ihn. */
.tg-bubble { position: absolute; top: 0; left: var(--tg-at); padding: 5px 10px; border-radius: 9px; background: #fff; box-shadow: 0 3px 12px rgba(10,27,67,0.14), 0 0 0 1px rgba(10,27,67,0.05); color: var(--text, #0a1b43); font-size: 11.5px; font-weight: 700; line-height: 1.2; white-space: nowrap; font-variant-numeric: tabular-nums; transform: translateX(calc(-1 * var(--tg-at))); transition: left .3s ease, transform .3s ease; }
.tg-bubble i { position: absolute; top: 100%; left: clamp(10px, var(--tg-at), calc(100% - 10px)); width: 8px; height: 8px; margin: -4px 0 0 -4px; background: #fff; box-shadow: 2px 2px 3px rgba(10,27,67,0.06); transform: rotate(45deg); }
.tg-none .tg-bubble { color: #6b7a89; }

.tg-scale { position: relative; display: block; height: 15px; margin-top: 9px; }
.tg-scale small { position: absolute; top: 0; color: var(--text-muted, #64748b); font-size: 10.5px; font-weight: 500; line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums; }
.tg-scale .tg-zone-label { color: #4c9a6c; font-weight: 600; }

@media (prefers-reduced-motion: reduce) {
  .tg-marker, .tg-bubble { transition: none; }
}
</style>
