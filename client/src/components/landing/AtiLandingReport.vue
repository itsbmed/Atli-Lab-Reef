<template>
<section id="report" class="report">
  <div class="sec-head center" data-reveal>
    <span class="eyebrow"><i></i> Nach dem Labor</span>
    <h2>Ihr Wasserbericht, der mitdenkt.</h2>
    <p>Jeder Wert wird in einen Zielbereich eingeordnet, im Verlauf gezeigt und mit einer Empfehlung verknüpft.</p>
  </div>

  <div class="report-card" data-reveal>
    <div class="rc-head">
      <div>
        <span>Riffaquarium · 320 L</span>
        <strong>Analyse vom 24. Mai 2026</strong>
      </div>
      <div class="rc-score">
        <em>Gesamtstatus</em>
        <b>Gut</b>
      </div>
    </div>

    <div class="rc-grid">
      <!-- parameter gauges -->
      <div class="rc-params">
        <div class="param" v-for="p in reportParams" :key="p.sym" :class="'is-' + p.status">
          <div class="param-top">
            <span class="param-sym">{{ p.sym }}</span>
            <span class="param-name">{{ p.name }}</span>
            <span class="param-val">{{ p.value }} <i>{{ p.unit }}</i></span>
          </div>
          <div class="track">
            <span class="band" :style="{ left: p.band[0] + '%', right: 100 - p.band[1] + '%' }"></span>
            <span class="marker" :style="{ left: p.pos + '%' }"></span>
          </div>
          <span class="param-status">{{ statusLabel[p.status] }}</span>
        </div>
      </div>

      <!-- trend + recommendations -->
      <aside class="rc-side">
        <div class="trend">
          <header>
            <span>Karbonathärte · Verlauf</span>
            <b>7,2 °dKH</b>
          </header>
          <svg viewBox="0 0 260 96" preserveAspectRatio="none" class="spark">
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="rgba(0,114,206,0.28)" />
                <stop offset="1" stop-color="rgba(0,114,206,0)" />
              </linearGradient>
            </defs>
            <path :d="sparkFill" fill="url(#sparkFill)" />
            <path :d="sparkLine" fill="none" stroke="var(--brand-blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <circle :cx="sparkLast.x" :cy="sparkLast.y" r="4.5" fill="#fff" stroke="var(--brand-blue)" stroke-width="3" />
          </svg>
          <div class="trend-foot"><span>Feb</span><span>Mär</span><span>Apr</span><span>Mai</span></div>
        </div>

        <div class="recos">
          <div class="reco" v-for="r in recommendations" :key="r.title" :class="'tone-' + r.tone">
            <div class="reco-main">
              <span class="reco-tag">{{ r.tag }}</span>
              <strong>{{ r.title }}</strong>
              <p>{{ r.text }}</p>
              <span v-if="r.product" class="reco-prod-name">→ {{ r.product.name }}</span>
            </div>
            <img v-if="r.product" class="reco-prod" :src="r.product.img" :alt="r.product.name" loading="lazy" />
          </div>
        </div>
      </aside>
    </div>
  </div>

  <!-- element strip -->
  <div class="elements" data-reveal>
    <div class="elements-copy">
      <strong>Über 40 Parameter im Blick.</strong>
      <span>Und die passenden ATI Elements zum gezielten Nachdosieren.</span>
    </div>
    <ul class="element-row">
      <li v-for="el in elementStrip" :key="el.sym">
        <img :src="el.img" :alt="el.name" loading="lazy" />
        <b>{{ el.sym }}</b>
      </li>
    </ul>
  </div>
  <svg class="wave-bottom" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,50 C300,10 560,80 800,52 C1040,24 1220,72 1440,40 L1440,90 L0,90 Z" />
  </svg>
</section>

</template>

<script setup>
import { computed } from 'vue'

