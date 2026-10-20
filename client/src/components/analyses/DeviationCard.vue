<template>
  <section class="cmp">
    <header class="cmp-head">
      <div class="cmp-title">
        <span class="cmp-eyebrow">{{ eyebrow }}</span>
        <h3>{{ title }}</h3>
        <p v-if="verdict" class="cmp-verdict">
          <strong :class="verdict.flagged.length ? 'warn' : 'ok'">{{ verdict.headline }}</strong>
          <template v-if="verdict.flagged.length">
            · {{ verdict.flaggedLabel }}:
            <template v-for="(item, index) in verdict.flagged" :key="item.key"><template v-if="index">, </template><b>{{ item.label }}</b> {{ item.value }}</template>
          </template>
          <template v-else> {{ verdict.allGood }}</template>
        </p>
      </div>
    </header>

    <div class="cmp-toolbar">
      <div class="cmp-seg" role="radiogroup" aria-label="Darstellung">
        <button v-for="item in MODES" :key="item.key" type="button" role="radio" :aria-checked="mode === item.key" :class="{ active: mode === item.key }" :title="item.key === 'dots' ? dotsHint : columnsHint" @click="mode = item.key">
          <svg viewBox="0 0 20 16" aria-hidden="true">
            <template v-if="item.key === 'dots'"><path d="M2 8h16" opacity=".35" /><path d="M4 8.5l.01 0M8 6l.01 0M12 8l.01 0M16 10.5l.01 0" stroke-width="3.2" /></template>
            <template v-else><path d="M2 8h16" opacity=".5" /><path d="M5 8V4M10 8V6M15 8v4" stroke-width="2.6" /></template>
          </svg>
          {{ item.label }}
        </button>
      </div>
      <div v-if="mode === 'columns' && items.length > 2" class="cmp-seg" role="radiogroup" aria-label="Reihenfolge">
        <button type="button" role="radio" :aria-checked="sort === 'given'" :class="{ active: sort === 'given' }" @click="sort = 'given'">{{ orderLabel }}</button>
        <button type="button" role="radio" :aria-checked="sort === 'deviation'" :class="{ active: sort === 'deviation' }" @click="sort = 'deviation'">Größte Abweichung zuerst</button>
      </div>
      <ul class="cmp-legend" :aria-label="legendTitle">
        <li v-for="entry in legend" :key="entry.tone"><i :class="entry.tone"></i>{{ entry.label }}</li>
      </ul>
    </div>

    <p v-if="!items.length" class="cmp-empty">{{ emptyLabel }}</p>

    <!-- Punkte: Index, 100 = ausgewogen -->
    <div v-else-if="mode === 'dots'" class="cmp-plot">
      <div class="cmp-stage">
        <div class="cmp-yaxis" aria-hidden="true">
          <em v-for="tick in INDEX_TICKS" :key="tick" :style="{ bottom: `${(tick / INDEX_TOP) * 100}%` }">{{ tick }}</em>
        </div>
        <div class="cmp-area">
          <i v-for="tick in INDEX_TICKS" :key="tick" :class="['cmp-hline', { base: tick === 100 }]" :style="{ bottom: `${(tick / INDEX_TOP) * 100}%` }" aria-hidden="true"></i>
          <span class="cmp-band" :style="{ bottom: `${((100 - band) / INDEX_TOP) * 100}%`, height: `${((2 * band) / INDEX_TOP) * 100}%` }" aria-hidden="true">
            <small>{{ bandLabel }} {{ 100 - band }}–{{ 100 + band }}</small>
          </span>
          <div class="cmp-cols">
            <button
              v-for="item in points"
              :key="item.key"
              type="button"
              :class="['cmp-col', item.tone, { on: active === item.key, derived: item.derived }]"
              :aria-label="item.detail"
              @pointerenter="active = item.key" @pointerleave="active = ''" @focus="active = item.key" @blur="active = ''"
            >
              <span :class="['cmp-point', { clamped: item.clamped }]" :style="{ bottom: `${(item.y / INDEX_TOP) * 100}%` }">
                <i class="cmp-dot" aria-hidden="true"></i>
                <em v-if="!item.inBand || active === item.key" class="cmp-dot-label">{{ formatIndex(item.index) }}{{ item.clamped ? ' ▲' : '' }}</em>
              </span>
            </button>
          </div>
        </div>
      </div>
      <div class="cmp-xaxis" aria-hidden="true"><span v-for="item in points" :key="item.key" :class="{ derived: item.derived }">{{ item.axis }}</span></div>
    </div>

    <!-- Säulen: Abweichung in % um die Null -->
    <div v-else class="cmp-plot">
      <div class="cmp-stage">
        <div class="cmp-yaxis" aria-hidden="true">
          <em v-for="tick in columns.ticks" :key="tick" :style="{ bottom: `${50 + (tick / columns.scale) * 50}%` }">{{ tick > 0 ? '+' : tick < 0 ? '−' : '' }}{{ Math.abs(tick) }} %</em>
        </div>
        <div class="cmp-area">
          <i v-for="tick in columns.ticks" :key="tick" :class="['cmp-hline', { base: tick === 0 }]" :style="{ bottom: `${50 + (tick / columns.scale) * 50}%` }" aria-hidden="true"></i>
          <span class="cmp-band" :style="{ bottom: `${50 - Math.min(1, band / columns.scale) * 50}%`, height: `${Math.min(1, band / columns.scale) * 100}%` }" aria-hidden="true">
            <small>{{ bandLabel }} ±{{ band }} %</small>
          </span>
          <div class="cmp-cols">
            <button
              v-for="item in columns.items"
              :key="item.key"
              type="button"
              :class="['cmp-col', item.tone, { on: active === item.key, derived: item.derived }]"
              :aria-label="item.detail"
              @pointerenter="active = item.key" @pointerleave="active = ''" @focus="active = item.key" @blur="active = ''"
            >
              <span :class="['cmp-column', item.percent < 0 ? 'neg' : 'pos', { clamped: item.clamped }]" :style="{ height: `${Math.max(item.extent * 50, 0.6)}%` }">
                <em :class="['cmp-column-label', { quiet: Math.abs(item.percent) <= band && active !== item.key }]">{{ formatPercent(item.percent) }}</em>
              </span>
            </button>
          </div>
        </div>
      </div>
      <div class="cmp-xaxis" aria-hidden="true"><span v-for="item in columns.items" :key="item.key" :class="{ derived: item.derived }">{{ item.axis }}</span></div>
      <p v-if="columns.items.some((item) => item.clamped)" class="cmp-note">Säulen über ±{{ columns.scale }} % sind gekappt und schraffiert – die echte Abweichung steht daran.</p>
    </div>

    <!-- Lesehilfe; beim Zeigen auf einen Eintrag stehen an ihrer Stelle dessen Details.
         Beide liegen übereinander, damit die Karte beim Wechsel nicht springt. -->
    <div v-if="items.length && guide.steps.length" class="cmp-readout">
      <div :class="['cmp-guide', { hidden: activeItem }]">
        <div class="cmp-guide-head">
          <strong>So lesen Sie das Diagramm</strong>
          <span v-if="guide.hint" class="cmp-guide-hint">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 9.5V4.2a1.4 1.4 0 0 1 2.8 0v4.6l3.6.7c.9.2 1.5 1 1.4 1.9l-.5 4.1a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-1.6-.8L5 12.6a1.3 1.3 0 0 1 2-1.7z" /></svg>
            {{ guide.hint }}
          </span>
        </div>
        <ol class="cmp-steps">
          <li v-for="(step, index) in guide.steps" :key="step.art" class="cmp-step">
            <svg class="cmp-art" viewBox="0 0 210 60" aria-hidden="true">
              <!-- Punkte -->
              <template v-if="step.art === 'dots-base'">
                <path class="grid" d="M28 14h176M28 46h176" />
                <path class="base" d="M28 30h176" />
                <text x="4" y="33">100</text>
                <path v-for="x in [70, 116, 162]" :key="x" class="mark good" :d="diamond(x, 30)" />
              </template>
              <template v-else-if="step.art === 'dots-offset'">
                <path class="base" d="M28 30h176" />
                <text x="4" y="33">100</text>
                <path class="guide" d="M80 28V19M140 32v9" />
                <path class="mark watch" :d="diamond(80, 12)" />
                <path class="mark watch" :d="diamond(140, 48)" />
                <text class="tag" x="93" y="15">zu viel</text>
                <text class="tag" x="153" y="51">zu wenig</text>
              </template>
              <template v-else-if="step.art === 'dots-band'">
                <rect class="band" x="28" y="19" width="176" height="22" />
                <path class="base" d="M28 30h176" />
                <text x="4" y="33">100</text>
                <path v-for="[x, y] in [[58, 27], [94, 33], [130, 25]]" :key="x" class="mark good" :d="diamond(x, y)" />
                <path class="mark watch" :d="diamond(172, 51)" />
              </template>
              <!-- Säulen -->
              <template v-else-if="step.art === 'cols-base'">
                <path class="grid" d="M28 14h176M28 46h176" />
                <rect v-for="[x, h] in [[62, 3], [102, -2], [142, 2], [182, -3]]" :key="x" class="col good" :x="x - 9" :y="h > 0 ? 30 - h : 30" width="18" :height="Math.abs(h)" rx="1" />
                <path class="base" d="M28 30h176" />
                <text x="14" y="33">0</text>
              </template>
              <template v-else-if="step.art === 'cols-offset'">
                <rect class="col watch" x="70" y="8" width="20" height="22" rx="2" />
                <rect class="col watch" x="130" y="30" width="20" height="24" rx="2" />
                <path class="base" d="M28 30h176" />
                <text x="14" y="33">0</text>
                <text class="tag" x="96" y="15">zu viel</text>
                <text class="tag" x="156" y="50">zu wenig</text>
              </template>
              <template v-else-if="step.art === 'cols-band'">
                <rect class="band" x="28" y="20" width="176" height="20" />
                <rect v-for="[x, h] in [[60, 6], [96, -5], [132, 4]]" :key="x" class="col good" :x="x - 9" :y="h > 0 ? 30 - h : 30" width="18" :height="Math.abs(h)" rx="1" />
                <rect class="col watch" x="160" y="30" width="18" height="26" rx="1" />
                <path class="base" d="M28 30h176" />
                <text x="14" y="33">0</text>
              </template>
            </svg>
            <span class="cmp-step-copy">
              <strong><i>{{ index + 1 }}</i>{{ step.title }}</strong>
              <small>{{ step.text }}</small>
            </span>
          </li>
        </ol>
      </div>

      <!-- Details des gewählten Elements -->
      <div :class="['cmp-detail', activeItem?.tone, { hidden: !activeItem }]" aria-live="polite">
        <template v-if="activeItem">
          <div class="cmp-detail-head">
            <span class="cmp-detail-symbol">{{ activeItem.axis }}</span>
            <strong>{{ activeItem.name || activeItem.axis }}</strong>
            <em v-if="activeItem.toneLabel" class="cmp-detail-chip">{{ activeItem.toneLabel }}</em>
          </div>
          <dl v-if="activeItem.facts" class="cmp-facts">
            <div v-for="fact in activeItem.facts" :key="fact.label" :class="{ lead: fact.lead }"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
          </dl>
          <p v-else class="cmp-detail-text">{{ activeItem.detail }}</p>
          <small v-if="activeItem.note" class="cmp-detail-note">{{ activeItem.note }}</small>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

