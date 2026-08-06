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
            <span class="score-value">
              <strong>{{ analysis.score ?? '—' }}</strong><small v-if="analysis.score !== null">%</small>
            </span>
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
        <button type="button" :class="{ active: activeTab === 'favorites' }" @click="activeTab = 'favorites'">
          Favoriten <b v-if="favoriteParameters.length">{{ favoriteParameters.length }}</b>
        </button>
      </nav>

      <section v-show="activeTab === 'overview'" class="report-layout">
        <main class="report-main">
          <section class="panel group-overview">
            <div class="section-head group-overview-head">
              <div>
                <span>Gruppen</span>
                <h2>Gruppenstatus im Bericht</h2>
                <p>Wählen Sie eine Gruppe und öffnen Sie einen Wert für Einordnung, Korrektur und Verlauf.</p>
              </div>
              <strong>{{ analysis.parameters.length || '—' }} Werte</strong>
            </div>

            <div v-if="analysis.parameters.length" class="group-deck">
              <button
                v-for="group in parameterGroups"
                :key="group.key"
                type="button"
                :class="['group-card', group.tone, `group-${group.key}`, { active: selectedOverviewGroup === group.key }]"
                @click="selectedOverviewGroup = selectedOverviewGroup === group.key ? '' : group.key"
              >
                <span class="group-dial" :style="groupDialStyle(group)"><b>{{ group.score }}</b><em>%</em></span>
                <span class="group-copy">
                  <strong>{{ group.label }}</strong>
                  <em>{{ group.issueCount ? `${group.issueCount} prüfen` : 'Stabil' }} · {{ group.total }} Werte</em>
                </span>
                <small>{{ groupDescription(group.key) }}</small>
              </button>
            </div>
            <p v-else class="muted">Die Laborwerte werden angezeigt, sobald der Bericht fertig ist.</p>

            <div v-if="selectedOverviewGroupData" class="group-detail-panel">
              <div class="group-detail-head">
                <div><span>Aufschlüsselung</span><h3>{{ selectedOverviewGroupData.label }}</h3></div>
                <div class="group-detail-actions">
                  <button type="button" class="soft-link" @click="openGroupInExplorer(selectedOverviewGroupData.key)">Im Explorer öffnen</button>
                  <button type="button" class="group-close" aria-label="Gruppe schließen" title="Schließen" @click="selectedOverviewGroup = ''">×</button>
                </div>
              </div>
              <div class="element-list overview-elements">
                <article
                  v-for="parameter in selectedOverviewGroupData.parameters"
                  :key="parameter.key"
                  :class="['element-row', parameter.tone, `group-${parameterGroup(parameter).key}`, { expanded: expandedParameters[`overview-${parameter.key}`] }]"
                >
                  <button class="element-head" type="button" @click="toggleParameter(`overview-${parameter.key}`)">
                    <span class="element-symbol">{{ parameterSymbol(parameter) }}</span>
                    <span class="element-name">
                      <strong>{{ parameter.label }}</strong>
                      <em>{{ parameterStatusLabel(parameter.tone) }}</em>
                    </span>
                    <span class="target-gauge">
                      <i><b :style="{ left: `${gaugePosition(parameter)}%` }"></b></i>
                      <small>Ziel {{ parameter.target }} {{ parameter.unit }}</small>
                    </span>
                    <span class="element-reading"><strong>{{ parameter.value }}</strong><small>{{ parameter.unit }}</small></span>
                    <span class="element-chevron" aria-hidden="true">⌄</span>
                  </button>
                  <button
                    type="button"
                    :class="['favorite-button', { active: analyses.isFavorite(parameter.key) }]"
                    :aria-label="`${parameter.label} ${analyses.isFavorite(parameter.key) ? 'aus Favoriten entfernen' : 'zu Favoriten hinzufügen'}`"
                    :title="analyses.isFavorite(parameter.key) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'"
                    @click="analyses.toggleFavorite(parameter.key)"
                  >★</button>
                  <div v-if="expandedParameters[`overview-${parameter.key}`]" class="element-detail">
                    <div class="parameter-detail-tabs" role="tablist" :aria-label="`Details zu ${parameter.label}`">
                      <button v-for="detail in PARAMETER_DETAIL_TABS" :key="detail.key" type="button" role="tab" :aria-selected="parameterDetailPanel(`overview-${parameter.key}`) === detail.key" :class="{ active: parameterDetailPanel(`overview-${parameter.key}`) === detail.key }" @click="selectParameterDetail(`overview-${parameter.key}`, detail.key)">
                        <span class="parameter-tab-icon" aria-hidden="true">{{ detail.icon }}</span>
                        <span class="parameter-tab-copy"><strong>{{ detail.label }}</strong></span>
                      </button>
                    </div>
                    <div v-if="parameterDetailPanel(`overview-${parameter.key}`) === 'info'" class="parameter-info-panel">
                      <div class="parameter-info-lead"><span>Allgemeine Information</span><p>{{ parameterGuide(parameter).general }}</p></div>
                      <div class="parameter-spec-grid">
                        <div><span>Symbol</span><strong>{{ parameterSymbol(parameter) }}</strong></div>
                        <div><span>Einheit</span><strong>{{ parameter.unit }}</strong></div>
                        <div><span>Zielbereich</span><strong>{{ parameter.target }} {{ parameter.unit }}</strong></div>
                        <div><span>Laborstatus</span><strong>{{ labStatusLabel(parameter) }}</strong></div>
                      </div>
                      <div class="parameter-purpose"><span>Wofür wichtig</span><p>{{ parameterGuide(parameter).importance }}</p></div>
                      <div :class="['parameter-current-status', parameter.tone]"><span>Aktuelle Einordnung</span><strong>{{ parameterStatusLabel(parameter.tone) }}</strong><p>{{ parameterInsight(parameter) }}</p></div>
                    </div>
                    <div v-else-if="parameterDetailPanel(`overview-${parameter.key}`) === 'action'" class="parameter-recommendation-panel">
                      <div :class="['current-recommendation', parameter.tone]"><span>Empfehlung für diesen Messwert</span><p>{{ parameterAction(parameter) }}</p></div>
                      <div class="level-recommendations">
                        <article class="high"><strong>Wenn der Wert zu hoch ist</strong><p>{{ parameterGuide(parameter).high }}</p></article>
                        <article class="low"><strong>Wenn der Wert zu niedrig ist</strong><p>{{ parameterGuide(parameter).low }}</p></article>
                      </div>
                    </div>
                    <div v-else class="parameter-trend">
                      <div class="trend-heading">
                        <div><span>Messverlauf</span><p>{{ trendSummary(parameter) }}</p></div>
                        <strong>{{ historyChange(parameter) }}</strong>
                      </div>
                      <ParameterTrendChart :parameter="parameter" />
                    </div>
                  </div>
                </article>
              </div>
            </div>
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
            <button type="button" :class="{ active: careMode === 'quick' }" @click="setCareMode('quick')">Schnell</button>
            <button type="button" :class="{ active: careMode === 'detail' }" @click="setCareMode('detail')">Ausführlich</button>
          </div>
        </div>

        <div v-if="carePlan.length" class="care-progress" aria-label="Fortschritt des Pflegeplans">
          <span :style="{ width: `${careProgressPercent}%` }"></span>
        </div>

        <div v-if="!carePlan.length" class="care-clean">
          <span aria-hidden="true">✓</span>
          <div><strong>System stabil</strong><p>Nutzen Sie diesen Bericht als Referenz für die nächste Messung.</p></div>
        </div>

        <div v-else class="care-groups">
          <section v-for="group in carePlanGroups" :key="group.key" :class="['care-group', `group-${group.key}`]">
            <header class="care-group-head">
              <div><i aria-hidden="true"></i><span>{{ group.label }}</span></div>
              <strong>{{ group.items.length }} {{ group.items.length === 1 ? 'Empfehlung' : 'Empfehlungen' }}</strong>
            </header>
            <div class="care-details">
              <article v-for="(item, index) in group.items" :key="item.key" :class="['care-card', item.tone, { done: completedActions[item.key], expanded: expandedCareCards[item.key] }]">
                <div class="care-card-head">
                  <button type="button" class="care-check" :aria-label="`${item.title} als erledigt markieren`" @click="toggleCareAction(item.key)">
                    {{ completedActions[item.key] ? '✓' : String(index + 1).padStart(2, '0') }}
                  </button>
                  <button type="button" class="care-card-toggle" :aria-expanded="Boolean(expandedCareCards[item.key])" @click="toggleCareCard(item.key)">
                    <span class="care-card-copy">
                      <small>Priorität {{ item.priority }} · {{ item.parameters.length }} {{ item.parameters.length === 1 ? 'Wert' : 'Werte' }}</small>
                      <strong>{{ item.title }}</strong>
                      <em>{{ item.summary }}</em>
                      <span class="care-elements"><b v-for="parameter in item.parameters" :key="parameter">{{ parameter }}</b></span>
                    </span>
                    <span class="care-card-meta"><em>{{ item.recheck }}</em><i aria-hidden="true">⌄</i></span>
                  </button>
                </div>
                <Transition name="care-slide">
                  <div v-show="expandedCareCards[item.key]" class="care-card-grid">
                    <div>
                      <span class="care-label">Warum</span>
                      <p v-for="reason in item.whys" :key="reason">{{ reason }}</p>
                    </div>
                    <div>
                      <span class="care-label">So gehen Sie vor</span>
                      <ol>
                        <li v-for="step in item.steps" :key="step">{{ step }}</li>
                      </ol>
                    </div>
                  </div>
                </Transition>
              </article>
            </div>
          </section>
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
            :class="[group.tone, `group-${group.key}`, { active: selectedGroup === group.key }]"
            @click="selectedGroup = selectedGroup === group.key ? '' : group.key"
          >
            <span>{{ group.label }}</span>
            <b>{{ group.issueCount ? `${group.issueCount} prüfen` : 'Stabil' }}</b>
          </button>
        </div>

        <div v-if="visibleParameters.length" class="element-list">
              <article
                v-for="parameter in visibleParametersByGroup"
                :key="parameter.key"
                :class="['element-row', parameter.tone, `group-${parameterGroup(parameter).key}`, { expanded: expandedParameters[parameter.key] }]"
              >
                <button class="element-head" type="button" @click="toggleParameter(parameter.key)">
                  <span class="element-symbol">{{ parameterSymbol(parameter) }}</span>
                  <span class="element-name">
                    <strong>{{ parameter.label }}</strong>
                    <em>{{ parameterStatusLabel(parameter.tone) }}</em>
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
                <button
                  type="button"
                  :class="['favorite-button', { active: analyses.isFavorite(parameter.key) }]"
                  :aria-label="`${parameter.label} ${analyses.isFavorite(parameter.key) ? 'aus Favoriten entfernen' : 'zu Favoriten hinzufügen'}`"
                  :title="analyses.isFavorite(parameter.key) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'"
                  @click="analyses.toggleFavorite(parameter.key)"
                >★</button>
                <div v-if="expandedParameters[parameter.key]" class="element-detail">
                  <div class="parameter-detail-tabs" role="tablist" :aria-label="`Details zu ${parameter.label}`">
                    <button v-for="detail in PARAMETER_DETAIL_TABS" :key="detail.key" type="button" role="tab" :aria-selected="parameterDetailPanel(parameter.key) === detail.key" :class="{ active: parameterDetailPanel(parameter.key) === detail.key }" @click="selectParameterDetail(parameter.key, detail.key)">
                      <span class="parameter-tab-icon" aria-hidden="true">{{ detail.icon }}</span>
                      <span class="parameter-tab-copy"><strong>{{ detail.label }}</strong></span>
                    </button>
                  </div>
                  <div v-if="parameterDetailPanel(parameter.key) === 'info'" class="parameter-info-panel">
                    <div class="parameter-info-lead"><span>Allgemeine Information</span><p>{{ parameterGuide(parameter).general }}</p></div>
                    <div class="parameter-spec-grid">
                      <div><span>Symbol</span><strong>{{ parameterSymbol(parameter) }}</strong></div>
                      <div><span>Einheit</span><strong>{{ parameter.unit }}</strong></div>
                      <div><span>Zielbereich</span><strong>{{ parameter.target }} {{ parameter.unit }}</strong></div>
                    </div>
                    <div class="parameter-purpose"><span>Wofür wichtig</span><p>{{ parameterGuide(parameter).importance }}</p></div>
                    <div :class="['parameter-current-status', parameter.tone]"><span>Aktuelle Einordnung</span><strong>{{ parameterStatusLabel(parameter.tone) }}</strong><p>{{ parameterInsight(parameter) }}</p></div>
                  </div>
                  <div v-else-if="parameterDetailPanel(parameter.key) === 'action'" class="parameter-recommendation-panel">
                    <div :class="['current-recommendation', parameter.tone]"><span>Empfehlung für diesen Messwert</span><p>{{ parameterAction(parameter) }}</p></div>
                    <div class="level-recommendations">
                      <article class="high"><strong>Wenn der Wert zu hoch ist</strong><p>{{ parameterGuide(parameter).high }}</p></article>
                      <article class="low"><strong>Wenn der Wert zu niedrig ist</strong><p>{{ parameterGuide(parameter).low }}</p></article>
                    </div>
                  </div>
                  <div v-else class="parameter-trend">
                    <div class="trend-heading">
                      <div><span>Messverlauf</span><p>{{ trendSummary(parameter) }}</p></div>
                      <strong>{{ historyChange(parameter) }}</strong>
                    </div>
                    <ParameterTrendChart :parameter="parameter" />
                  </div>
                </div>
              </article>
        </div>
        <div v-else class="no-results">
          <strong>Keine Messwerte gefunden</strong>
          <span>Suche oder Filter anpassen, um wieder Parameter zu sehen.</span>
        </div>
      </section>

      <section v-if="analysis.status === 'completed'" v-show="activeTab === 'favorites'" class="panel favorites-panel">
        <div class="explorer-head">
          <div>
            <span>Favoriten</span>
            <h2>Gemerkte Parameter</h2>
            <p>Wichtige Werte dieses Berichts unabhängig vom aktuellen Status im Blick behalten.</p>
          </div>
        </div>

        <div v-if="favoriteParameters.length" class="element-list favorite-list">
          <article
            v-for="parameter in favoriteParameters"
            :key="parameter.key"
            :class="['element-row', parameter.tone, `group-${parameterGroup(parameter).key}`, { expanded: expandedParameters[`favorite-${parameter.key}`] }]"
          >
            <button class="element-head" type="button" @click="toggleParameter(`favorite-${parameter.key}`)">
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
            <button
              type="button"
              class="favorite-button active"
              :aria-label="`${parameter.label} aus Favoriten entfernen`"
              title="Aus Favoriten entfernen"
              @click="analyses.toggleFavorite(parameter.key)"
            >★</button>
            <div v-if="expandedParameters[`favorite-${parameter.key}`]" class="element-detail">
              <div class="parameter-detail-tabs" role="tablist" :aria-label="`Details zu ${parameter.label}`">
                <button v-for="detail in PARAMETER_DETAIL_TABS" :key="detail.key" type="button" role="tab" :aria-selected="parameterDetailPanel(`favorite-${parameter.key}`) === detail.key" :class="{ active: parameterDetailPanel(`favorite-${parameter.key}`) === detail.key }" @click="selectParameterDetail(`favorite-${parameter.key}`, detail.key)">
                  <span class="parameter-tab-icon" aria-hidden="true">{{ detail.icon }}</span>
                  <span class="parameter-tab-copy"><strong>{{ detail.label }}</strong></span>
                </button>
              </div>
              <div v-if="parameterDetailPanel(`favorite-${parameter.key}`) === 'info'" class="parameter-info-panel">
                <div class="parameter-info-lead"><span>Allgemeine Information</span><p>{{ parameterGuide(parameter).general }}</p></div>
                <div class="parameter-spec-grid">
                  <div><span>Symbol</span><strong>{{ parameterSymbol(parameter) }}</strong></div>
                  <div><span>Einheit</span><strong>{{ parameter.unit }}</strong></div>
                  <div><span>Zielbereich</span><strong>{{ parameter.target }} {{ parameter.unit }}</strong></div>
                </div>
                <div class="parameter-purpose"><span>Wofür wichtig</span><p>{{ parameterGuide(parameter).importance }}</p></div>
                <div :class="['parameter-current-status', parameter.tone]"><span>Aktuelle Einordnung</span><strong>{{ parameterStatusLabel(parameter.tone) }}</strong><p>{{ parameterInsight(parameter) }}</p></div>
              </div>
              <div v-else-if="parameterDetailPanel(`favorite-${parameter.key}`) === 'action'" class="parameter-recommendation-panel">
                <div :class="['current-recommendation', parameter.tone]"><span>Empfehlung für diesen Messwert</span><p>{{ parameterAction(parameter) }}</p></div>
                <div class="level-recommendations">
                  <article class="high"><strong>Wenn der Wert zu hoch ist</strong><p>{{ parameterGuide(parameter).high }}</p></article>
                  <article class="low"><strong>Wenn der Wert zu niedrig ist</strong><p>{{ parameterGuide(parameter).low }}</p></article>
                </div>
              </div>
              <div v-else class="parameter-trend">
                <div class="trend-heading">
                  <div><span>Messverlauf</span><p>{{ trendSummary(parameter) }}</p></div>
                  <strong>{{ historyChange(parameter) }}</strong>
                </div>
                <ParameterTrendChart :parameter="parameter" />
              </div>
            </div>
          </article>
        </div>

        <div v-else class="favorites-empty">
          <span aria-hidden="true">☆</span>
          <strong>Noch keine Favoriten</strong>
          <p>Markieren Sie wichtige Werte im Element Explorer mit dem Stern.</p>
          <button type="button" class="btn btn-primary" @click="activeTab = 'values'">Alle Werte öffnen</button>
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
import { DEFAULT_PARAMETER_GUIDE, loadAnalysisContent } from '@/services/analysisContent'
import ParameterTrendChart from '@/components/analyses/ParameterTrendChart.vue'

