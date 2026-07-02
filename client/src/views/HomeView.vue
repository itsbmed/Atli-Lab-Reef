<template>
  <div class="landing">
    <div class="lp-aurora" aria-hidden="true"></div>

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

      <div class="hero-stage">
        <figure class="reef-frame">
          <img src="/reef-tank.webp" alt="Riffaquarium" loading="eager" />
          <div class="reef-glow"></div>
        </figure>
        <div class="hero-card hero-card-score">
          <span class="hc-label">Lab Score</span>
          <strong class="hc-value">92<em>%</em></strong>
          <span class="hc-sub">Stabil · 2 Hinweise</span>
        </div>
        <div class="hero-card hero-card-gauges">
          <div class="gauge" v-for="g in heroGauges" :key="g.sym">
            <div class="gauge-top"><span>{{ g.sym }}</span><b>{{ g.val }}</b></div>
            <div class="gauge-track"><span class="gauge-fill" :style="{ width: g.pos + '%' }"></span></div>
          </div>
        </div>
      </div>
    </main>

    <section id="leistungen" class="lp-strip">
      <div class="strip-head">
        <span class="eyebrow"><i></i> Was Sie bekommen</span>
        <h2>Aus 39 Messwerten wird ein klarer Plan.</h2>
        <p>Kein Rätselraten mehr über Tabellen — Ihr Wasserbericht zeigt, was gut läuft und was Aufmerksamkeit braucht.</p>
      </div>
      <div class="strip-grid">
        <div class="strip-card" v-for="f in features" :key="f.title">
          <span class="strip-ico" v-html="f.icon"></span>
          <strong>{{ f.title }}</strong>
          <p>{{ f.text }}</p>
        </div>
      </div>
    </section>

    <section class="lp-cta">
      <div class="lp-cta-inner">
        <h2>Bereit, Ihr Wasser wirklich zu verstehen?</h2>
        <p>Starten Sie Ihre erste ICP-Analyse — in wenigen Minuten eingerichtet.</p>
        <RouterLink to="/register" class="btn btn-primary btn-lg">Jetzt Analyse starten</RouterLink>
      </div>
    </section>

    <footer class="lp-footer">
      <span>© 2026 ATI Aquaristik. Alle Rechte vorbehalten.</span>
      <div class="lp-footer-links"><a href="#">Impressum</a><a href="#">Datenschutz</a><a href="#">AGB</a></div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Sticky-Navbar bekommt beim Scrollen Hintergrund und Schatten.
const scrolled = ref(false)
function onScroll() { scrolled.value = window.scrollY > 12 }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

// Beispiel-Messwerte für die schwebende Karte im Hero.
const heroGauges = [
  { sym: 'Ca', val: '420', pos: 62 },
  { sym: 'KH', val: '8.1', pos: 54 },
  { sym: 'Mg', val: '1350', pos: 70 },
]

