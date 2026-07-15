<template>
  <div class="report">
    <RouterLink to="/analyses" class="back-link">← Zurück zu den Analysen</RouterLink>

    <section v-if="!analysis" class="missing-card">
      <span>Analysebericht</span>
      <h1>Bericht nicht gefunden</h1>
      <p>Der gesuchte Laborbericht ist lokal nicht vorhanden.</p>
      <RouterLink to="/analyses" class="btn btn-primary">Alle Analysen öffnen</RouterLink>
    </section>

    <template v-else>
      <section :class="['report-hero', analysis.severity]">
        <div>
          <span class="hero-kicker">{{ analysis.packageLabel }} · {{ analysis.reportNumber }}</span>
          <h1>{{ analysis.aquariumName }}</h1>
          <p>{{ analysis.reasonLabel }} · {{ formatDate(analysis.createdAt) }} · {{ analysis.barcode }}</p>
          <div class="hero-actions">
            <button class="btn btn-primary" type="button" @click="copyReportLink">Bericht teilen</button>
            <button class="btn btn-ghost" type="button" @click="markPdf">PDF vormerken</button>
          </div>
          <p v-if="actionMsg" class="action-msg">{{ actionMsg }}</p>
        </div>

        <div class="score-card">
          <div class="score-ring" :style="scoreRingStyle">
            <strong>{{ analysis.score ?? '—' }}</strong>
            <span v-if="analysis.score !== null">%</span>
          </div>
          <div>
            <span>{{ analysis.statusLabel }}</span>
            <strong>{{ resultLabel }}</strong>
            <em>{{ issueCopy }}</em>
          </div>
        </div>
      </section>

      <section class="workflow-card">
        <div v-for="step in WORKFLOW_STEPS" :key="step.key" :class="['workflow-step', { done: step.rank <= currentRank, active: step.key === analysis.status }]">
          <i></i>
          <span>{{ step.label }}</span>
        </div>
      </section>

      <nav v-if="analysis.status === 'completed'" class="report-tabs" aria-label="Berichtsbereiche">
        <button type="button" :class="{ active: activeTab === 'recommendations' }" @click="activeTab = 'recommendations'">
          Empfehlungen <b v-if="carePlan.length">{{ carePlan.length }}</b>
        </button>
        <button type="button" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">
          Übersicht
        </button>
        <button type="button" :class="{ active: activeTab === 'values' }" @click="activeTab = 'values'">
          Alle Werte <b>{{ analysis.parameters.length }}</b>
        </button>
      </nav>

      <section v-show="activeTab === 'overview'" class="report-layout">
        <main class="report-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <span>Laborwerte</span>
                <h2>Parameterübersicht</h2>
              </div>
              <strong>{{ analysis.parameters.length || '—' }} Werte</strong>
            </div>

            <div v-if="analysis.parameters.length" class="parameter-grid">
              <div v-for="param in analysis.parameters" :key="param.key" :class="['parameter-card', param.tone]">
                <span>{{ param.label }}</span>
                <strong>{{ param.value }} <small>{{ param.unit }}</small></strong>
                <em>Ziel {{ param.target }}</em>
              </div>
            </div>
            <p v-else class="muted">Die Laborwerte werden angezeigt, sobald der Bericht fertig ist.</p>
          </section>

          <section class="panel">
            <div class="section-head">
              <div>
                <span>Empfehlungen</span>
                <h2>Nächste Maßnahmen</h2>
              </div>
            </div>
            <div v-if="analysis.recommendations.length" class="recommendation-list">
              <div v-for="(item, index) in analysis.recommendations" :key="item" class="recommendation-row">
                <b>{{ index + 1 }}</b>
                <p>{{ item }}</p>
              </div>
            </div>
            <p v-else class="muted">Empfehlungen folgen nach abgeschlossener Laborbewertung.</p>
          </section>
        </main>

        <aside class="report-side">
          <section class="panel">
            <div class="section-head compact">
              <div>
                <span>Hinweise</span>
                <h2>Auffälligkeiten</h2>
              </div>
            </div>
            <div v-if="analysis.issues?.length" class="issue-list">
              <span v-for="issue in analysis.issues" :key="issue">{{ issue }}</span>
            </div>
            <p v-else class="muted">Keine Auffälligkeiten dokumentiert.</p>
          </section>

          <section class="panel meta-panel">
            <div><span>Status</span><strong>{{ analysis.statusLabel }}</strong></div>
            <div><span>Wassertyp</span><strong>{{ analysis.waterType }}</strong></div>
            <div><span>Analysepaket</span><strong>{{ analysis.packageLabel }}</strong></div>
            <div><span>Abgeschlossen</span><strong>{{ analysis.completedAt ? formatDate(analysis.completedAt) : 'Offen' }}</strong></div>
          </section>
        </aside>
      </section>

      <section v-if="analysis.status === 'completed'" v-show="activeTab === 'recommendations'" class="panel care-plan">
        <div class="care-head">
          <div>
            <span>Empfehlungen</span>
            <h2>{{ carePlan.length ? 'Ihr Pflegeplan' : 'Kein Eingriff notwendig' }}</h2>
            <p v-if="carePlan.length">{{ careProgress }} von {{ carePlan.length }} Aufgaben erledigt · nach Priorität sortiert</p>
            <p v-else>Alle gemessenen Werte liegen stabil. Pflege und Dosierung können unverändert fortgeführt werden.</p>
          </div>
          <div v-if="carePlan.length" class="care-mode" role="group" aria-label="Darstellung des Pflegeplans">
            <button type="button" :class="{ active: careMode === 'quick' }" @click="careMode = 'quick'">Schnell</button>
            <button type="button" :class="{ active: careMode === 'detail' }" @click="careMode = 'detail'">Ausführlich</button>
          </div>
        </div>

        <div v-if="carePlan.length" class="care-progress" aria-label="Fortschritt des Pflegeplans">
          <span :style="{ width: `${careProgressPercent}%` }"></span>
        </div>

        <div v-if="!carePlan.length" class="care-clean">
          <span aria-hidden="true">✓</span>
          <div><strong>System stabil</strong><p>Nutzen Sie diesen Bericht als Referenz für die nächste Messung.</p></div>
        </div>

        <ol v-else-if="careMode === 'quick'" class="quick-actions">
          <li v-for="(item, index) in carePlan" :key="item.key" :class="[item.tone, { done: completedActions[item.key] }]">
            <button type="button" class="care-check" :aria-label="`${item.title} als erledigt markieren`" @click="toggleCareAction(item.key)">
              {{ completedActions[item.key] ? '✓' : index + 1 }}
            </button>
            <div><strong>{{ item.title }}</strong><span>{{ item.summary }}</span></div>
            <em>{{ item.recheck }}</em>
            <button type="button" class="care-open" @click="openCareDetail(item.key)">Plan ansehen</button>
          </li>
        </ol>

        <div v-else class="care-details">
          <article v-for="(item, index) in carePlan" :key="item.key" :data-care-key="item.key" :class="['care-card', item.tone, { done: completedActions[item.key] }]">
            <header>
              <button type="button" class="care-check" :aria-label="`${item.title} als erledigt markieren`" @click="toggleCareAction(item.key)">
                {{ completedActions[item.key] ? '✓' : String(index + 1).padStart(2, '0') }}
              </button>
              <div>
                <span>Priorität {{ item.priority }}</span>
                <h3>{{ item.title }}</h3>
                <p>{{ item.summary }}</p>
              </div>
              <em>{{ item.recheck }}</em>
            </header>
            <div class="care-card-grid">
              <div>
                <span class="care-label">Warum</span>
                <p>{{ item.why }}</p>
              </div>
              <div>
                <span class="care-label">So gehen Sie vor</span>
                <ol>
                  <li v-for="step in item.steps" :key="step">{{ step }}</li>
                </ol>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-if="analysis.status === 'completed'" v-show="activeTab === 'values'" class="panel element-explorer">
        <div class="explorer-head">
          <div>
            <span>Element Explorer</span>
            <h2>Messwerte und Zielbereiche</h2>
            <p>{{ explorerSummary }}</p>
          </div>
          <div class="explorer-controls">
            <input v-model="parameterSearch" type="search" placeholder="Parameter suchen..." aria-label="Parameter suchen" />
            <select v-model="parameterStatus" aria-label="Messwerte nach Status filtern">
              <option value="all">Alle Status</option>
              <option value="issues">Nur auffällig</option>
              <option value="critical">Kritisch</option>
              <option value="watch">Beobachten</option>
              <option value="good">Im Zielbereich</option>
            </select>
          </div>
        </div>

        <div class="parameter-groups" aria-label="Parametergruppen">
          <button type="button" :class="{ active: !selectedGroup }" @click="selectedGroup = ''">
            <span>Alle Gruppen</span><b>{{ analysis.parameters.length }}</b>
          </button>
          <button
            v-for="group in parameterGroups"
            :key="group.key"
            type="button"
            :class="[group.tone, { active: selectedGroup === group.key }]"
            @click="selectedGroup = selectedGroup === group.key ? '' : group.key"
          >
            <span>{{ group.label }}</span>
            <b>{{ group.issueCount ? `${group.issueCount} prüfen` : 'Stabil' }}</b>
          </button>
        </div>

        <div class="element-list">
          <article
            v-for="parameter in visibleParameters"
            :key="parameter.key"
            :class="['element-row', parameter.tone, { expanded: expandedParameters[parameter.key] }]"
          >
            <button class="element-head" type="button" @click="toggleParameter(parameter.key)">
              <span class="element-symbol">{{ parameterSymbol(parameter) }}</span>
              <span class="element-name">
                <strong>{{ parameter.label }}</strong>
                <em>{{ parameterGroup(parameter).label }} · {{ parameterStatusLabel(parameter.tone) }}</em>
              </span>
              <span class="target-gauge">
                <i><b :style="{ left: `${gaugePosition(parameter)}%` }"></b></i>
                <small>Ziel {{ parameter.target }} {{ parameter.unit }}</small>
              </span>
              <span class="element-reading">
                <strong>{{ parameter.value }}</strong>
                <small>{{ parameter.unit }}</small>
              </span>
              <span class="element-chevron" aria-hidden="true">⌄</span>
            </button>
            <div v-if="expandedParameters[parameter.key]" class="element-detail">
              <div>
                <span>Einordnung</span>
                <p>{{ parameterInsight(parameter) }}</p>
              </div>
              <div>
                <span>Nächster Schritt</span>
                <p>{{ parameterAction(parameter) }}</p>
              </div>
              <div class="parameter-trend">
                <div class="trend-heading">
                  <div><span>Verlauf</span><p>{{ trendSummary(parameter) }}</p></div>
                  <strong>{{ historyChange(parameter) }}</strong>
                </div>
                <ParameterTrendChart :parameter="parameter" />
              </div>
            </div>
          </article>
          <div v-if="!visibleParameters.length" class="no-results">
            <strong>Keine Messwerte gefunden</strong>
            <span>Suche oder Filter anpassen, um wieder Parameter zu sehen.</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAnalysesStore } from '@/stores/analyses'
