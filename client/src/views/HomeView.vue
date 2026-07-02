<template>
  <div class="landing">
    <header class="lp-nav" :class="{ scrolled }">
      <RouterLink to="/" class="lp-brand">
        <img src="/ati-logo.png" alt="ATI Reef Lab" />
      </RouterLink>
      <nav class="lp-nav-links">
        <a href="#leistungen">Leistungen</a>
        <a href="#ablauf">Ablauf</a>
        <a href="#labor">Labor</a>
      </nav>
      <div class="lp-actions">
        <RouterLink to="/login" class="lp-link">Einloggen</RouterLink>
        <RouterLink to="/register" class="btn btn-primary">Analyse starten</RouterLink>
      </div>
    </header>

    <main class="lp-hero">
      <h1>Willkommen</h1>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Sticky-Navbar bekommt beim Scrollen Hintergrund und Schatten.
const scrolled = ref(false)
function onScroll() { scrolled.value = window.scrollY > 12 }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
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
  position: sticky; top: 0; z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px clamp(20px, 4vw, 48px);
  transition: background 0.2s, box-shadow 0.2s, backdrop-filter 0.2s;
}
.lp-nav.scrolled {
  background: rgba(251,252,253,0.85);
  backdrop-filter: blur(18px);
  box-shadow: 0 8px 30px rgba(10,27,67,0.06);
  border-bottom: 1px solid rgba(136,193,233,0.16);
}
.lp-brand { display: inline-flex; align-items: center; }
.lp-brand img { width: 92px; }
.lp-nav-links { display: flex; align-items: center; gap: 26px; }
.lp-nav-links a { color: var(--text); font-size: 14px; font-weight: var(--fw-semibold); text-decoration: none; transition: color 0.15s; }
.lp-nav-links a:hover { color: var(--teal-700); }
.lp-actions { display: flex; align-items: center; gap: 14px; }
.lp-link { color: var(--text); font-size: 14px; font-weight: var(--fw-semibold); }
.lp-link:hover { color: var(--teal-700); }
@media (max-width: 760px) { .lp-nav-links { display: none; } }
.lp-hero { flex: 1; display: grid; place-items: center; padding: 32px; }
.lp-hero h1 {
  font-size: clamp(48px, 11vw, 104px);
  font-weight: var(--fw-extra-bold);
  letter-spacing: -0.04em;
  color: var(--text);
}
</style>
