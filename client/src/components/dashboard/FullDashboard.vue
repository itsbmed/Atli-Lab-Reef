<template>
  <div class="dashboard-home">
    <section class="overview-hero">
      <div class="overview-copy">
        <div class="hero-kicker">ATI Reef Lab · Portfolio Command</div>
        <h1>{{ dashboardGreeting }}</h1>
        <p>{{ dashboardSummary }}</p>
        <div class="hero-actions">
          <RouterLink to="/analyses/activate" class="btn btn-primary">Neue Analyse registrieren</RouterLink>
          <RouterLink to="/analyses" class="btn btn-ghost">Problemberichte ansehen</RouterLink>
        </div>
      </div>

      <div class="portfolio-card">
        <div class="portfolio-image">
          <img v-if="featuredTank?.image" :src="featuredTank.image" alt="" />
          <div v-else :class="`tank-thumb ${featuredTankTheme}`"></div>
        </div>
        <div class="portfolio-score" :style="portfolioRingStyle">
          <strong>{{ overallScore }}</strong>
          <span>%</span>
        </div>
        <div class="portfolio-meta">
          <span>Portfolio Score</span>
          <strong>{{ portfolioLabel }}</strong>
          <em>{{ criticalAnalyses.length }} kritisch · {{ watchAnalyses.length }} beobachten</em>
        </div>
      </div>
    </section>

    <section class="command-strip">
      <RouterLink v-for="item in commandCards" :key="item.label" :to="item.to" :class="['command-card', item.tone]">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <em>{{ item.caption }}</em>
      </RouterLink>
    </section>

    <section class="overview-layout">
      <main class="tank-section">
        <div class="section-header">
          <div>
            <div class="section-title">Aquarium Health</div>
            <p class="section-sub">Die letzten Laborwerte pro Becken, sortiert nach Aufmerksamkeit.</p>
          </div>
          <RouterLink to="/aquariums" class="section-link">Alle anzeigen</RouterLink>
        </div>

        <div class="tank-grid">
          <RouterLink v-for="tank in tankCards" :key="tank.id" :to="`/aquariums/${tank.id}`" :class="['tank-card', tank.tone]">
            <div class="tank-visual">
              <img v-if="tank.image" :src="tank.image" alt="" />
              <div v-else :class="`tank-thumb ${tank.image_theme}`"></div>
              <span>{{ tank.water_type }}</span>
            </div>
            <div class="tank-body">
              <div class="tank-top">
                <div>
                  <h3>{{ tank.name }}</h3>
                  <p>{{ tank.net_volume }} L · {{ tank.aquarium_type || 'Profil' }}</p>
                </div>
                <div class="tank-score">{{ tank.score ?? '—' }}<small v-if="tank.score !== null">%</small></div>
              </div>
              <div class="health-track">
                <span :style="{ width: `${tank.score || 0}%` }"></span>
              </div>
              <div class="tank-footer">
                <span>{{ tank.issueCount }} Hinweise</span>
                <em>{{ tank.lastDate ? formatDateShort(tank.lastDate) : 'Keine Analyse' }}</em>
              </div>
            </div>
          </RouterLink>
        </div>
      </main>

      <aside class="intelligence-panel card">
        <div class="section-header">
          <div class="section-title">Analyse Intelligence</div>
          <RouterLink to="/analyses" class="section-link">Öffnen</RouterLink>
        </div>

        <div class="issue-focus" v-if="priorityAnalysis">
          <span>Höchste Priorität</span>
          <strong>{{ priorityAnalysis.aquariumName }}</strong>
          <p>{{ priorityCopy(priorityAnalysis) }}</p>
          <RouterLink to="/analyses" class="btn btn-outline btn-sm">Bericht prüfen</RouterLink>
        </div>

        <div class="analysis-feed">
          <RouterLink v-for="a in recentAnalyses" :key="a.id" to="/analyses" class="feed-row">
            <span :class="['feed-dot', analysisTone(a)]"></span>
            <div>
              <strong>{{ a.aquariumName }}</strong>
              <em>{{ formatDate(a.createdAt) }} · {{ resultLabel(a) }}</em>
            </div>
            <b>{{ a.score ?? '—' }}<template v-if="a.score !== null">%</template></b>
          </RouterLink>
        </div>
      </aside>
    </section>

    <section class="insight-dashboard">
      <div class="card trend-card">
        <div class="section-header">
          <div>
            <div class="section-title">Stabilitätsverlauf</div>
            <p class="section-sub">Dummy-Trend aus den letzten Portfolio-Analysen.</p>
          </div>
          <RouterLink to="/analyses" class="section-link">Chronik</RouterLink>
        </div>
        <div class="chronik-mini large">
          <Line :data="miniChartData" :options="miniChartOptions" />
        </div>
      </div>

      <div class="card actions-card">
        <div class="section-header">
          <div class="section-title">Nächste Schritte</div>
        </div>
        <div class="next-actions">
          <RouterLink v-for="action in nextActions" :key="action.title" :to="action.to" class="next-action">
            <span>{{ action.code }}</span>
            <div>
              <strong>{{ action.title }}</strong>
              <em>{{ action.caption }}</em>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import { useAquariumsStore } from '@/stores/aquariums'
