<template>
  <div class="dashboard-home">
    <!-- 1 · Lage, Hauptaktion und die drei Zahlen, die etwas auslösen. -->
    <header :class="['dashboard-head', headTone]">
      <div class="head-copy">
        <span class="head-kicker">Übersicht · {{ todayLabel }}</span>
        <h1>{{ headline }}</h1>
        <p>{{ subline }}</p>
        <div class="head-actions">
          <RouterLink to="/analyses/activate" class="btn btn-primary">Neue Analyse registrieren</RouterLink>
          <RouterLink to="/analyses" class="btn btn-ghost">Alle Berichte</RouterLink>
        </div>
      </div>

      <div class="head-stats">
        <RouterLink v-for="stat in headStats" :key="stat.label" :to="stat.to" :class="['head-stat', stat.tone]">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
          <em>{{ stat.caption }}</em>
        </RouterLink>
      </div>
    </header>

    <!-- 2 · Die Arbeitsliste. Gleiche Engine wie der Laborbericht. -->
    <section class="panel measures">
      <header class="panel-head">
        <div>
          <span class="panel-eyebrow">Handlungsbedarf</span>
          <h2>{{ measures.length ? 'Jetzt zu tun' : 'Nichts offen' }}</h2>
          <p>{{ measuresIntro }}</p>
        </div>
        <RouterLink v-if="hiddenMeasureCount" to="/analyses" class="panel-link">
          {{ hiddenMeasureCount }} weitere ansehen
        </RouterLink>
      </header>

      <div v-if="!measures.length" class="measures-clear">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>{{ evaluatedCount ? 'Keine Maßnahme erforderlich' : 'Noch keine Auswertung' }}</strong>
          <p v-if="evaluatedCount">Alle bewerteten Messwerte liegen in ihrem Zielbereich. Pflege und Dosierung laufen unverändert weiter.</p>
          <p v-else>Sobald der erste Laborbericht ausgewertet ist, stehen hier die konkreten Maßnahmen – nach Dringlichkeit und mit Frist.</p>
        </div>
      </div>

      <ol v-else class="measure-list">
        <li v-for="(measure, index) in visibleMeasures" :key="measure.key" :class="['measure', measure.tone]" :style="{ '--i': index }">
          <span class="measure-mark" aria-hidden="true">{{ measure.icon }}</span>

          <div class="measure-body">
            <div class="measure-meta">
              <em :class="['tone-chip', measure.tone]">{{ measure.tone === 'critical' ? 'Kritisch' : 'Beobachten' }}</em>
              <RouterLink :to="`/aquariums/${measure.tankId}`" class="measure-tank">{{ measure.tankName }}</RouterLink>
              <small v-if="measure.volume">{{ measure.volume }} L</small>
            </div>
            <h3>{{ measure.title }}</h3>
            <p>{{ measure.summary }}</p>
            <div v-if="measure.elements.length" class="measure-tags">
              <b v-for="element in measure.elements" :key="element">{{ element }}</b>
            </div>
          </div>

          <div class="measure-side">
            <span :class="['measure-due', measure.dueTone]">{{ measure.dueLabel }}</span>
            <RouterLink :to="`/analyses/${measure.analysisId}`" class="measure-open">Bericht öffnen</RouterLink>
          </div>
        </li>
      </ol>
    </section>

    <div class="split">
      <!-- 3 · Ein Becken pro Karte, das dringendste zuerst. -->
      <section class="panel tanks">
        <header class="panel-head">
          <div>
            <span class="panel-eyebrow">Becken</span>
            <h2>Ihre Aquarien</h2>
            <p>Nach Aufmerksamkeit sortiert – das Becken mit dem größten Bedarf steht oben.</p>
          </div>
          <RouterLink to="/aquariums" class="panel-link">
            {{ hiddenTankCount ? `Alle ${tankCards.length} anzeigen` : 'Verwalten' }}
          </RouterLink>
        </header>

        <div v-if="!tankCards.length" class="tanks-empty">
          <strong>Noch kein Becken angelegt</strong>
          <p>Ein Aquarium ordnet Laborwerte zu und liefert das Volumen für jede Dosierberechnung.</p>
          <RouterLink to="/aquariums/new" class="btn btn-primary btn-sm">Becken anlegen</RouterLink>
        </div>

        <div v-else class="tank-grid">
          <RouterLink
            v-for="tank in visibleTankCards"
            :key="tank.id"
            :to="tank.analysisId ? `/analyses/${tank.analysisId}` : `/aquariums/${tank.id}`"
            :class="['tank-card', tank.tone]"
          >
            <div class="tank-visual">
              <img v-if="tank.image" :src="tank.image" alt="" />
              <div v-else :class="['tank-thumb', tank.image_theme || 'reef-mixed']"></div>
              <span class="tank-badge">{{ tank.typeLabel }}</span>
            </div>

            <div class="tank-body">
              <div class="tank-top">
                <div class="tank-ident">
                  <h3>{{ tank.name }}</h3>
                  <p>{{ tank.volume ? `${tank.volume} L` : 'Volumen offen' }}</p>
                </div>
                <div :class="['tank-score', tank.tone]">
                  <template v-if="tank.score !== null"><strong>{{ tank.score }}</strong><small>%</small></template>
                  <template v-else><strong>–</strong></template>
                </div>
              </div>

              <div class="health-track" role="presentation">
                <i :class="tank.tone" :style="{ width: `${tank.score ?? 0}%` }"></i>
              </div>

              <svg v-if="tank.spark" class="tank-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
                <polyline :points="tank.spark" />
              </svg>

              <div class="tank-foot">
                <span :class="tank.openMeasures ? 'has-work' : 'clean'">{{ tank.statusLabel }}</span>
                <em>{{ tank.ageLabel }}</em>
              </div>
            </div>
          </RouterLink>
        </div>

        <RouterLink v-if="hiddenTankCount" to="/aquariums" class="tanks-more">
          <span>{{ hiddenTankCount }} weitere Becken mit geringerer Priorität</span>
          <b>Alle Becken öffnen →</b>
        </RouterLink>
      </section>

      <aside class="side">
        <!-- 4 · Muster über alle Becken hinweg. -->
        <section v-if="deviations.length" class="panel pattern">
          <header class="panel-head tight">
            <div>
              <span class="panel-eyebrow">Muster</span>
              <h2>Häufigste Abweichungen</h2>
            </div>
          </header>
          <p class="pattern-hint">Über {{ evaluatedCount }} bewertete Becken hinweg – meist ein Versorgungsthema, kein Einzelfall.</p>
          <ul class="pattern-list">
            <li v-for="item in deviations" :key="item.key">
              <div class="pattern-top">
                <strong>{{ item.label }}</strong>
                <span>{{ item.count }}<small>/{{ evaluatedCount }}</small></span>
              </div>
              <div class="pattern-track"><i :class="item.tone" :style="{ width: `${(item.count / evaluatedCount) * 100}%` }"></i></div>
              <em>{{ item.directionLabel }}</em>
            </li>
          </ul>
        </section>

        <!-- 5 · Proben ohne Ergebnis, damit klar ist, worauf gewartet wird. -->
        <section v-if="pipeline.length" class="panel pipeline">
          <header class="panel-head tight">
            <div>
              <span class="panel-eyebrow">Labor</span>
              <h2>Unterwegs</h2>
            </div>
          </header>
          <RouterLink v-for="item in pipeline" :key="item.id" :to="`/analyses/${item.id}`" class="row">
            <span class="dot open"></span>
            <div>
              <strong>{{ item.aquariumName }}</strong>
              <em>{{ item.statusLabel }} · eingereicht {{ relativeDays(item.createdAt) }}</em>
            </div>
            <i aria-hidden="true">→</i>
          </RouterLink>
        </section>

        <!-- 6 · Die letzten Berichte als Einstieg. -->
        <section class="panel recent">
          <header class="panel-head tight">
            <div>
              <span class="panel-eyebrow">Verlauf</span>
              <h2>Letzte Berichte</h2>
            </div>
            <RouterLink to="/analyses" class="panel-link">Alle</RouterLink>
          </header>
          <p v-if="!recentReports.length" class="recent-empty">Noch kein abgeschlossener Bericht.</p>
          <RouterLink v-for="item in recentReports" :key="item.id" :to="`/analyses/${item.id}`" class="row">
            <span :class="['dot', item.severity]"></span>
            <div>
              <strong>{{ item.aquariumName }}</strong>
              <em>Nr. {{ item.reportNumber }} · {{ formatDate(item.completedAt || item.createdAt) }}</em>
            </div>
            <b :class="item.severity">{{ item.score }}%</b>
          </RouterLink>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAquariumsStore } from '@/stores/aquariums'
