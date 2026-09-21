<template>
  <section class="dose-calendar">
    <header>
      <div><span class="eyebrow">Ihr persönlicher Dosierungsplan</span><h3>Tag für Tag zum Zielwert</h3><p>{{ aquariumName }} · {{ reportNumber }} · {{ volume }} l netto</p></div>
      <label>Startdatum<input v-model="start" type="date" :disabled="Boolean(startDate)" /></label>
    </header>
    <p class="calendar-note">Einmaliger Korrekturkurs. Jede Tagesmenge bleibt innerhalb des freigegebenen Tageslimits. Nach Abschluss erneut messen; den Kurs nicht automatisch wiederholen.</p>
    <p v-if="simulation" class="calendar-note">Simulation · Messwerte sind Testdaten. Produktwirkung und Tageslimit basieren auf Herstellerangaben.</p>
    <div class="course-products">
      <article v-for="item in items" :key="item.key"><strong>{{ item.label }} · {{ item.dose.productName }}</strong><p>{{ number(item.value) }} → {{ number(item.targetValue) }} {{ item.unit }} · Gesamt {{ number(item.dose.totalMl) }} ml · {{ item.dose.days }} Tage</p><small>Maximal {{ number(item.dose.maxDailyMl) }} ml / Tag ({{ number(item.dose.maxDailyIncrease) }} {{ item.unit }} / Tag)</small><p v-if="item.dose.instructions">{{ item.dose.instructions }}</p></article>
    </div>
    <section v-for="(week, index) in weeks" :key="index" class="calendar-week"><h4>Woche {{ index + 1 }} · {{ displayDate(week[0].date) }} – {{ displayDate(week[6].date) }}</h4><div class="calendar-days"><article v-for="day in week" :key="day.date" class="calendar-day"><h5>{{ day.label }}</h5><div v-for="dose in day.doses" :key="dose.key" class="calendar-dose"><span class="tick-box" aria-hidden="true"></span><div><strong>{{ dose.label }}</strong><b>{{ number(dose.ml) }} ml</b><small>{{ dose.product }}</small></div></div><p v-if="!day.doses.length" class="no-dose">Keine Zugabe</p></article></div></section>
    <p class="calendar-footer">Tagesmengen nach der Zugabe abhaken. Nach dem Kurs Werte kontrollieren. Alle Mengen beziehen sich auf das angegebene Netto-Wasservolumen.</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { calendarWeeks, dateValue } from '@/services/dosingCalendar'
const props = defineProps({ items: { type: Array, required: true }, aquariumName: String, reportNumber: String, volume: Number, startDate: String, simulation: Boolean })
const start = ref(props.startDate || dateValue())
watch(() => props.startDate, value => { if (value) start.value = value })
const weeks = computed(() => calendarWeeks(props.items, start.value))
const number = value => Number(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })
const displayDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('de-DE') : '–'
</script>

<style scoped>
.dose-calendar{display:grid;gap:18px;min-width:0}.dose-calendar>header{display:flex;justify-content:space-between;align-items:center;gap:20px}.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-blue);font-weight:700}.dose-calendar h3{font-size:24px;color:var(--brand-navy);margin:5px 0}.dose-calendar p{color:var(--text-muted);line-height:1.5;font-size:13px}.dose-calendar label{display:grid;gap:6px;font-size:12px;font-weight:600}.dose-calendar input{padding:10px;border:1px solid var(--border);border-radius:12px;font:inherit;background:#fff;color:var(--text)}.calendar-note{padding:14px;border-radius:12px;background:#eef7ff}.course-products{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.course-products article{padding:15px;border:1px solid var(--border);border-radius:14px;background:#f8fbfe}.course-products strong{font-size:14px;color:var(--brand-navy)}.course-products small{font-size:12px;color:var(--text-muted)}.calendar-week h4{font-size:14px;color:var(--brand-navy);margin-bottom:10px}.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:1px solid var(--border);border-radius:14px;overflow:hidden}.calendar-day{padding:12px 9px;min-height:140px;border-right:1px solid var(--border);background:#fff}.calendar-day:last-child{border:0}.calendar-day h5{font-size:12px;color:var(--brand-navy);margin-bottom:12px}.calendar-dose{display:flex;gap:5px;padding:10px 0;border-top:1px solid var(--border)}.calendar-dose>div{min-width:0}.calendar-dose strong,.calendar-dose b,.calendar-dose small{display:block;overflow-wrap:anywhere}.calendar-dose strong{font-size:12px}.calendar-dose b{font-size:14px;color:var(--brand-blue);margin:4px 0}.calendar-dose small{font-size:10px;color:var(--text-muted)}.tick-box{width:10px;height:10px;border:1px solid var(--text-muted);flex:none;margin-top:2px}.calendar-footer{font-size:12px}@media(max-width:1000px){.calendar-days{grid-template-columns:repeat(2,minmax(0,1fr))}.calendar-day{border-bottom:1px solid var(--border)}.dose-calendar>header{align-items:stretch;flex-direction:column}}
</style>
