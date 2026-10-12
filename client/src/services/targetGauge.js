// Skala für die Zielbereich-Anzeige eines Messwerts.
// Der Zielbereich sitzt in der Mitte, links und rechts bleibt je eine Zielbreite Luft;
// Ausreißer dehnen die Skala, aber höchstens auf das Vierfache der Zielbreite.

const MAX_STRETCH = 4

export function gaugeScale(min, max, value) {
  const span = max > min ? max - min : Math.abs(max) * 0.5 || 1
  let start = min >= 0 ? Math.max(0, min - span) : min - span
  let end = max + span
  // Gedehnte Enden auf glatte Werte runden, damit die Skala nicht bei 8.412 beginnt.
  const step = 5 * 10 ** (Math.floor(Math.log10(span)) - 1)
  const tidy = (n, round) => Number((round(n / step) * step).toPrecision(12))
  if (Number.isFinite(value)) {
    if (value > end) end = tidy(Math.min(value * 1.08, max + MAX_STRETCH * span), Math.ceil)
    if (value < start) start = Math.max(min >= 0 ? 0 : -Infinity, tidy(Math.max(value - span * 0.1, min - MAX_STRETCH * span), Math.floor))
  }
  return { start, end }
}

export function gaugePercent(value, { start, end }) {
  if (!Number.isFinite(value) || end <= start) return 0
  return Math.min(100, Math.max(0, ((value - start) / (end - start)) * 100))
}

// Alle Skalenwerte mit derselben Nachkommazahl – so viele, wie die Zielgrenzen brauchen.
export function tickFormatter(min, max) {
  const decimals = Math.min(4, Math.max(...[min, max].map((n) => (String(n).split('.')[1] || '').length)))
  return (value) => Number(value).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Wie weit der Wert über die Skala hinausragt: 'over', 'under' oder ''.
export function overflow(value, { start, end }) {
  if (!Number.isFinite(value)) return ''
  return value > end ? 'over' : value < start ? 'under' : ''
}

// Messwerte deutsch schreiben, mit genau den Nachkommastellen, die das Labor geliefert hat.
export function formatReading(value) {
  const number = Number(value)
  if (value === null || value === '' || !Number.isFinite(number)) return String(value ?? '—')
  const decimals = Math.min(6, (String(value).split('.')[1] || '').length)
  return number.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Skalenbeschriftung ohne Überlappung: Kandidaten nach Priorität aufnehmen und
// alles weglassen, was mit schon gesetzten Beschriftungen kollidiert.
// `at` in Prozent, `width` in Pixeln; mittige Beschriftungen rücken an den Rändern nach innen.
export function layoutLabels(candidates, trackWidth, gap = 8) {
  if (!trackWidth) return []
  const placed = []
  const position = (label, align) => {
    const x = (label.at / 100) * trackWidth
    const left = {
      start: 0,
      end: trackWidth - label.width,
      before: x - label.width, // rechtsbündig an der Linie
      after: x, // linksbündig an der Linie
    }[align] ?? x - label.width / 2
    return Math.min(Math.max(left, 0), trackWidth - label.width)
  }
  // Mittig zuerst; Zielgrenzen dürfen nach außen ausweichen (`fallback`).
  for (const label of [...candidates].sort((a, b) => a.priority - b.priority)) {
    for (const align of [label.align, label.fallback].filter((a, i) => i === 0 || a)) {
      const left = position(label, align)
      const right = left + label.width
      if (left < 0 || placed.some((other) => left < other.right + gap && other.left < right + gap)) continue
      placed.push({ ...label, left, right })
      break
    }
  }
  return placed.sort((a, b) => a.left - b.left)
}
