<template>
  <div class="tools-page">
    <section class="tools-hero">
      <div>
        <span class="hero-kicker">ATI Workbench</span>
        <h1>Laborwerte in Entscheidungen verwandeln</h1>
        <p>Wasserwechsel simulieren, Verbrauch bestimmen und Verläufe vergleichen. Mit Beispiel-Daten, aber echter Produktlogik zum Testen.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" @click="activeTool = 'waterchange'">Wasserwechsel simulieren</button>
          <RouterLink to="/tools/trends" class="btn btn-ghost">Trenddiagramme öffnen</RouterLink>
        </div>
      </div>
      <div class="hero-readout">
        <div class="readout-ring" :style="workbenchRingStyle">
          <strong>{{ workbenchScore }}</strong>
          <span>%</span>
        </div>
        <div>
          <span>Workbench readiness</span>
          <strong>{{ selectedProfile.name }}</strong>
          <em>{{ selectedProfile.net_volume }} L · {{ activeToolLabel }}</em>
        </div>
      </div>
    </section>

    <div class="tool-tabs">
      <button v-for="tool in tools" :key="tool.key" :class="['tool-tab', { active: activeTool === tool.key }]" @click="activeTool = tool.key">
        <span class="tool-tab-icon">
          <svg v-if="tool.key === 'waterchange'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7l5.7 7.6a7 7 0 1 1-11.4 0z"/><path d="M9 14.5a3 3 0 0 0 3 3"/></svg>
          <svg v-else-if="tool.key === 'consumption'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18a9 9 0 1 1 14 0"/><path d="M12 13l3.5-3.5"/><circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none"/></svg>
          <svg v-else-if="tool.key === 'trends'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 3 8-8"/><path d="M16 7h5v5"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M9 15l2 2 4-4"/></svg>
        </span>
        <span>{{ tool.label }}</span>
        <em>{{ tool.caption }}</em>
      </button>
    </div>

    <!-- ============ WASSERWECHSEL-SIMULATOR ============ -->
    <section v-if="activeTool === 'waterchange'" class="tool-layout">
      <div class="card tool-panel">
        <div class="panel-kicker">Simulation</div>
        <h2>Wasserwechsel-Simulator</h2>
        <p class="panel-copy">Berechnet aus Aquarium, Osmosewasser und Salzquelle, wie sich die Werte nach mehreren Wasserwechseln verändern.</p>

        <div class="form-group">
          <label>Aquarium-Profil</label>
          <select v-model="selectedProfileId">
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }} · {{ p.net_volume }} L</option>
          </select>
          <small class="field-hint">Es wird automatisch die neueste Auswertung geladen.</small>
        </div>

        <div class="form-group">
          <label>Osmosewasser-Profil <em>(optional)</em></label>
          <select v-model="osmosisProfile">
            <option value="">Kein Osmosewasser</option>
            <option v-for="o in osmosisProfiles" :key="o.name" :value="o.name">{{ o.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Salzquelle</label>
          <select v-model="saltSource">
            <option v-for="salt in saltSources" :key="salt.name" :value="salt.name" :disabled="salt.soon">
              {{ salt.name }}{{ salt.soon ? ' (bald verfügbar)' : '' }}
            </option>
          </select>
        </div>
        <div v-if="activeSalt.input === 'charge'" class="form-group">
          <label>Chargen-ID</label>
          <input v-model="saltCharge" type="text" placeholder="z. B. 20042025" />
        </div>
        <div v-else-if="activeSalt.input === 'analysis'" class="form-group">
          <label>Analyse-ID der Salzanalyse</label>
          <input v-model="saltAnalysisId" type="text" placeholder="z. B. AN-10421" />
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Anzahl Wasserwechsel</label>
            <input v-model.number="waterChanges" type="number" min="1" max="12" />
          </div>
          <div class="form-group">
            <label>Ausmaß je Wechsel</label>
            <div class="input-unit">
              <input v-model.number="changeAmount" type="number" min="1" :max="changeUnit === 'pct' ? 90 : selectedProfile.net_volume" />
              <div class="unit-toggle">
                <button type="button" :class="{ active: changeUnit === 'pct' }" @click="changeUnit = 'pct'">%</button>
                <button type="button" :class="{ active: changeUnit === 'l' }" @click="changeUnit = 'l'">L</button>
              </div>
            </div>
          </div>
        </div>

        <div class="tool-summary">
          <div><strong>{{ litresPerChange }} L</strong><span>je Wechsel ({{ pctPerChange }} %)</span></div>
          <div><strong>{{ totalLitres }} L</strong><span>gesamt über {{ waterChanges }} Wechsel</span></div>
        </div>
      </div>

      <div class="card chart-card">
        <div class="chart-heading">
          <h3>Ergebnis nach {{ waterChanges }} Wechsel</h3>
          <span class="badge badge-created">{{ saltSource }}</span>
        </div>

        <div class="index-strip">
          <div class="index-box">
            <span>Wasserqualität vorher</span>
            <strong>{{ qualityBefore }} %</strong>
          </div>
          <svg class="index-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
          <div class="index-box after" :class="qualityAfter >= qualityBefore ? 'up' : 'down'">
            <span>nachher</span>
            <strong>{{ qualityAfter }} %</strong>
          </div>
        </div>

        <div class="result-strip">
          <div v-for="item in deviationSummary" :key="item.label" :class="['result-pill', item.tone]">
            <span>{{ item.label }}</span>
            <strong>{{ item.before }} → {{ item.after }}</strong>
            <em>{{ item.note }}</em>
          </div>
          <div v-if="!deviationSummary.length" class="result-pill good">
            <span>Status</span>
            <strong>Alle Werte im Zielbereich</strong>
            <em>kein dringender Wechsel nötig</em>
          </div>
        </div>

        <div class="chart-wrap">
          <Bar :data="waterChangeChartData" :options="barOptions" />
        </div>

        <div class="optimizer-note">
          <strong>Vorschlag (Kosten-Nutzen):</strong> {{ optimizationSuggestion }}
        </div>
        <p class="disclaimer">
          Das Endergebnis hängt davon ab, wie sich die Werte seit der Probenentnahme verändert haben
          (Zeitkomponente) und wie genau die übrigen Einflussgrößen erfasst wurden. Es wird keine
          Gewähr für die Richtigkeit übernommen.
        </p>
      </div>
    </section>

    <!-- ============ VERBRAUCH / REZEPTFINDER ============ -->
    <section v-else-if="activeTool === 'consumption'" class="tool-layout">
      <div class="card tool-panel">
        <div class="panel-kicker">Verbrauch &amp; Rezept</div>
        <h2>Rezeptfinder</h2>
        <p class="panel-copy">Ermittelt aus mindestens zwei Analysen den Verbrauch je Element und berechnet die nötige Tages- bzw. Wochendosis zur Stabilisierung.</p>
        <div class="form-group">
          <label>Aquarium-Profil</label>
          <select v-model="selectedProfileId">
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Analyse A (älter)</label>
            <select v-model="rangeStart">
              <option value="2024-02-15">15.02.2024</option>
              <option value="2024-04-17">17.04.2024</option>
            </select>
          </div>
          <div class="form-group">
            <label>Analyse B (neuer)</label>
            <select v-model="rangeEnd">
              <option value="2024-04-17">17.04.2024</option>
              <option value="2026-05-10">10.05.2026</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Wurde zwischen den Analysen dosiert?</label>
          <div class="seg-toggle">
            <button type="button" :class="{ active: dosingMode === 'none' }" @click="dosingMode = 'none'">Nein</button>
            <button type="button" :class="{ active: dosingMode === 'once' }" @click="dosingMode = 'once'">Einmalig</button>
            <button type="button" :class="{ active: dosingMode === 'regular' }" @click="dosingMode = 'regular'">Regelmäßig</button>
          </div>
          <small class="field-hint">{{ dosingHint }}</small>
        </div>

        <div :class="['alert', intervalDays > 120 ? 'alert-warning' : 'alert-info']">
          <span>{{ intervalDays > 120 ? 'Hinweis' : 'Intervall' }}</span>
          <span>{{ intervalDays }} Tage zwischen den Analysen. {{ intervalDays > 120 ? 'Für Spurenelemente ist das Intervall zu lang.' : 'Das Intervall ist für die Berechnung gut nutzbar.' }}</span>
        </div>
      </div>

      <div class="card chart-card">
        <div class="chart-heading">
          <h3>Empfohlene Dosierung</h3>
          <span class="badge badge-ok">Verlässlichkeit {{ consumptionReliability }} %</span>
        </div>

        <div class="recipe">
          <div class="recipe-row head">
            <span>Element</span>
            <span>Verbrauch / Tag</span>
            <span>Empf. Zugabe</span>
            <span>ATI Produkt</span>
          </div>
          <div v-for="row in recipeRows" :key="row.name" class="recipe-row" :class="{ flagged: row.zero }">
            <div>
              <strong>{{ row.name }}</strong>
              <span v-if="row.zero" class="r-flag">Wert nahe 0 — ungenau</span>
            </div>
            <div class="r-val">{{ row.consumption }}</div>
            <div class="r-dose">{{ row.dose }}<small>{{ row.weekly }}</small></div>
            <div class="r-prod">{{ row.product }}</div>
          </div>
        </div>

        <p class="disclaimer">
          Die Stabilisierungsmenge entspricht dem ermittelten Verbrauch. Wird ein Element bereits
          regelmäßig dosiert, ist die bisherige Dosis um den angezeigten Wert zu erhöhen. Keine
          Gewähr für die Richtigkeit.
        </p>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip, Legend, Filler
} from 'chart.js'
import { profileApi } from '@/services/toolsData'
import '@/assets/styles/tools-base.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

const tools = [
  { key: 'waterchange', label: 'Wasserwechsel', caption: 'Simulator' },
  { key: 'consumption', label: 'Rezeptfinder', caption: 'Verbrauch + Dosis' },
]

const activeTool = ref('waterchange')
const profiles = ref([])
const selectedProfileId = ref(1)

/* water change inputs */
const osmosisProfile = ref('')
const saltSource = ref('Absolute Ocean')
const saltCharge = ref('')
const saltAnalysisId = ref('')
const waterChanges = ref(2)
const changeAmount = ref(20)
const changeUnit = ref('pct')

/* consumption inputs */
const rangeStart = ref('2024-02-15')
const rangeEnd = ref('2024-04-17')
const dosingMode = ref('none')

/* trends / dosing inputs */

const fallbackProfiles = [
  { id: 1, name: 'Riffbecken', net_volume: 500 },
  { id: 2, name: 'Pflanzenaquarium', net_volume: 250 },
]

/* Parameter des Aquariums + Zielbereiche (Norm) für den Qualitätsindex */
const wcParams = [
  { key: 'ca', label: 'Calcium', unit: 'mg/l', aquarium: 414, target: [400, 450], dec: 0 },
  { key: 'mg', label: 'Magnesium', unit: 'mg/l', aquarium: 1255, target: [1250, 1350], dec: 0 },
  { key: 'kh', label: 'Alkalinität', unit: 'dKH', aquarium: 7.3, target: [7.5, 8.5], dec: 1 },
  { key: 'no3', label: 'Nitrat', unit: 'mg/l', aquarium: 18, target: [2, 10], dec: 1 },
  { key: 'po4', label: 'Phosphat', unit: 'mg/l', aquarium: 0.17, target: [0.03, 0.1], dec: 2 },
]

/* Salzquellen — feste Werte, Charge-ID (Nyos) oder Salzanalyse (Analyse-ID) */
const saltSources = [
  { name: 'Absolute Ocean', input: 'fixed', ca: 430, mg: 1320, kh: 8.2, no3: 0, po4: 0 },
  { name: 'Nyos pure', input: 'charge', ca: 425, mg: 1300, kh: 8.0, no3: 0, po4: 0 },
  { name: 'Salzanalyse', input: 'analysis', ca: 418, mg: 1280, kh: 7.8, no3: 0.2, po4: 0.01 },
  { name: 'Balancer', input: 'balancer', soon: true, ca: 445, mg: 1360, kh: 8.6, no3: 0, po4: 0 },
]

const osmosisProfiles = [
  { name: 'Osmosewasser 1', ca: 0, mg: 0, kh: 0, no3: 0, po4: 0 },
  { name: 'Leitungswasser (Rest)', ca: 6, mg: 2, kh: 0.4, no3: 1.2, po4: 0.02 },
]

const selectedProfile = computed(() => profiles.value.find(p => String(p.id) === String(selectedProfileId.value)) || fallbackProfiles[0])
const activeSalt = computed(() => saltSources.find(s => s.name === saltSource.value) || saltSources[0])
const osmosisValues = computed(() => osmosisProfiles.find(o => o.name === osmosisProfile.value) || { ca: 0, mg: 0, kh: 0, no3: 0, po4: 0 })

const pctPerChange = computed(() => {
  const vol = selectedProfile.value.net_volume || 1
  const pct = changeUnit.value === 'pct' ? changeAmount.value : (changeAmount.value / vol) * 100
  return Math.max(1, Math.min(90, Math.round(pct)))
})
const litresPerChange = computed(() => Math.round(selectedProfile.value.net_volume * (pctPerChange.value / 100)))
const totalLitres = computed(() => litresPerChange.value * waterChanges.value)

/* neues Wasser = Osmosewasser + Salzquelle; danach iterativer Wasserwechsel */
function newWater(key) {
  return (osmosisValues.value[key] || 0) + (activeSalt.value[key] || 0)
}
function simulateValues(n, pct) {
  const p = pct / 100
  const res = {}
  wcParams.forEach((par) => {
    const nw = newWater(par.key)
    let v = par.aquarium
    for (let i = 0; i < n; i++) v = v * (1 - p) + nw * p
    res[par.key] = v
  })
  return res
}
const afterValues = computed(() => simulateValues(waterChanges.value, pctPerChange.value))

function scoreVal(v, [lo, hi]) {
  if (v >= lo && v <= hi) return 100
  const width = (hi - lo) || 1
  const dist = v < lo ? lo - v : v - hi
  return Math.max(0, Math.round(100 - (dist / width) * 55))
}
function scoreOf(values) {
  const sum = wcParams.reduce((acc, par) => acc + scoreVal(values[par.key], par.target), 0)
  return Math.round(sum / wcParams.length)
}
const qualityBefore = computed(() => scoreOf(simulateValues(0, pctPerChange.value)))
const qualityAfter = computed(() => scoreOf(afterValues.value))

function fmt(par, v) {
  return `${v.toFixed(par.dec)} ${par.unit}`
}
const deviationSummary = computed(() =>
  wcParams
    .filter(par => scoreVal(par.aquarium, par.target) < 100)
    .map((par) => {
      const after = afterValues.value[par.key]
      return {
        label: par.label,
        before: fmt(par, par.aquarium),
        after: fmt(par, after),
        tone: scoreVal(after, par.target) >= 100 ? 'good' : 'watch',
        note: `Ziel ${par.target[0]}–${par.target[1]} ${par.unit}`,
      }
    }),
)

const waterChangeChartData = computed(() => {
  const mid = (par) => (par.target[0] + par.target[1]) / 2
  const pctOf = (par, v) => Math.round((v / mid(par)) * 100)
  return {
    labels: wcParams.map(p => p.label),
    datasets: [
      { label: 'Aktuell (% vom Ziel)', data: wcParams.map(p => pctOf(p, p.aquarium)), backgroundColor: '#8be7e1', borderRadius: 8 },
      { label: 'Nach Simulation', data: wcParams.map(p => pctOf(p, afterValues.value[p.key])), backgroundColor: '#0072CE', borderRadius: 8 },
    ],
  }
})

const optimizationSuggestion = computed(() => {
  const pct = pctPerChange.value
  let n90 = null
  for (let n = 1; n <= 10; n++) {
    if (scoreOf(simulateValues(n, pct)) >= 90) { n90 = n; break }
  }
  if (n90 && waterChanges.value > n90) {
    return `Bereits ${n90} Wechsel à ${pct} % erreichen ~90 % Qualität. Weitere Wechsel kosten Wasser, bringen aber kaum Zusatznutzen.`
  }
  if (n90) {
    return `${n90} Wechsel à ${pct} % genügen für ~90 % Qualität — eine effiziente Kombination.`
  }
  return `Auch mit mehreren Wechseln bei ${pct} % bleibt die Qualität unter 90 %. Höheres Ausmaß je Wechsel oder die Ausgangswerte prüfen.`
})

/* ---------- Rezeptfinder ---------- */
const intervalDays = computed(() => Math.max(1, Math.round((new Date(rangeEnd.value) - new Date(rangeStart.value)) / 86400000)))

const dosingHint = computed(() => {
  if (dosingMode.value === 'once') return 'Die einmalige Ausgleichsdosierung wird als neuer Startwert berücksichtigt.'
  if (dosingMode.value === 'regular') return 'Die berechnete Menge wird zusätzlich zur bisherigen Dosierung empfohlen.'
  return 'Der Verbrauch wird direkt aus der Differenz beider Analysen berechnet.'
})

const elementData = [
  { name: 'Calcium', unit: 'mg/l', a: 432, b: 414, product: 'ATI Essentials Pro' },
  { name: 'Magnesium', unit: 'mg/l', a: 1325, b: 1292, product: 'ATI Magnesium' },
  { name: 'Alkalinität', unit: 'dKH', a: 8.4, b: 7.7, product: 'ATI Essentials Pro' },
  { name: 'Jod', unit: 'µg/l', a: 58, b: 2, product: 'ATI ICP Elements Jod' },
  { name: 'Eisen', unit: 'µg/l', a: 11.5, b: 4.2, product: 'ATI Daily Traces' },
]

function smartRound(n) {
  const abs = Math.abs(n)
  if (abs >= 10) return n.toFixed(0)
  if (abs >= 1) return n.toFixed(1)
  if (abs >= 0.1) return n.toFixed(2)
  return n.toFixed(3)
}

const recipeRows = computed(() =>
  elementData.map((e) => {
    const perDay = (e.a - e.b) / intervalDays.value
    const zeroLimit = e.unit === 'µg/l' ? 3 : e.unit === 'dKH' ? 0.2 : 5
    const zero = e.b <= zeroLimit
    const prefix = dosingMode.value === 'regular' ? '+' : ''
    return {
      name: e.name,
      consumption: `${smartRound(perDay)} ${e.unit}`,
      dose: `${prefix}${smartRound(perDay)} ${e.unit}/Tag`,
      weekly: `${prefix}${smartRound(perDay * 7)} ${e.unit}/Woche`,
      product: e.product,
      zero,
    }
  }),
)

const consumptionReliability = computed(() => {
  let base = Math.max(34, Math.min(98, 108 - Math.round(intervalDays.value / 3)))
  if (recipeRows.value.some(r => r.zero)) base = Math.max(30, base - 18)
  if (dosingMode.value === 'none') base = Math.min(99, base + 4)
  return base
})

/* ---------- Workbench readout ---------- */
const activeToolLabel = computed(() => tools.find(t => t.key === activeTool.value)?.label || 'Tools')
const workbenchScore = computed(() => {
  if (activeTool.value === 'waterchange') return qualityAfter.value
  if (activeTool.value === 'consumption') return consumptionReliability.value
  return 91
})
const workbenchRingStyle = computed(() => {
  const color = workbenchScore.value >= 80 ? '#0072CE' : workbenchScore.value >= 55 ? '#f59e0b' : '#e85d4f'
  return { background: `conic-gradient(${color} ${workbenchScore.value * 3.6}deg, rgba(255,255,255,0.18) 0deg)` }
})

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false } },
  scales: { x: { grid: { display: false } }, y: { grid: { color: '#eef7f9' } } },
}
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: { x: { grid: { display: false } }, y: { grid: { color: '#eef7f9' } } },
}

