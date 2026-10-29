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
      <!-- Kopf: Werkzeug und Aquarium – das Aquarium gilt für alle vier Werkzeuge -->
      <section class="tools-hero">
        <!-- Hintergrund: Foto des gewählten Aquariums, beim Wechsel weich überblendet -->
        <Transition name="hero-bg">
          <div :key="heroBackground" class="hero-bg" :style="{ backgroundImage: heroBackground }" aria-hidden="true"></div>
        </Transition>
        <div class="hero-copy">
          <span class="hero-kicker">Tools · {{ activeToolMeta.label }}</span>
          <h1>{{ activeToolMeta.title }}</h1>
          <p>{{ activeToolMeta.intro }}</p>
        </div>
        <div class="hero-tank">
          <label for="tools-tank">Aquarium</label>
          <select id="tools-tank" v-model="selectedProfileId">
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <dl>
            <div><dt>Nettovolumen</dt><dd>{{ netLitres ? `${formatNumber(netLitres, 0)} l` : '–' }}</dd></div>
            <div><dt>Berichte</dt><dd>{{ selectedProfileAnalyses.length }}</dd></div>
            <div><dt>Letzter Bericht</dt><dd>{{ latestAnalysis ? formatDate(analysisDate(latestAnalysis)) : '–' }}</dd></div>
          </dl>
        </div>
      </section>

      <nav class="tool-tabs" role="tablist" aria-label="Werkzeuge">
        <button
          v-for="tool in tools"
          :id="`tool-tab-${tool.key}`"
          :key="tool.key"
          type="button"
          role="tab"
          :aria-selected="activeTool === tool.key"
          :aria-controls="`tool-panel-${tool.key}`"
          :class="{ active: activeTool === tool.key }"
          @click="activeTool = tool.key"
        >
          <svg v-if="tool.key === 'waterchange'" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.7l5.7 7.6a7 7 0 1 1-11.4 0z"/><path d="M9 14.5a3 3 0 0 0 3 3"/></svg>
          <svg v-else-if="tool.key === 'consumption'" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18a9 9 0 1 1 14 0"/><path d="M12 13l3.5-3.5"/></svg>
          <svg v-else-if="tool.key === 'trends'" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l5-5 4 3 8-8"/><path d="M16 7h5v5"/></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
          {{ tool.label }}
        </button>
      </nav>

      <!-- ============ WASSERWECHSEL-SIMULATOR ============ -->
      <section v-if="activeTool === 'waterchange'" id="tool-panel-waterchange" class="sim" role="tabpanel" aria-labelledby="tool-tab-waterchange">
        <aside class="panel sim-setup">
          <header class="panel-head">
            <span class="panel-kicker">Einstellungen</span>
            <h2>So wird gewechselt</h2>
          </header>

          <div class="setup-step">
            <span class="step-no">1</span>
            <div class="step-body">
              <label for="sim-report">Ausgangswerte</label>
              <select id="sim-report" v-model="simReportId" :disabled="!selectedProfileAnalyses.length">
                <option v-if="!selectedProfileAnalyses.length" value="">Kein abgeschlossener Bericht</option>
                <option v-for="analysis in analysisOptions" :key="analysis.id" :value="analysis.id">{{ analysisOptionLabel(analysis) }}</option>
              </select>
              <small>Messwerte und Idealwerte des Labors aus diesem Bericht.</small>
            </div>
          </div>

          <div class="setup-step">
            <span class="step-no">2</span>
            <div class="step-body">
              <label for="sim-osmosis">Osmosewasser</label>
              <select id="sim-osmosis" v-model="osmosisProfileId">
                <option value="">Ohne Restwerte (alles n. n.)</option>
                <option v-for="profile in osmosisProfiles" :key="profile.id" :value="profile.id">{{ profile.name }}</option>
              </select>
              <small>{{ osmosisHint }}</small>
            </div>
          </div>

          <div class="setup-step">
            <span class="step-no">3</span>
            <div class="step-body">
              <span class="step-label" id="sim-salt-label">Salz</span>
              <div class="salt-options" role="radiogroup" aria-labelledby="sim-salt-label">
                <button
                  v-for="salt in saltSources"
                  :key="salt.key"
                  type="button"
                  role="radio"
                  :aria-checked="saltKey === salt.key"
                  :class="['salt-option', { on: saltKey === salt.key, off: salt.disabled }]"
                  :disabled="salt.disabled"
                  @click="saltKey = salt.key"
                >
                  <strong>{{ salt.name }}</strong>
                  <small>{{ salt.disabled ? salt.disabledReason : salt.caption }}</small>
                </button>
              </div>
              <select v-if="saltKey === 'analysis'" v-model="saltAnalysisId" aria-label="Salzanalyse wählen">
                <option value="">Salzanalyse wählen</option>
                <option v-for="analysis in saltAnalyses" :key="analysis.id" :value="analysis.id">{{ analysisOptionLabel(analysis) }}</option>
              </select>
            </div>
          </div>

          <div class="setup-step">
            <span class="step-no">4</span>
            <div class="step-body">
              <label for="sim-litres">Wasser je Wechsel</label>
              <div class="litres-input">
                <input id="sim-litres" v-model.number="changeLitres" type="number" min="1" :max="netLitres || 1" step="1" @change="normalizeLitres" />
                <span>l</span>
                <b>{{ formatNumber(simPercent, 1) }} %</b>
              </div>
              <input v-model.number="changeLitres" class="litres-range" type="range" min="1" :max="Math.max(1, Math.round(netLitres * 0.6))" step="1" aria-label="Wasser je Wechsel in Litern" />
              <small v-if="profileMaxLitres">Höchstmenge laut Profil: <b>{{ formatNumber(profileMaxLitres, 0) }} l</b> · <button type="button" class="link" @click="changeLitres = profileMaxLitres">übernehmen</button></small>
              <small v-else>Im Profil ist keine Höchstmenge hinterlegt. <RouterLink :to="`/aquariums/${selectedProfileId}`">Im Aquarium ergänzen</RouterLink></small>
            </div>
          </div>

          <div class="setup-step">
            <span class="step-no">5</span>
            <div class="step-body">
              <span class="step-label" id="sim-count-label">Anzahl Wechsel</span>
              <div class="count-chips" role="radiogroup" aria-labelledby="sim-count-label">
                <button v-for="n in MAX_WATER_CHANGES" :key="n" type="button" role="radio" :aria-checked="changeCount === n" :class="{ on: changeCount === n }" @click="changeCount = n">{{ n }}</button>
              </div>
            </div>
          </div>

          <p class="setup-total"><b>{{ changeCount }} × {{ formatNumber(changeLitres, 0) }} l</b> = {{ formatNumber(changeCount * changeLitres, 0) }} l Neuwasser</p>
        </aside>

        <!-- Telefon: solange das Ergebnis außer Sicht ist, zeigt eine Leiste über der Navigation die Wirkung der Einstellungen -->
        <Transition name="sim-peek">
          <button v-if="simulationReady && !resultsInView" type="button" class="sim-peek" @click="scrollToResults">
            <span>Nach {{ changeCount }}×</span>
            <strong>{{ formatNumber(simulation.deviationAfter, 0) }} Pkt.</strong>
            <em :class="simulation.improvement >= 0 ? 'up' : 'down'">{{ simulation.improvement >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(simulation.improvement), 0) }}</em>
            <b>Ergebnis <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></b>
          </button>
        </Transition>
        <div v-if="simulationReady" ref="simResults" class="sim-results">
          <div class="panel sim-score">
            <div class="score-tile">
              <span>Abweichung jetzt</span>
              <strong>{{ formatNumber(simulation.deviationBefore, 1) }}</strong>
              <small>Punkte · Summe über {{ simulation.rows.length }} Elemente</small>
            </div>
            <svg class="score-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
            <div class="score-tile">
              <span>Nach {{ changeCount }} {{ changeCount === 1 ? 'Wechsel' : 'Wechseln' }}</span>
              <strong>{{ formatNumber(simulation.deviationAfter, 1) }}</strong>
              <small>Punkte · Ø {{ formatNumber(simulation.meanAfter, 1) }} % vom Ideal</small>
            </div>
            <div :class="['score-tile', 'gain', simulation.improvement >= 0 ? 'up' : 'down']">
              <span>{{ simulation.improvement >= 0 ? 'Verbessert' : 'Verschlechtert' }}</span>
              <strong>{{ simulation.improvement >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(simulation.improvement), 1) }}</strong>
              <small>Punkte · {{ improvementShare }} % weniger Abweichung</small>
            </div>
          </div>

          <div class="panel sim-curve">
            <header class="panel-head row">
              <div>
                <span class="panel-kicker">Kosten und Nutzen</span>
                <h3>Wirkung je Wechsel</h3>
              </div>
              <p class="curve-hint" v-html="curveHint"></p>
            </header>
            <div class="curve" role="img" :aria-label="`Abweichung nach 0 bis ${MAX_WATER_CHANGES} Wechseln`">
              <button
                v-for="point in curve"
                :key="point.count"
                type="button"
                :class="['curve-bar', { on: point.count === changeCount, now: point.count === 0, sensible: point.count === sensible }]"
                :disabled="point.count === 0"
                :title="`${point.count ? `${point.count} Wechsel` : 'Jetzt'}: ${formatNumber(point.deviation, 1)} Punkte Abweichung`"
                @click="changeCount = point.count"
              >
                <em>{{ formatNumber(point.deviation, 0) }}</em>
                <i :style="{ height: `${curveMax ? Math.max(3, (point.deviation / curveMax) * 100) : 0}%` }"></i>
                <span>{{ point.count || 'jetzt' }}</span>
              </button>
            </div>
          </div>

          <div class="panel sim-table">
            <header class="panel-head row">
              <div>
                <span class="panel-kicker">Ergebnis</span>
                <h3>Voraussichtliche Werte nach {{ changeCount }} {{ changeCount === 1 ? 'Wechsel' : 'Wechseln' }}</h3>
              </div>
              <span class="legend"><i class="good"></i>±{{ BALANCE_BAND }} % <i class="watch"></i>±{{ BALANCE_BAND * 2 }} % <i class="critical"></i>darüber</span>
            </header>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr><th scope="col">Element</th><th scope="col" class="num col-now">Jetzt</th><th scope="col" class="num col-new">Neuwasser</th><th scope="col" class="num">Nachher</th><th scope="col" class="num col-ideal">Ideal</th><th scope="col" class="dev-col">% vom Ideal · vorher → nachher</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in tableRows" :key="row.key" :class="row.tone">
                    <th scope="row"><span class="el"><i aria-hidden="true"></i><b>{{ row.label }}</b><small>{{ row.symbol }}</small></span></th>
                    <td class="num muted col-now">{{ formatValue(row.key, row.before) }}</td>
                    <td class="num muted col-new">{{ formatValue(row.key, row.newWater) }}</td>
                    <td class="num"><span class="pill">{{ formatValue(row.key, row.after) }}<small>{{ row.unit }}</small></span><small class="was">jetzt {{ formatValue(row.key, row.before) }}</small></td>
                    <td class="num muted col-ideal">{{ formatValue(row.key, row.ideal) }}</td>
                    <td class="dev-col">
                      <span class="dev-track" :aria-label="`${formatNumber(row.pctBefore, 0)} % → ${formatNumber(row.pctAfter, 0)} %`">
                        <span class="dev-band" :style="bandStyle"></span>
                        <span class="dev-mid"></span>
                        <span class="dev-move" :style="moveStyle(row)"></span>
                        <span class="dev-dot before" :style="{ left: `${devPos(row.pctBefore)}%` }"></span>
                        <span class="dev-dot after" :style="{ left: `${devPos(row.pctAfter)}%` }"></span>
                      </span>
                      <span class="dev-num">{{ formatNumber(row.pctBefore, 0) }} → <b>{{ formatNumber(row.pctAfter, 0) }} %</b></span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="skippedLabels.length" class="sim-skipped">Nicht berechnet, weil der Bericht oder das Salz keinen Wert enthält: {{ skippedLabels.join(', ') }}.</p>
          </div>

          <p class="disclaimer">Neuwasser = Osmosewasser + Salz. Jeder Wechsel tauscht {{ formatNumber(simPercent, 1) }} % des Nettovolumens; der nächste rechnet mit dem Ergebnis des vorigen. Abweichung = Abstand zu 100 % vom Ideal; Nitrat unter seinem Idealwert zählt als ideal. Das Ergebnis hängt davon ab, wie sich die Werte seit der Probenentnahme verändert haben – keine Gewähr für die Richtigkeit.</p>
        </div>

        <EmptyState v-else kicker="Simulation nicht verfügbar" title="Es fehlen Ausgangswerte" :message="simulationUnavailable" mark="H₂O" tone="compact">
          <template #actions>
            <RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
          </template>
        </EmptyState>
      </section>

      <!-- ============ VERBRAUCH / REZEPTFINDER ============ -->
      <section v-else-if="activeTool === 'consumption'" id="tool-panel-consumption" class="tool-layout" role="tabpanel" aria-labelledby="tool-tab-consumption">
        <aside class="panel tool-panel">
          <header class="panel-head">
            <span class="panel-kicker">Verbrauch &amp; Rezept</span>
            <h2>Zwei Berichte vergleichen</h2>
          </header>
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
            <span class="step-label" id="recipe-dosing-label">Wurde zwischen den Analysen dosiert?</span>
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

          <div v-if="canCalculateRecipe" :class="['note', intervalDays > 120 ? 'warn' : '']">
            <b>{{ intervalDays }} Tage</b> zwischen den Analysen. {{ intervalDays > 120 ? 'Für Spurenelemente ist das Intervall zu lang.' : 'Das Intervall ist für die Berechnung gut nutzbar.' }}
          </div>
        </aside>

        <div v-if="canCalculateRecipe" class="panel chart-card">
          <header class="panel-head row">
            <div><span class="panel-kicker">Ergebnis</span><h3>Empfohlene Dosierung</h3></div>
            <span class="reliability">Verlässlichkeit <b>{{ consumptionReliability }} %</b></span>
          </header>
          <div class="recipe">
            <div class="recipe-row head"><span>Element</span><span>Verbrauch / Tag</span><span>Empf. Zugabe</span><span>ATI Produkt</span></div>
            <div v-for="row in recipeRows" :key="row.name" class="recipe-row" :class="{ flagged: row.zero }">
              <div><strong>{{ row.name }}</strong><span v-if="row.zero" class="r-flag">Wert nahe 0 – ungenau</span></div>
              <div class="r-val">{{ row.consumption }}</div>
              <div class="r-dose">{{ row.dose }}<small>{{ row.weekly }}</small></div>
              <div class="r-prod">{{ row.product }}</div>
            </div>
          </div>
          <p class="disclaimer">Die Stabilisierungsmenge entspricht dem ermittelten Verbrauch. Wird ein Element bereits regelmäßig dosiert, ist die bisherige Dosis um den angezeigten Wert zu erhöhen. Keine Gewähr für die Richtigkeit.</p>
        </div>
        <EmptyState v-else kicker="Mindestens zwei Berichte" title="Verbrauch noch nicht berechenbar" message="Wählen Sie ein Aquarium mit mindestens zwei abgeschlossenen Analysen und zwei unterschiedliche Berichte." mark="RCP" tone="compact">
          <template #actions><RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink></template>
        </EmptyState>
      </section>

      <!-- ============ TRENDS ============ -->
      <section v-else-if="activeTool === 'trends'" id="tool-panel-trends" class="tool-layout" role="tabpanel" aria-labelledby="tool-tab-trends">
        <aside class="panel tool-panel">
          <header class="panel-head">
            <span class="panel-kicker">Verlauf</span>
            <h2>Was soll gezeigt werden?</h2>
          </header>
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
          <RouterLink to="/chronik" class="btn btn-primary btn-block">In der Chronik vergleichen</RouterLink>
        </aside>

        <div v-if="trendSeries.length" class="panel chart-card">
          <header class="panel-head row">
            <div><span class="panel-kicker">{{ trendGroup }}</span><h3>{{ activeTrendParameter.parameterLabel }} im Verlauf</h3></div>
            <span class="reliability">{{ trendRange === '0' ? 'alle Berichte' : `${trendRange} Monate` }}</span>
          </header>
          <div class="chart-wrap" role="img" :aria-label="`${activeTrendParameter.parameterLabel} im zeitlichen Verlauf`">
            <Line :data="trendChartData" :options="lineOptions" />
          </div>
        </div>
        <EmptyState v-else kicker="Keine Trenddaten" title="Für diesen Zeitraum fehlen Werte" message="Wählen Sie einen längeren Zeitraum, eine andere Parametergruppe oder registrieren Sie eine weitere Analyse." mark="TRD" tone="compact">
          <template #actions><RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink></template>
        </EmptyState>
      </section>

      <!-- ============ MÖGLICHE QUELLEN ============ -->
      <section v-else id="tool-panel-sources" class="tool-layout" role="tabpanel" aria-labelledby="tool-tab-sources">
        <aside class="panel tool-panel">
          <header class="panel-head">
            <span class="panel-kicker">Ursachensuche</span>
            <h2>Woher kommt es?</h2>
          </header>
          <div class="form-group">
            <label for="sources-analysis">Laboranalyse</label>
            <select id="sources-analysis" v-model="sourceAnalysisId">
              <option value="">Alle Quellen anzeigen</option>
              <option v-for="analysis in analysisOptions" :key="analysis.id" :value="analysis.id">{{ analysisOptionLabel(analysis) }}</option>
            </select>
            <small class="field-hint">{{ sourceFilterHint }}</small>
          </div>
          <div v-if="sourceSuspects.length" class="source-suspects">
            <span>Erhöhte Werte</span>
            <div><b v-for="element in sourceSuspects" :key="element.key">{{ element.label }}</b></div>
          </div>
          <div class="tool-summary">
            <div><strong>{{ visibleSources.length }}</strong><span>{{ sourceAnalysisId ? 'passende Quellen' : 'angezeigt' }}</span></div>
            <div><strong>{{ POLLUTANT_SOURCES.length }}</strong><span>insgesamt bekannt</span></div>
          </div>
        </aside>

        <div class="panel source-card">
          <header class="panel-head">
            <span class="panel-kicker">{{ sourceAnalysisId ? 'Gefiltert nach den erhöhten Werten' : 'Ohne Analysefilter' }}</span>
            <h3>{{ sourceAnalysisId ? 'Passende Eintragswege' : 'Alle bekannten Eintragswege' }}</h3>
          </header>
          <div v-if="visibleSources.length" class="source-list">
            <article v-for="source in visibleSources" :key="source.key" class="source-item">
              <header>
                <div><span>{{ source.category }}</span><h4>{{ source.name }}</h4></div>
                <div v-if="source.matches?.length" class="source-matches"><b v-for="key in source.matches" :key="key">{{ elementLabel(key) }}</b></div>
              </header>
              <p>{{ source.description }}</p>
              <button type="button" class="source-toggle" :aria-expanded="Boolean(openSources[source.key])" @click="openSources[source.key] = !openSources[source.key]">
                {{ openSources[source.key] ? 'Prüfpunkte ausblenden' : `${source.checks.length} Prüfpunkte anzeigen` }}
              </button>
              <ul :class="{ closed: !openSources[source.key] }"><li v-for="check in source.checks" :key="check">{{ check }}</li></ul>
            </article>
          </div>
          <EmptyState v-else kicker="Keine Treffer" title="Keine passende Quelle" message="In dieser Analyse liegt kein unerwünschtes Element über seinem Zielbereich. Wählen Sie „Alle Quellen anzeigen“, um die vollständige Liste zu sehen." mark="QUE" tone="compact" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
