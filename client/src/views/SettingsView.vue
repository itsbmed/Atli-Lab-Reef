<template>
  <div class="settings-page">
    <section class="settings-hero">
      <div>
        <span class="eyebrow">Einstellungen</span>
        <h1>Reef Lab passend einrichten.</h1>
        <p>Verwalten Sie Darstellung, regionale Angaben und Benachrichtigungen an einem Ort.</p>
      </div>
      <div class="settings-readout">
        <span>Konfiguration</span>
        <strong>Persönlich</strong>
        <em>Für dieses Konto</em>
      </div>
    </section>

    <div class="settings-layout">
      <main class="settings-main">
        <section class="settings-section card">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Sprache & Region</span>
              <h2>Regionale Darstellung</h2>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="settings-language">Sprache</label>
              <select id="settings-language" v-model="settings.language">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            <div class="form-group">
              <label for="settings-country">Land</label>
              <select id="settings-country" v-model="settings.country">
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
              </select>
            </div>
            <div class="form-group">
              <label for="settings-units">Einheitensystem</label>
              <select id="settings-units" v-model="settings.units">
                <option value="metric">Metrisch (cm, L)</option>
                <option value="imperial">Imperial (inch, gal)</option>
              </select>
            </div>
          </div>
          <div class="save-row">
            <p :class="['save-note', saveState.type]" role="status">{{ saveState.message }}</p>
            <button class="btn btn-primary" type="button" :disabled="saving" @click="saveRegion">
              {{ saving ? 'Speichern...' : 'Region speichern' }}
            </button>
          </div>
        </section>
      </main>

      <aside class="settings-side">
        <section class="card side-card">
          <span class="eyebrow">Status</span>
          <h2>Bereit zur Einrichtung</h2>
          <p>Persönliche Einstellungen gelten ausschließlich für das aktuell angemeldete Konto.</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { loadSettingsPreferences, saveSettingsPreferences } from '@/services/settingsPreferences'

const auth = useAuthStore()
const localPreferences = loadSettingsPreferences(auth.user?.id)
const settings = reactive({
  language: auth.user?.language || 'de',
  country: auth.user?.country || 'DE',
  units: localPreferences.units,
})
const saving = ref(false)
const saveState = reactive({ message: '', type: '' })

async function saveRegion() {
  saving.value = true
  saveState.message = ''
  saveState.type = ''

  try {
    if (auth.user) {
      await auth.updateProfile({
        language: settings.language,
        country: settings.country,
      })
    }
    saveSettingsPreferences(auth.user?.id, {
      ...localPreferences,
      units: settings.units,
    })
    localPreferences.units = settings.units
    saveState.message = 'Regionale Einstellungen gespeichert.'
    saveState.type = 'success'
  } catch (error) {
    saveState.message = error.error || 'Einstellungen konnten nicht gespeichert werden.'
    saveState.type = 'error'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.settings-page { display: grid; gap: 20px; }
.settings-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 30px;
  border-radius: 28px;
  background:
    linear-gradient(105deg, rgba(10, 27, 67, 0.98), rgba(10, 27, 67, 0.86) 58%, rgba(0, 114, 206, 0.48)),
    url('/reef-tank.webp') center bottom / cover;
  color: #fff;
  box-shadow: var(--shadow);
}
.eyebrow {
  display: block;
  margin-bottom: 8px;
  color: var(--teal-700);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.settings-hero .eyebrow { color: var(--teal-200); }
.settings-hero h1 { max-width: 720px; font-size: clamp(34px, 5vw, 54px); line-height: 1; font-weight: 800; }
.settings-hero p { max-width: 660px; margin-top: 10px; color: rgba(255, 255, 255, 0.72); line-height: 1.6; }
.settings-readout {
  min-width: 220px;
  height: fit-content;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
}
.settings-readout span,
.settings-readout strong,
.settings-readout em { display: block; }
.settings-readout span { color: var(--teal-200); font-size: 11px; font-weight: 800; text-transform: uppercase; }
.settings-readout strong { margin-top: 5px; font-size: 21px; }
.settings-readout em { margin-top: 5px; color: rgba(255, 255, 255, 0.68); font-size: 12px; font-style: normal; }
.settings-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.34fr); gap: 20px; align-items: start; }
.settings-main,
.settings-side { display: grid; gap: 16px; }
.settings-section,
.side-card { padding: 22px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.section-heading h2,
.side-card h2 { color: var(--text); font-size: 22px; font-weight: 800; }
.section-copy,
.side-card p { color: var(--text-muted); font-size: 13px; line-height: 1.65; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 7px; }
.form-group label { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.form-group select {
  width: 100%;
  min-height: 46px;
  padding: 0 13px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  outline: 0;
}
.form-group select:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.save-row { display: flex; align-items: center; justify-content: flex-end; gap: 14px; margin-top: 18px; }
.save-note { margin-right: auto; color: var(--text-muted); font-size: 12px; font-weight: 700; }
.save-note:empty { display: none; }
.save-note.success { color: #047857; }
.save-note.error { color: var(--coral); }
@media (max-width: 980px) {
  .settings-layout { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .settings-hero { flex-direction: column; padding: 22px; }
  .settings-readout { min-width: 0; }
  .form-grid { grid-template-columns: 1fr; }
  .save-row { align-items: stretch; flex-direction: column; }
  .save-row .btn { width: 100%; }
}
</style>