const PARAMETER_DETAIL_TABS = [
  { key: 'info', label: 'Info & Technik', icon: 'i' },
  { key: 'action', label: 'Empfehlungen', icon: '✦' },
  { key: 'history', label: 'Messverlauf', icon: '↗' },
]

const route = useRoute()
const analyses = useAnalysesStore()
const parameterContent = loadAnalysisContent()
const actionMsg = ref('')
const activeTab = ref('overview')
const selectedGroup = ref('')
const selectedOverviewGroup = ref('')
const parameterSearch = ref('')
const parameterStatus = ref('all')
const careMode = ref('quick')
const expandedParameters = reactive({})
const parameterDetailPanels = reactive({})
const expandedCareCards = reactive({})
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
    total: group.parameters.length,
    score: Math.round(((group.parameters.length - group.issueCount) / group.parameters.length) * 100),
    tone: group.parameters.some((item) => item.tone === 'critical') ? 'critical' : group.issueCount ? 'watch' : 'good',
  }))
})
const selectedOverviewGroupData = computed(() => parameterGroups.value.find((group) => group.key === selectedOverviewGroup.value) || null)
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
const visibleParametersByGroup = computed(() => parameterGroups.value.flatMap((group) =>
  visibleParameters.value.filter((parameter) => parameterGroup(parameter).key === group.key)))
