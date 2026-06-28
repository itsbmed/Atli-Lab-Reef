<template>
  <div class="aq-list">
    <div class="aq-list-head">
      <div>
        <h2>Ihre Aquarien</h2>
        <p>Verwalten Sie Ihre Becken, Zielwerte und Technik an einem Ort.</p>
      </div>
      <RouterLink to="/aquariums/new" class="btn btn-primary">＋ Aquarium anlegen</RouterLink>
    </div>

    <p class="aq-list-hint">{{ aquariums.count }} Aquarium(e) hinterlegt — Übersicht folgt.</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAquariumsStore } from '@/stores/aquariums'

const aquariums = useAquariumsStore()
onMounted(() => aquariums.load())
</script>

<style scoped>
.aq-list-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.aq-list-head h2 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; letter-spacing: -0.03em; color: var(--text); line-height: 1.05; }
.aq-list-head p { margin-top: 6px; color: var(--text-muted); font-size: 14px; }
.aq-list-hint { color: var(--text-muted); font-size: 13px; }
@media (max-width: 620px) {
  .aq-list-head { flex-direction: column; align-items: flex-start; }
}
</style>
