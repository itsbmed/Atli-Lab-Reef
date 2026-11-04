<?php

namespace Tests\Feature\Recommendations;

use App\Models\RecommendationRule;
use App\Recommendations\RuleValidator;
use Database\Seeders\AnalysisCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RuleValidatorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnalysisCatalogSeeder::class);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<string, string>  $calculations
     * @return list<string>
     */
    private function errors(array $attributes, array $calculations = [], array $blocks = []): array
    {
        $rule = RecommendationRule::create($attributes + [
            'key' => 'test', 'name' => 'Test', 'title' => ['de' => 'Titel'], 'summary' => ['de' => 'Text'],
        ]);
        foreach ($calculations as $name => $expression) {
            $rule->calculations()->create(['name' => $name, 'expression' => $expression]);
        }
        foreach ($blocks as $block) {
            $rule->blocks()->create($block);
        }

        return app(RuleValidator::class)->validate($rule->fresh());
    }

    public function test_accepts_a_valid_rule(): void
    {
        $this->assertSame([], $this->errors(
            ['scope_elements' => ['salinity', 'ratio-mg-ca'], 'condition' => 'affected_count > 0 and ratio_mg_ca.band != 5',
                'summary' => ['de' => '{{ affected }}: {{ round(salt_ml) }} ml{{#if osmosis.silicon.value > 25}} Harz{{/if}}', 'en' => '{{ salt_ml }}']],
            ['salt_ml' => 'clamp((target - value) * volume * 1.71, 0, 100000)', 'half' => 'salt_ml / 2'],
            [['type' => 'detail', 'condition' => 'supplyParts in [2, 3]', 'label' => ['de' => '{{ kh.label }}'], 'text' => ['de' => '{{ half }} ml']]],
        ));
    }

    public function test_reports_syntax_errors_and_unknown_variables(): void
    {
        $errors = $this->errors(
            ['element_condition' => 'band >', 'summary' => ['de' => '{{ voluem }} und {{ calcium.wert }}{{#if x']],
            [],
            [['type' => 'tip', 'condition' => 'osmosis.unbekannt.value > 0', 'text' => ['de' => 'ok']]],
        );

        $this->assertSame([
            'Bedingung je Element: Die Formel endet unerwartet.',
            'summary (de): Nicht geschlossener Platzhalter: „{{“ und „}}“ müssen paarweise stehen.',
            'Block 1 (tip), Bedingung: unbekannte Variable „osmosis.unbekannt.value“.',
        ], $errors);

        $this->assertSame([
            'summary (de): unbekannte Variable „voluem“.',
            'summary (de): unbekannte Variable „calcium.wert“.',
        ], $this->errors(['key' => 'other', 'summary' => ['de' => '{{ voluem }} und {{ calcium.wert }}']]));
    }

    public function test_requires_german_texts_and_known_scope_elements(): void
    {
        $this->assertSame([
            'title: Der deutsche Text fehlt.',
            'Unbekanntes Element „unobtainium“ im Scope.',
        ], $this->errors(['title' => ['en' => 'Title'], 'scope_elements' => ['unobtainium']]));
    }

    public function test_checks_calculation_names_and_cycles(): void
    {
        $this->assertSame([
            'Berechnung „Volume“: Name nur aus Kleinbuchstaben, Ziffern und _.',
            'Berechnung „calcium“: Der Name ist bereits vergeben.',
            'Zirkelbezug in den Berechnungen: a → b → a.',
        ], $this->errors([], ['Volume' => '1', 'calcium' => '2', 'a' => 'b + 1', 'b' => 'a * 2']));
    }
}
