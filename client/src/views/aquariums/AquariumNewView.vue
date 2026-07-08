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
          <div class="form-group">
            <label>Foto (optional)</label>
            <div class="aqn-photo">
              <div class="aqn-photo-thumb">
                <img v-if="form.image" :src="form.image" alt="Aquarium-Foto" />
                <div v-else :class="`aqn-thumb ${previewTheme}`"></div>
              </div>
              <div class="aqn-photo-side">
                <div class="aqn-photo-copy">
                  <strong>{{ photoLabel }}</strong>
                  <span>Eigenes Foto hochladen oder ein Motiv aus der Galerie wählen.</span>
                </div>
                <div class="aqn-photo-actions">
                  <label class="aqn-upload-btn">
                    {{ form.image ? 'Foto ändern' : 'Foto hochladen' }}
                    <input type="file" accept="image/*" @change="onPhoto" hidden />
                  </label>
                  <button type="button" class="aqn-gallery-trigger" @click="showPresetPicker = true">
                    Galerie
                  </button>
                  <button v-if="form.image" type="button" class="aqn-photo-remove" @click="clearPhoto">Entfernen</button>
                </div>
                <p v-if="photoError" class="aqn-photo-error">{{ photoError }}</p>
              </div>
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
        <div class="aqn-preview-card">
          <div class="aqn-preview-media">
            <img v-if="form.image" :src="form.image" class="aqn-thumb-img" alt="Aquarium-Foto" />
            <div v-else :class="`aqn-thumb ${previewTheme}`"></div>
            <span :class="['aqn-preview-badge', waterClass(form.water_type)]">{{ form.water_type }}</span>
          </div>
          <div class="aqn-preview-body">
            <span class="aqn-preview-kicker">Vorschau</span>
            <strong>{{ form.name || 'Neues Aquarium' }}</strong>
            <p>{{ form.net_volume ? `${form.net_volume} L` : 'Volumen offen' }}<template v-if="form.aquarium_type"> · {{ form.aquarium_type }}</template></p>
            <div class="aqn-preview-tags">
              <em v-if="form.lighting_type">{{ form.lighting_type }}</em>
              <em v-if="form.skimmer">Abschäumer</em>
              <em v-if="form.refugium">Refugium</em>
              <em v-if="form.sump">Technikbecken</em>
            </div>
          </div>
        </div>
        <div class="aqn-hint">
          <strong>Was passiert danach?</strong>
          <p>Nach dem Anlegen führen wir Sie direkt zur Analyse-Registrierung — Barcode erfassen, Probe einsenden, fertig.</p>
        </div>
      </aside>
    </div>

    <div v-if="showPresetPicker" class="preset-modal" role="dialog" aria-modal="true" aria-labelledby="preset-modal-title" @click.self="showPresetPicker = false">
      <div class="preset-dialog">
        <div class="preset-head">
          <div>
            <span>Galerie</span>
            <h2 id="preset-modal-title">Aquarium-Bild wählen</h2>
          </div>
          <button type="button" class="preset-close" aria-label="Schließen" @click="showPresetPicker = false">×</button>
        </div>

        <div class="aqn-presets" aria-label="Aquarium-Bildvorlagen">
          <button
            v-for="preset in AQUARIUM_PRESETS"
            :key="preset.id"
            type="button"
            :class="['aqn-preset', { active: selectedPresetId === preset.id }]"
            :aria-pressed="selectedPresetId === preset.id"
            @click="selectPreset(preset)"
          >
            <img :src="preset.dataUrl" :alt="preset.name" />
            <span>{{ preset.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAquariumsStore } from '@/stores/aquariums'
import { emptyAquarium } from '@/services/aquariumStore'
import { AQUARIUM_PRESETS } from '@/services/aquariumPresets'
import { fileToResizedDataUrl } from '@/services/imageUtil'

const router = useRouter()
const aquariums = useAquariumsStore()
const saving = ref(false)
const error = ref('')
const form = ref(emptyAquarium())

const photoError = ref('')
const selectedPresetId = ref('')
const showPresetPicker = ref(false)

const photoLabel = computed(() => {
  if (selectedPresetId.value && selectedPresetId.value !== 'custom') return 'Galerie-Motiv ausgewählt'
  if (selectedPresetId.value === 'custom') return 'Eigenes Foto ausgewählt'
  return 'Noch kein Foto ausgewählt'
})

function selectPreset(preset) {
  form.value.image = preset.dataUrl
  selectedPresetId.value = preset.id
  photoError.value = ''
  showPresetPicker.value = false
}

function clearPhoto() {
  form.value.image = null
  selectedPresetId.value = ''
  photoError.value = ''
}

async function onPhoto(e) {
  const file = e.target.files?.[0]
  if (!file) return
  photoError.value = ''
  try {
    form.value.image = await fileToResizedDataUrl(file)
    selectedPresetId.value = 'custom'
  } catch (err) {
    photoError.value = err.error || 'Foto konnte nicht geladen werden.'
  }
  e.target.value = ''
}

// Wassertyp → sichere CSS-Klasse für die Badge-Färbung (einheitlich mit der Liste).
function waterClass(type) {
  return { 'Meerwasser': 'wt-sea', 'Süßwasser': 'wt-fresh', 'Osmosewasser': 'wt-osmo', 'Meersalz': 'wt-salt' }[type] || 'wt-sea'
}

// Vorschau-Thema aus Beckentyp bzw. Wassertyp ableiten.
const previewTheme = computed(() => {
  if (form.value.aquarium_type === 'SPS') return 'reef-sps'
  const map = { 'Meerwasser': 'reef-mixed', 'Süßwasser': 'freshwater', 'Osmosewasser': 'osmosis', 'Meersalz': 'reef-sps' }
  return map[form.value.water_type] || 'reef-mixed'
})

function submit() {
  error.value = ''
  if (!form.value.name.trim()) {
    error.value = 'Bitte geben Sie einen Namen für das Aquarium an.'
    return
  }
  if (!form.value.net_volume || form.value.net_volume < 1) {
    error.value = 'Bitte geben Sie ein gültiges Nettovolumen an.'
    return
  }
  saving.value = true
  try {
    const aquarium = aquariums.create({ ...form.value, image_theme: previewTheme.value })
    router.push(`/aquariums/${aquarium.id}`)
  } catch (e) {
    error.value = e.error || 'Fehler beim Anlegen des Aquariums.'
  } finally {
    saving.value = false
  }
}
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

/* Live-Vorschau */
.aqn-preview { position: sticky; top: 88px; display: flex; flex-direction: column; gap: 16px; }
.aqn-preview-card { border-radius: 22px; overflow: hidden; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.aqn-preview-media { position: relative; height: 120px; }
.aqn-preview-media::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(10,27,67,0.28)); }
.aqn-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Foto-Auswahl */
.aqn-photo {
  display: flex; gap: 16px; align-items: center;
  padding: 14px; border: 1px solid rgba(136,193,233,0.28); border-radius: 18px;
  background: linear-gradient(180deg, #fff, rgba(136,193,233,0.07));
}
.aqn-photo-thumb {
  width: 126px; height: 92px; flex-shrink: 0; border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(136,193,233,0.35); box-shadow: 0 12px 26px rgba(10,27,67,0.1);
}
.aqn-photo-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aqn-photo-thumb .aqn-thumb { width: 100%; height: 100%; }
.aqn-photo-side { min-width: 0; display: flex; flex: 1; flex-direction: column; align-items: flex-start; gap: 10px; }
.aqn-photo-copy { display: flex; flex-direction: column; gap: 3px; }
.aqn-photo-copy strong { color: var(--text); font-size: 14px; font-weight: 800; }
.aqn-photo-copy span { color: var(--text-muted); font-size: 12.5px; line-height: 1.4; }
.aqn-photo-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.aqn-upload-btn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 14px;
  border: 0; border-radius: 999px; background: linear-gradient(135deg, var(--brand-blue), var(--teal-500));
  color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 22px rgba(0,133,220,0.22);
}
.aqn-upload-btn:hover { filter: brightness(1.03); }
.aqn-gallery-trigger {
  min-height: 38px; padding: 0 13px; border: 1px solid var(--border); border-radius: 999px;
  background: #fff; color: var(--brand-blue); font-size: 12px; font-weight: 800; cursor: pointer;
}
.aqn-gallery-trigger:hover { border-color: var(--teal-400); color: var(--teal-600); }
.aqn-photo-remove {
  min-height: 38px; padding: 0 10px; border: 0; background: none;
  color: #c5392c; font-size: 12px; font-weight: 800; cursor: pointer;
}
.aqn-photo-error { color: #c5392c; font-size: 12px; }
.preset-modal {
  position: fixed; inset: 0; z-index: 80; display: grid; place-items: center;
  padding: 24px; background: rgba(10,27,67,0.42); backdrop-filter: blur(6px);
}
.preset-dialog {
  width: min(780px, 100%); max-height: min(760px, calc(100vh - 48px)); overflow: auto;
  border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.28);
  box-shadow: 0 28px 70px rgba(10,27,67,0.28);
}
.preset-head {
  position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 18px;
  padding: 20px 22px 16px; background: rgba(255,255,255,0.96); border-bottom: 1px solid var(--border);
}
.preset-head span { display: block; margin-bottom: 4px; color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.preset-head h2 { color: var(--text); font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.preset-close {
  display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0;
  border: 1px solid var(--border); border-radius: 12px; background: #fff;
  color: var(--text); font-size: 24px; line-height: 1; cursor: pointer;
}
.preset-close:hover { border-color: var(--teal-400); color: var(--brand-blue); }
.aqn-presets { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 18px 22px 22px; }
.aqn-preset {
  position: relative; min-width: 0; height: 130px; overflow: hidden;
  border: 2px solid transparent; border-radius: 14px; background: #fff;
  cursor: pointer; box-shadow: 0 10px 24px rgba(10,27,67,0.08);
  transition: border-color 0.16s, transform 0.16s, box-shadow 0.16s;
}
.aqn-preset:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(10,27,67,0.12); }
.aqn-preset.active { border-color: var(--teal-400); box-shadow: 0 0 0 3px rgba(136,193,233,0.24), 0 14px 28px rgba(10,27,67,0.12); }
.aqn-preset img { width: 100%; height: 100%; object-fit: cover; display: block; }
.aqn-preset span {
  position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 1;
  padding: 4px 7px; border-radius: 999px; overflow: hidden;
  background: rgba(255,255,255,0.92); color: var(--text);
  font-size: 10.5px; font-weight: 800; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap;
}
.aqn-thumb { width: 100%; height: 100%; background: linear-gradient(150deg, var(--brand-blue), #0a1b43); }
.aqn-thumb.reef-mixed { background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan)); }
.aqn-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.aqn-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.aqn-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.aqn-preview-badge { position: absolute; z-index: 2; top: 12px; left: 12px; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.92); color: var(--brand-blue); font-size: 11px; font-weight: 800; }
.aqn-preview-badge.wt-sea { color: var(--brand-blue); }
.aqn-preview-badge.wt-fresh { color: #0f766e; }
.aqn-preview-badge.wt-osmo { color: #0e7490; }
.aqn-preview-badge.wt-salt { color: #7c3aed; }
.aqn-preview-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; }
.aqn-preview-kicker { color: var(--brand-blue); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.aqn-preview-body strong { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
.aqn-preview-body p { color: var(--text-muted); font-size: 13px; }
.aqn-preview-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.aqn-preview-tags em { padding: 3px 9px; border-radius: 999px; background: rgba(136,193,233,0.16); color: var(--brand-blue); font-style: normal; font-size: 11px; font-weight: 700; }
.aqn-hint { padding: 16px 18px; border-radius: 18px; background: rgba(136,193,233,0.1); border: 1px solid rgba(136,193,233,0.22); }
.aqn-hint strong { display: block; margin-bottom: 5px; font-size: 13px; font-weight: 800; color: var(--text); }
.aqn-hint p { font-size: 12.5px; line-height: 1.55; color: var(--text-muted); }

@media (max-width: 900px) {
  .aqn-preview { position: static; }
  .aqn-layout { grid-template-columns: 1fr; }
  .aqn-hero { flex-direction: column; align-items: flex-start; gap: 16px; }
}

@media (max-width: 640px) {
  .aqn-photo { align-items: flex-start; }
  .aqn-photo-thumb { width: 108px; height: 86px; }
  .preset-modal { padding: 14px; align-items: end; }
  .preset-dialog { max-height: min(720px, calc(100vh - 28px)); border-radius: 22px 22px 0 0; }
  .aqn-presets { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 14px; gap: 10px; }
  .aqn-preset { height: 112px; }
}
</style>
