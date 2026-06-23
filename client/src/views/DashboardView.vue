<template>
  <main class="nd-home">
    <section class="nd-hero">
      <div class="nd-hero-copy"></div>
      <div class="nd-setup"></div>
    </section>
  </main>
</template>

<script setup>
// Dashboard für neue Kunden — wird schrittweise aufgebaut.
</script>

<style scoped>
.nd-home {
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(20px, 3vw, 38px);
  min-height: 100vh;
}

.nd-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: clamp(28px, 4vw, 56px);
  align-items: center;
  padding: clamp(30px, 4vw, 52px);
  margin-bottom: 22px;
  border-radius: 32px;
  color: #fff;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 85% -10%, rgba(0,190,208,0.28), transparent 42%),
    linear-gradient(115deg, rgba(10,27,67,0.99), rgba(10,27,67,0.9) 46%, rgba(0,51,102,0.82)),
    url('/reef-tank.webp') center / cover;
  box-shadow: 0 34px 90px rgba(10,27,67,0.26);
}
.nd-hero-copy { position: relative; z-index: 1; }

@media (max-width: 1040px) {
  .nd-hero { grid-template-columns: 1fr; }
}
</style>
