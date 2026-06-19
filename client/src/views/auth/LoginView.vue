<template>
  <main class="rp-auth">
    <section class="auth-shell">
      <div class="form-panel">
        <header class="ap-head">
          <RouterLink to="/" class="brand">
            <span class="brand-mark">RP</span>
            <div>
              <strong>Reef Pilot</strong>
              <em>by ATI · NYOS</em>
            </div>
          </RouterLink>
          <span class="lang">DE</span>
        </header>

        <div class="ap-copy">
          <span class="eyebrow">Kundenlogin</span>
          <h1>Willkommen zurück.</h1>
          <p>Melden Sie sich an, um Laborberichte, Aquarienverläufe und Empfehlungen weiterzuführen.</p>
        </div>

        <form class="ap-form" @submit.prevent>
          <label class="field">
            <span>Benutzername oder E-Mail</span>
            <input v-model="form.login" type="text" autocomplete="username" />
          </label>
          <label class="field">
            <span>Passwort</span>
            <input v-model="form.password" type="password" autocomplete="current-password" />
          </label>

          <div class="form-row">
            <label class="check"><input v-model="remember" type="checkbox" /><span>Angemeldet bleiben</span></label>
            <a href="#" class="link">Passwort vergessen?</a>
          </div>

          <button type="submit" class="rp-btn primary block lg">Einloggen</button>
        </form>
      </div>
      <aside class="story"></aside>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({ login: '', password: '' })
const remember = ref(false)
</script>

<style scoped>
.rp-auth {
  --rp-bg: #090c12; --rp-panel: #11151d; --rp-panel-2: #161b25;
  --rp-line: rgba(255,255,255,0.08); --rp-line-2: rgba(255,255,255,0.16);
  --rp-text: #eaeff6; --rp-muted: #8b94a5; --rp-faint: #5c6473;
  --rp-accent: #00BED0; --rp-accent-2: #0072CE; --rp-accent-ink: #042029;
  --rp-accent-soft: rgba(0,190,208,0.20); --rp-accent-glow: rgba(0,114,206,0.30);
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  color: var(--rp-text);
  font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background:
    radial-gradient(900px 500px at 15% -5%, rgba(0,190,208,0.10), transparent 60%),
    radial-gradient(800px 480px at 95% 10%, rgba(0,114,206,0.07), transparent 60%),
    var(--rp-bg);
}
.auth-shell {
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: minmax(min(100%, 360px), 460px) 1fr;
  overflow: hidden;
  border: 1px solid var(--rp-line);
  border-radius: 26px;
  background: var(--rp-panel);
  box-shadow: 0 40px 120px rgba(0,0,0,0.55);
}
.form-panel { padding: clamp(26px, 5vw, 46px); }
.story { min-height: 600px; border-left: 1px solid var(--rp-line); }

.ap-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 48px; }
.brand { display: flex; align-items: center; gap: 11px; }
.brand-mark {
  width: 40px; height: 40px; border-radius: 11px;
  display: grid; place-items: center;
  font-size: 14px; font-weight: 800; letter-spacing: -.02em;
  color: var(--rp-accent-ink);
  background: linear-gradient(135deg, var(--rp-accent), var(--rp-accent-2));
}
.brand strong { display: block; font-size: 15px; font-weight: 800; letter-spacing: -.01em; }
.brand em { font-style: normal; font-size: 11px; color: var(--rp-muted); letter-spacing: .06em; }
.lang { font-size: 11px; font-weight: 700; color: var(--rp-muted); border: 1px solid var(--rp-line); border-radius: 999px; padding: 5px 11px; }

.ap-copy { margin-bottom: 26px; }
.eyebrow { display: block; margin-bottom: 12px; color: var(--rp-accent); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.ap-copy h1 { font-size: clamp(30px, 5vw, 42px); line-height: 1; font-weight: 800; letter-spacing: -.04em; margin-bottom: 12px; }
.ap-copy p { max-width: 380px; color: var(--rp-muted); font-size: 14px; line-height: 1.6; }

.ap-form { display: grid; gap: 14px; }
.field span { display: block; margin-bottom: 7px; color: var(--rp-muted); font-size: 12px; font-weight: 600; }
.field input {
  width: 100%; height: 50px;
  border: 1px solid var(--rp-line-2); border-radius: 13px;
  padding: 0 15px;
  background: var(--rp-panel-2); color: var(--rp-text);
  font-size: 14px; outline: 0;
  transition: border-color .16s, box-shadow .16s;
}
.field input::placeholder { color: var(--rp-faint); }
.field input:focus { border-color: var(--rp-accent); box-shadow: 0 0 0 3px var(--rp-accent-soft); }

.form-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12.5px; color: var(--rp-muted); }
.check { display: inline-flex; align-items: center; gap: 8px; }
.check input { accent-color: var(--rp-accent); }
.link { color: var(--rp-accent); font-weight: 600; }
.link:hover { text-decoration: underline; }

.rp-btn {
  border: 1px solid var(--rp-line-2); background: var(--rp-panel-2); color: var(--rp-text);
  border-radius: 13px; padding: 0 18px; height: 46px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: transform .12s, box-shadow .16s, background .16s;
}
.rp-btn:hover { transform: translateY(-1px); }
.rp-btn.primary {
  background: linear-gradient(135deg, var(--rp-accent), var(--rp-accent-2));
  color: var(--rp-accent-ink); border-color: transparent;
  box-shadow: 0 14px 30px var(--rp-accent-glow);
}
.rp-btn.block { width: 100%; }
.rp-btn.lg { height: 52px; font-size: 15px; }

@media (max-width: 920px) {
  .auth-shell { grid-template-columns: 1fr; }
  .story { display: none; }
}
</style>
