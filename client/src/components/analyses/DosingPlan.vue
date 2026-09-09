<template>
  <section class="dosing-plan">
    <header class="plan-header">
      <div>
        <span>Dosierungsplan · {{ analysis.reportNumber }}</span>
        <h2>Ihr Korrekturplan</h2>
        <p>In der richtigen Reihenfolge – vom stabilen Grundsystem bis zur gezielten Elementkorrektur.</p>
      </div>
      <div class="aquarium-context">
        <small>Berechnungsgrundlage</small>
        <strong>{{ analysis.aquariumName }}</strong>
        <span>{{ formatNumber(volume) }} l netto · {{ supplySystem }}</span>
      </div>
    </header>

    <div v-if="!volume" class="blocking-note">
      <i>!</i><div><strong>Plan noch nicht berechenbar</strong><p>Im verbundenen Aquariumprofil fehlt das Netto-Wasservolumen. Bis es ergänzt ist, werden keine Mengen ausgegeben.</p></div>
    </div>

    <div v-else-if="!plan.length" class="clean-state">
      <i>✓</i><div><strong>Keine Unterversorgung erkannt</strong><p>Aktuell ist für keinen dosierbaren Messwert eine Anhebung erforderlich.</p></div>
    </div>

    <template v-else>
      <section class="plan-summary" aria-label="Zusammenfassung des Korrekturplans">
        <div><span>Zu korrigieren</span><strong>{{ plan.length }}</strong><small>{{ plan.length === 1 ? 'Messwert' : 'Messwerte' }}</small></div>
        <div><span>Zuerst stabilisieren</span><strong>{{ foundationCount }}</strong><small>Basis- oder Wasserwerte</small></div>
        <div><span>Gezielte Ergänzung</span><strong>{{ productCount }}</strong><small>Elemente</small></div>
        <div :class="{ ready: verifiedDoseCount === doseCandidateCount && doseCandidateCount > 0 }"><span>Exakt freigegeben</span><strong>{{ verifiedDoseCount }}/{{ doseCandidateCount }}</strong><small>mögliche Produktpläne</small></div>
      </section>

      <div class="sequence-note"><i>i</i><p><strong>Reihenfolge beachten:</strong> Erst Salinität und Ionengleichgewicht stabilisieren. Danach Mengen- und zuletzt Spurenelemente korrigieren.</p></div>

      <section class="plan-workspace">
        <aside class="action-queue">
          <header><span>Empfohlene Reihenfolge</span><strong>{{ plan.length }} Schritte</strong></header>
          <button v-for="(item, index) in plan" :key="item.key" type="button" :class="['queue-item', item.tone, { active: selectedItem?.key === item.key }]" @click="selectedKey = item.key">
            <b>{{ String(index + 1).padStart(2, '0') }}</b>
            <span><small>{{ item.modeLabel }}</small><strong>{{ item.label }}</strong><em>{{ item.value }} {{ item.unit }} · zu niedrig</em></span>
            <i>›</i>
          </button>
        </aside>

        <article v-if="selectedItem" class="action-detail">
          <header class="detail-header">
            <div class="element-symbol">{{ selectedItem.symbol }}</div>
            <div>
              <span>Schritt {{ selectedIndex + 1 }} von {{ plan.length }} · Priorität {{ selectedItem.priority }}</span>
              <h3>{{ selectedItem.title }}</h3>
              <p>{{ selectedItem.summary }}</p>
            </div>
            <em :class="selectedItem.mode">{{ selectedItem.modeLabel }}</em>
          </header>

          <section class="value-journey">
            <div><span>Aktuell</span><strong>{{ selectedItem.value }}</strong><small>{{ selectedItem.unit }}</small></div>
            <div class="journey-line"><i></i><b>+ {{ formatNumber(selectedItem.deficit) }}</b></div>
            <div class="target"><span>Sicheres erstes Ziel</span><strong>{{ selectedItem.targetValue }}</strong><small>{{ selectedItem.unit }}</small></div>
            <div class="range"><span>Gesamter Zielbereich</span><strong>{{ selectedItem.targetRange.min }}–{{ selectedItem.targetRange.max }}</strong><small>{{ selectedItem.unit }}</small></div>
          </section>

          <section v-if="selectedItem.dose" class="verified-dose">
            <header><div><span>Laborgeprüfte Produktdosierung</span><h4>{{ selectedItem.dose.productName }}</h4></div><b>Verifiziert</b></header>
            <div class="dose-metrics">
              <div><span>Pro Tag</span><strong>{{ formatNumber(selectedItem.dose.dailyMl) }} ml</strong></div>
              <div><span>Dauer</span><strong>{{ selectedItem.dose.days }} {{ selectedItem.dose.days === 1 ? 'Tag' : 'Tage' }}</strong></div>
              <div><span>Gesamt</span><strong>{{ formatNumber(selectedItem.dose.totalMl) }} ml</strong></div>
            </div>
            <p v-if="selectedItem.dose.instructions">{{ selectedItem.dose.instructions }}</p>
          </section>

          <section v-else :class="['dose-status', selectedItem.mode]">
            <div class="dose-icon">{{ selectedItem.mode === 'water' ? '≈' : 'ml' }}</div>
            <div v-if="selectedItem.mode === 'water'"><span>Keine Einzeldosierung</span><strong>Über Wasserchemie korrigieren</strong><p>Für diesen Wert ist bewusst keine Produktmenge vorgesehen.</p></div>
            <div v-else><span>Produktmenge nicht freigegeben</span><strong>{{ formatMass(selectedItem.requiredMassMg) }} rechnerischer Elementbedarf</strong><p>Eine ml-Angabe erscheint erst mit einer laborgeprüften Produktkonzentration. So vermeiden wir Scheingenauigkeit.</p></div>
          </section>

          <section class="procedure">
            <header><span>So gehen Sie vor</span><strong>{{ selectedItem.recheckDays }} Tage bis zur Kontrolle</strong></header>
            <ol>
              <li v-for="(step, index) in selectedItem.steps" :key="step"><b>{{ index + 1 }}</b><p>{{ step }}</p></li>
            </ol>
          </section>

          <aside class="caution"><i>!</i><div><strong>Bitte beachten</strong><p>{{ selectedItem.caution }}</p></div></aside>

          <footer class="detail-footer">
            <button type="button" :disabled="selectedIndex === 0" @click="selectOffset(-1)">← Vorheriger Schritt</button>
            <div><span>Nachkontrolle</span><strong>In {{ selectedItem.recheckDays }} Tagen erneut messen</strong></div>
            <button type="button" :disabled="selectedIndex === plan.length - 1" @click="selectOffset(1)">Nächster Schritt →</button>
          </footer>
        </article>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { buildDosingPlan, formatMass } from '@/services/dosingPlan'