const explorerSummary = computed(() => {
  const scope = parameterGroups.value.find((group) => group.key === selectedGroup.value)?.label || 'allen Gruppen'
  const issues = visibleParameters.value.filter((parameter) => parameter.tone !== 'good').length
  return `${issues} ${issues === 1 ? 'Auffälligkeit' : 'Auffälligkeiten'} in ${scope}`
})
const issueParameters = computed(() => (analysis.value?.parameters || []).filter((parameter) => parameter.tone !== 'good'))
const individualCareActions = computed(() => issueParameters.value
  .map((parameter, index) => buildCareAction(parameter, index))
  .sort((a, b) => toneRank(a.tone) - toneRank(b.tone)))
const carePlanGroups = computed(() => parameterGroups.value
  .map((group) => {
    const recommendations = new Map()
    for (const action of individualCareActions.value.filter((item) => item.groupKey === group.key)) {
      const recommendationKey = action.summary.trim().toLocaleLowerCase('de-DE')
      if (!recommendations.has(recommendationKey)) {
        recommendations.set(recommendationKey, {
          ...action,
          key: `${group.key}-${action.parameterKey}`,
          parameters: [action.parameterLabel],
          whys: [action.why],
        })
        continue
      }
      const merged = recommendations.get(recommendationKey)
      merged.key += `-${action.parameterKey}`
      merged.parameters.push(action.parameterLabel)
      merged.whys.push(action.why)
      merged.steps = [...new Set([...merged.steps, ...action.steps])]
      if (toneRank(action.tone) < toneRank(merged.tone)) {
        merged.tone = action.tone
        merged.priority = action.priority
      }
      if (action.days < merged.days) {
        merged.days = action.days
        merged.recheck = action.recheck
      }
      merged.title = `${merged.parameters.join(' & ')} gemeinsam stabilisieren`
    }
    const items = [...recommendations.values()].sort((a, b) => toneRank(a.tone) - toneRank(b.tone))
    return { ...group, items }
  })
  .filter((group) => group.items.length))
