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

      <div class="dose-scroll">
        <div class="dosing-grid" :style="gridStyle">
          <div class="dosing-head">Element</div>
          <div v-for="day in schedule.days" :key="`head-${day}`" class="dosing-head">Tag {{ day }}</div>
          <div class="dosing-head summary">Gesamt-Dosis</div>

          <template v-for="row in schedule.rows" :key="row.key">
            <div class="dosing-element">
              {{ row.label }}
              <span>{{ row.productName }}</span>
              <small>{{ row.courseDays }} {{ row.courseDays === 1 ? 'Tag' : 'Tage' }} · Tageslimit {{ number(row.maxDailyMl) }} ml</small>
            </div>
            <div v-for="(amount, index) in row.amounts" :key="`${row.key}-${index}`" :class="['dose-cell', { inactive: !amount }]">
              <label v-if="amount" class="dose-check">
                <input v-model="ticked[`${row.key}-${index}`]" type="checkbox" :aria-label="`${row.label}, Tag ${index + 1}, ${number(amount)} ml`" />
                <span></span>
                <b>{{ number(amount) }} ml</b>
              </label>
              <span v-else class="dose-empty" aria-hidden="true">–</span>
            </div>
            <div class="dose-cell summary total">{{ number(row.totalMl) }} ml</div>
          </template>
        </div>
      </div>

      <p class="plan-footer">Tag 1 ist der Tag, an dem Sie beginnen. Die Tagesdosis bleibt immer innerhalb des freigegebenen Tageslimits. Nach Abschluss des Kurses erneut messen und den Kurs nicht automatisch wiederholen.</p>
    </div>

    <ProductSuggestions v-if="products.length" class="dose-products" :products="products" />
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { doseSchedule } from '@/services/dosingCalendar'
import { recommendedDosingProducts } from '@/services/dosingConfig'
import ProductSuggestions from '@/components/analyses/ProductSuggestions.vue'

const props = defineProps({
  items: { type: Array, required: true },
  parameters: { type: Array, default: () => [] },
  aquariumName: String,
  reportNumber: String,
  volume: Number,
  simulation: Boolean,
})
const schedule = computed(() => doseSchedule(props.items))
const products = computed(() => recommendedDosingProducts(props.items, props.parameters))
const gridStyle = computed(() => ({ gridTemplateColumns: `minmax(150px, 1.5fr) repeat(${schedule.value.days}, minmax(58px, 1fr)) minmax(104px, 0.95fr)` }))
const ticked = reactive({})
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
const printStyles = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{background:#fff;font:10px Arial,sans-serif;color:#0a1b43;margin:0}h1{font-size:28px;margin:8px 0}p{line-height:1.5}.print-heading{padding:0 0 12px;border-bottom:3px solid #0072ce}.print-heading b{color:#0072ce;letter-spacing:2px}.dosing-grid{display:grid;border:1px solid #cbd9e7;border-radius:8px;overflow:hidden;margin:14px 0}.dosing-head,.dosing-element,.dose-cell{min-height:42px;display:flex;align-items:center;justify-content:center;border-right:1px solid #cbd9e7;border-bottom:1px solid #cbd9e7;padding:5px}.dosing-head{background:#eef7ff;color:#0072ce;font-size:8px;text-transform:uppercase}.dosing-element{flex-direction:column;align-items:flex-start;padding:7px 9px;font-weight:bold}.dosing-element span{font-size:9px;color:#526780;font-weight:normal}.dosing-element small{color:#0072ce;font-size:8px}.dose-cell.summary{background:#f6fafc;font-weight:bold}.dose-check{display:flex;align-items:center;justify-content:center;gap:4px}.dose-check input{display:none}.dose-check span{width:9px;height:9px;border:1px solid #526780;flex:none}.dose-check b{font-size:9px}.dose-empty{color:#98a8ba}.plan-footer{padding-top:10px;border-top:1px solid #cbd9e7;color:#526780;font-size:9px}`
</script>

<style scoped>
.dose-plan{display:grid;gap:16px;min-width:0}.dose-plan>header{display:flex;justify-content:space-between;align-items:center;gap:20px}.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-blue);font-weight:700}.dose-plan h3{font-size:24px;color:var(--brand-navy);margin:5px 0}.plan-note{padding:14px;border-radius:12px;background:#eef7ff;color:var(--text-muted);font-size:13px;line-height:1.5}.plan-error{color:#b53a2e}.plan-document{display:grid;gap:14px;min-width:0}.print-heading{display:none}.dose-scroll{overflow-x:auto;padding-bottom:2px}
.dosing-grid{display:grid;min-width:620px;border:1px solid var(--border);border-radius:18px;overflow:hidden}
.dosing-head,.dosing-element,.dose-cell{min-height:62px;display:flex;align-items:center;justify-content:center;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:rgba(255,255,255,.84)}
.dosing-head{background:rgba(234,249,252,.9);color:var(--text-muted);font-size:11px;font-weight:var(--fw-label,800);letter-spacing:.04em;text-transform:uppercase}
.dosing-head.summary{background:#e3f1f9;color:var(--brand-blue)}
.dosing-element{flex-direction:column;align-items:flex-start;gap:2px;padding:12px 14px;font-weight:var(--fw-label,800)}
.dosing-element span{font-size:11px;color:var(--text-muted);font-weight:var(--fw-ui,500)}
.dosing-element small{margin-top:3px;color:var(--teal-700);font-size:9.5px;font-weight:var(--fw-bold,700)}
.dose-cell{position:relative}.dose-cell.inactive{background:#f5f8fa}
.dose-cell.summary{background:#f8fbfe;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
.dose-cell.total{color:var(--brand-blue)}
.dose-check{display:grid;place-items:center;gap:6px;width:100%;min-height:62px;padding:9px 4px;align-content:center;cursor:pointer}
.dose-check input{position:absolute;opacity:0}
.dose-check>span{width:22px;height:22px;border-radius:7px;border:2px solid var(--border-strong,#b8c9dd);background:#fff;transition:border-color .15s,background .15s}
.dose-check input:checked+span{border-color:var(--teal-500,#0f9f8f);background:var(--teal-500,#0f9f8f);box-shadow:inset 0 0 0 5px #fff}
.dose-check input:focus-visible+span{outline:3px solid rgba(0,114,206,.2);outline-offset:3px}
.dose-check b{color:var(--text-muted);font-size:10.5px;font-weight:800;white-space:nowrap}
.dose-check input:checked~b{color:var(--teal-700)}
.dose-empty{color:#b9c7d1;font-size:16px}
.plan-footer{color:var(--text-muted);font-size:12px;line-height:1.5}.dose-products{margin-top:2px}
@media(max-width:1000px){.dose-plan>header{align-items:stretch;flex-direction:column}}
</style>
