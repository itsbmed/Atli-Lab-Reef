<template>
  <!-- Druckfassung des Laborberichts: nur im Druck sichtbar, aufgebaut nach den Einstellungen aus dem PDF-Dialog -->
  <div :class="['rp-root', `rp-${settings.format.orientation}`, { 'rp-bw': settings.format.color === 'bw' }]">
    <!-- Deckblatt im Stil des Berichtskopfs auf der Website -->
    <section class="rp-cover">
      <header class="rp-brand">
        <img :src="logoUrl" alt="ATI Aquaristik" @load="logoReady = true" @error="logoReady = true" />
        <span><b>ICP-Wasseranalyse</b><small>Laborbericht</small></span>
      </header>

      <div :class="['rp-hero', analysis.severity]" :style="{ backgroundImage: heroBackground }">
        <div class="rp-hero-copy">
          <span class="rp-hero-kicker">{{ [analysis.packageLabel, analysis.reportNumber].filter(Boolean).join(' · ') }}</span>
          <h1>{{ analysis.aquariumName }}</h1>
          <p>{{ heroLine }}</p>
        </div>
        <div class="rp-hero-foot">
          <dl v-if="facts.length" class="rp-facts">
            <div v-for="fact in facts" :key="fact.label"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
          </dl>
          <div class="rp-score">
            <div class="rp-ring" :style="ringStyle">
              <span><strong>{{ analysis.score ?? '–' }}</strong><small v-if="analysis.score !== null && analysis.score !== undefined">%</small></span>
            </div>
            <div>
              <span>Gesamtbewertung</span>
              <strong>{{ resultLabel }}</strong>
              <em>{{ issueCopy }}</em>
            </div>
          </div>
        </div>
      </div>

      <div v-if="groupTiles.length" class="rp-glance">
        <div v-for="group in groupTiles" :key="group.key" :class="['rp-tile', `group-${group.key}`]">
          <span class="rp-dial" :style="group.dial"><b>{{ group.total }}</b></span>
          <span class="rp-tile-copy">
            <strong>{{ group.label }}</strong>
            <small :class="{ ok: !group.issueCount }">{{ group.issueCount ? `${group.issueCount} prüfen` : 'alles im Ziel' }}</small>
          </span>
        </div>
      </div>

      <div class="rp-cover-grid">
        <div class="rp-panel">
          <span class="rp-eyebrow">Das Wichtigste</span>
          <table v-if="topIssues.length" class="compact-table">
            <tbody>
              <tr v-for="parameter in topIssues" :key="parameter.key" :class="parameter.tone">
                <th scope="row"><span class="compact-element"><i class="compact-dot"></i><span class="compact-name">{{ parameter.label }}</span></span></th>
                <td class="num"><span class="compact-pill"><b>{{ displayValue(parameter) }}</b><small>{{ parameter.unit }}</small></span></td>
                <td class="num compact-target">Ziel {{ targetLabel(parameter) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="rp-all-good">Alle Werte liegen im Zielbereich.</p>
        </div>
        <div class="rp-panel">
          <span class="rp-eyebrow">In diesem Bericht</span>
          <ol class="rp-contents">
            <li v-for="(item, index) in contents" :key="item"><b>{{ String(index + 1).padStart(2, '0') }}</b>{{ item }}</li>
          </ol>
        </div>
      </div>

      <div v-if="settings.note.trim()" class="rp-note">
        <span class="rp-eyebrow">Notiz</span>
        <p>{{ settings.note }}</p>
      </div>

      <footer class="print-brand">
        <img class="print-brand-logo" :src="logoUrl" alt="ATI Aquaristik" />
        <span class="print-brand-site"><b>lab.atiaquaristik.com</b><small>by ATI Aquaristik</small></span>
        <span class="print-brand-col"><b>Herbert-Rust-Weg 14</b><small>59071 Hamm</small></span>
        <span class="print-brand-col"><b>Tel. +49-(0) 2381-871012-0</b><small>E-Mail: info@atiaquaristik.com</small></span>
      </footer>
    </section>

    <!-- Messwerte: die Tabellenansicht der Website, gleiche Spaltenaufteilung -->
    <section v-if="settings.sections.values && valueColumns.length" class="rp-section">
      <header class="rp-head">
        <span class="rp-eyebrow">Messwerte · {{ settings.values.scope === 'issues' ? 'nur auffällige Werte' : 'alle Werte' }}</span>
        <h2>Alle Werte im Überblick</h2>
      </header>
      <div class="compact-values">
        <div v-for="(column, index) in valueColumns" :key="index" class="compact-column">
          <section v-for="group in column" :key="group.key" :class="['compact-group', `group-${group.key}`]">
            <header class="compact-group-head">
              <i class="element-section-dot"></i>
              <strong>{{ group.label }}</strong>
              <b>{{ group.items.length }}</b>
              <em v-if="issueCount(group)">{{ issueCount(group) }} prüfen</em>
            </header>
            <table class="compact-table">
              <thead><tr><th scope="col">Element</th><th scope="col" class="num">Messwert</th><th scope="col" class="num">Ziel</th></tr></thead>
              <tbody>
                <tr v-for="parameter in group.items" :key="parameter.key" :class="[parameter.tone, { undetected: undetected(parameter) }]">
                  <th scope="row">
                    <span class="compact-element">
                      <i class="compact-dot"></i>
                      <span class="compact-name">{{ parameter.label }}</span>
                      <small class="compact-symbol">{{ symbol(parameter) }}</small>
                    </span>
                  </th>
                  <td class="num"><span class="compact-pill"><b>{{ displayValue(parameter) }}</b><small v-if="!undetected(parameter)">{{ parameter.unit }}</small></span></td>
                  <td class="num compact-target">{{ targetLabel(parameter) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
      <p class="rp-legend"><i class="good"></i>Optimal <i class="watch"></i>Beobachten <i class="critical"></i>Kritisch · „n. n.“ = nicht nachweisbar</p>
    </section>

    <!-- Osmosewasser: ebenfalls die Tabellenansicht der Website -->
    <section v-if="settings.sections.osmosis && osmosisColumns.length" class="rp-section">
      <header class="rp-head">
        <span class="rp-eyebrow">Osmosewasser · {{ settings.osmosis.scope === 'found' ? 'nur nachweisbare Werte' : 'alle Werte' }}</span>
        <h2>Reinheit des Osmosewassers</h2>
      </header>
      <div class="compact-values">
        <div v-for="(column, index) in osmosisColumns" :key="index" class="compact-column">
          <section v-for="group in column" :key="group.key" :class="['compact-group', `group-${group.key}`]">
            <header class="compact-group-head">
              <i class="element-section-dot"></i>
              <strong>{{ group.label }}</strong>
              <b>{{ group.items.length }}</b>
              <em v-if="issueCount(group)">{{ issueCount(group) }} prüfen</em>
            </header>
            <table class="compact-table osmosis">
              <thead><tr><th scope="col">Element</th><th scope="col" class="num">Messwert</th><th scope="col" class="num">Status</th></tr></thead>
              <tbody>
                <tr v-for="parameter in group.items" :key="parameter.key" :class="[parameter.tone, { undetected: undetected(parameter) }]">
                  <th scope="row">
                    <span class="compact-element">
                      <i class="compact-dot"></i>
                      <span class="compact-name">{{ parameter.label }}</span>
                      <small class="compact-symbol">{{ symbol(parameter) }}</small>
                    </span>
                  </th>
                  <td class="num"><span class="compact-pill"><b>{{ undetected(parameter) ? 'n. n.' : displayValue(parameter) }}</b><small v-if="!undetected(parameter)">{{ parameter.unit }}</small></span></td>
                  <td class="num compact-target compact-status">{{ undetected(parameter) ? 'Optimal' : 'Belastet' }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
      <p class="rp-legend">Osmosewasser soll frei von Elementen sein: „n. n.“ heißt nicht nachweisbar.</p>
    </section>

    <!-- Diagramme -->
    <section v-if="settings.sections.charts" class="rp-section rp-charts">
      <header class="rp-head">
        <span class="rp-eyebrow">Diagramme</span>
        <h2>Zusammensetzung &amp; Verhältnisse</h2>
      </header>
      <CompositionChart v-if="settings.charts.composition && balance.composition.length" :rows="balance.composition" :salinity="salinity" :unit="compositionUnit" />
      <PairGauges v-if="settings.charts.ratios && balance.ratios.rows.length" eyebrow="Verhältnisse" title="Elementverhältnisse" :rows="balance.ratios.rows" noun="Verhältnissen" hint="Ein Paar ist ausgewogen, wenn beide Elemente im gleichen Verhältnis zu ihrem Sollwert stehen." />
      <PairGauges v-if="settings.charts.growth && balance.growth.rows.length" eyebrow="Wachstum" title="Wachstumsfaktoren" :rows="balance.growth.rows" noun="Wachstumsfaktoren" hint="Zeigt, ob die wichtigsten Wachstumsfaktoren im Gleichgewicht stehen." />
    </section>

    <!-- Empfehlungen -->
    <section v-if="settings.sections.recommendations && recommendations.length" class="rp-section">
      <header class="rp-head">
        <span class="rp-eyebrow">Empfehlungen · {{ recommendations.length }} {{ recommendations.length === 1 ? 'Maßnahme' : 'Maßnahmen' }}</span>
        <h2>Was jetzt zu tun ist</h2>
      </header>
      <article v-for="item in recommendations" :key="item.key" :class="['rp-action', item.tone]">
        <header>
          <span class="rp-check" aria-hidden="true">{{ completed[item.key] ? '✓' : '' }}</span>
          <div>
            <small>Priorität {{ item.priority }}<template v-if="item.kicker"> · {{ item.kicker }}</template></small>
            <h3>{{ item.title }}</h3>
          </div>
        </header>
        <p><template v-for="(part, index) in item.summaryParts" :key="index"><strong v-if="part.bold">{{ part.text }}</strong><template v-else>{{ part.text }}</template></template></p>
        <div v-if="item.options?.length" class="rp-options">
          <p v-for="option in item.options" :key="option.text"><b v-if="option.label">{{ option.label }}: </b>{{ option.text }}</p>
        </div>
        <div v-if="item.showDetail" class="rp-detail">
          <span class="rp-eyebrow">{{ item.detailLabel }}</span>
          <ul><li v-for="entry in item.detailItems" :key="entry.label"><span>{{ entry.label }}</span><b v-if="entry.value">{{ entry.value }}</b></li></ul>
        </div>
        <p v-if="item.products.length" class="rp-products-line">Produkte: {{ item.products.map((product) => product.productName).join(' · ') }}</p>
        <p v-for="tip in item.tips || []" :key="tip" class="rp-tip">Tipp: {{ tip }}</p>
      </article>
    </section>

    <!-- Dosierungsplan: dasselbe Blatt wie „Drucken / PDF“ im Dosierungsplan -->
    <section v-if="settings.sections.dosing && schedule.days" class="rp-section rp-dose-sheet">
      <div class="print-heading">
        <b>ATI · REEFING MADE SIMPLE</b>
        <h1>Dosierungsplan</h1>
        <p>{{ [analysis.aquariumName, analysis.reportNumber, volume ? `${volume.toLocaleString('de-DE')} l netto` : ''].filter(Boolean).join(' · ') }}</p>
      </div>
      <div class="dosing-grid" :style="doseGridStyle">
        <div class="dosing-head">Element</div>
        <div v-for="day in schedule.days" :key="`head-${day}`" class="dosing-head">Tag {{ day }}</div>
        <div class="dosing-head summary">Gesamt-Dosis</div>
        <template v-for="row in schedule.rows" :key="row.key">
          <div class="dosing-element">
            {{ row.label }}
            <span>{{ row.productName }}</span>
            <small>{{ row.courseDays }} {{ row.courseDays === 1 ? 'Tag' : 'Tage' }} · Tageslimit {{ formatMl(row.maxDailyMl) }} ml</small>
          </div>
          <div v-for="(amount, index) in row.amounts" :key="`${row.key}-${index}`" class="dose-cell">
            <span v-if="amount" class="dose-check"><span v-if="settings.dosing.checkboxes"></span><b>{{ formatMl(amount) }} ml</b></span>
            <span v-else class="dose-empty">–</span>
          </div>
          <div class="dose-cell summary">{{ formatMl(row.totalMl) }} ml</div>
        </template>
      </div>
      <p class="plan-footer">Tag 1 ist der Tag, an dem Sie beginnen. Die Tagesdosis bleibt immer innerhalb des freigegebenen Tageslimits. Nach Abschluss des Kurses erneut messen und den Kurs nicht automatisch wiederholen.</p>
    </section>

    <!-- Produkte mit QR-Code -->
    <section v-if="settings.sections.products && products.length" class="rp-section">
      <header class="rp-head">
        <span class="rp-eyebrow">Produkte · scannen und direkt im Shop öffnen</span>
        <h2>Ihre Produkte</h2>
      </header>
      <div class="rp-product-grid">
        <article v-for="product in products" :key="product.name" class="rp-product">
          <span class="rp-qr" v-html="qrCodes[product.url] || ''"></span>
          <div>
            <h3>{{ product.name }}</h3>
            <p v-if="product.note">{{ product.note }}</p>
            <small>für: {{ product.forTitle }}</small>
          </div>
        </article>
      </div>
    </section>

    <footer class="rp-foot">
      <span><b>ATI Aquaristik</b> · lab.atiaquaristik.com</span>
      <span>{{ analysis.aquariumName }} · Bericht {{ analysis.reportNumber }}</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import CompositionChart from '@/components/analyses/CompositionChart.vue'
import PairGauges from '@/components/analyses/PairGauges.vue'
import { doseSchedule, formatMl } from '@/services/dosingCalendar'
import { printOsmosisGroups, printProducts, printRecommendations, printValueGroups } from '@/services/pdfExport'
import { OSMOSIS_LEFT_GROUPS, VALUES_LEFT_GROUPS, balanceColumns } from '@/services/reportColumns'

const props = defineProps({
  analysis: { type: Object, required: true },
  settings: { type: Object, required: true },
  groups: { type: Array, default: () => [] },
  osmosisGroups: { type: Array, default: () => [] },
  // Empfehlungen mit ihren Produkten (products) und ob der Detailkasten gezeigt wird (showDetail)
  recommendationItems: { type: Array, default: () => [] },
  completed: { type: Object, default: () => ({}) },
  dosingItems: { type: Array, default: () => [] },
  balance: { type: Object, required: true },
  salinity: { type: Number, default: null },
  compositionUnit: { type: String, default: '' },
  resultLabel: { type: String, default: '' },
  targetLabel: { type: Function, required: true },
  displayValue: { type: Function, required: true },
  symbol: { type: Function, required: true },
})
const emit = defineEmits(['ready'])

const TONE_COLORS = { critical: '#e85d4f', watch: '#f59e0b', good: '#10b981' }

const profile = computed(() => props.analysis.aquariumProfile)
const volume = computed(() => Number(profile.value?.volumeLiters) || 0)
const valueGroups = computed(() => printValueGroups(props.groups, props.settings))
const valueColumns = computed(() => balanceColumns(valueGroups.value, VALUES_LEFT_GROUPS))
const osmosisGroups = computed(() => printOsmosisGroups(props.osmosisGroups, props.settings))
const osmosisColumns = computed(() => balanceColumns(osmosisGroups.value, OSMOSIS_LEFT_GROUPS))
const recommendations = computed(() => printRecommendations(props.recommendationItems, props.settings, props.completed))
const schedule = computed(() => doseSchedule(props.dosingItems))
const doseGridStyle = computed(() => ({ gridTemplateColumns: `minmax(140px, 1.6fr) repeat(${schedule.value.days}, minmax(44px, 1fr)) minmax(70px, 0.9fr)` }))
const products = computed(() => printProducts(recommendations.value))
const contents = computed(() => [
  props.settings.sections.values && valueGroups.value.length && 'Messwerte',
  props.settings.sections.osmosis && osmosisGroups.value.length && 'Osmosewasser',
  props.settings.sections.charts && 'Zusammensetzung & Verhältnisse',
  props.settings.sections.recommendations && recommendations.value.length && 'Empfehlungen',
  props.settings.sections.dosing && schedule.value.days && 'Dosierungsplan',
  props.settings.sections.products && products.value.length && 'Produkte mit QR-Code',
].filter(Boolean))

// Deckblatt
const heroImage = computed(() => profile.value?.image || '/reef-tank.webp')
const heroBackground = computed(() => `url(${JSON.stringify(heroImage.value)})`)
const heroLine = computed(() => [
  props.analysis.reasonLabel,
  formatDate(props.analysis.completedAt || props.analysis.createdAt),
  props.settings.format.barcode && props.analysis.barcode,
].filter(Boolean).join(' · '))
const facts = computed(() => {
  if (!props.settings.format.aquarium || !profile.value) return []
  const item = profile.value
  return [
    volume.value && { label: 'Nettovolumen', value: `${volume.value.toLocaleString('de-DE')} l` },
    { label: 'Wasserart', value: item.waterType || props.analysis.waterType },
    known(item.aquariumType) && { label: 'Beckentyp', value: item.aquariumType },
    known(item.supplySystem) && { label: 'Versorgung', value: item.supplySystem },
  ].filter((fact) => fact && fact.value)
})
const ringStyle = computed(() => {
  const color = TONE_COLORS[props.analysis.severity] || TONE_COLORS.good
  return { background: `conic-gradient(${color} ${(Number(props.analysis.score) || 0) * 3.6}deg, rgba(255,255,255,0.18) 0deg)` }
})
const allParameters = computed(() => props.groups.flatMap((group) => group.parameters || []))
const issueCopy = computed(() => {
  const count = allParameters.value.filter((parameter) => parameter.tone !== 'good').length
  return count ? `${count} von ${allParameters.value.length} Werten prüfen` : `Alle ${allParameters.value.length} Werte im Ziel`
})
// Je Gruppe ein Ring wie auf der Website: Anteil der Werte im Zielbereich.
const groupTiles = computed(() => props.groups.map((group) => {
  const total = group.parameters?.length || 0
  const issues = (group.parameters || []).filter((parameter) => parameter.tone !== 'good')
  const tone = issues.some((parameter) => parameter.tone === 'critical') ? 'critical' : issues.length ? 'watch' : 'good'
  const share = total ? (total - issues.length) / total : 1
  return {
    key: group.key,
    label: group.label,
    total,
    issueCount: issues.length,
    dial: { background: `conic-gradient(${TONE_COLORS[tone]} ${share * 360}deg, #e7eef6 0deg)` },
  }
}).filter((group) => group.total))
const topIssues = computed(() => {
  const rank = { critical: 0, watch: 1 }
  return allParameters.value
    .filter((parameter) => parameter.tone !== 'good')
    .sort((a, b) => rank[a.tone] - rank[b.tone])
    .slice(0, props.settings.format.orientation === 'landscape' ? 4 : 7)
})

// Logo absolut, damit es auch in einem Druckfenster ohne eigene Basis-URL lädt.
const logoUrl = typeof window === 'undefined' ? '/ati-logo.png' : `${window.location.origin}/ati-logo.png`
const logoReady = ref(false)
const heroReady = ref(false)
onMounted(() => {
  const image = new Image()
  image.onload = image.onerror = () => { heroReady.value = true }
  image.src = heroImage.value
})

// QR-Codes als SVG – gestochen scharf im Druck, ohne Netzwerk.
const qrCodes = ref({})
const qrReady = ref(false)
async function buildQrCodes() {
  qrReady.value = false
  const entries = await Promise.all(products.value.filter((product) => product.url).map(async (product) => {
    try { return [product.url, await QRCode.toString(product.url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0a1b43', light: '#0000' } })] } catch { return [product.url, ''] }
  }))
  qrCodes.value = Object.fromEntries(entries)
  qrReady.value = true
}
watch(products, buildQrCodes)
onMounted(buildQrCodes)

// Fertig zum Drucken, sobald Logo, Titelbild und QR-Codes da sind – spätestens nach 2 s, damit der Druck nie hängt.
let signalled = false
function signal() { if (!signalled) { signalled = true; emit('ready') } }
watch([logoReady, heroReady, qrReady], (ready) => { if (ready.every(Boolean)) signal() })
onMounted(() => setTimeout(signal, 2000))

function issueCount(group) {
  return group.items.filter((item) => item.tone !== 'good').length
}
function undetected(parameter) {
  return parameter.resultStatus === 'below_detection'
}
function known(value) {
  return value && value !== 'Nicht angegeben'
}
function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
}
</script>

<style>
/* Außerhalb des Drucks unsichtbar; im Druck nur diese Fassung, nicht die App. */
@media screen {
  .rp-root { display: none; }
}
@media print {
  html.rp-printing body > *:not(.rp-root) { display: none !important; }
  html.rp-printing, html.rp-printing body { background: #fff !important; }
}
</style>

<style scoped>
.rp-root { color: #14213d; font: 9.5pt/1.45 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.rp-bw { filter: grayscale(1); }
.rp-section { break-before: page; }
h3 { margin: 0; font-size: 11pt; }
.rp-eyebrow { display: block; color: #004f93; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.rp-head { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #0072ce; }
.rp-head h2 { margin: 3px 0 0; color: #14213d; font-size: 19pt; font-weight: 700; letter-spacing: -0.02em; }

/* ── Deckblatt ── */
.rp-cover { display: flex; flex-direction: column; gap: 14px; height: 266mm; overflow: hidden; }
.rp-landscape .rp-cover { height: 180mm; gap: 8px; }
.rp-brand { display: flex; align-items: center; justify-content: space-between; }
.rp-brand img { height: 34px; }
.rp-brand span { display: grid; text-align: right; }
.rp-brand b { color: #0072ce; font-size: 8pt; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
.rp-brand small { color: #5b6b82; font-size: 8pt; }

.rp-hero { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 22px; min-height: 112mm; padding: 30px 32px 26px; overflow: hidden; border-radius: 22px; background-color: #0a1b43; background-position: center; background-size: cover; color: #fff; }
.rp-landscape .rp-hero { min-height: 70mm; padding: 20px 26px 18px; gap: 10px; }
.rp-hero::before { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, rgba(10,27,67,0.97) 20%, rgba(10,27,67,0.78) 55%, rgba(0,114,206,0.55)); }
.rp-hero.watch::before { background: linear-gradient(115deg, rgba(10,27,67,0.97) 20%, rgba(10,27,67,0.78) 55%, rgba(245,158,11,0.5)); }
.rp-hero.critical::before { background: linear-gradient(115deg, rgba(10,27,67,0.97) 20%, rgba(10,27,67,0.78) 55%, rgba(232,93,79,0.6)); }
.rp-hero > * { position: relative; }
.rp-hero-kicker { color: #b3d4ee; font-size: 8pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
.rp-hero h1 { margin: 10px 0 8px; font-size: 40pt; font-weight: 700; line-height: 0.98; letter-spacing: -0.045em; }
.rp-landscape .rp-hero h1 { margin: 6px 0; font-size: 32pt; }
.rp-landscape .rp-ring { width: 84px; height: 84px; }
.rp-landscape .rp-panel { padding: 10px 14px; }
.rp-landscape .rp-contents { gap: 4px; }
.rp-hero-copy p { color: rgba(255,255,255,0.74); font-size: 10pt; }
.rp-hero-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
.rp-facts { display: grid; grid-template-columns: repeat(2, minmax(0, auto)); gap: 8px; margin: 0; }
.rp-landscape .rp-facts { grid-template-columns: repeat(4, minmax(0, auto)); }
.rp-facts div { padding: 7px 12px; border: 1px solid rgba(255,255,255,0.16); border-radius: 12px; background: rgba(255,255,255,0.1); }
.rp-facts dt { color: #b3d4ee; font-size: 6.5pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.rp-facts dd { margin: 1px 0 0; font-size: 9.5pt; font-weight: 700; }
.rp-score { flex: none; display: flex; align-items: center; gap: 14px; padding: 14px 18px 14px 14px; border: 1px solid rgba(255,255,255,0.18); border-radius: 20px; background: rgba(255,255,255,0.12); }
.rp-ring { position: relative; display: grid; place-items: center; width: 96px; height: 96px; border-radius: 50%; }
.rp-ring::after { content: ''; position: absolute; inset: 10px; border-radius: 50%; background: #0d2150; }
.rp-ring span { position: relative; z-index: 1; display: inline-flex; align-items: baseline; gap: 1px; }
.rp-ring strong { font-size: 26pt; line-height: 1; }
.rp-ring small { color: #b3d4ee; font-size: 9pt; font-weight: 800; }
.rp-score > div:last-child span { display: block; color: #b3d4ee; font-size: 7pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.rp-score > div:last-child strong { display: block; margin-top: 3px; font-size: 15pt; }
.rp-score em { display: block; margin-top: 2px; color: rgba(255,255,255,0.72); font-size: 8.5pt; font-style: normal; }

.rp-glance { display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; gap: 8px; }
.rp-tile { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border: 1px solid rgba(10,27,67,0.12); border-radius: 14px; background: #f8fbfe; }
.rp-dial { position: relative; flex: none; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; }
.rp-dial::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: #f8fbfe; }
.rp-dial b { position: relative; z-index: 1; font-size: 9.5pt; }
.rp-tile-copy { display: grid; min-width: 0; }
.rp-tile-copy strong { font-size: 8pt; line-height: 1.2; hyphens: auto; }
.rp-tile-copy small { color: #9a4d0a; font-size: 7.5pt; font-weight: 600; }
.rp-tile-copy small.ok { color: #047857; }

.rp-cover-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 12px; }
.rp-panel, .rp-note { padding: 14px 16px; border: 1px solid rgba(10,27,67,0.12); border-radius: 16px; background: #fff; }
.rp-panel .rp-eyebrow, .rp-note .rp-eyebrow { margin-bottom: 8px; }
.rp-panel .compact-table tbody th, .rp-panel .compact-table td { padding: 4.5px 6px; }
.rp-panel .compact-table tbody tr:first-child { border-top: 0; }
.rp-all-good { color: #047857; font-weight: 600; }
.rp-contents { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.rp-contents li { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.rp-contents b { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; background: #eef6fd; color: #0072ce; font-size: 7.5pt; }
.rp-note { border-color: #b3d4ee; background: #eef6fd; }
.rp-note p { margin: 0; white-space: pre-line; }

/* Markenleiste wie auf dem Dosierungsplan */
.print-brand { display: flex; align-items: center; gap: 26px; margin-top: auto; padding-top: 11px; border-top: 2px solid #0072ce; }
.print-brand-logo { flex: none; width: auto; height: 30px; }
.print-brand b { display: block; font-size: 10px; font-weight: bold; line-height: 1.35; }
.print-brand small { display: block; color: #7a8da3; font-size: 9px; line-height: 1.35; }
.print-brand-site b { color: #0072ce; font-size: 12px; }
.print-brand-col b { color: #526780; font-weight: normal; }

/* ── Messwerte & Osmose: Tabellenansicht der Website ── */
.compact-values { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 12px; }
.compact-column { display: grid; gap: 12px; min-width: 0; }
.compact-group { overflow: hidden; border: 1px solid rgba(10,27,67,0.12); border-radius: 14px; background: #fff; }
.compact-group-head { display: flex; align-items: center; gap: 9px; padding: 8px 12px; border-bottom: 1px solid rgba(10,27,67,0.12); background: #f8fbfe; }
.compact-group-head strong { color: #14213d; font-size: 8.5pt; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.compact-group-head > b { padding: 1px 7px; border-radius: 999px; background: #eef3f8; color: #5b6b82; font-size: 7.5pt; font-weight: 600; }
.compact-group-head > em { margin-left: auto; color: #9a4d0a; font-size: 7.5pt; font-style: normal; font-weight: 600; white-space: nowrap; }
.element-section-dot { flex: none; width: 9px; height: 9px; border-radius: 50%; background: var(--group-accent, #0072ce); }
.group-basis { --group-accent: #1686d9; }
.group-quantity { --group-accent: #6b9f36; }
.group-nutrients { --group-accent: #f59e0b; }
.group-trace { --group-accent: #0f9f8f; }
.group-pollutants { --group-accent: #d45f72; }
.compact-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.compact-table thead th { padding: 5px 12px 3px; color: #5b6b82; font-size: 6.5pt; font-weight: 700; letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
.compact-table .num { text-align: right; }
.compact-table tbody tr { border-top: 1px solid #edf1f5; break-inside: avoid; }
.compact-table tbody th, .compact-table td { padding: 3px 12px; vertical-align: middle; }
.compact-table tbody th { width: 100%; max-width: 0; font-weight: 600; text-align: left; }
.compact-element { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
.compact-dot { flex: none; align-self: center; width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
tr.watch .compact-dot { background: #f59e0b; box-shadow: 0 0 0 2.5px rgba(245,158,11,0.16); }
tr.critical .compact-dot { background: #e85d4f; box-shadow: 0 0 0 2.5px rgba(232,93,79,0.16); }
.compact-name { overflow: hidden; color: #14213d; font-size: 8.5pt; text-overflow: ellipsis; white-space: nowrap; }
.compact-symbol { color: #5b6b82; font-size: 7pt; font-weight: 600; }
.compact-table td { white-space: nowrap; }
.compact-pill { display: inline-flex; align-items: baseline; gap: 3px; padding: 1.5px 7px; border-radius: 7px; background: linear-gradient(135deg, #f3fcf8, #e3f7ee); box-shadow: inset 0 0 0 1px rgba(16,185,129,0.16); color: #0f6b4c; }
.compact-pill b { color: inherit; font-size: 8.5pt; font-weight: 700; }
.compact-pill small { color: inherit; font-size: 6.5pt; font-weight: 600; opacity: 0.72; }
tr.watch .compact-pill { background: linear-gradient(135deg, #fff8ea, #ffecc7); box-shadow: inset 0 0 0 1px rgba(245,158,11,0.32); color: #92400e; }
tr.critical .compact-pill { background: linear-gradient(135deg, #fff1ef, #fdd8d3); box-shadow: inset 0 0 0 1px rgba(232,93,79,0.34); color: #a92e22; }
.compact-table:not(.osmosis) tr.undetected.good .compact-pill { background: #f2f5f9; box-shadow: inset 0 0 0 1px #e3e9f0; color: #94a3b8; }
tr.undetected .compact-pill b { font-weight: 600; }
tr.critical > th { background: linear-gradient(90deg, rgba(232,93,79,0.07), transparent 70%); }
tr.watch > th { background: linear-gradient(90deg, rgba(245,158,11,0.06), transparent 70%); }
.compact-target { color: #5b6b82; font-size: 7.5pt; }
.compact-status { color: #047857; font-weight: 700; }
tr.critical .compact-status { color: #b53a2e; }
.rp-legend { margin: 10px 0 0; color: #5b6b82; font-size: 7.5pt; }
.rp-legend i { display: inline-block; width: 7px; height: 7px; margin: 0 4px 0 10px; border-radius: 50%; background: #10b981; }
.rp-legend i:first-child { margin-left: 0; }
.rp-legend i.watch { background: #f59e0b; }
.rp-legend i.critical { background: #e85d4f; }

/* ── Diagramme: Bildschirm-Komponenten, im Druck ohne Schatten und Animation ── */
.rp-charts { display: grid; gap: 14px; align-content: start; }
.rp-charts :deep(*) { animation: none !important; transition: none !important; box-shadow: none !important; }
.rp-charts > * { min-width: 0; break-inside: avoid; }
/* Bedienelemente gehören nicht aufs Papier */
.rp-charts :deep(.cmp-seg), .rp-charts :deep(.cmp-guide-hint) { display: none !important; }
.rp-charts :deep(.cmp-toolbar) { justify-content: flex-end; }
/* Skalenbeschriftung der Paar-Anzeigen bleibt in ihrer Karte */
.rp-charts :deep(.tg-scale) { overflow: hidden; }

/* ── Empfehlungen ── */
.rp-action { margin-bottom: 10px; padding: 11px 14px; border: 1px solid rgba(10,27,67,0.12); border-left: 4px solid #10b981; border-radius: 12px; break-inside: avoid; }
.rp-action.watch { border-left-color: #f59e0b; }
.rp-action.critical { border-left-color: #e85d4f; }
.rp-action header { display: flex; gap: 10px; align-items: flex-start; }
.rp-action header small { color: #5b6b82; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.rp-check { flex: none; display: grid; place-items: center; width: 14px; height: 14px; margin-top: 2px; border: 1.5px solid #b8c9dd; border-radius: 4px; color: #0f9f8f; font-size: 9pt; font-weight: 800; }
.rp-action p { margin: 5px 0 0; }
.rp-options { margin-top: 6px; padding: 6px 9px; border-radius: 8px; background: #f5f8fb; }
.rp-options p { margin: 2px 0; }
.rp-detail { margin-top: 7px; }
.rp-detail .rp-eyebrow { margin-bottom: 3px; }
.rp-detail ul { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2px 14px; margin: 0; padding: 0; list-style: none; }
.rp-detail li { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; border-bottom: 1px dotted #cbd5e1; }
.rp-products-line { color: #0072ce; font-weight: 600; }
.rp-tip { color: #475569; font-size: 8.5pt; font-style: italic; }

/* ── Dosierungsplan: Gestaltung wie das Druckblatt des Dosierungsplans (DosingCalendar) ── */
.rp-dose-sheet { color: #0a1b43; font: 10px Arial, sans-serif; }
.rp-dose-sheet h1 { margin: 8px 0; font-size: 28px; }
.rp-dose-sheet p { margin: 0; line-height: 1.5; }
.print-heading { padding: 0 0 12px; border-bottom: 3px solid #0072ce; }
.print-heading b { color: #0072ce; letter-spacing: 2px; }
.dosing-grid { display: grid; margin: 14px 0; overflow: hidden; border: 1px solid #cbd9e7; border-radius: 8px; }
.dosing-head, .dosing-element, .dose-cell { display: flex; align-items: center; justify-content: center; min-height: 42px; padding: 5px; border-right: 1px solid #cbd9e7; border-bottom: 1px solid #cbd9e7; }
.dosing-head { background: #eef7ff; color: #0072ce; font-size: 8px; text-transform: uppercase; }
.dosing-element { flex-direction: column; align-items: flex-start; padding: 7px 9px; font-weight: bold; }
.dosing-element span { color: #526780; font-size: 9px; font-weight: normal; }
.dosing-element small { color: #0072ce; font-size: 8px; }
.dose-cell.summary { background: #f6fafc; font-weight: bold; }
.dose-check { display: flex; align-items: center; justify-content: center; gap: 4px; }
.dose-check > span { flex: none; width: 9px; height: 9px; border: 1px solid #526780; }
.dose-check b { font-size: 9px; }
.dose-empty { color: #98a8ba; }
.plan-footer { padding-top: 10px; border-top: 1px solid #cbd9e7; color: #526780; font-size: 9px; }

/* ── Produkte ── */
.rp-product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.rp-landscape .rp-product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.rp-product { display: flex; gap: 12px; align-items: center; padding: 12px; border: 1px solid rgba(10,27,67,0.12); border-radius: 14px; break-inside: avoid; }
.rp-qr { flex: none; width: 76px; height: 76px; }
.rp-qr :deep(svg) { display: block; width: 100%; height: 100%; }
.rp-product p { margin: 3px 0; color: #475569; font-size: 8.5pt; }
.rp-product small { color: #5b6b82; font-size: 7.5pt; }

.rp-foot { display: flex; justify-content: space-between; gap: 16px; margin-top: 22px; padding-top: 8px; border-top: 1.5px solid #0072ce; color: #5b6b82; font-size: 7.5pt; break-inside: avoid; }
</style>