import { POLLUTANT_SOURCES, sourcesForElements, suspectElements } from '@/services/pollutantSources'
import { evaluateAnalysis } from '@/services/directRecommendations'
import { findScale, loadActiveScaleId, loadEvaluationScales } from '@/services/evaluationScales'
import { ELEMENT_DEFINITION_MAP } from '@/services/analysisCatalog'
import { BALANCE_BAND, compositionTone } from '@/services/waterBalance'
import { analysisApi, profileApi } from '@/services/toolsData'
import { buildAnalysisSeries, calculateConsumption, parameterFromAnalysis } from '@/services/toolsCalculations'
import {
  ABSOLUTE_OCEAN, DEFAULT_IDEALS, MAX_WATER_CHANGES, SIMULATION_KEYS, changePercent, deviationCurve, sensibleCount,
  simulateWaterChange, valuesFromParameters,
} from '@/services/waterChangeSimulator'
import '@/assets/styles/report-base.css'
import EmptyState from '@/components/ui/EmptyState.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const tools = [
  { key: 'waterchange', label: 'Wasserwechsel', title: 'Wasserwechsel simulieren', intro: 'Wie sich Ihre Werte nach einem oder mehreren Wechseln verändern – berechnet aus dem Laborbericht, Ihrem Osmosewasser und dem Salz.' },
  { key: 'consumption', label: 'Rezeptfinder', title: 'Verbrauch bestimmen', intro: 'Aus zwei Berichten den täglichen Verbrauch je Element ermitteln und die nötige Dosis zur Stabilisierung berechnen.' },
  { key: 'trends', label: 'Verläufe', title: 'Werte im Verlauf', intro: 'Die Entwicklung einer Parametergruppe über alle Berichte dieses Aquariums.' },
  { key: 'sources', label: 'Mögliche Quellen', title: 'Eintragswege finden', intro: 'Bekannte Quellen für unerwünschte Elemente – gefiltert auf die Werte, die im Bericht erhöht sind.' },
]

