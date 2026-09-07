<template>
  <section class="dosing-plan">
    <header class="plan-hero">
      <div class="hero-copy">
        <span class="eyebrow">Persönlicher Dosierungsplan</span>
        <h2>Niedrige Werte Schritt für Schritt korrigieren</h2>
        <p>Automatisch aus Analyse und Aquariumprofil erstellt. Keine doppelte Dateneingabe.</p>
        <div class="context-chips">
          <span><i>◉</i>{{ analysis.aquariumName }}</span>
          <span><i>◌</i>{{ volume ? `${formatNumber(volume)} l netto` : 'Volumen fehlt' }}</span>
          <span><i>✦</i>{{ supplySystem }}</span>
        </div>
      </div>
      <div class="hero-score">
        <div class="progress-ring" :style="progressStyle"><strong>{{ progressPercent }}</strong><small>%</small></div>
        <span>Planfortschritt</span><small>{{ completedStageCount }} von {{ totalStageCount }} Etappen</small>
      </div>
    </header>

    <div v-if="!volume" class="profile-warning"><b>Netto-Volumen fehlt</b><span>Bitte das verbundene Aquariumprofil vervollständigen, bevor eine Mengenberechnung verwendet wird.</span></div>

    <div v-if="!plan.length" class="plan-clean">
      <i>✓</i><div><strong>Keine Unterversorgung erkannt</strong><p>Es ist aktuell keine Korrektur durch Dosierung erforderlich.</p></div>
    </div>

    <template v-else>
      <nav class="flow-nav" aria-label="Bereiche des Dosierungsplans">
        <button v-for="step in views" :key="step.key" type="button" :class="{ active: activeView === step.key, done: viewDone(step.key) }" @click="activeView = step.key">
          <b>{{ viewDone(step.key) ? '✓' : step.number }}</b>
          <span><strong>{{ step.label }}</strong><small>{{ step.caption }}</small></span>
        </button>
      </nav>

      <Transition name="plan-swap" mode="out-in">
        <section v-if="activeView === 'overview'" key="overview" class="view-panel">
          <header class="view-head">
            <div><span>01 · Überblick</span><h3>{{ plan.length }} {{ plan.length === 1 ? 'Wert braucht' : 'Werte brauchen' }} Aufmerksamkeit</h3><p>Beginnen Sie mit kritischen Werten und verändern Sie möglichst nur eine Versorgung gleichzeitig.</p></div>
            <div class="priority-badge"><b>{{ urgentCount }}</b><span>kritisch</span></div>
          </header>
          <div class="issue-grid">
            <button v-for="item in plan" :key="item.key" type="button" :class="['issue-card', item.tone]" @click="openCorrection(item.key)">
              <span class="element-mark">{{ item.symbol }}</span>
              <span class="issue-copy"><small>{{ item.tone === 'critical' ? 'Hohe Priorität' : 'Beobachten' }}</small><strong>{{ item.label }}</strong><em>{{ item.value }} → {{ item.targetValue }} {{ item.unit }}</em></span>
              <span class="mini-progress"><i :style="{ width: `${correctionPosition(item)}%` }"></i></span>
              <span class="issue-action">Plan öffnen <b>→</b></span>
            </button>
          </div>
          <button class="primary-action" type="button" @click="openCorrection(plan[0].key)">Mit wichtigster Korrektur beginnen <span>→</span></button>
        </section>

        <section v-else-if="activeView === 'correction'" key="correction" class="view-panel correction-view">
          <aside class="element-switcher">
            <span>Korrekturen</span>
            <button v-for="item in plan" :key="item.key" type="button" :class="[{ active: selectedItem?.key === item.key }, item.tone]" @click="selectedKey = item.key">
              <i>{{ item.symbol }}</i><span><strong>{{ item.label }}</strong><small>{{ item.value }} {{ item.unit }}</small></span><b v-if="itemProgress(item) === 100">✓</b><em v-else>{{ itemProgress(item) }}%</em>
            </button>
          </aside>

          <article v-if="selectedItem" class="correction-card">
            <header><div class="element-large">{{ selectedItem.symbol }}</div><div><span>{{ selectedItem.tone === 'critical' ? 'Hohe Priorität' : 'Kontrollierte Korrektur' }}</span><h3>{{ selectedItem.action }}</h3><p>{{ selectedItem.note }}</p></div></header>
            <div class="metric-row">
              <div><span>Gemessen</span><strong>{{ selectedItem.value }}</strong><small>{{ selectedItem.unit }}</small></div><i>→</i>
              <div class="target"><span>Zielwert</span><strong>{{ selectedItem.targetValue }}</strong><small>{{ selectedItem.unit }}</small></div>
              <div><span>Elementbedarf</span><strong>{{ formatMass(selectedItem.requiredMassMg) }}</strong><small>für {{ formatNumber(volume) }} Liter</small></div>
            </div>
            <div class="source-note"><span>Versorgungssystem</span><strong>{{ supplySystem }}</strong><p>Eine konkrete Produktmenge wird erst ausgegeben, wenn eine geprüfte Konzentration im Produktkatalog hinterlegt ist.</p></div>
            <div class="timeline-head"><div><span>Etappenplan</span><h4>Langsam statt auf einmal</h4></div><small>Etappen der Reihe nach abschließen</small></div>
            <div class="stage-timeline">
              <button v-for="(share, index) in selectedItem.stageShares" :key="share" type="button" :disabled="stageLocked(selectedItem, index)" :class="{ done: stageDone[stageKey(selectedItem, index)], locked: stageLocked(selectedItem, index) }" :aria-pressed="Boolean(stageDone[stageKey(selectedItem, index)])" @click="toggleStage(selectedItem, index)">
                <span class="stage-number">{{ stageDone[stageKey(selectedItem, index)] ? '✓' : index + 1 }}</span>
                <span class="stage-copy"><small>Etappe {{ index + 1 }} · {{ share }} %</small><strong>{{ stageRequirement(selectedItem, share) }}</strong><em>Wert um {{ stageIncrease(selectedItem, share) }} {{ selectedItem.unit }} anheben</em></span>
                <span class="stage-state">{{ stageDone[stageKey(selectedItem, index)] ? 'Erledigt' : stageLocked(selectedItem, index) ? 'Gesperrt' : 'Als erledigt markieren' }}</span>
              </button>
            </div>
            <footer><button type="button" class="secondary-action" @click="activeView = 'overview'">← Übersicht</button><button type="button" class="primary-action compact" @click="activeView = 'followup'">Zur Nachkontrolle <span>→</span></button></footer>
          </article>
        </section>

        <section v-else key="followup" class="view-panel followup-view">
          <header class="view-head"><div><span>03 · Nachkontrolle</span><h3>Wirkung prüfen und dokumentieren</h3><p>Der Plan endet nicht mit der Dosierung. Beobachtung und erneute Messung gehören zur Korrektur.</p></div><div class="completion-orb" :class="{ complete: followupComplete }">{{ followupComplete ? '✓' : completedCheckCount }}</div></header>
          <div class="check-list">
            <label v-for="step in safetySteps" :key="step.key" :class="{ done: checks[step.key] }"><input v-model="checks[step.key]" type="checkbox" /><i>{{ checks[step.key] ? '✓' : '' }}</i><span><b>{{ step.title }}</b><small>{{ step.text }}</small></span></label>
          </div>
          <div class="recheck-card"><div class="calendar-icon"><b>{{ recheckDays }}</b><small>Tage</small></div><div><span>Empfohlene Nachkontrolle</span><strong>In {{ recheckDays }} Tagen erneut messen</strong><p>Kritische Elemente früher kontrollieren. Das neue Ergebnis anschließend mit diesem Bericht vergleichen.</p></div></div>
          <aside class="safety-note"><b>Wichtiger Sicherheitshinweis</b><p>Der Dosierungsplan ist eine Rechenhilfe. Bei kranken Tieren, starken Abweichungen oder unklaren Produktangaben zuerst fachlich Rücksprache halten.</p></aside>
        </section>
      </Transition>
    </template>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { buildDosingPlan, formatMass } from '@/services/dosingPlan'