const reportParams = [
  { name: 'Calcium', sym: 'Ca', value: '412', unit: 'mg/l', pos: 56, band: [40, 72], status: 'optimal' },
  { name: 'Magnesium', sym: 'Mg', value: '1280', unit: 'mg/l', pos: 52, band: [38, 70], status: 'optimal' },
  { name: 'Karbonathärte', sym: 'KH', value: '7,2', unit: '°dKH', pos: 26, band: [44, 74], status: 'low' },
  { name: 'Phosphat', sym: 'PO₄', value: '0,041', unit: 'mg/l', pos: 60, band: [36, 76], status: 'optimal' },
  { name: 'Nitrat', sym: 'NO₃', value: '12', unit: 'mg/l', pos: 50, band: [34, 72], status: 'optimal' },
  { name: 'Jod', sym: 'I', value: '0,09', unit: 'mg/l', pos: 83, band: [40, 70], status: 'watch' },
]
const statusLabel = { optimal: 'Optimal', low: 'Zu niedrig', watch: 'Beobachten', high: 'Kritisch' }

const recommendations = [
  { tag: 'Priorität', tone: 'warn', title: 'Karbonathärte anheben', text: 'KH liegt unter dem Zielbereich. Über 5 Tage langsam nachdosieren.', product: { name: 'ATI Elements · ALK/KH', img: '/ati/el-alk.png' } },
  { tag: 'Beobachten', tone: 'watch', title: 'Jod im Blick behalten', text: 'Leicht erhöht. Wasserwechsel prüfen, in 2 Wochen erneut testen.', product: { name: 'ATI Elements · Jod', img: '/ati/el-i.png' } },
  { tag: 'Stabil', tone: 'ok', title: 'Calcium & Magnesium', text: 'Beide Leitwerte stabil im optimalen Bereich. Dosierung beibehalten.', product: null },
]

const elementStrip = [
  { sym: 'Ca', name: 'Calcium', img: '/ati/el-ca.png' },
  { sym: 'Mg', name: 'Magnesium', img: '/ati/el-mg.png' },
  { sym: 'KH', name: 'Alkalinität', img: '/ati/el-alk.png' },
  { sym: 'I', name: 'Jod', img: '/ati/el-i.png' },
  { sym: 'Sr', name: 'Strontium', img: '/ati/el-sr.png' },
  { sym: 'K', name: 'Kalium', img: '/ati/el-k.png' },
  { sym: 'Fe', name: 'Eisen', img: '/ati/el-fe.png' },
]
const trendVals = [8.6, 8.1, 7.7, 7.9, 7.4, 7.2]
const sparkPts = computed(() => {
  const w = 260, h = 96, pad = 8
  const min = Math.min(...trendVals) - 0.4
  const max = Math.max(...trendVals) + 0.4
  return trendVals.map((v, i) => ({
    x: pad + (i * (w - pad * 2)) / (trendVals.length - 1),
    y: h - pad - ((v - min) / (max - min)) * (h - pad * 2),
  }))
})
const sparkLine = computed(() => sparkPts.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const sparkFill = computed(() => `${sparkLine.value} L252,88 L8,88 Z`)
const sparkLast = computed(() => sparkPts.value[sparkPts.value.length - 1])
</script>

<style scoped>
/* ════════════════════  REPORT  ════════════════════ */
.report {
  padding: clamp(72px, 10vh, 150px) clamp(18px, 5vw, 64px);
  background: #e9f1fb;
}
.report-card {
  max-width: 1080px;
  margin: 0 auto;
  border-radius: 30px;
  background: #fff;
  border: 1px solid rgba(0,114,206,0.12);
  box-shadow: 0 40px 110px rgba(10,27,67,0.14);
  overflow: hidden;
}
.rc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 24px clamp(22px, 3vw, 34px);
  background: linear-gradient(120deg, #0A1B43, #003366);
  color: #fff;
}
.rc-head span { display: block; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--brand-sky); font-weight: var(--fw-bold); }
.rc-head strong { display: block; margin-top: 4px; font-size: clamp(18px, 2.4vw, 24px); font-weight: var(--fw-heading-strong); letter-spacing: -0.02em; }
.rc-score { text-align: right; }
.rc-score em { display: block; font-size: 11px; font-style: normal; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.08em; }
.rc-score b {
  display: inline-flex;
  margin-top: 5px;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: var(--fw-bold);
  background: rgba(0,190,208,0.22);
  color: var(--brand-cyan);
}
.rc-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: clamp(20px, 3vw, 38px);
  padding: clamp(24px, 3vw, 38px);
}
.rc-params { display: grid; gap: 20px; align-content: start; }
.param-top {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 9px;
}
.param-sym {
  font-size: 12px;
  font-weight: var(--fw-bold);
  color: var(--brand-blue);
  background: rgba(0,114,206,0.09);
  border-radius: 7px;
  text-align: center;
  padding: 3px 0;
}
.param-name { font-size: 14px; font-weight: var(--fw-semibold); color: var(--brand-dark); }
.param-val { font-size: 14px; font-weight: var(--fw-bold); color: var(--brand-dark); font-variant-numeric: tabular-nums; }
.param-val i { font-style: normal; font-size: 11px; color: var(--text-muted); font-weight: var(--fw-medium); }
.param .track { height: 9px; }
.param-status {
  display: inline-block;
  margin-top: 7px;
  font-size: 11.5px;
  font-weight: var(--fw-bold);
}
.param.is-optimal .param-status { color: var(--cyan-600); }
.param.is-low .param-status { color: var(--brand-blue); }
.param.is-watch .param-status { color: var(--amber); }
.param.is-high .param-status { color: var(--coral); }