// Gemeinsame Karte der Diagramme im Reiter „Diagramme“: Punkte (Index, 100 = ausgewogen)
// oder Säulen (Abweichung in %). Jeder Eintrag bringt seinen Index und seinen Detailtext mit.
const props = defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  verdict: { type: Object, default: null }, // { headline, flaggedLabel, flagged: [{ key, label, value }], allGood }
  items: { type: Array, required: true }, // [{ key, axis, index, tone, derived?, detail }]
  band: { type: Number, default: 15 },
  bandLabel: { type: String, default: 'ausgewogen' },
  legend: { type: Array, default: () => [] }, // [{ tone, label }]
  legendTitle: { type: String, default: 'Bewertung' },
  orderLabel: { type: String, default: 'Laborreihenfolge' },
  dotsHint: { type: String, default: 'Index – 100 ist ausgewogen' },
  columnsHint: { type: String, default: 'Abweichung in % als Säulen' },
  // Lesehilfe je Darstellung: { hint, steps: [{ art, title, text }] }; art ist eine der kleinen Skizzen unten.
  dotsGuide: { type: Object, default: () => ({ hint: '', steps: [] }) },
  columnsGuide: { type: Object, default: () => ({ hint: '', steps: [] }) },
  emptyLabel: { type: String, default: 'Für dieses Diagramm liegen keine auswertbaren Werte vor.' },
})

