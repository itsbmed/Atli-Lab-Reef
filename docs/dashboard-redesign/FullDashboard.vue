<template>
  <div class="dashboard-home">
    <!-- 1 · Lage in einem Satz. Kein Portfolio-Score: ein Mittelwert über
         mehrere Becken trägt keine Entscheidung. -->
    <section :class="['status-bar', worstTone]">
      <div class="status-copy">
        <span class="status-kicker">Übersicht · {{ todayLabel }}</span>
        <h1>{{ headline }}</h1>
        <p>{{ subline }}</p>
      </div>
      <div class="status-figures">
        <RouterLink v-for="figure in figures" :key="figure.label" :to="figure.to" :class="['status-figure', figure.tone]">
          <strong>{{ figure.value }}</strong>
          <span>{{ figure.label }}</span>
          <em>{{ figure.caption }}</em>
        </RouterLink>
      </div>
    </section>

    <!-- 2 · Die Aufgabenliste. Gleiche Engine wie im Bericht, damit Übersicht
         und Bericht nie etwas Unterschiedliches sagen. -->
    <section class="task-panel">
      <header class="panel-head">
        <div>
          <span>Handlungsbedarf</span>
          <h2>{{ tasks.length ? 'Das ist jetzt zu tun' : 'Nichts offen' }}</h2>
          <p>{{ taskIntro }}</p>
        </div>
        <RouterLink v-if="tasks.length > TASK_LIMIT" to="/analyses" class="panel-link">
          Alle {{ tasks.length }} ansehen
        </RouterLink>
      </header>

      <div v-if="!tasks.length" class="task-empty">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>{{ completedCount ? 'Alle bewerteten Werte liegen im Zielbereich' : 'Noch keine Laborwerte' }}</strong>
          <p v-if="completedCount">Pflege und Dosierung können unverändert weiterlaufen. Die nächste Probe zeigt, ob das so bleibt.</p>
          <p v-else>Sobald der erste Bericht ausgewertet ist, stehen hier die konkreten Maßnahmen – nach Dringlichkeit sortiert.</p>
        </div>
        <RouterLink to="/analyses/activate" class="btn btn-primary btn-sm">Analyse registrieren</RouterLink>
      </div>

      <ol v-else class="task-list">
        <li v-for="(task, index) in visibleTasks" :key="task.key" :class="['task', task.tone]" :style="{ '--rise': `${index * 60}ms` }">
          <span class="task-rank">{{ index + 1 }}</span>
          <div class="task-body">
            <div class="task-head">
              <em :class="['task-chip', task.tone]">{{ task.tone === 'critical' ? 'Kritisch' : 'Beobachten' }}</em>
              <RouterLink :to="`/aquariums/${task.tankId}`" class="task-tank">{{ task.tankName }}</RouterLink>
              <span v-if="task.volume" class="task-volume">{{ task.volume }} L</span>
            </div>
            <h3>{{ task.title }}</h3>
            <p>{{ task.summary }}</p>
            <div class="task-foot">
              <span v-if="task.elements.length" class="task-elements">
                <b v-for="element in task.elements" :key="element">{{ element }}</b>
              </span>
              <span v-if="task.recheckDays" class="task-recheck">Kontrolle in {{ task.recheckDays }} Tagen</span>
            </div>
          </div>
          <RouterLink :to="`/analyses/${task.analysisId}`" class="task-open">
            <span>Bericht</span>
            <i aria-hidden="true">→</i>
          </RouterLink>
        </li>
      </ol>
    </section>

    <div class="overview-columns">
      <!-- 3 · Ein Becken pro Karte, mit dem Zustand und dem nächsten Schritt. -->
      <section class="tank-panel">
        <header class="panel-head">
          <div>
            <span>Becken</span>
            <h2>Ihre Aquarien</h2>
            <p>Sortiert nach Aufmerksamkeit – das Becken mit dem größten Bedarf steht oben.</p>
          </div>
          <RouterLink to="/aquariums" class="panel-link">Verwalten</RouterLink>
        </header>

        <div v-if="!tankCards.length" class="tank-empty">
          <strong>Noch kein Becken angelegt</strong>
          <p>Legen Sie ein Aquarium an, damit sich Laborberichte zuordnen und Dosierungen berechnen lassen.</p>
          <RouterLink to="/aquariums/new" class="btn btn-primary btn-sm">Becken anlegen</RouterLink>
        </div>

        <div v-else class="tank-grid">
          <article v-for="tank in tankCards" :key="tank.id" :class="['tank-card', tank.tone]">
            <div class="tank-card-head">
              <div :class="['tank-thumb', tank.image_theme || 'reef-mixed']" aria-hidden="true"></div>
              <div class="tank-ident">
                <h3>{{ tank.name }}</h3>
                <p>{{ tank.volume ? `${tank.volume} L` : 'Volumen offen' }}<template v-if="tank.aquarium_type"> · {{ tank.aquarium_type }}</template></p>
              </div>
              <div :class="['tank-score', tank.tone]">
                <template v-if="tank.score !== null"><strong>{{ tank.score }}</strong><small>%</small></template>
                <template v-else><strong>–</strong></template>
              </div>
            </div>

            <p :class="['tank-verdict', tank.tone]">{{ tank.verdict }}</p>

            <ul v-if="tank.findings.length" class="tank-findings">
              <li v-for="finding in tank.findings" :key="finding">{{ finding }}</li>
              <li v-if="tank.moreFindings" class="more">+{{ tank.moreFindings }} weitere</li>
            </ul>

            <footer class="tank-card-foot">
              <span>{{ tank.ageLabel }}</span>
              <RouterLink :to="tank.to" class="tank-cta">{{ tank.ctaLabel }} →</RouterLink>
            </footer>
          </article>
        </div>
      </section>

      <aside class="side-column">
        <!-- 4 · Was über alle Becken hinweg auffällt. Ersetzt die frühere
             Portfolio-Kurve, die Messwerte verschiedener Becken vermischt hat. -->
        <section v-if="recurringDeviations.length" class="card deviation-card">
          <header class="panel-head compact">
            <div>
              <span>Muster</span>
              <h2>Häufigste Abweichungen</h2>
            </div>
          </header>
          <p class="deviation-hint">Über {{ evaluatedTankCount }} {{ evaluatedTankCount === 1 ? 'bewertetes Becken' : 'bewertete Becken' }} hinweg.</p>
          <ul class="deviation-list">
            <li v-for="item in recurringDeviations" :key="item.key">
              <div class="deviation-top">
                <strong>{{ item.label }}</strong>
                <span>{{ item.count }}/{{ evaluatedTankCount }}</span>
              </div>
              <div class="deviation-track"><i :class="item.tone" :style="{ width: `${(item.count / evaluatedTankCount) * 100}%` }"></i></div>
              <em>{{ item.directionLabel }}</em>
            </li>
          </ul>
        </section>

        <!-- 5 · Laufende Proben, damit klar ist, worauf gewartet wird. -->
        <section v-if="pipeline.length" class="card pipeline-card">
          <header class="panel-head compact">
            <div>
              <span>Labor</span>
              <h2>Unterwegs</h2>
            </div>
            <RouterLink to="/analyses" class="panel-link">Alle</RouterLink>
          </header>
          <RouterLink v-for="item in pipeline" :key="item.id" :to="`/analyses/${item.id}`" class="pipeline-row">
            <span class="pipeline-dot"></span>
            <div>
              <strong>{{ item.aquariumName }}</strong>
              <em>{{ item.statusLabel }} · seit {{ relativeDays(item.createdAt) }}</em>
            </div>
            <i aria-hidden="true">→</i>
          </RouterLink>
        </section>

        <section class="card recent-card">
          <header class="panel-head compact">
            <div>
              <span>Verlauf</span>
              <h2>Letzte Berichte</h2>
            </div>
            <RouterLink to="/analyses" class="panel-link">Alle</RouterLink>
          </header>
          <div v-if="!recentReports.length" class="recent-empty">Noch kein abgeschlossener Bericht.</div>
          <RouterLink v-for="item in recentReports" :key="item.id" :to="`/analyses/${item.id}`" class="recent-row">
            <span :class="['recent-dot', item.severity]"></span>
            <div>
              <strong>{{ item.aquariumName }}</strong>
              <em>Nr. {{ item.reportNumber }} · {{ formatDate(item.completedAt || item.createdAt) }}</em>
            </div>
            <b :class="item.severity">{{ item.score }}%</b>
          </RouterLink>
        </section>

        <RouterLink to="/analyses/activate" class="card register-card">
          <strong>Neue Analyse registrieren</strong>
          <span>Barcode der Wasserprobe eingeben und dem Becken zuordnen.</span>
          <em>Starten →</em>
        </RouterLink>
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

