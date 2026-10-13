import { onBeforeUnmount, onMounted, ref } from 'vue'

// Breite eines Elements in Pixeln, folgt jeder Größenänderung.
export function useElementWidth(target) {
  const width = ref(0)
  let observer = null
  onMounted(() => {
    if (!target.value) return
    width.value = target.value.getBoundingClientRect().width
    observer = new ResizeObserver(([entry]) => { width.value = entry.contentRect.width })
    observer.observe(target.value)
  })
  onBeforeUnmount(() => observer?.disconnect())
  return width
}
