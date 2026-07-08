// ── Generierte Aquarium-Motive ────────────────────────────────────────
// 8 stilisierte Riff-Szenen als Inline-SVG (keine externen Bilder, winzig).
// Der Nutzer kann eines davon wählen oder ein eigenes Foto hochladen.

function reefSvg({ id, top, bottom, sand, c1, c2, fish }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="w${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#w${id})"/>
<g fill="#ffffff" opacity="0.07"><polygon points="60,0 110,0 40,300 -30,300"/><polygon points="205,0 240,0 175,300 120,300"/><polygon points="330,0 370,0 330,300 285,300"/></g>
<g fill="#ffffff" opacity="0.55"><circle cx="150" cy="92" r="2.6"/><circle cx="160" cy="70" r="1.7"/><circle cx="146" cy="54" r="2"/><circle cx="300" cy="80" r="2.2"/><circle cx="292" cy="62" r="1.4"/></g>
<path d="M0 252 Q110 224 210 246 T400 240 V300 H0 Z" fill="${sand}"/>
<g fill="${c1}"><path d="M72 256 C60 222 54 210 72 194 C84 210 94 214 86 248 Z"/><circle cx="72" cy="190" r="11"/><circle cx="88" cy="204" r="8"/></g>
<g fill="${c1}"><rect x="252" y="212" width="6" height="44" rx="3"/><rect x="263" y="224" width="6" height="32" rx="3"/><rect x="242" y="226" width="6" height="30" rx="3"/></g>
<g fill="${c2}"><circle cx="316" cy="242" r="17"/><circle cx="337" cy="250" r="12"/><circle cx="300" cy="252" r="10"/></g>
<g fill="${c2}" opacity="0.95"><path d="M122 258 C120 234 132 224 144 232 C154 240 148 256 143 258 Z"/></g>
<g fill="${fish}"><g transform="translate(182,112)"><ellipse rx="16" ry="9"/><polygon points="-14,0 -27,-8 -27,8"/><polygon points="4,-9 12,-16 12,-2"/><circle cx="8" cy="-2" r="1.7" fill="#0b1b3a"/></g><g transform="translate(258,150)" opacity="0.9"><ellipse rx="11" ry="6"/><polygon points="-10,0 -20,-6 -20,6"/><circle cx="5" cy="-1.5" r="1.2" fill="#0b1b3a"/></g></g>
</svg>`
}

const PALETTES = [
  { id: 1, name: 'Riff Blau',        top: '#0a2a6b', bottom: '#0f83d6', sand: '#e2d3a8', c1: '#ff7a59', c2: '#ffd166', fish: '#ffd166' },
  { id: 2, name: 'Türkis Lagune',    top: '#0e7490', bottom: '#2fd4d4', sand: '#ece0c2', c1: '#fb7185', c2: '#fda4af', fish: '#fff3b0' },
  { id: 3, name: 'SPS Violett',      top: '#1e1b4b', bottom: '#6d28d9', sand: '#d9d2e6', c1: '#f472b6', c2: '#a78bfa', fish: '#f9a8d4' },
  { id: 4, name: 'Sonnenuntergang',  top: '#7c2d12', bottom: '#f59e0b', sand: '#f0dcae', c1: '#fb923c', c2: '#fde68a', fish: '#fff1cc' },
  { id: 5, name: 'Tiefsee',          top: '#020617', bottom: '#134a6b', sand: '#3a4a63', c1: '#38bdf8', c2: '#818cf8', fish: '#7dd3fc' },
  { id: 6, name: 'Süßwasser Grün',   top: '#14532d', bottom: '#3fb56b', sand: '#d9c79a', c1: '#4ade80', c2: '#a3e635', fish: '#fde047' },
  { id: 7, name: 'Nano Cube',        top: '#075985', bottom: '#38bdf8', sand: '#ecdfba', c1: '#f97316', c2: '#facc15', fish: '#fed7aa' },
  { id: 8, name: 'Koralle Rosa',     top: '#4a044e', bottom: '#e252a0', sand: '#f0d9e4', c1: '#f9a8d4', c2: '#fbcfe8', fish: '#fff0f6' },
]

export const AQUARIUM_PRESETS = PALETTES.map((p) => ({
  id: `preset-${p.id}`,
  name: p.name,
  dataUrl: `data:image/svg+xml,${encodeURIComponent(reefSvg(p))}`,
}))
