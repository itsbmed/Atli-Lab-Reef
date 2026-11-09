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
                <td class="num"><span class="compact-pill"><ValueDirection :direction="valueDirection(parameter)" /><b>{{ displayValue(parameter) }}</b><small>{{ parameter.unit }}</small></span></td>
                <td class="num compact-target">Ziel {{ targetLabel(parameter) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="rp-all-good">Alle Werte liegen im Zielbereich.</p>
        </div>
        <div class="rp-panel">
          <span class="rp-eyebrow">In diesem Bericht</span>
          <ol class="rp-contents">
            <li v-for="item in contents" :key="item.key"><b>{{ number(item.key) }}</b>{{ item.label }}</li>
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
        <b class="rp-num">{{ number('values') }}</b>
        <div><h2>Messwerte</h2><p>{{ settings.values.scope === 'issues' ? 'Nur die auffälligen Werte' : 'Alle Werte' }} mit Zielbereich, nach Gruppen</p></div>
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
                  <td class="num"><span class="compact-pill"><ValueDirection :direction="valueDirection(parameter)" /><b>{{ displayValue(parameter) }}</b><small v-if="!undetected(parameter)">{{ parameter.unit }}</small></span></td>
                  <td class="num compact-target">{{ targetLabel(parameter) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
      <p class="rp-legend"><i class="good"></i>Optimal <i class="watch"></i>Beobachten <i class="critical"></i>Kritisch · ↑ zu hoch · ↓ zu niedrig · „n. n.“ = nicht nachweisbar</p>
    </section>

    <!-- Osmosewasser: ebenfalls die Tabellenansicht der Website -->
    <section v-if="settings.sections.osmosis && osmosisColumns.length" class="rp-section">
      <header class="rp-head">
        <b class="rp-num">{{ number('osmosis') }}</b>
        <div><h2>Osmosewasser</h2><p>Reinheit der Osmoseprobe · {{ settings.osmosis.scope === 'found' ? 'nur nachweisbare Elemente' : 'alle Elemente' }}</p></div>
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
                  <td class="num"><span class="compact-pill"><ValueDirection :direction="parameter.tone === 'good' || undetected(parameter) ? '' : 'high'" /><b>{{ undetected(parameter) ? 'n. n.' : displayValue(parameter) }}</b><small v-if="!undetected(parameter)">{{ parameter.unit }}</small></span></td>
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
        <b class="rp-num">{{ number('charts') }}</b>
        <div><h2>Zusammensetzung &amp; Verhältnisse</h2><p>Wie gut die Elemente zueinander und zu Ihrer Salinität passen</p></div>
      </header>
      <CompositionChart v-if="settings.charts.composition && balance.composition.length" :rows="balance.composition" :salinity="salinity" :unit="compositionUnit" />
      <PairGauges v-if="settings.charts.ratios && balance.ratios.rows.length" class="rp-ratios" eyebrow="Verhältnisse" title="Elementverhältnisse" :rows="balance.ratios.rows" noun="Verhältnissen" hint="Ein Paar ist ausgewogen, wenn beide Elemente im gleichen Verhältnis zu ihrem Sollwert stehen." />
      <PairGauges v-if="settings.charts.growth && balance.growth.rows.length" class="rp-growth" eyebrow="Wachstum" title="Wachstumsfaktoren" :rows="balance.growth.rows" noun="Wachstumsfaktoren" hint="Zeigt, ob die wichtigsten Wachstumsfaktoren im Gleichgewicht stehen." />
    </section>

    <!-- Empfehlungen -->
    <section v-if="settings.sections.recommendations && recommendations.length" class="rp-section">
      <header class="rp-head">
        <b class="rp-num">{{ number('recommendations') }}</b>
        <div><h2>Empfehlungen</h2><p>{{ recommendations.length }} {{ recommendations.length === 1 ? 'Maßnahme' : 'Maßnahmen' }}, nach Priorität – zum Abhaken</p></div>
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
          <ul v-if="item.key === 'reduce-supply' && item.supplyRows" class="rp-supply">
            <li v-for="row in item.supplyRows.rows" :key="row.key" :class="row.direction"><i aria-hidden="true">{{ row.direction === 'up' ? '↑' : '↓' }}</i><span><b>{{ row.title }}</b> · {{ row.text }}</span></li>
            <li v-if="item.supplyRows.kept.length" class="kept"><i aria-hidden="true">=</i><span><b>Beibehalten</b> · {{ item.supplyRows.kept.join(' · ') }}</span><em>unverändert</em></li>
          </ul>
          <ul v-else><li v-for="entry in item.detailItems" :key="entry.label"><span>{{ entry.label }}</span><b v-if="entry.value">{{ entry.value }}</b></li></ul>
        </div>
        <p v-if="item.products.length" class="rp-products-line">Produkte: {{ item.products.map((product) => product.productName).join(' · ') }}</p>
        <p v-for="tip in item.tips || []" :key="tip" class="rp-tip">Tipp: {{ tip }}</p>
        <p v-for="(parts, tipIndex) in item.tipParts || []" :key="`parts-${tipIndex}`" class="rp-tip">Tipp: <template v-for="(part, partIndex) in parts" :key="partIndex"><strong v-if="part.bold">{{ part.text }}</strong><template v-else>{{ part.text }}</template></template></p>
      </article>
    </section>

    <!-- Dosierungsplan: dasselbe Blatt wie „Drucken / PDF“ im Dosierungsplan -->
    <section v-if="settings.sections.dosing && schedule.days" class="rp-section rp-dose-sheet">
      <header class="rp-head">
        <b class="rp-num">{{ number('dosing') }}</b>
        <div><h2>Dosierungsplan</h2><p>{{ ['Tag für Tag', analysis.aquariumName, volume ? `${volume.toLocaleString('de-DE')} l netto` : ''].filter(Boolean).join(' · ') }}</p></div>
      </header>
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
        <b class="rp-num">{{ number('products') }}</b>
        <div><h2>Produkte</h2><p>QR-Code scannen und das Produkt direkt im Shop öffnen</p></div>
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

  </div>
</template>

<script setup>
import { absolutePublicUrl, publicUrl } from '@/services/publicUrl'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import CompositionChart from '@/components/analyses/CompositionChart.vue'
import PairGauges from '@/components/analyses/PairGauges.vue'
import ValueDirection from '@/components/analyses/ValueDirection.vue'
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
  valueDirection: { type: Function, default: () => '' }, // 'high' | 'low' | ''
  displayValue: { type: Function, required: true },
  symbol: { type: Function, required: true },
})
const emit = defineEmits(['ready'])

const TONE_COLORS = { critical: '#e85d4f', watch: '#f59e0b', good: '#10b981' }

const profile = computed(() => props.analysis.aquariumProfile)
const volume = computed(() => Number(profile.value?.volumeLiters) || 0)
const valueGroups = computed(() => printValueGroups(props.groups, props.settings))
// Hochformat wie die Website, Querformat drei gleich hohe Spalten – so passen die Tabellen auf eine Seite.
const landscape = computed(() => props.settings.format.orientation === 'landscape')
const valueColumns = computed(() => (landscape.value ? balanceColumns(valueGroups.value, null, 3) : balanceColumns(valueGroups.value, VALUES_LEFT_GROUPS)))
const osmosisGroups = computed(() => printOsmosisGroups(props.osmosisGroups, props.settings))
const osmosisColumns = computed(() => (landscape.value ? balanceColumns(osmosisGroups.value, null, 3) : balanceColumns(osmosisGroups.value, OSMOSIS_LEFT_GROUPS)))
const recommendations = computed(() => printRecommendations(props.recommendationItems, props.settings, props.completed))
const schedule = computed(() => doseSchedule(props.dosingItems))
const doseGridStyle = computed(() => ({ gridTemplateColumns: `minmax(140px, 1.6fr) repeat(${schedule.value.days}, minmax(44px, 1fr)) minmax(70px, 0.9fr)` }))
const products = computed(() => printProducts(recommendations.value))
const contents = computed(() => [
  props.settings.sections.values && valueGroups.value.length && { key: 'values', label: 'Messwerte' },
  props.settings.sections.osmosis && osmosisGroups.value.length && { key: 'osmosis', label: 'Osmosewasser' },
  props.settings.sections.charts && { key: 'charts', label: 'Zusammensetzung & Verhältnisse' },
  props.settings.sections.recommendations && recommendations.value.length && { key: 'recommendations', label: 'Empfehlungen' },
  props.settings.sections.dosing && schedule.value.days && { key: 'dosing', label: 'Dosierungsplan' },
  props.settings.sections.products && products.value.length && { key: 'products', label: 'Produkte mit QR-Code' },
].filter(Boolean))
// Jeder Abschnitt trägt dieselbe Nummer wie im Inhaltsverzeichnis auf dem Deckblatt.
function number(key) {
  return String(contents.value.findIndex((item) => item.key === key) + 1).padStart(2, '0')
}

// Deckblatt
const heroImage = computed(() => profile.value?.image || publicUrl('/reef-tank.webp'))
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
    .slice(0, landscape.value ? 4 : 7)
})

