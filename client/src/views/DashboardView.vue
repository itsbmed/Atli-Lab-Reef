<template>
  <main class="nd-home">
    <section class="nd-hero">
      <div class="nd-hero-copy">
        <span class="nd-badge"><i></i> ATI Reef Lab · Einrichtung</span>
        <h1>Willkommen{{ firstName ? `, ${firstName}` : '' }}.<br />Noch 2 Schritte bis zum Dashboard.</h1>
        <p>Ihr Health-Dashboard schaltet sich automatisch frei, sobald Ihr erstes Aquarium angelegt und eine Analyse registriert ist. Wir führen Sie Schritt für Schritt.</p>
      </div>
      <div class="nd-setup"></div>
    </section>
  </main>
</template>

<script setup>
// Dashboard für neue Kunden — wird schrittweise aufgebaut.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const firstName = computed(() => (auth.user?.name || '').split(' ')[0])
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

@media (max-width: 1040px) {
  .nd-hero { grid-template-columns: 1fr; }
}
</style>