const activeTool = ref('waterchange')
const activeToolMeta = computed(() => tools.find((tool) => tool.key === activeTool.value) || tools[0])
const profiles = ref([])
const osmosisProfiles = ref([])
const allAnalyses = ref([])
const loading = ref(true)
const selectedProfileId = ref('')
const route = useRoute()
// Die Suche in der Kopfleiste öffnet ein Werkzeug über ?tool=… – auch wenn Tools schon offen ist.
watch(() => route.query.tool, (tool) => { if (tools.some((item) => item.key === tool)) activeTool.value = tool })

const selectedProfile = computed(() => profiles.value.find((profile) => String(profile.id) === String(selectedProfileId.value)) || profiles.value[0])
const selectedProfileAnalyses = computed(() => allAnalyses.value.filter((analysis) => String(analysis.profile_id) === String(selectedProfileId.value)))
const latestAnalysis = computed(() => selectedProfileAnalyses.value.at(-1) || null)
const analysisOptions = computed(() => [...selectedProfileAnalyses.value].reverse())
// Eigenes Foto des Beckens; ohne Foto das Themenbild mit der Tönung wie auf den Karten der Übersicht,
// damit sich auch Becken ohne eigenes Foto im Kopf unterscheiden.
const THEME_BACKGROUNDS = {
  'reef-mixed': ['/tanks/reef-mixed.png', 'rgba(0,114,206,0.18)'],
  'reef-sps': ['/tanks/reef-mixed.png', 'rgba(76,29,149,0.42)'],
  'reef-nano': ['/tanks/reef-mixed.png', 'rgba(13,148,136,0.5)'],
  freshwater: ['/tanks/freshwater.png', 'rgba(21,128,61,0.3)'],
  osmosis: ['/tanks/osmosis.png', 'rgba(8,145,178,0.35)'],
}
const heroBackground = computed(() => {
  const profile = selectedProfile.value
  if (profile?.image) return `url(${JSON.stringify(profile.image)})`
  const [image, tint] = THEME_BACKGROUNDS[profile?.image_theme] || THEME_BACKGROUNDS['reef-mixed']
  return `linear-gradient(${tint}, ${tint}), url(${JSON.stringify(image)})`
})
const netLitres = computed(() => Number(selectedProfile.value?.net_volume) || 0)

