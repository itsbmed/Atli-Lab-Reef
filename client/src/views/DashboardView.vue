<template>
  <main class="nd-home">
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
  </main>
</template>

<script setup>
// Dashboard für neue Kunden — wird schrittweise aufgebaut.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
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
</script>

<style scoped>
.nd-home {
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(20px, 3vw, 38px);
  min-height: 100vh;
}

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
.nd-setup-ring b { position: relative; z-index: 1; font-size: 18px; font-weight: 800; letter-spacing: -0.04em; }
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

@media (max-width: 1040px) {
  .nd-hero { grid-template-columns: 1fr; }
}
</style>