const MODES = [{ key: 'dots', label: 'Punkte' }, { key: 'columns', label: 'Säulen' }]
const INDEX_TOP = 200
const INDEX_TICKS = [0, 50, 100, 150, 200]
const PERCENT_SCALES = [5, 10, 20, 30, 50]

const mode = ref('dots')
const sort = ref('given')
const active = ref('')

const points = computed(() => props.items.map((item) => ({
  ...item,
  y: Math.min(item.index, INDEX_TOP),
  clamped: item.index > INDEX_TOP,
  inBand: Math.abs(item.index - 100) <= props.band,
})))

const columns = computed(() => {
  const withPercent = props.items.map((item) => ({ ...item, percent: item.index - 100 }))
  const largest = Math.max(0, ...withPercent.map((item) => Math.abs(item.percent)))
  const scale = PERCENT_SCALES.find((step) => step >= largest) || PERCENT_SCALES.at(-1)
  const items = withPercent.map((item) => ({ ...item, extent: Math.min(1, Math.abs(item.percent) / scale), clamped: Math.abs(item.percent) > scale }))
  if (sort.value === 'deviation') items.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent))
  return { scale, ticks: [-scale, -scale / 2, 0, scale / 2, scale], items }
})

const activeItem = computed(() => props.items.find((item) => item.key === active.value) || null)
const guide = computed(() => (mode.value === 'dots' ? props.dotsGuide : props.columnsGuide))