import { useAnalysesStore } from '@/stores/analyses'
import { buildDosingPlan } from '@/services/dosingPlan'
import { findScale, loadActiveScaleId, loadEvaluationScales } from '@/services/evaluationScales'
import { buildDirectRecommendations, evaluateAnalysis } from '@/services/directRecommendations'

const MEASURE_LIMIT = 5
const TANK_LIMIT = 6
const DEVIATION_LIMIT = 5
const DAY = 86400000

const aquariums = useAquariumsStore()
const analyses = useAnalysesStore()

onMounted(() => {
  aquariums.load()
  analyses.load()
})

const scales = loadEvaluationScales()
const activeScaleId = loadActiveScaleId()
const scaleName = computed(() => {
  // Solange alle Becken dieselbe Grundlage nutzen, lässt sie sich benennen.
  const used = new Set(completed.value.map((item) => item.aquariumProfile?.evaluationScaleId || activeScaleId))
  if (used.size !== 1) return 'Ihrer Bewertungsgrundlage'
  return findScale(scales, [...used][0])?.name || 'Ihrer Bewertungsgrundlage'
})

// Osmoseproben sind eigene Datensätze, aber keine Becken, die gepflegt werden.
const tanks = computed(() => aquariums.items.filter((item) => item.water_type !== 'Osmosewasser'))
const completed = computed(() => analyses.items
  .filter((item) => item.status === 'completed' && item.score !== null && item.score !== undefined)
  .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)))