// Logo absolut, damit es auch in einem Druckfenster ohne eigene Basis-URL lädt.
const logoUrl = absolutePublicUrl('/ati-logo.png')
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
  const entries = await Promise.all([reportUrl, ...products.value.map((product) => product.url)].filter(Boolean).map(async (url) => {
    try { return [url, await QRCode.toString(url, { type: 'svg', margin: 0, width: 44, errorCorrectionLevel: 'M', color: { dark: '#0a1b43', light: '#0000' } })] } catch { return [url, ''] }
  }))
  qrCodes.value = Object.fromEntries(entries)
  qrReady.value = true
}
watch(products, buildQrCodes)
onMounted(buildQrCodes)

// Fußzeile auf jeder Seite: Aquarium, Analyse, Seitenzahl und ein QR-Code zum Bericht online.
// Chrome setzt sie in die Randfelder von @page; die Seitenränder legt ReportView fest.
const reportUrl = absolutePublicUrl(`/analyses/${encodeURIComponent(props.analysis.id)}`)
const footerCss = computed(() => {
  const lines = [
    props.analysis.aquariumName,
    [`Analyse-Nr. ${props.analysis.reportNumber || props.analysis.id}`, formatDate(props.analysis.completedAt || props.analysis.createdAt)].filter(Boolean).join(' · '),
  ].filter(Boolean)
  const qr = qrCodes.value[reportUrl]
  const box = 'padding-top: 3mm; border-top: 0.75pt solid #0072ce; color: #3d4f69; font: 7.5pt/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; vertical-align: top; white-space: pre;'
  return `@page {
    @bottom-left { content: ${cssString(lines.join('\n'))}; ${box} }
    @bottom-center { content: "Seite " counter(page) " von " counter(pages); ${box} }
    @bottom-right { content: ${qr ? `"Bericht online\\A" url("data:image/svg+xml,${encodeURIComponent(qr)}")` : '""'}; text-align: right; ${box} }
  }`
})
function cssString(text) {
  return `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ')}"`
}
let footerStyle = null
onMounted(() => {
  footerStyle = document.createElement('style')
  footerStyle.textContent = footerCss.value
  document.head.appendChild(footerStyle)
})
watch(footerCss, (css) => { if (footerStyle) footerStyle.textContent = css })
onBeforeUnmount(() => footerStyle?.remove())

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
/* Das Deckblatt steht allein, und jeder Abschnitt beginnt auf einer neuen Seite – so bleiben die Themen
   klar getrennt. Karten, Gruppen und Diagramme werden nicht geteilt; eine Überschrift bleibt bei ihrem Inhalt. */