const props = defineProps({ analysis: { type: Object, required: true } })
const views = [
  { key: 'overview', number: '1', label: 'Überblick', caption: 'Bedarf verstehen' },
  { key: 'correction', number: '2', label: 'Korrektur', caption: 'Etappen durchführen' },
  { key: 'followup', number: '3', label: 'Nachkontrolle', caption: 'Wirkung bestätigen' },
]
const safetySteps = [
  { key: 'verify', title: 'Grundlage geprüft', text: 'Messwert, Zielbereich und automatisch verwendetes Netto-Volumen stimmen.' },
  { key: 'observe', title: 'Tiere beobachtet', text: 'Nach jeder Etappe wurden Korallen und Tiere auf Reaktionen kontrolliert.' },
  { key: 'separate', title: 'Korrekturen getrennt', text: 'Unterschiedliche Elemente wurden nicht unkontrolliert parallel korrigiert.' },
  { key: 'recheck', title: 'Nachmessung eingeplant', text: 'Der nächste Kontrolltermin wurde vorgemerkt.' },
]
const activeView = ref('overview')
const selectedKey = ref('')
const saved = loadProgress()
const stageDone = reactive(saved.stages || {})
const checks = reactive(saved.checks || {})
const volume = computed(() => Number(props.analysis.aquariumProfile?.volumeLiters || props.analysis.aquariumProfile?.net_volume || 0))
const supplySystem = computed(() => props.analysis.aquariumProfile?.supplySystem || 'Keine Versorgung hinterlegt')
const plan = computed(() => buildDosingPlan(props.analysis.parameters, volume.value).sort((a, b) => toneRank(a.tone) - toneRank(b.tone)))
const selectedItem = computed(() => plan.value.find((item) => item.key === selectedKey.value) || plan.value[0] || null)
const urgentCount = computed(() => plan.value.filter((item) => item.tone === 'critical').length)
const totalStageCount = computed(() => plan.value.reduce((sum, item) => sum + item.stageShares.length, 0))
const completedStageCount = computed(() => plan.value.reduce((sum, item) => sum + item.stageShares.filter((_, index) => stageDone[stageKey(item, index)]).length, 0))
const progressPercent = computed(() => totalStageCount.value ? Math.round(completedStageCount.value / totalStageCount.value * 100) : 100)
const progressStyle = computed(() => ({ background: `conic-gradient(#19bca5 ${progressPercent.value * 3.6}deg, rgba(255,255,255,.14) 0deg)` }))
const completedCheckCount = computed(() => safetySteps.filter((item) => checks[item.key]).length)
const followupComplete = computed(() => completedCheckCount.value === safetySteps.length)
const recheckDays = computed(() => urgentCount.value ? 7 : 14)