onMounted(async () => {
  try {
    const loaded = await profileApi.list()
    profiles.value = loaded.length ? loaded : fallbackProfiles
    selectedProfileId.value = profiles.value[0]?.id || 1
  } catch {
    profiles.value = fallbackProfiles
  }
})
</script>

<style scoped>
.tools-hero {
  display: grid;
  grid-template-columns: minmax(min(100%, 520px), 1fr) minmax(min(100%, 320px), 0.42fr);
  gap: 24px;
  align-items: stretch;
  padding: 36px;
  margin-bottom: 22px;
  border-radius: 30px;
  background:
    linear-gradient(105deg, rgba(10,27,67,0.98), rgba(10,27,67,0.9) 45%, rgba(10,27,67,0.54)),
    url('/reeftech-pattern.jpg') center bottom / cover;
  color: #fff;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  position: relative;
}
.tools-hero::after {
  content: '';
  position: absolute;
  right: 35%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(transparent, rgba(136,193,233,0.42), transparent);
}
.tools-hero > * { position: relative; z-index: 1; }
.hero-kicker {
  display: block;
  color: var(--brand-cyan);
  font-size: 11px;
  font-weight: var(--fw-heading-strong);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.tools-hero h1 {
  max-width: 760px;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 0.98;
  font-weight: var(--fw-heading-strong);
  letter-spacing: -0.055em;
  margin-bottom: 14px;
}
.tools-hero p {
  max-width: 660px;
  color: rgba(255,255,255,0.72);
  font-size: 15px;
}
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.hero-readout {
  display: grid;
  grid-template-columns: 124px 1fr;
  gap: 17px;
  align-items: center;
  padding: 22px;
  border-radius: 26px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(18px);
}
.readout-ring {
  width: 124px;
  height: 124px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  position: relative;
}
.readout-ring::after {
  content: '';
  position: absolute;
  inset: 11px;
  border-radius: 50%;
  background:
    linear-gradient(rgba(10,27,67,0.9), rgba(10,27,67,0.94)),
    url('/reeftech-pattern.jpg') center / cover;
}
.readout-ring strong,
.readout-ring span { position: relative; z-index: 1; }
.readout-ring strong { align-self: end; font-size: 38px; font-weight: var(--fw-heading-strong); letter-spacing: -0.06em; }
.readout-ring span { align-self: start; margin-top: -8px; color: rgba(255,255,255,0.62); font-size: 12px; font-weight: var(--fw-label); }
.hero-readout div:last-child span { display: block; color: var(--teal-200); font-size: 11px; font-weight: var(--fw-label); letter-spacing: 0.08em; text-transform: uppercase; }
.hero-readout div:last-child strong { display: block; margin-top: 5px; font-size: 22px; line-height: 1.05; font-weight: var(--fw-heading-strong); letter-spacing: -0.03em; }
.hero-readout div:last-child em { display: block; margin-top: 8px; color: rgba(255,255,255,0.66); font-size: 12px; font-style: normal; font-weight: var(--fw-label); }

.tool-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 12px;
  margin-bottom: 22px;
}
.tool-tab {
  display: grid;
  grid-template-columns: 44px 1fr;
  align-items: center;
  justify-content: start;
  gap: 12px;
  min-height: 78px;
  text-align: left;
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(136,193,233,0.18);
  border-radius: 18px;
  background: var(--panel);
  color: var(--text);
  font-weight: var(--fw-extra-bold);
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s, background 0.18s;
}
.tool-tab::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, var(--brand-blue), var(--brand-cyan));
  opacity: 0;
  transition: opacity 0.18s;
}
.tool-tab:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: rgba(0,114,206,0.28); }
.tool-tab.active {
  border-color: var(--brand-blue);
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(238,245,251,0.9));
  color: var(--brand-navy);
  box-shadow: 0 12px 30px rgba(0,114,206,0.12);
}
.tool-tab.active::before { opacity: 1; }
.tool-tab-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: var(--teal-50);
  color: var(--brand-blue);
  grid-row: span 2;
  transition: background 0.18s, color 0.18s;
}
.tool-tab-icon svg { width: 22px; height: 22px; }
.tool-tab.active .tool-tab-icon {
  background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan));
  color: #fff;
}
.tool-tab em {
  display: block;
  color: var(--text-muted);
  font-style: normal;
  font-size: 11px;
  font-weight: var(--fw-extra-bold);
  margin-top: -4px;
}
.tool-tab.active em { color: var(--teal-700); }
.tool-layout {
  display: grid;
  grid-template-columns: minmax(min(100%, 280px), 390px) minmax(min(100%, 560px), 1fr);
  gap: 22px;
  align-items: stretch;
}
.tool-panel {
  background:
    linear-gradient(160deg, rgba(10,27,67,0.97), rgba(81,125,166,0.88));
  color: #fff;
  overflow: hidden;
}
.tool-panel::after {
  content: '';
  position: absolute;
  right: -70px;
  bottom: -90px;
  width: 190px;
  height: 190px;
  border: 32px solid rgba(255,255,255,0.07);
  border-radius: 50%;
}
.tool-panel > * { position: relative; z-index: 1; }
.panel-kicker {
  color: var(--brand-cyan);
  font-size: 11px;
  font-weight: var(--fw-heading-strong);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.tool-panel h2,
.chart-heading h3 { font-size: 18px; font-weight: var(--fw-heading-strong); color: inherit; margin-bottom: 16px; letter-spacing: -0.02em; }
.panel-copy { color: rgba(255,255,255,0.68); font-size: 13px; line-height: 1.6; margin: -6px 0 18px; }
.tool-panel .form-group label { color: rgba(255,255,255,0.66); }
.tool-panel .form-group label em { color: rgba(255,255,255,0.5); font-style: normal; }
.field-hint { display: block; margin-top: 6px; color: rgba(255,255,255,0.55); font-size: 11px; line-height: 1.45; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr)); gap: 12px; }

