<template>
  <div class="fd">
    <section class="fd-hero">
      <div class="fd-hero-copy">
        <span class="fd-kicker">ATI Reef Lab · Portfolio</span>
        <h1>{{ dashboardGreeting }}</h1>
        <p>{{ dashboardSummary }}</p>
        <div class="fd-hero-actions">
          <a class="btn btn-primary btn-lg">Neue Analyse registrieren</a>
          <RouterLink to="/aquariums" class="btn btn-ghost btn-lg">Aquarien ansehen</RouterLink>
        </div>
      </div>

      <div class="fd-portfolio">
        <div class="fd-portfolio-media"><div :class="`fd-thumb ${featuredTankTheme}`"></div></div>
        <div class="fd-portfolio-ring" :style="portfolioRingStyle">
          <strong>{{ overallScore }}</strong><span>%</span>
        </div>
        <div class="fd-portfolio-meta">
          <span>Portfolio-Score</span>
          <strong>{{ portfolioLabel }}</strong>
          <em>{{ criticalAnalyses.length }} kritisch · {{ watchAnalyses.length }} beobachten</em>
        </div>
      </div>
    </section>

    <section class="fd-strip">
      <div v-for="c in commandCards" :key="c.label" :class="['fd-stat', c.tone]">
        <span class="fd-stat-label">{{ c.label }}</span>
        <strong class="fd-stat-value">{{ c.value }}</strong>
        <em class="fd-stat-caption">{{ c.caption }}</em>
      </div>
    </section>

    <section class="fd-tanks">
      <div class="fd-sec-head">
        <div>
          <h2>Aquarium Health</h2>
          <p>Letzte Laborwerte je Becken, nach Aufmerksamkeit sortiert.</p>
        </div>
        <RouterLink to="/aquariums" class="fd-sec-link">Alle anzeigen</RouterLink>
      </div>
      <div class="fd-tank-grid">
        <RouterLink v-for="t in sortedTanks" :key="t.id" :to="`/aquariums/${t.id}`" :class="['fd-tank', t.tone]">
          <div class="fd-tank-visual"><div :class="`fd-thumb ${t.image_theme}`"></div><span>{{ t.water_type }}</span></div>
          <div class="fd-tank-body">
            <div class="fd-tank-top">
              <div><h3>{{ t.name }}</h3><p>{{ t.net_volume }} L · {{ t.aquarium_type || 'Profil' }}</p></div>
              <div class="fd-tank-score">{{ t.score }}<small>%</small></div>
            </div>
            <div class="fd-health-track"><span :style="{ width: `${t.score}%` }"></span></div>
            <div class="fd-tank-foot"><span>{{ t.issueCount }} Hinweise</span><em>{{ formatDateShort(t.lastDate) }}</em></div>
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="fd-intel">
      <div class="fd-sec-head">
        <div>
          <h2>Analyse Intelligence</h2>
          <p>Neueste Laborberichte und Prioritäten.</p>
        </div>
        <a class="fd-sec-link">Alle Berichte</a>
      </div>
      <div class="fd-intel-grid">
        <div class="fd-focus" v-if="priorityAnalysis">
          <span class="fd-focus-tag">Höchste Priorität</span>
          <strong>{{ priorityAnalysis.profile_name }}</strong>
          <p>{{ priorityAnalysis.issue_count }} auffällige Werte · Score {{ priorityAnalysis.score }}%</p>
          <a class="btn btn-primary">Bericht öffnen</a>
        </div>
        <div class="fd-feed">
          <a v-for="a in demoAnalyses" :key="a.id" :class="['fd-feed-row', a.tone]">
            <span class="fd-feed-dot"></span>
            <div class="fd-feed-main"><strong>{{ a.profile_name }}</strong><em>{{ a.barcode }} · {{ a.package }}</em></div>
            <div class="fd-feed-score"><b>{{ a.score }}%</b><small>{{ a.issue_count }} Hinweise · {{ formatDateShort(a.created_at) }}</small></div>
          </a>
        </div>
      </div>
    </section>

    <section class="fd-actions">
      <div class="fd-sec-head"><div><h2>Schnellaktionen</h2></div></div>
      <div class="fd-action-grid">
        <RouterLink v-for="n in nextActions" :key="n.title" :to="n.to" class="fd-action">
          <span class="fd-action-ico" v-html="n.icon"></span>
          <div><strong>{{ n.title }}</strong><em>{{ n.caption }}</em></div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAquariumsStore } from '@/stores/aquariums'
import { tankStat, demoAnalyses } from '@/services/dashboardDemo'

const auth = useAuthStore()
const aquariums = useAquariumsStore()
const firstName = computed(() => (auth.user?.name || '').split(' ')[0])

onMounted(() => aquariums.load())

