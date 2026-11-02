import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { arrangeColumns, hideKey, loadArrangement, moveKey, saveArrangement } from '@/services/arrangement'

const LONG_PRESS = 500
const TOUCH_PICKUP = 180
const TOLERANCE = 8
const EDGE = 72
const EASE = 'cubic-bezier(.2,.8,.2,1)'

// Kästen selbst anordnen wie die Widgets am iPhone: lange drücken (oder „Anordnen“)
// lässt sie wackeln, dann lassen sie sich zwischen den Spalten verschieben. Die Ansicht
// markiert Spalten mit `data-arrange-column` und Kästen mit `data-arrange-key` und
// ruft `start` beim Pointerdown eines Kastens auf.
export function useArrangement({ area, ownerId, keys, defaults, container }) {
  const saved = ref(loadArrangement(ownerId.value, area))
  watch(ownerId, (id) => { saved.value = loadArrangement(id, area) })

  const arrangement = computed(() => arrangeColumns(keys.value, saved.value, defaults.value))
  const editing = ref(false)
  const dragging = ref('')
  const customized = computed(() => Boolean(saved.value))

  function persist() {
    saveArrangement(ownerId.value, area, saved.value)
  }
  function hide(key) {
    saved.value = hideKey(arrangement.value, key)
    persist()
  }
  function show(key) {
    const home = defaults.value.findIndex((column) => column.includes(key))
    saved.value = moveKey(arrangement.value, key, Math.max(home, 0))
    persist()
  }
  function reset() {
    saved.value = null
    persist()
  }
  function finish() {
    editing.value = false
    suppressClick = false
  }

  let drag = null
  let press = null
  let frame = 0
  let suppressClick = false

  function start(event, key) {
    if (event.button !== 0 || event.target.closest('.arrange-remove')) return
    if (!editing.value) {
      waitFor(event, LONG_PRESS, () => {
        editing.value = true
        suppressClick = true
        navigator.vibrate?.(12)
      })
      return
    }
    const el = event.currentTarget
    // Mit der Maus sofort, mit dem Finger nach kurzem Halten – sonst bleibt Scrollen möglich.
    if (event.pointerType === 'mouse') {
      event.preventDefault()
      pickUp(el, key, event.clientX, event.clientY)
    } else {
      waitFor(event, TOUCH_PICKUP, () => pickUp(el, key, event.clientX, event.clientY))
    }
  }

  function waitFor(event, delay, done) {
    cancelPress()
    press = { x: event.clientX, y: event.clientY, timer: setTimeout(() => { cancelPress(); done() }, delay) }
    window.addEventListener('pointermove', pressMove)
    window.addEventListener('pointerup', cancelPress)
    window.addEventListener('pointercancel', cancelPress)
  }
  function pressMove(event) {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > TOLERANCE) cancelPress()
  }
  function cancelPress() {
    if (press) clearTimeout(press.timer)
    press = null
    window.removeEventListener('pointermove', pressMove)
    window.removeEventListener('pointerup', cancelPress)
    window.removeEventListener('pointercancel', cancelPress)
  }

  function pickUp(el, key, x, y) {
    const rect = el.getBoundingClientRect()
    drag = { key, el, origin: el, x, y, grabX: x - rect.left, grabY: y - rect.top, tx: 0, ty: 0, settleUntil: 0, moved: false }
    dragging.value = key
    navigator.vibrate?.(8)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', drop)
    window.addEventListener('pointercancel', drop)
    // Wechselt der Kasten die Spalte, baut Vue ihn neu; ein Finger meldet sich aber weiter
    // beim alten Element – deshalb hört auch dieses mit und verhindert das Scrollen.
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', drop)
    el.addEventListener('pointercancel', drop)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    frame = requestAnimationFrame(tick)
  }
  function onMove(event) {
    if (!drag) return
    drag.x = event.clientX
    drag.y = event.clientY
  }
  function tick() {
    if (!drag) return
    autoScroll()
    follow()
    retarget()
    frame = requestAnimationFrame(tick)
  }
  // Der Kasten bleibt unter dem Finger, auch wenn er im Raster schon woanders steht.
  function follow() {
    if (!drag.el.isConnected) {
      const next = container.value?.querySelector(`[data-arrange-key="${drag.key}"]`)
      if (!next) return
      drag.el = next
      drag.tx = 0
      drag.ty = 0
    }
    const rect = drag.el.getBoundingClientRect()
    drag.tx = drag.x - drag.grabX - (rect.left - drag.tx)
    drag.ty = drag.y - drag.grabY - (rect.top - drag.ty)
    drag.el.style.transform = `translate(${drag.tx}px, ${drag.ty}px)`
  }
  function autoScroll() {
    const height = window.innerHeight
    const speed = drag.y < EDGE ? -(EDGE - drag.y) / 4 : drag.y > height - EDGE ? (drag.y - (height - EDGE)) / 4 : 0
    // Nur so weit, wie die Fläche reicht – der gezogene Kasten selbst verlängert sonst die Seite.
    const board = container.value?.getBoundingClientRect()
    if (!speed || !board || (speed > 0 && board.bottom < height - EDGE) || (speed < 0 && board.top > EDGE)) return
    scroller().scrollBy(0, speed)
  }
  function scroller() {
    for (let el = container.value?.parentElement; el; el = el.parentElement) {
      const overflow = getComputedStyle(el).overflowY
      if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return el
    }
    return window
  }

  // Ziel ist die nächstgelegene Spalte, dort vor dem ersten Kasten, dessen Mitte unter dem Finger liegt.
  function retarget() {
    if (performance.now() < drag.settleUntil || !container.value) return
    let best = null
    container.value.querySelectorAll('[data-arrange-column]').forEach((column) => {
      const rect = column.getBoundingClientRect()
      const distance = Math.hypot(Math.max(rect.left - drag.x, 0, drag.x - rect.right), Math.max(rect.top - drag.y, 0, drag.y - rect.bottom))
      if (!best || distance < best.distance) best = { column, distance }
    })
    if (!best) return
    const index = Number(best.column.dataset.arrangeColumn)
    const before = [...best.column.querySelectorAll(':scope > [data-arrange-key]')]
      .filter((el) => el !== drag.el)
      .find((el) => {
        const rect = el.getBoundingClientRect()
        return drag.y < rect.top + rect.height / 2
      })?.dataset.arrangeKey || null
    const current = arrangement.value.columns[index]
    const position = current.indexOf(drag.key)
    if (position !== -1 && (current[position + 1] || null) === before) return
    const others = [...container.value.querySelectorAll('[data-arrange-key]')].filter((el) => el !== drag.el)
    const first = new Map(others.map((el) => [el, el.getBoundingClientRect()]))
    saved.value = moveKey(arrangement.value, drag.key, index, before)
    drag.moved = true
    drag.settleUntil = performance.now() + 140
    nextTick(() => {
      first.forEach((rect, el) => {
        if (!el.isConnected) return
        const now = el.getBoundingClientRect()
        const dx = rect.left - now.left
        const dy = rect.top - now.top
        if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: EASE })
      })
      if (drag) follow()
    })
  }
  function drop() {
    if (!drag) return
    cancelAnimationFrame(frame)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', drop)
    window.removeEventListener('pointercancel', drop)
    const { el, origin, tx, ty, moved } = drag
    origin.removeEventListener('pointermove', onMove)
    origin.removeEventListener('pointerup', drop)
    origin.removeEventListener('pointercancel', drop)
    origin.removeEventListener('touchmove', onTouchMove)
    drag = null
    dragging.value = ''
    el.style.transform = ''
    if (tx || ty) el.animate([{ transform: `translate(${tx}px, ${ty}px)` }, { transform: 'none' }], { duration: 200, easing: EASE })
    if (moved) persist()
  }

  // Im Anordnen-Modus führen Klicks in Kästen nirgendwohin, und ein gehaltener Finger scrollt nicht.
  function onClick(event) {
    if (!editing.value && !suppressClick) return
    suppressClick = false
    if (!event.target.closest('[data-arrange-key]') || event.target.closest('.arrange-remove')) return
    event.preventDefault()
    event.stopPropagation()
  }
  function onTouchMove(event) {
    if (drag) event.preventDefault()
  }
  function onContextMenu(event) {
    if (editing.value && event.target.closest('[data-arrange-key]')) event.preventDefault()
  }
  function onKey(event) {
    if (event.key === 'Escape' && editing.value) finish()
  }

  watch(container, (el, old) => {
    old?.removeEventListener('click', onClick, true)
    old?.removeEventListener('touchmove', onTouchMove)
    old?.removeEventListener('contextmenu', onContextMenu)
    el?.addEventListener('click', onClick, true)
    el?.addEventListener('touchmove', onTouchMove, { passive: false })
    el?.addEventListener('contextmenu', onContextMenu)
  }, { immediate: true, flush: 'post' })
  watch(editing, (on) => {
    if (on) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    cancelPress()
    drop()
    window.removeEventListener('keydown', onKey)
  })

  return { arrangement, editing, dragging, customized, start, hide, show, reset, finish }
}
