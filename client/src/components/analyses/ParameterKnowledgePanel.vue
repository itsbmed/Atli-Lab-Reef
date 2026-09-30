<template>
  <div v-if="panel === 'info'" class="parameter-info-panel">
    <template v-if="hasAnalyticalProfile">
      <section class="knowledge-intro">
        <div class="knowledge-intro-mark" aria-hidden="true">{{ symbol }}</div>
        <div>
          <span>Bedeutung</span>
          <h3>{{ parameter.label }} im Aquariensystem</h3>
          <p>{{ guide.general }}</p>
        </div>
      </section>

      <section class="reference-strip" aria-label="Orientierungswerte">
        <article class="ideal">
          <span>Idealbereich</span>
          <strong>{{ targetRange }} {{ parameter.unit }}</strong>
          <small>Empfohlener Zielkorridor</small>
        </article>
        <article v-if="!hasAnalyticsLimits" class="method">
          <span>Analysemethode</span>
          <strong>{{ analysisMethods }}</strong>
          <small>Hinterlegte Laborgrundlage</small>
        </article>
        <article v-if="hasAttentionThreshold" class="attention">
          <span>Achtung ab</span>
          <strong>&gt; {{ formatNumber(guide.attentionThreshold) }} {{ parameter.unit }}</strong>
          <small>Erhöhte Aufmerksamkeit</small>
        </article>
        <article v-if="guide.referenceConditions" class="conditions">
          <span>Referenzbedingungen</span>
          <strong>{{ guide.referenceConditions }}</strong>
          <small>Grundlage der Einordnung</small>
        </article>
        <article class="status">
          <span>Laborstatus</span>
          <strong>{{ labStatus }}</strong>
          <small>{{ displayValue }}<template v-if="!isUndetectable"> {{ parameter.unit }}</template></small>
        </article>
      </section>

      <section v-if="hasAnalyticsLimits" class="analytics-card">
        <header>
          <div><span>Analytik</span><h3>Was die Messmethoden zuverlässig erkennen</h3></div>
          <em>LOD / LOQ</em>
        </header>
        <div class="analytics-table" role="table" aria-label="Nachweis- und Bestimmungsgrenzen">
          <div class="analytics-row analytics-head" role="row">
            <span role="columnheader">Methode</span><span role="columnheader">LOD</span><span role="columnheader">LOQ</span>
          </div>
          <div v-for="row in guide.analytics" :key="row.method" class="analytics-row" role="row">
            <strong role="cell">{{ row.method }}</strong><span role="cell">{{ row.lod }}</span><span role="cell">{{ row.loq }}</span>
          </div>
        </div>
        <div v-if="guide.lodDefinition || guide.loqDefinition" class="analytics-explainers">
          <article v-if="guide.lodDefinition"><b>LOD</b><div><strong>Nachweisgrenze</strong><p>{{ guide.lodDefinition }}</p></div></article>
          <article v-if="guide.loqDefinition"><b>LOQ</b><div><strong>Bestimmungsgrenze</strong><p>{{ guide.loqDefinition }}</p></div></article>
        </div>
      </section>

      <section :class="['parameter-current-status', parameter.tone]">
        <span>Aktuelle Einordnung</span><strong>{{ statusLabel }}</strong><p>{{ insight }}</p>
      </section>
    </template>

    <template v-else>
      <div class="parameter-info-lead"><span>Allgemeine Information</span><p>{{ guide.general }}</p></div>
      <div class="parameter-spec-grid">
        <div><span>Symbol</span><strong>{{ symbol }}</strong></div>
        <div><span>Einheit</span><strong>{{ parameter.unit }}</strong></div>
        <div><span>Zielbereich</span><strong>{{ parameter.target }} {{ parameter.unit }}</strong></div>
        <div><span>Laborstatus</span><strong>{{ labStatus }}</strong></div>
      </div>
      <div :class="['parameter-current-status', parameter.tone]"><span>Aktuelle Einordnung</span><strong>{{ statusLabel }}</strong><p>{{ insight }}</p></div>
    </template>
  </div>

  <div v-else class="parameter-recommendation-panel">
    <div :class="['current-recommendation', parameter.tone]"><span>Empfehlung für diesen Messwert</span><p>{{ currentAction }}</p></div>

    <template v-if="hasStructuredAdvice">
      <section class="advice-workspace">
        <header class="advice-heading">
          <div><span>{{ advicePathLabel }}</span><h3>{{ adviceHeading }}</h3></div>
          <div class="direction-switch" role="group" aria-label="Richtung der Abweichung">
            <button type="button" :class="['low', { active: direction === 'low' }]" :aria-pressed="direction === 'low'" @click="direction = 'low'">
              <i aria-hidden="true">↓</i><span>Zu wenig</span><small v-if="currentDirection === 'low'">Aktuell</small>
            </button>
            <button type="button" :class="['high', { active: direction === 'high' }]" :aria-pressed="direction === 'high'" @click="direction = 'high'">
              <i aria-hidden="true">↑</i><span>Zu viel</span><small v-if="currentDirection === 'high'">Aktuell</small>
            </button>
          </div>
        </header>

        <div :class="['advice-path', direction]">
          <article v-for="(section, index) in adviceSections" :key="section.key" :class="{ correction: section.key === 'corrections' }">
            <header><b>{{ String(index + 1).padStart(2, '0') }}</b><div><span>{{ section.label }}</span><strong>{{ section.title }}</strong></div></header>
            <component :is="section.key === 'corrections' ? 'ol' : 'ul'"><li v-for="item in section.items" :key="item">{{ item }}</li></component>
          </article>
        </div>
      </section>
    </template>

    <div v-else class="level-recommendations">
      <article class="high"><strong>Wenn der Wert zu hoch ist</strong><p>{{ guide.high }}</p></article>
      <article class="low"><strong>Wenn der Wert zu niedrig ist</strong><p>{{ guide.low }}</p></article>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  panel: { type: String, required: true },
  parameter: { type: Object, required: true },
  guide: { type: Object, required: true },
  symbol: { type: String, required: true },
  labStatus: { type: String, required: true },
  statusLabel: { type: String, required: true },
  insight: { type: String, required: true },
  currentAction: { type: String, required: true },
})