const pipeline = computed(() => analyses.items.filter((item) => item.status !== 'completed'))
const evaluatedCount = computed(() => new Set(completed.value.map((item) => item.aquariumId)).size)

function reportsFor(tankId) {
  return completed.value.filter((item) => item.aquariumId === tankId)
}

// Der Bericht rechnet genauso: bewerten, Dosierschlüssel bestimmen, Empfehlungen bauen.
function recommendationsFor(analysis) {
  const parameters = analysis.parameters || []
  if (!parameters.length) return []
  const scale = findScale(scales, analysis.aquariumProfile?.evaluationScaleId || activeScaleId)
  const volume = Number(analysis.aquariumProfile?.volumeLiters || 0)
  const dosingKeys = new Set(buildDosingPlan(parameters, volume).filter((item) => item.dose).map((item) => item.key))
  return buildDirectRecommendations(evaluateAnalysis(parameters, scale), { dosingKeys, volumeLiters: volume })
}

// Jede Empfehlung bekommt eine Frist: Berichtsdatum plus die Kontrollspanne.
function dueFrom(analysis, recheckDays) {
  if (!recheckDays) return null
  const base = new Date(analysis.completedAt || analysis.createdAt)
  if (Number.isNaN(base.getTime())) return null
  return new Date(base.getTime() + recheckDays * DAY)
}

const measures = computed(() => {
  const rows = []
  for (const analysis of completed.value) {
    const tank = tanks.value.find((item) => item.id === analysis.aquariumId)
    for (const recommendation of recommendationsFor(analysis)) {
      const due = dueFrom(analysis, recommendation.recheckDays)
      const overdue = due ? Math.floor((Date.now() - due.getTime()) / DAY) : null
      rows.push({
        key: `${analysis.id}:${recommendation.key}`,
        analysisId: analysis.id,
        tankId: analysis.aquariumId,
        tankName: analysis.aquariumName,
        volume: Number(analysis.aquariumProfile?.volumeLiters || tank?.net_volume || 0) || 0,
        icon: recommendation.icon || '•',
        title: recommendation.title,
        summary: recommendation.summary,
        elements: recommendation.elements || [],
        tone: recommendation.tone,
        rank: recommendation.rank || 0,
        dueLabel: overdue === null
          ? 'Ohne Frist'
          : overdue > 0
          ? `Kontrolle seit ${overdue} ${overdue === 1 ? 'Tag' : 'Tagen'} fällig`
          : overdue === 0
          ? 'Kontrolle heute fällig'
          : `Kontrolle in ${Math.abs(overdue)} ${Math.abs(overdue) === 1 ? 'Tag' : 'Tagen'}`,
        dueTone: overdue === null ? 'none' : overdue >= 0 ? 'late' : 'ahead',
      })
    }
  }
  return rows.sort((a, b) => (a.tone === b.tone ? b.rank - a.rank : a.tone === 'critical' ? -1 : 1))
})
const visibleMeasures = computed(() => measures.value.slice(0, MEASURE_LIMIT))
const hiddenMeasureCount = computed(() => Math.max(0, measures.value.length - MEASURE_LIMIT))
const criticalMeasures = computed(() => measures.value.filter((item) => item.tone === 'critical'))
const overdueMeasures = computed(() => measures.value.filter((item) => item.dueTone === 'late'))
const affectedTanks = computed(() => new Set(measures.value.map((item) => item.tankId)).size)