.rp-cover { break-after: page; }
.rp-section { break-before: page; }
.rp-head { break-inside: avoid; break-after: avoid; }
.compact-group, .dosing-grid, .rp-legend, .plan-footer { break-inside: avoid; }
h3 { margin: 0; font-size: 11pt; }
.rp-eyebrow { display: block; color: #004f93; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
/* Abschnittskopf: Nummer wie im Inhaltsverzeichnis, Titel und eine Zeile, worum es geht */
.rp-head { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1.5px solid #0072ce; }
.rp-num { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: #0072ce; color: #fff; font-size: 12pt; font-weight: 800; }
.rp-head h2 { margin: 0; color: #14213d; font: 700 20pt/1.15 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.02em; }
.rp-head p { margin: 3px 0 0; color: #5b6b82; font: 9.5pt/1.4 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

/* ── Deckblatt ── */
/* Seitenhöhe ohne Ränder (oben 12 mm, unten 24 mm für die Fußzeile) */
.rp-cover { display: flex; flex-direction: column; gap: 14px; height: 259mm; overflow: hidden; }
.rp-landscape .rp-cover { height: 172mm; gap: 8px; }
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
.compact-values { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 16px; }
.compact-column { display: grid; gap: 16px; min-width: 0; }
.compact-group { overflow: hidden; border: 1px solid #dde5ee; border-radius: 12px; background: #fff; }
.compact-group-head { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-bottom: 1px solid #dde5ee; background: #f7f9fc; }
.compact-group-head strong { color: #14213d; font-size: 8.5pt; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.compact-group-head > b { color: #5b6b82; font-size: 7.5pt; font-weight: 600; }
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
.compact-table tbody th, .compact-table td { padding: 4px 12px; vertical-align: middle; }
.compact-table tbody th { width: 100%; max-width: 0; font-weight: 600; text-align: left; }
.compact-element { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
.compact-dot { flex: none; align-self: center; width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
tr.watch .compact-dot { background: #f59e0b; }
tr.critical .compact-dot { background: #e85d4f; }
.compact-name { overflow: hidden; color: #14213d; font-size: 8.5pt; text-overflow: ellipsis; white-space: nowrap; }
.compact-symbol { color: #5b6b82; font-size: 7pt; font-weight: 600; }
.compact-table td { white-space: nowrap; }
/* Flach: nur Werte außerhalb des Ziels bekommen eine helle Fläche */
.compact-pill { display: inline-flex; align-items: baseline; gap: 3px; padding: 1.5px 7px; border-radius: 6px; color: #0f6b4c; }
.compact-pill b { color: inherit; font-size: 8.5pt; font-weight: 700; }
.compact-pill small { color: inherit; font-size: 6.5pt; font-weight: 600; opacity: 0.72; }
tr.watch .compact-pill { background: #fff3da; color: #92400e; }
tr.critical .compact-pill { background: #fde4e0; color: #a92e22; }
.compact-table:not(.osmosis) tr.undetected.good .compact-pill { color: #94a3b8; }
tr.undetected .compact-pill b { font-weight: 600; }
.compact-target { color: #5b6b82; font-size: 7.5pt; }
.compact-status { color: #047857; font-weight: 700; }
tr.critical .compact-status { color: #b53a2e; }
/* Querformat: niedrigere Zeilen, damit die Tabellen auf eine Seite passen */
.rp-landscape .compact-table tbody th, .rp-landscape .compact-table td { padding-block: 1.5px; }
.rp-landscape .compact-table thead th { padding-block: 3px 2px; }
.rp-landscape .compact-group-head { padding-block: 5px; }
.rp-landscape .compact-values { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.rp-landscape .compact-values, .rp-landscape .compact-column { gap: 8px; }
.rp-legend { margin: 16px 0 0; color: #5b6b82; font-size: 8pt; }
.rp-legend i { display: inline-block; width: 7px; height: 7px; margin: 0 4px 0 10px; border-radius: 50%; background: #10b981; }
.rp-legend i:first-child { margin-left: 0; }
.rp-legend i.watch { background: #f59e0b; }
.rp-legend i.critical { background: #e85d4f; }

/* ── Diagramme: Bildschirm-Komponenten, im Druck ohne Schatten und Animation ── */
.rp-charts { display: block; }
.rp-charts :deep(*) { animation: none !important; transition: none !important; box-shadow: none !important; }
.rp-charts > * { min-width: 0; break-inside: avoid; }
/* Lange Paar-Anzeigen dürfen zwischen zwei Zeilen umbrechen, damit keine halbe Seite leer bleibt */
.rp-charts > .pg { display: block; container-type: normal; break-inside: auto; }
.rp-charts :deep(.pg-rows) { display: block; }
.rp-charts :deep(.pg-row) { break-inside: avoid; }
.rp-charts :deep(.pg-head) { break-inside: avoid; break-after: avoid; }
/* Bedienelemente gehören nicht aufs Papier */
.rp-charts :deep(.cmp-seg), .rp-charts :deep(.cmp-guide-hint) { display: none !important; }
.rp-charts :deep(.cmp-toolbar) { justify-content: flex-end; }
/* Skalenbeschriftung der Paar-Anzeigen bleibt in ihrer Karte */
.rp-charts :deep(.tg-scale) { overflow: hidden; }
.rp-charts > .cmp { display: block; container-type: normal; }
/* Im Druck nur die Lesehilfe, ohne die versteckte Detailansicht; der Kasten bleibt als Ganzes zusammen */
.rp-charts :deep(.cmp-readout > .hidden) { display: none; }
.rp-charts :deep(.cmp-readout) { break-inside: avoid; }
/* Alle Diagramme auf eine Seite: flachere Säulen, die Lesehilfe neben der Skizze, schmalere Paar-Zeilen */
.rp-charts > .cmp, .rp-charts > .pg { padding: 12px 16px; }
.rp-charts > * + * { margin-top: 12px; }
.rp-charts > .cmp > * + * { margin-top: 8px; }
.rp-charts > .pg > * + * { margin-top: 8px; }
.rp-charts :deep(.cmp-head h3), .rp-charts :deep(.pg-head h3) { font-size: 14px; }
.rp-charts :deep(.cmp-verdict), .rp-charts :deep(.pg-head p) { margin-top: 2px; font-size: 10.5px; }
.rp-charts :deep(.cmp-stage) { height: 185px; padding-block: 12px 6px; }
.rp-charts :deep(.cmp-xaxis span) { font-size: 10px; }
.rp-charts :deep(.cmp-readout) { padding: 8px; }
.rp-charts :deep(.cmp-guide) { gap: 6px; }
.rp-charts :deep(.cmp-guide-head > strong) { font-size: 10.5px; }
.rp-charts :deep(.cmp-steps) { gap: 6px; }
.rp-charts :deep(.cmp-step) { grid-template-columns: 112px minmax(0, 1fr); align-items: center; gap: 8px; padding: 5px 7px; }
.rp-charts :deep(.cmp-step-copy strong) { gap: 5px; font-size: 10px; }
.rp-charts :deep(.cmp-step-copy strong i) { width: 14px; height: 14px; font-size: 8.5px; }
.rp-charts :deep(.cmp-step-copy small) { font-size: 8.5px; line-height: 1.35; }
.rp-charts :deep(.pg-row) { padding: 4px 12px; }
.rp-charts :deep(.pg-row + .pg-row) { margin-top: 5px; }
.rp-charts :deep(.pg-hint) { margin-top: 1px; font-size: 10px; }
.rp-charts :deep(.pg-symbol) { min-height: 32px; border-radius: 9px; font-size: 10px; }
.rp-charts :deep(.pg-name) { gap: 2px; }
.rp-charts :deep(.pg-name strong) { font-size: 11.5px; line-height: 1.25; }
.rp-charts :deep(.pg-meta small) { font-size: 9.5px; }
.rp-charts :deep(.pg-chip) { padding: 1px 6px; font-size: 9px; }
.rp-charts :deep(.tg) { padding-top: 24px; }
.rp-charts :deep(.tg-bubble) { padding: 2px 7px; font-size: 10.5px; }
.rp-charts :deep(.tg-scale) { height: 11px; margin-top: 4px; }
.rp-charts :deep(.tg-scale small) { font-size: 8.5px; }
/* Querformat: links Zusammensetzung und Wachstum, rechts die Verhältnisse */
.rp-landscape .rp-charts { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-auto-flow: row dense; align-items: start; gap: 12px 14px; }
.rp-landscape .rp-charts > .rp-head { grid-column: 1 / -1; }
.rp-landscape .rp-charts > * + * { margin-top: 0; }
.rp-landscape .rp-charts > .cmp, .rp-landscape .rp-charts > .rp-growth { grid-column: 1; }
.rp-landscape .rp-charts > .rp-ratios { grid-column: 2; grid-row: span 2; }
.rp-landscape .rp-charts > .rp-head { margin-bottom: 4px; }
.rp-landscape .rp-charts :deep(.cmp-stage) { height: 110px; padding-top: 10px; }
.rp-landscape .rp-charts :deep(.cmp-guide-head), .rp-landscape .rp-charts :deep(.pg-hint) { display: none; }
/* Wenig Höhe: die Lesehilfe nur als drei kurze Textspalten */
.rp-landscape .rp-charts :deep(.cmp-art) { display: none; }
.rp-landscape .rp-charts :deep(.cmp-step) { grid-template-columns: minmax(0, 1fr); padding: 4px 6px; }
.rp-landscape .rp-charts :deep(.cmp-step-copy small) { font-size: 7.5px; }
.rp-landscape .rp-charts :deep(.pg-row) { grid-template-columns: 44px minmax(0, 0.9fr) minmax(0, 1.3fr); gap: 10px; }

/* ── Empfehlungen ── */
.rp-action { margin-bottom: 16px; padding: 14px 16px; border: 1px solid #dde5ee; border-left: 4px solid #10b981; border-radius: 12px; break-inside: avoid; }
.rp-action.watch { border-left-color: #f59e0b; }
.rp-action.critical { border-left-color: #e85d4f; }
.rp-action header { display: flex; gap: 10px; align-items: flex-start; }
.rp-action header small { color: #5b6b82; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.rp-check { flex: none; display: grid; place-items: center; width: 14px; height: 14px; margin-top: 2px; border: 1.5px solid #b8c9dd; border-radius: 4px; color: #0f9f8f; font-size: 9pt; font-weight: 800; }
.rp-action p { margin: 7px 0 0; }
.rp-options { margin-top: 8px; padding-left: 10px; border-left: 2px solid #dde5ee; }
.rp-options p { margin: 2px 0; }
.rp-detail { margin-top: 10px; }
.rp-detail .rp-eyebrow { margin-bottom: 3px; }
.rp-detail ul.rp-supply { grid-template-columns: minmax(0, 1fr); gap: 3px; }
.rp-detail .rp-supply li { align-items: center; justify-content: flex-start; gap: 7px; padding: 4px 7px; border: 1px solid #cfe4f3; border-radius: 6px; }
.rp-supply i { display: grid; place-items: center; flex: none; width: 15px; height: 15px; border-radius: 4px; background: #e0f0fb; color: #0072ce; font-size: 8pt; font-style: normal; font-weight: 700; }
.rp-supply li.down i { background: #fff4df; color: #9a4d0a; }
.rp-supply span { flex: 1; }
.rp-supply em { padding: 0 6px; border-radius: 999px; background: #0072ce; color: #fff; font-size: 7.5pt; font-style: normal; font-weight: 700; }
.rp-detail .rp-supply li.kept { border-style: dashed; color: #5b6b82; }
.rp-supply li.kept i, .rp-supply li.kept em { background: #eef2f7; color: #5b6b82; }
.rp-detail ul { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2px 14px; margin: 0; padding: 0; list-style: none; }
.rp-detail li { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; border-bottom: 1px dotted #cbd5e1; }
.rp-products-line { color: #0072ce; font-weight: 600; }
.rp-tip { color: #475569; font-size: 8.5pt; font-style: italic; }

/* ── Dosierungsplan: Gestaltung wie das Druckblatt des Dosierungsplans (DosingCalendar) ── */
.rp-dose-sheet { color: #0a1b43; font: 10px Arial, sans-serif; }
.rp-dose-sheet .plan-footer { margin: 0; line-height: 1.5; }
.dosing-grid { display: grid; margin: 0 0 16px; overflow: hidden; border: 1px solid #cbd9e7; border-radius: 8px; }
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
.rp-product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.rp-landscape .rp-product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.rp-product { display: flex; gap: 14px; align-items: center; padding: 14px; border: 1px solid #dde5ee; border-radius: 12px; break-inside: avoid; }
.rp-qr { flex: none; width: 76px; height: 76px; }
.rp-qr :deep(svg) { display: block; width: 100%; height: 100%; }
.rp-product p { margin: 3px 0; color: #475569; font-size: 8.5pt; }
.rp-product small { color: #5b6b82; font-size: 7.5pt; }

</style>
