<?php

namespace Tests\Feature\Legacy;

use App\Enums\AnalysisReason;
use App\Enums\AnalysisStatus;
use App\Models\Analysis;
use App\Models\AnalysisPackage;
use App\Models\Aquarium;
use App\Models\User;
use App\Models\Voucher;
use Database\Seeders\AnalysisCatalogSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportLegacyAnalysesTest extends TestCase
{
    use RefreshDatabase;

    private Aquarium $reef;

    private Aquarium $osmosis;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnalysisCatalogSeeder::class);
        config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
        DB::purge('legacy');

        // Struktur wie in ati-2025-07-24 (gekürzt auf die gelesenen Spalten).
        $legacy = Schema::connection('legacy');
        $legacy->create('analysis', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('parent_id')->nullable();
            $table->unsignedInteger('tanks_id');
            $table->unsignedInteger('type')->default(0);
            $table->string('date_arrived')->nullable();
            $table->string('date_analysed')->nullable();
            $table->string('comment')->default('');
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
            $table->tinyInteger('status')->default(-1);
            $table->text('hash')->nullable();
            $table->text('advice')->nullable();
            $table->double('super_quality_index')->nullable();
            $table->string('lang', 10)->nullable();
            $table->integer('reason')->nullable();
        });
        $legacy->create('analysis_vouchers', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('analysis_id')->nullable();
        });
        $legacy->create('analysis_results', function (Blueprint $table) {
            $table->integer('analysis_id');
            $table->integer('elements_id');
            $table->float('elements_value')->nullable();
            $table->integer('result_status')->default(0);
            $table->unsignedInteger('supplements_id')->nullable();
            $table->float('supplements_value_per_day')->nullable();
            $table->integer('supplements_days')->default(0);
            $table->unsignedInteger('supplements_id2')->nullable();
            $table->float('supplements_value_per_day2')->nullable();
            $table->integer('supplements_days2')->default(0);
            $table->float('ref_norm_value')->default(0);
            $table->float('ref_norm_value_low_1')->default(0);
            $table->float('ref_norm_value_high_1')->default(0);
        });
        $legacy->create('analysis2elements_groups', function (Blueprint $table) {
            $table->bigInteger('analysis_id')->nullable();
            $table->bigInteger('elements_groups_id')->nullable();
            $table->double('percentage_value')->nullable();
        });

        $owner = User::factory()->create(['legacy_id' => 500]);
        $this->reef = Aquarium::factory()->for($owner)->create(['legacy_id' => 10, 'name' => 'Riff']);
        $this->osmosis = Aquarium::factory()->osmosis()->for($owner)->create(['legacy_id' => 11, 'name' => 'Osmose']);
        DB::table('products')->insert(['legacy_id' => 2, 'key' => 'legacy-2', 'name' => '{"de":"Calcium (Ca)"}']);
    }

    private function analysis(int $id, array $attributes = []): void
    {
        DB::connection('legacy')->table('analysis')->insert($attributes + [
            'id' => $id, 'tanks_id' => 10, 'type' => 1, 'status' => 2,
            'date_arrived' => '2024-03-04 00:00:00', 'date_analysed' => '2024-03-06 12:00:00',
            'created_at' => '2024-03-01 10:00:00', 'updated_at' => '2024-03-06 12:00:00',
        ]);
    }

    private function voucher(int $legacyId, int $analysisId, string $package = 'icp-oes'): Voucher
    {
        DB::connection('legacy')->table('analysis_vouchers')->insert(['id' => $legacyId, 'analysis_id' => $analysisId]);

        return Voucher::create([
            'legacy_id' => $legacyId, 'code' => "CODE-{$legacyId}", 'package_id' => AnalysisPackage::firstWhere('key', $package)->id,
        ]);
    }

    private function measurement(int $analysisId, int $elementId, ?float $value, int $status = 0, array $attributes = []): void
    {
        DB::connection('legacy')->table('analysis_results')->insert($attributes + [
            'analysis_id' => $analysisId, 'elements_id' => $elementId, 'elements_value' => $value, 'result_status' => $status,
        ]);
    }

    private function imported(int $legacyId): Analysis
    {
        return Analysis::with(['method', 'package'])->firstWhere('legacy_id', $legacyId);
    }

    /**
     * @return array<string, object>
     */
    private function results(int $legacyId): array
    {
        return DB::table('analysis_results')
            ->join('elements', 'elements.id', '=', 'analysis_results.element_id')
            ->where('analysis_id', $this->imported($legacyId)->id)
            ->get(['elements.key', 'value', 'band', 'target', 'min', 'max'])->keyBy('key')->all();
    }

    public function test_maps_the_analysis(): void
    {
        $voucher = $this->voucher(77, 1, 'icp-ms');
        $this->analysis(1, [
            'type' => 6, 'reason' => 4, 'lang' => 'de', 'comment' => 'Korallen bleichen aus', 'advice' => 'Bitte KH stabilisieren.',
            'super_quality_index' => 87.25, 'hash' => 'a1b2c3d4e5f6a7b8c9d0',
        ]);

        $this->artisan('legacy:import-analyses')->assertSuccessful();

        $analysis = $this->imported(1);
        $this->assertSame($this->reef->user_id, $analysis->user_id);
        $this->assertSame($this->reef->id, $analysis->aquarium_id);
        $this->assertSame('Riff', $analysis->aquarium_name);
        $this->assertSame($voucher->id, $analysis->voucher_id);
        $this->assertSame('icp-ms', $analysis->package->key);
        $this->assertSame('meerwasser-icp-ms', $analysis->method->key);
        $this->assertSame('ati-standard', $analysis->evaluation_scale_id);
        $this->assertSame(AnalysisStatus::Completed, $analysis->status);
        $this->assertSame(AnalysisReason::Rtn, $analysis->reason);
        $this->assertSame('de', $analysis->language);
        $this->assertSame('Korallen bleichen aus', $analysis->customer_comment);
        $this->assertSame('Bitte KH stabilisieren.', $analysis->lab_advice);
        $this->assertSame(87.3, $analysis->quality_index);
        $this->assertSame('a1b2c3d4e5f6a7b8c9d0', $analysis->share_token);
        $this->assertSame('2024-03-04', $analysis->received_at->toDateString());
        $this->assertSame('2024-03-06 12:00:00', $analysis->analysed_at->toDateTimeString());
        $this->assertSame('2024-03-01 10:00:00', $analysis->created_at->toDateTimeString());
        $this->assertSame('full', $analysis->user->kind);
    }

    public function test_open_analyses_are_received_once_the_sample_arrived(): void
    {
        $this->analysis(1, ['status' => -1, 'type' => 0, 'date_arrived' => '0000-00-00 00:00:00', 'date_analysed' => null, 'comment' => '']);
        $this->analysis(2, ['status' => -1, 'date_analysed' => null]);
        $this->analysis(3, ['status' => 1]);

        $this->artisan('legacy:import-analyses')->assertSuccessful();

        $first = $this->imported(1);
        $this->assertSame(AnalysisStatus::Registered, $first->status);
        $this->assertNull($first->received_at);
        $this->assertNull($first->method_id);
        $this->assertNull($first->customer_comment);
        $this->assertSame(AnalysisStatus::Received, $this->imported(2)->status);
        $this->assertSame(AnalysisStatus::InAnalysis, $this->imported(3)->status);
    }

    public function test_imports_results_dosings_and_group_scores(): void
    {
        $this->analysis(1);
        // Calcium zu niedrig, mit zwei Dosierungen (die zweite ohne Menge)
        $this->measurement(1, 46, 318.7, -2, [
            'ref_norm_value' => 419.9, 'ref_norm_value_low_1' => 393.5, 'ref_norm_value_high_1' => 463.6,
            'supplements_id' => 2, 'supplements_value_per_day' => 0.08, 'supplements_days' => 6,
            'supplements_id2' => 2, 'supplements_value_per_day2' => 0,
        ]);
        // Aluminium: negative Untergrenze, Dosierprodukt unbekannt
        $this->measurement(1, 7, 25.3, 0, ['ref_norm_value' => 0.1, 'ref_norm_value_low_1' => -20, 'ref_norm_value_high_1' => 50, 'supplements_id' => 99, 'supplements_value_per_day' => 1]);
        // nicht gemessen
        $this->measurement(1, 5, null, 0);
        // unbekanntes Element
        $this->measurement(1, 999, 1.0, 0);
        DB::connection('legacy')->table('analysis2elements_groups')->insert([
            ['analysis_id' => 1, 'elements_groups_id' => 1, 'percentage_value' => 60],
            ['analysis_id' => 1, 'elements_groups_id' => 1, 'percentage_value' => 75],
            ['analysis_id' => 1, 'elements_groups_id' => 3, 'percentage_value' => 100],
        ]);

        $this->artisan('legacy:import-analyses')->assertSuccessful();

        $results = $this->results(1);
        $this->assertSame(['aluminium', 'antimony', 'calcium'], collect($results)->keys()->sort()->values()->all());
        $this->assertEquals([318.7, 2, 419.9, 393.5, 463.6], array_map(fn ($v) => round($v, 1), [
            $results['calcium']->value, $results['calcium']->band, $results['calcium']->target, $results['calcium']->min, $results['calcium']->max,
        ]));
        $this->assertSame(5, (int) $results['aluminium']->band);
        $this->assertNull($results['aluminium']->min);
        $this->assertNull($results['antimony']->value);
        $this->assertNull($results['antimony']->band);

        $dosing = DB::table('analysis_dosings')->sole();
        $this->assertSame([1, 6], [(int) $dosing->position, (int) $dosing->days]);
        $this->assertEqualsWithDelta(0.08, $dosing->amount_per_day, 0.0001);

        $scores = DB::table('analysis_group_scores')->join('element_groups', 'element_groups.id', '=', 'element_group_id')->pluck('score', 'key')->all();
        $this->assertEquals(['quantity' => 75, 'pollutants' => 100], $scores);
    }

    public function test_links_samples_to_their_main_analysis_and_inherits_the_package(): void
    {
        // Kind vor der Hauptanalyse, wie es im Altsystem vorkommt
        $this->analysis(5, ['tanks_id' => 11, 'type' => 3, 'parent_id' => 8]);
        $this->analysis(8);
        $this->voucher(77, 8, 'icp-ms');

        $this->artisan('legacy:import-analyses')
            ->expectsOutputToContain('Proben mit Hauptanalyse verknüpft')
            ->assertSuccessful();

        $sample = $this->imported(5);
        $this->assertSame($this->imported(8)->id, $sample->parent_id);
        $this->assertSame($this->osmosis->id, $sample->aquarium_id);
        $this->assertSame('osmose', $sample->method->key);
        $this->assertSame('icp-ms', $sample->package->key);
        $this->assertNull($sample->voucher_id);
    }

    public function test_skips_analyses_of_tanks_that_were_not_imported(): void
    {
        $this->analysis(1);
        $this->analysis(2, ['tanks_id' => 999]);

        $this->artisan('legacy:import-analyses')->assertSuccessful();

        $this->assertSame([1], Analysis::pluck('legacy_id')->all());
    }

    public function test_is_repeatable_and_keeps_ids(): void
    {
        $this->analysis(1);
        $this->measurement(1, 46, 400.0);
        $this->artisan('legacy:import-analyses')->assertSuccessful();
        $id = $this->imported(1)->id;

        DB::connection('legacy')->table('analysis_results')->update(['elements_value' => 410]);
        $this->artisan('legacy:import-analyses')->assertSuccessful();

        $this->assertSame(1, Analysis::count());
        $this->assertSame($id, $this->imported(1)->id);
        $this->assertSame(1, DB::table('analysis_results')->count());
        $this->assertEquals(410, $this->results(1)['calcium']->value);
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->analysis(1);
        $this->measurement(1, 46, 400.0);

        $this->artisan('legacy:import-analyses', ['--dry-run' => true])->expectsOutputToContain('Probelauf')->assertSuccessful();

        $this->assertSame(0, Analysis::count());
        $this->assertSame(0, DB::table('analysis_results')->count());
    }
}