/* ---------- Wasserwechsel-Simulator ---------- */
const simReportId = ref('')
const osmosisProfileId = ref('')
const saltKey = ref('absolute-ocean')
const saltAnalysisId = ref('')
const changeLitres = ref(0)
const changeCount = ref(2)

const simReport = computed(() => selectedProfileAnalyses.value.find((analysis) => analysis.id === simReportId.value) || latestAnalysis.value)
const reportValues = computed(() => valuesFromParameters(simReport.value?.parameters || []))

// Osmose-Restwerte: die jüngste Osmoseprobe, die mit diesem Osmosewasser-Profil eingeschickt wurde.
const osmosisSample = computed(() => {
  if (!osmosisProfileId.value) return null
  return [...allAnalyses.value].reverse().find((analysis) => (
    String(analysis.osmoseAquariumId) === String(osmosisProfileId.value) && analysis.osmosisParameters?.length
  )) || null
})
const osmosisValues = computed(() => valuesFromParameters(osmosisSample.value?.osmosisParameters || []).values)
const osmosisHint = computed(() => {
  if (!osmosisProfileId.value) return 'Osmosewasser ohne nachweisbare Elemente.'
  if (!osmosisSample.value) return 'Zu diesem Osmosewasser gibt es noch keine Probe – Restwerte werden mit 0 angesetzt.'
  const found = Object.values(osmosisValues.value).filter((value) => value > 0).length
  return `Probe aus Bericht ${osmosisSample.value.reportNumber || ''} · ${found ? `${found} der ${SIMULATION_KEYS.length} Elemente nachweisbar` : 'alle Elemente n. n.'}.`
})

const saltAnalyses = computed(() => allAnalyses.value.filter((analysis) => analysis.waterType === 'Meersalz'))
const saltSources = computed(() => [
  { key: 'absolute-ocean', name: 'Absolute Ocean', caption: 'ATI Referenzwerte bei 35 PSU', values: ABSOLUTE_OCEAN },
  { key: 'analysis', name: 'Salzanalyse', caption: 'Aus einem Meersalz-Bericht', disabled: !saltAnalyses.value.length, disabledReason: 'Keine Salzanalyse vorhanden' },
  { key: 'nyos', name: 'Nyos pure', disabled: true, disabledReason: 'Chargenwerte folgen' },
  { key: 'balancer', name: 'Balancer', disabled: true, disabledReason: 'Bald verfügbar' },
])
const saltValues = computed(() => {
  if (saltKey.value === 'analysis') {
    const analysis = saltAnalyses.value.find((item) => item.id === saltAnalysisId.value)
    return analysis ? valuesFromParameters(analysis.parameters).values : null
  }
  return saltSources.value.find((salt) => salt.key === saltKey.value)?.values || null
})

const profileMaxLitres = computed(() => Number(selectedProfile.value?.water_details?.max_water_change_l) || 0)
const simPercent = computed(() => changePercent(changeLitres.value, netLitres.value))
function defaultLitres() {
  return profileMaxLitres.value || Math.max(1, Math.round(netLitres.value * 0.2))
}
function normalizeLitres() {
  const value = Math.round(Number(changeLitres.value) || 0)
  changeLitres.value = Math.min(Math.max(1, value), Math.max(1, netLitres.value))
}

const simInput = computed(() => ({
  aquarium: reportValues.value.values,
  osmosis: osmosisValues.value,
  salt: saltValues.value || {},
  ideal: { ...DEFAULT_IDEALS, ...reportValues.value.ideals },
  percent: simPercent.value,
}))
const simulation = computed(() => simulateWaterChange({ ...simInput.value, count: changeCount.value }))
const curve = computed(() => deviationCurve(simInput.value))
const curveMax = computed(() => Math.max(...curve.value.map((point) => point.deviation), 0))
const sensible = computed(() => sensibleCount(curve.value, 5))
const curveHint = computed(() => {
  const gain = (n) => curve.value[n - 1].deviation - curve.value[n].deviation
  if (sensible.value < changeCount.value) {
    return `Schon <b>${sensible.value} Wechsel</b> ${sensible.value === 1 ? 'bringt' : 'bringen'} fast alles – jeder weitere verbessert um weniger als 5 Punkte.`
  }
  if (sensible.value > changeCount.value) {
    return `Ein ${changeCount.value + 1}. Wechsel brächte noch <b>${formatNumber(gain(changeCount.value + 1), 1)} Punkte</b>.`
  }
  return `<b>${changeCount.value} Wechsel</b> ${changeCount.value === 1 ? 'ist' : 'sind'} ein gutes Verhältnis aus Wasser und Wirkung.`
})
const improvementShare = computed(() => (simulation.value.deviationBefore
  ? formatNumber((simulation.value.improvement / simulation.value.deviationBefore) * 100, 0)
  : '0'))

const simulationReady = computed(() => (
  selectedProfile.value?.water_type === 'Meerwasser' && Boolean(simReport.value) && Boolean(saltValues.value)
  && netLitres.value > 0 && simulation.value.rows.length > 0
))
const simulationUnavailable = computed(() => {
  if (selectedProfile.value?.water_type !== 'Meerwasser') return 'Der Wasserwechsel-Simulator rechnet mit Meerwasseraquarien. Wählen Sie oben ein Meerwasserbecken.'
  if (!netLitres.value) return 'Für dieses Aquarium ist kein Nettovolumen hinterlegt. Ergänzen Sie es im Aquarium-Profil.'
  if (!simReport.value) return 'Für dieses Aquarium liegt noch kein abgeschlossener Laborbericht vor.'
  if (!saltValues.value) return 'Bitte eine Salzquelle mit Werten auswählen.'
  return 'Der Bericht enthält keines der 14 Elemente, die der Simulator braucht.'
})

const tableRows = computed(() => simulation.value.rows.map((row) => ({
  ...row,
  label: ELEMENT_DEFINITION_MAP[row.key]?.label || row.key,
  symbol: ELEMENT_DEFINITION_MAP[row.key]?.symbol || '',
  tone: compositionTone(row.pctAfter),
})))
const skippedLabels = computed(() => simulation.value.skipped.map((key) => ELEMENT_DEFINITION_MAP[key]?.label || key))

// Die Spur zeigt 50–150 % vom Ideal; das grüne Band ist ±15 % wie in den Diagrammen des Berichts.
const devPos = (pct) => Math.min(100, Math.max(0, pct - 50))
const bandStyle = { left: `${devPos(100 - BALANCE_BAND)}%`, width: `${BALANCE_BAND * 2}%` }
function moveStyle(row) {
  const from = devPos(row.pctBefore)
  const to = devPos(row.pctAfter)
  return { left: `${Math.min(from, to)}%`, width: `${Math.abs(to - from)}%` }
}

