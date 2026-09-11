export const APP_PRELOADER_EVENT = 'ati:play-preloader'

export function playAppPreloader(reason) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(APP_PRELOADER_EVENT, { detail: { reason } }))
}