const props = defineProps({ analysis: { type: Object, required: true } })
const selectedKey = ref('')
const volume = computed(() => Number(props.analysis.aquariumProfile?.volumeLiters || props.analysis.aquariumProfile?.net_volume || 0))
const supplySystem = computed(() => props.analysis.aquariumProfile?.supplySystem || 'Versorgung nicht hinterlegt')
const plan = computed(() => buildDosingPlan(props.analysis.parameters, volume.value))
const selectedItem = computed(() => plan.value.find((item) => item.key === selectedKey.value) || plan.value[0] || null)
const selectedIndex = computed(() => Math.max(0, plan.value.findIndex((item) => item.key === selectedItem.value?.key)))
const foundationCount = computed(() => plan.value.filter((item) => ['water', 'supply'].includes(item.mode)).length)
const productCount = computed(() => plan.value.filter((item) => item.mode === 'product').length)
const doseCandidateCount = computed(() => plan.value.filter((item) => item.mode !== 'water').length)
const verifiedDoseCount = computed(() => plan.value.filter((item) => item.dose).length)

function formatNumber(value) {
  return Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 3 })
}

function selectOffset(offset) {
  const item = plan.value[selectedIndex.value + offset]
  if (item) selectedKey.value = item.key
}
</script>

<style scoped>
.dosing-plan{display:grid;gap:18px}.plan-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:4px 2px 18px;border-bottom:1px solid var(--border)}.plan-header>div:first-child>span{color:var(--teal-700);font-size:10px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.plan-header h2{margin-top:4px;color:var(--text);font-size:30px;letter-spacing:-.03em}.plan-header p{max-width:680px;margin-top:5px;color:var(--text-muted);font-size:12px}.aquarium-context{min-width:245px;padding:12px 14px;border:1px solid var(--border);border-radius:13px;background:#f6fafc}.aquarium-context small,.aquarium-context strong,.aquarium-context span{display:block}.aquarium-context small{color:var(--teal-700);font-size:8px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.aquarium-context strong{margin-top:3px;color:var(--text);font-size:13px}.aquarium-context span{margin-top:2px;color:var(--text-muted);font-size:9px}.blocking-note,.clean-state{display:flex;align-items:center;gap:13px;padding:18px;border-radius:15px}.blocking-note{border:1px solid #fed7aa;background:#fff7ed;color:#9a4d0a}.clean-state{min-height:150px;justify-content:center;background:#ecfdf5;color:#047857}.blocking-note>i,.clean-state>i{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:11px;background:#f59e0b;color:#fff;font-style:normal;font-weight:900}.clean-state>i{background:#10b981}.blocking-note strong,.clean-state strong{display:block;font-size:15px}.blocking-note p,.clean-state p{margin-top:3px;font-size:11px}.plan-summary{display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;border:1px solid var(--border);border-radius:15px;background:#f8fbfe}.plan-summary>div{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:14px 16px;border-right:1px solid var(--border)}.plan-summary>div:last-child{border:0}.plan-summary span{grid-column:1/-1;color:var(--text-muted);font-size:8px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.plan-summary strong{color:var(--text);font-size:22px}.plan-summary small{align-self:end;padding-bottom:3px;color:var(--text-muted);font-size:8px}.plan-summary .ready{background:#ecfdf5}.plan-summary .ready strong{color:#047857}.sequence-note{display:flex;align-items:center;gap:9px;padding:10px 13px;border-radius:11px;background:#eef7fd;color:#456378;font-size:10px}.sequence-note>i{display:grid;place-items:center;flex:none;width:22px;height:22px;border-radius:50%;background:var(--brand-blue);color:#fff;font-style:normal;font-weight:900}.plan-workspace{display:grid;grid-template-columns:245px minmax(0,1fr);gap:16px;align-items:start}.action-queue{position:sticky;top:calc(var(--topbar-height,68px) + 18px);display:grid;gap:6px;padding:9px;border:1px solid var(--border);border-radius:16px;background:#f4f8fb}.action-queue>header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 5px 9px}.action-queue>header span{color:var(--text-muted);font-size:8px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.action-queue>header strong{color:var(--text);font-size:9px}.queue-item{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:8px;padding:9px;border:1px solid transparent;border-radius:11px;background:transparent;color:inherit;text-align:left;cursor:pointer}.queue-item:hover{background:#fff}.queue-item.active{border-color:#afd0e5;background:#fff;box-shadow:0 5px 14px rgba(10,27,67,.07)}.queue-item>b{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#e6eef4;color:#60758a;font-size:9px}.queue-item.critical>b{background:#fdecea;color:#b53a2e}.queue-item span,.queue-item span>*{display:block;min-width:0}.queue-item small{color:var(--teal-700);font-size:7px;font-weight:850;text-transform:uppercase}.queue-item strong{margin-top:1px;overflow:hidden;color:var(--text);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.queue-item em{margin-top:2px;color:var(--text-muted);font-size:8px;font-style:normal}.queue-item>i{color:var(--brand-blue);font-size:17px;font-style:normal}.action-detail{overflow:hidden;border:1px solid var(--border);border-radius:18px;background:#fff}.detail-header{display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:14px;padding:20px}.element-symbol{display:grid;place-items:center;width:56px;height:56px;border-radius:15px;background:linear-gradient(145deg,#e9f8f6,#e8f3fc);color:var(--brand-blue);font-size:15px;font-weight:900}.detail-header>div:nth-child(2)>span{color:#b53a2e;font-size:8px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.detail-header h3{margin-top:3px;color:var(--text);font-size:21px}.detail-header p{max-width:680px;margin-top:4px;color:var(--text-muted);font-size:10px;line-height:1.5}.detail-header>em{padding:6px 9px;border-radius:999px;background:#eef5fb;color:var(--brand-blue);font-size:8px;font-style:normal;font-weight:850}.detail-header>em.water{background:#e9f8ff;color:#03698b}.detail-header>em.nutrient{background:#fff7df;color:#9a5b0a}.value-journey{display:grid;grid-template-columns:1fr minmax(90px,.6fr) 1fr 1.1fr;align-items:center;gap:10px;padding:16px 20px;border-block:1px solid var(--border);background:#f8fbfe}.value-journey>div:not(.journey-line){display:grid;grid-template-columns:1fr auto;gap:2px 5px;padding:10px 12px;border-radius:11px;background:#fff}.value-journey span{grid-column:1/-1;color:var(--text-muted);font-size:7px;font-weight:850;text-transform:uppercase}.value-journey strong{color:var(--text);font-size:19px}.value-journey small{align-self:end;color:var(--text-muted);font-size:8px}.value-journey .target{background:#ecfdf5}.value-journey .target strong{color:#047857}.journey-line{position:relative;text-align:center}.journey-line:before{position:absolute;top:50%;right:0;left:0;height:2px;background:#b8d6e8;content:""}.journey-line i{position:relative;display:block;width:10px;height:10px;margin:auto;border:3px solid #fff;border-radius:50%;background:var(--brand-blue);box-shadow:0 0 0 1px #9dc7df}.journey-line b{position:relative;display:inline-block;margin-top:8px;padding:2px 5px;border-radius:5px;background:#f8fbfe;color:var(--brand-blue);font-size:8px}.verified-dose,.dose-status,.procedure{margin:18px 20px 0}.verified-dose{overflow:hidden;border:1px solid #86efac;border-radius:14px;background:#f5fff9}.verified-dose>header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #bbf7d0}.verified-dose>header span{color:#047857;font-size:8px;font-weight:850;text-transform:uppercase}.verified-dose h4{margin-top:2px;color:#064e3b;font-size:15px}.verified-dose>header>b{padding:5px 8px;border-radius:999px;background:#10b981;color:#fff;font-size:8px}.dose-metrics{display:grid;grid-template-columns:repeat(3,1fr)}.dose-metrics>div{padding:13px 14px;border-right:1px solid #bbf7d0}.dose-metrics>div:last-child{border:0}.dose-metrics span,.dose-metrics strong{display:block}.dose-metrics span{color:#047857;font-size:8px}.dose-metrics strong{margin-top:2px;color:#064e3b;font-size:17px}.verified-dose>p{padding:10px 14px;border-top:1px solid #bbf7d0;color:#047857;font-size:9px}.dose-status{display:grid;grid-template-columns:44px 1fr;align-items:center;gap:12px;padding:13px 14px;border:1px solid #cfe0ec;border-radius:14px;background:#f7fbfd}.dose-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#e7f2f9;color:var(--brand-blue);font-size:10px;font-weight:900}.dose-status span,.dose-status strong{display:block}.dose-status span{color:var(--teal-700);font-size:8px;font-weight:850;text-transform:uppercase}.dose-status strong{margin-top:2px;color:var(--text);font-size:13px}.dose-status p{margin-top:3px;color:var(--text-muted);font-size:9px;line-height:1.45}.dose-status.water{border-color:#bde7f2;background:#f2fcff}.procedure{border-top:1px solid var(--border);padding-top:16px}.procedure>header{display:flex;justify-content:space-between;gap:12px}.procedure>header span{color:var(--teal-700);font-size:9px;font-weight:850;text-transform:uppercase}.procedure>header strong{color:var(--text-muted);font-size:9px}.procedure ol{display:grid;gap:7px;margin-top:10px;padding:0;list-style:none}.procedure li{display:grid;grid-template-columns:30px 1fr;align-items:center;gap:9px;padding:10px 11px;border-radius:11px;background:#f7fafc}.procedure li>b{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#e3f1f9;color:var(--brand-blue);font-size:9px}.procedure li>p{color:var(--text);font-size:10px;line-height:1.45}.caution{display:grid;grid-template-columns:30px 1fr;align-items:center;gap:9px;margin:14px 20px;padding:11px 12px;border-left:3px solid #f59e0b;border-radius:10px;background:#fff8e8}.caution>i{display:grid;place-items:center;width:27px;height:27px;border-radius:8px;background:#f59e0b;color:#fff;font-style:normal;font-weight:900}.caution strong{color:#92400e;font-size:9px}.caution p{margin-top:2px;color:#9a5b0a;font-size:9px;line-height:1.4}.detail-footer{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:13px 20px;border-top:1px solid var(--border);background:#f7fafc}.detail-footer button{min-height:36px;padding:0 11px;border:1px solid var(--border);border-radius:9px;background:#fff;color:var(--brand-blue);font-size:9px;font-weight:850;cursor:pointer}.detail-footer button:disabled{opacity:.35;cursor:default}.detail-footer>div{text-align:center}.detail-footer span,.detail-footer strong{display:block}.detail-footer span{color:var(--text-muted);font-size:7px;text-transform:uppercase}.detail-footer strong{margin-top:2px;color:var(--text);font-size:10px}
@media(max-width:900px){.plan-header{align-items:stretch;flex-direction:column}.aquarium-context{min-width:0}.plan-summary{grid-template-columns:repeat(2,1fr)}.plan-summary>div:nth-child(2){border-right:0}.plan-summary>div:nth-child(-n+2){border-bottom:1px solid var(--border)}.plan-workspace{grid-template-columns:1fr}.action-queue{position:static;grid-template-columns:repeat(auto-fit,minmax(155px,1fr))}.action-queue>header{grid-column:1/-1}.value-journey{grid-template-columns:1fr 1fr}.journey-line{display:none}}
@media(max-width:600px){.plan-header h2{font-size:26px}.plan-summary{grid-template-columns:1fr}.plan-summary>div{border-right:0;border-bottom:1px solid var(--border)}.detail-header{grid-template-columns:46px 1fr;padding:15px}.element-symbol{width:44px;height:44px}.detail-header>em{grid-column:2;justify-self:start}.value-journey{grid-template-columns:1fr;padding:13px}.verified-dose,.dose-status,.procedure{margin-inline:14px}.dose-metrics{grid-template-columns:1fr}.dose-metrics>div{border-right:0;border-bottom:1px solid #bbf7d0}.detail-footer{grid-template-columns:1fr}.detail-footer>div{grid-row:1}.caution{margin-inline:14px}}
</style>
