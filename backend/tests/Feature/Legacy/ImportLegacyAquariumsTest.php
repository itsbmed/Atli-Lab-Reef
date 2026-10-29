<?php

namespace Tests\Feature\Legacy;

use App\Models\Aquarium;
use App\Models\AquariumImage;
use App\Models\AquariumLink;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportLegacyAquariumsTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private int $analysisId = 0;

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
        DB::purge('legacy');

        // Struktur wie in ati-2025-07-24 (gekürzt auf die gelesenen Spalten).
        $legacy = Schema::connection('legacy');
        $legacy->create('tanks', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('users_id');
            $table->string('tankname')->nullable();
            $table->integer('netto_size_liter')->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });
        $legacy->create('tank_properties', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('tank_id');
            $table->unsignedInteger('property_id');
            $table->string('value')->nullable();
        });
        $legacy->create('analysis', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('parent_id')->nullable();
            $table->unsignedInteger('tanks_id');
            $table->unsignedInteger('type');
        });
        $legacy->create('pictures', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('path')->nullable();
            $table->text('thumbnailpath')->nullable();
            $table->string('type', 25)->nullable();
            $table->bigInteger('tanks_id')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        $this->owner = User::factory()->create(['legacy_id' => 500]);
    }

    private function tank(int $id, array $attributes = []): void
    {
        DB::connection('legacy')->table('tanks')->insert($attributes + [
            'id' => $id,
            'users_id' => 500,
            'tankname' => "Becken {$id}",
            'netto_size_liter' => 300,
            'created_at' => '2018-03-01 10:00:00',
            'updated_at' => '2024-05-01 10:00:00',
        ]);
    }

    private function property(int $tankId, int $propertyId, ?string $value): void
    {
        DB::connection('legacy')->table('tank_properties')->insert(['tank_id' => $tankId, 'property_id' => $propertyId, 'value' => $value]);
    }

    private function analysis(int $tankId, int $type, ?int $parentId = null): int
    {
        DB::connection('legacy')->table('analysis')->insert(['id' => ++$this->analysisId, 'tanks_id' => $tankId, 'type' => $type, 'parent_id' => $parentId]);

        return $this->analysisId;
    }

    private function imported(int $legacyId): Aquarium
    {
        return Aquarium::firstWhere('legacy_id', $legacyId);
    }

    public function test_maps_tank_fields_and_properties(): void
    {
        $this->tank(1, ['tankname' => '  Wohnzimmer Riff ', 'netto_size_liter' => 450, 'description' => 'Mischbecken seit 2012.']);
        $this->property(1, 61, '120 x 60 x 60');
        $this->property(1, 62, 'ATI Hybrid');
        $this->property(1, 62, 'Kessil A360');
        $this->property(1, 63, 'Deltec 600i');
        $this->property(1, 64, 'Tunze 6105');
        $this->property(1, 65, 'Balling light');
        $this->property(1, 66, 'Aktivkohle');
        $this->property(1, 67, 'Läuft super.');
        $this->property(1, 66, '   ');
        $this->analysis(1, 1);

        $this->artisan('legacy:import-aquariums')->assertSuccessful();

        $aquarium = $this->imported(1);
        $this->assertSame($this->owner->id, $aquarium->user_id);
        $this->assertSame('Wohnzimmer Riff', $aquarium->name);
        $this->assertSame('Meerwasser', $aquarium->water_type);
        $this->assertSame(450.0, $aquarium->net_volume);
        $this->assertSame('120 x 60 x 60', $aquarium->dimensions);
        $this->assertSame('Balling light', $aquarium->supply_system);
        $this->assertTrue($aquarium->skimmer);
        $this->assertSame('Deltec 600i', $aquarium->skimmer_model);
        $this->assertSame("Mischbecken seit 2012.\n\nLäuft super.", $aquarium->notes);
        $this->assertSame(['light_product' => 'ATI Hybrid; Kessil A360', 'flow_products' => 'Tunze 6105', 'other_media' => 'Aktivkohle'], $aquarium->water_details);
        $this->assertSame('reef-mixed', $aquarium->image_theme);
        $this->assertSame('2018-03-01 10:00:00', $aquarium->created_at->toDateTimeString());
    }

    public function test_water_type_comes_from_the_latest_analysis(): void
    {
        $this->tank(1);
        $this->analysis(1, 3);
        $this->analysis(1, 1);
        $this->tank(2, ['netto_size_liter' => 1]);
        $this->analysis(2, 1);
        $this->analysis(2, 3);
        $this->tank(3);
        $this->analysis(3, 2);
        $this->tank(4);
        $this->analysis(4, 4);
        $this->tank(5);
        $this->analysis(5, 6);
        $this->tank(6, ['tankname' => 'RODI Wasser']);
        $this->tank(7, ['tankname' => 'Frost']);
        $this->tank(8, ['tankname' => 'Mein RO-Wasser']);

        $this->artisan('legacy:import-aquariums')->assertSuccessful();

        $this->assertSame('Meerwasser', $this->imported(1)->water_type);
        $this->assertSame('Osmosewasser', $this->imported(2)->water_type);
        $this->assertNull($this->imported(2)->net_volume);
        $this->assertSame('osmosis', $this->imported(2)->image_theme);
        $this->assertSame('Süßwasser', $this->imported(3)->water_type);
        $this->assertSame('Meersalz', $this->imported(4)->water_type);
        $this->assertSame('Meerwasser', $this->imported(5)->water_type);
        $this->assertSame('Osmosewasser', $this->imported(6)->water_type);
        $this->assertSame('Meerwasser', $this->imported(7)->water_type);
        $this->assertSame('Osmosewasser', $this->imported(8)->water_type);
    }

    public function test_cleans_up_implausible_values(): void
    {
        $this->tank(1, ['netto_size_liter' => 0, 'tankname' => '']);
        $this->tank(2, ['netto_size_liter' => 2147483647]);
        $this->tank(3);
        $this->property(3, 63, 'kein Abschäumer');
        $this->property(3, 61, str_repeat('x', 150));
        $this->tank(4, ['updated_at' => '0000-00-00 00:00:00']);

        $this->artisan('legacy:import-aquariums')->assertSuccessful();

        $this->assertNull($this->imported(1)->net_volume);
        $this->assertSame('Aquarium 1', $this->imported(1)->name);
        $this->assertNull($this->imported(2)->net_volume);
        $this->assertFalse($this->imported(3)->skimmer);
        $this->assertNull($this->imported(3)->skimmer_model);
        $this->assertSame(100, mb_strlen($this->imported(3)->dimensions));
        $this->assertStringEndsWith('…', $this->imported(3)->dimensions);
        $this->assertSame('2018-03-01 10:00:00', $this->imported(4)->updated_at->toDateTimeString());
    }

    public function test_skips_tanks_of_accounts_that_were_not_imported(): void
    {
        $this->tank(1);
        $this->tank(2, ['users_id' => 999]);

        $this->artisan('legacy:import-aquariums')->assertSuccessful();

        $this->assertSame(1, Aquarium::count());
        $this->assertNotNull($this->imported(1));
    }

    public function test_links_each_tank_to_the_osmosis_source_of_its_latest_osmosis_analysis(): void
    {
        $this->tank(1, ['tankname' => 'Riff']);
        $this->tank(2, ['tankname' => 'Osmose alt']);
        $this->tank(3, ['tankname' => 'Osmose neu']);
        $this->tank(4, ['tankname' => 'Umgewidmet']);
        $first = $this->analysis(1, 1);
        $this->analysis(2, 3, $first);
        $second = $this->analysis(1, 1);
        $this->analysis(3, 3, $second);

        // Neuere Osmose-Analyse aus Becken 4, das inzwischen ein Meerwasserbecken ist.
        $third = $this->analysis(1, 1);
        $this->analysis(4, 3, $third);
        $this->analysis(4, 1);

        $this->artisan('legacy:import-aquariums')->assertSuccessful();

        $this->assertSame(1, AquariumLink::count());
        $link = AquariumLink::first();
        $this->assertSame($this->imported(1)->id, $link->aquarium_id);
        $this->assertSame($this->imported(3)->id, $link->linked_aquarium_id);
        $this->assertSame('osmosis_source', $link->type);
    }

    public function test_ignores_osmosis_analyses_of_other_users_and_of_the_same_tank(): void
    {
        $other = User::factory()->create(['legacy_id' => 600]);
        $this->tank(1);
        $this->tank(2, ['users_id' => 600]);
        $this->tank(3);
        $parent = $this->analysis(1, 1);
        $this->analysis(2, 3, $parent);
        $this->analysis(1, 3, $parent);
        $this->analysis(3, 3);

        $this->artisan('legacy:import-aquariums')->assertSuccessful();

        $this->assertSame(0, AquariumLink::count());
        $this->assertSame($other->id, $this->imported(2)->user_id);
    }

    public function test_imports_image_paths(): void
    {
        $this->tank(1);
        $this->tank(2, ['users_id' => 999]);
        DB::connection('legacy')->table('pictures')->insert([
            ['id' => 10, 'tanks_id' => 1, 'type' => 'profile', 'path' => 'usercontent/tanks/1/public/a_1500.jpg', 'thumbnailpath' => 'usercontent/tanks/1/public/a_200.jpg', 'created_at' => '2019-01-01 12:00:00', 'updated_at' => '0000-00-00 00:00:00'],
            ['id' => 11, 'tanks_id' => 1, 'type' => 'images', 'path' => 'usercontent/tanks/1/public/b_1500.jpg', 'thumbnailpath' => null, 'created_at' => '2019-01-02 12:00:00', 'updated_at' => '2019-01-02 12:00:00'],
            ['id' => 12, 'tanks_id' => 2, 'type' => 'header', 'path' => 'usercontent/tanks/2/public/c_1500.jpg', 'thumbnailpath' => null, 'created_at' => '2019-01-03 12:00:00', 'updated_at' => '2019-01-03 12:00:00'],
        ]);

        $this->artisan('legacy:import-aquariums')->assertSuccessful();

        $images = $this->imported(1)->images()->orderBy('legacy_id')->get();
        $this->assertSame(['profile', 'gallery'], $images->pluck('type')->all());
        $this->assertSame('usercontent/tanks/1/public/a_1500.jpg', $images[0]->path);
        $this->assertSame('usercontent/tanks/1/public/a_200.jpg', $images[0]->thumbnail_path);
        $this->assertSame('2019-01-01 12:00:00', $images[0]->updated_at->toDateTimeString());
        $this->assertSame(2, AquariumImage::count());
    }

    public function test_is_repeatable_and_keeps_ids(): void
    {
        $this->tank(1, ['tankname' => 'Alt']);
        $this->tank(2, ['tankname' => 'Osmose']);
        $parent = $this->analysis(1, 1);
        $this->analysis(2, 3, $parent);
        DB::connection('legacy')->table('pictures')->insert(['id' => 10, 'tanks_id' => 1, 'type' => 'profile', 'path' => 'p.jpg', 'created_at' => '2019-01-01 12:00:00']);

        $this->artisan('legacy:import-aquariums')->assertSuccessful();
        $id = $this->imported(1)->id;

        DB::connection('legacy')->table('tanks')->where('id', 1)->update(['tankname' => 'Neu']);
        $this->artisan('legacy:import-aquariums')->assertSuccessful();

        $this->assertSame(2, Aquarium::count());
        $this->assertSame($id, $this->imported(1)->id);
        $this->assertSame('Neu', $this->imported(1)->name);
        $this->assertSame(1, AquariumLink::count());
        $this->assertSame(1, AquariumImage::count());
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->tank(1);
        $this->tank(2, ['tankname' => 'Osmose']);
        $parent = $this->analysis(1, 1);
        $this->analysis(2, 3, $parent);

        $this->artisan('legacy:import-aquariums', ['--dry-run' => true])
            ->expectsOutputToContain('Probelauf')
            ->assertSuccessful();

        $this->assertSame(0, Aquarium::count());
        $this->assertSame(0, AquariumLink::count());
    }
}