const TASK_LIMIT = 6
const FINDING_LIMIT = 3
const DEVIATION_LIMIT = 5

const aquariums = useAquariumsStore()
const analyses = useAnalysesStore()

onMounted(() => {
  aquariums.load()
  analyses.load()
})

const scales = loadEvaluationScales()
const activeScaleId = loadActiveScaleId()

// Osmoseproben sind eigene Datensätze, aber keine Becken, die der Nutzer pflegt.
const tanks = computed(() => aquariums.items.filter((item) => item.water_type !== 'Osmosewasser'))
const completed = computed(() => analyses.items.filter((item) => item.status === 'completed' && item.score !== null && item.score !== undefined))
const completedCount = computed(() => completed.value.length)
const pipeline = computed(() => analyses.items.filter((item) => item.status !== 'completed'))

function latestFor(tank) {
  return completed.value.find((item) => item.aquariumId === tank.id)
    || analyses.items.find((item) => item.aquariumId === tank.id)
    || null
}

function scaleFor(analysis) {
  return findScale(scales, analysis?.aquariumProfile?.evaluationScaleId || activeScaleId)
}

// Genau der Weg, den auch der Bericht nimmt: bewerten, Dosierschlüssel bestimmen,
// Empfehlungen bauen.
function recommendationsFor(analysis) {
  const parameters = analysis.parameters || []
  if (!parameters.length) return []
  const volume = Number(analysis.aquariumProfile?.volumeLiters || 0)
  const evaluated = evaluateAnalysis(parameters, scaleFor(analysis))
  const dosingKeys = new Set(buildDosingPlan(parameters, volume).filter((item) => item.dose).map((item) => item.key))
  return buildDirectRecommendations(evaluated, { dosingKeys })
}

