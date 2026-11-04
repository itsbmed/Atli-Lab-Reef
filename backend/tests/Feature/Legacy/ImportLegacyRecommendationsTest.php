<?php

namespace Tests\Feature\Legacy;

use App\Console\Commands\ImportLegacyRecommendations;
use App\Models\RecommendationRule;
use Database\Seeders\AnalysisCatalogSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportLegacyRecommendationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnalysisCatalogSeeder::class);
        config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
        DB::purge('legacy');

        // Struktur wie in ati-2025-07-24 (gekürzt auf die gelesenen Spalten).
        $legacy = Schema::connection('legacy');
        $legacy->create('elements', function (Blueprint $table) {
            $table->increments('id');
            foreach (['high1', 'high2', 'low1', 'low2'] as $level) {
                $table->unsignedInteger("elements_action_id_{$level}")->default(0);
            }
        });
        $legacy->create('elements_action', function (Blueprint $table) {
            $table->increments('id');
            $table->text('name_de')->nullable();
            $table->text('name_en')->nullable();
        });

        DB::connection('legacy')->table('elements_action')->insert([
            ['id' => 22, 'name_de' => 'Erhöhen Sie den KH Wert. <br>Dosieren Sie ==round2(([eRefValue]-[eValue])*[tankVolume]*0.1)== ml Essentials+ #1 <b>oder</b> ==round2(([eRefValue]-[eValue])*[tankVolume]*0.07)== ml Essentials pro #1.', 'name_en' => 'Raise KH.'],
            ['id' => 24, 'name_de' => 'Geben Sie ==round(([eRefValue]-[eValue])*[tankVolume]*1.71)== ml Absolute Ocean #1 und ==round(([eRefValue]-[eValue])*[tankVolume]*1.71)== ml #2 ins Aquarium.', 'name_en' => null],
            ['id' => 30, 'name_de' => 'Prüfen Sie die Calciumversorgung &amp; das Salz.', 'name_en' => null],
            ['id' => 31, 'name_de' => '', 'name_en' => null],
        ]);
        foreach ([
            ['id' => 56, 'elements_action_id_low1' => 22, 'elements_action_id_low2' => 22],  // KH
            ['id' => 64, 'elements_action_id_low1' => 24],                                      // Salinität
            ['id' => 46, 'elements_action_id_high2' => 30, 'elements_action_id_high1' => 31],  // Calcium, high1 ohne Text
            ['id' => 999, 'elements_action_id_high2' => 30],                                    // unbekanntes Element
        ] as $row) {
            DB::connection('legacy')->table('elements')->insert($row);
        }
    }

    public function test_imports_actions_as_inactive_german_rules_with_calculations(): void
    {
        $this->artisan('legacy:import-recommendations')->assertSuccessful();

        $this->assertSame(['legacy-calcium-high2', 'legacy-kh-low1', 'legacy-kh-low2', 'legacy-salinity-low1'],
            RecommendationRule::orderBy('key')->pluck('key')->all());

        $kh = RecommendationRule::with('calculations')->firstWhere('key', 'legacy-kh-low1');
        $this->assertFalse($kh->is_active);
        $this->assertSame(['kh'], $kh->scope_elements);
        $this->assertSame('band in [3, 4]', $kh->element_condition);
        $this->assertSame(['de' => 'Karbonathärte niedrig'], $kh->title);
        $this->assertSame(['de' => "Erhöhen Sie den KH Wert.\nDosieren Sie {{ calc_1 }} ml Essentials+ #1 **oder** {{ calc_2 }} ml Essentials pro #1."], $kh->summary);
        $this->assertSame(['calc_1' => 'round((target-value)*volume*0.1, 2)', 'calc_2' => 'round((target-value)*volume*0.07, 2)'],
            $kh->calculations->pluck('expression', 'name')->all());

        // Dieselbe Formel zweimal im Text = eine Berechnung
        $salinity = RecommendationRule::with('calculations')->firstWhere('key', 'legacy-salinity-low1');
        $this->assertSame(['calc_1'], $salinity->calculations->pluck('name')->all());
        $this->assertStringContainsString('{{ calc_1 }} ml Absolute Ocean #1 und {{ calc_1 }} ml #2', $salinity->summary['de']);

        $this->assertSame('Prüfen Sie die Calciumversorgung & das Salz.', RecommendationRule::firstWhere('key', 'legacy-calcium-high2')->summary['de']);
    }

    public function test_rerun_updates_texts_but_keeps_activation(): void
    {
        $this->artisan('legacy:import-recommendations')->assertSuccessful();
        RecommendationRule::where('key', 'legacy-kh-low1')->update(['is_active' => true, 'summary' => json_encode(['de' => 'geändert'])]);

        $this->artisan('legacy:import-recommendations')->assertSuccessful();

        $rule = RecommendationRule::firstWhere('key', 'legacy-kh-low1');
        $this->assertTrue($rule->is_active);
        $this->assertStringStartsWith('Erhöhen Sie', $rule->summary['de']);
        $this->assertSame(2, $rule->calculations()->count());
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->artisan('legacy:import-recommendations', ['--dry-run' => true])->assertSuccessful();

        $this->assertSame(0, RecommendationRule::count());
    }

    public function test_converts_old_formula_functions(): void
    {
        $this->assertSame('(volume > 100 ? round(volume * 0.5, 1) : 0)', ImportLegacyRecommendations::convertFormula('if(volume > 100, round1([tankVolume] * 0.5), 0)'));
        $this->assertSame('((value > target) ? 1 : 2)', ImportLegacyRecommendations::convertFormula('if(gt([eValue], [eRefValue]), 1, 2)'));
        $this->assertSame('max - min', ImportLegacyRecommendations::convertFormula('[eRefValueHigh1] - [eRefNormValueLow1]'));
    }
}