const hasAnalyticalProfile = computed(() => Array.isArray(props.guide.analytics) && props.guide.analytics.length > 0)
const hasAnalyticsLimits = computed(() => props.guide.analytics?.some((row) => String(row?.lod || '').trim() || String(row?.loq || '').trim()))
const hasAttentionThreshold = computed(() => props.guide.attentionThreshold !== '' && props.guide.attentionThreshold != null && Number.isFinite(Number(props.guide.attentionThreshold)))
const analysisMethods = computed(() => props.guide.analytics?.map((row) => row.method).filter(Boolean).join(' · ') || props.parameter.source || 'Nicht angegeben')
const hasStructuredAdvice = computed(() => ['low', 'high'].some((key) =>
  ['causes', 'effects', 'corrections'].some((field) => props.guide.advice?.[key]?.[field]?.length)))
const currentDirection = computed(() => {
  if (props.parameter.sourceDirection === 'in_range' || props.parameter.tone === 'good') return ''
  if (props.parameter.sourceDirection === 'low' || props.parameter.sourceDirection === 'high') return props.parameter.sourceDirection
  const value = Number(props.parameter.value)
  if (Number.isFinite(value) && value < Number(props.guide.targetMin)) return 'low'
  if (Number.isFinite(value) && value > Number(props.guide.targetMax)) return 'high'
  return ''
})
const direction = ref(currentDirection.value || 'low')
const adviceHeading = computed(() => currentDirection.value ? 'Was trifft auf die Abweichung zu?' : 'Was gilt bei einer Abweichung?')
const activeAdvice = computed(() => props.guide.advice?.[direction.value] || { causes: [], effects: [], corrections: [] })
const adviceSections = computed(() => [
  { key: 'causes', label: 'Mögliche Ursachen', title: 'Warum weicht der Wert ab?', items: activeAdvice.value.causes || [] },
  { key: 'effects', label: 'Mögliche Effekte', title: 'Was passiert ohne Korrektur?', items: activeAdvice.value.effects || [] },
  { key: 'corrections', label: 'Nächste Schritte', title: 'Was kann ich dagegen tun?', items: activeAdvice.value.corrections || [] },
].filter((section) => section.items.length))
const advicePathLabel = computed(() => adviceSections.value.map((section) => ({ causes: 'Ursache', effects: 'Effekt', corrections: 'Korrektur' }[section.key])).join(' → '))
const isUndetectable = computed(() => props.parameter.resultStatus === 'below_detection')
const displayValue = computed(() => props.parameter.reportedValue ?? props.parameter.value ?? '—')
const targetRange = computed(() => `${formatNumber(props.guide.targetMin)}–${formatNumber(props.guide.targetMax)}`)

function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('de-DE', { maximumFractionDigits: 4 }) : String(value || '—')
}
</script>

