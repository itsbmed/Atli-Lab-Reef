<template>
  <section class="dosing-plan">
    <header class="plan-header">
      <div>
        <span>Dosierungsplan · {{ analysis.reportNumber }}</span>
        <h2>Ihr Dosierungsplan</h2>
        <p>Erforderliche Produktdosierungen mit freigegebenen Mengen und täglichen Zugabegrenzen.</p>
      </div>
      <div class="aquarium-context">
        <small>Berechnungsgrundlage</small>
        <strong>{{ analysis.aquariumName }}</strong>
        <span>{{ formatNumber(volume) }} l netto · {{ supplySystem }}</span>
      </div>
    </header>

    <section v-if="managedDoses.length" class="managed-doses" aria-label="Fortlaufende Dosierung aus dem Laborbericht">
      <header><span>Direkte Empfehlung aus dem Laborbericht</span><strong>Fortlaufende Dosierung</strong></header>
      <article v-for="item in managedDoses" :key="item.key">
        <div><small>{{ item.label }}</small><h3>{{ item.managedDose.productName }}</h3><p>{{ item.managedDose.instructions }}</p></div>
        <div class="managed-dose-amount"><strong>{{ formatNumber(item.managedDose.dailyMl) }} ml</strong><span>pro Tag</span></div>
      </article>
    </section>

    <aside v-if="volume && pendingItems.length" class="blocking-note"><i>i</i><div><strong>{{ pendingItems.map(item => item.label).join(', ') }} · Dosierangaben fehlen</strong><p>Diese Werte sind zu niedrig. Eine aktive, geprüfte Produktformel mit passender Einheit fehlt noch. Die Maßnahmen bleiben in den Analyse-Empfehlungen sichtbar.</p></div></aside>

    <div v-if="!volume" class="blocking-note">
      <i>!</i><div><strong>Plan noch nicht berechenbar</strong><p>Im verbundenen Aquariumprofil fehlt das Netto-Wasservolumen. Bis es ergänzt ist, werden keine Mengen ausgegeben.</p></div>
    </div>

    <div v-else-if="!plan.length" class="clean-state">
      <i>i</i><div><strong>Keine freigegebene Produktdosierung</strong><p>{{ corrections.length ? 'Für niedrige Werte fehlen eine freigegebene Produktformel, ein Tageslimit oder eine direkte Dosierempfehlung. Weitere Maßnahmen finden Sie in den Empfehlungen der Analyse.' : 'Aktuell ist für keinen dosierbaren Messwert eine Anhebung erforderlich.' }}</p></div>
    </div>

    <template v-else>
      <DosingCalendar :items="plan" :parameters="analysis.parameters" :aquarium-name="analysis.aquariumName" :report-number="analysis.reportNumber" :volume="volume" :simulation="analysis.simulation" />
      <section class="plan-summary" aria-label="Zusammenfassung des Korrekturplans">
        <div><span>Zu korrigieren</span><strong>{{ plan.length }}</strong><small>{{ plan.length === 1 ? 'Messwert' : 'Messwerte' }}</small></div>
        <div><span>Kursdauer</span><strong>{{ Math.max(...plan.map(item => item.dose.days)) }}</strong><small>Tage</small></div>
        <div><span>Tageslimit</span><strong>✓</strong><small>je Produkt berücksichtigt</small></div>
        <div class="ready"><span>Exakt freigegeben</span><strong>{{ plan.length }}</strong><small>Produktpläne</small></div>
      </section>

      <div class="sequence-note"><i>i</i><p><strong>Reihenfolge beachten:</strong> Erst Salinität und Ionengleichgewicht stabilisieren. Danach Mengen- und zuletzt Spurenelemente korrigieren.</p></div>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { buildDosingPlan } from '@/services/dosingPlan'
import DosingCalendar from '@/components/analyses/DosingCalendar.vue'

const props = defineProps({ analysis: { type: Object, required: true } })
const volume = computed(() => Number(props.analysis.aquariumProfile?.volumeLiters || props.analysis.aquariumProfile?.net_volume || 0))
const supplySystem = computed(() => props.analysis.aquariumProfile?.supplySystem || 'Versorgung nicht hinterlegt')
const corrections = computed(() => buildDosingPlan(props.analysis.parameters, volume.value))
const plan = computed(() => corrections.value.filter(item => item.dose))
const managedDoses = computed(() => corrections.value.filter(item => item.managedDose))
const pendingItems = computed(() => corrections.value.filter(item => !item.dose && !item.managedDose && item.mode !== 'water' && item.key !== 'phosphorus'))