// Aquarien mit Dummy-Gesundheitswerten anreichern.
const tanks = computed(() => aquariums.items.map((a, i) => ({ ...a, ...tankStat(i) })))
const overallScore = computed(() => {
  if (!tanks.value.length) return 0
  return Math.round(tanks.value.reduce((s, t) => s + t.score, 0) / tanks.value.length)
})
const portfolioLabel = computed(() => (overallScore.value >= 85 ? 'Stabil' : overallScore.value >= 70 ? 'Beobachten' : 'Handeln'))
const criticalAnalyses = computed(() => demoAnalyses.filter((a) => a.tone === 'crit'))
const watchAnalyses = computed(() => demoAnalyses.filter((a) => a.tone === 'warn'))
const featuredTankTheme = computed(() => tanks.value[0]?.image_theme || 'reef-mixed')
const portfolioRingStyle = computed(() => ({
  background: `conic-gradient(var(--brand-cyan) ${overallScore.value * 3.6}deg, rgba(255,255,255,0.18) 0deg)`,
}))
const dashboardGreeting = computed(() => `Hallo ${firstName.value || 'zurück'}, Ihr Wasser im Blick.`)
const dashboardSummary = computed(() => `${tanks.value.length} Becken · Portfolio-Score ${overallScore.value}% · ${criticalAnalyses.value.length} kritisch, ${watchAnalyses.value.length} beobachten.`)

// KPI-Leiste.
const totalIssues = computed(() => demoAnalyses.reduce((s, a) => s + a.issue_count, 0))
const commandCards = computed(() => [
  { label: 'Aquarien', value: tanks.value.length, caption: 'aktiv im Portfolio', tone: 'neutral' },
  { label: 'Analysen', value: demoAnalyses.length, caption: 'Berichte gesamt', tone: 'neutral' },
  { label: 'Ø Portfolio-Score', value: `${overallScore.value}%`, caption: portfolioLabel.value, tone: overallScore.value >= 85 ? 'good' : overallScore.value >= 70 ? 'warn' : 'crit' },
  { label: 'Offene Hinweise', value: totalIssues.value, caption: `${criticalAnalyses.value.length} kritisch`, tone: totalIssues.value > 8 ? 'warn' : 'good' },
])

// Aquarium-Health: nach Score aufsteigend (dringendste zuerst).
const sortedTanks = computed(() => [...tanks.value].sort((a, b) => a.score - b.score))
function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

// Analyse-Intelligence: Bericht mit den meisten Auffälligkeiten zuerst.
const priorityAnalysis = computed(() => [...demoAnalyses].sort((a, b) => b.issue_count - a.issue_count)[0])