function formatValue(key, value) {
  const precision = Number(ELEMENT_DEFINITION_MAP[key]?.precision ?? 2)
  const digits = Math.abs(value) >= 1000 ? 0 : Math.abs(value) >= 100 ? Math.min(1, precision) : precision
  return formatNumber(value, digits)
}

/* ---------- Rezeptfinder ---------- */
const rangeStart = ref('')
const rangeEnd = ref('')
const dosingMode = ref('none')
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
  { key: 'calcium', product: 'ATI Essentials' },
  { key: 'magnesium', product: 'ATI Magnesium' },
  { key: 'kh', product: 'ATI Essentials' },
  { key: 'iodine', product: 'ATI ICP Elements Jod' },
  { key: 'iron', product: 'ATI Daily Traces' },
]
function smartRound(n) {
  const abs = Math.abs(n)
  const digits = abs >= 10 ? 0 : abs >= 1 ? 1 : abs >= 0.1 ? 2 : 3
  const text = new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(abs)
  return n < 0 ? `−${text}` : text
}
const recipeInputs = computed(() => recipeParameters.map((config) => {
  const older = parameterFromAnalysis(olderAnalysis.value, config.key)
  const newer = parameterFromAnalysis(newerAnalysis.value, config.key)
  if (!older || !newer) return null
  return { ...config, label: newer.label, unit: newer.unit, older, newer }
}).filter(Boolean))
const canCalculateRecipe = computed(() => intervalDays.value > 0 && rangeStart.value !== rangeEnd.value && recipeInputs.value.length > 0)
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
    const additional = result.recommendedAdditionalPerDay
    return {
      name: item.label,
      consumption: `${smartRound(result.consumptionPerDay)} ${item.unit}`,
      dose: additional > 0 ? `${dosingMode.value === 'regular' ? '+' : ''}${smartRound(additional)} ${item.unit}/Tag` : 'Keine Zugabe',
      weekly: additional > 0 ? `${smartRound(additional * 7)} ${item.unit}/Woche` : 'Wert beobachten',
      product: item.product,
      zero: Number(item.newer.value) <= zeroLimit,
    }
  })
  : [])
const consumptionReliability = computed(() => {
  if (!canCalculateRecipe.value) return 0
  let base = Math.max(34, Math.min(98, 108 - Math.round(intervalDays.value / 3)))
  if (recipeRows.value.some((row) => row.zero)) base = Math.max(30, base - 18)
  if (dosingMode.value === 'none') base = Math.min(99, base + 4)
  return base
})

/* ---------- Verläufe ---------- */
const trendGroup = ref('Mengenelemente')
const trendRange = ref('12')
const trendGroups = [
  { label: 'Basiswerte', key: 'kh', parameterLabel: 'Karbonathärte' },
  { label: 'Mengenelemente', key: 'calcium', parameterLabel: 'Calcium' },
  { label: 'Nährstoffe', key: 'nitrate', parameterLabel: 'Nitrat' },
  { label: 'Schadstoffe', key: 'copper', parameterLabel: 'Kupfer' },
]
const activeTrendParameter = computed(() => trendGroups.find((group) => group.label === trendGroup.value) || trendGroups[0])
const trendSeries = computed(() => buildAnalysisSeries(selectedProfileAnalyses.value, activeTrendParameter.value.key, { months: Number(trendRange.value) }))
const trendChartData = computed(() => ({
  labels: trendSeries.value.map((point) => formatDate(point.date)),
  datasets: [{
    label: activeTrendParameter.value.parameterLabel,
    data: trendSeries.value.map((point) => point.value),
    borderColor: '#0072CE',
    backgroundColor: 'rgba(0,114,206,0.08)',
    fill: true,
    tension: 0.35,
    pointRadius: 5,
    pointBackgroundColor: '#fff',
    pointBorderColor: '#0072CE',
  }],
}))
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: { x: { grid: { display: false } }, y: { grid: { color: '#edf1f5' } } },
}

/* ---------- Mögliche Quellen ---------- */
const sourceAnalysisId = ref('')
const evaluationScales = loadEvaluationScales()
const selectedSourceAnalysis = computed(() => selectedProfileAnalyses.value.find((analysis) => analysis.id === sourceAnalysisId.value) || null)
const sourceSuspects = computed(() => {
  const analysis = selectedSourceAnalysis.value
  if (!analysis) return []
  const scale = findScale(evaluationScales, selectedProfile.value?.evaluation_scale_id || loadActiveScaleId())
  const evaluated = evaluateAnalysis(analysis.parameters || [], scale)
  const keys = new Set(suspectElements(evaluated))
  return evaluated.filter((parameter) => keys.has(parameter.key))
})
const visibleSources = computed(() => (selectedSourceAnalysis.value ? sourcesForElements(sourceSuspects.value.map((parameter) => parameter.key)) : POLLUTANT_SOURCES))
const sourceFilterHint = computed(() => {
  if (!selectedSourceAnalysis.value) return 'Ohne Auswahl sehen Sie alle bekannten Eintragswege.'
  if (!sourceSuspects.value.length) return 'In dieser Analyse liegt kein unerwünschtes Element über seinem Zielbereich.'
  return `${sourceSuspects.value.length} erhöhte Werte · ${visibleSources.value.length} passende Quellen.`
})
function elementLabel(key) {
  return sourceSuspects.value.find((parameter) => parameter.key === key)?.label || key
}

/* ---------- Helfer ---------- */
function analysisDate(analysis) {
  return analysis.completed_at || analysis.completedAt || analysis.created_at || analysis.createdAt
}
function formatDate(value) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(value))
}
function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits }).format(Number(value) || 0)
}
function analysisOptionLabel(analysis) {
  const number = analysis.reportNumber || analysis.barcode || analysis.id
  return `${number} · ${formatDate(analysisDate(analysis))}`
}

function syncRecipeSelection() {
  const analyses = selectedProfileAnalyses.value
  if (analyses.length < 2) {
    rangeStart.value = analyses[0]?.id || ''
    rangeEnd.value = ''
    return
  }
  if (!analyses.some((analysis) => analysis.id === rangeStart.value)) rangeStart.value = analyses[0].id
  if (!analyses.some((analysis) => analysis.id === rangeEnd.value) || rangeEnd.value === rangeStart.value) rangeEnd.value = analyses.at(-1).id
}
// Ein anderes Aquarium: jüngster Bericht, verknüpftes Osmosewasser, Höchstmenge aus dem Profil.
function syncSimulation() {
  simReportId.value = latestAnalysis.value?.id || ''
  const linked = selectedProfile.value?.osmosis_source_id
  osmosisProfileId.value = osmosisProfiles.value.some((profile) => profile.id === linked) ? linked : ''
  changeLitres.value = defaultLitres()
}

watch(selectedProfileId, () => {
  syncRecipeSelection()
  syncSimulation()
  if (!selectedProfileAnalyses.value.some((analysis) => analysis.id === sourceAnalysisId.value)) sourceAnalysisId.value = ''
})

