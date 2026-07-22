<template>
  <FullDashboard v-if="isFull" />
  <main v-else class="nd-home">
    <section class="nd-hero">
      <div class="nd-hero-copy">
        <span class="nd-badge"><i></i> ATI Reef Lab · Einrichtung</span>
        <h1>Willkommen{{ firstName ? `, ${firstName}` : '' }}.<br />Noch 2 Schritte bis zum Dashboard.</h1>
        <p>Ihr Health-Dashboard schaltet sich automatisch frei, sobald Ihr erstes Aquarium angelegt und eine Analyse registriert ist. Wir führen Sie Schritt für Schritt.</p>
        <div class="nd-hero-actions">
          <a class="btn btn-primary btn-lg">Aquarium anlegen</a>
          <a class="btn btn-ghost btn-lg">Tools entdecken</a>
        </div>
        <div class="nd-trust">
          <div v-for="t in trustStats" :key="t.label">
            <strong>{{ t.value }}</strong>
            <span>{{ t.label }}</span>
          </div>
        </div>
      </div>
      <div class="nd-setup">
        <div class="nd-setup-head">
          <div>
            <span>Einrichtung</span>
            <strong>1 / 3 erledigt</strong>
          </div>
          <div class="nd-setup-ring" :style="{ background: 'conic-gradient(var(--brand-cyan) 119deg, rgba(255,255,255,0.16) 0deg)' }">
            <b>33<small>%</small></b>
          </div>
        </div>

        <div class="nd-setup-steps">
          <div v-for="(step, i) in setupSteps" :key="step.title" :class="['nd-setup-step', { done: step.done, active: step.active, locked: step.locked }]">
            <span class="nd-setup-check">
              <svg v-if="step.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              <template v-else>{{ i + 1 }}</template>
            </span>
            <div class="nd-setup-text">
              <strong>{{ step.title }}</strong>
              <em>{{ step.caption }}</em>
            </div>
            <span v-if="step.done" class="nd-setup-flag done">Fertig</span>
            <span v-else-if="step.locked" class="nd-setup-flag locked">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            </span>
            <span v-else class="nd-setup-arrow">→</span>
          </div>
        </div>
      </div>
    </section>

    <section class="nd-journey">
      <div class="nd-section-head">
        <div>
          <span class="nd-eyebrow">In 4 Schritten</span>
          <h2>So kommt Ihr Wasser ins ATI Labor</h2>
        </div>
        <a class="btn btn-primary">Jetzt starten</a>
      </div>
      <div class="nd-journey-track">
        <div v-for="(step, i) in journeySteps" :key="step.title" class="nd-step">
          <div class="nd-step-media">
            <span class="nd-step-num">{{ i + 1 }}</span>
            <span class="nd-step-icon" v-html="step.icon"></span>
          </div>
          <div class="nd-step-body">
            <strong>{{ step.title }}</strong>
            <p>{{ step.caption }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="nd-tips">
      <div class="nd-section-head">
        <div>
          <span class="nd-eyebrow">Gut vorbereitet</span>
          <h2>Tipps für aussagekräftige Proben</h2>
        </div>
        <a class="nd-tips-all">Alle Tipps ansehen →</a>
      </div>

      <div class="nd-bento">
        <article class="nd-feature">
          <div class="nd-feature-overlay">
            <span class="nd-feature-tag">Empfohlen</span>
            <h3>Wasserprobe richtig entnehmen</h3>
            <p>So vermeiden Sie Verfälschungen und erhalten präzise, reproduzierbare Laborwerte.</p>
            <a class="nd-feature-link">Anleitung lesen →</a>
          </div>
        </article>

        <article v-for="tip in prepTips" :key="tip.title" class="nd-tip">
          <span class="nd-tip-icon" v-html="tip.icon"></span>
          <strong>{{ tip.title }}</strong>
          <p>{{ tip.text }}</p>
        </article>

        <article class="nd-bento-cta">
          <div>
            <strong>Noch Fragen offen?</strong>
            <p>Unser Laborteam unterstützt Sie persönlich bei der Probenvorbereitung.</p>
          </div>
          <a class="btn btn-primary">Kontakt aufnehmen</a>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
// Dashboard: Vollkonto (kind === 'full') sieht das Bestandskunden-Dashboard,
// alle anderen den Einrichtungs-/Neukunden-Zustand.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import FullDashboard from '@/components/dashboard/FullDashboard.vue'

const auth = useAuthStore()
const isFull = computed(() => auth.user?.kind === 'full')
const firstName = computed(() => (auth.user?.name || '').split(' ')[0])

const trustStats = [
  { value: '40+', label: 'Elemente pro Analyse' },
  { value: 'ICP-OES', label: 'Laborpräzision' },
  { value: '50.000+', label: 'Aquarianer weltweit' },
]

const setupSteps = [
  { title: 'Konto erstellt', caption: 'Willkommen im ATI Reef Lab.', done: true },
  { title: 'Aquarium anlegen', caption: 'Volumen, Beckentyp und Besatz hinterlegen.', active: true },
  { title: 'Erste Analyse registrieren', caption: 'Testkit-Barcode erfassen und Probe einsenden.', locked: true },
]

const journeySteps = [
  { title: 'Aquarium anlegen', caption: 'Volumen, Beckentyp und Besatz hinterlegen.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 11c2 0 2.2 1.6 4.5 1.6S10 11 12 11s2.2 1.6 4.5 1.6S19 11 21 11"/></svg>` },
  { title: 'Testkit aktivieren', caption: 'Barcode scannen und mit dem Becken verknüpfen.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 8v8M10.5 8v8M14 8v8M17 8v8"/></svg>` },
  { title: 'Probe einsenden', caption: 'Röhrchen füllen und ins ATI Labor senden.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>` },
  { title: 'Ergebnisse erhalten', caption: 'Scores, Trends und Empfehlungen erscheinen online.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16h16"/><path d="M8 14l3-3 3 2 4-5"/></svg>` },
]

const prepTips = [
  { title: 'Hände vorher spülen', text: 'Keine Cremes oder Seifenreste – sie verfälschen Spurenelemente.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V6a2 2 0 0 1 4 0v5"/><path d="M11 11V5a2 2 0 0 1 4 0v6"/><path d="M15 11V7a2 2 0 0 1 4 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3L4 13a1.5 1.5 0 0 1 2.5-1.6L8 13"/></svg>` },
  { title: 'Becken nicht frisch dosiert', text: 'Mindestens 12 Stunden Abstand zu Wasserwechsel und Zugaben.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>` },
  { title: 'Röhrchen randvoll füllen', text: 'Luft im Röhrchen kann einzelne Messwerte beeinflussen.', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8"/><path d="M9 2v6l-3.5 9A2 2 0 0 0 7.4 20h9.2a2 2 0 0 0 1.9-2.6L15 8V2"/><path d="M7 14h10"/></svg>` },
]
</script>

<style scoped>
/* nd-home sitzt innerhalb der AppLayout-Content-Fläche (Breite/Padding kommen von dort). */

.nd-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: clamp(28px, 4vw, 56px);
  align-items: center;
  padding: clamp(30px, 4vw, 52px);
  margin-bottom: 22px;
  border-radius: 32px;
  color: #fff;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 85% -10%, rgba(0,190,208,0.28), transparent 42%),
    linear-gradient(115deg, rgba(10,27,67,0.99), rgba(10,27,67,0.9) 46%, rgba(0,51,102,0.82)),
    url('/reef-tank.webp') center / cover;
  box-shadow: 0 34px 90px rgba(10,27,67,0.26);
}
.nd-hero-copy { position: relative; z-index: 1; }
.nd-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(136,193,233,0.3);
  color: var(--brand-sky);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.nd-badge i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-cyan);
  box-shadow: 0 0 0 4px rgba(0,190,208,0.22);
}
.nd-hero-copy h1 {
  margin: 18px 0 14px;
  font-size: clamp(34px, 4.4vw, 56px);
  line-height: 0.98;
  font-weight: 800;
  letter-spacing: -0.05em;
}
.nd-hero-copy p {
  max-width: 540px;
  color: rgba(255,255,255,0.76);
  font-size: 15px;
  line-height: 1.7;
}
.nd-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
.nd-hero-actions .btn { cursor: pointer; }
.nd-hero-actions .btn-ghost {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.18);
}
.nd-hero-actions .btn-ghost:hover { background: rgba(255,255,255,0.18); border-color: var(--brand-cyan); }
.nd-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 26px;
  margin-top: 30px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.14);
}
.nd-trust strong {
  display: block;
  font-size: 26px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  background: linear-gradient(120deg, #fff, var(--brand-sky));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.nd-trust span {
  display: block;
  margin-top: 6px;
  color: rgba(255,255,255,0.6);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.nd-setup {
  position: relative;
  z-index: 1;
  padding: 22px;
  border-radius: 24px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(136,193,233,0.26);
  backdrop-filter: blur(18px);
  box-shadow: 0 26px 64px rgba(0,0,0,0.26);
}
.nd-setup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}
.nd-setup-head span {
  display: block;
  color: var(--brand-sky);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.nd-setup-head strong { display: block; margin-top: 5px; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
.nd-setup-ring {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
}
.nd-setup-ring::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: rgba(10,27,67,0.9);
}
.nd-setup-ring b { position: relative; z-index: 1; display: inline-flex; align-items: baseline; flex-wrap: nowrap; white-space: nowrap; font-size: 18px; font-weight: 800; letter-spacing: -0.04em; }
.nd-setup-ring small { font-size: 10px; color: rgba(255,255,255,0.6); margin-left: 1px; }
.nd-setup-steps { display: grid; gap: 10px; }
.nd-setup-step {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  gap: 13px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
}
.nd-setup-step.active { background: rgba(0,190,208,0.12); border-color: rgba(0,190,208,0.5); box-shadow: 0 0 0 1px rgba(0,190,208,0.2); }
.nd-setup-step.locked { opacity: 0.5; }
.nd-setup-check {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  font-size: 15px;
  font-weight: 800;
}
.nd-setup-check svg { width: 18px; height: 18px; }
.nd-setup-step.active .nd-setup-check { background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); color: #fff; box-shadow: 0 8px 20px rgba(0,190,208,0.4); }
.nd-setup-step.done .nd-setup-check { background: rgba(16,185,129,0.18); color: var(--good); }
.nd-setup-text strong { display: block; font-size: 14px; font-weight: 800; letter-spacing: -0.02em; }
.nd-setup-text em { display: block; margin-top: 2px; color: rgba(255,255,255,0.6); font-size: 11px; font-style: normal; font-weight: 700; line-height: 1.4; }
.nd-setup-arrow { color: var(--brand-sky); font-size: 18px; font-weight: 800; }
.nd-setup-flag { display: inline-grid; place-items: center; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.nd-setup-flag.done { padding: 4px 9px; border-radius: 999px; background: rgba(16,185,129,0.18); color: var(--good); }
.nd-setup-flag.locked svg { width: 16px; height: 16px; color: rgba(255,255,255,0.55); }

/* ── Sektionen & Überschriften ── */
.nd-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
.nd-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: var(--brand-blue);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.nd-section-head h2 {
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text);
  line-height: 1.05;
}
.nd-tips { margin-bottom: 32px; }
.nd-tips-all { color: var(--brand-blue); font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.nd-tips-all:hover { text-decoration: underline; }
.nd-bento { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: minmax(150px, 1fr); gap: 16px; }
.nd-feature {
  grid-column: 1; grid-row: 1 / 3;
  position: relative; overflow: hidden;
  min-height: 320px;
  display: flex; align-items: flex-end;
  border-radius: 22px;
  color: #fff;
  background: linear-gradient(180deg, rgba(10,27,67,0.12), rgba(10,27,67,0.86)), url('/reef-tank.webp') center / cover;
}
.nd-feature-overlay { padding: 22px; }
.nd-feature-tag { display: inline-block; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.18); backdrop-filter: blur(6px); font-size: 11px; font-weight: 700; }
.nd-feature h3 { margin: 12px 0 6px; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
.nd-feature p { max-width: 320px; font-size: 13px; line-height: 1.55; color: rgba(255,255,255,0.82); }
.nd-feature-link { display: inline-block; margin-top: 12px; font-size: 13px; font-weight: 700; color: #fff; cursor: pointer; }
.nd-feature-link:hover { text-decoration: underline; }
.nd-tip {
  display: flex; flex-direction: column; gap: 8px;
  padding: 18px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid rgba(136,193,233,0.2);
  box-shadow: var(--shadow);
  transition: transform 0.15s, box-shadow 0.15s;
}
.nd-tip:hover { transform: translateY(-3px); box-shadow: 0 18px 44px rgba(10,27,67,0.1); }
.nd-tip-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 11px; background: rgba(136,193,233,0.16); color: var(--brand-blue); }
.nd-tip-icon svg { width: 20px; height: 20px; }
.nd-tip strong { font-size: 14px; font-weight: 800; color: var(--text); letter-spacing: -0.01em; }
.nd-tip p { font-size: 12.5px; line-height: 1.5; color: var(--text-muted); }
.nd-bento-cta {
  display: flex; flex-direction: column; justify-content: space-between; gap: 14px;
  padding: 20px;
  border-radius: 22px;
  color: #fff;
  background: linear-gradient(140deg, var(--brand-blue), #0a1b43);
}
.nd-bento-cta strong { font-size: 15px; font-weight: 800; }
.nd-bento-cta p { margin-top: 6px; font-size: 12.5px; line-height: 1.5; color: rgba(255,255,255,0.78); }
.nd-bento-cta .btn { align-self: flex-start; }
@media (max-width: 720px) {
  .nd-bento { grid-template-columns: 1fr; }
  .nd-feature { grid-column: 1; grid-row: auto; min-height: 240px; }
}
.nd-journey {
  margin-bottom: 32px;
  padding: clamp(28px, 4vw, 48px);
  border-radius: 26px;
  background: #fff;
  border: 1px solid rgba(136,193,233,0.2);
  box-shadow: var(--shadow);
}
.nd-journey-track { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.nd-step {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(136,193,233,0.2);
  box-shadow: 0 16px 44px rgba(10,27,67,0.07);
  transition: transform 0.18s, box-shadow 0.18s;
}
.nd-step:hover { transform: translateY(-4px); box-shadow: 0 26px 64px rgba(10,27,67,0.13); }
.nd-step-media {
  position: relative;
  height: 132px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(0,190,208,0.12), transparent 70%),
    #f5f8fc;
  border-bottom: 1px solid rgba(136,193,233,0.22);
}
.nd-step-icon { display: grid; place-items: center; color: var(--brand-blue); }
.nd-step-icon :deep(svg) { width: 46px; height: 46px; }
.nd-step-num {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 1;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan));
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(0,114,206,0.4);
}
.nd-step-body { padding: 18px 20px 22px; }
.nd-step-body strong { display: block; color: var(--text); font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
.nd-step-body p { margin-top: 5px; color: var(--text-muted); font-size: 12px; line-height: 1.5; font-weight: 700; }

@media (max-width: 1040px) {
  .nd-journey-track { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 760px) {
  .nd-section-head { flex-direction: column; align-items: flex-start; }
  .nd-journey-track { grid-template-columns: 1fr; }
}

@media (max-width: 1040px) {
  .nd-hero { grid-template-columns: 1fr; }
}
</style>