.rc-side { display: grid; gap: 18px; align-content: start; }
.trend {
  padding: 18px;
  border-radius: 18px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
}
.trend header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.trend header span { font-size: 12px; color: var(--text-muted); font-weight: var(--fw-semibold); }
.trend header b { font-size: 15px; font-weight: var(--fw-heading-strong); color: var(--brand-dark); }
.spark { width: 100%; height: 90px; display: block; }
.trend-foot { display: flex; justify-content: space-between; margin-top: 6px; }
.trend-foot span { font-size: 10.5px; color: var(--text-muted); font-weight: var(--fw-medium); }
.recos { display: grid; gap: 10px; }
.reco {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--border);
  border-left-width: 4px;
  background: #fff;
}
.reco-main { flex: 1; min-width: 0; }
.reco-prod {
  flex: 0 0 auto;
  width: 54px;
  height: 54px;
  object-fit: contain;
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 5px;
  border: 1px solid var(--border);
}
.reco-prod-name {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: var(--fw-bold);
  color: var(--brand-blue);
}
.reco-tag {
  display: inline-flex;
  font-size: 10px;
  font-weight: var(--fw-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.reco strong { display: block; font-size: 14px; font-weight: var(--fw-bold); color: var(--brand-dark); }
.reco p { margin-top: 4px; font-size: 12.5px; line-height: 1.5; color: var(--text-muted); }
.reco.tone-warn { border-left-color: var(--brand-orange); }
.reco.tone-warn .reco-tag { color: var(--brand-orange); }
.reco.tone-watch { border-left-color: var(--amber); }
.reco.tone-watch .reco-tag { color: var(--amber); }
.reco.tone-ok { border-left-color: var(--brand-cyan); }
.reco.tone-ok .reco-tag { color: var(--cyan-600); }

/* ── element strip ── */
.elements {
  max-width: 1080px;
  margin: 28px auto 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 18px 28px;
  padding: 22px clamp(20px, 3vw, 32px);
  border-radius: 24px;
  background: linear-gradient(120deg, #0A1B43, #003366);
  color: #fff;
}
.elements-copy strong { display: block; font-size: 18px; font-weight: var(--fw-heading-strong); letter-spacing: -0.02em; }
.elements-copy span { display: block; margin-top: 3px; font-size: 13.5px; color: rgba(255,255,255,0.66); }
.element-row { display: flex; flex-wrap: wrap; gap: 10px; list-style: none; }
.element-row li {
  position: relative;
  width: 58px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(255,255,255,0.94);
  box-shadow: 0 12px 26px rgba(0,0,0,0.22);
  transition: transform 0.2s;
}
.element-row li:hover { transform: translateY(-5px); }
.element-row img { width: 100%; height: 100%; object-fit: contain; padding: 6px 4px 14px; }
.element-row b {
  position: absolute;
  bottom: 5px;
  font-size: 10px;
  font-weight: var(--fw-bold);
  color: var(--brand-blue);
}

.report { --surface-soft: #f5f8fc; --coral: #e85d4f; }
.report .wave-bottom { fill: #ffffff; }
@media (max-width: 1080px) { .rc-grid { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .elements { flex-direction: column; align-items: flex-start; } .element-row { justify-content: center; } }
</style>