const tasks = computed(() => {
  const rows = []
  for (const analysis of completed.value) {
    const tank = tanks.value.find((item) => item.id === analysis.aquariumId)
    for (const recommendation of recommendationsFor(analysis)) {
      rows.push({
        key: `${analysis.id}:${recommendation.key}`,
        analysisId: analysis.id,
        tankId: analysis.aquariumId,
        tankName: analysis.aquariumName,
        volume: Number(analysis.aquariumProfile?.volumeLiters || tank?.net_volume || 0) || 0,
        title: recommendation.title,
        summary: recommendation.summary,
        elements: recommendation.elements || [],
        recheckDays: recommendation.recheckDays || 0,
        tone: recommendation.tone,
        rank: recommendation.rank || 0,
      })
    }
  }
  return rows.sort((a, b) => (a.tone === b.tone ? b.rank - a.rank : a.tone === 'critical' ? -1 : 1))
})
const visibleTasks = computed(() => tasks.value.slice(0, TASK_LIMIT))
const criticalTasks = computed(() => tasks.value.filter((task) => task.tone === 'critical'))
const affectedTanks = computed(() => new Set(tasks.value.map((task) => task.tankId)).size)

const worstTone = computed(() => {
  if (criticalTasks.value.length) return 'critical'
  if (tasks.value.length) return 'watch'
  return completedCount.value ? 'good' : 'neutral'
})

