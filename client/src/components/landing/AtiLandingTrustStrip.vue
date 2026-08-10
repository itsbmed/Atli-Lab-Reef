<template><section class="strip" data-reveal><div v-for="t in trustItems" :key="t.label"><span class="strip-ico" v-html="t.icon"></span><div><strong>{{ t.label }}</strong><em>{{ t.text }}</em></div></div></section></template>
<script setup>import { trustItems } from '@/services/atiLandingContent'</script>