// Feature-Strip (zweiter Abschnitt).
const features = [
  { title: 'Verständlicher Bericht', text: 'Scores, Ampeln und Klartext statt roher Zahlenkolonnen.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M4 4v16h16"/><path d="M8 14l3-3 3 2 4-5"/></svg>` },
  { title: '39 Wasserwerte', text: 'Von Calcium bis Spurenelement — alles auf einen Blick.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>` },
  { title: 'Echtes ICP-Labor', text: 'Analyse in einem echten Labor, Made in Germany.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M9 3h6"/><path d="M10 3v6l-4.5 8A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7.5 14h9"/></svg>` },
  { title: 'Konkrete Empfehlungen', text: 'Was zu tun ist — in der richtigen Reihenfolge.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>` },
]
</script>

<style scoped>
.landing {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 12% 0%, rgba(136,193,233,0.22), transparent 28rem),
    linear-gradient(180deg, #f9fdfc 0%, var(--bg) 100%);
}
.lp-aurora { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.lp-aurora::before, .lp-aurora::after { content: ''; position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; }
.lp-aurora::before { width: 460px; height: 460px; top: -120px; left: -80px; background: radial-gradient(circle, rgba(0,114,206,0.35), transparent 70%); }
.lp-aurora::after { width: 520px; height: 520px; top: 40px; right: -140px; background: radial-gradient(circle, rgba(0,190,208,0.26), transparent 70%); }
.lp-hero { position: relative; z-index: 1; }
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
.lp-hero { min-height: calc(100vh - 72px); display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(32px, 5vw, 60px); align-items: center; max-width: 1240px; width: 100%; margin: 0 auto; padding: clamp(36px, 7vw, 84px) clamp(20px, 4vw, 48px); }
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

/* Hero-Visual */
.hero-stage { position: relative; }
.reef-frame { position: relative; margin: 0; border-radius: 28px; overflow: hidden; aspect-ratio: 4 / 3.4; box-shadow: 0 40px 90px rgba(10,27,67,0.28); }
.reef-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
.reef-glow { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, transparent 50%, rgba(10,27,67,0.35)); }
.hero-card { position: absolute; z-index: 2; padding: 14px 16px; border-radius: 18px; background: rgba(255,255,255,0.92); backdrop-filter: blur(14px); box-shadow: 0 22px 50px rgba(10,27,67,0.2); }
.hero-card-score { top: 22px; left: -18px; display: flex; flex-direction: column; gap: 2px; }
.hc-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); }
.hc-value { font-size: 30px; font-weight: 800; line-height: 1; letter-spacing: -0.03em; color: var(--brand-blue); }
.hc-value em { font-size: 16px; font-style: normal; color: var(--brand-cyan); }
.hc-sub { font-size: 11.5px; color: var(--text-muted); }
.hero-card-gauges { right: -16px; bottom: 20px; width: 176px; display: flex; flex-direction: column; gap: 9px; }
.gauge-top { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
.gauge-top span { color: var(--text-muted); font-weight: 700; }
.gauge-top b { color: var(--text); font-weight: 800; }
.gauge-track { margin-top: 5px; height: 6px; border-radius: 999px; background: rgba(100,130,165,0.16); overflow: hidden; }
.gauge-fill { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand-blue), var(--brand-cyan)); }
@media (max-width: 900px) {
  .lp-hero { grid-template-columns: 1fr; }
  .hero-card-score { left: 12px; }
  .hero-card-gauges { right: 12px; }
}
@media (max-width: 600px) {
  .hero-copy > p { font-size: 15px; }
  .hero-actions { gap: 10px; }
  .hero-actions .btn { flex: 1; text-align: center; }
  .hero-trust { gap: 14px; }
  .hero-card { padding: 11px 13px; }
  .hero-card-gauges { width: 150px; }
}

/* Zweiter Abschnitt: Feature-Strip */
.lp-strip { position: relative; z-index: 1; max-width: 1160px; width: 100%; margin: 0 auto; padding: clamp(40px, 7vw, 80px) clamp(20px, 4vw, 48px); }
.strip-head { max-width: 640px; margin-bottom: 40px; }
.strip-head h2 { margin-top: 10px; font-size: clamp(26px, 4vw, 40px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.08; color: var(--text); }
.strip-head > p { margin-top: 14px; color: var(--text-muted); font-size: 16px; line-height: 1.6; }
.strip-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.strip-card { padding: 24px 22px; border-radius: 22px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); transition: transform 0.16s, box-shadow 0.16s; }
.strip-card:hover { transform: translateY(-4px); box-shadow: 0 22px 50px rgba(10,27,67,0.12); }
.strip-ico { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 16px; border-radius: 15px; color: #fff; background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); box-shadow: 0 12px 26px rgba(0,114,206,0.3); }
.strip-card strong { display: block; margin-bottom: 7px; font-size: 16px; font-weight: 800; letter-spacing: -0.01em; color: var(--text); }
.strip-card p { color: var(--text-muted); font-size: 13.5px; line-height: 1.55; }
@media (max-width: 900px) { .strip-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .strip-grid { grid-template-columns: 1fr; } }

/* Abschluss-CTA */
.lp-cta { position: relative; z-index: 1; max-width: 1160px; width: 100%; margin: 0 auto clamp(40px, 6vw, 72px); padding: 0 clamp(20px, 4vw, 48px); }
.lp-cta-inner { position: relative; overflow: hidden; text-align: center; padding: clamp(40px, 6vw, 64px) 32px; border-radius: 28px; color: #fff; background: linear-gradient(135deg, var(--brand-blue), #0a1b43); box-shadow: 0 30px 70px rgba(10,27,67,0.28); }
.lp-cta-inner h2 { font-size: clamp(26px, 4vw, 38px); font-weight: 800; letter-spacing: -0.03em; }
.lp-cta-inner p { max-width: 480px; margin: 12px auto 24px; color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; }
.lp-cta-inner .btn-primary { background: #fff; color: var(--brand-blue); }
.lp-cta-inner .btn-primary:hover { background: rgba(255,255,255,0.9); }

/* Footer */
.lp-footer { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; max-width: 1160px; width: 100%; margin: 0 auto; padding: 24px clamp(20px, 4vw, 48px) 40px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-muted); }
.lp-footer-links a { color: var(--text-muted); margin-left: 18px; }
.lp-footer-links a:hover { color: var(--teal-700); }
@media (max-width: 520px) { .lp-footer-links a { margin: 0 18px 0 0; } }
</style>
