<?php

namespace Database\Seeders;

use App\Models\ElementGroup;
use App\Models\RecommendationCalculation;
use App\Models\RecommendationRule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Empfehlungsregeln der Auswertung V2.2, übernommen aus dem Frontend
 * (client/src/services/directRecommendations.js und recommendationTemplates.js).
 *
 * Legt nur fehlende Regeln an: Was im Adminbereich geändert wurde, bleibt erhalten.
 * Die Dosierplan-Karte bleibt vorerst im Frontend, weil sie am Dosierplan hängt.
 */
class RecommendationRuleSeeder extends Seeder
{
    private const SEA = ['Meerwasser'];

    /** Tageswert Essential Nitro/Phospho: 0,5 ml je 100 l. */
    private const NUTRIENT_DOSE = '{{#if volume > 0}}{{ round(dose, 1) }} ml täglich{{else}}0,5 ml je 100 l täglich{{/if}}';

    private const NUTRIENT_TIP = 'Messen Sie regelmäßig NO₃ und PO₄, um Nährstoff-Anreicherungen und Limitierungen zu vermeiden.';

    public function run(): void
    {
        DB::transaction(function () {
            // Idealwert des betroffenen Elements; ohne Snapshot die Mitte des idealen Bereichs.
            RecommendationCalculation::firstOrCreate(['rule_id' => null, 'name' => 'goal'], [
                'expression' => 'coalesce(target, (min + max) / 2)',
                'description' => 'Idealwert des betroffenen Elements, sonst Mitte des idealen Bereichs',
            ]);

            foreach ($this->rules() as $index => $definition) {
                $this->create($definition, ($index + 1) * 10);
            }
        });
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function create(array $definition, int $sort): void
    {
        if (RecommendationRule::where('key', $definition['key'])->whereNull('evaluation_scale_id')->exists()) {
            return;
        }

        $de = fn (?string $text) => $text === null ? null : ['de' => $text];
        $rule = RecommendationRule::create([
            'key' => $definition['key'],
            'name' => $definition['name'],
            'water_types' => $definition['water_types'] ?? self::SEA,
            'scope_sample' => $definition['scope_sample'] ?? null,
            'scope_elements' => $definition['scope'] ?? null,
            'scope_group_id' => isset($definition['scope_group']) ? ElementGroup::where('key', $definition['scope_group'])->value('id') : null,
            'element_condition' => $definition['element_condition'] ?? null,
            'condition' => $definition['condition'] ?? null,
            'kicker' => $de($definition['kicker']),
            'title' => $de($definition['title']),
            'summary' => $de($definition['summary']),
            'action' => $definition['action'] ?? null,
            'action_label' => $de($definition['action_label'] ?? null),
            'detail_label' => $de($definition['detail_label'] ?? null),
            'recheck_days' => $definition['recheck_days'],
            'is_active' => true,
            'sort_order' => $sort,
        ]);

        foreach ($definition['calculations'] ?? [] as $name => $expression) {
            $rule->calculations()->create(['name' => $name, 'expression' => $expression]);
        }

        $position = 0;
        foreach (['option' => 'options', 'detail' => 'details', 'tip' => 'tips'] as $type => $field) {
            foreach ($definition[$field] ?? [] as $block) {
                $block = is_string($block) ? ['text' => $block] : $block;
                $rule->blocks()->create([
                    'type' => $type,
                    'condition' => $block['if'] ?? null,
                    'label' => $de($block['label'] ?? null),
                    'text' => ['de' => $block['text'] ?? ''],
                    'action' => $block['action'] ?? null,
                    'sort_order' => $position += 10,
                ]);
            }
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function rules(): array
    {
        return [
            [
                'key' => 'water-change',
                'name' => 'Wasserwechsel',
                // V2.2: nur Calcium, Magnesium und Zink, und erst ab „zu hoch“ (Stufe 8 und 9).
                'scope' => ['calcium', 'magnesium', 'zinc'],
                'element_condition' => 'band != null and band >= 8',
                'kicker' => 'Sofortmaßnahme',
                'title' => 'Wasserwechsel durchführen',
                'summary' => "Durch die Wasseranalyse {{ plural(affected_count, 'wurde ein stark erhöhter Wert', 'wurden stark erhöhte Werte') }} bei {{ affected }} festgestellt. Um diese Werte zügig wieder in den optimalen Bereich zu senken, empfehlen wir die Durchführung von Wasserwechseln.",
                'action' => ['tool' => 'waterchange'],
                'action_label' => 'Wasserwechsel planen',
                'recheck_days' => 7,
                'options' => [
                    ['label' => 'Option A: Standard Empfehlung (praktisch)', 'text' => 'Führen Sie drei Wasserwechsel von jeweils 20 % im Abstand von einigen Tagen durch. Dies senkt die erhöhten Konzentrationen schrittweise und schonend für Ihre Aquarienbewohner.'],
                    ['label' => 'Option B: Individuelle Korrektur (maßgeschneidert und effizient)', 'text' => 'Möchten Sie das Ausmaß und die Anzahl der Wasserwechsel exakt auf Ihr Beckenvolumen und Ihre Zielwerte abstimmen? Planen Sie die optimale Korrektur:',
                        'action' => ['tool' => 'waterchange', 'label' => ['de' => 'Hier geht es zum Wasserwechsel-Simulator']]],
                ],
                'tips' => ['Verwenden Sie für die Wasserwechsel ein Meersalz mit naturnaher Zusammensetzung wie Absolute Ocean oder Nyos pure. Salze mit erhöhten KH-, Ca- und Mg-Werten eignen sich hierfür nicht, da sie die zu hohen Werte nicht effektiv senken.'],
            ],
            [
                'key' => 'salinity-low',
                'name' => 'Salinität · zu niedrig',
                'scope' => ['salinity'],
                'element_condition' => 'band != null and band < 5',
                'calculations' => [
                    // V2.2: (Ziel − Messwert) × 1,71 ml je Flasche bzw. × 1,06 g Nyos pure Salz, je Liter
                    'salt_ml' => 'clamp((goal - value) * 1.71 * volume, 0, 1000000)',
                    'salt_g' => 'clamp((goal - value) * 1.06 * volume, 0, 1000000)',
                ],
                'kicker' => 'Salinität',
                'title' => 'Salinität kontrolliert anheben',
                'summary' => "Die **{{ label }}** liegt bei {{ round(value, 1) }} {{ unit ?? 'PSU' }} und damit unter dem Zielwert{{#if goal}} von {{ round(goal, 1) }} PSU{{/if}}. "
                    .'{{#if volume > 0 and goal}}Ergänzen Sie Absolute Ocean 1 und 2 jeweils in der berechneten Menge oder ergänzen Sie {{ round(salt_g) }} g Nyos pure Salz, um die Salinität auf {{ round(goal, 1) }} PSU anzuheben.'
                    .'{{else}}Ergänzen Sie Absolute Ocean 1 und 2 jeweils in der berechneten Menge oder ergänzen Sie Nyos pure Salz, um die Salinität{{#if goal}} auf {{ round(goal, 1) }} PSU{{/if}} anzuheben.{{/if}}',
                'detail_label' => 'Berechnete Korrektur',
                'recheck_days' => 2,
                'details' => [
                    ['if' => 'volume > 0 and goal', 'label' => 'Absolute Ocean 1', 'text' => '{{ round(salt_ml) }} ml'],
                    ['if' => 'volume > 0 and goal', 'label' => 'Absolute Ocean 2', 'text' => '{{ round(salt_ml) }} ml'],
                    ['if' => 'volume > 0 and goal', 'label' => 'oder Nyos pure Salz', 'text' => '{{ round(salt_g) }} g'],
                    ['if' => 'not (volume > 0)', 'label' => 'Absolute Ocean 1 und 2', 'text' => 'je 1,71 ml pro PSU und Liter'],
                    ['if' => 'not (volume > 0)', 'label' => 'oder Nyos pure Salz', 'text' => '1,06 g pro PSU und Liter'],
                ],
                'tips' => ['Die Salinität schrittweise korrigieren und vor weiteren Elementanpassungen erneut messen.'],
            ],
            [
                'key' => 'salinity-high',
                'name' => 'Salinität · zu hoch',
                'scope' => ['salinity'],
                'element_condition' => 'band != null and band > 5',
                'calculations' => [
                    // Austauschmenge, damit Messwert × (Volumen − x) / Volumen = Ziel
                    'ro_liters' => 'clamp(volume - goal / value * volume, 0, 1000000)',
                ],
                'kicker' => 'Salinität',
                'title' => 'Salinität kontrolliert senken',
                'summary' => "Die **{{ label }}** liegt bei {{ round(value, 1) }} {{ unit ?? 'PSU' }} und damit über dem Zielwert{{#if goal}} von {{ round(goal, 1) }} PSU{{/if}}. Entnehmen Sie die berechnete Menge Meerwasser und ersetzen Sie diese durch Osmosewasser.",
                'detail_label' => 'Berechnete Korrektur',
                'recheck_days' => 2,
                'details' => [
                    ['if' => 'volume > 0 and goal', 'label' => 'Meerwasser entnehmen und durch Osmosewasser ersetzen', 'text' => '{{ round(ro_liters, 1) }} l'],
                    ['if' => 'not (volume > 0)', 'label' => 'Meerwasser gegen Osmosewasser tauschen', 'text' => 'Menge nach Beckenvolumen'],
                ],
                'tips' => ['Die errechnete Menge nicht auf einmal austauschen, sondern die Salinität kontrolliert und messbegleitet absenken.'],
            ],
            [
                'key' => 'reduce-supply',
                'name' => 'Elementversorgung anpassen',
                // Täglich dosiert werden KH, Calcium und Magnesium; die Spurenelemente folgen dem Zink.
                // Magnesium hat nur bei drei Teilen einen eigenen Kanal; bei zwei Teilen zählt es nur
                // erhöht (Salztipp), bei All-in-one gar nicht.
                'scope' => ['kh', 'calcium', 'magnesium', 'zinc'],
                'element_condition' => "band != null and band != 5 and (key != 'magnesium' or supplyParts not in [1, 2] or (supplyParts == 2 and band > 5))",
                'calculations' => [
                    'kh_change' => "kh.band == 5 ? 'unverändert' : (kh.band < 5 ? '+10–20 %' : '−10–20 %')",
                    'ca_change' => "calcium.band == 5 ? 'unverändert' : (calcium.band < 5 ? '+10–20 %' : '−10–20 %')",
                    'mg_change' => "magnesium.band == 5 ? 'unverändert' : (magnesium.band < 5 ? '+10–20 %' : '−10–20 %')",
                    // Zink steuert die Spurenelemente: zu wenig +25 %, leicht erhöht −50 %, deutlich erhöht −100 %.
                    'trace_change' => "zinc.band < 5 ? '+25 %' : (zinc.band > 6 ? '−100 %' : '−50 %')",
                ],
                'kicker' => 'Versorgung anpassen',
                'title' => 'Elementversorgung anpassen',
                'summary' => "{{ affected }} {{ plural(affected_count, 'weicht', 'weichen') }} vom Zielbereich ab. {{#if supplyParts == 0}}Wir empfehlen Ihnen ein Versorgungssystem wie z. B. Essentials SPS zu nutzen.{{else}}Passen Sie die tägliche Elementversorgung abhängig vom Messwert an.{{/if}}",
                'action' => ['tool' => 'consumption'],
                'action_label' => 'Dosierung anpassen',
                'detail_label' => 'Tägliche Elementversorgung anpassen',
                'recheck_days' => 14,
                // Alle Kanäle stehen da, auch die, die passen – sonst bleibt offen, ob sie geprüft wurden.
                'details' => [
                    ['if' => 'supplyParts == 1 and kh.band != null', 'label' => 'All-in-one', 'text' => '{{ kh_change }}'],
                    ['if' => 'supplyParts in [2, 3] and kh.band != null', 'label' => 'KH', 'text' => '{{ kh_change }}'],
                    ['if' => 'supplyParts == null and kh.band != null', 'label' => '{{ kh.label }}', 'text' => '{{ kh_change }}'],
                    ['if' => 'supplyParts == 2 and calcium.band != null', 'label' => 'Ca/Mg', 'text' => '{{ ca_change }}'],
                    ['if' => 'supplyParts == 3 and calcium.band != null', 'label' => 'Ca', 'text' => '{{ ca_change }}'],
                    ['if' => 'supplyParts == null and calcium.band != null', 'label' => '{{ calcium.label }}', 'text' => '{{ ca_change }}'],
                    ['if' => 'supplyParts == 3 and magnesium.band != null', 'label' => 'Mg', 'text' => '{{ mg_change }}'],
                    ['if' => 'supplyParts == null and magnesium.band != null', 'label' => '{{ magnesium.label }}', 'text' => '{{ mg_change }}'],
                    ['if' => 'zinc.band != null and zinc.band != 5', 'label' => 'Spuren/DT', 'text' => '{{ trace_change }}'],
                ],
                'tips' => [
                    ['if' => 'supplyParts == 2 and magnesium.band > 5', 'text' => 'Nutzen Sie ausschließlich Meersalze mit naturnahen Werten für Wasserwechsel.'],
                    ['if' => 'supplyParts == null', 'text' => 'Hinterlegen Sie im Aquarium Ihr Versorgungssystem – dann passen wir die Empfehlung an seine Teile an.'],
                ],
            ],
            ...$this->nutrientRules(),
            [
                'key' => 'pollutants',
                'name' => 'Schadstoffquellen eliminieren',
                // Zink zählt zu den Spurenelementen, kann laut V2.2 aber aus einer Schadstoffquelle stammen (ab Stufe 6).
                'scope_group' => 'pollutants',
                'scope' => ['zinc'],
                'element_condition' => 'band != null and band >= 6',
                'water_types' => null,
                'kicker' => 'Eintragsquelle',
                'title' => 'Schadstoffquelle eliminieren',
                'summary' => "{{ affected }} {{ plural(affected_count, 'stammt', 'stammen') }} vermutlich aus einer Eintragsquelle im System. Gesucht wird die Quelle, nicht eine Behandlung des Wertes.",
                'action' => ['tab' => 'values', 'secondary' => ['tool' => 'sources', 'label' => ['de' => 'Mögliche Quellen prüfen']]],
                'action_label' => 'Alle Werte ansehen',
                'detail_label' => 'Mögliche Quellen',
                'recheck_days' => 7,
                'details' => [
                    ['label' => 'Aktivkohle'], ['label' => 'RO-Wasser'], ['label' => 'Korrosion'], ['label' => 'Klebstoffe und Zubehör'],
                ],
            ],
            [
                'key' => 'osmosis',
                'name' => 'Osmosewasser',
                // V2.2: Silizium über 25, Zink oder Phosphor über 0 in der Osmoseprobe.
                'scope_sample' => 'osmose',
                'scope' => ['silicon', 'zinc', 'phosphorus'],
                'element_condition' => "value != null and value > (key == 'silicon' ? 25 : 0)",
                'water_types' => null,
                'kicker' => 'Osmosewasser',
                'title' => 'Osmosewasser aufbereiten',
                'summary' => "Durch die Wasseranalyse wurde herausgefunden, dass sich {{ affected }} in der Osmoseprobe {{ plural(affected_count, 'befindet', 'befinden') }}.",
                'action' => ['tab' => 'osmosis'],
                'action_label' => 'Osmoseprobe ansehen',
                'detail_label' => 'Empfohlene Maßnahmen',
                'recheck_days' => 14,
                // Was zu tun ist, hängt davon ab, ob Osmoseanlage und Harzfilter vorhanden sind.
                'details' => [
                    ['if' => 'osmosis.silicon.value > 25 and hasOsmosis and resinFilter', 'label' => 'Wechseln Sie das Harz im Reinstfilter aus.'],
                    ['if' => 'osmosis.silicon.value > 25 and hasOsmosis and not resinFilter', 'label' => 'Nutzen Sie einen Harzfilter hinter der Osmoseanlage.'],
                    ['if' => 'osmosis.silicon.value > 25 and not hasOsmosis', 'label' => 'Nutzen Sie eine Osmoseanlage und einen Harzfilter.'],
                    ['if' => 'osmosis.phosphorus.value > 0', 'label' => 'PO4 kann im RO Wasser vorkommen, wenn der Harzfilter entweder zu klein oder erschöpft ist, oder etwas im Vorratstank PO4 freisetzt.'],
                    ['if' => 'osmosis.zinc.value > 0', 'label' => 'Zink kann im RO Wasser vorkommen, wenn der Harzfilter entweder zu klein oder erschöpft ist, oder etwas im Vorratstank Zink freisetzt.'],
                ],
                'tips' => ['Mindestens 1 l Harz pro 30 GPD Tagesleistung der Osmoseanlage.'],
            ],
        ];
    }

    /**
     * Nährstoffmanagement (V2.2, Q27–Q29): eine Regel je Kombination aus Nitrat und Phosphor.
     * Phosphor fehlt bei manchen Methoden, dann zählt Phosphat.
     *
     * @return list<array<string, mixed>>
     */
    private function nutrientRules(): array
    {
        $dose = fn (string $label) => ['label' => $label, 'text' => self::NUTRIENT_DOSE];
        $measures = [
            'nutrients' => ['high', 'high', 'NO₃ ↑ · P ↑', [['label' => 'Futtereintrag', 'text' => 'reduzieren'], ['label' => 'Eiweißabschäumer', 'text' => 'reinigen'], ['label' => 'PO₄-Adsorber', 'text' => 'nutzen']]],
            'nutrients-low' => ['low', 'low', 'NO₃ ↓ · P ↓', [$dose('Essential Nitro'), $dose('Essential Phospho')]],
            'nutrients-high-low' => ['high', 'low', 'NO₃ ↑ · P ↓', [$dose('Essential Phospho'), ['label' => 'Eiweißabschäumer', 'text' => 'reinigen']]],
            'nutrients-low-high' => ['low', 'high', 'NO₃ ↓ · P ↑', [['label' => 'PO₄-Adsorber', 'text' => 'nutzen'], $dose('Essential Nitro')]],
        ];
        $compare = ['high' => '> 5', 'low' => '< 5'];
        $word = ['high' => 'erhöht', 'low' => 'reduziert'];

        $rules = [];
        foreach ($measures as $key => [$nitrate, $phosphorus, $name, $details]) {
            $rules[] = [
                'key' => $key,
                'name' => $name,
                'scope' => ['nitrate', 'phosphorus', 'phosphate'],
                // Phosphat nur, wenn kein Phosphor gemessen wurde.
                'element_condition' => "band != null and band != 5 and (key != 'phosphate' or phosphorus.band == null)",
                'condition' => "nitrate.band {$compare[$nitrate]} and p_band {$compare[$phosphorus]}",
                'calculations' => [
                    'p_band' => 'coalesce(phosphorus.band, phosphate.band)',
                    'p_label' => 'phosphorus.band != null ? phosphorus.label : phosphate.label',
                    'dose' => '0.5 * volume / 100',
                ],
                'kicker' => 'Nährstoffmanagement',
                'title' => 'Nährstoffmanagement optimieren',
                'summary' => "Wir empfehlen Ihnen das Nährstoffmanagement zu optimieren, da **{{ nitrate.label }}** {$word[$nitrate]} ist und **{{ p_label }}** {$word[$phosphorus]} ist.",
                'action' => ['tool' => 'trends'],
                'detail_label' => 'Empfohlene Maßnahmen',
                'recheck_days' => 7,
                'details' => $details,
                'tips' => [self::NUTRIENT_TIP],
            ];
        }

        return $rules;
    }
}