const headline = computed(() => {
  if (!tanks.value.length) return 'Willkommen – legen Sie Ihr erstes Becken an'
  if (!completedCount.value) return 'Noch kein ausgewerteter Laborbericht'
  if (criticalTasks.value.length) {
    return `${criticalTasks.value.length} ${criticalTasks.value.length === 1 ? 'Maßnahme ist' : 'Maßnahmen sind'} dringend`
  }
  if (tasks.value.length) return `${tasks.value.length} ${tasks.value.length === 1 ? 'Maßnahme' : 'Maßnahmen'} zu erledigen`
  return 'Alles im Zielbereich'
})
const subline = computed(() => {
  if (!tanks.value.length) return 'Ohne Becken lassen sich Laborwerte nicht zuordnen und Dosierungen nicht berechnen.'
  if (!completedCount.value) {
    return pipeline.value.length
      ? `${pipeline.value.length} ${pipeline.value.length === 1 ? 'Probe ist' : 'Proben sind'} unterwegs. Die Auswertung erscheint hier, sobald das Labor fertig ist.`
      : 'Registrieren Sie eine Wasserprobe, um Bewertung, Empfehlungen und Dosierung zu erhalten.'
  }
  if (!tasks.value.length) return `${completedCount.value} ${completedCount.value === 1 ? 'Bericht' : 'Berichte'} ausgewertet – keine Abweichung erfordert ein Eingreifen.`
  return `Betroffen sind ${affectedTanks.value} von ${tanks.value.length} ${tanks.value.length === 1 ? 'Becken' : 'Becken'}, bewertet nach Ihrer Bewertungsgrundlage.`
})

const figures = computed(() => {
  const rows = [{
    label: tasks.value.length === 1 ? 'Maßnahme' : 'Maßnahmen',
    value: tasks.value.length,
    caption: criticalTasks.value.length
      ? `${criticalTasks.value.length} dringend`
      : tasks.value.length
      ? 'keine dringend'
      : completedCount.value ? 'nichts offen' : 'noch keine Auswertung',
    to: '/analyses',
    tone: criticalTasks.value.length ? 'critical' : tasks.value.length ? 'watch' : completedCount.value ? 'good' : 'neutral',
  }]
  // Ein Verhältnis „0/0“ sagt nichts – die Kennzahl erscheint erst mit dem ersten Becken.
  if (tanks.value.length) {
    rows.push({
      label: 'Becken betroffen',
      value: `${affectedTanks.value}/${tanks.value.length}`,
      caption: affectedTanks.value ? 'mit offener Maßnahme' : completedCount.value ? 'alle im Ziel' : 'noch nicht bewertet',
      to: '/aquariums',
      tone: affectedTanks.value ? 'watch' : completedCount.value ? 'good' : 'neutral',
    })
  }
  if (pipeline.value.length) {
    rows.push({ label: 'Im Labor', value: pipeline.value.length, caption: 'Ergebnis offen', to: '/analyses', tone: 'neutral' })
  }
  return rows
})

const taskIntro = computed(() => {
  if (!tasks.value.length) return 'Sobald eine Auswertung eine Abweichung zeigt, steht die Maßnahme hier – mit Becken und Frist.'
  const shown = Math.min(TASK_LIMIT, tasks.value.length)
  return `${shown} von ${tasks.value.length} nach Dringlichkeit. Gleiche Bewertung wie im Laborbericht.`
})

const tankCards = computed(() => tanks.value.map((tank) => {
  const latest = latestFor(tank)
  const awaiting = latest && latest.status !== 'completed'
  const openTasks = tasks.value.filter((task) => task.tankId === tank.id)
  const findings = (latest?.issues || []).slice(0, FINDING_LIMIT)
  return {
    ...tank,
    volume: Number(tank.net_volume) || 0,
    score: latest && !awaiting ? latest.score : null,
    tone: !latest ? 'none' : awaiting ? 'open' : latest.severity,
    verdict: !latest
      ? 'Noch keine Probe eingesendet.'
      : awaiting
      ? `Probe im Labor – ${latest.statusLabel}.`
      : openTasks.length
      ? `${openTasks.length} ${openTasks.length === 1 ? 'Maßnahme' : 'Maßnahmen'} offen.`
      : 'Keine Maßnahme erforderlich.',
    findings: awaiting ? [] : findings,
    moreFindings: awaiting ? 0 : Math.max(0, (latest?.issues?.length || 0) - findings.length),
    ageLabel: !latest ? 'Keine Analyse' : awaiting ? `Eingereicht ${relativeDays(latest.createdAt)}` : `Bericht ${relativeDays(latest.completedAt || latest.createdAt)}`,
    to: latest ? `/analyses/${latest.id}` : '/analyses/activate',
    ctaLabel: !latest ? 'Analyse registrieren' : awaiting ? 'Status ansehen' : 'Bericht öffnen',
  }
}).sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || (a.score ?? 101) - (b.score ?? 101)))

