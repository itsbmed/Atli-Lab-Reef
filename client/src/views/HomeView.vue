<template>
  <main class="lp">
    <div class="lp-aurora" aria-hidden="true"></div>
    <AtiLandingHeader :scrolled="scrolled" />
    <AtiLandingHero />
    <AtiLandingTrustStrip />
    <AtiLandingProblem />
    <AtiLandingWorkflow />
    <AtiLandingLab />
    <AtiLandingFooter />
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
import '@/assets/styles/ati-landing.css'

const scrolled = ref(false)
let observer

function onScroll() { scrolled.value = window.scrollY > 24 }

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