watch([stageDone, checks], () => {
  try { localStorage.setItem(progressKey(), JSON.stringify({ stages: { ...stageDone }, checks: { ...checks } })) } catch { /* local progress is optional */ }
}, { deep: true })

function progressKey() { return `reef-pilot:dosing-plan:${props.analysis.id}` }
function loadProgress() { try { return JSON.parse(localStorage.getItem(progressKey()) || '{}') } catch { return {} } }
function toneRank(tone) { return tone === 'critical' ? 0 : tone === 'watch' ? 1 : 2 }
function formatNumber(value) { return Number(value || 0).toLocaleString('de-DE') }
function openCorrection(key) { selectedKey.value = key; activeView.value = 'correction' }
function stageKey(item, index) { return `${item.key}-${index}` }
function stageLocked(item, index) { return index > 0 && !stageDone[stageKey(item, index - 1)] }
function toggleStage(item, index) {
  if (stageLocked(item, index)) return
  const nextState = !stageDone[stageKey(item, index)]
  stageDone[stageKey(item, index)] = nextState
  if (!nextState) item.stageShares.slice(index + 1).forEach((_, offset) => { stageDone[stageKey(item, index + offset + 1)] = false })
}
function itemProgress(item) { return Math.round(item.stageShares.filter((_, index) => stageDone[stageKey(item, index)]).length / item.stageShares.length * 100) }
function viewDone(view) { return view === 'overview' ? activeView.value !== 'overview' : view === 'correction' ? progressPercent.value === 100 : followupComplete.value }
function correctionPosition(item) { return Math.max(8, Math.min(100, Number(item.value) / Number(item.targetValue || 1) * 100)) }
function stageIncrease(item, share) { return Number((item.deficit * share / 100).toFixed(Math.max(2, item.precision || 0))).toLocaleString('de-DE') }
function stageRequirement(item, share) { return item.requiredMassMg === null ? `+ ${stageIncrease(item, share)} ${item.unit}` : formatMass(item.requiredMassMg * share / 100) }
</script>

