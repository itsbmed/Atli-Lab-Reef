export const heroGauges = [
  { name: 'Calcium', value: '412', unit: 'mg/l', pos: 56, band: [40, 72], status: 'optimal' },
  { name: 'Karbonathärte', value: '7,2', unit: '°dKH', pos: 26, band: [44, 74], status: 'low' },
  { name: 'Magnesium', value: '1280', unit: 'mg/l', pos: 52, band: [38, 70], status: 'optimal' },
]

export const trustItems = [
  { label: 'ICP-OES Präzision', text: 'Laboranalytik auf Profi-Niveau', icon: svgFlask() },
  { label: 'Digital aktiviert', text: 'Probe per QR-Code zuordnen', icon: svgQr() },
  { label: 'Verlauf inklusive', text: 'Jede Analyse bleibt im Konto', icon: svgChart() },
  { label: 'Klartext-Empfehlung', text: 'Priorisierte nächste Schritte', icon: svgCheck() },
]

export const rawNumbers = ['412', '7.2', '1280', '0.041', '12', '435', '0.03', '8.21', '1.4', '0.9', '64', '2.1']

export const cleanRows = [
  { name: 'Calcium', label: 'Optimal', status: 'optimal' },
  { name: 'Karbonathärte', label: 'Zu niedrig · anheben', status: 'low' },
  { name: 'Magnesium', label: 'Optimal', status: 'optimal' },
  { name: 'Jod', label: 'Beobachten', status: 'watch' },
]

export const landingSteps = [
  { n: '01', title: 'Testkit kaufen', text: 'ATI ICP-Kit online oder beim Fachhändler erwerben.', icon: svgKit() },
  { n: '02', title: 'Wasserprobe nehmen', text: 'Röhrchen nach Anleitung mit Aquarienwasser füllen.', icon: svgDrop() },
  { n: '03', title: 'Barcode aktivieren', text: 'QR-Code im Konto scannen und dem Aquarium zuordnen.', icon: svgQr() },
  { n: '04', title: 'Probe einsenden', text: 'Sicher verpacken und an das ATI Labor schicken.', icon: svgSend() },
  { n: '05', title: 'Bericht verstehen', text: 'Zielbereiche, Verlauf und Empfehlungen digital abrufen.', icon: svgReport() },
]

function svgKit() { return '<svg viewBox="0 0 64 64" fill="none"><rect x="13" y="22" width="38" height="30" rx="6" stroke="currentColor" stroke-width="3"/><path d="M13 31h38M24 22v-3a8 8 0 0 1 16 0v3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' }
function svgDrop() { return '<svg viewBox="0 0 64 64" fill="none"><path d="M32 13c8.5 10.4 14 17.3 14 25.2A14 14 0 0 1 18 38.2C18 30.3 23.5 23.4 32 13Z" stroke="currentColor" stroke-width="3"/><path d="M26 39a6 6 0 0 0 6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' }
function svgQr() { return '<svg viewBox="0 0 64 64" fill="none"><rect x="13" y="13" width="15" height="15" rx="3" stroke="currentColor" stroke-width="3"/><rect x="36" y="13" width="15" height="15" rx="3" stroke="currentColor" stroke-width="3"/><rect x="13" y="36" width="15" height="15" rx="3" stroke="currentColor" stroke-width="3"/><path d="M38 38h5v5h-5zm9 0h5v5h-5zm-9 9h5v5h-5z" fill="currentColor"/></svg>' }
function svgSend() { return '<svg viewBox="0 0 64 64" fill="none"><path d="M53 12 11 30l17 6 6 17 19-41Z" stroke="currentColor" stroke-width="3"/><path d="M53 12 28 36" stroke="currentColor" stroke-width="3"/></svg>' }
function svgReport() { return '<svg viewBox="0 0 64 64" fill="none"><rect x="16" y="11" width="30" height="42" rx="5" stroke="currentColor" stroke-width="3"/><path d="M23 25h13M23 33h16M23 41h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="44" cy="45" r="9" fill="var(--brand-orange)"/><path d="m40 45.5 3 3 5-6" stroke="#fff" stroke-width="2.6"/></svg>' }
function svgFlask() { return '<svg viewBox="0 0 48 48" fill="none"><path d="M19 7v12L9 36a4 4 0 0 0 3.5 6h23A4 4 0 0 0 39 36L29 19V7M16 7h16M15 30h18" stroke="currentColor" stroke-width="3"/></svg>' }
function svgChart() { return '<svg viewBox="0 0 48 48" fill="none"><path d="M9 9v30h30M15 30l7-8 6 5 9-12" stroke="currentColor" stroke-width="3"/></svg>' }
function svgCheck() { return '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="3"/><path d="m17 24 5 5 9-11" stroke="currentColor" stroke-width="3"/></svg>' }
