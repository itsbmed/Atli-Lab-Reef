<template>
  <div class="landing">
    <header class="lp-nav">
      <RouterLink to="/" class="lp-brand">
        <img src="/ati-logo.png" alt="ATI" />
        <span>Reef Lab Portal</span>
      </RouterLink>
      <nav class="lp-actions">
        <RouterLink to="/login" class="lp-link">Anmelden</RouterLink>
        <RouterLink to="/register" class="btn btn-primary">Registrieren</RouterLink>
      </nav>
    </header>

    <main class="lp-hero">
      <h1>Willkommen</h1>
    </main>
  </div>
</template>

<script setup>
// Platzhalter-Landingpage — wird später ausgebaut.
</script>

<style scoped>
.landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 12% 0%, rgba(136,193,233,0.22), transparent 28rem),
    linear-gradient(180deg, #f9fdfc 0%, var(--bg) 100%);
}
.lp-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px clamp(20px, 4vw, 48px);
}
.lp-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.lp-brand img { width: 84px; }
.lp-actions { display: flex; align-items: center; gap: 14px; }
.lp-link { color: var(--text); font-size: 14px; font-weight: var(--fw-semibold); }
.lp-link:hover { color: var(--teal-700); }
.lp-hero { flex: 1; display: grid; place-items: center; padding: 32px; }
.lp-hero h1 {
  font-size: clamp(48px, 11vw, 104px);
  font-weight: var(--fw-extra-bold);
  letter-spacing: -0.04em;
  color: var(--text);
}
</style>