const measuresIntro = computed(() => {
  if (!measures.value.length) return 'Diese Liste führt jede offene Maßnahme aus allen Becken zusammen.'
  const scope = `${Math.min(MEASURE_LIMIT, measures.value.length)} von ${measures.value.length}`
  return `${scope} nach Dringlichkeit, aus ${affectedTanks.value} Becken. Identisch bewertet wie im Laborbericht.`
})

const headTone = computed(() => {
  if (criticalMeasures.value.length) return 'critical'
  if (measures.value.length) return 'watch'
  return evaluatedCount.value ? 'good' : 'neutral'
})
const headline = computed(() => {
  if (!tanks.value.length) return 'Legen Sie Ihr erstes Becken an'
  if (!completed.value.length) return 'Noch kein ausgewerteter Laborbericht'
  if (criticalMeasures.value.length) {
    return `${criticalMeasures.value.length} ${criticalMeasures.value.length === 1 ? 'Maßnahme' : 'Maßnahmen'} mit hoher Priorität`
  }
  if (measures.value.length) return `${measures.value.length} ${measures.value.length === 1 ? 'Maßnahme' : 'Maßnahmen'} offen`
  return 'Alle Werte im Zielbereich'
})
const subline = computed(() => {
  if (!tanks.value.length) return 'Ein Becken ordnet Laborwerte zu und liefert das Volumen für jede Dosierberechnung.'
  if (!completed.value.length) {
    return pipeline.value.length
      ? `${pipeline.value.length} ${pipeline.value.length === 1 ? 'Probe ist' : 'Proben sind'} im Labor. Die Auswertung erscheint hier, sobald sie fertig ist.`
      : 'Registrieren Sie eine Wasserprobe, um Bewertung, Empfehlungen und Dosierung zu erhalten.'
  }
  if (!measures.value.length) {
    return `${evaluatedCount.value} von ${tanks.value.length} Becken bewertet – keine Abweichung erfordert ein Eingreifen.`
  }
  // Die fälligen Kontrollen stehen schon als Kennzahl daneben; hier zählt der Rahmen.
  return `Betroffen sind ${affectedTanks.value} von ${tanks.value.length} Becken, bewertet nach ${scaleName.value}.`
})

const headStats = computed(() => {
  const rows = [{
    label: measures.value.length === 1 ? 'Maßnahme' : 'Maßnahmen',
    value: measures.value.length,
    caption: criticalMeasures.value.length
      ? `${criticalMeasures.value.length} kritisch`
      : measures.value.length
      ? 'keine kritisch'
      : evaluatedCount.value ? 'nichts offen' : 'noch keine Auswertung',
    to: '/analyses',
    tone: criticalMeasures.value.length ? 'critical' : measures.value.length ? 'watch' : evaluatedCount.value ? 'good' : 'neutral',
  }]
  if (tanks.value.length) {
    rows.push({
      label: 'Becken bewertet',
      value: `${evaluatedCount.value}/${tanks.value.length}`,
      caption: evaluatedCount.value < tanks.value.length ? `${tanks.value.length - evaluatedCount.value} ohne Bericht` : 'alle mit Laborwerten',
      to: '/aquariums',
      tone: evaluatedCount.value < tanks.value.length ? 'watch' : 'good',
    })
  }
  // „0 Kontrollen fällig“ sagt nichts, solange nichts bewertet und nichts unterwegs ist.
  if (pipeline.value.length) {
    rows.push({ label: 'Im Labor', value: pipeline.value.length, caption: 'Ergebnis offen', to: '/analyses', tone: 'neutral' })
  } else if (evaluatedCount.value) {
    rows.push({
      label: 'Kontrollen fällig',
      value: overdueMeasures.value.length,
      caption: overdueMeasures.value.length ? 'Frist überschritten' : 'alles im Plan',
      to: '/analyses',
      tone: overdueMeasures.value.length ? 'critical' : 'good',
    })
  }
  return rows
})