<style scoped>
.dosing-plan{display:grid;gap:20px}.plan-hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px;border-radius:20px;background:linear-gradient(125deg,#071c40 0%,#0a3e74 58%,#087f91 100%);color:#fff}.plan-hero:after{position:absolute;right:-90px;bottom:-120px;width:300px;height:300px;border:55px solid rgba(255,255,255,.05);border-radius:50%;content:""}.hero-copy,.hero-score{position:relative;z-index:1}.eyebrow,.view-head>div>span,.timeline-head>div>span{color:#8de6dc;font-size:10px;font-weight:850;letter-spacing:.11em;text-transform:uppercase}.hero-copy h2{max-width:670px;margin-top:6px;font-size:clamp(25px,3vw,36px);line-height:1.08;letter-spacing:-.035em}.hero-copy>p{max-width:650px;margin-top:7px;color:rgba(255,255,255,.68);font-size:13px}.context-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:17px}.context-chips span{display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(255,255,255,.08);font-size:10px;font-weight:750}.context-chips i{color:#73e0d3;font-style:normal}.hero-score{display:grid;justify-items:center;min-width:130px}.progress-ring{position:relative;display:grid;place-items:center;width:94px;height:94px;border-radius:50%}.progress-ring:after{position:absolute;inset:9px;border-radius:50%;background:#0a315f;content:""}.progress-ring strong,.progress-ring small{position:relative;z-index:1}.progress-ring strong{font-size:29px}.progress-ring small{position:absolute;margin:25px 0 0 42px;color:#8de6dc;font-size:10px}.hero-score>span{margin-top:8px;font-size:11px;font-weight:850}.hero-score>small{margin-top:2px;color:rgba(255,255,255,.58);font-size:9px}.profile-warning{display:flex;gap:8px;padding:11px 14px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;color:#9a4d0a;font-size:11px}.plan-clean{min-height:180px;display:flex;align-items:center;justify-content:center;gap:15px;border-radius:18px;background:#ecfdf5;color:#047857}.plan-clean i{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#10b981;color:#fff;font-size:22px;font-style:normal;font-weight:900}.plan-clean strong{display:block;font-size:17px}.plan-clean p{margin-top:3px;font-size:12px}.flow-nav{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:5px;border:1px solid var(--border);border-radius:16px;background:#f1f6fa}.flow-nav button{display:flex;align-items:center;gap:10px;min-height:58px;padding:9px 12px;border:0;border-radius:12px;background:transparent;color:var(--text-muted);text-align:left;cursor:pointer}.flow-nav button>b{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:9px;background:#dfe9f1;color:#63778a;font-size:11px}.flow-nav button span,.flow-nav button strong,.flow-nav button small{display:block}.flow-nav button strong{color:inherit;font-size:12px}.flow-nav button small{margin-top:2px;font-size:9px}.flow-nav button.active{background:#fff;color:var(--brand-blue);box-shadow:0 4px 14px rgba(10,27,67,.08)}.flow-nav button.active>b{background:var(--brand-blue);color:#fff}.flow-nav button.done>b{background:#10b981;color:#fff}.view-panel{display:grid;gap:18px}.view-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.view-head>div>span,.timeline-head>div>span{color:var(--teal-700)}.view-head h3{margin-top:4px;color:var(--text);font-size:23px;letter-spacing:-.02em}.view-head p{max-width:700px;margin-top:5px;color:var(--text-muted);font-size:12px}.priority-badge{display:flex;align-items:baseline;gap:5px;padding:10px 13px;border-radius:12px;background:#fff1ef;color:#b53a2e}.priority-badge b{font-size:21px}.priority-badge span{font-size:10px;font-weight:850}.issue-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:10px}.issue-card{display:grid;grid-template-columns:42px 1fr;gap:10px;padding:14px;border:1px solid var(--border);border-top:3px solid #f59e0b;border-radius:15px;background:#fff;color:inherit;text-align:left;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s}.issue-card.critical{border-top-color:#e85d4f}.issue-card:hover{transform:translateY(-2px);border-color:#9cc4df;box-shadow:0 10px 25px rgba(10,27,67,.08)}.element-mark,.element-large{display:grid;place-items:center;border-radius:12px;background:var(--teal-50);color:var(--brand-blue);font-weight:900}.element-mark{width:40px;height:40px;font-size:11px}.issue-copy,.issue-copy>*{display:block}.issue-copy small{color:#b45309;font-size:8px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.critical .issue-copy small{color:#c24135}.issue-copy strong{margin-top:2px;color:var(--text);font-size:14px}.issue-copy em{margin-top:3px;color:var(--text-muted);font-size:10px;font-style:normal}.mini-progress{grid-column:1/-1;height:5px;overflow:hidden;border-radius:999px;background:#edf2f6}.mini-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#f59e0b,#19bca5)}.issue-action{grid-column:1/-1;display:flex;justify-content:space-between;padding-top:2px;color:var(--brand-blue);font-size:10px;font-weight:850}.primary-action,.secondary-action{display:flex;align-items:center;justify-content:center;gap:12px;min-height:46px;padding:0 17px;border:0;border-radius:13px;font-size:12px;font-weight:850;cursor:pointer}.primary-action{justify-self:end;background:var(--brand-blue);color:#fff;box-shadow:0 7px 18px rgba(0,114,206,.2)}.primary-action:hover{background:#0565b3}.primary-action.compact{min-height:40px}.secondary-action{background:#edf4f9;color:var(--brand-blue)}.correction-view{grid-template-columns:225px minmax(0,1fr);align-items:start}.element-switcher{display:grid;gap:7px;padding:10px;border:1px solid var(--border);border-radius:16px;background:#f5f9fc}.element-switcher>span{padding:4px 5px;color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.element-switcher button{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;padding:9px;border:1px solid transparent;border-radius:11px;background:transparent;color:inherit;text-align:left;cursor:pointer}.element-switcher button:hover{background:#fff}.element-switcher button.active{border-color:#bdd8ea;background:#fff;box-shadow:0 4px 12px rgba(10,27,67,.07)}.element-switcher button>i{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:#e7f3fb;color:var(--brand-blue);font-size:9px;font-style:normal;font-weight:900}.element-switcher button span,.element-switcher button strong,.element-switcher button small{display:block}.element-switcher button strong{color:var(--text);font-size:11px}.element-switcher button small{margin-top:2px;color:var(--text-muted);font-size:9px}.element-switcher button>b{color:#10b981}.element-switcher button>em{color:var(--text-muted);font-size:8px;font-style:normal}.correction-card{overflow:hidden;border:1px solid var(--border);border-radius:18px;background:#fff}.correction-card>header{display:grid;grid-template-columns:58px 1fr;gap:13px;padding:20px}.element-large{width:56px;height:56px;font-size:15px}.correction-card>header span{color:#c24135;font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.correction-card>header h3{margin-top:2px;color:var(--text);font-size:20px}.correction-card>header p{margin-top:4px;color:var(--text-muted);font-size:11px;line-height:1.5}.metric-row{display:grid;grid-template-columns:1fr auto 1fr 1.25fr;align-items:center;gap:10px;padding:14px 20px;border-block:1px solid var(--border);background:#f8fbfe}.metric-row>div{display:grid;grid-template-columns:1fr auto;gap:2px 5px;padding:10px 12px;border-radius:11px;background:#fff}.metric-row>div>span{grid-column:1/-1;color:var(--text-muted);font-size:8px;font-weight:800;text-transform:uppercase}.metric-row strong{color:var(--text);font-size:18px}.metric-row small{align-self:end;color:var(--text-muted);font-size:8px}.metric-row>i{color:var(--teal-500);font-style:normal}.metric-row .target{background:#ecfdf5}.metric-row .target strong{color:#047857}.source-note{display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:10px;padding:11px 20px;border-bottom:1px solid var(--border)}.source-note span{color:var(--teal-700);font-size:8px;font-weight:850;text-transform:uppercase}.source-note strong{color:var(--text);font-size:10px}.source-note p{color:var(--text-muted);font-size:9px}.timeline-head{display:flex;align-items:flex-end;justify-content:space-between;padding:18px 20px 10px}.timeline-head h4{margin-top:2px;color:var(--text);font-size:15px}.timeline-head>small{color:var(--text-muted);font-size:9px}.stage-timeline{display:grid;gap:8px;padding:0 20px 20px}.stage-timeline button{display:grid;grid-template-columns:36px 1fr auto;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:13px;background:#fff;color:inherit;text-align:left;cursor:pointer}.stage-timeline button:not(.locked):hover{border-color:#8bcbbb;background:#f5fdfb}.stage-timeline button.done{border-color:#86efac;background:#ecfdf5}.stage-timeline button.locked{opacity:.48;cursor:not-allowed}.stage-number{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#e8f1f7;color:var(--brand-blue);font-size:11px;font-weight:900}.done .stage-number{background:#10b981;color:#fff}.stage-copy,.stage-copy>*{display:block}.stage-copy small{color:var(--teal-700);font-size:8px;font-weight:850;text-transform:uppercase}.stage-copy strong{margin-top:2px;color:var(--text);font-size:14px}.stage-copy em{margin-top:2px;color:var(--text-muted);font-size:9px;font-style:normal}.stage-state{color:var(--brand-blue);font-size:9px;font-weight:850}.done .stage-state{color:#047857}.correction-card>footer{display:flex;justify-content:space-between;gap:10px;padding:13px 20px;border-top:1px solid var(--border);background:#f8fbfe}.completion-orb{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:#edf3f7;color:var(--brand-blue);font-size:18px;font-weight:900}.completion-orb.complete{background:#10b981;color:#fff}.check-list{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.check-list label{display:grid;grid-template-columns:22px 1fr;gap:10px;padding:14px;border:1px solid var(--border);border-radius:13px;cursor:pointer}.check-list label.done{border-color:#86efac;background:#ecfdf5}.check-list input{position:absolute;opacity:0;pointer-events:none}.check-list i{display:grid;place-items:center;width:20px;height:20px;border:2px solid #c8d6e2;border-radius:6px;color:#fff;font-size:10px;font-style:normal}.check-list .done i{border-color:#10b981;background:#10b981}.check-list b,.check-list small{display:block}.check-list b{color:var(--text);font-size:12px}.check-list small{margin-top:3px;color:var(--text-muted);font-size:10px;line-height:1.45}.recheck-card{display:flex;align-items:center;gap:15px;padding:17px;border-radius:15px;background:linear-gradient(110deg,#eef8ff,#eafcf8)}.calendar-icon{display:grid;place-items:center;flex:none;width:58px;height:58px;border-radius:14px;background:var(--brand-blue);color:#fff}.calendar-icon b{font-size:20px}.calendar-icon small{margin-top:-7px;color:#bce5ff;font-size:8px;text-transform:uppercase}.recheck-card span{color:var(--teal-700);font-size:8px;font-weight:850;text-transform:uppercase}.recheck-card strong{display:block;margin-top:2px;color:var(--text);font-size:14px}.recheck-card p{margin-top:3px;color:var(--text-muted);font-size:10px}.safety-note{padding:12px 14px;border-left:4px solid #f59e0b;border-radius:11px;background:#fff7ed}.safety-note b{color:#92400e;font-size:10px}.safety-note p{margin-top:3px;color:#9a4d0a;font-size:10px;line-height:1.45}.plan-swap-enter-active,.plan-swap-leave-active{transition:opacity .16s ease,transform .16s ease}.plan-swap-enter-from{opacity:0;transform:translateX(8px)}.plan-swap-leave-to{opacity:0;transform:translateX(-8px)}
@media(max-width:900px){.plan-hero{align-items:flex-start}.correction-view{grid-template-columns:1fr}.element-switcher{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))}.element-switcher>span{grid-column:1/-1}.metric-row{grid-template-columns:1fr 1fr}.metric-row>i{display:none}.source-note{grid-template-columns:1fr}.source-note p{grid-column:1}.check-list{grid-template-columns:1fr}}
@media(max-width:620px){.plan-hero{align-items:stretch;flex-direction:column;padding:20px}.hero-score{grid-template-columns:auto 1fr;justify-items:start;gap:0 10px}.progress-ring{grid-row:1/3;width:70px;height:70px}.progress-ring strong{font-size:22px}.progress-ring small{margin:19px 0 0 32px}.hero-score>span{align-self:end}.flow-nav{grid-template-columns:1fr}.flow-nav button{min-height:48px}.view-head{align-items:flex-start}.issue-grid{grid-template-columns:1fr}.primary-action{width:100%;justify-self:stretch}.metric-row{grid-template-columns:1fr}.correction-card>header{grid-template-columns:46px 1fr;padding:16px}.element-large{width:44px;height:44px}.stage-timeline,.timeline-head{padding-inline:14px}.stage-timeline button{grid-template-columns:34px 1fr}.stage-state{grid-column:2}.correction-card>footer{flex-direction:column}.recheck-card{align-items:flex-start}}
</style>
