<template>
  <section class="dose-plan">
    <header>
      <div><span class="eyebrow">Ihr persönlicher Dosierungsplan</span><h3>Schritt für Schritt zum Zielwert</h3></div>
      <button class="btn btn-primary" type="button" :disabled="!schedule.days" @click="printPlan">Drucken / PDF</button>
    </header>
    <p v-if="simulation" class="plan-note">Simulation · Messwerte sind Testdaten. Produktwirkung und Tageslimit basieren auf Herstellerangaben.</p>
    <p v-if="error" class="plan-error" role="alert">{{ error }}</p>

    <div ref="printContent" class="plan-document">
      <div class="print-heading"><b>ATI · REEFING MADE SIMPLE</b><h1>Dosierungsplan</h1><p>{{ aquariumName }} · {{ reportNumber }} · {{ volume }} l netto</p><p v-if="simulation">SIMULATION · Keine reale Labormessung. Dosierung nach Herstellerangaben.</p></div>

      <div class="dose-table-wrap">
        <table class="dose-table">
          <thead>
            <tr>
              <th scope="col" class="col-element">Element · Produkt</th>
              <th v-for="day in schedule.days" :key="day" scope="col" class="col-day">Tag {{ day }}</th>
              <th scope="col" class="col-max">Max-Dosis</th>
              <th scope="col" class="col-daily">Tagesdosis</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in schedule.rows" :key="row.key">
              <th scope="row" class="col-element"><strong>{{ row.label }}</strong><small>{{ row.productName }}</small></th>
              <td v-for="(amount, index) in row.amounts" :key="index" :class="['col-day', { empty: !amount }]">
                <span v-if="amount" class="tick-box" aria-hidden="true"></span>{{ amount ? `${number(amount)} ml` : '–' }}
              </td>
              <td class="col-max">{{ number(row.maxDailyMl) }} ml</td>
              <td class="col-daily">{{ number(row.dailyMl) }} ml</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="plan-footer">Tag 1 ist der Tag, an dem Sie beginnen. Tagesmengen nach der Zugabe abhaken. Die Tagesdosis bleibt immer innerhalb der freigegebenen Max-Dosis. Nach Abschluss des Kurses erneut messen und den Kurs nicht automatisch wiederholen.</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { doseSchedule } from '@/services/dosingCalendar'
const props = defineProps({ items: { type: Array, required: true }, aquariumName: String, reportNumber: String, volume: Number, simulation: Boolean })
const schedule = computed(() => doseSchedule(props.items))
const printContent = ref(null)
const error = ref('')
const number = value => Number(value).toLocaleString('de-DE', { maximumFractionDigits: 6 })
function printPlan() {
  error.value = ''
  const popup = window.open('', '_blank', 'width=1100,height=800')
  if (!popup) { error.value = 'Bitte das Druckfenster im Browser erlauben und erneut versuchen.'; return }
  popup.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>ATI Dosierungsplan</title><style>${printStyles}</style></head><body>${printContent.value.innerHTML}</body></html>`)
  popup.document.close()
  popup.opener = null
  popup.focus()
  popup.setTimeout(() => popup.print(), 250)
}
const printStyles = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{background:#fff;font:10px Arial,sans-serif;color:#0a1b43;margin:0}h1{font-size:28px;margin:8px 0}p{line-height:1.5}.print-heading{padding:0 0 12px;border-bottom:3px solid #0072ce}.print-heading b{color:#0072ce;letter-spacing:2px}.dose-table{width:100%;border-collapse:collapse;margin:14px 0;table-layout:auto}.dose-table th,.dose-table td{padding:6px 7px;border:1px solid #cbd9e7;text-align:center;white-space:nowrap}.dose-table thead th{background:#eef7ff;color:#0072ce;font-size:9px;text-transform:uppercase;letter-spacing:.04em}.dose-table .col-element{text-align:left;white-space:normal}.dose-table tbody .col-element strong{display:block;font-size:11px}.dose-table tbody .col-element small{color:#526780}.dose-table .col-max,.dose-table .col-daily{background:#f6fafc;font-weight:bold}.dose-table .empty{color:#98a8ba}.tick-box{display:inline-block;width:8px;height:8px;border:1px solid #526780;margin-right:4px}.plan-footer{padding-top:10px;border-top:1px solid #cbd9e7;color:#526780;font-size:9px}`
</script>

<style scoped>
.dose-plan{display:grid;gap:16px;min-width:0}.dose-plan>header{display:flex;justify-content:space-between;align-items:center;gap:20px}.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-blue);font-weight:700}.dose-plan h3{font-size:24px;color:var(--brand-navy);margin:5px 0}.plan-note{padding:14px;border-radius:12px;background:#eef7ff;color:var(--text-muted);font-size:13px;line-height:1.5}.plan-error{color:#b53a2e}.plan-document{display:grid;gap:14px;min-width:0}.print-heading{display:none}.dose-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:14px;background:#fff}.dose-table{width:100%;border-collapse:collapse;font-size:13px}.dose-table th,.dose-table td{padding:11px 12px;border-bottom:1px solid var(--border);text-align:center;white-space:nowrap}.dose-table tbody tr:last-child th,.dose-table tbody tr:last-child td{border-bottom:0}.dose-table thead th{position:sticky;top:0;background:#f4f8fb;color:var(--text-muted);font-size:10px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.dose-table .col-element{position:sticky;left:0;z-index:1;min-width:180px;background:#fff;text-align:left;white-space:normal}.dose-table thead .col-element{z-index:2;background:#f4f8fb}.dose-table tbody .col-element strong{display:block;color:var(--text);font-size:14px}.dose-table tbody .col-element small{color:var(--text-muted);font-size:11px}.dose-table .col-max,.dose-table .col-daily{background:#f8fbfe;font-weight:800;color:var(--brand-blue)}.dose-table .col-max{color:var(--text-muted)}.dose-table td.empty{color:#a8b7c6}.tick-box{display:inline-block;width:10px;height:10px;margin-right:6px;border:1px solid var(--text-muted);vertical-align:middle}.plan-footer{color:var(--text-muted);font-size:12px;line-height:1.5}@media(max-width:1000px){.dose-plan>header{align-items:stretch;flex-direction:column}}
</style>
