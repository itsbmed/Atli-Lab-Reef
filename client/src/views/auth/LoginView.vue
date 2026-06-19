<template>
  <main class="rp-auth">
    <section class="auth-shell">
      <div class="form-panel"></div>
      <aside class="story"></aside>
    </section>
  </main>
</template>

<script setup>
// Login — wird schrittweise aufgebaut.
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

@media (max-width: 920px) {
  .auth-shell { grid-template-columns: 1fr; }
  .story { display: none; }
}
</style>