// Nur Becken mit mindestens zwei Berichten haben einen echten Verlauf.
function sparkFor(reports) {
  if (reports.length < 2) return ''
  const series = reports.slice(0, 6).reverse().map((item) => Number(item.score))
  const min = Math.min(...series)
  const span = Math.max(Math.max(...series) - min, 1)
  return series
    .map((value, index) => `${(index / (series.length - 1)) * 100},${22 - ((value - min) / span) * 18}`)
    .join(' ')
}

function toneRank(tone) {
  return { critical: 0, watch: 1, open: 2, good: 3, none: 4 }[tone] ?? 5
}

const tankCards = computed(() => tanks.value.map((tank) => {
  const reports = reportsFor(tank.id)
  const latest = reports[0] || analyses.items.find((item) => item.aquariumId === tank.id) || null
  const awaiting = latest && latest.status !== 'completed'
  const open = measures.value.filter((item) => item.tankId === tank.id).length
  return {
    ...tank,
    volume: Number(tank.net_volume) || 0,
    typeLabel: tank.aquarium_type || tank.water_type,
    analysisId: latest?.id || '',
    score: awaiting ? null : latest?.score ?? null,
    tone: !latest ? 'none' : awaiting ? 'open' : latest.severity,
    openMeasures: open,
    spark: sparkFor(reports),
    statusLabel: !latest
      ? 'Noch keine Probe'
      : awaiting
      ? 'Probe im Labor'
      : open
      ? `${open} ${open === 1 ? 'Maßnahme' : 'Maßnahmen'}`
      : 'Keine Maßnahme',
    ageLabel: !latest ? 'offen' : relativeDays(awaiting ? latest.createdAt : latest.completedAt || latest.createdAt),
  }
}).sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || b.openMeasures - a.openMeasures || (a.score ?? 101) - (b.score ?? 101)))

const visibleTankCards = computed(() => tankCards.value.slice(0, TANK_LIMIT))
const hiddenTankCount = computed(() => Math.max(0, tankCards.value.length - TANK_LIMIT))

// Welches Element fällt in mehreren Becken auf? Je Becken zählt der neueste Bericht.
const deviations = computed(() => {
  if (evaluatedCount.value < 2) return []
  const counter = new Map()
  const seen = new Set()
  for (const analysis of completed.value) {
    if (seen.has(analysis.aquariumId)) continue
    seen.add(analysis.aquariumId)
    for (const parameter of analysis.parameters || []) {
      if (parameter.tone === 'good') continue
      const entry = counter.get(parameter.key) || { key: parameter.key, label: parameter.label, count: 0, low: 0, high: 0, critical: 0 }
      entry.count += 1
      if (parameter.sourceDirection === 'low') entry.low += 1
      else if (parameter.sourceDirection === 'high') entry.high += 1
      if (parameter.tone === 'critical') entry.critical += 1
      counter.set(parameter.key, entry)
    }
  }
  return [...counter.values()]
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count || b.critical - a.critical)
    .slice(0, DEVIATION_LIMIT)
    .map((entry) => ({
      ...entry,
      tone: entry.critical ? 'critical' : 'watch',
      directionLabel: entry.low && entry.high
        ? `${entry.low}× zu niedrig · ${entry.high}× zu hoch`
        : entry.low
        ? 'durchgehend zu niedrig'
        : 'durchgehend zu hoch',
    }))
})

const recentReports = computed(() => completed.value.slice(0, 5))
const todayLabel = computed(() => new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }))

function relativeDays(date) {
  if (!date) return 'unbekannt'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / DAY)
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 31) return `vor ${days} Tagen`
  const months = Math.floor(days / 30)
  return `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`
}
function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}
</script>

<style scoped>
.dashboard-home {
  --green: #10b981;
  --green-ink: #047857;
  --amber: #f59e0b;
  --amber-ink: #b45309;
  --coral: #e85d4f;
  --coral-ink: #b3392c;
  --hair: rgba(10,27,67,0.1);
  display: grid;
  gap: 20px;
  font-variant-numeric: tabular-nums;
}