import { useAnalysesStore } from '@/stores/analyses'
import { tankStat } from '@/services/dashboardDemo'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const aquariums = useAquariumsStore()
const analyses = useAnalysesStore()

onMounted(() => {
  aquariums.load()
  analyses.load()
})

const recentAnalyses = computed(() => analyses.items.slice(0, 6))
const completedAnalyses = computed(() => analyses.items.filter((a) => a.score !== null && a.score !== undefined))

function latestAnalysisForTank(tank) {
  return analyses.items.find((a) => a.aquariumId === tank.id || a.aquariumName === tank.name) || null
}

function analysisTone(a) {
  const score = a?.score ?? 100
  if (score < 86 || (a?.issueCount || 0) >= 3) return 'critical'
  if (score < 96 || (a?.issueCount || 0) > 0) return 'watch'
  return 'good'
}

const tankCards = computed(() => aquariums.items.map((profile, index) => {
  const latest = latestAnalysisForTank(profile)
  const fallback = tankStat(index)
  const score = latest?.score ?? fallback.score
  const issueCount = latest?.issueCount ?? fallback.issueCount
  return {
    ...profile,
    score,
    issueCount,
    lastDate: latest?.createdAt || fallback.lastDate,
    tone: latest ? analysisTone(latest) : (fallback.tone === 'warn' ? 'watch' : fallback.tone),
  }
}).sort((a, b) => (a.score ?? 101) - (b.score ?? 101)))

const latestAnalysesByTank = computed(() => tankCards.value.map((tank) => tank.latestAnalysis).filter(Boolean))
const overallScore = computed(() => {
  const scores = tankCards.value.map((tank) => tank.score).filter((score) => score !== null && score !== undefined)
  if (!scores.length) return 100
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
})
const criticalAnalyses = computed(() => analyses.items.filter((a) => analysisTone(a) === 'critical'))
const watchAnalyses = computed(() => analyses.items.filter((a) => analysisTone(a) === 'watch'))
const priorityAnalysis = computed(() => {
  if (!analyses.items.length) return null
  return [...analyses.items].sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0]
})
const featuredTank = computed(() => tankCards.value[0] || null)
const featuredTankTheme = computed(() => featuredTank.value?.image_theme || 'reef-sps')

const portfolioLabel = computed(() => {
  if (overallScore.value >= 96) return 'Sehr stabil'
  if (overallScore.value >= 88) return 'Gut mit Beobachtung'
  return 'Aktive Korrektur'
})
const dashboardGreeting = computed(() => {
  if (criticalAnalyses.value.length) return `${criticalAnalyses.value.length} Berichte brauchen Aufmerksamkeit`
  if (watchAnalyses.value.length) return 'Ihre Aquarien sind stabil, mit Beobachtungspunkten'
  return 'Ihre Aquarien laufen stabil'
})
const dashboardSummary = computed(() => `${aquariums.count} Becken, ${analyses.count} Laborberichte und ein Portfolio-Score von ${overallScore.value}%.`)
const portfolioRingStyle = computed(() => {
  const color = overallScore.value >= 96 ? '#10b981' : overallScore.value >= 88 ? '#f59e0b' : '#e85d4f'
  return { background: `conic-gradient(${color} ${overallScore.value * 3.6}deg, rgba(255,255,255,0.18) 0deg)` }
})
const commandCards = computed(() => [
  { label: 'Becken', value: aquariums.count, caption: 'aktive Profile', to: '/aquariums', tone: 'good' },
  { label: 'Kritisch', value: criticalAnalyses.value.length, caption: 'Berichte prüfen', to: '/analyses', tone: 'critical' },
  { label: 'Beobachten', value: watchAnalyses.value.length, caption: 'leichte Abweichungen', to: '/analyses', tone: 'watch' },
  { label: 'Laborberichte', value: analyses.count, caption: 'im Dummy-System', to: '/analyses', tone: 'neutral' },
])
const nextActions = computed(() => [
  { code: 'ICP', title: 'Neue Analyse registrieren', caption: 'Barcode scannen oder manuell eingeben', to: '/analyses/activate' },
  { code: 'FIX', title: priorityAnalysis.value ? `${priorityAnalysis.value.aquariumName} prüfen` : 'Berichte prüfen', caption: priorityAnalysis.value ? priorityCopy(priorityAnalysis.value) : 'Alle Laborberichte öffnen', to: '/analyses' },
  { code: 'TRD', title: 'Trends vergleichen', caption: 'Langzeitverlauf der wichtigsten Elemente', to: '/analyses' },
])

