<template>
  <main class="auth-page">
    <section class="auth-shell">
      <div class="auth-form-panel">
        <div class="auth-head">
          <RouterLink to="/" class="brand">
            <img src="/ati-logo.png" alt="ATI" />
            <span>Reef Lab Portal</span>
          </RouterLink>
          <LanguageSwitch />
        </div>

        <div class="auth-copy">
          <span class="eyebrow">Kundenlogin</span>
          <h1>Willkommen zurück.</h1>
          <p>Melden Sie sich an, um Laborberichte, Aquarienverläufe und Empfehlungen weiterzuführen.</p>
        </div>

        <div v-if="error" class="alert-error">{{ error }}</div>

        <form class="auth-form" @submit.prevent="submit">
          <label class="field">
            <span>Benutzername oder E-Mail</span>
            <input v-model="form.login" type="text" autocomplete="username" required autofocus />
          </label>

          <label class="field">
            <span>Passwort</span>
            <input v-model="form.password" type="password" autocomplete="current-password" required />
          </label>

          <div class="form-row">
            <label>
              <input v-model="remember" type="checkbox" />
              <span>Angemeldet bleiben</span>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-lg" :disabled="loading">
            {{ loading ? 'Wird angemeldet...' : 'Einloggen' }}
          </button>
        </form>

        <p class="auth-foot">
          Noch kein Konto?
          <RouterLink to="/register">Konto erstellen</RouterLink>
        </p>
      </div>

      <aside class="auth-story">
        <div class="story-visual">
          <div class="tank-thumb"></div>
          <div class="lab-card">
            <span>Laborstatus</span>
            <strong>ICP</strong>
            <em>Analyseportal</em>
          </div>
        </div>

        <div class="story-copy">
          <span>ATI Reef Lab</span>
          <h2>Analyseberichte für Ihr Aquarium.</h2>
          <p>Verwalten Sie Testkits, Laborberichte, Empfehlungen und Verlaufsdaten in einem geschützten Kundenbereich.</p>
        </div>
      </aside>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LanguageSwitch from '@/components/LanguageSwitch.vue'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const remember = ref(false)
const form = ref({ login: '', password: '' })

function submit() {
  // Frontend-Stub bis das Backend steht: lokale Session setzen.
  loading.value = true
  error.value = ''
  auth.setSession({ user: { name: form.value.login || 'Gast' }, token: 'dev' })
  router.push('/dashboard')
  loading.value = false
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background:
    radial-gradient(circle at 12% 0%, rgba(136,193,233,0.22), transparent 28rem),
    radial-gradient(circle at 92% 20%, rgba(16,185,129,0.12), transparent 24rem),
    linear-gradient(180deg, #f9fdfc 0%, var(--bg) 100%);
}
.auth-shell {
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: minmax(min(100%, 360px), 470px) minmax(min(100%, 520px), 1fr);
  overflow: hidden;
  border: 1px solid rgba(136,193,233,0.18);
  border-radius: 30px;
  background: rgba(255,255,255,0.88);
  box-shadow: 0 28px 90px rgba(10,27,67,0.14);
  backdrop-filter: blur(18px);
}
.auth-form-panel {
  padding: clamp(26px, 5vw, 48px);
  background: rgba(255,255,255,0.88);
}
.auth-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 56px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.brand img { width: 96px; }
.auth-copy { margin-bottom: 24px; }
.eyebrow {
  display: block;
  margin-bottom: 10px;
  color: var(--teal-700);
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.auth-copy h1 {
  margin-bottom: 10px;
  color: var(--text);
  font-size: clamp(34px, 5vw, 48px);
  line-height: 0.98;
  font-weight: var(--fw-semibold);
  letter-spacing: -0.035em;
}
.auth-copy p {
  max-width: 390px;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.65;
}
.alert-error {
  margin-bottom: 14px; padding: 11px 14px; border-radius: 12px;
  background: #fdecea; color: #c5392c; font-size: 13px; font-weight: 600;
}
.auth-form { display: grid; gap: 15px; }
.field span {
  display: block;
  margin-bottom: 7px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: var(--fw-semibold);
}
.field input {
  width: 100%;
  height: 52px;
  border: 1px solid var(--border);
  border-radius: 15px;
  padding: 0 15px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  outline: 0;
  transition: border-color 0.18s, box-shadow 0.18s;
}
.field input:focus {
  border-color: var(--teal-400);
  box-shadow: var(--shadow-focus);
}
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-size: 12px;
}
.form-row label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.form-row input { accent-color: var(--teal-500); }
.auth-foot a {
  color: var(--teal-700);
  font-weight: var(--fw-semibold);
}
.auth-foot {
  margin-top: 22px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}
.auth-story {
  display: flex;
  min-height: 620px;
  flex-direction: column;
  justify-content: space-between;
  padding: 30px;
  background:
    linear-gradient(105deg, rgba(10,27,67,0.98), rgba(10,27,67,0.84)),
    url('/reef-tank.webp') center bottom / cover;
  color: #fff;
}
.story-visual {
  position: relative;
  height: 300px;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.14);
}
.story-visual .tank-thumb { height: 100%; border-radius: 0; background: url('/reef-tank.webp') center / cover; }
.story-visual::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 35%, rgba(10,27,67,0.55));
}
.lab-card {
  position: absolute;
  z-index: 1;
  right: 18px;
  bottom: 18px;
  min-width: 128px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.92);
  color: var(--text);
  box-shadow: 0 20px 46px rgba(0,0,0,0.18);
}
.lab-card span,
.lab-card em {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
}
.lab-card strong {
  display: block;
  margin: 4px 0 1px;
  color: var(--teal-800);
  font-size: 28px;
  line-height: 1;
  font-weight: var(--fw-semibold);
}
.story-copy { max-width: 470px; }
.story-copy span {
  display: block;
  margin-bottom: 10px;
  color: var(--teal-200);
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.story-copy h2 {
  margin-bottom: 12px;
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1;
  font-weight: var(--fw-semibold);
  letter-spacing: -0.035em;
}
.story-copy p {
  max-width: 420px;
  color: rgba(255,255,255,0.68);
  font-size: 15px;
  line-height: 1.7;
}
@media (max-width: 920px) {
  .auth-shell { grid-template-columns: 1fr; }
  .auth-story { display: none; }
}
@media (max-width: 560px) {
  .auth-page { padding: 16px; place-items: stretch; }
  .auth-shell { border-radius: 22px; }
  .auth-head { margin-bottom: 36px; }
  .form-row { align-items: flex-start; flex-direction: column; }
}
</style>