/* Gemeinsame Flächen */
.panel {
  padding: 20px 22px;
  border: 1px solid var(--hair);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(10,27,67,0.03), 0 14px 34px rgba(10,27,67,0.04);
}
.panel-head { display: flex; gap: 14px; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.panel-head.tight { margin-bottom: 11px; align-items: center; }
.panel-eyebrow { display: block; color: var(--brand-blue); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.panel-head h2 { margin-top: 4px; color: var(--text); font-size: 17px; font-weight: 800; letter-spacing: -0.01em; }
.panel-head.tight h2 { font-size: 14.5px; }
.panel-head p { margin-top: 5px; max-width: 72ch; color: var(--text-muted); font-size: 11.5px; font-weight: 600; line-height: 1.5; }
.panel-link { align-self: center; color: var(--brand-blue); font-size: 11.5px; font-weight: 800; text-decoration: none; white-space: nowrap; }
.panel-link:hover { text-decoration: underline; }

/* 1 · Kopfband */
.dashboard-head {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 26px;
  align-items: center;
  padding: 26px 28px;
  border-radius: 24px;
  background: linear-gradient(104deg, var(--brand-dark) 0%, #0d2f6b 50%, #0a63b8 100%);
  color: #fff;
  box-shadow: 0 20px 48px rgba(10,27,67,0.2);
}
.dashboard-head::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(820px 230px at 86% -20%, rgba(136,193,233,0.34), transparent 68%);
  pointer-events: none;
}
/* Schmaler Farbstreifen: zeigt den Ernst der Lage, ohne das Blau zu brechen. */
.dashboard-head::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: var(--green);
}
.dashboard-head.critical::after { background: var(--coral); }
.dashboard-head.watch::after { background: var(--amber); }
.dashboard-head.neutral::after { background: #88c1e9; }
.head-copy,
.head-stats { position: relative; z-index: 1; }
.head-copy { min-width: 0; }
.head-kicker { display: block; color: rgba(193,226,250,0.9); font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.dashboard-head h1 { margin: 8px 0 6px; color: #fff; font-size: clamp(22px, 2.6vw, 30px); font-weight: 800; letter-spacing: -0.025em; line-height: 1.15; }
.dashboard-head p { max-width: 64ch; color: rgba(228,241,253,0.9); font-size: 13px; font-weight: 600; line-height: 1.55; }
.head-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.head-actions .btn-ghost { border: 1px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.1); color: #fff; }
.head-actions .btn-ghost:hover { border-color: #fff; background: rgba(255,255,255,0.2); }

.head-stats { display: flex; gap: 10px; }
.head-stat {
  min-width: 126px;
  padding: 14px 15px;
  border: 1px solid rgba(255,255,255,0.18);
  border-top: 3px solid rgba(255,255,255,0.4);
  border-radius: 14px;
  background: rgba(255,255,255,0.09);
  text-decoration: none;
  transition: background 0.18s ease, transform 0.18s ease;
}
.head-stat:hover { transform: translateY(-2px); background: rgba(255,255,255,0.16); }
.head-stat.critical { border-top-color: #ff9c90; }
.head-stat.watch { border-top-color: #ffd27a; }
.head-stat.good { border-top-color: #6ee7b7; }
.head-stat strong { display: block; color: #fff; font-size: 27px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
.head-stat span { display: block; margin-top: 6px; color: #fff; font-size: 11px; font-weight: 800; }
.head-stat em { display: block; margin-top: 2px; color: rgba(205,230,250,0.84); font-size: 10px; font-style: normal; font-weight: 700; }

/* 2 · Maßnahmen */
.measures-clear { display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 14px; align-items: center; padding: 16px; border: 1px dashed rgba(16,185,129,0.38); border-radius: 15px; background: #f2fdf8; }
.measures-clear > span { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; background: var(--green); color: #fff; font-size: 20px; font-weight: 800; }
.measures-clear strong { color: var(--text); font-size: 13.5px; font-weight: 800; }
.measures-clear p { margin-top: 3px; color: var(--text-muted); font-size: 11.5px; font-weight: 600; line-height: 1.5; }

.measure-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.measure {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 15px 16px;
  border: 1px solid var(--hair);
  border-left: 4px solid var(--amber);
  border-radius: 16px;
  background: #fff;
  animation: rise 0.36s cubic-bezier(0.22, 0.8, 0.3, 1) both;
  animation-delay: calc(var(--i) * 65ms);
  transition: box-shadow 0.18s ease, border-color 0.18s ease;
}
.measure:hover { border-color: rgba(10,27,67,0.2); box-shadow: 0 10px 26px rgba(10,27,67,0.08); }
.measure.critical { border-left-color: var(--coral); background: linear-gradient(94deg, #fff8f6, #fff 36%); }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .measure { animation: none; } }
.measure-mark { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: #fdf4e3; color: var(--amber-ink); font-size: 16px; }
.measure.critical .measure-mark { background: #fdeae7; color: var(--coral-ink); }
.measure-body { min-width: 0; }
.measure-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.tone-chip { padding: 2px 8px; border-radius: 999px; background: #fef3c7; color: var(--amber-ink); font-size: 9.5px; font-style: normal; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.tone-chip.critical { background: #fdeae7; color: var(--coral-ink); }
.measure-tank { color: var(--text); font-size: 11.5px; font-weight: 800; text-decoration: none; }
.measure-tank:hover { color: var(--brand-blue); text-decoration: underline; }
.measure-meta small { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.measure-body h3 { margin: 6px 0 3px; color: var(--text); font-size: 14.5px; font-weight: 800; line-height: 1.3; }
.measure-body p { color: var(--text-muted); font-size: 11.5px; font-weight: 600; line-height: 1.55; }
.measure-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.measure-tags b { padding: 3px 8px; border: 1px solid var(--hair); border-radius: 8px; background: #f6f9fd; color: var(--text); font-size: 10px; font-weight: 800; }
.measure-side { display: grid; gap: 8px; justify-items: end; text-align: right; }
.measure-due { font-size: 10.5px; font-weight: 800; white-space: nowrap; }
.measure-due.late { color: var(--coral-ink); }
.measure-due.ahead,
.measure-due.none { color: var(--text-muted); }
.measure-open {
  padding: 9px 14px;
  border: 1px solid var(--hair);
  border-radius: 11px;
  background: #fff;
  color: var(--brand-blue);
  font-size: 11.5px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}
.measure-open:hover { border-color: var(--brand-blue); background: var(--teal-50); }

/* 3 · Becken */
.split { display: grid; grid-template-columns: minmax(0, 1.68fr) minmax(0, 1fr); gap: 20px; align-items: stretch; }
/* Die kürzere Spalte wächst mit; ihr Inhalt bleibt dabei mittig statt oben zu kleben. */
.tanks { display: flex; flex-direction: column; }
.tanks .tank-grid { flex: 1 1 auto; align-content: center; }
.tanks-empty { display: grid; justify-items: start; gap: 8px; padding: 20px; border: 1px dashed var(--hair); border-radius: 15px; }
.tanks-empty strong { color: var(--text); font-size: 13.5px; font-weight: 800; }
.tanks-empty p { max-width: 54ch; color: var(--text-muted); font-size: 11.5px; font-weight: 600; line-height: 1.5; }

.tank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 12px; }
.tank-card {
  overflow: hidden;
  min-width: 0;
  border: 1px solid var(--hair);
  border-radius: 17px;
  background: #fff;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.tank-card:hover { transform: translateY(-3px); border-color: rgba(10,27,67,0.18); box-shadow: 0 16px 34px rgba(10,27,67,0.11); }
.tank-visual { position: relative; height: 112px; overflow: hidden; }
.tank-visual img { display: block; width: 100%; height: 100%; object-fit: cover; }
.tank-thumb {
  width: 100%;
  height: 100%;
  background:
    linear-gradient(168deg, rgba(10,27,67,0.34), rgba(0,190,208,0.12)),
    url('/tanks/reef-mixed.png') center / cover no-repeat;
}
.tank-thumb.reef-sps { background-image: linear-gradient(168deg, rgba(10,27,67,0.5), rgba(0,114,206,0.2)), url('/tanks/reef-mixed.png'); }
.tank-thumb.reef-nano { background-image: linear-gradient(168deg, rgba(15,118,110,0.4), rgba(94,234,212,0.18)), url('/tanks/reef-mixed.png'); }
.tank-thumb.freshwater { background-image: linear-gradient(168deg, rgba(15,118,110,0.32), rgba(52,211,153,0.14)), url('/tanks/freshwater.png'); }
.tank-thumb.osmosis { background-image: linear-gradient(168deg, rgba(22,78,99,0.42), rgba(103,232,249,0.16)), url('/tanks/osmosis.png'); }
.tank-badge {
  position: absolute;
  left: 11px;
  top: 11px;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(10,27,67,0.62);
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tank-body { display: grid; gap: 9px; padding: 13px 14px 14px; }
.tank-top { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; }
.tank-ident { min-width: 0; }
.tank-ident h3 { overflow: hidden; color: var(--text); font-size: 13.5px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.tank-ident p { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.tank-score { display: flex; align-items: baseline; color: #64748b; }
.tank-score strong { font-size: 22px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
.tank-score small { font-size: 10px; font-weight: 800; }
.tank-score.critical { color: var(--coral); }
.tank-score.watch { color: var(--amber-ink); }
.tank-score.good { color: var(--green-ink); }
.health-track { overflow: hidden; height: 5px; border-radius: 999px; background: #eef2f7; }
.health-track i { display: block; height: 100%; border-radius: 999px; background: #cbd5e1; transition: width 0.4s ease; }
.health-track i.critical { background: var(--coral); }
.health-track i.watch { background: var(--amber); }
.health-track i.good { background: var(--green); }
.tank-spark { display: block; width: 100%; height: 22px; }
.tank-spark polyline { fill: none; stroke: var(--brand-blue); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.tank-foot { display: flex; gap: 8px; align-items: center; justify-content: space-between; padding-top: 9px; border-top: 1px solid var(--hair); }
.tank-foot span { font-size: 10.5px; font-weight: 800; }
.tank-foot .has-work { color: var(--amber-ink); }
.tank-foot .clean { color: var(--green-ink); }
.tank-foot em { color: var(--text-muted); font-size: 10.5px; font-style: normal; font-weight: 700; }

.tanks-more {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 12px 15px;
  border: 1px dashed var(--hair);
  border-radius: 14px;
  text-decoration: none;
}
.tanks-more:hover { border-color: var(--brand-blue); background: var(--teal-50); }
.tanks-more span { color: var(--text-muted); font-size: 11.5px; font-weight: 700; }
.tanks-more b { color: var(--brand-blue); font-size: 11.5px; font-weight: 800; white-space: nowrap; }

/* 4-6 · Seitenspalte */
.side { display: grid; align-content: center; gap: 14px; }
.pattern-hint { margin-bottom: 12px; color: var(--text-muted); font-size: 11px; font-weight: 600; line-height: 1.5; }
.pattern-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.pattern-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.pattern-top strong { color: var(--text); font-size: 12px; font-weight: 800; }
.pattern-top > span { color: var(--text); font-size: 12px; font-weight: 800; }
.pattern-top small { color: var(--text-muted); font-weight: 700; }
.pattern-track { overflow: hidden; height: 6px; margin: 5px 0 4px; border-radius: 999px; background: #eef2f7; }
.pattern-track i { display: block; height: 100%; border-radius: 999px; background: var(--amber); }
.pattern-track i.critical { background: var(--coral); }
.pattern-list em { color: var(--text-muted); font-size: 10px; font-style: normal; font-weight: 700; }

.row {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--hair);
  text-decoration: none;
}
.row:first-of-type { border-top: 0; }
.row:hover strong { color: var(--brand-blue); }
.row strong { display: block; overflow: hidden; color: var(--text); font-size: 12.5px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.row em { display: block; color: var(--text-muted); font-size: 10px; font-style: normal; font-weight: 700; }
.row i { color: var(--brand-blue); font-style: normal; font-weight: 800; }
.row b { color: #64748b; font-size: 13px; font-weight: 800; }
.row b.good { color: var(--green-ink); }
.row b.watch { color: var(--amber-ink); }
.row b.critical { color: var(--coral); }
.dot { width: 9px; height: 9px; border-radius: 50%; background: #cbd5e1; }
.dot.open { background: var(--brand-blue); }
.dot.good { background: var(--green); }
.dot.watch { background: var(--amber); }
.dot.critical { background: var(--coral); }
.recent-empty { padding: 8px 0; color: var(--text-muted); font-size: 11.5px; font-weight: 600; }

@media (max-width: 1100px) {
  .split { grid-template-columns: 1fr; }
  .tanks .tank-grid { align-content: start; }
  .side { align-content: start; }
  .dashboard-head { grid-template-columns: 1fr; align-items: start; }
  .head-stats { flex-wrap: wrap; }
  .head-stat { flex: 1 1 140px; }
}
@media (max-width: 680px) {
  .measure { grid-template-columns: 34px minmax(0, 1fr); }
  .measure-mark { width: 34px; height: 34px; }
  .measure-side { grid-column: 2; justify-items: start; text-align: left; }
  .measures-clear { grid-template-columns: 1fr; }
  .tank-grid { grid-template-columns: 1fr; }
  .head-actions .btn { flex: 1 1 auto; }
}
</style>
