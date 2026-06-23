<template>
  <main class="dash">
    <div class="card">
      <span class="eyebrow">Testseite</span>
      <h1>Hallo, {{ name }}!</h1>
      <p>Login und Registrierung funktionieren — Sie sind angemeldet. Diese Platzhalterseite bestätigt, dass die Session gesetzt wurde. Das richtige Dashboard für neue Kunden folgt als Nächstes.</p>
      <button class="btn btn-primary btn-lg" @click="logout">Abmelden</button>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const name = computed(() => auth.user?.name || 'Gast')

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.dash {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background:
    radial-gradient(circle at 12% 0%, rgba(136,193,233,0.22), transparent 28rem),
    radial-gradient(circle at 92% 20%, rgba(16,185,129,0.12), transparent 24rem),
    linear-gradient(180deg, #f9fdfc 0%, var(--bg) 100%);
}
.card {
  width: min(520px, 100%);
  padding: 40px;
  border-radius: 28px;
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--border);
  box-shadow: 0 28px 90px rgba(10,27,67,0.14);
  backdrop-filter: blur(18px);
  text-align: center;
}
.eyebrow {
  display: block;
  margin-bottom: 12px;
  color: var(--teal-700);
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.card h1 {
  margin-bottom: 12px;
  font-size: clamp(28px, 5vw, 36px);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.03em;
}
.card p {
  max-width: 420px;
  margin: 0 auto 26px;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.65;
}
</style>