// Raute wie die Punkte im Diagramm, für die Skizzen der Lesehilfe.
function diamond(x, y, r = 7) {
  return `M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`
}

function formatIndex(value) {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function formatPercent(value) {
  const abs = Math.abs(value)
  const text = abs.toLocaleString('de-DE', { maximumFractionDigits: abs < 10 ? 1 : 0 })
  return `${value > 0.05 ? '+' : value < -0.05 ? '−' : '±'}${text} %`
}
</script>

<style scoped>
.cmp {
  --good: #1baf7a; --good-soft: rgba(27,175,122,0.16);
  --watch: #e9a21b; --watch-soft: rgba(233,162,27,0.18);
  --critical: #e0503f; --critical-soft: rgba(224,80,63,0.16);
  display: grid; gap: 16px; min-width: 0; padding: 22px 24px; border: 1px solid var(--border); border-radius: 18px; background: #fff;
  container-type: inline-size;
}
.cmp-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px 20px; }
.cmp-title { min-width: 0; flex: 1 1 360px; }
.cmp-eyebrow { display: block; color: var(--brand-blue); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.cmp-head h3 { margin-top: 4px; color: var(--text); font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.cmp-verdict { margin-top: 6px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
.cmp-verdict strong.ok { color: #047857; }
.cmp-verdict strong.warn { color: var(--text); }
.cmp-verdict b { color: var(--text); font-weight: 700; }

.cmp-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.cmp-seg { display: inline-flex; flex-wrap: wrap; max-width: 100%; gap: 3px; padding: 3px; border-radius: 11px; background: #eef3f8; }
.cmp-seg button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 12px; border: 0; border-radius: 8px; background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.cmp-seg button svg { width: 17px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.cmp-seg button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 1px 3px rgba(10,27,67,0.12); }
.cmp-seg button:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.cmp-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0 0 0 auto; padding: 0; list-style: none; }
.cmp-legend li { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; color: var(--text-muted); font-size: 11.5px; font-weight: 600; }
.cmp-legend i { width: 10px; height: 10px; border-radius: 3px; }
.cmp-legend i.good { background: var(--good); } .cmp-legend i.watch { background: var(--watch); } .cmp-legend i.critical { background: var(--critical); }

.cmp-empty { padding: 16px; border: 1px dashed var(--border); border-radius: 12px; color: var(--text-muted); font-size: 12px; }
/* Lesehilfe und Details teilen sich eine Fläche – beim Zeigen springt nichts */
.cmp-readout { display: grid; padding: 14px; border: 1px solid #e3edf7; border-radius: 16px; background: linear-gradient(135deg, #f6fafe 0%, #eef6fd 100%); }
.cmp-readout > div { grid-area: 1 / 1; min-width: 0; transition: opacity .18s ease, transform .18s ease; }
.cmp-readout > div.hidden { visibility: hidden; opacity: 0; transform: translateY(3px); }
.cmp-guide { display: grid; gap: 12px; }
.cmp-guide-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; }
.cmp-guide-head > strong { color: var(--text); font-size: 13px; font-weight: 800; }
.cmp-guide-hint { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border-radius: 999px; background: #fff; box-shadow: 0 1px 3px rgba(10,27,67,0.08); color: var(--brand-blue); font-size: 11.5px; font-weight: 700; }
.cmp-guide-hint svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
.cmp-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.cmp-step { display: grid; align-content: start; gap: 10px; min-width: 0; padding: 10px 10px 12px; border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgba(10,27,67,0.06), 0 6px 16px rgba(10,27,67,0.04); }
.cmp-art { display: block; width: 100%; height: auto; border-radius: 8px; background: #f7fafd; }
.cmp-art .grid { stroke: #e3eaf1; stroke-width: 1; }
.cmp-art .base { stroke: #0a1b43; stroke-width: 1.2; opacity: .55; }
.cmp-art .guide { stroke: var(--watch); stroke-width: 1.2; stroke-dasharray: 2 2; }
.cmp-art .band { fill: rgba(27,175,122,0.14); stroke: rgba(27,175,122,0.4); stroke-width: .8; }
.cmp-art .mark { stroke: #fff; stroke-width: 1.6; stroke-linejoin: round; filter: drop-shadow(0 1px 1px rgba(10,27,67,0.22)); }
.cmp-art .mark.good, .cmp-art .col.good { fill: var(--good); }
.cmp-art .mark.watch, .cmp-art .col.watch { fill: var(--watch); }
.cmp-art text { fill: #7d8b99; font-size: 9px; font-weight: 700; }
.cmp-art text.tag { fill: #9a4d0a; font-size: 9px; }
.cmp-step-copy { display: grid; gap: 4px; padding: 0 2px; }
.cmp-step-copy strong { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 13px; font-weight: 800; }
.cmp-step-copy strong i { display: grid; flex: none; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: var(--brand-blue); color: #fff; font-size: 10.5px; font-style: normal; font-weight: 800; }
.cmp-step-copy small { color: var(--text-muted); font-size: 12px; line-height: 1.5; }

.cmp-detail { --tone: var(--good); display: grid; align-self: center; gap: 12px; padding: 4px 4px 4px 14px; border-left: 4px solid var(--tone); }
.cmp-detail.watch { --tone: var(--watch); }
.cmp-detail.critical { --tone: var(--critical); }
.cmp-detail-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.cmp-detail-symbol { display: grid; place-items: center; min-width: 40px; height: 40px; padding: 0 6px; border-radius: 11px; background: color-mix(in srgb, var(--tone) 14%, #fff); color: color-mix(in srgb, var(--tone) 75%, #0a1b43); font-size: 14px; font-weight: 800; }
.cmp-detail-head strong { color: var(--text); font-size: 17px; font-weight: 800; }
.cmp-detail-chip { padding: 3px 10px; border-radius: 999px; background: color-mix(in srgb, var(--tone) 14%, #fff); color: color-mix(in srgb, var(--tone) 70%, #0a1b43); font-size: 11px; font-style: normal; font-weight: 700; }
.cmp-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin: 0; }
.cmp-facts div { padding: 9px 12px; border-radius: 10px; background: #fff; box-shadow: 0 1px 2px rgba(10,27,67,0.06); }
.cmp-facts dt { color: var(--text-muted); font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
.cmp-facts dd { margin: 3px 0 0; color: var(--text); font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.cmp-facts .lead dd { color: color-mix(in srgb, var(--tone) 75%, #0a1b43); }
.cmp-detail-text { color: var(--text); font-size: 13px; font-weight: 600; }
.cmp-detail-note { color: var(--text-muted); font-size: 11.5px; }
.cmp-note { margin-top: 6px; color: var(--text-muted); font-size: 11.5px; line-height: 1.45; }

/* Kundenansichten: Spalten je Element über einer gemeinsamen y-Achse */
.cmp-plot { display: grid; gap: 6px; min-width: 0; }
.cmp-stage { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 10px; height: 300px; }
.cmp-yaxis { position: relative; }
.cmp-yaxis em { position: absolute; right: 0; color: var(--text-muted); font-size: 10.5px; font-style: normal; font-weight: 600; font-variant-numeric: tabular-nums; transform: translateY(50%); }
.cmp-area { position: relative; border-left: 1px solid #cfd8e2; border-bottom: 1px solid #cfd8e2; }
.cmp-hline { position: absolute; right: 0; left: 0; height: 0; border-top: 1px solid #edf1f5; }
.cmp-hline.base { border-top: 1.5px solid #9fb0c2; }
.cmp-band { position: absolute; right: 0; left: 0; background: rgba(27,175,122,0.10); box-shadow: inset 0 1px 0 rgba(27,175,122,0.35), inset 0 -1px 0 rgba(27,175,122,0.35); }
.cmp-band small { position: absolute; top: 3px; left: 6px; color: #2f855a; font-size: 10px; font-weight: 700; }
.cmp-cols { position: absolute; inset: 0; display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; }
.cmp-col { position: relative; padding: 0; border: 0; background: transparent; cursor: pointer; }
.cmp-col::before { position: absolute; inset: 0 3px; border-radius: 6px; background: transparent; content: ''; transition: background .15s; }
.cmp-col:hover::before, .cmp-col.on::before { background: rgba(0,114,206,0.05); }
.cmp-col:focus-visible { outline: none; box-shadow: var(--shadow-focus); border-radius: 6px; }
.cmp-point { position: absolute; left: 50%; width: 0; height: 0; transition: bottom .4s cubic-bezier(.22,.8,.3,1); }
.cmp-dot { position: absolute; top: -7.5px; left: -7.5px; width: 15px; height: 15px; border: 2.5px solid #fff; border-radius: 4px; background: var(--good); box-shadow: 0 1px 3px rgba(10,27,67,0.25); transform: rotate(45deg); transition: transform .15s; }
.cmp-col.watch .cmp-dot { background: var(--watch); }
.cmp-col.critical .cmp-dot { background: var(--critical); }
.cmp-col.on .cmp-dot { transform: rotate(45deg) scale(1.25); }
.cmp-col.derived .cmp-dot { background: #fff; border-color: var(--good); }
.cmp-col.derived.watch .cmp-dot { border-color: var(--watch); }
.cmp-col.derived.critical .cmp-dot { border-color: var(--critical); }
.cmp-dot-label { position: absolute; bottom: 12px; left: 0; color: var(--text); font-size: 10.5px; font-style: normal; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; transform: translateX(-50%); }
.cmp-point.clamped .cmp-dot-label { bottom: auto; top: 12px; }
.cmp-column { position: absolute; left: 22%; right: 22%; background: var(--good); transition: height .4s cubic-bezier(.22,.8,.3,1); }
.cmp-column.pos { bottom: 50%; border-radius: 4px 4px 0 0; }
.cmp-column.neg { top: 50%; border-radius: 0 0 4px 4px; }
.cmp-col.watch .cmp-column { background: var(--watch); }
.cmp-col.critical .cmp-column { background: var(--critical); }
.cmp-col.derived .cmp-column { opacity: .55; }
.cmp-col .cmp-column.clamped { background-image: repeating-linear-gradient(115deg, rgba(255,255,255,0.5) 0 4px, transparent 4px 9px); }
.cmp-column-label { position: absolute; left: 50%; color: var(--text); font-size: 10.5px; font-style: normal; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; transform: translateX(-50%); }
.cmp-column.pos .cmp-column-label { bottom: calc(100% + 3px); }
.cmp-column.neg .cmp-column-label { top: calc(100% + 3px); }
.cmp-xaxis { display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; margin-left: 62px; }
.cmp-xaxis span { color: var(--text); font-size: 12px; font-weight: 700; text-align: center; }
.cmp-xaxis span.derived { color: var(--text-muted); font-style: italic; }

/* Schmal: Name und Prozent oben, die Achse darunter über die volle Breite */
@container (max-width: 560px) {
  .cmp-readout { padding: 12px; }
  .cmp-steps { grid-template-columns: 1fr; gap: 8px; }
  .cmp-step { gap: 8px; padding: 8px 8px 10px; }
  .cmp-readout > .cmp-detail { align-self: start; }
  .cmp-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cmp { padding: 18px 14px; }
  .cmp-seg { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
  .cmp-seg button { justify-content: center; padding: 0 8px; white-space: normal; text-align: center; line-height: 1.2; }
    .cmp-legend { margin-left: 0; }
  .cmp-stage { grid-template-columns: 34px minmax(0, 1fr); gap: 6px; height: 240px; }
  .cmp-xaxis { margin-left: 40px; }
  .cmp-xaxis span { font-size: 10.5px; }
  .cmp-dot { top: -5.5px; left: -5.5px; width: 11px; height: 11px; border-width: 2px; }
  .cmp-column-label, .cmp-dot-label { font-size: 9px; }
  .cmp-band small { display: none; }
  /* Wenig Platz: Beschriftung nur außerhalb des ausgewogenen Bereichs oder beim gewählten Element */
  .cmp-column-label.quiet { display: none; }
}
@media (prefers-reduced-motion: reduce) { .cmp-column, .cmp-point, .cmp-dot, .cmp-readout > div { transition: none; } }
</style>
