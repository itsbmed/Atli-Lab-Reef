<template>
  <AppLayout v-if="route.meta.shell" />
  <RouterView v-else />
</template>

<script setup>
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

// App-Seiten (mit Shell) rendern in AppLayout; Auth/Landing rendern bare.
const route = useRoute()
</script>
