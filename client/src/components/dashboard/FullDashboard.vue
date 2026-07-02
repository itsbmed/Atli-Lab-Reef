<template>
  <div class="fd">
    <h1 class="fd-heading">Portfolio-Übersicht</h1>
    <p class="fd-sub">Willkommen zurück, {{ firstName }} — das Dashboard wird aufgebaut.</p>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAquariumsStore } from '@/stores/aquariums'

const auth = useAuthStore()
const aquariums = useAquariumsStore()
const firstName = computed(() => (auth.user?.name || '').split(' ')[0])

onMounted(() => aquariums.load())
</script>

<style scoped>
.fd-heading { font-size: clamp(26px, 4vw, 36px); font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
.fd-sub { margin-top: 8px; color: var(--text-muted); }
</style>