// Ergebnis-Leiste: sichtbar, solange kein Teil des Ergebnisses im Bild ist (nur am Telefon per CSS).
const simResults = ref(null)
const resultsInView = ref(true)
let resultsObserver = null
watch(simResults, (element) => {
  resultsObserver?.disconnect()
  if (!element || typeof IntersectionObserver === 'undefined') return
  resultsObserver = new IntersectionObserver(([entry]) => { resultsInView.value = entry.isIntersecting }, { rootMargin: '0px 0px -120px 0px' })
  resultsObserver.observe(element)
})
onBeforeUnmount(() => resultsObserver?.disconnect())
async function scrollToResults() {
  await nextTick()
  simResults.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const openSources = reactive({})

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
    // Ohne Vorgabe das erste Becken mit Bericht – dann zeigt der Simulator sofort etwas.
    const withReport = profiles.value.find((profile) => allAnalyses.value.some((analysis) => String(analysis.profile_id) === String(profile.id)))
    selectedProfileId.value = requestedProfile?.id || withReport?.id || profiles.value[0]?.id || ''
    syncRecipeSelection()
    syncSimulation()
    const requestedAnalysis = selectedProfileAnalyses.value.find((analysis) => String(analysis.id) === String(route.query.analysis))
    if (tools.some((tool) => tool.key === route.query.tool)) activeTool.value = route.query.tool
    if (requestedAnalysis) {
      sourceAnalysisId.value = requestedAnalysis.id
      simReportId.value = requestedAnalysis.id
    }
  } catch {
    profiles.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* ---------- Kopf ---------- */
.tools-hero { position: relative; isolation: isolate; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 340px); gap: 24px; align-items: center; margin-bottom: 16px; padding: clamp(24px, 4vw, 34px); border-radius: 24px; color: #fff; background: #0a1b43; box-shadow: var(--shadow); }
/* Foto unten, der blaue Verlauf darüber hält den Text lesbar – egal wie hell das Bild ist. */
.tools-hero::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(100deg, rgba(10,27,67,0.94) 0%, rgba(10,27,67,0.72) 42%, rgba(10,27,67,0.22) 100%); }
.hero-bg { position: absolute; inset: 0; z-index: -2; background-position: center 62%; background-size: cover; }
.hero-bg-enter-active, .hero-bg-leave-active { transition: opacity .6s ease; }
.hero-bg-enter-from, .hero-bg-leave-to { opacity: 0; }
.hero-kicker { display: block; color: var(--teal-200); font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
.tools-hero h1 { margin: 8px 0; color: #fff; font-size: clamp(30px, 4.2vw, 46px); line-height: 1; font-weight: 700; letter-spacing: -0.045em; }
.tools-hero p { max-width: 620px; margin: 0; color: rgba(255,255,255,0.78); font-size: 14px; line-height: 1.6; }
.hero-tank { display: grid; gap: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.18); border-radius: 18px; background: rgba(255,255,255,0.1); backdrop-filter: blur(14px); }
.hero-tank label { color: var(--teal-200); font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.hero-tank select { min-height: 42px; padding: 0 12px; border: 1px solid rgba(255,255,255,0.28); border-radius: 12px; background: rgba(255,255,255,0.96); color: var(--text); font-size: 14px; font-weight: 700; }
.hero-tank dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 4px 0 0; }
.hero-tank dl div { min-width: 0; }
.hero-tank dt { color: rgba(255,255,255,0.62); font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
.hero-tank dd { margin: 2px 0 0; color: #fff; font-size: 15px; font-weight: 800; white-space: nowrap; }

/* ---------- Reiter wie im Bericht ---------- */
.tool-tabs { display: flex; gap: 6px; width: fit-content; max-width: 100%; margin-bottom: 16px; padding: 5px; overflow-x: auto; border: 1px solid var(--border); border-radius: 15px; background: #fff; box-shadow: var(--shadow); }
.tool-tabs button { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px; border: 0; border-radius: 11px; background: transparent; color: var(--text-muted); font-weight: 800; white-space: nowrap; cursor: pointer; transition: background .15s, color .15s; }
.tool-tabs button:hover { color: var(--text); }
.tool-tabs button.active { background: var(--brand-blue); color: #fff; }
.tool-tabs svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- Karten ---------- */
.panel { position: relative; min-width: 0; padding: 22px; border: 1px solid rgba(136,193,233,0.22); border-radius: 24px; background: #fff; box-shadow: var(--shadow); }
.panel-head { margin-bottom: 16px; }
.panel-head.row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.panel-kicker { display: block; color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.panel-head h2, .panel-head h3 { margin-top: 4px; color: var(--text); font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.panel-head h3 { font-size: 18px; }
.disclaimer { margin: 2px 4px 0; color: var(--text-muted); font-size: 11.5px; line-height: 1.55; }
.field-hint { display: block; margin-top: 6px; color: var(--text-muted); font-size: 11.5px; line-height: 1.45; }
.step-label { display: block; margin-bottom: 6px; color: var(--text-muted); font-size: 12px; font-weight: 700; }
.note { margin-top: 6px; padding: 11px 13px; border-left: 3px solid var(--brand-blue); border-radius: 0 12px 12px 0; background: var(--teal-50); color: var(--text); font-size: 12.5px; line-height: 1.5; }
.note.warn { border-color: #f59e0b; background: #fff7e6; }
.reliability { padding: 6px 12px; border-radius: 999px; background: var(--teal-50); color: var(--teal-700); font-size: 12px; font-weight: 700; }
.reliability b { color: var(--brand-blue); }

/* ---------- Simulator ---------- */
.sim { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 16px; align-items: start; }
.sim-setup { position: sticky; top: calc(var(--topbar-height, 68px) + 16px); display: grid; gap: 4px; }
.setup-step { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid #edf1f5; }
.setup-step:first-of-type { border-top: 0; padding-top: 0; }
.step-no { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--teal-50); color: var(--brand-blue); font-size: 12px; font-weight: 800; }
.step-body { display: grid; gap: 7px; min-width: 0; }
.step-body > label { color: var(--text); font-size: 13px; font-weight: 700; }
.step-body > .step-label { margin: 0; color: var(--text); font-size: 13px; }
.step-body select, .litres-input input { width: 100%; min-height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--text); font-size: 14px; }
.step-body select:focus, .litres-input input:focus { border-color: var(--brand-blue); outline: 0; box-shadow: 0 0 0 3px rgba(0,114,206,0.12); }
.step-body small { color: var(--text-muted); font-size: 11.5px; line-height: 1.45; }
.step-body small a, .link { padding: 0; border: 0; background: none; color: var(--brand-blue); font: inherit; font-weight: 700; cursor: pointer; }
.salt-options { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.salt-option { display: grid; gap: 2px; padding: 9px 11px; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--text); text-align: left; cursor: pointer; transition: border-color .15s, background .15s, box-shadow .15s; }
.salt-option strong { font-size: 13px; }
.salt-option small { color: var(--text-muted); font-size: 10.5px; line-height: 1.3; }
.salt-option:hover:not(:disabled) { border-color: rgba(0,114,206,0.4); }
.salt-option.on { border-color: var(--brand-blue); background: var(--teal-50); box-shadow: 0 0 0 3px rgba(0,114,206,0.1); }
.salt-option.on strong { color: var(--brand-blue); }
.salt-option.off { opacity: 0.55; cursor: not-allowed; background: #f8fafc; }
.litres-input { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; }
.litres-input span { color: var(--text-muted); font-size: 13px; font-weight: 700; }
.litres-input b { padding: 7px 10px; border-radius: 10px; background: var(--teal-50); color: var(--brand-blue); font-size: 13px; font-variant-numeric: tabular-nums; }
.litres-range { width: 100%; accent-color: var(--brand-blue); }
.count-chips { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.count-chips button { min-height: 36px; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--text); font-size: 14px; font-weight: 800; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.count-chips button:hover { border-color: rgba(0,114,206,0.4); }
.count-chips button.on { border-color: var(--brand-blue); background: var(--brand-blue); color: #fff; box-shadow: 0 5px 14px rgba(0,114,206,0.22); }
.setup-total { margin: 8px 0 0; padding: 11px 13px; border-radius: 12px; background: #f6f9fc; color: var(--text-muted); font-size: 12.5px; }
.setup-total b { color: var(--text); }

.sim-results { display: grid; gap: 16px; min-width: 0; }
.sim-score { display: grid; grid-template-columns: 1fr auto 1fr 1fr; align-items: stretch; gap: 14px; }
.sim-score .score-arrow { align-self: center; }
.score-tile { min-width: 0; padding: 14px 16px; border: 1px solid var(--border); border-radius: 18px; background: #f8fbfe; }
.score-tile span { display: block; color: var(--text-muted); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.score-tile strong { display: block; margin-top: 4px; color: var(--text); font-size: 32px; font-weight: 800; line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.score-tile small { display: block; margin-top: 5px; color: var(--text-muted); font-size: 11.5px; }
.score-tile.gain.up { border-color: rgba(16,185,129,0.3); background: linear-gradient(135deg, #f1fbf6, #def6ea); }
.score-tile.gain.up strong { color: #0f8a5f; }
.score-tile.gain.down { border-color: rgba(232,93,79,0.3); background: #fff3f1; }
.score-tile.gain.down strong { color: #b53a2e; }
.score-arrow { width: 24px; height: 24px; fill: none; stroke: var(--brand-blue); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

.curve-hint { max-width: 360px; margin: 0; color: var(--text-muted); font-size: 12.5px; line-height: 1.5; }
.curve-hint :deep(b) { color: var(--text); }
.curve { display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 8px; height: 170px; }
.curve-bar { position: relative; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 5px; min-width: 0; padding: 0; border: 0; background: transparent; cursor: pointer; }
.curve-bar:disabled { cursor: default; }
.curve-bar i { display: block; width: 100%; max-width: 34px; border-radius: 7px 7px 3px 3px; background: #d7e6f4; transition: height .35s cubic-bezier(.22,.8,.3,1), background .15s; }
.curve-bar em { color: var(--text-muted); font-size: 10.5px; font-style: normal; font-weight: 700; font-variant-numeric: tabular-nums; }
.curve-bar span { color: var(--text-muted); font-size: 11px; font-weight: 800; }
.curve-bar.now i { background: #c4ccd6; }
.curve-bar.sensible i { background: linear-gradient(180deg, #8fd8b8, #3fbf88); }
.curve-bar:hover:not(:disabled) i { background: #a9cdee; }
.curve-bar.on i { background: linear-gradient(180deg, #2c8ee0, var(--brand-blue)); box-shadow: 0 6px 16px rgba(0,114,206,0.25); }
.curve-bar.on em, .curve-bar.on span { color: var(--brand-blue); }

.legend { display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 11.5px; }
.legend i { width: 9px; height: 9px; margin-left: 6px; border-radius: 50%; background: #10b981; }
.legend i.watch { background: #f59e0b; } .legend i.critical { background: #e85d4f; }
.table-scroll { overflow-x: auto; }
.sim-table table { width: 100%; min-width: 640px; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.sim-table thead th { padding: 0 10px 8px; color: var(--text-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-align: left; text-transform: uppercase; white-space: nowrap; }
.sim-table .num { text-align: right; }
.sim-table tbody tr { border-top: 1px solid #edf1f5; }
.sim-table tbody th, .sim-table td { padding: 8px 10px; vertical-align: middle; }
.sim-table tbody th { text-align: left; }
.el { display: flex; align-items: baseline; gap: 8px; white-space: nowrap; }
.el i { flex: none; align-self: center; width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
tr.watch .el i { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.16); }
tr.critical .el i { background: #e85d4f; box-shadow: 0 0 0 3px rgba(232,93,79,0.16); }
.el b { color: var(--text); font-size: 13.5px; font-weight: 700; }
.el small { color: var(--text-muted); font-size: 11px; font-weight: 600; }
.muted { color: var(--text-muted); font-size: 13px; }
.pill { display: inline-flex; align-items: baseline; gap: 4px; padding: 3px 9px; border-radius: 8px; background: linear-gradient(135deg, #f3fcf8, #e3f7ee); box-shadow: inset 0 0 0 1px rgba(16,185,129,0.16); color: #0f6b4c; font-size: 14px; font-weight: 700; white-space: nowrap; }
.pill small { font-size: 10.5px; font-weight: 600; opacity: 0.72; }
tr.watch .pill { background: linear-gradient(135deg, #fff8ea, #ffecc7); box-shadow: inset 0 0 0 1px rgba(245,158,11,0.32); color: #92400e; }
tr.critical .pill { background: linear-gradient(135deg, #fff1ef, #fdd8d3); box-shadow: inset 0 0 0 1px rgba(232,93,79,0.34); color: #a92e22; }
.dev-col { width: 34%; min-width: 220px; }
td.dev-col { display: flex; align-items: center; gap: 10px; }
.dev-track { position: relative; flex: 1; height: 10px; border-radius: 999px; background: #eef2f6; }
.dev-band { position: absolute; top: 0; bottom: 0; border-radius: 999px; background: rgba(16,185,129,0.2); }
.dev-mid { position: absolute; top: -3px; bottom: -3px; left: 50%; width: 1.5px; background: #9fb0c2; }
.dev-move { position: absolute; top: 4px; height: 2px; background: #9fb0c2; }
.dev-dot { position: absolute; top: 50%; width: 10px; height: 10px; border-radius: 50%; transform: translate(-50%, -50%); }
.dev-dot.before { border: 2px solid #9fb0c2; background: #fff; }
.dev-dot.after { background: var(--brand-blue); box-shadow: 0 0 0 2px #fff; }
tr.watch .dev-dot.after { background: #f59e0b; } tr.critical .dev-dot.after { background: #e85d4f; }
.dev-num { flex: none; min-width: 76px; color: var(--text-muted); font-size: 12px; text-align: right; white-space: nowrap; }
.dev-num b { color: var(--text); }
.sim-skipped { margin: 12px 0 0; color: var(--text-muted); font-size: 12px; }
.was { display: none; }

/* ---------- Andere Werkzeuge ---------- */
.tool-panel .form-group { margin-bottom: 14px; }
.tool-panel .form-group label { margin-bottom: 7px; color: var(--text); font-size: 13px; font-weight: 700; letter-spacing: 0; text-transform: none; }
.tool-panel .form-group label em { color: var(--text-muted); font-style: normal; font-weight: 600; }
.tool-panel .form-group select, .tool-panel .form-group input { min-height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
.tool-panel .form-grid { grid-template-columns: 1fr; gap: 0; }
.tool-panel .btn-block { margin-top: 4px; }
.tool-layout > .tool-panel { position: sticky; top: calc(var(--topbar-height, 68px) + 16px); }
.tool-layout { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 16px; align-items: start; }
.chart-card { min-width: 0; }
.chart-wrap { height: 320px; min-height: 260px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 12px; }
.dose-adjustments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.seg-toggle { display: flex; gap: 6px; }
.seg-toggle button { flex: 1; min-height: 38px; padding: 0 6px; border: 1px solid var(--border); border-radius: 11px; background: #fff; color: var(--text-muted); font-size: 12.5px; font-weight: 800; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.seg-toggle button.active { border-color: var(--brand-blue); background: var(--brand-blue); color: #fff; box-shadow: 0 5px 14px rgba(0,114,206,0.2); }
.tool-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.tool-summary div { padding: 12px 14px; border: 1px solid var(--border); border-radius: 16px; background: #f8fbfe; }
.tool-summary strong { display: block; color: var(--text); font-size: 24px; line-height: 1; letter-spacing: -0.03em; }
.tool-summary span { color: var(--text-muted); font-size: 12px; }

.recipe { display: grid; gap: 8px; margin-bottom: 4px; }
.recipe-row { display: grid; grid-template-columns: 1.3fr 1fr 1.1fr 1.2fr; gap: 12px; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: 14px; background: #fff; }
.recipe-row.head { padding: 0 14px 4px; border: 0; color: var(--text-muted); font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.recipe-row.flagged { border-color: #fde68a; background: #fffaf0; }
.recipe-row strong { display: block; font-size: 14px; }
.r-flag { display: block; margin-top: 2px; color: #9a5b0a; font-size: 10.5px; font-weight: 700; }
.r-val { color: var(--text); font-size: 13px; }
.r-dose { color: var(--brand-blue); font-size: 14px; font-weight: 800; }
.r-dose small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 10.5px; font-weight: 500; }
.r-prod { color: var(--text-muted); font-size: 12px; }

.source-suspects { display: grid; gap: 7px; margin-top: 14px; padding: 12px 13px; border-radius: 12px; background: #fff7f5; }
.source-suspects > span { color: #b53a2e; font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
.source-suspects > div { display: flex; flex-wrap: wrap; gap: 5px; }
.source-suspects b { padding: 4px 8px; border-radius: 7px; background: #fff; color: #b53a2e; font-size: 11px; }
.source-list { display: grid; gap: 10px; }
.source-item { padding: 15px 16px; border: 1px solid var(--border); border-left: 4px solid var(--brand-blue); border-radius: 15px; background: #fff; }
.source-item > header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 14px; }
.source-item header span { color: var(--teal-700); font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
.source-item h4 { margin-top: 3px; color: var(--text); font-size: 16px; }
.source-matches { display: flex; flex-wrap: wrap; gap: 5px; }
.source-matches b { padding: 4px 9px; border-radius: 999px; background: #fdecea; color: #b53a2e; font-size: 11px; }
.source-item > p { margin-top: 8px; color: var(--text-muted); font-size: 13px; line-height: 1.55; }
.source-item ul { display: grid; gap: 6px; margin-top: 11px; padding-left: 17px; }
.source-item li { color: var(--text); font-size: 12.5px; line-height: 1.5; }

@media (prefers-reduced-motion: reduce) {
  .hero-bg-enter-active, .hero-bg-leave-active { transition: none; }
  .curve-bar i { transition: none; }
}
@media (max-width: 1100px) {
  .sim-score { grid-template-columns: 1fr 1fr; }
  .score-arrow { display: none; }
  .score-tile.gain { grid-column: 1 / -1; }
}
.sim-peek { display: none; }
.source-toggle { display: none; }
@media (max-width: 980px) {
  .tools-hero, .sim, .tool-layout { grid-template-columns: 1fr; }
  .sim-setup, .tool-layout > .tool-panel { position: static; }
  .sim-results { scroll-margin-top: calc(var(--topbar-height, 120px) + 12px); }
}
/* Ergebnistabelle je nach verfügbarer Breite: bis 1500px ohne Neuwasser, bis 1200px auch ohne Ideal */
@media (max-width: 1500px) {
  .sim-table .col-new { display: none; }
}
@media (max-width: 1200px) {
  .sim-table table { min-width: 0; }
  .sim-table .col-ideal { display: none; }
}
/* Telefon – und Laptop bis 1280px, wo das Ergebnis neben den Einstellungen nur ~330px breit ist:
   Element, Wert nachher (jetzt darunter) und % vom Ideal, ohne Querscrollen */
@media (max-width: 640px), (min-width: 981px) and (max-width: 1280px) {
  .sim-table table { min-width: 0; }
  .sim-table .col-now, .sim-table .col-new, .sim-table .col-ideal, .dev-track { display: none; }
  .sim-table tbody th, .sim-table td { padding: 8px 6px; }
  .el small { display: none; }
  .was { display: block; margin-top: 2px; color: var(--text-muted); font-size: 10.5px; }
  .dev-col { width: auto; min-width: 0; }
  td.dev-col { display: table-cell; }
  .dev-num { min-width: 0; }
  .sim-table thead .dev-col { font-size: 0; }
  .sim-table thead .dev-col::after { content: '% vom Ideal'; font-size: 10px; }
}
@media (max-width: 640px) {
  .panel { padding: 18px; border-radius: 20px; }
  /* Kopf kompakt: Titel und Aquarium, die Erklärung steht im Werkzeug selbst */
  .tools-hero { gap: 14px; padding: 18px 16px; border-radius: 22px; }
  .tools-hero h1 { margin: 6px 0 0; font-size: 26px; }
  .tools-hero p { display: none; }
  .hero-tank { gap: 6px; padding: 12px; border-radius: 16px; }
  .hero-tank select { min-height: 44px; }
  .hero-tank dl { grid-template-columns: 1fr 1fr 1fr; margin: 2px 0 0; }
  .hero-tank dd { font-size: 14px; }
  /* Alle vier Werkzeuge auf einen Blick, groß genug zum Tippen */
  .tool-tabs { display: grid; grid-template-columns: 1fr 1fr; width: 100%; overflow: visible; }
  .tool-tabs button { justify-content: center; min-height: 44px; padding: 0 10px; font-size: 13.5px; }
  /* Jetzt und nachher nebeneinander, die Verbesserung darunter */
  .sim-score { grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }
  .sim-score .score-arrow { display: none; }
  .sim-score .score-tile.gain { grid-column: 1 / -1; }
  .score-tile { padding: 12px; border-radius: 14px; }
  .score-tile span { font-size: 10px; }
  .score-tile strong { font-size: 26px; }
  .score-tile small { font-size: 11px; }
  .sim-peek {
    position: fixed; z-index: 110; left: 16px; right: 16px; bottom: calc(92px + env(safe-area-inset-bottom, 0px));
    display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 8px 10px 8px 14px;
    border: 1px solid rgba(0,114,206,0.18); border-radius: 16px; background: rgba(255,255,255,0.97);
    box-shadow: 0 12px 30px rgba(10,27,67,0.22); color: var(--text); font: inherit; text-align: left; cursor: pointer;
    backdrop-filter: blur(10px);
  }
  .sim-peek > * { white-space: nowrap; }
  .sim-peek span { min-width: 0; overflow: hidden; color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-overflow: ellipsis; }
  .sim-peek strong { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .sim-peek em { padding: 2px 7px; border-radius: 999px; font-size: 12px; font-style: normal; font-weight: 800; font-variant-numeric: tabular-nums; }
  .sim-peek em.up { background: #e3f6ee; color: #0f8a5f; }
  .sim-peek em.down { background: #fdecea; color: #b53a2e; }
  .sim-peek b { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 7px 10px; border-radius: 11px; background: var(--brand-blue); color: #fff; font-size: 12px; font-weight: 700; }
  .sim-peek svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .sim-peek-enter-active, .sim-peek-leave-active { transition: opacity .2s, transform .2s; }
  .sim-peek-enter-from, .sim-peek-leave-to { opacity: 0; transform: translateY(10px); }
  /* Quellen: Prüfpunkte erst auf Tippen */
  .source-toggle { display: inline-flex; align-items: center; min-height: 36px; margin-top: 4px; padding: 0; border: 0; background: none; color: var(--brand-blue); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
  .source-item ul.closed { display: none; }
  .curve { gap: 4px; height: 150px; }
  .curve-bar em { font-size: 9px; }
  .recipe-row { grid-template-columns: 1fr 1fr; gap: 8px; }
  .recipe-row.head { display: none; }
  .dose-adjustments { grid-template-columns: 1fr; }
}
</style>