<style scoped>
.parameter-info-panel,.parameter-recommendation-panel { display: grid; gap: 12px; }
.parameter-info-panel span,.parameter-recommendation-panel span { color: var(--teal-700); font-size: 10px; font-weight: 850; letter-spacing: .09em; text-transform: uppercase; }
.parameter-info-panel p,.parameter-recommendation-panel p { margin-top: 5px; color: var(--text-muted); font-size: 13px; line-height: 1.6; }
.knowledge-intro { display: grid; grid-template-columns: 54px minmax(0,1fr); gap: 15px; padding: 18px; border: 1px solid rgba(0,114,206,.16); border-radius: 17px; background: linear-gradient(135deg,#fff 0%,#f1f8fd 100%); }
.knowledge-intro-mark { display: grid; place-items: center; align-self: start; width: 54px; height: 54px; border-radius: 16px; background: linear-gradient(145deg,var(--brand-blue),#0f9f8f); color: #fff; box-shadow: 0 9px 20px rgba(0,114,206,.2); font-size: 18px; font-weight: 900; }
.knowledge-intro h3,.analytics-card h3,.advice-heading h3 { margin-top: 3px; color: var(--text); font-size: 16px; line-height: 1.3; }
.knowledge-intro p { max-width: 950px; }
.reference-strip { display: grid; grid-template-columns: repeat(auto-fit,minmax(165px,1fr)); gap: 8px; }
.reference-strip article { min-width: 0; padding: 13px 14px; border: 1px solid var(--border); border-radius: 14px; background: #fff; }
.reference-strip article.ideal { border-top: 3px solid #10b981; }
.reference-strip article.attention { border-top: 3px solid #f59e0b; }
.reference-strip article.method { border-top: 3px solid #0f9f8f; }
.reference-strip article.conditions { border-top: 3px solid var(--brand-blue); }
.reference-strip article.status { border-top: 3px solid #7c3aed; }
.reference-strip strong,.reference-strip small { display: block; }
.reference-strip strong { margin-top: 6px; color: var(--text); font-size: 13px; line-height: 1.35; }
.reference-strip small { margin-top: 4px; color: var(--text-muted); font-size: 9px; line-height: 1.4; }
.analytics-card { overflow: hidden; border: 1px solid var(--border); border-radius: 17px; background: #fff; }
.analytics-card > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 18px; background: #f2f8fc; }
.analytics-card > header em { flex: none; padding: 6px 9px; border: 1px solid rgba(0,114,206,.15); border-radius: 999px; background: #fff; color: var(--brand-blue); font-size: 9px; font-style: normal; font-weight: 900; letter-spacing: .08em; }
.analytics-table { padding: 0 18px; }
.analytics-row { display: grid; grid-template-columns: minmax(120px,1.2fr) repeat(2,minmax(130px,1fr)); align-items: center; gap: 12px; padding: 13px 4px; border-bottom: 1px solid var(--border); }
.analytics-row > * { min-width: 0; }
.analytics-row strong { color: var(--text); font-size: 13px; }
.analytics-row span { color: var(--text); font-size: 12px; font-weight: 750; letter-spacing: 0; text-transform: none; }
.analytics-head { padding-block: 10px; }
.analytics-head span { color: var(--text-muted); font-size: 9px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.analytics-explainers { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; padding: 13px 18px 18px; }
.analytics-explainers article { display: grid; grid-template-columns: 38px minmax(0,1fr); gap: 10px; padding: 12px; border-radius: 12px; background: #f8fbfe; }
.analytics-explainers b { display: grid; place-items: center; align-self: start; width: 38px; height: 38px; border-radius: 10px; background: #e4f2fb; color: var(--brand-blue); font-size: 10px; }
.analytics-explainers strong { color: var(--text); font-size: 11px; }
.analytics-explainers p { margin-top: 3px; font-size: 10.5px; line-height: 1.5; }
.parameter-info-lead,.current-recommendation { padding: 14px 15px; border: 1px solid var(--border); border-radius: 13px; background: #fff; }
.parameter-spec-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; }
.parameter-spec-grid > div { min-width: 0; padding: 11px 12px; border-radius: 12px; background: #eef5fb; }
.parameter-spec-grid strong { display: block; margin-top: 4px; overflow: hidden; color: var(--text); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.parameter-current-status { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 3px 14px; padding: 13px 15px; border: 1px solid #bbf7d0; border-radius: 13px; background: #ecfdf5; }
.parameter-current-status > strong { color: #047857; font-size: 12px; }
.parameter-current-status p { grid-column: 1/-1; color: #086b51; }
.parameter-current-status.watch { border-color: #fed7aa; background: #fff7ed; }
.parameter-current-status.watch > strong,.parameter-current-status.watch p { color: #9a4d0a; }
.parameter-current-status.critical { border-color: #f8c9c4; background: #fff1ef; }
.parameter-current-status.critical > strong,.parameter-current-status.critical p { color: #b53a2e; }
.current-recommendation { border-left: 4px solid #10b981; }
.current-recommendation.watch { border-left-color: #f59e0b; }
.current-recommendation.critical { border-left-color: #e85d4f; }
.advice-workspace { overflow: hidden; border: 1px solid var(--border); border-radius: 17px; background: #fff; }
.advice-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 16px 18px; border-bottom: 1px solid var(--border); background: #f5f9fc; }
.direction-switch { display: grid; grid-template-columns: repeat(2,minmax(112px,1fr)); gap: 4px; padding: 4px; border-radius: 13px; background: #e8eff5; }
.direction-switch button { min-height: 46px; display: grid; grid-template-columns: 22px auto; grid-template-rows: auto auto; align-items: center; column-gap: 7px; padding: 6px 11px; border: 0; border-radius: 10px; background: transparent; color: var(--text-muted); text-align: left; cursor: pointer; }
.direction-switch i { grid-row: 1/-1; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; background: rgba(255,255,255,.7); color: currentColor; font-size: 13px; font-style: normal; font-weight: 900; }
.direction-switch span { color: inherit; font-size: 10px; letter-spacing: 0; text-transform: none; }
.direction-switch small { color: inherit; font-size: 8px; font-weight: 800; opacity: .7; }
.direction-switch button.active { background: #fff; color: #1666a8; box-shadow: 0 4px 12px rgba(10,27,67,.09); }
.direction-switch button.high.active { color: #b45309; }
.advice-path { display: grid; grid-template-columns: repeat(auto-fit,minmax(230px,1fr)); gap: 10px; padding: 14px; }
.advice-path article { min-width: 0; padding: 15px; border: 1px solid var(--border); border-radius: 14px; background: #fff; }
.advice-path article.correction { border-color: rgba(0,114,206,.2); background: #f3f9fd; }
.advice-path.high article.correction { border-color: #fed7aa; background: #fff8ed; }
.advice-path article > header { display: grid; grid-template-columns: 30px minmax(0,1fr); align-items: start; gap: 9px; }
.advice-path article > header b { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: #e9f2f8; color: var(--brand-blue); font-size: 9px; }
.advice-path.high article > header b { background: #fff0d9; color: #b45309; }
.advice-path article > header strong { display: block; margin-top: 2px; color: var(--text); font-size: 11px; line-height: 1.35; }
.advice-path ul,.advice-path ol { display: grid; gap: 8px; margin: 13px 0 0; padding-left: 18px; }
.advice-path li { padding-left: 2px; color: var(--text-muted); font-size: 11px; line-height: 1.5; }
.advice-path li::marker { color: var(--brand-blue); font-weight: 900; }
.advice-path.high li::marker { color: #d97706; }
.level-recommendations { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
.level-recommendations article { padding: 14px 15px; border: 1px solid var(--border); border-radius: 13px; background: #fff; }
.level-recommendations article.high { border-top: 3px solid #e85d4f; }
.level-recommendations article.low { border-top: 3px solid #1686d9; }
.level-recommendations strong { color: var(--text); font-size: 12px; }
@media (max-width:900px) { .reference-strip { grid-template-columns: repeat(2,minmax(0,1fr)); }.advice-heading { align-items: stretch; flex-direction: column; }.direction-switch { align-self: flex-start; }.advice-path { grid-template-columns: 1fr; } }
@media (max-width:600px) { .knowledge-intro { grid-template-columns: 42px minmax(0,1fr); padding: 15px; }.knowledge-intro-mark { width: 42px; height: 42px; border-radius: 12px; font-size: 14px; }.reference-strip,.parameter-spec-grid,.analytics-explainers { grid-template-columns: 1fr; }.analytics-card > header { align-items: flex-start; }.analytics-row { grid-template-columns: 1fr 1fr; }.analytics-row > :first-child { grid-column: 1/-1; }.analytics-head { display: none; }.analytics-row span::before { display: block; margin-bottom: 2px; color: var(--text-muted); font-size: 8px; font-weight: 850; letter-spacing: .08em; }.analytics-row span:nth-child(2)::before { content: 'LOD'; }.analytics-row span:nth-child(3)::before { content: 'LOQ'; }.direction-switch { width: 100%; grid-template-columns: repeat(2,minmax(0,1fr)); }.direction-switch button { min-width: 0; }.level-recommendations { grid-template-columns: 1fr; } }
</style>