const miniChartData = computed(() => {
  const labels = completedAnalyses.value.length
    ? completedAnalyses.value.slice().reverse().slice(-6).map((a) => formatDateShort(a.createdAt))
    : ['28.11.23', '12.12.23', '10.02.24', '29.04.24']
  const data = completedAnalyses.value.length
    ? completedAnalyses.value.slice().reverse().slice(-6).map((a) => a.score)
    : [52, 61, 76, overallScore.value]
  return {
    labels,
    datasets: [{
      data,
      borderColor: '#0072CE',
      backgroundColor: 'rgba(136,193,233,0.08)',
      borderWidth: 2,
      pointRadius: 5,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#0072CE',
      pointBorderWidth: 2,
      fill: true,
      tension: 0.4,
    }],
  }
})
const miniChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#5b7a99' } },
    y: { min: 0, max: 100, grid: { color: '#e9f1fb' }, ticks: { font: { size: 10 }, color: '#5b7a99', callback: v => `${v}%` } },
  },
}

function priorityCopy(analysis) {
  if (analysis.score === null || analysis.score === undefined) return 'Wartet auf Laborwerte'
  return `${analysis.issueCount || 0} auffällige Werte · Score ${analysis.score}%`
}
function resultLabel(analysis) {
  if (analysis.score === null || analysis.score === undefined) return 'Wartet auf Labor'
  if (analysis.score >= 90) return 'Alles in Ordnung'
  return (analysis.issueCount || 0) > 0 ? `${analysis.issueCount} Hinweise` : 'Alles in Ordnung'
}
function formatDate(d) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
function formatDateShort(d) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
</script>

