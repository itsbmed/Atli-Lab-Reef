<template>
  <main class="auth-page">
    <section class="auth-shell">
      <aside class="auth-context">
        <RouterLink to="/" class="brand brand-light">
          <img src="/ati-logo.png" alt="ATI" />
          <span>Reef Lab Portal</span>
        </RouterLink>

        <div class="context-copy">
          <span>Konto erstellen</span>
          <h1>Ihr Zugang zum ATI Reef Lab.</h1>
          <p>Registrieren Sie sich als privater Kunde und verwalten Sie Ihre Aquarienprofile und Analyseberichte zentral an einem Ort.</p>
        </div>

        <div class="account-explainer">
          <div>
            <strong>Privatkunde</strong>
            <span>Für eigene Aquarien, Testkits und persönliche Analyseberichte.</span>
          </div>
          <div class="explainer-dealer">
            <strong>Sie sind Händler?</strong>
            <span>Gewerbliche Partnerzugänge richten wir persönlich ein — sprechen Sie uns einfach an.</span>
          </div>
        </div>
      </aside>
      <div class="auth-form-panel">
        <RouterLink to="/" class="brand brand-mobile">
          <img src="/ati-logo.png" alt="ATI" />
          <span>Reef Lab Portal</span>
        </RouterLink>

        <div class="form-heading">
          <div>
            <span class="eyebrow">Registrierung</span>
            <h2>Neues Konto</h2>
          </div>
          <span class="lang">DE</span>
        </div>

        <form class="auth-form" @submit.prevent>
          <div class="form-grid">
            <label class="field">
              <span>Benutzername</span>
              <input v-model="form.username" type="text" autocomplete="username" />
            </label>
            <label class="field">
              <span>E-Mail</span>
              <input v-model="form.email" type="email" autocomplete="email" />
            </label>
            <label class="field">
              <span>Passwort</span>
              <input v-model="form.password" type="password" autocomplete="new-password" minlength="8" />
            </label>
            <label class="field">
              <span>Land</span>
              <select v-model="form.country">
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
              </select>
            </label>
          </div>

          <div class="password-meter">
            <div>
              <span>Passwort-Sicherheit</span>
              <strong>{{ strengthLabel }}</strong>
            </div>
            <i><b :class="strengthTone" :style="{ width: `${passwordStrength}%` }"></b></i>
          </div>

          <div class="checks">
            <label>
              <input v-model="form.newsletter" type="checkbox" />
              <span>ATI Informationen und Produktneuheiten erhalten</span>
            </label>
            <label>
              <input v-model="analysisReminder" type="checkbox" />
              <span>Erinnerungen für regelmäßige Wasseranalysen aktivieren</span>
            </label>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'

const form = ref({
  username: '',
  email: '',
  password: '',
  country: 'DE',
  newsletter: false,
})
const analysisReminder = ref(true)

const passwordStrength = computed(() => {
  const value = form.value.password
  let score = 0
  if (value.length >= 8) score += 35
  if (value.length >= 12) score += 20
  if (/[A-Z]/.test(value)) score += 15
  if (/[0-9]/.test(value)) score += 15
  if (/[^A-Za-z0-9]/.test(value)) score += 15
  return Math.min(score, 100)
})
const strengthLabel = computed(() => {
  if (!form.value.password) return 'Noch offen'
  if (passwordStrength.value >= 80) return 'Stark'
  if (passwordStrength.value >= 50) return 'Solide'
  return 'Zu schwach'
})
const strengthTone = computed(() => {
  if (passwordStrength.value >= 80) return 'strong'
  if (passwordStrength.value >= 50) return 'medium'
  return 'weak'
})
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
  width: min(1180px, 100%);
  display: grid;
  grid-template-columns: minmax(min(100%, 340px), 430px) minmax(min(100%, 560px), 1fr);
  overflow: hidden;
  border: 1px solid rgba(136,193,233,0.18);
  border-radius: 30px;
  background: rgba(255,255,255,0.88);
  box-shadow: 0 28px 90px rgba(10,27,67,0.14);
  backdrop-filter: blur(18px);
}
.auth-context {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 720px;
  padding: 34px;
  color: #fff;
  background:
    linear-gradient(105deg, rgba(10,27,67,0.92), rgba(10,27,67,0.76)),
    url('/reef-tank.webp') center / cover;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.brand img { width: 96px; }
.brand-light { color: rgba(255,255,255,0.75); }
.context-copy span {
  display: block;
  margin-bottom: 10px;
  color: var(--teal-200);
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.context-copy h1 {
  max-width: 350px;
  margin-bottom: 12px;
  font-size: 40px;
  line-height: 1;
  font-weight: var(--fw-semibold);
  letter-spacing: -0.035em;
}
.context-copy p {
  max-width: 360px;
  color: rgba(255,255,255,0.74);
  line-height: 1.7;
}
.account-explainer { display: grid; gap: 10px; }
.account-explainer div {
  padding: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(10px);
}
.account-explainer strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: var(--fw-semibold);
}
.account-explainer span {
  display: block;
  color: rgba(255,255,255,0.66);
  font-size: 12px;
  line-height: 1.45;
}
.explainer-dealer {
  border-color: rgba(136,193,233,0.32) !important;
  background: rgba(136,193,233,0.16) !important;
}
.auth-form-panel {
  padding: clamp(24px, 5vw, 44px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.brand-mobile { display: none; margin-bottom: 34px; color: var(--text-muted); }
.form-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.eyebrow {
  display: block;
  margin-bottom: 10px;
  color: var(--teal-700);
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.form-heading h2 {
  color: var(--text);
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1;
  font-weight: var(--fw-semibold);
  letter-spacing: -0.03em;
}
.lang { font-size: 11px; font-weight: 700; color: var(--text-muted); border: 1px solid var(--border); border-radius: 999px; padding: 5px 11px; }
.auth-form { display: grid; gap: 15px; }
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 14px;
}
.field span {
  display: block;
  margin-bottom: 7px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: var(--fw-semibold);
}
.field input,
.field select {
  width: 100%;
  height: 50px;
  border: 1px solid var(--border);
  border-radius: 15px;
  padding: 0 14px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  outline: 0;
  transition: border-color 0.18s, box-shadow 0.18s;
}
.field input:focus,
.field select:focus {
  border-color: var(--teal-400);
  box-shadow: var(--shadow-focus);
}
.password-meter {
  display: grid;
  gap: 9px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255,255,255,0.76);
  border: 1px solid var(--border);
}
.password-meter div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-size: 12px;
}
.password-meter strong { color: var(--text); font-weight: var(--fw-semibold); }
.password-meter i { height: 7px; border-radius: 999px; background: rgba(100,130,165,0.16); overflow: hidden; }
.password-meter b { display: block; height: 100%; border-radius: inherit; transition: width 0.2s; }
.password-meter b.weak { background: var(--crit); }
.password-meter b.medium { background: var(--warn); }
.password-meter b.strong { background: linear-gradient(90deg, var(--teal-400), var(--good)); }
.checks {
  display: grid;
  gap: 10px;
  color: var(--text-muted);
  font-size: 13px;
}
.checks label { display: flex; gap: 9px; align-items: flex-start; line-height: 1.4; }
.checks input { margin-top: 2px; accent-color: var(--teal-500); }
@media (max-width: 980px) {
  .auth-shell { grid-template-columns: minmax(0, 680px); }
  .auth-context { display: none; }
  .brand-mobile { display: inline-flex; align-items: center; gap: 11px; }
}
@media (max-width: 640px) {
  .auth-page { padding: 16px; }
  .auth-shell { border-radius: 22px; }
}
</style>
