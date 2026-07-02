<template>
  <div class="landing">
    <header class="lp-nav" :class="{ scrolled }">
      <RouterLink to="/" class="lp-brand">
        <img src="/ati-logo.png" alt="ATI Reef Lab" />
      </RouterLink>
      <nav class="lp-nav-links">
        <a href="#leistungen">Leistungen</a>
        <a href="#ablauf">Ablauf</a>
        <a href="#labor">Labor</a>
      </nav>
      <div class="lp-actions">
        <RouterLink to="/login" class="lp-link">Einloggen</RouterLink>
        <RouterLink to="/register" class="btn btn-primary">Analyse starten</RouterLink>
      </div>
    </header>

    <main class="lp-hero">
      <div class="hero-copy">
        <span class="eyebrow"><i></i> ICP-Laboranalyse für Meerwasser</span>
        <h1>Verstehen Sie Ihr Wasser.<br /><em>Nicht nur messen.</em></h1>
        <p>Senden Sie Ihre Wasserprobe ein und erhalten Sie einen verständlichen Laborbericht mit Scores, Trends und konkreten Handlungsempfehlungen — statt einer nackten Zahlentabelle.</p>
        <div class="hero-actions">
          <RouterLink to="/register" class="btn btn-primary btn-lg">Analyse starten</RouterLink>
          <RouterLink to="/login" class="btn btn-ghost btn-lg">Einloggen</RouterLink>
        </div>
        <ul class="hero-trust">
          <li>39 gemessene Werte</li>
          <li>Echtes ICP-Labor</li>
          <li>Made in Germany</li>
        </ul>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Sticky-Navbar bekommt beim Scrollen Hintergrund und Schatten.
const scrolled = ref(false)
function onScroll() { scrolled.value = window.scrollY > 12 }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 12% 0%, rgba(136,193,233,0.22), transparent 28rem),
    linear-gradient(180deg, #f9fdfc 0%, var(--bg) 100%);
}
.lp-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px clamp(20px, 4vw, 48px);
  transition: background 0.2s, box-shadow 0.2s, backdrop-filter 0.2s;
}
.lp-nav.scrolled {
  background: rgba(251,252,253,0.85);
  backdrop-filter: blur(18px);
  box-shadow: 0 8px 30px rgba(10,27,67,0.06);
  border-bottom: 1px solid rgba(136,193,233,0.16);
}
.lp-brand { display: inline-flex; align-items: center; }
.lp-brand img { width: 92px; }
.lp-nav-links { display: flex; align-items: center; gap: 26px; }
.lp-nav-links a { color: var(--text); font-size: 14px; font-weight: var(--fw-semibold); text-decoration: none; transition: color 0.15s; }
.lp-nav-links a:hover { color: var(--teal-700); }
.lp-actions { display: flex; align-items: center; gap: 14px; }
.lp-link { color: var(--text); font-size: 14px; font-weight: var(--fw-semibold); }
.lp-link:hover { color: var(--teal-700); }
@media (max-width: 760px) { .lp-nav-links { display: none; } }
.lp-hero { flex: 1; display: flex; align-items: center; max-width: 1240px; width: 100%; margin: 0 auto; padding: clamp(36px, 7vw, 84px) clamp(20px, 4vw, 48px); }
.hero-copy { max-width: 620px; }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 18px; color: var(--teal-700); font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.eyebrow i { width: 7px; height: 7px; border-radius: 50%; background: var(--brand-cyan); box-shadow: 0 0 0 4px rgba(0,190,208,0.18); }
.hero-copy h1 { font-size: clamp(38px, 6vw, 68px); font-weight: 800; line-height: 1.02; letter-spacing: -0.04em; color: var(--text); }
.hero-copy h1 em { font-style: normal; background: linear-gradient(120deg, var(--brand-blue), var(--brand-cyan)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero-copy > p { max-width: 520px; margin: 20px 0 28px; color: var(--text-muted); font-size: 17px; line-height: 1.65; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 30px; }
.hero-trust { display: flex; flex-wrap: wrap; gap: 20px; list-style: none; padding: 0; margin: 0; }
.hero-trust li { position: relative; padding-left: 22px; color: var(--text); font-size: 13.5px; font-weight: 600; }
.hero-trust li::before { content: '✓'; position: absolute; left: 0; color: var(--brand-cyan); font-weight: 800; }
</style>
