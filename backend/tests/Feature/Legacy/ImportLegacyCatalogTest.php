<?php

namespace Tests\Feature\Legacy;

use Database\Seeders\AnalysisCatalogSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportLegacyCatalogTest extends TestCase
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
        $legacy->create('units', function (Blueprint $table) {
            $table->increments('id');
            $table->string('symbol', 10)->nullable();
        });
        $legacy->create('supplements', function (Blueprint $table) {
            $table->increments('id');
            foreach (['de', 'en', 'fr', 'es', 'it', 'cn'] as $lang) {
                $table->string("sup_name_{$lang}")->nullable();
            }
            $table->float('max_dose_per_day')->nullable();
            $table->unsignedInteger('units_id')->nullable();
        });
        $legacy->create('elements', function (Blueprint $table) {
            $table->increments('id');
            $table->float('ref_value')->default(0);
            foreach (['ref_value_low_1', 'ref_value_low_2', 'ref_value_high_1', 'ref_value_high_2', 'ref_value_nyos', 'ref_value_low_nyos', 'ref_value_high_nyos'] as $column) {
                $table->float($column)->nullable();
            }
        });

        DB::connection('legacy')->table('units')->insert(['id' => 7, 'symbol' => 'ml/L']);
        DB::connection('legacy')->table('supplements')->insert([
            'id' => 2, 'sup_name_de' => 'Calcium (Ca)', 'sup_name_en' => 'Calcium (Ca)', 'sup_name_fr' => '', 'max_dose_per_day' => 0.1, 'units_id' => 7,
        ]);
        DB::connection('legacy')->table('elements')->insert([
            // Calcium mit NYOS-Werten
            ['id' => 46, 'ref_value' => 421, 'ref_value_low_2' => 360, 'ref_value_low_1' => 395, 'ref_value_high_1' => 465, 'ref_value_high_2' => 500,
                'ref_value_nyos' => 421, 'ref_value_low_nyos' => 410, 'ref_value_high_nyos' => 450],
            // Aluminium: negative Untergrenzen = keine Untergrenze
            ['id' => 7, 'ref_value' => 0.1, 'ref_value_low_2' => -40, 'ref_value_low_1' => -20, 'ref_value_high_1' => 50, 'ref_value_high_2' => 150,
                'ref_value_nyos' => null, 'ref_value_low_nyos' => null, 'ref_value_high_nyos' => null],
            // Na/Cl: prozentuale Abweichung, negative Grenzen bleiben
            ['id' => 65, 'ref_value' => 1, 'ref_value_low_2' => -10, 'ref_value_low_1' => -5, 'ref_value_high_1' => 5, 'ref_value_high_2' => 10,
                'ref_value_nyos' => null, 'ref_value_low_nyos' => null, 'ref_value_high_nyos' => null],
            // in der neuen Datenbank unbekannt
            ['id' => 999, 'ref_value' => 1, 'ref_value_low_2' => null, 'ref_value_low_1' => null, 'ref_value_high_1' => null, 'ref_value_high_2' => null,
                'ref_value_nyos' => null, 'ref_value_low_nyos' => null, 'ref_value_high_nyos' => null],
        ]);
    }

    private function threshold(string $scale, string $element): ?object
    {
        return DB::table('evaluation_scale_thresholds')
            ->join('elements', 'elements.id', '=', 'evaluation_scale_thresholds.element_id')
            ->where('scale_id', $scale)->where('elements.key', $element)->where('water_type', 'Meerwasser')
            ->first(['target', 'crit_low', 'too_low', 'low', 'min', 'max', 'increased', 'high', 'too_high']);
    }

    public function test_imports_products(): void
    {
        $this->artisan('legacy:import-catalog')->assertSuccessful();

        $product = DB::table('products')->sole();
        $this->assertSame(2, (int) $product->legacy_id);
        $this->assertSame('legacy-2', $product->key);
        $this->assertSame(['de' => 'Calcium (Ca)', 'en' => 'Calcium (Ca)'], json_decode($product->name, true));
        $this->assertSame('ml/L', $product->unit);
    }

    public function test_maps_reference_values_to_the_nine_bands(): void
    {
        $this->artisan('legacy:import-catalog')
            ->expectsTable(['', 'Anzahl'], [
                ['Produkte', 1],
                ['Grenzwerte ati-standard', 3],
                ['Grenzwerte nyos', 1],
                ['Elemente ohne Zuordnung (alte IDs)', '999'],
            ])
            ->assertSuccessful();

        $this->assertEquals((object) [
            'target' => 421, 'crit_low' => null, 'too_low' => 360, 'low' => 360, 'min' => 395,
            'max' => 465, 'increased' => 500, 'high' => 500, 'too_high' => null,
        ], $this->threshold('ati-standard', 'calcium'));

        $aluminium = $this->threshold('ati-standard', 'aluminium');
        $this->assertNull($aluminium->too_low);
        $this->assertNull($aluminium->min);
        $this->assertEquals(50, $aluminium->max);

        $this->assertEquals(-5, $this->threshold('ati-standard', 'ratio-na-cl')->min);

        $nyos = $this->threshold('nyos', 'calcium');
        $this->assertEquals([421, 410, 450, null], [$nyos->target, $nyos->min, $nyos->max, $nyos->increased]);
        $this->assertNull($this->threshold('nyos', 'aluminium'));
    }

    public function test_is_repeatable(): void
    {
        $this->artisan('legacy:import-catalog')->assertSuccessful();
        DB::connection('legacy')->table('elements')->where('id', 46)->update(['ref_value' => 430]);
        $this->artisan('legacy:import-catalog')->assertSuccessful();

        $this->assertSame(1, DB::table('products')->count());
        $this->assertSame(4, DB::table('evaluation_scale_thresholds')->count());
        $this->assertEquals(430, $this->threshold('ati-standard', 'calcium')->target);
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->artisan('legacy:import-catalog', ['--dry-run' => true])->expectsOutputToContain('Probelauf')->assertSuccessful();

        $this->assertSame(0, DB::table('products')->count());
        $this->assertSame(0, DB::table('evaluation_scale_thresholds')->count());
    }
}
