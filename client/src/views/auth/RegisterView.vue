<template>
  <main class="auth-page">
    <section class="auth-shell">
      <aside class="auth-context"></aside>
      <div class="auth-form-panel"></div>
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
  min-height: 720px;
  padding: 34px;
  color: #fff;
  background:
    linear-gradient(105deg, rgba(10,27,67,0.92), rgba(10,27,67,0.76)),
    url('/reef-tank.webp') center / cover;
}
.auth-form-panel {
  padding: clamp(24px, 5vw, 44px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
@media (max-width: 980px) {
  .auth-shell { grid-template-columns: minmax(0, 680px); }
  .auth-context { display: none; }
}
@media (max-width: 640px) {
  .auth-page { padding: 16px; }
  .auth-shell { border-radius: 22px; }
}
</style>
