<?php

namespace Tests\Feature\Recommendations;

use App\Models\Analysis;
use App\Models\AnalysisMethod;
use App\Models\AnalysisRecommendation;
use App\Models\Aquarium;
use App\Models\Element;
use App\Models\RecommendationRule;
use App\Models\User;
use App\Recommendations\RuleValidator;
use Database\Seeders\AnalysisCatalogSeeder;
use Database\Seeders\RecommendationRuleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Regeln der Auswertung V2.2 (RecommendationRuleSeeder), geprüft mit den Fällen aus
 * client/src/services/directRecommendations.test.js.
 */
class RecommendationEngineTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Aquarium $reef;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([AnalysisCatalogSeeder::class, RecommendationRuleSeeder::class]);
        $this->user = User::factory()->create();
        $this->reef = Aquarium::factory()->for($this->user)->create(['net_volume' => 500, 'supply_mode' => 'ati']);
    }

    /**
     * Legt eine Analyse an und schließt sie ab. $results: Element-Key => Stufe oder [Wert, Stufe, Sollwert].
     *
     * @param  array<string, int|array<int, float|int|null>>  $results
     * @param  array<string, float|null>|null  $osmosis  Osmoseprobe: Element-Key => Wert
     * @return array<string, AnalysisRecommendation>
     */
    private function complete(array $results, ?array $osmosis = null, ?Aquarium $aquarium = null): array
    {
        $aquarium ??= $this->reef;
        $analysis = Analysis::forceCreate([
            'user_id' => $this->user->id, 'aquarium_id' => $aquarium->id, 'aquarium_name' => $aquarium->name,
            'method_id' => AnalysisMethod::firstWhere('key', 'meerwasser')->id, 'status' => 'in_analysis',
        ]);
        $this->insert($analysis, $results);
        if ($osmosis !== null) {
            $child = Analysis::forceCreate([
                'user_id' => $this->user->id, 'parent_id' => $analysis->id, 'aquarium_name' => 'Osmose',
                'method_id' => AnalysisMethod::firstWhere('key', 'osmose')->id, 'status' => 'completed',
            ]);
            $this->insert($child, array_map(fn (?float $value) => [$value, null, null], $osmosis));
        }

        $analysis->forceFill(['status' => 'completed'])->save();

        return $analysis->recommendations()->get()->keyBy('rule_key')->all();
    }

    /**
     * @param  array<string, int|array<int, float|int|null>>  $results
     */
    private function insert(Analysis $analysis, array $results): void
    {
        foreach ($results as $key => $result) {
            [$value, $band, $target] = is_array($result) ? $result : [1.0, $result, null];
            DB::table('analysis_results')->insert([
                'analysis_id' => $analysis->id, 'element_id' => Element::firstWhere('key', $key)->id,
                'value' => $value, 'band' => $band, 'target' => $target,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function content(AnalysisRecommendation $card): array
    {
        return $card->content['de'];
    }

    /**
     * @return list<array{0: string, 1: string}>
     */
    private function details(AnalysisRecommendation $card): array
    {
        return array_map(fn (array $d) => [$d['label'], $d['value']], $this->content($card)['details']);
    }

    public function test_seeded_rules_are_valid(): void
    {
        $validator = app(RuleValidator::class);
        foreach (RecommendationRule::all() as $rule) {
            $this->assertSame([], $validator->validate($rule), $rule->key);
        }
    }

    public function test_a_stable_report_produces_no_recommendation(): void
    {
        $this->assertSame([], $this->complete(['calcium' => 5, 'magnesium' => 5, 'kh' => 5, 'zinc' => 5, 'nitrate' => 5, 'phosphorus' => 5]));
    }

    public function test_cards_are_created_on_completion_sorted_by_severity(): void
    {
        $cards = $this->complete(['calcium' => 8, 'kh' => 4, 'zinc' => 5]);

        $this->assertSame(['water-change', 'reduce-supply'], array_keys($cards));
        $this->assertSame(['critical', 'high'], [$cards['water-change']->tone, $cards['water-change']->priority]);
        $this->assertSame(['calcium'], $cards['water-change']->elements);
        $this->assertEquals(['scale' => 'ati-standard', 'volume' => 500, 'waterType' => 'Meerwasser', 'hasOsmosis' => false, 'resinFilter' => false, 'supplyParts' => 2],
            $cards['water-change']->inputs);
    }

    public function test_water_change_only_for_calcium_magnesium_or_zinc_from_band_8(): void
    {
        $this->assertArrayHasKey('water-change', $this->complete(['zinc' => 8]));
        $this->assertArrayNotHasKey('water-change', $this->complete(['calcium' => 7]));
        $this->assertArrayNotHasKey('water-change', $this->complete(['kh' => 9]));

        $card = $this->complete(['calcium' => 8, 'magnesium' => 9])['water-change'];
        $this->assertSame('Durch die Wasseranalyse wurden stark erhöhte Werte bei **Calcium** und **Magnesium** festgestellt. Um diese Werte zügig wieder in den optimalen Bereich zu senken, empfehlen wir die Durchführung von Wasserwechseln.',
            $this->content($card)['summary']);
        $options = $this->content($card)['options'];
        $this->assertCount(2, $options);
        $this->assertSame(['tool' => 'waterchange', 'label' => ['de' => 'Hier geht es zum Wasserwechsel-Simulator']], $options[1]['action']);
    }

    public function test_supply_channels_follow_the_number_of_parts(): void
    {
        // V2.2-Basis: zwei Teile, KH und Ca zu niedrig, Zink deutlich erhöht
        $base = ['kh' => 3, 'calcium' => 3, 'zinc' => 7];
        $this->assertSame([['KH', '+10–20 %'], ['Ca/Mg', '+10–20 %'], ['Spuren/DT', '−100 %']], $this->details($this->complete($base)['reduce-supply']));

        $this->reef->update(['supply_mode' => 'other', 'supply_bottles' => 1]);
        $this->assertSame(['All-in-one', 'Spuren/DT'], array_column($this->details($this->complete($base)['reduce-supply']), 0));

        $this->reef->update(['supply_bottles' => 3]);
        $three = $this->complete([...$base, 'magnesium' => 3])['reduce-supply'];
        // Zu wenig Calcium heißt mehr Calcium (V2.2 hat dort einen Tippfehler).
        $this->assertSame([['KH', '+10–20 %'], ['Ca', '+10–20 %'], ['Mg', '+10–20 %'], ['Spuren/DT', '−100 %']], $this->details($three));

        $this->reef->update(['supply_mode' => 'none']);
        $none = $this->complete($base)['reduce-supply'];
        $this->assertSame([['Spuren/DT', '−100 %']], $this->details($none));
        $this->assertStringContainsString('Essentials SPS', $this->content($none)['summary']);
    }

    public function test_supply_lists_settled_channels_and_asks_for_the_system(): void
    {
        $this->reef->update(['supply_mode' => null]);
        $card = $this->complete(['kh' => 5, 'calcium' => 3, 'magnesium' => 5])['reduce-supply'];

        $this->assertSame([['Karbonathärte', 'unverändert'], ['Calcium', '+10–20 %'], ['Magnesium', 'unverändert']], $this->details($card));
        $this->assertSame(['Hinterlegen Sie im Aquarium Ihr Versorgungssystem – dann passen wir die Empfehlung an seine Teile an.'], $this->content($card)['tips']);
        $this->assertSame('**Calcium** weicht vom Zielbereich ab. Passen Sie die tägliche Elementversorgung abhängig vom Messwert an.', $this->content($card)['summary']);
    }

    public function test_magnesium_counts_only_where_it_has_a_channel(): void
    {
        $this->assertSame(['Nutzen Sie ausschließlich Meersalze mit naturnahen Werten für Wasserwechsel.'],
            $this->content($this->complete(['kh' => 5, 'calcium' => 5, 'magnesium' => 7])['reduce-supply'])['tips']);

        $this->reef->update(['supply_mode' => 'other', 'supply_bottles' => 1]);
        $this->assertArrayNotHasKey('reduce-supply', $this->complete(['kh' => 5, 'calcium' => 5, 'zinc' => 5, 'magnesium' => 7]));
    }

    public function test_zinc_steers_the_trace_elements(): void
    {
        $trace = function (int $zinc): ?string {
            $card = $this->complete(['kh' => 5, 'calcium' => 5, 'zinc' => $zinc])['reduce-supply'];

            return collect($this->details($card))->firstWhere(0, 'Spuren/DT')[1] ?? null;
        };

        $this->assertSame('+25 %', $trace(4));
        $this->assertSame('−50 %', $trace(6));
        $this->assertSame('−100 %', $trace(7));
        $this->assertSame('−100 %', $trace(9));
        $this->assertArrayNotHasKey('reduce-supply', $this->complete(['kh' => 5, 'calcium' => 5, 'zinc' => 5]));
    }

    public function test_nutrients_cover_all_four_combinations_with_volume_based_doses(): void
    {
        $card = fn (int $nitrate, int $phosphorus) => collect($this->complete(['nitrate' => $nitrate, 'phosphorus' => $phosphorus]))
            ->first(fn ($card, $key) => str_starts_with($key, 'nutrients'));

        $this->assertSame([['Essential Nitro', '2,5 ml täglich'], ['Essential Phospho', '2,5 ml täglich']], $this->details($card(3, 3)));
        $this->assertSame([['Essential Phospho', '2,5 ml täglich'], ['Eiweißabschäumer', 'reinigen']], $this->details($highLow = $card(7, 3)));
        $this->assertSame([['PO₄-Adsorber', 'nutzen'], ['Essential Nitro', '2,5 ml täglich']], $this->details($card(3, 7)));
        $this->assertSame([['Futtereintrag', 'reduzieren'], ['Eiweißabschäumer', 'reinigen'], ['PO₄-Adsorber', 'nutzen']], $this->details($card(7, 7)));
        $this->assertSame('Wir empfehlen Ihnen das Nährstoffmanagement zu optimieren, da **Nitrat** erhöht ist und **Phosphor** reduziert ist.', $this->content($highLow)['summary']);
        $this->assertSame(['Messen Sie regelmäßig NO₃ und PO₄, um Nährstoff-Anreicherungen und Limitierungen zu vermeiden.'], $this->content($highLow)['tips']);

        // Ohne Phosphor zählt Phosphat; nur ein abweichender Nährstoff ergibt keine Karte.
        $this->assertArrayHasKey('nutrients', $this->complete(['nitrate' => 7, 'phosphate' => 7]));
        $this->assertSame([], $this->complete(['nitrate' => 7, 'phosphorus' => 5]));
    }

    public function test_salinity_is_corrected_from_volume_and_target(): void
    {
        $low = $this->complete(['salinity' => [30, 3, 35]])['salinity-low'];
        // Arbeitsmappe V2.2: (35 − 30) × 1,71 × 500 = 4.275 ml je Flasche, × 1,06 = 2.650 g Nyos pure
        $this->assertSame([['Absolute Ocean 1', '4.275 ml'], ['Absolute Ocean 2', '4.275 ml'], ['oder Nyos pure Salz', '2.650 g']], $this->details($low));
        $this->assertStringContainsString('oder ergänzen Sie 2.650 g Nyos pure Salz, um die Salinität auf 35 PSU anzuheben.', $this->content($low)['summary']);
        $this->assertSame('Salinität kontrolliert anheben', $this->content($low)['title']);

        $high = $this->complete(['salinity' => [40, 7, 35]])['salinity-high'];
        $this->assertSame([['Meerwasser entnehmen und durch Osmosewasser ersetzen', '62,5 l']], $this->details($high));

        $this->reef->update(['net_volume' => null]);
        $this->assertSame([['Absolute Ocean 1 und 2', 'je 1,71 ml pro PSU und Liter'], ['oder Nyos pure Salz', '1,06 g pro PSU und Liter']],
            $this->details($this->complete(['salinity' => [30, 3, 35]])['salinity-low']));
    }

    public function test_elevated_zinc_and_pollutants_open_the_source_card(): void
    {
        $this->assertArrayHasKey('pollutants', $this->complete(['zinc' => 6]));
        $this->assertArrayNotHasKey('pollutants', $this->complete(['zinc' => 5]));

        $card = $this->complete(['lead' => 7, 'zinc' => 6])['pollutants'];
        $this->assertEqualsCanonicalizing(['zinc', 'lead'], $card->elements);
        $this->assertStringEndsWith('stammen vermutlich aus einer Eintragsquelle im System. Gesucht wird die Quelle, nicht eine Behandlung des Wertes.', $this->content($card)['summary']);
    }

    public function test_osmosis_findings_depend_on_the_resin_filter(): void
    {
        $card = $this->complete([], ['silicon' => 26, 'zinc' => 1.2, 'phosphorus' => 4])['osmosis'];
        $content = $this->content($card);

        $this->assertMatchesRegularExpression('/^Durch die Wasseranalyse wurde herausgefunden, dass sich \*\*.+\*\*, \*\*.+\*\* und \*\*.+\*\* in der Osmoseprobe befinden\.$/', $content['summary']);
        $this->assertSame(['Nutzen Sie einen Harzfilter hinter der Osmoseanlage.'], [$content['details'][0]['label']]);
        $this->assertCount(3, $content['details']);
        $this->assertStringStartsWith('Zink kann im RO Wasser vorkommen', $content['details'][2]['label']);
        $this->assertSame(['Mindestens 1 l Harz pro 30 GPD Tagesleistung der Osmoseanlage.'], $content['tips']);

        $source = Aquarium::factory()->osmosis()->for($this->user)->create(['water_details' => ['resin_filter' => true]]);
        $this->reef->syncLinks(['osmosis_source' => $source->id]);
        $this->assertSame('Wechseln Sie das Harz im Reinstfilter aus.', $this->content($this->complete([], ['silicon' => 26])['osmosis'])['details'][0]['label']);

        // Genau 25 liegt nicht über der Grenze, unter der Nachweisgrenze zählt nicht.
        $this->assertArrayNotHasKey('osmosis', $this->complete([], ['silicon' => 25, 'zinc' => null]));
    }

    public function test_a_scale_specific_rule_replaces_the_global_one(): void
    {
        $global = RecommendationRule::firstWhere('key', 'pollutants');
        $override = $global->replicate()->fill(['evaluation_scale_id' => 'nyos', 'title' => ['de' => 'NYOS: Quelle suchen']]);
        $override->save();
        $nyosReef = Aquarium::factory()->for($this->user)->create(['evaluation_scale_id' => 'nyos']);

        $this->assertSame('NYOS: Quelle suchen', $this->content($this->complete(['zinc' => 7], aquarium: $nyosReef)['pollutants'])['title']);
        $this->assertSame('Schadstoffquelle eliminieren', $this->content($this->complete(['zinc' => 7])['pollutants'])['title']);

        // Eine inaktive Skalen-Regel schaltet die Empfehlung für diese Skala ab.
        $override->update(['is_active' => false]);
        $this->assertArrayNotHasKey('pollutants', $this->complete(['zinc' => 7], aquarium: $nyosReef));
    }

    public function test_texts_fall_back_to_german_and_use_other_elements(): void
    {
        $rule = RecommendationRule::create([
            'key' => 'custom', 'name' => 'Test', 'scope_elements' => ['magnesium'], 'element_condition' => 'band > 5',
            'title' => ['de' => 'Magnesium hoch', 'en' => 'Magnesium high'],
            'summary' => ['de' => 'Mg {{ round(value / calcium.value, 2) }} je Ca{{#if volume > 100}}, großes Becken{{/if}}.'],
        ]);
        $rule->calculations()->create(['name' => 'unused', 'expression' => 'value * 2']);

        $card = $this->complete(['magnesium' => [1500, 7, 1350], 'calcium' => [420, 5, 420]])['custom'];

        $this->assertSame('Mg 3,57 je Ca, großes Becken.', $card->content['de']['summary']);
        $this->assertSame('Magnesium high', $card->content['en']['title']);
        $this->assertSame('Mg 3.57 je Ca, großes Becken.', $card->content['en']['summary']);
    }

    public function test_lab_edited_cards_survive_regeneration(): void
    {
        $cards = $this->complete(['zinc' => 7, 'calcium' => 8]);
        $cards['pollutants']->update(['is_edited' => true, 'content' => ['de' => ['title' => 'vom Labor']]]);
        $analysis = $cards['pollutants']->analysis;

        $this->artisan('recommendations:generate', ['--analysis' => [$analysis->id]])->assertSuccessful();

        $after = $analysis->recommendations()->get()->keyBy('rule_key');
        $this->assertSame('vom Labor', $after['pollutants']->content['de']['title']);
        $this->assertSame(1, $after->where('rule_key', 'pollutants')->count());
        $this->assertTrue($after->has('water-change'));
    }

    public function test_completing_a_sample_regenerates_its_completed_parent(): void
    {
        $cards = $this->complete(['calcium' => 5]);
        $this->assertSame([], $cards);
        $parent = Analysis::whereNull('parent_id')->latest()->first();

        $child = Analysis::forceCreate([
            'user_id' => $this->user->id, 'parent_id' => $parent->id, 'aquarium_name' => 'Osmose',
            'method_id' => AnalysisMethod::firstWhere('key', 'osmose')->id, 'status' => 'in_analysis',
        ]);
        $this->insert($child, ['silicon' => [40, null, null]]);
        $child->forceFill(['status' => 'completed'])->save();

        $this->assertSame(['osmosis'], $parent->recommendations()->pluck('rule_key')->all());
    }

    public function test_api_returns_recommendations_in_the_users_language(): void
    {
        RecommendationRule::where('key', 'water-change')->update(['title' => json_encode(['de' => 'Wasserwechsel durchführen', 'en' => 'Change water'])]);
        $card = $this->complete(['calcium' => 8])['water-change'];
        $this->user->forceFill(['language' => 'en'])->save();

        $this->withToken($this->user->createToken('web')->plainTextToken)
            ->getJson("/api/analyses/{$card->analysis_id}")
            ->assertOk()
            ->assertJsonCount(2, 'analysis.recommendations')
            ->assertJsonPath('analysis.recommendations.1.key', 'reduce-supply')
            ->assertJsonPath('analysis.recommendations.0.key', 'water-change')
            ->assertJsonPath('analysis.recommendations.0.tone', 'critical')
            ->assertJsonPath('analysis.recommendations.0.elements', ['calcium'])
            ->assertJsonPath('analysis.recommendations.0.title', 'Change water')
            // ohne englischen Text: Deutsch
            ->assertJsonPath('analysis.recommendations.0.kicker', 'Sofortmaßnahme')
            ->assertJsonPath('analysis.recommendations.0.action', ['tool' => 'waterchange'])
            ->assertJsonPath('analysis.recommendations.0.completedAt', null);
    }
}
