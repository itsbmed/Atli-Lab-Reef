<template>
  <section class="balance-chart">
    <header class="balance-head">
      <div>
        <span class="balance-eyebrow">{{ eyebrow }}</span>
        <h3>{{ title }}</h3>
      </div>
      <p v-if="description">{{ description }}</p>
    </header>

    <div v-if="!rows.length" class="balance-empty">{{ emptyLabel }}</div>

    <div v-else class="balance-body">
      <div class="balance-axis" aria-hidden="true">
        <span class="axis-side">{{ labels.left }}</span>
        <span class="axis-line"><i></i><b>{{ labels.center }}</b><i></i></span>
        <span class="axis-side">{{ labels.right }}</span>
      </div>

      <ol class="balance-rows">
        <li
          v-for="row in rows"
          :key="row.key"
          :class="['balance-row', variant, row.tone, { banded: row.endsBand }]"
        >
          <span class="row-lead">{{ row.leadLabel }}</span>

          <span class="row-track">
            <i class="row-centre" aria-hidden="true"></i>
            <i
              :class="['row-arrow', row.pointsLeft ? 'to-left' : 'to-right', { clamped: row.clamped }]"
              :style="{ width: `${Math.max(row.extent * 50, 1.6)}%` }"
            ></i>
            <span class="row-reading">{{ row.readingLabel }}</span>
          </span>

          <span class="row-trail">{{ row.trailLabel }}</span>

          <span v-if="row.endsBand && row.bandLabel" class="row-band" aria-hidden="true">
            <b>−{{ row.bandLabel }}</b>
            <b>{{ row.bandLabel }}</b>
          </span>
        </li>
      </ol>

      <p class="balance-foot">
        <span>{{ footLabel }}</span>
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'composition' },
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  description: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  labels: { type: Object, default: () => ({ left: 'niedrig', center: 'natürlich', right: 'hoch' }) },
  unit: { type: String, default: '' },
  footLabel: { type: String, default: '' },
  emptyLabel: { type: String, default: 'Für dieses Diagramm liegen keine auswertbaren Werte vor.' },
})

function germanNumber(value, digits = 2) {
  return Number(value).toLocaleString('de-DE', { maximumFractionDigits: digits })
}

// Beide Varianten teilen dieselbe Geometrie; nur Beschriftung und Lesewert
// unterscheiden sich, deshalb werden sie hier auf eine Form gebracht.
const rows = computed(() => props.items.map((item) => {
  if (props.variant === 'pair') {
    return {
      ...item,
      leadLabel: item.leftLabel,
      trailLabel: item.rightLabel,
      pointsLeft: item.direction === 'left',
      readingLabel: `${item.percent >= 0 ? '+' : '−'}${germanNumber(Math.abs(item.percent), 0)} %`,
      bandLabel: '',
      endsBand: false,
    }
  }
  return {
    ...item,
    leadLabel: item.symbol,
    trailLabel: '',
    pointsLeft: item.direction === 'low',
    readingLabel: `${item.delta >= 0 ? '+' : '−'}${germanNumber(Math.abs(item.delta), Math.abs(item.delta) < 10 ? 2 : 0)}`,
    bandLabel: germanNumber(item.scale, 0),
  }
}))
</script>

<style scoped>
.balance-chart {
  --teal: #7ecac0;
  --teal-ink: #0f766e;
  --sand: #ded9a8;
  --sand-ink: #8a7b2f;
  --rose: #e9a9a4;
  --rose-ink: #b3392c;
  padding: 20px 22px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #fff;
}
.balance-head { display: flex; flex-wrap: wrap; gap: 10px 24px; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
.balance-eyebrow { display: block; color: var(--brand-blue); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.balance-head h3 { margin-top: 4px; color: var(--text); font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
.balance-head p { flex: 1 1 280px; max-width: 46ch; color: var(--text-muted); font-size: 13px; font-weight: 600; line-height: 1.55; }
.balance-empty { padding: 16px; border: 1px dashed var(--border); border-radius: 12px; color: var(--text-muted); font-size: 11.5px; font-weight: 600; }

/* Achsenkopf: links niedrig, Mitte Referenz, rechts hoch. */
.balance-axis { display: grid; grid-template-columns: var(--lead, 54px) minmax(0, 1fr) var(--trail, 54px); gap: 10px; align-items: center; margin-bottom: 10px; }
.axis-side { color: var(--rose-ink); font-size: 11px; font-weight: 800; }
.balance-axis .axis-side:first-child { text-align: right; }
.axis-line { display: grid; grid-template-columns: 1fr auto 1fr; gap: 9px; align-items: center; }
.axis-line i { height: 1px; background: #c3ced9; }
.axis-line i:first-child { box-shadow: inset 4px 0 0 -2px #c3ced9; }
.axis-line b { color: var(--teal-ink); font-size: 11px; font-weight: 800; }

.balance-rows { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.balance-row {
  display: grid;
  grid-template-columns: var(--lead, 54px) minmax(0, 1fr) var(--trail, 54px);
  gap: 10px;
  align-items: center;
  padding: 3px 0;
}
.balance-row.pair { --lead: 82px; --trail: 82px; }
.row-lead { color: var(--text); font-size: 12.5px; font-weight: 800; text-align: right; }
.row-trail { color: var(--text); font-size: 12.5px; font-weight: 800; }

.row-track { position: relative; display: block; height: 26px; }
/* Die gestrichelte Mittellinie ist der Referenzwert des Labors. */
.row-centre { position: absolute; left: 50%; top: -2px; bottom: -2px; width: 0; border-left: 1px dashed #9fb0c2; }
.row-arrow {
  position: absolute;
  top: 50%;
  height: 17px;
  transform: translateY(-50%);
  background: var(--teal);
  transition: width 0.45s cubic-bezier(0.22, 0.8, 0.3, 1);
}
.balance-row.watch .row-arrow { background: var(--sand); }
.balance-row.critical .row-arrow { background: var(--rose); }
/* Pfeilspitze per clip-path – bleibt bei jeder Breite unverzerrt. */
.row-arrow.to-right {
  left: 50%;
  clip-path: polygon(0 24%, calc(100% - 11px) 24%, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, calc(100% - 11px) 76%, 0 76%);
}
.row-arrow.to-left {
  right: 50%;
  clip-path: polygon(100% 24%, 11px 24%, 11px 0, 0 50%, 11px 100%, 11px 76%, 100% 76%);
}
/* Ein abgeschnittener Balken bekommt eine Schraffur statt einer stillen Lüge. */
.row-arrow.clamped {
  background-image: repeating-linear-gradient(115deg, rgba(255,255,255,0.55) 0 4px, transparent 4px 9px);
}
.row-reading {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.balance-row.pair .row-reading { right: -4px; }

/* Maßstab der Größenordnung, unter der letzten Zeile ihrer Gruppe. */
.row-band {
  grid-column: 2;
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 5px;
  border-top: 1px solid #dde5ee;
  color: var(--text-muted);
  font-size: 9.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.balance-foot { margin-top: 10px; color: var(--text-muted); font-size: 10px; font-weight: 700; text-align: center; }

@media (max-width: 640px) {
  .balance-row,
  .balance-axis { --lead: 40px; --trail: 40px; }
  .balance-row.pair { --lead: 62px; --trail: 62px; }
  .row-reading { display: none; }
}
</style>
