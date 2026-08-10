<template>
  <header class="nav" :class="{ scrolled }">
    <RouterLink to="/" class="nav-brand" aria-label="ATI Reef Lab"><img src="/ati-logo.png" alt="ATI Reef Lab" /></RouterLink>
    <nav class="nav-links">
      <a href="#how">Ablauf</a><a href="#lab">Labor</a><a href="#report">Bericht</a><a href="#tests">Tests</a>
    </nav>
    <div class="nav-actions">
      <LanguageSwitch />
      <RouterLink v-if="auth.isLoggedIn" to="/dashboard" class="btn btn-primary">Zum Dashboard</RouterLink>
      <template v-else>
        <RouterLink to="/login" class="btn btn-ghost">Einloggen</RouterLink>
        <RouterLink to="/register" class="btn btn-primary">Analyse starten</RouterLink>
      </template>
    </div>
  </header>
</template>
<script setup>
import LanguageSwitch from '@/components/LanguageSwitch.vue'
import { useAuthStore } from '@/stores/auth'
defineProps({ scrolled: Boolean })
const auth = useAuthStore()
</script>
