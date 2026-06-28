<template>
  <div class="aqn">
    <RouterLink to="/aquariums" class="back-link">← Zurück zu den Aquarien</RouterLink>

    <section class="aqn-hero">
      <div>
        <span class="hero-kicker">Einrichtung · Schritt 1 von 2</span>
        <h1>Aquarium anlegen</h1>
      </div>
      <div class="aqn-hero-steps">
        <span class="aqn-hero-step active"><b>1</b> Aquarium</span>
        <i></i>
        <span class="aqn-hero-step"><b>2</b> Analyse</span>
      </div>
    </section>

    <div class="aqn-layout">
      <form class="aqn-form" @submit.prevent="submit">
        <p v-if="error" class="alert-error">{{ error }}</p>

        <!-- Formularabschnitte folgen (Grunddaten, Becken & Technik) -->

        <div class="aqn-foot">
          <RouterLink to="/aquariums" class="btn btn-ghost">Abbrechen</RouterLink>
          <button type="submit" class="btn btn-primary btn-lg" :disabled="saving">
            {{ saving ? 'Wird angelegt…' : 'Aquarium anlegen' }}
          </button>
        </div>
      </form>

      <aside class="aqn-preview">
        <!-- Live-Vorschau folgt -->
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAquariumsStore } from '@/stores/aquariums'
import { emptyAquarium } from '@/services/aquariumStore'

const router = useRouter()
const aquariums = useAquariumsStore()
const saving = ref(false)
const error = ref('')
const form = ref(emptyAquarium())

// Anlege-Logik folgt in einem späteren Schritt.
function submit() {}
</script>

<style scoped>
.back-link { display: inline-flex; margin-bottom: 16px; color: var(--text-muted); font-size: 13px; font-weight: var(--fw-semibold); text-decoration: none; }
.back-link:hover { color: var(--brand-blue); }

.aqn-hero {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
  margin-bottom: 24px; padding: clamp(24px, 4vw, 34px);
  border-radius: 24px; color: #fff;
  background: linear-gradient(135deg, var(--brand-blue), #0a1b43);
}
.hero-kicker { display: block; margin-bottom: 8px; color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.aqn-hero h1 { font-size: clamp(26px, 4vw, 38px); font-weight: 800; letter-spacing: -0.03em; }
.aqn-hero-steps { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.aqn-hero-steps i { width: 26px; height: 1px; background: rgba(255,255,255,0.3); }
.aqn-hero-step { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: var(--fw-semibold); white-space: nowrap; }
.aqn-hero-step b { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 9px; background: rgba(255,255,255,0.12); font-size: 12px; }
.aqn-hero-step.active { color: #fff; }
.aqn-hero-step.active b { background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan)); box-shadow: 0 8px 18px rgba(0,190,208,0.4); }

.aqn-layout { display: grid; grid-template-columns: 1fr 320px; gap: 22px; align-items: start; }
.aqn-form { padding: clamp(22px, 3vw, 32px); border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.alert-error { margin-bottom: 16px; padding: 11px 14px; border-radius: 12px; background: #fdecea; color: #c5392c; font-size: 13px; font-weight: 600; }
.aqn-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 24px; }

@media (max-width: 900px) {
  .aqn-layout { grid-template-columns: 1fr; }
  .aqn-hero { flex-direction: column; align-items: flex-start; gap: 16px; }
}
</style>
