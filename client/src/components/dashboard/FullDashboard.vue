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

@media (max-width: 860px) {
  .fd-hero { grid-template-columns: 1fr; }
  .fd-portfolio { min-height: 200px; }
}
</style>
