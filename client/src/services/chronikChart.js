// Ein gemeinsames Verlaufsdiagramm für mehrere Aquarien und Parameter.
// Zwei y-Achsen erfinden Zusammenhänge, die es nicht gibt – deshalb bringen drei
// Skalen alles auf eine Achse:
//   Messwert     – die echten Werte; nur wenn alle Parameter dieselbe Einheit haben
//   Zielbereich  – 0 % = untere, 100 % = obere Zielgrenze; ein Band für alle Parameter
//   Veränderung  – jede Linie relativ zu ihrem ersten Bericht im Zeitraum
// Der echte Wert mit Einheit bleibt an jedem Punkt erhalten (Tooltip, Tabelle).

import { TANK_COLORS, TANK_COLOR_OTHER, assignColors, formatValue, series as seriesFor } from './chronik.js'

export const SCALE_MODES = Object.freeze([
  { key: 'value', label: 'Messwert', axis: (unit) => unit },
  { key: 'target', label: 'Zielbereich', axis: () => 'Lage im Zielbereich' },
  { key: 'change', label: 'Veränderung', axis: () => 'Veränderung seit dem ersten Bericht' },
])

// Linienarten für den Parameter, wenn die Farbe schon das Aquarium trägt.
export const LINE_STYLES = Object.freeze([
  { dash: [], point: 'circle', name: 'durchgezogen' },
  { dash: [8, 5], point: 'rect', name: 'gestrichelt' },
  { dash: [2, 4], point: 'triangle', name: 'gepunktet' },
  { dash: [12, 4, 2, 4], point: 'rectRot', name: 'Strich-Punkt' },
])

// Mehr Linienarten unterscheidet niemand; mit nur einem Aquarium trägt die Farbe den Parameter.
export const PARAMETER_LIMIT = Object.freeze({ multiTank: LINE_STYLES.length, singleTank: TANK_COLORS.length })

// Weiter als vier Zielbreiten über bzw. zwei unter dem Ziel wird gekappt und markiert,
// sonst drückt ein einzelner Ausreißer (Nitrat 71 bei Ziel 2–10 = 862 %) alle anderen Linien flach.
export const TARGET_CLIP = Object.freeze({ low: -200, high: 400 })

export function sharedUnit(metas) {
  const units = [...new Set(metas.map((meta) => meta.unit))]
  return units.length === 1 ? units[0] : null
}

export function availableModes(metas) {
  return SCALE_MODES.filter((mode) => mode.key !== 'value' || sharedUnit(metas)).map((mode) => mode.key)
}

// Ein Parameter oder eine gemeinsame Einheit: echte Werte. Sonst der Zielbereich.
export function defaultMode(metas) {
  return metas.length <= 1 || sharedUnit(metas) && spreadIsSmall(metas) ? 'value' : 'target'
}

// Calcium und Magnesium teilen mg/l, Nitrat auch – auf einer Achse wäre Nitrat aber ein Strich am Boden.
function spreadIsSmall(metas) {
  const centres = metas.map((meta) => (meta.min + meta.max) / 2).filter((value) => value > 0)
  return centres.length === metas.length && Math.max(...centres) / Math.min(...centres) <= 5
}

export function targetPercent(value, min, max) {
  if (!Number.isFinite(value)) return null
  const width = max - min || Math.abs(max) * 0.1 || 1
  return Number((((value - min) / width) * 100).toPrecision(12))
}

export function changePercent(value, base) {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base === 0) return null
  return Number(((value / base - 1) * 100).toPrecision(12))
}

// Wo ein Wert zum Ziel liegt, in echten Einheiten: „6,2 dKH über Ziel“ liest sich richtig,
// „620 % über Ziel“ klingt nach dem Sechsfachen.
export function describeOffset(value, meta) {
  if (!Number.isFinite(value)) return ''
  if (value > meta.max) return `${formatValue(value - meta.max)} ${meta.unit} über Ziel`
  if (value < meta.min) return `${formatValue(meta.min - value)} ${meta.unit} unter Ziel`
  return 'im Ziel'
}

export function formatChange(percent) {
  if (percent === null) return '—'
  const rounded = Math.abs(percent) < 10 ? formatValue(Math.abs(percent), 1) : formatValue(Math.abs(percent), 0)
  return `${percent > 0.05 ? '+' : percent < -0.05 ? '−' : '±'}${rounded} %`
}

// Die Parameter, die ins gemeinsame Diagramm passen; der Rest bleibt im Vergleich sichtbar.
export function chartParameters(metas, tankCount) {
  const limit = tankCount > 1 ? PARAMETER_LIMIT.multiTank : PARAMETER_LIMIT.singleTank
  return { shown: metas.slice(0, limit), hidden: metas.slice(limit) }
}

// Linien: ein Aquarium → Farbe je Parameter; mehrere → Farbe je Aquarium, Linienart je Parameter.
export function buildSeries({ tanks, metas, mode, parameterSlots = {} }) {
  const byTank = tanks.length > 1
  const slots = byTank ? {} : assignColors(metas.map((meta) => meta.key), parameterSlots)
  return tanks.flatMap((tank) => metas.map((meta, index) => {
    const raw = seriesFor(tank.reports, meta.key)
    const base = raw.find((point) => Number.isFinite(point.value))?.value ?? null
    const style = byTank ? LINE_STYLES[index] || LINE_STYLES[0] : LINE_STYLES[0]
    const slot = slots[meta.key]
    const color = byTank ? tank.color : slot >= 0 ? TANK_COLORS[slot] : TANK_COLOR_OTHER
    const points = raw.map((point) => {
      const scaled = mode === 'target' ? targetPercent(point.value, meta.min, meta.max)
        : mode === 'change' ? changePercent(point.value, base)
          : point.value
      const clipped = mode === 'target' && scaled !== null && (scaled > TARGET_CLIP.high || scaled < TARGET_CLIP.low)
      return {
        ...point,
        scaled,
        y: clipped ? Math.min(TARGET_CLIP.high, Math.max(TARGET_CLIP.low, scaled)) : scaled,
        clipped: clipped ? (scaled > 0 ? 'high' : 'low') : '',
        target: targetPercent(point.value, meta.min, meta.max),
      }
    })
    return {
      id: `${tank.id}:${meta.key}`,
      tank,
      meta,
      color,
      style,
      label: byTank && metas.length > 1 ? `${meta.label} · ${tank.name}` : byTank ? tank.name : meta.label,
      base,
      indexable: mode !== 'change' || (base !== null && base !== 0),
      points,
    }
  }))
}

// Kennzahlen je Linie, in echten Werten.
export function seriesStats(points) {
  const values = points.map((point) => point.value).filter(Number.isFinite)
  if (!values.length) return null
  const first = values[0]
  const last = values.at(-1)
  return {
    count: values.length,
    last,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    change: values.length > 1 ? changePercent(last, first) : null,
  }
}
