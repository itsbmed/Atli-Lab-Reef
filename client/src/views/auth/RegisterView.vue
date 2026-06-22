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
      </div>
    </section>
  </main>
</template>

<script setup>
// Registrierung — wird schrittweise aufgebaut.
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
