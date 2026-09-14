<template>
  <main class="lp">
    <div class="lp-aurora" aria-hidden="true"></div>
    <AtiLandingHeader :scrolled="scrolled" />
    <AtiLandingHero />
    <AtiLandingTrustStrip />
    <AtiLandingProblem />
    <AtiLandingWorkflow />
    <AtiLandingLab />
    <AtiLandingReport />
    <AtiLandingSystems />
    <AtiLandingTests />
    <AtiLandingRoles />
    <AtiLandingStart />
    <AtiLandingFooter />
    <button
      class="to-top"
      :class="{ show: showTop }"
      @click="scrollTop"
      aria-label="Nach oben scrollen"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 19V5m0 0-7 7m7-7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AtiLandingFooter from '@/components/landing/AtiLandingFooter.vue'
import AtiLandingHeader from '@/components/landing/AtiLandingHeader.vue'
import AtiLandingHero from '@/components/landing/AtiLandingHero.vue'
import AtiLandingLab from '@/components/landing/AtiLandingLab.vue'
import AtiLandingProblem from '@/components/landing/AtiLandingProblem.vue'
import AtiLandingTrustStrip from '@/components/landing/AtiLandingTrustStrip.vue'
import AtiLandingWorkflow from '@/components/landing/AtiLandingWorkflow.vue'
import AtiLandingReport from '@/components/landing/AtiLandingReport.vue'
import AtiLandingSystems from '@/components/landing/AtiLandingSystems.vue'
import AtiLandingTests from '@/components/landing/AtiLandingTests.vue'
import AtiLandingRoles from '@/components/landing/AtiLandingRoles.vue'
import AtiLandingStart from '@/components/landing/AtiLandingStart.vue'
import '@/assets/styles/ati-landing.css'

const scrolled = ref(false)
const showTop = ref(false)
let observer

function onScroll() {
  scrolled.value = window.scrollY > 24
  showTop.value = window.scrollY > 700
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  const elements = document.querySelectorAll('[data-reveal]')
  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-in'))
    return
  }
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const delay = entry.target.getAttribute('data-reveal-delay')
      if (delay) entry.target.style.transitionDelay = `${delay}ms`
      entry.target.classList.add('is-in')
      observer.unobserve(entry.target)
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' })
  elements.forEach((element) => observer.observe(element))
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  observer?.disconnect()
})
</script>

<style scoped>
/* ════════════════════  BACK TO TOP  ════════════════════ */
.to-top {
  position: fixed;
  right: clamp(16px, 3vw, 34px);
  bottom: clamp(16px, 3vw, 34px);
  z-index: 40;
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(180deg, var(--brand-blue), var(--brand-navy));
  box-shadow: 0 16px 38px rgba(0,114,206,0.36);
  opacity: 0;
  visibility: hidden;
  transform: translateY(14px) scale(0.9);
  transition: opacity 0.25s, transform 0.25s, visibility 0.25s, box-shadow 0.2s;
}
.to-top.show { opacity: 1; visibility: visible; transform: none; }
.to-top:hover { transform: translateY(-3px) scale(1.06); box-shadow: 0 22px 50px rgba(0,114,206,0.46); }
.to-top:focus-visible { outline: 2px solid var(--brand-blue); outline-offset: 4px; }
.to-top svg { width: 22px; height: 22px; }

</style>