function toneRank(tone) {
  return { critical: 0, watch: 1, open: 2, good: 3, none: 4 }[tone] ?? 5
}

const evaluatedTankCount = computed(() => new Set(completed.value.map((item) => item.aquariumId)).size)

// Welche Elemente fallen in mehreren Becken auf? Zählt je Becken den letzten Bericht.
const recurringDeviations = computed(() => {
  if (evaluatedTankCount.value < 2) return []
  const counter = new Map()
  const seenTanks = new Set()
  for (const analysis of completed.value) {
    if (seenTanks.has(analysis.aquariumId)) continue
    seenTanks.add(analysis.aquariumId)
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

const recentReports = computed(() => completed.value
  .slice()
  .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
  .slice(0, 5))

const todayLabel = computed(() => new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }))

function relativeDays(date) {
  if (!date) return 'unbekannt'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
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
  --amber: #f59e0b;
  --coral: #e85d4f;
  display: grid;
  gap: 16px;
}

/* ── 1 · Statuszeile ──────────────────────────────────────────────── */
.status-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 22px;
  align-items: center;
  padding: 22px 24px;
  border: 1px solid var(--border);
  border-left: 5px solid var(--green);
  border-radius: 18px;
  background: #fff;
}
.status-bar.critical { border-left-color: var(--coral); background: linear-gradient(100deg, #fff6f4, #fff 42%); }
.status-bar.watch { border-left-color: var(--amber); background: linear-gradient(100deg, #fffbeb, #fff 42%); }
.status-bar.good { border-left-color: var(--green); background: linear-gradient(100deg, #f0fdf7, #fff 42%); }
.status-bar.neutral { border-left-color: #88c1e9; }
.status-kicker { display: block; color: var(--text-muted); font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.status-copy h1 { margin: 6px 0 4px; color: var(--text); font-size: clamp(20px, 2.4vw, 27px); font-weight: 800; line-height: 1.2; }
.status-copy p { max-width: 62ch; color: var(--text-muted); font-size: 12.5px; line-height: 1.55; }
.status-figures { display: flex; gap: 8px; }
.status-figure {
  min-width: 118px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-top: 3px solid #cbd5e1;
  border-radius: 13px;
  background: #fff;
  text-decoration: none;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.status-figure:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(10,27,67,0.1); }
.status-figure.critical { border-top-color: var(--coral); }
.status-figure.watch { border-top-color: var(--amber); }
.status-figure.good { border-top-color: var(--green); }
.status-figure strong { display: block; color: var(--text); font-size: 25px; font-weight: 800; line-height: 1; }
.status-figure span { display: block; margin-top: 5px; color: var(--text); font-size: 11px; font-weight: 800; }
.status-figure em { display: block; margin-top: 1px; color: var(--text-muted); font-size: 10px; font-style: normal; }

/* ── Panel-Köpfe ──────────────────────────────────────────────────── */
.panel-head { display: flex; gap: 14px; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
.panel-head span { color: var(--brand-blue); font-size: 10px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; }
.panel-head h2 { margin-top: 3px; color: var(--text); font-size: 17px; font-weight: 800; }
.panel-head p { margin-top: 4px; max-width: 70ch; color: var(--text-muted); font-size: 11.5px; line-height: 1.5; }
.panel-head.compact { margin-bottom: 10px; align-items: center; }
.panel-head.compact h2 { font-size: 14px; }
.panel-link { align-self: center; color: var(--brand-blue); font-size: 11.5px; font-weight: 800; text-decoration: none; white-space: nowrap; }
.panel-link:hover { text-decoration: underline; }

/* ── 2 · Aufgabenliste ────────────────────────────────────────────── */
.task-panel { padding: 20px 22px; border: 1px solid var(--border); border-radius: 18px; background: #fff; }
.task-empty { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 16px; border: 1px dashed rgba(16,185,129,0.4); border-radius: 14px; background: #f0fdf7; }
.task-empty > span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--green); color: #fff; font-size: 19px; font-weight: 800; }
.task-empty strong { color: var(--text); font-size: 13.5px; }
.task-empty p { margin-top: 2px; color: var(--text-muted); font-size: 11.5px; line-height: 1.5; }

.task-list { display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; }
.task {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 13px;
  align-items: center;
  padding: 14px 15px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--amber);
  border-radius: 14px;
  background: #fff;
  animation: task-rise 0.34s ease both;
  animation-delay: var(--rise, 0ms);
}
.task.critical { border-left-color: var(--coral); background: #fffaf9; }
@keyframes task-rise { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .task { animation: none; } }
.task-rank { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; background: #eef5fb; color: var(--brand-dark); font-size: 13px; font-weight: 800; }
.task.critical .task-rank { background: #fdecea; color: #b3392c; }
.task-body { min-width: 0; }
.task-head { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
.task-chip { padding: 2px 7px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 9.5px; font-style: normal; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.task-chip.critical { background: #fdecea; color: #b3392c; }
.task-tank { color: var(--text); font-size: 11.5px; font-weight: 800; text-decoration: none; }
.task-tank:hover { color: var(--brand-blue); text-decoration: underline; }
.task-volume { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.task-body h3 { margin: 5px 0 2px; color: var(--text); font-size: 14px; font-weight: 800; line-height: 1.3; }
.task-body p { color: var(--text-muted); font-size: 11.5px; line-height: 1.5; }
.task-foot { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
.task-elements { display: flex; flex-wrap: wrap; gap: 4px; }
.task-elements b { padding: 2px 7px; border: 1px solid var(--border); border-radius: 7px; background: #f6f9fd; color: var(--text); font-size: 10px; font-weight: 800; }
.task-recheck { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.task-open {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 9px 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--brand-blue);
  font-size: 11.5px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}
.task-open:hover { border-color: var(--brand-blue); background: var(--teal-50); }
.task-open i { font-style: normal; }

/* ── 3 · Becken + Seitenspalte ────────────────────────────────────── */
.overview-columns { display: grid; grid-template-columns: minmax(0, 1.62fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.tank-panel { padding: 20px 22px; border: 1px solid var(--border); border-radius: 18px; background: #fff; }
.tank-empty { display: grid; justify-items: start; gap: 7px; padding: 18px; border: 1px dashed var(--border); border-radius: 14px; }
.tank-empty strong { color: var(--text); font-size: 13.5px; }
.tank-empty p { max-width: 52ch; color: var(--text-muted); font-size: 11.5px; line-height: 1.5; }
.tank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 252px), 1fr)); gap: 10px; }
.tank-card { min-width: 0; display: grid; gap: 9px; padding: 14px; border: 1px solid var(--border); border-top: 3px solid #cbd5e1; border-radius: 15px; background: #fff; }
.tank-card.critical { border-top-color: var(--coral); }
.tank-card.watch { border-top-color: var(--amber); }
.tank-card.good { border-top-color: var(--green); }
.tank-card.open { border-top-color: var(--brand-blue); }
.tank-card-head { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.tank-thumb { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(150deg, var(--brand-blue), #67e8f9); }
.tank-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, #67e8f9); }
.tank-thumb.reef-nano { background: linear-gradient(150deg, #0f766e, #5eead4); }
.tank-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.tank-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.tank-ident { min-width: 0; }
.tank-ident h3 { overflow: hidden; color: var(--text); font-size: 13.5px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.tank-ident p { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.tank-score { display: flex; align-items: baseline; color: #64748b; }
.tank-score strong { font-size: 21px; font-weight: 800; line-height: 1; }
.tank-score small { font-size: 10px; font-weight: 800; }
.tank-score.critical { color: var(--coral); }
.tank-score.watch { color: #b45309; }
.tank-score.good { color: #047857; }
.tank-verdict { color: var(--text); font-size: 11.5px; font-weight: 700; }
.tank-verdict.good { color: #047857; }
.tank-verdict.critical { color: #b3392c; }
.tank-findings { display: grid; gap: 3px; margin: 0; padding: 0; list-style: none; }
.tank-findings li { position: relative; padding-left: 11px; color: var(--text-muted); font-size: 11px; line-height: 1.45; }
.tank-findings li::before { position: absolute; left: 0; content: '·'; font-weight: 800; }
.tank-findings li.more { color: var(--brand-blue); font-weight: 700; }
.tank-card-foot { display: flex; gap: 10px; align-items: center; justify-content: space-between; padding-top: 9px; border-top: 1px solid var(--border); }
.tank-card-foot > span { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.tank-cta { color: var(--brand-blue); font-size: 11px; font-weight: 800; text-decoration: none; white-space: nowrap; }
.tank-cta:hover { text-decoration: underline; }

.side-column { display: grid; gap: 12px; }
.card { padding: 16px 17px; border: 1px solid var(--border); border-radius: 16px; background: #fff; }

/* ── 4 · Häufigste Abweichungen ───────────────────────────────────── */
.deviation-hint { margin-bottom: 10px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.deviation-list { display: grid; gap: 11px; margin: 0; padding: 0; list-style: none; }
.deviation-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.deviation-top strong { color: var(--text); font-size: 12px; font-weight: 800; }
.deviation-top span { color: var(--text-muted); font-size: 10.5px; font-weight: 800; }
.deviation-track { overflow: hidden; height: 6px; margin: 4px 0 3px; border-radius: 999px; background: #eef2f7; }
.deviation-track i { display: block; height: 100%; border-radius: 999px; background: var(--amber); }
.deviation-track i.critical { background: var(--coral); }
.deviation-list em { color: var(--text-muted); font-size: 10px; font-style: normal; }

/* ── 5 · Labor + Verlauf ──────────────────────────────────────────── */
.pipeline-row,
.recent-row {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 9px 0;
  border-top: 1px solid var(--border);
  text-decoration: none;
}
.pipeline-row:hover strong,
.recent-row:hover strong { color: var(--brand-blue); }
.pipeline-row strong,
.recent-row strong { display: block; overflow: hidden; color: var(--text); font-size: 12px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.pipeline-row em,
.recent-row em { display: block; color: var(--text-muted); font-size: 10px; font-style: normal; font-weight: 700; }
.pipeline-row i { color: var(--brand-blue); font-style: normal; font-weight: 800; }
.pipeline-dot,
.recent-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--brand-blue); }
.recent-dot.good { background: var(--green); }
.recent-dot.watch { background: var(--amber); }
.recent-dot.critical { background: var(--coral); }
.recent-row b { color: #64748b; font-size: 12.5px; font-weight: 800; }
.recent-row b.good { color: #047857; }
.recent-row b.watch { color: #b45309; }
.recent-row b.critical { color: var(--coral); }
.recent-empty { padding: 10px 0; color: var(--text-muted); font-size: 11.5px; }

.register-card { display: grid; gap: 4px; border-color: rgba(0,114,206,0.3); background: var(--teal-50); text-decoration: none; }
.register-card strong { color: var(--text); font-size: 13px; font-weight: 800; }
.register-card span { color: var(--text-muted); font-size: 11px; line-height: 1.5; }
.register-card em { margin-top: 3px; color: var(--brand-blue); font-size: 11.5px; font-style: normal; font-weight: 800; }
.register-card:hover { border-color: var(--brand-blue); }

@media (max-width: 1080px) {
  .overview-columns { grid-template-columns: 1fr; }
  .status-bar { grid-template-columns: 1fr; }
  .status-figures { flex-wrap: wrap; }
  .status-figure { flex: 1 1 130px; }
}
@media (max-width: 620px) {
  .task { grid-template-columns: 30px minmax(0, 1fr); }
  .task-rank { width: 30px; height: 30px; }
  .task-open { grid-column: 2; justify-self: start; }
  .task-empty { grid-template-columns: 40px minmax(0, 1fr); }
  .task-empty .btn { grid-column: 2; justify-self: start; }
}
</style>
