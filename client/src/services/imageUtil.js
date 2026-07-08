// ── Bild-Helfer (Frontend-Stub) ───────────────────────────────────────
// Ohne Backend legen wir Aquarium-Fotos als Data-URL im localStorage ab.
// Damit die Quota nicht sprengt, wird das Bild vorher clientseitig auf eine
// vernünftige Größe skaliert und als JPEG komprimiert.

export function fileToResizedDataUrl(file, maxSize = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject({ error: 'Bitte eine Bilddatei auswählen.' })
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject({ error: 'Bild konnte nicht gelesen werden.' })
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject({ error: 'Ungültiges Bild.' })
      img.onload = () => {
        let { width, height } = img
        if (width >= height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
