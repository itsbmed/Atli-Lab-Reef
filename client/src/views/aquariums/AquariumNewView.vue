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

        <div class="aqn-section">
          <div class="aqn-section-head"><span>01</span><h2>Grunddaten</h2></div>
          <div class="form-group">
            <label>Name des Aquariums</label>
            <input v-model="form.name" type="text" placeholder="z. B. Wohnzimmer Reef" required autofocus />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Wassertyp</label>
              <select v-model="form.water_type" required>
                <option>Meerwasser</option>
                <option>Süßwasser</option>
                <option>Osmosewasser</option>
                <option>Meersalz</option>
              </select>
            </div>
            <div class="form-group">
              <label>Nettovolumen (Liter)</label>
              <input v-model.number="form.net_volume" type="number" min="1" placeholder="300" required />
            </div>
          </div>
        </div>

        <div class="aqn-section">
          <div class="aqn-section-head"><span>02</span><h2>Becken &amp; Technik <em>optional</em></h2></div>
          <div class="form-row">
            <div class="form-group">
              <label>Beckentyp</label>
              <select v-model="form.aquarium_type">
                <option value="">Bitte wählen</option>
                <option>Mischbecken</option>
                <option>SPS</option>
                <option>LPS</option>
                <option>Weichkorallen</option>
                <option>Fischbecken</option>
              </select>
            </div>
            <div class="form-group">
              <label>Maße</label>
              <input v-model="form.dimensions" type="text" placeholder="120×50×50 cm" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Zielwerte</label>
              <select v-model="form.target_mode">
                <option value="ati">ATI Empfehlung</option>
                <option value="natural">Natürliches Meerwasser</option>
                <option value="custom">Eigene Zielwerte</option>
              </select>
            </div>
            <div class="form-group">
              <label>Besatzdichte</label>
              <select v-model="form.stocking_density">
                <option value="">Bitte wählen</option>
                <option>Gering</option>
                <option>Mittel</option>
                <option>Hoch</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Beleuchtung</label>
              <select v-model="form.lighting_type">
                <option value="">Bitte wählen</option>
                <option>LED</option>
                <option>T5</option>
                <option>Hybrid</option>
                <option>Halogen</option>
              </select>
            </div>
            <div class="form-group">
              <label>Versorgungssystem</label>
              <input v-model="form.supply_system" type="text" placeholder="ATI Essentials, ION B…" />
            </div>
          </div>

          <div class="check-grid">
            <label :class="{ on: form.sump }"><input v-model="form.sump" type="checkbox" /> Technikbecken</label>
            <label :class="{ on: form.refugium }"><input v-model="form.refugium" type="checkbox" /> Algenrefugium</label>
            <label :class="{ on: form.skimmer }"><input v-model="form.skimmer" type="checkbox" /> Eiweißabschäumer</label>
          </div>
          <div v-if="form.skimmer" class="form-group">
            <label>Abschäumer Modell</label>
            <input v-model="form.skimmer_model" type="text" placeholder="z. B. ATI PowerCone" />
          </div>
          <div class="form-group">
            <label>Notizen</label>
            <textarea v-model="form.notes" rows="2" placeholder="Kurze Beschreibung…"></textarea>
          </div>
        </div>

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

.aqn-section { padding-bottom: 22px; margin-bottom: 22px; border-bottom: 1px solid var(--border); }
.aqn-section:last-of-type { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
.aqn-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.aqn-section-head span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: rgba(136,193,233,0.16); color: var(--brand-blue); font-size: 12px; font-weight: 800; }
.aqn-section-head h2 { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; color: var(--text); }
.aqn-section-head em { margin-left: 4px; font-style: normal; font-size: 11px; font-weight: 600; color: var(--text-muted); }

.form-group { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { font-size: 12px; font-weight: var(--fw-semibold); color: var(--text-muted); }
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%; height: 48px; padding: 0 14px;
  border: 1px solid var(--border); border-radius: 13px;
  background: #fff; color: var(--text); font-size: 14px; outline: 0;
  transition: border-color 0.18s, box-shadow 0.18s;
}
.form-group textarea { height: auto; padding: 12px 14px; resize: vertical; }
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 560px) { .form-row { grid-template-columns: 1fr; } }

.check-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 4px 0 14px; }
.check-grid label {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; border-radius: 13px;
  border: 1px solid var(--border); background: #fff;
  color: var(--text); font-size: 13px; font-weight: var(--fw-semibold);
  cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.check-grid label.on { border-color: var(--teal-400); background: rgba(136,193,233,0.12); color: var(--brand-blue); }
.check-grid input { accent-color: var(--teal-500); }
@media (max-width: 560px) { .check-grid { grid-template-columns: 1fr; } }

.aqn-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 24px; }

@media (max-width: 900px) {
  .aqn-layout { grid-template-columns: 1fr; }
  .aqn-hero { flex-direction: column; align-items: flex-start; gap: 16px; }
}
</style>