.input-unit { display: flex; gap: 8px; align-items: stretch; }
.input-unit input { flex: 1; min-width: 0; }
.unit-toggle {
  display: flex;
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}
.unit-toggle button {
  padding: 0 13px;
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.72);
  font-weight: var(--fw-extra-bold);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
}
.unit-toggle button.active { background: var(--brand-cyan); color: #06283d; }

.seg-toggle { display: flex; gap: 6px; }
.seg-toggle button {
  flex: 1;
  padding: 9px 6px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.78);
  font-size: 12px;
  font-weight: var(--fw-extra-bold);
  cursor: pointer;
  transition: background 0.16s, color 0.16s, border-color 0.16s;
}
.seg-toggle button.active { background: #fff; color: var(--brand-navy); border-color: #fff; }

.tool-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: 10px;
  margin-top: 4px;
}
.tool-summary div {
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 16px;
  padding: 12px;
  background: rgba(255,255,255,0.1);
}
.tool-summary strong { display: block; font-size: 24px; line-height: 1; color: #fff; letter-spacing: -0.03em; }
.tool-summary span { font-size: 12px; color: rgba(255,255,255,0.65); }

.chart-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.chart-heading h3 { margin: 0; }
.chart-card { padding: 28px; }
.chart-wrap { height: 320px; min-height: 260px; }

.index-strip { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.index-box {
  flex: 1;
  padding: 14px 16px;
  border-radius: 18px;
  background: var(--surface-soft, #f5f8fc);
  border: 1px solid var(--border);
}
.index-box span { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); font-weight: var(--fw-label); }
.index-box strong { display: block; margin-top: 4px; font-size: 30px; line-height: 1; letter-spacing: -0.04em; color: var(--text); }
.index-box.after.up { background: var(--green-bg); border-color: rgba(16,185,129,0.25); }
.index-box.after.up strong { color: var(--green, #10b981); }
.index-box.after.down { background: var(--amber-bg); border-color: #fde68a; }
.index-box.after.down strong { color: var(--amber); }
.index-arrow { width: 26px; height: 26px; color: var(--brand-blue); flex-shrink: 0; }

.result-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.result-pill {
  padding: 12px;
  border-radius: 16px;
  background: var(--green-bg);
  border: 1px solid rgba(16,185,129,0.18);
}
.result-pill.watch { background: var(--amber-bg); border-color: #fde68a; }
.result-pill span { display: block; color: var(--text-muted); font-size: 11px; font-weight: var(--fw-label); text-transform: uppercase; letter-spacing: 0.08em; }
.result-pill strong { display: block; margin-top: 3px; color: var(--text); font-size: 15px; font-weight: var(--fw-label); }
.result-pill em { display: block; color: var(--teal-700); font-size: 11px; font-style: normal; font-weight: var(--fw-label); margin-top: 2px; }
.result-pill.watch em { color: var(--amber); }

.optimizer-note {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(0,114,206,0.07);
  border: 1px solid rgba(0,114,206,0.18);
  font-size: 13px;
  color: var(--text);
  line-height: 1.55;
}
.optimizer-note strong { color: var(--brand-navy); }
.disclaimer { margin-top: 12px; font-size: 11px; color: var(--text-muted); line-height: 1.5; }

.recipe { display: grid; gap: 10px; margin-bottom: 4px; }
.recipe-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1.1fr 1.2fr;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255,255,255,0.7);
}
.recipe-row.head {
  background: rgba(234,249,252,0.9);
  border: 0;
  padding: 8px 14px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: var(--fw-label);
}
.recipe-row.flagged { border-color: #fde68a; background: var(--amber-bg); }
.recipe-row strong { display: block; font-size: 14px; }
.r-flag { display: block; margin-top: 2px; font-size: 10.5px; color: var(--amber); font-weight: var(--fw-bold); }
.r-val { font-size: 13px; color: var(--text); }
.r-dose { font-size: 14px; color: var(--teal-700); font-weight: var(--fw-extra-bold); }
.r-dose small { display: block; margin-top: 2px; font-size: 10.5px; color: var(--text-muted); font-weight: var(--fw-ui); }
.r-prod { font-size: 12px; color: var(--text-muted); }

@media (max-width: 980px) {
  .tools-hero { grid-template-columns: 1fr; }
  .hero-readout { max-width: 520px; }
  .tool-layout { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .tools-hero { padding: 26px; }
  .tools-hero h1 { font-size: 34px; }
  .hero-actions { flex-direction: column; }
  .hero-actions .btn { width: 100%; }
  .hero-readout { grid-template-columns: 1fr; }
  .tool-tab { min-height: 68px; font-size: 12px; }
  .chart-wrap { height: 280px; }
  .recipe-row { grid-template-columns: 1fr 1fr; gap: 8px; }
  .recipe-row.head { display: none; }
}
</style>