// Schnellaktionen.
const nextActions = [
  { title: 'Neue Analyse', caption: 'Testkit-Barcode registrieren', to: '/dashboard', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" width="20" height="20"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9v6M10 9v6M14 9v6M17 9v6"/></svg>` },
  { title: 'Aquarium anlegen', caption: 'Neues Becken hinzufügen', to: '/aquariums/new', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 12c2 0 2-1.5 4-1.5S9 12 11 12s2-1.5 4-1.5"/></svg>` },
  { title: 'Aquarien verwalten', caption: 'Becken & Technik pflegen', to: '/aquariums', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" width="20" height="20"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>` },
  { title: 'Berichte', caption: 'Alle Laboranalysen', to: '/dashboard', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>` },
]
</script>

<style scoped>
.fd { display: flex; flex-direction: column; gap: 22px; }

/* Hero */
.fd-hero { display: grid; grid-template-columns: 1.4fr 0.9fr; gap: 22px; align-items: stretch; }
.fd-hero-copy { display: flex; flex-direction: column; justify-content: center; }
.fd-kicker { color: var(--brand-blue); font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.fd-hero-copy h1 { margin: 10px 0; font-size: clamp(26px, 3.6vw, 40px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; color: var(--text); }
.fd-hero-copy > p { max-width: 520px; color: var(--text-muted); font-size: 15px; line-height: 1.6; }
.fd-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }

/* Portfolio-Karte */
.fd-portfolio { position: relative; overflow: hidden; min-height: 240px; display: flex; flex-direction: column; justify-content: flex-end; gap: 14px; padding: 22px; border-radius: 24px; color: #fff; box-shadow: var(--shadow); }
.fd-portfolio-media { position: absolute; inset: 0; z-index: 0; }
.fd-thumb { width: 100%; height: 100%; background: linear-gradient(150deg, var(--brand-blue), #0a1b43); }
.fd-thumb.reef-mixed { background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan)); }
.fd-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.fd-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.fd-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.fd-portfolio::after { content: ''; position: absolute; inset: 0; z-index: 1; background: linear-gradient(160deg, rgba(10,27,67,0.35), rgba(10,27,67,0.9)); }
.fd-portfolio-ring { position: relative; z-index: 2; align-self: flex-start; display: flex; align-items: center; justify-content: center; gap: 1px; width: 84px; height: 84px; border-radius: 50%; }
.fd-portfolio-ring::after { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(10,27,67,0.72); }
.fd-portfolio-ring strong { position: relative; z-index: 1; font-size: 25px; font-weight: 800; line-height: 1; }
.fd-portfolio-ring span { position: relative; z-index: 1; font-size: 12px; font-weight: 700; }
.fd-portfolio-meta { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 2px; }
.fd-portfolio-meta > span { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.7); }
.fd-portfolio-meta > strong { font-size: 18px; font-weight: 800; }
.fd-portfolio-meta em { font-size: 12px; font-style: normal; color: rgba(255,255,255,0.75); }

/* KPI-Leiste */
.fd-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.fd-stat { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 18px 20px; border-radius: 20px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.fd-stat::before { content: ''; position: absolute; left: 0; top: 16px; bottom: 16px; width: 3px; border-radius: 3px; background: var(--brand-blue); }
.fd-stat.good::before { background: #10b981; }
.fd-stat.warn::before { background: #f59e0b; }
.fd-stat.crit::before { background: #e85d4f; }
.fd-stat-label { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-muted); }
.fd-stat-value { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: var(--text); }
.fd-stat-caption { font-size: 12px; font-style: normal; color: var(--text-muted); }

/* Abschnitts-Kopf + Aquarium-Health */
.fd-sec-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.fd-sec-head h2 { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
.fd-sec-head p { margin-top: 4px; font-size: 13px; color: var(--text-muted); }
.fd-sec-link { color: var(--brand-blue); font-size: 13px; font-weight: 700; white-space: nowrap; }
.fd-tank-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 16px; }
.fd-tank { display: flex; gap: 14px; padding: 14px; border-radius: 20px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; }
.fd-tank:hover { transform: translateY(-3px); box-shadow: 0 18px 44px rgba(10,27,67,0.12); }
.fd-tank-visual { position: relative; width: 76px; flex-shrink: 0; border-radius: 14px; overflow: hidden; }
.fd-tank-visual .fd-thumb { width: 100%; height: 100%; }
.fd-tank-visual span { position: absolute; bottom: 6px; left: 6px; padding: 2px 7px; border-radius: 999px; background: rgba(255,255,255,0.9); color: var(--brand-blue); font-size: 9px; font-weight: 800; }
.fd-tank-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.fd-tank-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.fd-tank-top h3 { font-size: 15px; font-weight: 800; color: var(--text); }
.fd-tank-top p { font-size: 12px; color: var(--text-muted); }
.fd-tank-score { font-size: 22px; font-weight: 800; line-height: 1; color: var(--brand-blue); }
.fd-tank-score small { font-size: 12px; }
.fd-health-track { height: 7px; border-radius: 999px; background: rgba(100,130,165,0.16); overflow: hidden; }
.fd-health-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand-blue), var(--brand-cyan)); }
.fd-tank.warn .fd-health-track span { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.fd-tank.crit .fd-health-track span { background: linear-gradient(90deg, #e85d4f, #f87171); }
.fd-tank-foot { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); }

/* Analyse-Intelligence */
.fd-intel-grid { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
.fd-focus { padding: 20px; border-radius: 20px; color: #fff; background: linear-gradient(140deg, var(--brand-blue), #0a1b43); box-shadow: var(--shadow); }
.fd-focus-tag { display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.18); font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.fd-focus > strong { display: block; margin: 12px 0 6px; font-size: 18px; font-weight: 800; }
.fd-focus > p { margin-bottom: 16px; font-size: 13px; color: rgba(255,255,255,0.8); }
.fd-focus .btn-primary { background: #fff; color: var(--brand-blue); }
.fd-feed { display: flex; flex-direction: column; border-radius: 20px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); overflow: hidden; }
.fd-feed-row { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border); text-decoration: none; cursor: pointer; transition: background 0.12s; }
.fd-feed-row:last-child { border-bottom: 0; }
.fd-feed-row:hover { background: rgba(136,193,233,0.08); }
.fd-feed-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: #10b981; }
.fd-feed-row.warn .fd-feed-dot { background: #f59e0b; }
.fd-feed-row.crit .fd-feed-dot { background: #e85d4f; }
.fd-feed-main { flex: 1; min-width: 0; }
.fd-feed-main strong { display: block; font-size: 14px; font-weight: 700; color: var(--text); }
.fd-feed-main em { font-size: 11.5px; font-style: normal; color: var(--text-muted); }
.fd-feed-score { text-align: right; flex-shrink: 0; }
.fd-feed-score b { font-size: 17px; font-weight: 800; color: var(--brand-blue); }
.fd-feed-score small { display: block; font-size: 11px; color: var(--text-muted); }

/* Schnellaktionen */
.fd-action-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.fd-action { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 18px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); text-decoration: none; transition: transform 0.15s, border-color 0.15s; }
.fd-action:hover { transform: translateY(-3px); border-color: var(--teal-400); }
.fd-action-ico { display: grid; place-items: center; width: 42px; height: 42px; flex-shrink: 0; border-radius: 12px; color: #fff; background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); }
.fd-action strong { display: block; font-size: 14px; font-weight: 800; color: var(--text); }
.fd-action em { font-size: 11.5px; font-style: normal; color: var(--text-muted); }

@media (max-width: 860px) {
  .fd-hero { grid-template-columns: 1fr; }
  .fd-portfolio { min-height: 200px; }
  .fd-strip { grid-template-columns: repeat(2, 1fr); }
  .fd-intel-grid { grid-template-columns: 1fr; }
  .fd-action-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .fd-action-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .fd-strip { grid-template-columns: 1fr; }
}
</style>