const carePlan = computed(() => carePlanGroups.value.flatMap((group) => group.items))
const careProgress = computed(() => carePlan.value.filter((item) => completedActions[item.key]).length)
const careProgressPercent = computed(() => carePlan.value.length ? Math.round((careProgress.value / carePlan.value.length) * 100) : 100)
const favoriteParameters = computed(() => (analysis.value?.parameters || []).filter((parameter) => analyses.isFavorite(parameter.key)))

const GROUP_MAP = {
  salinity: { key: 'basis', label: 'Basiswerte' },
  kh: { key: 'basis', label: 'Basiswerte' },
  calcium: { key: 'quantity', label: 'Mengenelemente' },
  magnesium: { key: 'quantity', label: 'Mengenelemente' },
  nitrate: { key: 'nutrients', label: 'Nährstoffe' },
  phosphate: { key: 'nutrients', label: 'Nährstoffe' },
}
const SYMBOL_MAP = { salinity: 'PSU', kh: 'KH', calcium: 'Ca', magnesium: 'Mg', nitrate: 'NO₃', phosphate: 'PO₄' }
const GROUP_DESCRIPTIONS = {
  basis: 'Grundlage für Dichte, KH und Systemstabilität.',
  quantity: 'Hauptversorgung für Wachstum und Skelettaufbau.',
  nutrients: 'NO₃, PO₄ und mögliche Quellen für Algen- oder Mangelstress.',
  trace: 'Feine Versorgung für Farbe, Enzyme und Stoffwechsel.',
}
function parameterGroup(parameter) {
  return GROUP_MAP[parameter.key] || { key: 'trace', label: 'Spurenelemente' }
}
function parameterGuide(parameter) {
  return parameterContent[parameter.key] || DEFAULT_PARAMETER_GUIDE
}
function parameterSymbol(parameter) {
  return SYMBOL_MAP[parameter.key] || parameter.label.slice(0, 2)
}
function groupDescription(key) {
  return GROUP_DESCRIPTIONS[key] || 'Parameter dieser Laborgruppe gemeinsam betrachten.'
}
function groupDialStyle(group) {
  const color = group.tone === 'critical' ? '#e85d4f' : group.tone === 'watch' ? '#f59e0b' : '#10b981'
  return { background: `conic-gradient(${color} ${group.score * 3.6}deg, #e7eef6 0deg)` }
}
function openGroupInExplorer(key) {
  selectedGroup.value = key
  activeTab.value = 'values'
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
function parameterDetailPanel(key) {
  return parameterDetailPanels[key] || 'info'
}
function selectParameterDetail(key, panel) {
  parameterDetailPanels[key] = panel
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
    parameterKey: parameter.key,
    parameterLabel: parameter.label,
    groupKey: parameterGroup(parameter).key,
    tone: parameter.tone,
    priority,
    days,
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
function setCareMode(mode) {
  careMode.value = mode
  for (const item of carePlan.value) expandedCareCards[item.key] = mode === 'detail'
}
function toggleCareCard(key) {
  expandedCareCards[key] = !expandedCareCards[key]
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
.score-ring .score-value { position: relative; z-index: 1; display: inline-flex; align-items: baseline; flex-wrap: nowrap; gap: 2px; white-space: nowrap; }
.score-card .score-ring .score-value strong { margin: 0; font-size: 34px; line-height: 1; }
.score-ring .score-value small { flex: 0 0 auto; color: var(--teal-200); font-size: 12px; font-weight: 800; }
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
.report-tabs { display: flex; gap: 6px; max-width: 100%; width: fit-content; overflow-x: auto; padding: 5px; border-radius: 15px; background: #fff; border: 1px solid var(--border); box-shadow: var(--shadow); }
.report-tabs button { flex: 0 0 auto; min-height: 40px; padding: 0 16px; border: 0; border-radius: 11px; color: var(--text-muted); background: transparent; font-weight: 800; white-space: nowrap; cursor: pointer; }
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
.group-overview { display: grid; gap: 16px; }
.group-overview-head { margin-bottom: 0; }
.group-overview-head p { max-width: 620px; margin-top: 5px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
.group-deck { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.group-card { min-height: 116px; display: grid; grid-template-columns: 50px minmax(0, 1fr); align-items: center; gap: 4px 12px; padding: 14px; text-align: left; border: 1px solid var(--border); border-radius: 15px; background: #fff; color: var(--text); cursor: pointer; }
.group-card:hover { border-color: var(--teal-400); transform: translateY(-1px); }
.group-card.active { border-color: var(--brand-blue); background: var(--teal-50); box-shadow: 0 0 0 3px rgba(0,114,206,0.1); }
.group-card.critical.active { border-color: #e85d4f; box-shadow: 0 0 0 3px rgba(232,93,79,0.1); }
.group-card.watch.active { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
.group-card.group-basis { border-left: 4px solid #1686d9; }
.group-card.group-quantity { border-left: 4px solid #6b9f36; }
.group-card.group-nutrients { border-left: 4px solid #f59e0b; }
.group-card.group-trace { border-left: 4px solid #0f9f8f; }
.group-dial { position: relative; display: flex; align-items: center; justify-content: center; flex-wrap: nowrap; white-space: nowrap; width: 50px; height: 50px; border-radius: 50%; }
.group-dial::after { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: #fff; }
.group-card.active .group-dial::after { background: var(--teal-50); }
.group-dial b,
.group-dial em { position: relative; z-index: 1; }
.group-dial b { font-size: 14px; }
.group-dial em { margin: 4px 0 0 1px; color: var(--text-muted); font-size: 8px; font-style: normal; }
.group-copy strong,
.group-copy em { display: block; }
.group-copy strong { font-size: 14px; }
.group-copy em { margin-top: 3px; color: var(--text-muted); font-size: 11px; font-style: normal; font-weight: 700; }
.group-card > small { grid-column: 1 / -1; color: var(--text-muted); font-size: 11px; line-height: 1.4; }
.group-detail-panel { display: grid; gap: 14px; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: #f8fbfe; }
.group-detail-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.group-detail-head span { color: var(--teal-700); font-size: 10px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; }
.group-detail-head h3 { margin-top: 3px; color: var(--text); font-size: 20px; }
.group-detail-actions { display: flex; align-items: center; gap: 8px; }
.soft-link { padding: 6px 4px; border: 0; appearance: none; background: transparent; color: var(--brand-blue); font-size: 12px; font-weight: 800; cursor: pointer; }
.soft-link:hover { color: var(--teal-700); text-decoration: underline; }
.soft-link:focus-visible { border-radius: 6px; outline: 3px solid rgba(0, 114, 206, 0.2); outline-offset: 2px; }
.group-close { display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--text-muted); font-size: 22px; cursor: pointer; }
.group-close:hover { border-color: var(--brand-blue); color: var(--brand-blue); }
.overview-elements .element-row { background: #fff; }
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
.care-groups { display: grid; gap: 22px; }
.care-group { --care-group-color: #0f9f8f; display: grid; gap: 10px; }
.care-group.group-basis { --care-group-color: #1686d9; }
.care-group.group-quantity { --care-group-color: #6b9f36; }
.care-group.group-nutrients { --care-group-color: #f59e0b; }
.care-group-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 0 3px; }
.care-group-head > div { display: flex; align-items: center; gap: 9px; }
.care-group-head i { width: 9px; height: 9px; border-radius: 50%; background: var(--care-group-color); box-shadow: 0 0 0 4px color-mix(in srgb, var(--care-group-color) 14%, transparent); }
.care-group-head span { color: var(--text); font-size: 14px; font-weight: 850; }
.care-group-head strong { padding: 5px 9px; border-radius: 999px; background: color-mix(in srgb, var(--care-group-color) 10%, #fff); color: var(--care-group-color); font-size: 10px; font-weight: 850; }
.care-details { display: grid; gap: 10px; }
.care-card.done { opacity: 0.62; }
.care-card.done .care-card-copy > strong { text-decoration: line-through; }
.care-check { display: grid; place-items: center; width: 38px; height: 38px; padding: 0; border: 1px solid var(--border); border-radius: 11px; background: var(--teal-50); color: var(--brand-blue); font-size: 12px; font-weight: 900; cursor: pointer; }
.done .care-check { border-color: #10b981; background: #10b981; color: #fff; }
.care-card { overflow: hidden; border: 1px solid var(--border); border-left: 4px solid var(--care-group-color); border-radius: 16px; background: #fff; transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
.care-card:hover { border-color: color-mix(in srgb, var(--care-group-color) 48%, var(--border)); box-shadow: 0 7px 20px rgba(10,27,67,0.07); }
.care-card.expanded { box-shadow: 0 9px 24px rgba(10,27,67,0.09); }
.care-card-head { display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: center; gap: 10px; padding: 12px 14px; }
.care-card-toggle { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 16px; padding: 3px 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.care-card-copy,
.care-card-copy > small,
.care-card-copy > strong,
.care-card-copy > em { display: block; }
.care-card-copy > small { color: var(--teal-700); font-size: 10px; font-weight: 850; font-style: normal; letter-spacing: 0.07em; text-transform: uppercase; }
.care-card-copy > strong { margin-top: 3px; color: var(--text); font-size: 17px; font-weight: 850; }
.care-card-copy > em { margin-top: 4px; color: var(--text-muted); font-size: 12px; font-style: normal; line-height: 1.45; }
.care-elements { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.care-elements b { padding: 4px 7px; border-radius: 7px; background: color-mix(in srgb, var(--care-group-color) 9%, #fff); color: var(--care-group-color); font-size: 9px; font-weight: 850; }
.care-card-meta { display: flex; align-items: center; gap: 12px; }
.care-card-meta em { color: var(--text-muted); font-size: 10px; font-style: normal; font-weight: 800; white-space: nowrap; }
.care-card-meta i { color: var(--care-group-color); font-size: 20px; font-style: normal; transition: transform 0.25s ease; }
.care-card.expanded .care-card-meta i { transform: rotate(180deg); }
.care-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 18px 18px 20px 76px; border-top: 1px solid var(--border); background: #f8fbfe; }
.care-card-grid p,
.care-card-grid ol { margin-top: 7px; color: var(--text-muted); font-size: 13px; line-height: 1.6; }
.care-card-grid p + p { padding-top: 8px; border-top: 1px solid var(--border); }
.care-card-grid ol { padding-left: 18px; }
.care-card-grid li + li { margin-top: 5px; }
.care-slide-enter-active,
.care-slide-leave-active { overflow: hidden; transition: max-height 0.3s ease, opacity 0.22s ease, transform 0.3s ease; }
.care-slide-enter-from,
.care-slide-leave-to { max-height: 0; opacity: 0; transform: translateY(-8px); }
.care-slide-enter-to,
.care-slide-leave-from { max-height: 900px; opacity: 1; transform: translateY(0); }
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
.parameter-groups button.group-basis { border-left-color: #1686d9; }
.parameter-groups button.group-quantity { border-left-color: #6b9f36; }
.parameter-groups button.group-nutrients { border-left-color: #f59e0b; }
.parameter-groups button.group-trace { border-left-color: #0f9f8f; }
.parameter-groups span { font-size: 13px; font-weight: 800; }
.parameter-groups b { color: var(--text-muted); font-size: 11px; }
.element-list { display: grid; gap: 9px; }
.element-row { position: relative; overflow: hidden; border: 1px solid var(--border); border-left: 4px solid #10b981; border-radius: 15px; background: #fff; }
.element-row.watch { border-left-color: #f59e0b; }
.element-row.critical { border-left-color: #e85d4f; }
.element-row.group-basis { border-left-color: #1686d9; }
.element-row.group-quantity { border-left-color: #6b9f36; }
.element-row.group-nutrients { border-left-color: #f59e0b; }
.element-row.group-trace { border-left-color: #0f9f8f; }
.element-head { width: 100%; min-height: 82px; display: grid; grid-template-columns: 46px minmax(150px, 0.9fr) minmax(200px, 1.3fr) 100px 72px; align-items: center; gap: 14px; padding: 12px 16px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.element-head:hover { background: #f8fbfe; }
.element-symbol { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--teal-50); color: var(--brand-blue); font-size: 12px; font-weight: 900; }
.element-name strong,
.element-name em,
.element-reading strong,
.element-reading small { display: block; }
.element-name strong { color: var(--text); font-size: 14px; }
.element-name em { margin-top: 4px; color: var(--text-muted); font-size: 11px; font-style: normal; font-weight: 700; }
.target-gauge i {
  position: relative;
  display: block;
  height: 10px;
  overflow: visible;
  border: 1px solid rgba(10,27,67,0.08);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    #e85d4f 0%,
    #f28a35 13%,
    #f4c84a 25%,
    #8fd06a 38%,
    #20b77a 50%,
    #8fd06a 62%,
    #f4c84a 75%,
    #f28a35 87%,
    #e85d4f 100%
  );
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.45), 0 2px 6px rgba(10,27,67,0.08);
}
.target-gauge i::after {
  position: absolute;
  inset: 1px 4px auto;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.5), rgba(255,255,255,0.22));
  content: "";
  pointer-events: none;
}
.target-gauge i b { position: absolute; z-index: 1; top: 50%; width: 16px; height: 16px; border: 3px solid #fff; border-radius: 50%; background: var(--brand-dark); box-shadow: 0 2px 7px rgba(10,27,67,0.34), 0 0 0 1px rgba(10,27,67,0.08); transform: translate(-50%, -50%); }
.target-gauge small { display: block; margin-top: 7px; color: var(--text-muted); font-size: 10px; font-weight: 700; }
.element-reading { text-align: right; }
.element-reading strong { color: var(--text); font-size: 21px; }
.element-reading small { color: var(--text-muted); font-size: 10px; font-weight: 700; }
.element-chevron { color: var(--text-muted); font-size: 20px; transition: transform 0.2s ease; }
.element-row.expanded .element-chevron { transform: rotate(180deg); }
.favorite-button { position: absolute; z-index: 2; top: 22px; right: 46px; display: grid; place-items: center; width: 38px; height: 38px; padding: 0; border: 1px solid var(--border); border-radius: 11px; background: #fff; color: #94a3b8; font-size: 20px; line-height: 1; cursor: pointer; }
.favorite-button:hover { border-color: #f59e0b; color: #f59e0b; }
.favorite-button.active { border-color: #fcd34d; background: #fffbeb; color: #f59e0b; }
.element-detail { display: grid; gap: 14px; padding: 14px 20px 18px 76px; border-top: 1px solid var(--border); background: #f8fbfe; }
.element-detail p { margin-top: 5px; color: var(--text-muted); font-size: 13px; line-height: 1.55; }
.parameter-detail-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); width: 100%; overflow: hidden; border: 1px solid rgba(136,193,233,0.3); border-radius: 15px; background: rgba(255,255,255,0.58); }
.parameter-detail-tabs button { position: relative; min-width: 0; min-height: 68px; display: grid; place-items: center; align-content: center; gap: 5px; padding: 8px; overflow: hidden; border: 0; border-right: 1px solid rgba(136,193,233,0.22); background: transparent; color: var(--text-muted); text-align: center; cursor: pointer; transition: background 0.2s ease, color 0.2s ease; }
.parameter-detail-tabs button:last-child { border-right: 0; }
.parameter-detail-tabs button:hover { background: rgba(255,255,255,0.72); color: var(--brand-blue); }
.parameter-detail-tabs button.active { background: #fff; color: var(--brand-blue); box-shadow: inset 0 0 0 1px rgba(0,114,206,0.08); }
.parameter-detail-tabs button.active::after { position: absolute; right: 22%; bottom: 0; left: 22%; height: 3px; border-radius: 999px 999px 0 0; background: var(--brand-blue); content: ''; }
.parameter-detail-tabs button:focus-visible { outline: 3px solid rgba(0,114,206,0.18); outline-offset: 1px; }
.parameter-detail-tabs .parameter-tab-icon { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 9px; background: var(--teal-50); color: var(--brand-blue); font-size: 12px; font-weight: 900; line-height: 1; letter-spacing: 0; text-transform: none; }
.parameter-detail-tabs button.active .parameter-tab-icon { background: var(--brand-blue); color: #fff; box-shadow: 0 3px 8px rgba(0,114,206,0.18); }
.parameter-detail-tabs .parameter-tab-copy { min-width: 0; display: block; color: inherit; letter-spacing: 0; text-transform: none; }
.parameter-tab-copy strong { display: block; overflow: hidden; color: currentColor; font-size: 11px; font-weight: 850; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.parameter-info-panel,
.parameter-recommendation-panel { display: grid; gap: 12px; }
.parameter-info-lead,
.parameter-purpose,
.current-recommendation { padding: 14px 15px; border: 1px solid var(--border); border-radius: 13px; background: #fff; }
.parameter-info-lead p,
.parameter-purpose p,
.current-recommendation p,
.parameter-current-status p,
.level-recommendations p { margin-top: 5px; }
.parameter-spec-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.parameter-spec-grid > div { min-width: 0; padding: 11px 12px; border-radius: 12px; background: #eef5fb; }
.parameter-spec-grid strong { display: block; margin-top: 4px; overflow: hidden; color: var(--text); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.parameter-current-status { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 14px; padding: 13px 15px; border: 1px solid #bbf7d0; border-radius: 13px; background: #ecfdf5; }
.parameter-current-status > strong { color: #047857; font-size: 12px; }
.parameter-current-status p { grid-column: 1 / -1; color: #086b51; }
.parameter-current-status.watch { border-color: #fed7aa; background: #fff7ed; }
.parameter-current-status.watch > strong,
.parameter-current-status.watch p { color: #9a4d0a; }
.parameter-current-status.critical { border-color: #f8c9c4; background: #fff1ef; }
.parameter-current-status.critical > strong,
.parameter-current-status.critical p { color: #b53a2e; }
.current-recommendation { border-left: 4px solid #10b981; }
.current-recommendation.watch { border-left-color: #f59e0b; }
.current-recommendation.critical { border-left-color: #e85d4f; }
.level-recommendations { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.level-recommendations article { padding: 14px 15px; border: 1px solid var(--border); border-radius: 13px; background: #fff; }
.level-recommendations article.high { border-top: 3px solid #e85d4f; }
.level-recommendations article.low { border-top: 3px solid #1686d9; }
.level-recommendations strong { color: var(--text); font-size: 12px; }
.parameter-trend { min-width: 0; padding-top: 2px; }
.trend-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.trend-heading p { margin-top: 4px; }
.trend-heading strong { color: var(--text); font-size: 14px; white-space: nowrap; }
.favorites-panel { display: grid; gap: 18px; }
.favorite-list { margin-top: 2px; }
.favorites-empty { min-height: 260px; display: grid; place-items: center; align-content: center; gap: 7px; border: 1px dashed var(--border); border-radius: 16px; color: var(--text-muted); text-align: center; }
.favorites-empty > span { color: #f59e0b; font-size: 42px; line-height: 1; }
.favorites-empty strong { color: var(--text); font-size: 18px; }
.favorites-empty p { margin-bottom: 8px; font-size: 13px; }
.no-results { display: grid; place-items: center; gap: 5px; min-height: 150px; border: 1px dashed var(--border); border-radius: 15px; color: var(--text-muted); text-align: center; }
.no-results strong { color: var(--text); }
@media (max-width: 900px) {
  .report-hero,
  .score-card { align-items: flex-start; flex-direction: column; }
  .score-card { min-width: 0; width: 100%; }
  .workflow-card,
  .report-layout { grid-template-columns: 1fr; }
  .group-detail-head { align-items: flex-start; flex-direction: column; }
  .explorer-head,
  .explorer-controls,
  .care-head { align-items: stretch; flex-direction: column; }
  .care-mode { align-self: flex-start; }
  .care-card-toggle { grid-template-columns: 1fr; gap: 10px; }
  .care-card-meta { justify-content: space-between; }
  .care-card-grid { grid-template-columns: 1fr; padding-left: 18px; }
  .explorer-controls input { width: 100%; }
  .element-head { grid-template-columns: 42px minmax(0, 1fr) auto; }
  .target-gauge { grid-column: 1 / -1; grid-row: 2; }
  .element-reading { grid-column: 3; grid-row: 1; }
  .element-reading { margin-right: 36px; }
  .element-chevron { display: none; }
  .favorite-button { top: 22px; right: 12px; }
  .element-detail { grid-template-columns: 1fr; padding-left: 18px; }
}
@media (max-width: 600px) {
  .parameter-detail-tabs button { min-height: 62px; padding-inline: 4px; }
  .parameter-tab-copy strong { font-size: 10px; }
  .parameter-spec-grid { grid-template-columns: 1fr; }
  .level-recommendations { grid-template-columns: 1fr; }
}
</style>
