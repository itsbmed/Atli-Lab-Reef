// Pfad einer Datei aus client/public mit dem Basispfad des Builds.
// Vite ergänzt den Basispfad nur in Templates (src="/…") und CSS (url(/…)), nicht in Pfaden im JS-Code.
// Lokal ist der Basispfad "/", auf dem Testserver z. B. "/lab-test/" (vite build --base=/lab-test/).

const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '')

export function publicUrl(path) {
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`
}

// Absolute URL, z. B. für Druckfenster ohne eigene Basis-URL.
export function absolutePublicUrl(path) {
  return typeof window === 'undefined' ? publicUrl(path) : new URL(publicUrl(path), window.location.origin).href
}
