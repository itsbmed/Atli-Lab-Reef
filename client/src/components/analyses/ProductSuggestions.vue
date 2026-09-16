<template>
  <section v-if="products.length" class="product-suggestions" aria-label="Empfohlene Produkte">
    <header>Passende Produkte für niedrige Messwerte</header>
    <div class="product-list">
      <component
        :is="product.productUrl ? 'a' : 'div'"
        v-for="product in products"
        :key="product.parameterKey"
        class="suggested-product"
        :href="product.productUrl || undefined"
        :target="product.productUrl ? '_blank' : undefined"
        :rel="product.productUrl ? 'noopener noreferrer' : undefined"
      >
        <img v-if="product.productImage && !failedImages[product.productImage]" :src="product.productImage" alt="" loading="lazy" @error="failedImages[product.productImage] = true" />
        <span v-else class="product-placeholder" aria-hidden="true">ATI</span>
        <span class="product-copy"><strong>{{ product.productName }}</strong><small v-if="product.productUrl">Im ATI Shop ansehen ↗</small></span>
      </component>
    </div>
  </section>
</template>

<script setup>
import { reactive } from 'vue'
defineProps({ products: { type: Array, default: () => [] } })
const failedImages = reactive({})
</script>

<style scoped>
.product-suggestions { display: grid; gap: 10px; }
.product-suggestions header { color: var(--teal-700); font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
.product-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: 8px; }
.suggested-product { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 10px 12px; border: 1px solid var(--border); border-radius: 13px; background: #fff; text-decoration: none; }
a.suggested-product:hover { border-color: var(--brand-blue); background: var(--teal-50); }
.suggested-product img,.product-placeholder { flex: none; width: 48px; height: 48px; border-radius: 10px; background: var(--surface-soft); object-fit: contain; }
.product-placeholder { display: grid; place-items: center; color: var(--brand-blue); font-size: 13px; font-weight: 800; }
.product-copy { min-width: 0; }
.product-copy strong { display: block; color: var(--text); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
.product-copy small { display: block; margin-top: 4px; color: var(--brand-blue); font-size: 10px; }
</style>