function formatNumber(value) {
  return Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 6 })
}
</script>

<style scoped>
.dosing-plan{display:grid;gap:22px}.plan-header{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;padding:6px 2px 22px;border-bottom:1px solid var(--border)}.plan-header>div:first-child>span{color:var(--teal-700);font-size:12px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.plan-header h2{margin-top:5px;color:var(--text);font-size:32px;letter-spacing:-.03em}.plan-header p{max-width:720px;margin-top:7px;color:var(--text-muted);font-size:15px;line-height:1.5}.aquarium-context{min-width:270px;padding:15px 17px;border:1px solid var(--border);border-radius:14px;background:#f6fafc}.aquarium-context small,.aquarium-context strong,.aquarium-context span{display:block}.aquarium-context small{color:var(--teal-700);font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.aquarium-context strong{margin-top:4px;color:var(--text);font-size:16px}.aquarium-context span{margin-top:3px;color:var(--text-muted);font-size:13px}.managed-doses{overflow:hidden;border:1px solid #bae6fd;border-radius:15px;background:#f0f9ff}.managed-doses>header{display:flex;justify-content:space-between;gap:16px;padding:13px 17px;border-bottom:1px solid #bae6fd;color:#075985}.managed-doses>header span{font-size:11px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.managed-doses>header strong{font-size:12px}.managed-doses article{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:17px}.managed-doses small{color:#0369a1;font-weight:850;text-transform:uppercase}.managed-doses h3{margin-top:3px;color:#0c4a6e}.managed-doses p{margin-top:5px;color:#456378;font-size:13px}.managed-dose-amount{flex:none;text-align:right}.managed-dose-amount strong,.managed-dose-amount span{display:block}.managed-dose-amount strong{color:#0072ce;font-size:24px}.managed-dose-amount span{color:#456378;font-size:12px}.blocking-note,.clean-state{display:flex;align-items:center;gap:14px;padding:20px;border-radius:15px}.blocking-note{border:1px solid #fed7aa;background:#fff7ed;color:#9a4d0a}.clean-state{min-height:160px;justify-content:center;background:#ecfdf5;color:#047857}.blocking-note>i,.clean-state>i{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:12px;background:#f59e0b;color:#fff;font-style:normal;font-weight:900}.clean-state>i{background:#10b981}.blocking-note strong,.clean-state strong{display:block;font-size:17px}.blocking-note p,.clean-state p{margin-top:4px;font-size:14px;line-height:1.5}.plan-summary{display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;border:1px solid var(--border);border-radius:16px;background:#f8fbfe}.plan-summary>div{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:18px 19px;border-right:1px solid var(--border)}.plan-summary>div:last-child{border:0}.plan-summary span{grid-column:1/-1;color:var(--text-muted);font-size:11px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.plan-summary strong{color:var(--text);font-size:26px}.plan-summary small{align-self:end;padding-bottom:4px;color:var(--text-muted);font-size:11px}.plan-summary .ready{background:#ecfdf5}.plan-summary .ready strong{color:#047857}.sequence-note{display:flex;align-items:center;gap:11px;padding:13px 16px;border-radius:12px;background:#eef7fd;color:#456378;font-size:13px;line-height:1.5}.sequence-note>i{display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:50%;background:var(--brand-blue);color:#fff;font-style:normal;font-weight:900}
@media(max-width:900px){.plan-header{align-items:stretch;flex-direction:column}.aquarium-context{min-width:0}.plan-summary{grid-template-columns:repeat(2,1fr)}.plan-summary>div:nth-child(2){border-right:0}.plan-summary>div:nth-child(-n+2){border-bottom:1px solid var(--border)}}
@media(max-width:600px){.plan-header h2{font-size:26px}.plan-summary{grid-template-columns:1fr}.plan-summary>div{border-right:0;border-bottom:1px solid var(--border)}}
</style>