<style scoped>
.dashboard-home {
  --home-blue: #0072CE;
  --home-panel: rgba(255,255,255,0.9);
  --home-line: rgba(10,27,67,0.1);
  --green: #10b981;
  --amber: #f59e0b;
  --coral: #e85d4f;
  --fw-heading-strong: 800;
  --fw-heading: 800;
  --fw-label: 800;
  --fw-bold: 700;
}
.overview-hero {
  display: grid;
  grid-template-columns: minmax(min(100%, 520px), 0.92fr) minmax(min(100%, 360px), 1.08fr);
  gap: clamp(24px, 4vw, 48px);
  align-items: stretch;
  min-height: 430px;
  margin-bottom: 18px;
  padding: clamp(30px, 5vw, 54px);
  border-radius: 30px;
  background:
    linear-gradient(105deg, rgba(10,27,67,0.98), rgba(10,27,67,0.9) 45%, rgba(10,27,67,0.54)),
    url('/reef-tank.webp') center bottom / cover;
  color: #fff;
  box-shadow: 0 30px 86px rgba(10,27,67,0.24);
  position: relative;
  overflow: hidden;
}
.overview-hero::after {
  content: '';
  position: absolute;
  right: 43%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(transparent, rgba(136,193,233,0.44), transparent);
}
.overview-copy,
.portfolio-card { position: relative; z-index: 1; }
.hero-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--teal-200); font-weight: var(--fw-label); margin-bottom: 8px; }
.overview-copy h1 {
  max-width: 760px;
  font-size: clamp(42px, 6vw, 78px);
  line-height: 0.92;
  font-weight: var(--fw-heading-strong);
  letter-spacing: -0.06em;
  margin-bottom: 18px;
}
.overview-copy p {
  max-width: 620px;
  color: rgba(255,255,255,0.74);
  font-size: 16px;
  line-height: 1.75;
}
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.btn-ghost { background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.18); }
.btn-outline { background: #fff; color: var(--brand-blue); border: 1px solid rgba(136,193,233,0.44); }
.btn-sm { padding: 9px 14px; font-size: 12px; }
.portfolio-card {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  align-items: end;
  padding: 0;
  border-radius: 26px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(18px);
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0,0,0,0.3);
}
.portfolio-image { position: relative; height: clamp(250px, 27vw, 360px); min-height: 0; overflow: hidden; }
.portfolio-image img,
.portfolio-image .tank-thumb { display: block; width: 100%; height: 100%; min-height: 0; border-radius: 0; object-fit: cover; object-position: center; }
.portfolio-image::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(10,27,67,0.58)); }
.portfolio-score {
  position: absolute;
  left: 22px;
  bottom: 90px;
  width: 122px;
  height: 122px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  z-index: 2;
}
.portfolio-score::after {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  background: linear-gradient(rgba(10,27,67,0.9), rgba(10,27,67,0.94)), url('/reef-tank.webp') center / cover;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
}
.portfolio-score strong,
.portfolio-score span { position: relative; z-index: 1; }
.portfolio-score strong { align-self: end; font-size: 42px; font-weight: var(--fw-heading-strong); letter-spacing: -0.06em; }
.portfolio-score span { align-self: start; margin-top: -8px; font-size: 12px; color: rgba(255,255,255,0.62); font-weight: var(--fw-label); }
.portfolio-meta { min-height: 98px; padding: 22px 22px 22px 166px; background: rgba(255,255,255,0.94); color: var(--text); }
.portfolio-meta span { display: block; color: var(--teal-700); font-size: 11px; font-weight: var(--fw-label); letter-spacing: 0.1em; text-transform: uppercase; }
.portfolio-meta strong { display: block; margin-top: 5px; font-size: 24px; line-height: 1.05; font-weight: var(--fw-heading); letter-spacing: -0.03em; }
.portfolio-meta em { display: block; margin-top: 8px; color: var(--text-muted); font-style: normal; font-size: 12px; font-weight: var(--fw-label); }
.tank-thumb { background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan)); }
.tank-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.tank-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.tank-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.command-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.command-card {
  display: block;
  min-height: 116px;
  padding: 18px 20px;
  border-radius: 20px;
  color: inherit;
  text-decoration: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.82));
  border: 1px solid rgba(136,193,233,0.2);
  border-top: 3px solid var(--home-blue);
  box-shadow: 0 14px 36px rgba(10,27,67,0.055);
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
}
.command-card:hover { transform: translateY(-2px); box-shadow: 0 22px 60px rgba(10,27,67,0.1); border-color: rgba(136,193,233,0.36); }
.command-card span { display: block; color: var(--text-muted); font-size: 11px; font-weight: var(--fw-label); letter-spacing: 0.08em; text-transform: uppercase; }
.command-card strong { display: block; margin-top: 12px; color: var(--text); font-size: 32px; line-height: 1; font-weight: var(--fw-heading-strong); letter-spacing: -0.05em; }
.command-card em { display: block; margin-top: 6px; color: var(--teal-700); font-style: normal; font-size: 12px; font-weight: var(--fw-bold); }
.command-card.critical em { color: var(--coral); }
.command-card.watch em { color: var(--amber); }
.overview-layout {
  display: grid;
  grid-template-columns: minmax(min(100%, 620px), 1fr) minmax(min(100%, 340px), 0.38fr);
  gap: 24px;
  align-items: start;
  margin-bottom: 24px;
}
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.section-title { color: var(--text); font-size: 19px; font-weight: var(--fw-heading-strong); letter-spacing: -0.02em; }
.section-sub { color: var(--text-muted); font-size: 12px; font-weight: var(--fw-bold); margin-top: 2px; }
.section-link { color: var(--brand-blue); font-size: 13px; font-weight: var(--fw-bold); white-space: nowrap; }
.tank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; }
.tank-card {
  overflow: hidden;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  min-height: 190px;
  color: inherit;
  text-decoration: none;
  border-radius: 22px;
  background: var(--home-panel);
  border: 1px solid rgba(136,193,233,0.18);
  box-shadow: 0 18px 52px rgba(10,27,67,0.07);
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
}
.tank-card:hover { transform: translateY(-3px); box-shadow: 0 26px 70px rgba(10,27,67,0.12); border-color: rgba(136,193,233,0.36); }
.tank-card.critical { border-color: rgba(232,93,79,0.32); }
.tank-card.watch { border-color: rgba(245,158,11,0.3); }
.tank-card.good { border-color: rgba(16,185,129,0.24); }
.tank-visual { position: relative; width: 190px; height: 100%; min-height: 190px; overflow: hidden; }
.tank-visual img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.tank-visual .tank-thumb { display: block; width: 100%; height: 100%; border-radius: 0; }
.tank-visual span {
  position: absolute;
  left: 14px;
  top: 14px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(10,27,67,0.58);
  color: #fff;
  font-size: 11px;
  font-weight: var(--fw-bold);
  backdrop-filter: blur(10px);
}
.tank-body { padding: 20px; display: flex; flex-direction: column; justify-content: space-between; }
.tank-top { display: flex; justify-content: space-between; gap: 14px; align-items: start; }
.tank-top h3 { font-size: 18px; font-weight: var(--fw-heading-strong); color: var(--text); letter-spacing: -0.03em; }
.tank-top p { color: var(--text-muted); font-size: 12px; font-weight: var(--fw-label); margin-top: 2px; }
.tank-score { color: var(--text); font-size: 28px; line-height: 1; font-weight: var(--fw-heading-strong); letter-spacing: -0.05em; }
.tank-score small { font-size: 12px; color: var(--text-muted); margin-left: 1px; }
.health-track { height: 10px; border-radius: 999px; background: rgba(100,130,165,0.14); overflow: hidden; margin: 15px 0 12px; }
.health-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--teal-400), var(--green)); }
.tank-card.watch .health-track span { background: linear-gradient(90deg, var(--amber), var(--teal-400)); }
.tank-card.critical .health-track span { background: linear-gradient(90deg, var(--coral), var(--amber)); }
.tank-footer { display: flex; justify-content: space-between; gap: 12px; color: var(--text-muted); font-size: 12px; font-weight: var(--fw-bold); }
.tank-footer em { font-style: normal; color: var(--teal-700); }
.card,
.intelligence-panel.card,
.trend-card.card,
.actions-card.card {
  background: var(--home-panel);
  border: 1px solid rgba(136,193,233,0.18);
  border-radius: var(--radius);
  box-shadow: 0 18px 52px rgba(10,27,67,0.07);
}
.intelligence-panel { position: sticky; top: 98px; padding: 18px; }
.issue-focus {
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255,255,255,0.94), rgba(253,240,238,0.9));
  border: 1px solid rgba(232,93,79,0.2);
  margin-bottom: 14px;
}
.issue-focus span { display: block; color: var(--coral); font-size: 11px; font-weight: var(--fw-label); letter-spacing: 0.08em; text-transform: uppercase; }
.issue-focus strong { display: block; margin-top: 5px; color: var(--text); font-size: 22px; font-weight: var(--fw-label); letter-spacing: -0.03em; }
.issue-focus p { color: var(--text-muted); font-size: 13px; margin: 3px 0 12px; }
.analysis-feed { display: grid; gap: 8px; }
.feed-row {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  color: inherit;
  text-decoration: none;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(10,27,67,0.08);
}
.feed-row:hover { background: var(--teal-50); }
.feed-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); }
.feed-dot.watch { background: var(--amber); }
.feed-dot.critical { background: var(--coral); }
.feed-row strong { display: block; color: var(--text); font-size: 13px; font-weight: var(--fw-label); }
.feed-row em { display: block; color: var(--text-muted); font-size: 11px; font-style: normal; font-weight: var(--fw-bold); }
.feed-row b { color: var(--text); font-size: 13px; }
.insight-dashboard {
  display: grid;
  grid-template-columns: minmax(min(100%, 560px), 1fr) minmax(min(100%, 320px), 0.38fr);
  gap: 24px;
}
.trend-card,
.actions-card { padding: 18px; }
.chronik-mini.large { height: 250px; }
.next-actions { display: grid; gap: 10px; }
.next-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border-radius: 18px;
  color: inherit;
  text-decoration: none;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(10,27,67,0.08);
}
.next-action:hover { background: var(--teal-50); }
.next-action > span {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  background: var(--teal-100);
  color: var(--teal-800);
  font-size: 11px;
  font-weight: var(--fw-heading-strong);
}
.next-action strong { display: block; color: var(--text); font-size: 14px; font-weight: var(--fw-heading-strong); }
.next-action em { display: block; color: var(--text-muted); font-size: 12px; font-style: normal; font-weight: var(--fw-bold); }
@media (max-width: 1040px) {
  .overview-hero,
  .overview-layout,
  .insight-dashboard { grid-template-columns: 1fr; }
  .portfolio-card { max-width: 520px; }
  .overview-hero::after { display: none; }
  .intelligence-panel { position: static; }
}
@media (max-width: 760px) {
  .overview-hero { padding: 26px; }
  .portfolio-card { grid-template-columns: 1fr; }
  .portfolio-image { height: 230px; }
  .command-strip,
  .tank-grid { grid-template-columns: 1fr; }
  .tank-card { grid-template-columns: 1fr; min-height: 0; }
  .tank-visual { width: 100%; height: 170px; min-height: 170px; }
  .portfolio-score { left: 18px; bottom: 96px; width: 104px; height: 104px; }
  .portfolio-score strong { font-size: 34px; }
  .portfolio-meta { padding-left: 138px; }
}
</style>