import { WORKFLOW_STEPS } from '@/services/analysisStore'
import ParameterTrendChart from '@/components/analyses/ParameterTrendChart.vue'

const route = useRoute()
const analyses = useAnalysesStore()
const actionMsg = ref('')
const activeTab = ref('overview')
const selectedGroup = ref('')
const parameterSearch = ref('')
const parameterStatus = ref('all')
const careMode = ref('quick')
const expandedParameters = reactive({})
const completedActions = reactive({})
onMounted(() => analyses.load())

const analysis = computed(() => analyses.items.find((item) => item.id === route.params.id) || null)
const currentRank = computed(() => WORKFLOW_STEPS.find((step) => step.key === analysis.value?.status)?.rank || 0)
const resultLabel = computed(() => {
  if (!analysis.value || analysis.value.status !== 'completed') return 'Laborprozess läuft'
  if (analysis.value.severity === 'critical') return 'Korrektur nötig'
  if (analysis.value.severity === 'watch') return 'Beobachten'
  return 'Stabil'
})
const issueCopy = computed(() => {
  if (!analysis.value) return ''
  if (analysis.value.status !== 'completed') return 'Ergebnisse werden vorbereitet.'
  return `${analysis.value.issueCount} Hinweise im Bericht`
})
const scoreRingStyle = computed(() => {
  const score = analysis.value?.score ?? 0
  const color = analysis.value?.severity === 'critical' ? '#e85d4f' : analysis.value?.severity === 'watch' ? '#f59e0b' : '#10b981'
  return { background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.16) 0deg)` }
})
const parameterGroups = computed(() => {
  const groups = new Map()
  for (const parameter of analysis.value?.parameters || []) {
    const meta = parameterGroup(parameter)
    if (!groups.has(meta.key)) groups.set(meta.key, { ...meta, parameters: [], issueCount: 0 })
    const group = groups.get(meta.key)
    group.parameters.push(parameter)
    if (parameter.tone !== 'good') group.issueCount += 1
  }
  return [...groups.values()].map((group) => ({
    ...group,
    tone: group.parameters.some((item) => item.tone === 'critical') ? 'critical' : group.issueCount ? 'watch' : 'good',
  }))
})
const visibleParameters = computed(() => {
  const query = parameterSearch.value.trim().toLowerCase()
  return (analysis.value?.parameters || [])
    .filter((parameter) => !selectedGroup.value || parameterGroup(parameter).key === selectedGroup.value)
    .filter((parameter) => {
      if (parameterStatus.value === 'all') return true
      if (parameterStatus.value === 'issues') return parameter.tone !== 'good'
      return parameter.tone === parameterStatus.value
    })
    .filter((parameter) => !query || `${parameter.label} ${parameter.key}`.toLowerCase().includes(query))
    .sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || a.label.localeCompare(b.label, 'de'))
})
const explorerSummary = computed(() => {
  const scope = parameterGroups.value.find((group) => group.key === selectedGroup.value)?.label || 'allen Gruppen'
  const issues = visibleParameters.value.filter((parameter) => parameter.tone !== 'good').length
  return `${issues} ${issues === 1 ? 'Auffälligkeit' : 'Auffälligkeiten'} in ${scope}`
})
const issueParameters = computed(() => (analysis.value?.parameters || []).filter((parameter) => parameter.tone !== 'good'))
const carePlan = computed(() => issueParameters.value
  .map((parameter, index) => buildCareAction(parameter, index))
  .sort((a, b) => toneRank(a.tone) - toneRank(b.tone)))
const careProgress = computed(() => carePlan.value.filter((item) => completedActions[item.key]).length)
const careProgressPercent = computed(() => carePlan.value.length ? Math.round((careProgress.value / carePlan.value.length) * 100) : 100)

const GROUP_MAP = {
  salinity: { key: 'basis', label: 'Basiswerte' },
  kh: { key: 'basis', label: 'Basiswerte' },
  calcium: { key: 'quantity', label: 'Mengenelemente' },
  magnesium: { key: 'quantity', label: 'Mengenelemente' },
  nitrate: { key: 'nutrients', label: 'Nährstoffe' },
  phosphate: { key: 'nutrients', label: 'Nährstoffe' },
}
const SYMBOL_MAP = { salinity: 'PSU', kh: 'KH', calcium: 'Ca', magnesium: 'Mg', nitrate: 'NO₃', phosphate: 'PO₄' }

function parameterGroup(parameter) {
  return GROUP_MAP[parameter.key] || { key: 'trace', label: 'Spurenelemente' }
}
function parameterSymbol(parameter) {
  return SYMBOL_MAP[parameter.key] || parameter.label.slice(0, 2)
}
function parameterStatusLabel(tone) {
  return { critical: 'Kritisch', watch: 'Beobachten', good: 'Optimal' }[tone] || 'Offen'
}
function toneRank(tone) {
  return { critical: 0, watch: 1, good: 2 }[tone] ?? 3
}
function targetBounds(target) {
  const values = String(target || '').match(/-?\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(',', '.'))) || []
  return values.length >= 2 ? [values[0], values[1]] : [0, Math.max(values[0] || 1, 1)]
}
function gaugePosition(parameter) {
  const [minimum, maximum] = targetBounds(parameter.target)
  const span = Math.max(maximum - minimum, Math.abs(maximum) * 0.15, 0.01)
  const scaleMinimum = minimum - span
  const scaleMaximum = maximum + span
  return Math.min(96, Math.max(4, ((Number(parameter.value) - scaleMinimum) / (scaleMaximum - scaleMinimum)) * 100))
}
function toggleParameter(key) {
  expandedParameters[key] = !expandedParameters[key]
}
function parameterInsight(parameter) {
  if (parameter.tone === 'good') return `${parameter.label} liegt im vorgesehenen Zielbereich und unterstützt die aktuelle Systemstabilität.`
  const [minimum, maximum] = targetBounds(parameter.target)
  const direction = Number(parameter.value) > maximum ? 'über' : Number(parameter.value) < minimum ? 'unter' : 'nahe an'
  return `${parameter.label} liegt ${direction} dem Zielbereich. Verlauf und mögliche gemeinsame Ursachen mit weiteren auffälligen Werten berücksichtigen.`
}
function parameterAction(parameter) {
  if (parameter.tone === 'good') return 'Dosierung und Pflege beibehalten. Den Wert beim nächsten Laborbericht als Referenz vergleichen.'
  return analysis.value?.recommendations?.find((item) => item.toLowerCase().includes(parameter.label.toLowerCase()))
    || `${parameter.label} langsam korrigieren, keine starken Einzeländerungen vornehmen und zeitnah kontrollieren.`
}
function trendSummary(parameter) {
  const history = parameter.history || []
  if (history.length < 2) return 'Noch keine Vergleichsmessung vorhanden.'
  const first = Number(history[0].value)
  const last = Number(history.at(-1).value)
  const direction = last > first ? 'gestiegen' : last < first ? 'gesunken' : 'stabil geblieben'
  return `Seit der ersten Vergleichsmessung ${direction}.`
}
function historyChange(parameter) {
  const history = parameter.history || []
  if (history.length < 2) return 'Erste Messung'
  const first = Number(history[0].value)
  const last = Number(history.at(-1).value)
  const percent = first ? ((last - first) / Math.abs(first)) * 100 : 0
  const prefix = percent > 0 ? '+' : ''
  return `${prefix}${percent.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%`
}
function buildCareAction(parameter, index) {
  const recommendation = analysis.value?.recommendations?.find((item) => item.toLowerCase().includes(parameter.label.toLowerCase()))
    || analysis.value?.recommendations?.[index]
    || `${parameter.label} kontrolliert in den Zielbereich zurückführen.`
  const [minimum, maximum] = targetBounds(parameter.target)
  const isHigh = Number(parameter.value) > maximum
  const direction = isHigh ? 'über' : Number(parameter.value) < minimum ? 'unter' : 'am Rand von'
  const priority = parameter.tone === 'critical' ? 'Hoch' : 'Mittel'
  const days = parameter.tone === 'critical' ? 7 : 14
  return {
    key: parameter.key,
    tone: parameter.tone,
    priority,
    title: `${parameter.label} ${isHigh ? 'senken' : 'stabilisieren'}`,
    summary: recommendation,
    why: `${parameter.label} liegt mit ${parameter.value} ${parameter.unit} ${direction} dem Zielbereich ${parameter.target} ${parameter.unit}. Langsame, nachvollziehbare Korrekturen schützen das System vor zusätzlichen Schwankungen.`,
    steps: careSteps(parameter, isHigh),
    recheck: `Kontrolle in ${days} Tagen`,
  }
}
function careSteps(parameter, isHigh) {
  const steps = isHigh
    ? [`Aktive ${parameter.label}-Zufuhr und mögliche Eintragsquellen prüfen.`, 'Nur eine Korrektur gleichzeitig beginnen und den Zeitpunkt dokumentieren.']
    : [`Versorgung von ${parameter.label} prüfen und mit niedriger Dosierung starten.`, 'Tagesmenge in kleinen Schritten anpassen und starke Sprünge vermeiden.']
  return [...steps, `Nach der Anpassung ${parameter.label} erneut messen und mit diesem Bericht vergleichen.`]
}
function toggleCareAction(key) {
  completedActions[key] = !completedActions[key]
}
function openCareDetail(key) {
  careMode.value = 'detail'
  requestAnimationFrame(() => document.querySelector(`.care-card[data-care-key="${key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
async function copyReportLink() {
  actionMsg.value = ''
  try {
    await navigator.clipboard?.writeText(window.location.href)
    actionMsg.value = 'Link zum Bericht kopiert.'
  } catch {
    actionMsg.value = 'Bericht ist bereit zum Teilen.'
  }
  setTimeout(() => { actionMsg.value = '' }, 2200)
}
function markPdf() {
  actionMsg.value = 'PDF-Export wird später mit dem Backend verbunden.'
  setTimeout(() => { actionMsg.value = '' }, 2600)
}
</script>

<style scoped>
.report { display: grid; gap: 18px; }
.back-link { color: var(--teal-700); font-weight: 800; text-decoration: none; }
.missing-card,
.report-hero,
.workflow-card,
.panel { border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.22); box-shadow: var(--shadow); }
.missing-card { max-width: 620px; padding: 34px; }
.missing-card span,
.hero-kicker,
.section-head span,
.meta-panel span { color: var(--teal-700); font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.missing-card h1 { margin: 8px 0; color: var(--text); font-size: 34px; font-weight: 800; }
.missing-card p { margin-bottom: 18px; color: var(--text-muted); }
.report-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: clamp(24px, 4vw, 34px); color: #fff; background: linear-gradient(115deg, rgba(10,27,67,0.98), rgba(0,114,206,0.72)), url('/reef-tank.webp') center / cover; }
.report-hero.critical { background: linear-gradient(115deg, rgba(10,27,67,0.98), rgba(232,93,79,0.72)), url('/reef-tank.webp') center / cover; }
.report-hero.watch { background: linear-gradient(115deg, rgba(10,27,67,0.98), rgba(245,158,11,0.56)), url('/reef-tank.webp') center / cover; }
.report-hero .hero-kicker { color: var(--teal-200); }
.report-hero h1 { margin: 8px 0; font-size: clamp(34px, 5vw, 58px); line-height: 0.96; font-weight: 800; letter-spacing: -0.05em; }
.report-hero p { color: rgba(255,255,255,0.72); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.action-msg { margin-top: 12px; color: var(--teal-100); font-size: 13px; font-weight: 800; }
.score-card { min-width: 310px; display: flex; align-items: center; gap: 18px; padding: 18px; border-radius: 22px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.16); }
.score-ring { width: 112px; height: 112px; border-radius: 50%; display: grid; place-items: center; position: relative; }
.score-ring::after { content: ''; position: absolute; inset: 12px; border-radius: 50%; background: rgba(10,27,67,0.94); }
.score-ring strong,
.score-ring span { position: relative; z-index: 1; }
.score-ring strong { font-size: 34px; line-height: 1; }
.score-ring span { margin-top: 34px; margin-left: -18px; font-size: 12px; }
.score-card span,
.score-card strong,
.score-card em { display: block; }
.score-card span { color: var(--teal-200); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
.score-card strong { margin-top: 5px; font-size: 22px; }
.score-card em { margin-top: 4px; color: rgba(255,255,255,0.7); font-style: normal; font-size: 13px; }
.workflow-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px; }
.workflow-step { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 16px; color: var(--text-muted); background: rgba(238,245,251,0.72); font-size: 12px; font-weight: 800; }
.workflow-step i { width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; }
.workflow-step.done i { background: var(--teal-500); }
.workflow-step.active { color: var(--brand-blue); background: var(--teal-50); }
.report-tabs { display: flex; gap: 6px; padding: 5px; width: fit-content; border-radius: 15px; background: #fff; border: 1px solid var(--border); box-shadow: var(--shadow); }
.report-tabs button { min-height: 40px; padding: 0 16px; border: 0; border-radius: 11px; color: var(--text-muted); background: transparent; font-weight: 800; cursor: pointer; }
.report-tabs button.active { color: #fff; background: var(--brand-blue); }
.report-tabs b { display: inline-grid; place-items: center; min-width: 22px; height: 22px; margin-left: 5px; padding: 0 6px; border-radius: 999px; background: rgba(0,0,0,0.08); font-size: 11px; }
.report-tabs button.active b { background: rgba(255,255,255,0.2); }
.report-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; align-items: start; }
.report-main,
.report-side { display: grid; gap: 18px; }
.panel { padding: 22px; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
.section-head.compact { margin-bottom: 12px; }
.section-head h2 { color: var(--text); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.section-head strong { color: var(--text); font-size: 13px; }
.parameter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.parameter-card { padding: 15px; border-radius: 18px; background: rgba(238,245,251,0.72); border: 1px solid var(--border); }
.parameter-card.watch { background: #fff7ed; border-color: #fed7aa; }
.parameter-card.critical { background: #fdecea; border-color: #f8c9c4; }
.parameter-card span,
.parameter-card strong,
.parameter-card em { display: block; }
.parameter-card span { color: var(--text-muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
.parameter-card strong { margin-top: 5px; color: var(--text); font-size: 24px; }
.parameter-card small { color: var(--text-muted); font-size: 12px; }
.parameter-card em { margin-top: 5px; color: var(--text-muted); font-style: normal; font-size: 12px; font-weight: 700; }
.recommendation-list,
.issue-list,
.meta-panel { display: grid; gap: 10px; }
.recommendation-row { display: grid; grid-template-columns: 34px 1fr; gap: 12px; align-items: start; padding: 13px; border-radius: 16px; background: var(--teal-50); }
.recommendation-row b { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: var(--teal-500); color: #fff; }
.recommendation-row p,
.muted { color: var(--text-muted); line-height: 1.55; }
.issue-list span { padding: 10px 12px; border-radius: 999px; background: #fff7ed; color: #92400e; font-size: 12px; font-weight: 800; }
.meta-panel div { display: flex; justify-content: space-between; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--border); }
.meta-panel div:last-child { border-bottom: 0; }
.meta-panel strong { color: var(--text); font-size: 13px; text-align: right; }
.care-plan { display: grid; gap: 18px; }
.care-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
.care-head > div:first-child > span,
.care-card header span,
.care-label { color: var(--teal-700); font-size: 11px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; }
.care-head h2 { margin-top: 4px; color: var(--text); font-size: 26px; font-weight: 800; }
.care-head p { margin-top: 6px; color: var(--text-muted); font-size: 13px; }
.care-mode { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: #eef5fb; }
.care-mode button { min-height: 36px; padding: 0 13px; border: 0; border-radius: 9px; background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 800; cursor: pointer; }
.care-mode button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 2px 8px rgba(10,27,67,0.08); }
.care-progress { height: 7px; overflow: hidden; border-radius: 999px; background: #e7eef6; }
.care-progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand-blue), var(--teal-500)); transition: width 0.25s ease; }
.care-clean { min-height: 150px; display: flex; align-items: center; justify-content: center; gap: 16px; border-radius: 16px; background: #ecfdf5; color: #047857; text-align: left; }
.care-clean > span { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; background: #10b981; color: #fff; font-size: 24px; font-weight: 900; }
.care-clean strong { display: block; color: #065f46; font-size: 18px; }
.care-clean p { margin-top: 3px; color: #047857; font-size: 13px; }
.quick-actions,
.care-details { display: grid; gap: 10px; }
.quick-actions { list-style: none; }
.quick-actions li { min-height: 76px; display: grid; grid-template-columns: 42px minmax(0, 1fr) auto auto; align-items: center; gap: 14px; padding: 12px 14px; border: 1px solid var(--border); border-left: 4px solid #f59e0b; border-radius: 15px; background: #fff; transition: opacity 0.2s ease; }
.quick-actions li.critical { border-left-color: #e85d4f; }
.quick-actions li.done,
.care-card.done { opacity: 0.6; }
.quick-actions li.done strong,
.care-card.done h3 { text-decoration: line-through; }
.care-check { display: grid; place-items: center; width: 38px; height: 38px; padding: 0; border: 1px solid var(--border); border-radius: 11px; background: var(--teal-50); color: var(--brand-blue); font-size: 12px; font-weight: 900; cursor: pointer; }
.done .care-check { border-color: #10b981; background: #10b981; color: #fff; }
.quick-actions strong,
.quick-actions span { display: block; }
.quick-actions strong { color: var(--text); font-size: 14px; }
.quick-actions span { margin-top: 4px; color: var(--text-muted); font-size: 12px; line-height: 1.45; }
.quick-actions em,
.care-card header > em { color: var(--text-muted); font-size: 11px; font-style: normal; font-weight: 800; white-space: nowrap; }
.care-open { min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--brand-blue); font-size: 11px; font-weight: 800; cursor: pointer; }
.care-open:hover { border-color: var(--brand-blue); }
.care-card { overflow: hidden; border: 1px solid var(--border); border-top: 4px solid #f59e0b; border-radius: 16px; background: #fff; }
.care-card.critical { border-top-color: #e85d4f; }
.care-card header { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 18px; }
.care-card h3 { margin-top: 4px; color: var(--text); font-size: 20px; font-weight: 800; }
.care-card header p { margin-top: 5px; color: var(--text-muted); font-size: 13px; line-height: 1.45; }
.care-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 18px 18px 20px 76px; border-top: 1px solid var(--border); background: #f8fbfe; }
.care-card-grid p,
.care-card-grid ol { margin-top: 7px; color: var(--text-muted); font-size: 13px; line-height: 1.6; }
.care-card-grid ol { padding-left: 18px; }
.care-card-grid li + li { margin-top: 5px; }
.element-explorer { display: grid; gap: 18px; }
.explorer-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
.explorer-head > div:first-child > span,
.element-detail span { color: var(--teal-700); font-size: 11px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; }
.explorer-head h2 { margin-top: 4px; color: var(--text); font-size: 24px; font-weight: 800; }
.explorer-head p { margin-top: 5px; color: var(--text-muted); font-size: 13px; }
.explorer-controls { display: flex; gap: 8px; }
.explorer-controls input,
.explorer-controls select { min-height: 42px; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--text); outline: 0; }
.explorer-controls input { width: 220px; padding: 0 13px; }
.explorer-controls select { padding: 0 34px 0 12px; }
.explorer-controls input:focus,
.explorer-controls select:focus { border-color: var(--brand-blue); box-shadow: 0 0 0 3px rgba(0,114,206,0.1); }
.parameter-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.parameter-groups button { min-height: 72px; display: grid; align-content: center; gap: 5px; padding: 12px 14px; text-align: left; border: 1px solid var(--border); border-radius: 14px; background: #f8fbfe; color: var(--text); cursor: pointer; }
.parameter-groups button:hover { border-color: var(--teal-400); }
.parameter-groups button.active { border-color: var(--brand-blue); box-shadow: 0 0 0 3px rgba(0,114,206,0.1); background: var(--teal-50); }
.parameter-groups button.critical { border-left: 4px solid #e85d4f; }
.parameter-groups button.watch { border-left: 4px solid #f59e0b; }
.parameter-groups button.good { border-left: 4px solid #10b981; }
.parameter-groups span { font-size: 13px; font-weight: 800; }
.parameter-groups b { color: var(--text-muted); font-size: 11px; }
.element-list { display: grid; gap: 9px; }
.element-row { overflow: hidden; border: 1px solid var(--border); border-left: 4px solid #10b981; border-radius: 15px; background: #fff; }
.element-row.watch { border-left-color: #f59e0b; }
.element-row.critical { border-left-color: #e85d4f; }
.element-head { width: 100%; min-height: 82px; display: grid; grid-template-columns: 46px minmax(150px, 0.9fr) minmax(200px, 1.3fr) 100px 20px; align-items: center; gap: 14px; padding: 12px 16px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.element-head:hover { background: #f8fbfe; }
.element-symbol { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--teal-50); color: var(--brand-blue); font-size: 12px; font-weight: 900; }
.element-name strong,
.element-name em,
.element-reading strong,
.element-reading small { display: block; }
.element-name strong { color: var(--text); font-size: 14px; }
.element-name em { margin-top: 4px; color: var(--text-muted); font-size: 11px; font-style: normal; font-weight: 700; }
.target-gauge i { position: relative; display: block; height: 8px; overflow: visible; border-radius: 999px; background: linear-gradient(90deg, #f8c9c4 0 25%, #bbf7d0 25% 75%, #f8c9c4 75%); }
.target-gauge i b { position: absolute; top: 50%; width: 14px; height: 14px; border: 3px solid #fff; border-radius: 50%; background: var(--brand-dark); box-shadow: 0 1px 4px rgba(10,27,67,0.3); transform: translate(-50%, -50%); }
.target-gauge small { display: block; margin-top: 7px; color: var(--text-muted); font-size: 10px; font-weight: 700; }
.element-reading { text-align: right; }
.element-reading strong { color: var(--text); font-size: 21px; }
.element-reading small { color: var(--text-muted); font-size: 10px; font-weight: 700; }
.element-chevron { color: var(--text-muted); font-size: 20px; transition: transform 0.2s ease; }
.element-row.expanded .element-chevron { transform: rotate(180deg); }
.element-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px 20px 18px 76px; border-top: 1px solid var(--border); background: #f8fbfe; }
.element-detail p { margin-top: 5px; color: var(--text-muted); font-size: 13px; line-height: 1.55; }
.parameter-trend { grid-column: 1 / -1; min-width: 0; margin-top: 2px; padding-top: 16px; border-top: 1px solid var(--border); }
.trend-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.trend-heading p { margin-top: 4px; }
.trend-heading strong { color: var(--text); font-size: 14px; white-space: nowrap; }
.no-results { display: grid; place-items: center; gap: 5px; min-height: 150px; border: 1px dashed var(--border); border-radius: 15px; color: var(--text-muted); text-align: center; }
.no-results strong { color: var(--text); }
@media (max-width: 900px) {
  .report-hero,
  .score-card { align-items: flex-start; flex-direction: column; }
  .score-card { min-width: 0; width: 100%; }
  .workflow-card,
  .report-layout { grid-template-columns: 1fr; }
  .explorer-head,
  .explorer-controls,
  .care-head { align-items: stretch; flex-direction: column; }
  .care-mode { align-self: flex-start; }
  .quick-actions li { grid-template-columns: 42px minmax(0, 1fr); }
  .quick-actions em,
  .quick-actions .care-open { grid-column: 2; justify-self: start; }
  .care-card header { grid-template-columns: 42px minmax(0, 1fr); }
  .care-card header > em { grid-column: 2; }
  .care-card-grid { grid-template-columns: 1fr; padding-left: 18px; }
  .explorer-controls input { width: 100%; }
  .element-head { grid-template-columns: 42px minmax(0, 1fr) auto; }
  .target-gauge { grid-column: 1 / -1; grid-row: 2; }
  .element-reading { grid-column: 3; grid-row: 1; }
  .element-chevron { display: none; }
  .element-detail { grid-template-columns: 1fr; padding-left: 18px; }
}
</style>
