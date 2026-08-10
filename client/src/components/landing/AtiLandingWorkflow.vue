<template>
  <section id="how" class="how">
    <div class="sec-head center" data-reveal><span class="eyebrow"><i></i> So funktioniert es</span><h2>In fünf Schritten zum verständlichen Wasserbericht.</h2><p>Vom Kauf des Testkits bis zur Empfehlung – ein klarer Weg, ohne Rätsel nach dem Labor.</p></div>
    <div class="how-grid">
      <figure class="how-photo" data-reveal><img src="/lab/spectro.jpg" alt="ATI Labor · SPECTRO ARCOS ICP-OES" loading="lazy" /><div class="how-photo-badge"><span>ATI Labor · Made in Germany</span><strong>SPECTRO ARCOS · ICP-OES</strong></div></figure>
      <ol class="steps"><li v-for="(s, i) in landingSteps" :key="s.title" data-reveal :data-reveal-delay="i * 90"><span class="step-ico" v-html="s.icon"></span><div class="step-body"><span class="step-n">{{ s.n }}</span><h3>{{ s.title }}</h3><p>{{ s.text }}</p></div></li></ol>
    </div>
    <svg class="wave-bottom" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,50 C300,10 560,80 800,52 C1040,24 1220,72 1440,40 L1440,90 L0,90 Z" /></svg>
  </section>
</template>
<script setup>import { landingSteps } from '@/services/atiLandingContent'</script>
