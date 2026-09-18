<template>
  <div class="report-page tools-page">
    <div v-if="loading" class="loading" role="status">Werkzeuge werden geladen…</div>

    <EmptyState
      v-else-if="!profiles.length"
      kicker="Noch kein Aquarium"
      title="Werkzeuge benötigen ein Aquarium"
      message="Legen Sie zuerst ein Aquarium an. Danach können Wasserwechsel, Verbräuche, Verläufe und Dosierungen mit Ihren Daten berechnet werden."
      mark="TLS"
      tone="compact"
    >
      <template #actions>
        <RouterLink to="/aquariums/new" class="btn btn-primary">Aquarium anlegen</RouterLink>
      </template>
    </EmptyState>

    <template v-else>
    <section class="tools-hero">
      <div>
        <span class="hero-kicker">ATI Workbench</span>
        <h1>Laborwerte in Entscheidungen verwandeln</h1>
        <p>Wasserwechsel simulieren, Verbrauch bestimmen und Verläufe anhand Ihrer abgeschlossenen Laborberichte vergleichen.</p>
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
          <span>{{ workbenchMetricLabel }}</span>
          <strong>{{ selectedProfile.name }}</strong>
          <em>{{ selectedProfile.net_volume }} L · {{ activeToolLabel }}</em>
        </div>
      </div>
    </section>

    <div class="tool-tabs" role="tablist" aria-label="Werkzeuge">
      <button
        v-for="tool in tools"
        :id="`tool-tab-${tool.key}`"
        :key="tool.key"
        type="button"
        role="tab"
        :aria-selected="activeTool === tool.key"
        :aria-controls="`tool-panel-${tool.key}`"
        :class="['tool-tab', { active: activeTool === tool.key }]"
        @click="activeTool = tool.key"
      >
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
    <section
      v-if="activeTool === 'waterchange'"
      id="tool-panel-waterchange"
      class="tool-layout"
      role="tabpanel"
      aria-labelledby="tool-tab-waterchange"
    >
      <div class="card tool-panel">
        <div class="panel-kicker">Simulation</div>
        <h2>Wasserwechsel-Simulator</h2>
        <p class="panel-copy">Berechnet aus Aquarium, Osmosewasser und Salzquelle, wie sich die Werte nach mehreren Wasserwechseln verändern.</p>

        <div class="form-group">
          <label for="waterchange-profile">Aquarium-Profil</label>
          <select id="waterchange-profile" v-model="selectedProfileId">
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }} · {{ p.net_volume }} L</option>
          </select>
          <small class="field-hint">{{ latestAnalysisLabel }}</small>
        </div>

        <div class="form-group">
          <label for="waterchange-osmosis">Osmosewasser-Profil <em>(optional)</em></label>
          <select id="waterchange-osmosis" v-model="osmosisProfileId">
            <option value="">Keine gemessenen Restwerte</option>
            <option v-for="profile in osmosisProfiles" :key="profile.id" :value="profile.id">{{ profile.name }}</option>
          </select>
          <small v-if="osmosisProfileId" class="field-hint">{{ osmosisAnalysisLabel }}</small>
        </div>

        <div class="form-group">
          <label for="waterchange-salt">Salzquelle</label>
          <select id="waterchange-salt" v-model="saltSource">
            <option v-for="salt in saltSources" :key="salt.name" :value="salt.name" :disabled="salt.disabled">
              {{ salt.name }}{{ salt.disabled ? ` (${salt.disabledReason})` : '' }}
            </option>
          </select>
        </div>
        <div v-if="activeSalt.input === 'charge'" class="form-group">
          <label for="waterchange-charge">Chargen-ID</label>
          <input id="waterchange-charge" v-model.trim="saltCharge" type="text" placeholder="z. B. 20042025" aria-describedby="waterchange-salt-status" />
        </div>
        <div v-else-if="activeSalt.input === 'analysis'" class="form-group">
          <label for="waterchange-salt-analysis">Analyse-ID der Salzanalyse</label>
          <select id="waterchange-salt-analysis" v-model="saltAnalysisId" aria-describedby="waterchange-salt-status">
            <option value="">Analyse auswählen</option>
            <option v-for="analysis in saltAnalyses" :key="analysis.id" :value="analysis.id">{{ analysisOptionLabel(analysis) }}</option>
          </select>
        </div>
        <small id="waterchange-salt-status" class="field-hint" :class="{ 'field-error': saltValidationMessage }">
          {{ saltValidationMessage || activeSalt.description }}
        </small>

        <div class="form-grid waterchange-inputs">
          <div class="form-group">
            <label for="waterchange-count">Anzahl Wasserwechsel</label>
            <input id="waterchange-count" v-model.number="waterChanges" type="number" min="1" max="12" @change="normalizeWaterInputs" />
          </div>
          <div class="form-group">
            <label for="waterchange-amount">Ausmaß je Wechsel</label>
            <div class="input-unit">
              <input id="waterchange-amount" v-model.number="changeAmount" type="number" min="1" :max="changeUnit === 'pct' ? 90 : maxChangeLitres" @change="normalizeWaterInputs" />
              <div class="unit-toggle" role="group" aria-label="Einheit des Wasserwechsels">
                <button type="button" :class="{ active: changeUnit === 'pct' }" :aria-pressed="changeUnit === 'pct'" @click="setChangeUnit('pct')">%</button>
                <button type="button" :class="{ active: changeUnit === 'l' }" :aria-pressed="changeUnit === 'l'" @click="setChangeUnit('l')">L</button>
              </div>
            </div>
          </div>
        </div>

        <div class="tool-summary">
          <div><strong>{{ formatNumber(litresPerChange, 1) }} L</strong><span>je Wechsel ({{ formatNumber(pctPerChange, 1) }} %)</span></div>
          <div><strong>{{ formatNumber(totalLitres, 1) }} L</strong><span>gesamt über {{ safeWaterChanges }} Wechsel</span></div>
        </div>
      </div>

      <div v-if="waterChangeReady" class="card chart-card">
        <div class="chart-heading">
          <h3>Ergebnis nach {{ safeWaterChanges }} Wechsel</h3>
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

        <div class="chart-wrap" role="img" :aria-label="`Vergleich der Wasserwerte vor und nach ${safeWaterChanges} Wasserwechseln`">
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
      <EmptyState
        v-else
        kicker="Simulation nicht verfügbar"
        title="Analyse- oder Salzdaten fehlen"
        :message="waterChangeUnavailableMessage"
        mark="H₂O"
        tone="compact"
      >
        <template #actions>
          <RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
        </template>
      </EmptyState>
    </section>

    <!-- ============ VERBRAUCH / REZEPTFINDER ============ -->
    <section
      v-else-if="activeTool === 'consumption'"
      id="tool-panel-consumption"
      class="tool-layout"
      role="tabpanel"
      aria-labelledby="tool-tab-consumption"
    >
      <div class="card tool-panel">
        <div class="panel-kicker">Verbrauch &amp; Rezept</div>
        <h2>Rezeptfinder</h2>
        <p class="panel-copy">Ermittelt aus mindestens zwei Analysen den Verbrauch je Element und berechnet die nötige Tages- bzw. Wochendosis zur Stabilisierung.</p>
        <div class="form-group">
          <label for="recipe-profile">Aquarium-Profil</label>
          <select id="recipe-profile" v-model="selectedProfileId">
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="recipe-analysis-start">Analyse A (älter)</label>
            <select id="recipe-analysis-start" v-model="rangeStart" :disabled="selectedProfileAnalyses.length < 2">
              <option v-for="analysis in selectedProfileAnalyses" :key="analysis.id" :value="analysis.id">{{ analysisOptionLabel(analysis) }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="recipe-analysis-end">Analyse B (neuer)</label>
            <select id="recipe-analysis-end" v-model="rangeEnd" :disabled="selectedProfileAnalyses.length < 2">
              <option v-for="analysis in selectedProfileAnalyses" :key="analysis.id" :value="analysis.id">{{ analysisOptionLabel(analysis) }}</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <span class="group-label" id="recipe-dosing-label">Wurde zwischen den Analysen dosiert?</span>
          <div class="seg-toggle" role="group" aria-labelledby="recipe-dosing-label">
            <button type="button" :class="{ active: dosingMode === 'none' }" :aria-pressed="dosingMode === 'none'" @click="dosingMode = 'none'">Nein</button>
            <button type="button" :class="{ active: dosingMode === 'once' }" :aria-pressed="dosingMode === 'once'" @click="dosingMode = 'once'">Einmalig</button>
            <button type="button" :class="{ active: dosingMode === 'regular' }" :aria-pressed="dosingMode === 'regular'" @click="dosingMode = 'regular'">Regelmäßig</button>
          </div>
          <small class="field-hint">{{ dosingHint }}</small>
        </div>

        <div v-if="dosingMode !== 'none' && recipeInputs.length" class="dose-adjustments">
          <div v-for="item in recipeInputs" :key="item.key" class="form-group">
            <label :for="`recipe-dose-${item.key}`">{{ item.label }} <em>({{ item.unit }}{{ dosingMode === 'regular' ? '/Tag' : ' gesamt' }})</em></label>
            <input :id="`recipe-dose-${item.key}`" v-model.number="dosingAdjustments[item.key]" type="number" min="0" step="any" />
          </div>
        </div>

        <div v-if="canCalculateRecipe" :class="['alert', intervalDays > 120 ? 'alert-warning' : 'alert-info']">
          <span>{{ intervalDays > 120 ? 'Hinweis' : 'Intervall' }}</span>
          <span>{{ intervalDays }} Tage zwischen den Analysen. {{ intervalDays > 120 ? 'Für Spurenelemente ist das Intervall zu lang.' : 'Das Intervall ist für die Berechnung gut nutzbar.' }}</span>
        </div>
      </div>

      <div v-if="canCalculateRecipe" class="card chart-card">
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
      <EmptyState
        v-else
        kicker="Mindestens zwei Berichte"
        title="Verbrauch noch nicht berechenbar"
        message="Wählen Sie ein Aquarium mit mindestens zwei abgeschlossenen Analysen und zwei unterschiedliche Berichte."
        mark="RCP"
        tone="compact"
      >
        <template #actions>
          <RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
        </template>
      </EmptyState>
    </section>

    <!-- ============ TRENDS ============ -->
    <section
      v-else-if="activeTool === 'trends'"
      id="tool-panel-trends"
      class="tool-layout"
      role="tabpanel"
      aria-labelledby="tool-tab-trends"
    >
      <div class="card tool-panel">
        <div class="panel-kicker">Verlauf</div>
        <h2>Verlaufsdiagramme</h2>
        <p class="panel-copy">Zeigt die Entwicklung eines oder mehrerer Parameter über die Zeit. Y-Achse passt sich an Wert und Einheit an.</p>
        <div class="form-group">
          <label for="trend-profile">Aquarium-Profil</label>
          <select id="trend-profile" v-model="selectedProfileId">
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="trend-group">Parameter-Gruppe</label>
          <select id="trend-group" v-model="trendGroup">
            <option v-for="group in trendGroups" :key="group.label" :value="group.label">{{ group.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="trend-range">Zeitraum</label>
          <select id="trend-range" v-model="trendRange">
            <option value="3">Letzte 3 Monate</option>
            <option value="6">Letzte 6 Monate</option>
            <option value="12">Letzte 12 Monate</option>
            <option value="0">Alle Analysen</option>
          </select>
        </div>
        <RouterLink to="/tools/trends" class="btn btn-primary btn-block">Detailansicht öffnen</RouterLink>
      </div>

      <div v-if="trendSeries.length" class="card chart-card">
        <div class="chart-heading">
          <h3>{{ trendGroup }} im Verlauf</h3>
          <span class="badge badge-created">{{ trendRange === '0' ? 'alle' : trendRange + ' Monate' }}</span>
        </div>
        <div class="chart-wrap" role="img" :aria-label="`${activeTrendParameter.label} im zeitlichen Verlauf`">
          <Line :data="trendChartData" :options="lineOptions" />
        </div>
      </div>
      <EmptyState
        v-else
        kicker="Keine Trenddaten"
        title="Für diesen Zeitraum fehlen Werte"
        message="Wählen Sie einen längeren Zeitraum, eine andere Parametergruppe oder registrieren Sie eine weitere Analyse."
        mark="TRD"
        tone="compact"
      >
        <template #actions>
          <RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
        </template>
      </EmptyState>
    </section>

    <!-- ============ DOSIERPLAN ============ -->
    <section
      v-else
      id="tool-panel-dosing"
      class="tool-layout"
      role="tabpanel"
      aria-labelledby="tool-tab-dosing"
    >
      <div class="card tool-panel">
        <div class="panel-kicker">Planung</div>
        <h2>Dosierplan</h2>
        <p class="panel-copy">Wöchentlicher Plan für freigegebene ICP-Dosierungen mit erledigten Dosen und Fortschritt.</p>
        <div class="form-group">
          <label for="dosing-profile">Aquarium-Profil</label>
          <select id="dosing-profile" v-model="selectedProfileId">
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="dosing-analysis">Laboranalyse</label>
          <select id="dosing-analysis" v-model="dosingAnalysisId" :disabled="!dosingAnalysisOptions.length">
            <option v-if="!dosingAnalysisOptions.length" value="">Keine abgeschlossene Analyse</option>
            <option v-for="analysis in dosingAnalysisOptions" :key="analysis.id" :value="analysis.id">
              {{ analysisOptionLabel(analysis) }}{{ analysis.id === latestAnalysis?.id ? ' · Neueste' : '' }}
            </option>
          </select>
          <small class="field-hint">{{ dosingAnalysisHint }}</small>
        </div>
        <div class="form-group">
          <label for="dosing-week">Woche</label>
          <input id="dosing-week" v-model="doseWeek" type="week" />
        </div>
        <div class="tool-summary">
          <div><strong>{{ completedDoses }}/{{ totalDoses }}</strong><span>erledigt</span></div>
          <div><strong>{{ doseCompletion }}%</strong><span>Wochenfortschritt</span></div>
        </div>
      </div>

      <div v-if="selectedDosingAnalysis && dosingCandidates.length" class="card dosing-card">
        <DosingCalendar :items="dosingCandidates" :aquarium-name="selectedProfile?.name" :report-number="selectedDosingAnalysis.reportNumber || selectedDosingAnalysis.barcode" :volume="Number(selectedProfile?.net_volume) || 0" :start-date="weekStart(doseWeek)" />
        <div class="chart-heading">
          <div>
            <h3>{{ dosingRows.length ? 'Wochendosierung' : 'Korrekturen aus der Analyse' }}</h3>
            <small>{{ dosingRows.length }} erforderliche Produktdosierungen · Tageslimit berücksichtigt</small>
          </div>
          <span v-if="dosingRows.length" class="badge badge-created">{{ doseCompletion }}% erledigt</span>
        </div>

        <div v-if="dosingRows.length" class="dosing-course-note">
          <i>i</i>
          <p><strong>Einmaliger Korrekturkurs:</strong> Nur markierte Tage gehören zum berechneten Kurs. Nicht automatisch in der nächsten Woche wiederholen; danach wie im Bericht angegeben kontrollieren.</p>
        </div>

        <div v-if="dosingRows.length" class="dosing-grid">
          <div class="dosing-head">Element</div>
          <div v-for="day in days" :key="day" class="dosing-head">{{ day }}</div>
          <template v-for="row in dosingRows" :key="row.key">
            <div class="dosing-element">
              {{ row.element }}
              <span>{{ row.amount }} · {{ row.product }}</span>
              <small>{{ row.course }}</small>
            </div>
            <div v-for="day in days" :key="`${row.key}-${day}`" :class="['dose-cell', { inactive: !row.active[day] }]">
              <label v-if="row.active[day]" class="dose-check">
                <input v-model="row.done[day]" type="checkbox" :aria-label="`${row.element}, ${day}, ${row.amount}`" />
                <span></span>
              </label>
              <span v-else class="dose-empty" aria-hidden="true">–</span>
            </div>
          </template>
        </div>

        <ProductSuggestions class="dosing-products" :products="dosingProducts(dosingCandidates)" />

      </div>
      <EmptyState
        v-else
        :kicker="selectedDosingAnalysis ? 'Keine Produktdosierung' : 'Keine Analyse'"
        :title="selectedDosingAnalysis ? 'Keine freigegebene Dosierung verfügbar' : 'Noch kein Dosierplan verfügbar'"
        :message="dosingEmptyMessage"
        mark="DOS"
        tone="compact"
      >
        <template #actions>
          <RouterLink v-if="selectedDosingAnalysis" :to="`/analyses/${selectedDosingAnalysis.id}`" class="btn btn-ghost">Quellbericht öffnen</RouterLink>
          <RouterLink v-else to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
        </template>
      </EmptyState>
    </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip, Legend, Filler
} from 'chart.js'
import { useAuthStore } from '@/stores/auth'
import { buildDosingPlan } from '@/services/dosingPlan'
import { weekStart } from '@/services/dosingCalendar'
import DosingCalendar from '@/components/analyses/DosingCalendar.vue'
import { analysisApi, profileApi } from '@/services/toolsData'
import { loadDosingProgress, saveDosingProgress } from '@/services/toolsDosingStore'
import {
  buildDoseWeekSchedule,
  buildAnalysisSeries,
  calculateConsumption,
  clampNumber,
  isoWeekValue,
  parameterFromAnalysis,
  scoreParameters,
  scoreValue,
  simulateWaterChanges,
  waterChangeFraction,
} from '@/services/toolsCalculations'
import '@/assets/styles/report-base.css'
import EmptyState from '@/components/ui/EmptyState.vue'
import ProductSuggestions from '@/components/analyses/ProductSuggestions.vue'
import { recommendedDosingProducts } from '@/services/dosingConfig'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

const tools = [
  { key: 'waterchange', label: 'Wasserwechsel', caption: 'Simulator' },
  { key: 'consumption', label: 'Rezeptfinder', caption: 'Verbrauch + Dosis' },
  { key: 'trends', label: 'Verläufe', caption: 'Diagramme' },
  { key: 'dosing', label: 'Dosierplan', caption: 'Wochenplan' },
]

const activeTool = ref('waterchange')
const profiles = ref([])
const osmosisProfiles = ref([])
const allAnalyses = ref([])
const loading = ref(true)
const selectedProfileId = ref('')
const auth = useAuthStore()
const route = useRoute()

/* water change inputs */
const osmosisProfileId = ref('')
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
const trendGroup = ref('Mengenelemente')
const trendRange = ref('12')
const doseWeek = ref(isoWeekValue())
const dosingAnalysisId = ref('')

const waterParameterKeys = ['calcium', 'magnesium', 'kh', 'nitrate', 'phosphate']
const defaultSaltValues = {
  calcium: 430,
  magnesium: 1320,
  kh: 8.2,
  nitrate: 0,
  phosphate: 0,
}
const nyosBatches = {
  '20042025': { calcium: 425, magnesium: 1300, kh: 8, nitrate: 0, phosphate: 0 },
}

const selectedProfile = computed(() => (
  profiles.value.find((profile) => String(profile.id) === String(selectedProfileId.value)) || profiles.value[0]
))
const selectedProfileAnalyses = computed(() => allAnalyses.value.filter(
  (analysis) => String(analysis.profile_id) === String(selectedProfileId.value),
))
const latestAnalysis = computed(() => selectedProfileAnalyses.value.at(-1) || null)
const selectedOsmosisAnalysis = computed(() => allAnalyses.value.filter(
  (analysis) => String(analysis.profile_id) === String(osmosisProfileId.value),
).at(-1) || null)
const saltAnalyses = computed(() => allAnalyses.value.filter((analysis) => analysis.waterType === 'Meersalz'))
const saltSources = computed(() => [
  {
    name: 'Absolute Ocean', input: 'fixed', values: defaultSaltValues,
    description: 'Hinterlegte Referenzwerte für frisch angesetztes Meerwasser.',
  },
  {
    name: 'Nyos pure', input: 'charge', batches: nyosBatches,
    description: 'Verfügbare Testcharge: 20042025.',
  },
  {
    name: 'Salzanalyse', input: 'analysis', disabled: !saltAnalyses.value.length,
    disabledReason: 'keine Salzanalyse vorhanden',
    description: 'Werte werden aus dem ausgewählten Meersalz-Laborbericht geladen.',
  },
  {
    name: 'Balancer', input: 'balancer', disabled: true,
    disabledReason: 'bald verfügbar', description: 'Noch nicht verfügbar.',
  },
])
const activeSalt = computed(() => saltSources.value.find((source) => source.name === saltSource.value) || saltSources.value[0])

function valuesFromAnalysis(analysis) {
  if (!analysis) return null
  const values = Object.fromEntries(waterParameterKeys.map((key) => [key, Number(parameterFromAnalysis(analysis, key)?.value)]))
  return Object.values(values).every(Number.isFinite) ? values : null
}

const activeSaltValues = computed(() => {
  if (activeSalt.value.input === 'fixed') return activeSalt.value.values
  if (activeSalt.value.input === 'charge') return activeSalt.value.batches[saltCharge.value] || null
  if (activeSalt.value.input === 'analysis') {
    return valuesFromAnalysis(saltAnalyses.value.find((analysis) => analysis.id === saltAnalysisId.value))
  }
  return null
})
const osmosisValues = computed(() => valuesFromAnalysis(selectedOsmosisAnalysis.value) || Object.fromEntries(
  waterParameterKeys.map((key) => [key, 0]),
))

const wcParams = computed(() => waterParameterKeys.map((key) => {
  const parameter = parameterFromAnalysis(latestAnalysis.value, key)
  const minimum = Number(parameter?.referenceRange?.min)
  const maximum = Number(parameter?.referenceRange?.max)
  const aquarium = Number(parameter?.value)
  if (!parameter || !Number.isFinite(minimum) || !Number.isFinite(maximum) || !Number.isFinite(aquarium)) return null
  return {
    key,
    label: parameter.label,
    unit: parameter.unit,
    aquarium,
    target: [minimum, maximum],
    dec: Number(parameter.precision ?? 2),
  }
}).filter(Boolean))

const maxChangeLitres = computed(() => Math.max(1, Number(selectedProfile.value?.net_volume || 1) * 0.9))
const safeWaterChanges = computed(() => Math.round(clampNumber(waterChanges.value, 1, 12, 1)))
const changeFraction = computed(() => waterChangeFraction({
  amount: changeAmount.value,
  unit: changeUnit.value,
  volume: selectedProfile.value?.net_volume,
}))
const pctPerChange = computed(() => changeFraction.value * 100)
const litresPerChange = computed(() => Number(selectedProfile.value?.net_volume || 0) * changeFraction.value)
const totalLitres = computed(() => litresPerChange.value * safeWaterChanges.value)
const newWaterValues = computed(() => Object.fromEntries(waterParameterKeys.map((key) => [
  key,
  Number(activeSaltValues.value?.[key] || 0) + Number(osmosisValues.value[key] || 0),
])))
const waterChangeReady = computed(() => (
  selectedProfile.value?.water_type === 'Meerwasser'
  && wcParams.value.length === waterParameterKeys.length
  && Boolean(activeSaltValues.value)
))
const afterValues = computed(() => waterChangeReady.value
  ? simulateWaterChanges(wcParams.value, newWaterValues.value, safeWaterChanges.value, changeFraction.value)
  : {})
const beforeValues = computed(() => Object.fromEntries(wcParams.value.map((parameter) => [parameter.key, parameter.aquarium])))
const qualityBefore = computed(() => waterChangeReady.value ? scoreParameters(wcParams.value, beforeValues.value) : 0)
const qualityAfter = computed(() => waterChangeReady.value ? scoreParameters(wcParams.value, afterValues.value) : 0)

function setChangeUnit(nextUnit) {
  if (nextUnit === changeUnit.value) return
  changeAmount.value = Number((nextUnit === 'l' ? litresPerChange.value : pctPerChange.value).toFixed(2))
  changeUnit.value = nextUnit
  normalizeWaterInputs()
}

function normalizeWaterInputs() {
  waterChanges.value = safeWaterChanges.value
  const maximum = changeUnit.value === 'pct' ? 90 : maxChangeLitres.value
  changeAmount.value = clampNumber(changeAmount.value, 1, maximum, 1)
}

function fmt(par, v) {
  return `${v.toFixed(par.dec)} ${par.unit}`
}
const deviationSummary = computed(() =>
  wcParams.value
    .filter((par) => scoreValue(par.aquarium, par.target) < 100 || scoreValue(afterValues.value[par.key], par.target) < 100)
    .map((par) => {
      const after = afterValues.value[par.key]
      return {
        label: par.label,
        before: fmt(par, par.aquarium),
        after: fmt(par, after),
        tone: scoreValue(after, par.target) >= 100 ? 'good' : 'watch',
        note: `Ziel ${par.target[0]}–${par.target[1]} ${par.unit}`,
      }
    }),
)

const waterChangeChartData = computed(() => {
  const mid = (par) => (par.target[0] + par.target[1]) / 2
  const pctOf = (par, v) => Math.round((v / mid(par)) * 100)
  return {
    labels: wcParams.value.map(p => p.label),
    datasets: [
      { label: 'Aktuell (% vom Ziel)', data: wcParams.value.map(p => pctOf(p, p.aquarium)), backgroundColor: '#8be7e1', borderRadius: 8 },
      { label: 'Nach Simulation', data: wcParams.value.map(p => pctOf(p, afterValues.value[p.key])), backgroundColor: '#0072CE', borderRadius: 8 },
    ],
  }
})

const optimizationSuggestion = computed(() => {
  const pct = Number(pctPerChange.value.toFixed(1))
  let n90 = null
  for (let n = 1; n <= 12; n++) {
    const values = simulateWaterChanges(wcParams.value, newWaterValues.value, n, changeFraction.value)
    if (scoreParameters(wcParams.value, values) >= 90) { n90 = n; break }
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
const olderAnalysis = computed(() => selectedProfileAnalyses.value.find((analysis) => analysis.id === rangeStart.value) || null)
const newerAnalysis = computed(() => selectedProfileAnalyses.value.find((analysis) => analysis.id === rangeEnd.value) || null)
const intervalDays = computed(() => {
  const start = new Date(olderAnalysis.value?.created_at)
  const end = new Date(newerAnalysis.value?.created_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.round((end - start) / 86400000))
})
const dosingAdjustments = ref({})

const dosingHint = computed(() => {
  if (dosingMode.value === 'once') return 'Tragen Sie die gesamte Konzentrationszugabe zwischen beiden Berichten je Element ein.'
  if (dosingMode.value === 'regular') return 'Tragen Sie die bereits dosierte Konzentration pro Tag ein; angezeigt wird die zusätzlich nötige Menge.'
  return 'Der Verbrauch wird direkt aus der Differenz beider Analysen berechnet.'
})

const recipeParameters = [
  { key: 'calcium', product: 'ATI Essentials Pro' },
  { key: 'magnesium', product: 'ATI Magnesium' },
  { key: 'kh', product: 'ATI Essentials Pro' },
  { key: 'iodine', product: 'ATI ICP Elements Jod' },
  { key: 'iron', product: 'ATI Daily Traces' },
]

function smartRound(n) {
  const abs = Math.abs(n)
  if (abs >= 10) return n.toFixed(0)
  if (abs >= 1) return n.toFixed(1)
  if (abs >= 0.1) return n.toFixed(2)
  return n.toFixed(3)
}

const recipeInputs = computed(() => recipeParameters.map((config) => {
  const older = parameterFromAnalysis(olderAnalysis.value, config.key)
  const newer = parameterFromAnalysis(newerAnalysis.value, config.key)
  if (!older || !newer) return null
  return { ...config, label: newer.label, unit: newer.unit, older, newer }
}).filter(Boolean))
const canCalculateRecipe = computed(() => (
  intervalDays.value > 0 && rangeStart.value !== rangeEnd.value && recipeInputs.value.length > 0
))
const recipeRows = computed(() => canCalculateRecipe.value
  ? recipeInputs.value.map((item) => {
    const result = calculateConsumption({
      olderValue: item.older.value,
      newerValue: item.newer.value,
      intervalDays: intervalDays.value,
      dosingMode: dosingMode.value,
      documentedDose: dosingAdjustments.value[item.key],
    })
    const zeroLimit = item.unit === 'µg/l' ? 3 : item.unit === 'dKH' ? 0.2 : 5
    const zero = Number(item.newer.value) <= zeroLimit
    const additional = result.recommendedAdditionalPerDay
    const dose = additional > 0 ? `${dosingMode.value === 'regular' ? '+' : ''}${smartRound(additional)} ${item.unit}/Tag` : 'Keine Zugabe'
    return {
      name: item.label,
      consumption: `${smartRound(result.consumptionPerDay)} ${item.unit}`,
      dose,
      weekly: additional > 0 ? `${smartRound(additional * 7)} ${item.unit}/Woche` : 'Wert beobachten',
      product: item.product,
      zero,
    }
  })
  : [])

const consumptionReliability = computed(() => {
  if (!canCalculateRecipe.value) return 0
  let base = Math.max(34, Math.min(98, 108 - Math.round(intervalDays.value / 3)))
  if (recipeRows.value.some(r => r.zero)) base = Math.max(30, base - 18)
  if (dosingMode.value === 'none') base = Math.min(99, base + 4)
  return base
})

/* ---------- Trends ---------- */
const trendGroups = [
  { label: 'Basiswerte', key: 'kh', parameterLabel: 'Karbonathärte' },
  { label: 'Mengenelemente', key: 'calcium', parameterLabel: 'Calcium' },
  { label: 'Nährstoffe', key: 'nitrate', parameterLabel: 'Nitrat' },
  { label: 'Schadstoffe', key: 'copper', parameterLabel: 'Kupfer' },
]
const activeTrendParameter = computed(() => trendGroups.find((group) => group.label === trendGroup.value) || trendGroups[0])
const trendSeries = computed(() => buildAnalysisSeries(
  selectedProfileAnalyses.value,
  activeTrendParameter.value.key,
  { months: Number(trendRange.value) },
))
const trendChartData = computed(() => {
  return {
    labels: trendSeries.value.map((point) => formatDate(point.date)),
    datasets: [
      {
        label: activeTrendParameter.value.parameterLabel,
        data: trendSeries.value.map((point) => point.value),
        borderColor: '#0072CE',
        backgroundColor: 'rgba(136,193,233,0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#0072CE',
      },
    ],
  }
})

/* ---------- Dosierplan ---------- */
const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const dosingAnalysisOptions = computed(() => [...selectedProfileAnalyses.value].reverse())
const selectedDosingAnalysis = computed(() => (
  selectedProfileAnalyses.value.find((analysis) => analysis.id === dosingAnalysisId.value) || null
))
const dosingPlanItems = computed(() => buildDosingPlan(
  selectedDosingAnalysis.value?.parameters || [],
  Number(selectedProfile.value?.net_volume) || 0,
))
const dosingCandidates = computed(() => dosingPlanItems.value.filter((item) => item.dose))
const dosingRows = ref([])
const totalDoses = computed(() => dosingRows.value.reduce((sum, row) => sum + days.filter((day) => row.active[day]).length, 0))
const completedDoses = computed(() => dosingRows.value.reduce(
  (sum, row) => sum + days.filter((day) => row.active[day] && row.done[day]).length,
  0,
))
const doseCompletion = computed(() => totalDoses.value ? Math.round((completedDoses.value / totalDoses.value) * 100) : 0)
const dosingAnalysisHint = computed(() => selectedDosingAnalysis.value
  ? `Dosierbedarf aus ${analysisOptionLabel(selectedDosingAnalysis.value)} und ${selectedProfile.value?.net_volume || 0} L Nettovolumen.`
  : 'Wählen Sie ein Aquarium mit einer abgeschlossenen Analyse.')
const dosingEmptyMessage = computed(() => selectedDosingAnalysis.value
  ? dosingPlanItems.value.length ? 'Niedrige Werte benötigen eine freigegebene Produktformel und ein Tageslimit, bevor eine Dosierung berechnet werden kann. Weitere Maßnahmen finden Sie im Quellbericht.' : 'Alle dosierbaren Messwerte liegen mindestens am unteren Rand ihres Zielbereichs. Der Bericht bleibt die Grundlage für die nächste Kontrolle.'
  : 'Für das ausgewählte Aquarium liegt noch keine abgeschlossene Analyse vor.')

/* ---------- Workbench readout ---------- */
const activeToolLabel = computed(() => tools.find(t => t.key === activeTool.value)?.label || 'Tools')
const workbenchMetricLabel = computed(() => ({
  waterchange: 'Simulierte Wasserqualität',
  consumption: 'Berechnungsverlässlichkeit',
  trends: 'Datenabdeckung',
  dosing: 'Wochenfortschritt',
}[activeTool.value] || 'Werkzeugstatus'))
const workbenchScore = computed(() => {
  if (activeTool.value === 'waterchange') return qualityAfter.value
  if (activeTool.value === 'consumption') return consumptionReliability.value
  if (activeTool.value === 'dosing') return dosingRows.value.length ? doseCompletion.value : 0
  return Math.min(100, trendSeries.value.length * 25)
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

const latestAnalysisLabel = computed(() => latestAnalysis.value
  ? `Basis: ${analysisOptionLabel(latestAnalysis.value)}`
  : 'Für dieses Aquarium liegt noch keine abgeschlossene Analyse vor.')
const osmosisAnalysisLabel = computed(() => selectedOsmosisAnalysis.value
  ? `Restwerte aus ${analysisOptionLabel(selectedOsmosisAnalysis.value)}`
  : 'Keine Osmoseanalyse vorhanden; Restwerte werden mit 0 angesetzt.')
const saltValidationMessage = computed(() => {
  if (activeSalt.value.input === 'charge' && !activeSaltValues.value) return 'Bitte eine verfügbare Chargen-ID eingeben.'
  if (activeSalt.value.input === 'analysis' && saltAnalysisId.value && !activeSaltValues.value) return 'Die gewählte Analyse enthält nicht alle benötigten Salzwerte.'
  return ''
})
const waterChangeUnavailableMessage = computed(() => {
  if (selectedProfile.value?.water_type !== 'Meerwasser') return 'Der Wasserwechsel-Simulator unterstützt derzeit ausschließlich Meerwasseraquarien.'
  if (!latestAnalysis.value) return 'Für das ausgewählte Aquarium fehlt ein abgeschlossener Laborbericht.'
  if (wcParams.value.length !== waterParameterKeys.length) return 'Der aktuelle Bericht enthält nicht alle fünf benötigten Wasserparameter.'
  return saltValidationMessage.value || 'Bitte eine verfügbare Salzquelle auswählen.'
})

function formatDate(value) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(value))
}

function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits }).format(Number(value) || 0)
}

function analysisOptionLabel(analysis) {
  const number = analysis.reportNumber || analysis.barcode || analysis.id
  return `${number} · ${formatDate(analysis.completed_at || analysis.completedAt || analysis.created_at)}`
}

function syncRecipeSelection() {
  const analyses = selectedProfileAnalyses.value
  if (analyses.length < 2) {
    rangeStart.value = analyses[0]?.id || ''
    rangeEnd.value = ''
    return
  }
  if (!analyses.some((analysis) => analysis.id === rangeStart.value)) rangeStart.value = analyses[0].id
  if (!analyses.some((analysis) => analysis.id === rangeEnd.value) || rangeEnd.value === rangeStart.value) {
    rangeEnd.value = analyses.at(-1).id
  }
}

function syncDosingRows() {
  const progress = loadDosingProgress(auth.user?.id, selectedProfileId.value, dosingAnalysisId.value, doseWeek.value)
  dosingRows.value = dosingCandidates.value.map((item) => {
    const schedule = buildDoseWeekSchedule(item.dose.days, days)
    const activeDays = new Set(schedule.scheduledDays)
    return {
      key: item.key,
      element: item.label,
      product: item.dose.productName,
      amount: `bis zu ${formatNumber(item.dose.dailyMl, 6)} ml/Tag`,
      course: `${formatNumber(item.dose.totalMl, 6)} ml gesamt · ${item.dose.days} ${item.dose.days === 1 ? 'Tag' : 'Tage'}${schedule.remainingDays ? ` · ${schedule.remainingDays} weitere nach Sonntag` : ''}`,
      active: Object.fromEntries(days.map((day) => [day, activeDays.has(day)])),
      done: Object.fromEntries(days.map((day) => [day, activeDays.has(day) && Boolean(progress[item.key]?.[day])])),
    }
  })
}

function dosingProducts(items) {
  return recommendedDosingProducts(items, selectedDosingAnalysis.value?.parameters || [])
}

function syncDosingAnalysis() {
  if (!selectedProfileAnalyses.value.some((analysis) => analysis.id === dosingAnalysisId.value)) {
    dosingAnalysisId.value = latestAnalysis.value?.id || ''
  }
}

watch(selectedProfileId, () => {
  syncRecipeSelection()
  syncDosingAnalysis()
  syncDosingRows()
})
watch(doseWeek, syncDosingRows)
watch(dosingAnalysisId, syncDosingRows)
watch(dosingCandidates, syncDosingRows)
watch(dosingRows, (rows) => {
  const progress = Object.fromEntries(rows.map((row) => [row.key, row.done]))
  saveDosingProgress(auth.user?.id, selectedProfileId.value, dosingAnalysisId.value, doseWeek.value, progress)
}, { deep: true })

onMounted(async () => {
  try {
    const [loadedProfiles, loadedOsmosisProfiles, loadedAnalyses] = await Promise.all([
      profileApi.aquariums(),
      profileApi.osmosisSources(),
      analysisApi.list({ status: 'completed' }),
    ])
    profiles.value = loadedProfiles
    osmosisProfiles.value = loadedOsmosisProfiles
    allAnalyses.value = loadedAnalyses
    const requestedProfile = profiles.value.find((profile) => String(profile.id) === String(route.query.aquarium))
    selectedProfileId.value = requestedProfile?.id || profiles.value[0]?.id || ''
    syncRecipeSelection()
    const requestedAnalysis = selectedProfileAnalyses.value.find((analysis) => String(analysis.id) === String(route.query.analysis))
    dosingAnalysisId.value = requestedAnalysis?.id || ''
    syncDosingAnalysis()
    syncDosingRows()
    if (tools.some((tool) => tool.key === route.query.tool)) activeTool.value = route.query.tool
  } catch {
    profiles.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tools-hero {
  display: grid;
  grid-template-columns: minmax(min(100%, 520px), 1fr) minmax(min(100%, 320px), 0.42fr);
  gap: 24px;
  align-items: stretch;
  padding: 30px 32px;
  margin-bottom: 18px;
  border-radius: 28px;
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
  font-size: clamp(32px, 4.2vw, 48px);
  line-height: 1;
  font-weight: var(--fw-heading-strong);
  letter-spacing: -0.055em;
  margin-bottom: 14px;
}
.tools-hero p {
  max-width: 660px;
  color: rgba(255,255,255,0.72);
  font-size: 14px;
  line-height: 1.65;
}
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.hero-readout {
  display: grid;
  grid-template-columns: 106px 1fr;
  gap: 17px;
  align-items: center;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(18px);
}
.readout-ring {
  width: 106px;
  height: 106px;
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
.readout-ring strong { align-self: end; font-size: 32px; font-weight: var(--fw-heading-strong); letter-spacing: -0.06em; }
.readout-ring span { align-self: start; margin-top: -8px; color: rgba(255,255,255,0.62); font-size: 12px; font-weight: var(--fw-label); }
.hero-readout div:last-child span { display: block; color: var(--teal-200); font-size: 11px; font-weight: var(--fw-label); letter-spacing: 0.08em; text-transform: uppercase; }
.hero-readout div:last-child strong { display: block; margin-top: 5px; font-size: 22px; line-height: 1.05; font-weight: var(--fw-heading-strong); letter-spacing: -0.03em; }
.hero-readout div:last-child em { display: block; margin-top: 8px; color: rgba(255,255,255,0.66); font-size: 12px; font-style: normal; font-weight: var(--fw-label); }

.tool-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 10px;
  margin-bottom: 18px;
}
.tool-tab {
  display: grid;
  grid-template-columns: 38px 1fr;
  align-items: center;
  justify-content: start;
  gap: 12px;
  min-height: 68px;
  text-align: left;
  padding: 12px 14px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(136,193,233,0.18);
  border-radius: 16px;
  background: #fff;
  color: var(--text);
  font-weight: var(--fw-extra-bold);
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(10,27,67,0.055);
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
  background: linear-gradient(180deg, #fff, var(--teal-50));
  color: var(--brand-navy);
  box-shadow: 0 12px 30px rgba(0,114,206,0.12);
}
.tool-tab.active::before { opacity: 1; }
.tool-tab-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--teal-50);
  color: var(--brand-blue);
  grid-row: span 2;
  transition: background 0.18s, color 0.18s;
}
.tool-tab-icon svg { width: 20px; height: 20px; }
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
  gap: 18px;
  align-items: start;
}
.tool-panel {
  background: #fff;
  color: var(--text);
  overflow: hidden;
  border-top: 3px solid var(--brand-blue);
}
.tool-panel::after {
  content: '';
  position: absolute;
  right: -70px;
  bottom: -90px;
  width: 190px;
  height: 190px;
  border: 32px solid rgba(0,114,206,0.045);
  border-radius: 50%;
}
.tool-panel > * { position: relative; z-index: 1; }
.panel-kicker {
  color: var(--brand-blue);
  font-size: 11px;
  font-weight: var(--fw-heading-strong);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.tool-panel h2,
.chart-heading h3 { font-size: 18px; font-weight: var(--fw-heading-strong); color: var(--brand-navy); margin-bottom: 16px; letter-spacing: -0.02em; }
.panel-copy { color: var(--text-muted); font-size: 13px; line-height: 1.6; margin: -6px 0 18px; }
.tool-panel .form-group label { color: var(--text-muted); }
.tool-panel .form-group label em { color: #8191a6; font-style: normal; }
.group-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: var(--fw-label);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.field-hint { display: block; margin-top: 6px; color: #718198; font-size: 11px; line-height: 1.45; }
.field-error { color: #c74338; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr)); gap: 12px; }
.waterchange-inputs { align-items: end; }
.waterchange-inputs .form-group { display: grid; grid-template-rows: minmax(2.8em, auto) auto; align-content: end; }
.waterchange-inputs .form-group label { display: flex; align-items: flex-end; }
.dose-adjustments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }

.input-unit { display: flex; gap: 8px; align-items: stretch; }
.input-unit input { flex: 1; min-width: 0; }
.unit-toggle {
  display: flex;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  flex-shrink: 0;
}
.unit-toggle button {
  padding: 0 13px;
  border: 0;
  background: transparent;
  border-radius: 9px;
  color: var(--text-muted);
  font-weight: var(--fw-extra-bold);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
}
.unit-toggle button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 3px 10px rgba(10,27,67,.1); }

.seg-toggle { display: flex; gap: 6px; }
.seg-toggle button {
  flex: 1;
  padding: 9px 6px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: var(--fw-extra-bold);
  cursor: pointer;
  transition: background 0.16s, color 0.16s, border-color 0.16s;
}
.seg-toggle button.active { background: var(--brand-blue); color: #fff; border-color: var(--brand-blue); box-shadow: 0 5px 14px rgba(0,114,206,.2); }

.tool-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: 10px;
  margin-top: 4px;
}
.tool-summary div {
  border: 1px solid rgba(0,114,206,0.14);
  border-radius: 16px;
  padding: 12px;
  background: var(--teal-50);
}
.tool-summary strong { display: block; font-size: 24px; line-height: 1; color: var(--brand-navy); letter-spacing: -0.03em; }
.tool-summary span { font-size: 12px; color: var(--text-muted); }

.chart-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.chart-heading h3 { margin: 0; }
.chart-card { padding: 24px; }
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
  background: #fff;
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

.dosing-card { overflow-x: auto; padding: 24px; }
.dosing-card .chart-heading > div small { display: block; margin-top: 4px; color: var(--text-muted); font-size: 11px; }
.dosing-course-note { display: flex; align-items: flex-start; gap: 10px; min-width: 620px; margin: 14px 0; padding: 12px 14px; border-radius: 12px; background: #eef7fd; color: #456378; font-size: 12px; line-height: 1.5; }
.dosing-course-note i { display: grid; place-items: center; flex: none; width: 23px; height: 23px; border-radius: 50%; background: var(--brand-blue); color: #fff; font-style: normal; font-weight: 900; }
.dosing-grid {
  display: grid;
  grid-template-columns: minmax(120px, 1.4fr) repeat(7, minmax(54px, 1fr));
  min-width: 620px;
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
}
.dosing-head,
.dosing-element,
.dose-cell {
  min-height: 54px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.84);
}
.dosing-head { background: rgba(234,249,252,0.9); color: var(--text-muted); font-size: 11px; font-weight: var(--fw-label); text-transform: uppercase; }
.dosing-element { flex-direction: column; align-items: flex-start; padding: 10px 14px; font-weight: var(--fw-label); }
.dosing-element span { font-size: 11px; color: var(--text-muted); font-weight: var(--fw-ui); }
.dosing-element small { margin-top: 3px; color: var(--teal-700); font-size: 9px; font-weight: var(--fw-bold); }
.dose-cell { position: relative; }
.dose-cell.inactive { background: #f5f8fa; }
.dose-check { display: grid; place-items: center; width: 100%; min-height: 54px; cursor: pointer; }
.dose-check input { position: absolute; opacity: 0; }
.dose-check span { width: 24px; height: 24px; border-radius: 7px; border: 2px solid var(--border-strong); }
.dose-check input:checked + span { border-color: var(--teal-500); background: var(--teal-500); box-shadow: inset 0 0 0 5px #fff; }
.dose-check input:focus-visible + span { outline: 3px solid rgba(0,114,206,.2); outline-offset: 3px; }
.dose-empty { color: #b9c7d1; font-size: 16px; }
.dosing-review { min-width: 620px; margin-top: 18px; padding: 18px; border: 1px solid #f5d998; border-radius: 15px; background: #fffaf0; }
.dosing-review > header { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.dosing-review > header span { color: #9a5b0a; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.dosing-review > header h4 { margin-top: 3px; color: var(--text); font-size: 16px; }
.dosing-review > header > strong { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: #f59e0b; color: #fff; }
.dosing-review > p { max-width: 720px; margin-top: 8px; color: #7b6845; font-size: 12px; line-height: 1.55; }
.dosing-review-list { display: grid; gap: 7px; margin: 14px 0; }
.dosing-review-list article { display: grid; grid-template-columns: 38px minmax(0,1fr) auto; align-items: center; gap: 10px; padding: 10px 11px; border: 1px solid rgba(245,158,11,.18); border-radius: 11px; background: rgba(255,255,255,.72); }
.review-symbol { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; background: var(--amber-bg); color: #9a5b0a; font-size: 11px; font-weight: 900; }
.review-symbol.critical { background: var(--coral-bg); color: #b53a2e; }
.dosing-review-list article div strong,.dosing-review-list article div small { display: block; }
.dosing-review-list article div strong { color: var(--text); font-size: 12px; }
.dosing-review-list article div small { margin-top: 2px; color: var(--text-muted); font-size: 10px; }
.dosing-review-list article > em { padding: 5px 8px; border-radius: 999px; background: #fff1c7; color: #8d5708; font-size: 9px; font-style: normal; font-weight: 850; }
.dosing-products { margin-top: 16px; }
.review-products { grid-column: 1 / -1; width: 100%; }

@media (max-width: 980px) {
  .tools-hero { grid-template-columns: 1fr; }
  .hero-readout { max-width: 520px; }
  .tool-layout { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .tools-hero { padding: 24px; border-radius: 22px; }
  .tools-hero h1 { font-size: 34px; }
  .hero-actions { flex-direction: column; }
  .hero-actions .btn { width: 100%; }
  .hero-readout { grid-template-columns: 90px 1fr; }
  .readout-ring { width: 90px; height: 90px; }
  .readout-ring strong { font-size: 28px; }
  .tool-tabs { grid-template-columns: 1fr 1fr; }
  .tool-tab { min-height: 68px; font-size: 12px; }
  .chart-wrap { height: 280px; }
  .recipe-row { grid-template-columns: 1fr 1fr; gap: 8px; }
  .recipe-row.head { display: none; }
  .dose-adjustments { grid-template-columns: 1fr; }
  .dosing-card { padding: 18px; }
}
@media (max-width: 430px) {
  .tools-hero { padding: 22px 20px; }
  .tools-hero h1 { font-size: 31px; }
  .hero-readout { grid-template-columns: 1fr; }
  .tool-tabs { grid-template-columns: 1fr; }
  .tool-tab { min-height: 62px; }
  .chart-card { padding: 18px; }
  .index-strip { align-items: stretch; }
  .index-arrow { width: 20px; }
}
</style>
