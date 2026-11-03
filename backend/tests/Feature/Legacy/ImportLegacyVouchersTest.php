<?php

namespace Tests\Feature\Legacy;

use App\Models\Voucher;
use Database\Seeders\AnalysisCatalogSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportLegacyVouchersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnalysisCatalogSeeder::class);
        config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
        DB::purge('legacy');

        // Struktur wie in ati-2025-07-24 (gekürzt auf die gelesenen Spalten).
        Schema::connection('legacy')->create('analysis_vouchers', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('analysis_id')->nullable();
            $table->string('voucher')->nullable();
            $table->unsignedInteger('analysis_type')->default(0);
            $table->integer('analysis_sub_type')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
    }

    private function voucher(int $id, string $code, int $type = 0, array $attributes = []): void
    {
        DB::connection('legacy')->table('analysis_vouchers')->insert($attributes + [
            'id' => $id, 'voucher' => $code, 'analysis_type' => $type, 'created_at' => '2024-10-15 09:00:00',
        ]);
    }

    private function imported(int $legacyId): Voucher
    {
        return Voucher::with('package')->firstWhere('legacy_id', $legacyId);
    }

    public function test_maps_the_voucher_type_to_package_and_free_flag(): void
    {
        $this->voucher(1, 'AAAA-BBBB-CCCC-DDDD', 0);
        $this->voucher(2, 'free-icp-0000-0001', 1, ['analysis_sub_type' => 1000]);
        $this->voucher(3, 'MSMS-MSMS-MSMS-MSMS', 2);

        $this->artisan('legacy:import-vouchers')->assertSuccessful();

        $this->assertSame(['icp-oes', false], [$this->imported(1)->package->key, $this->imported(1)->is_free]);
        $basic = $this->imported(2);
        $this->assertSame(['icp-basic', true, 1000, 'FREE-ICP-0000-0001'], [$basic->package->key, $basic->is_free, $basic->legacy_sub_type, $basic->code]);
        $this->assertSame('icp-ms', $this->imported(3)->package->key);
        $this->assertSame('2024-10-15 09:00:00', $this->imported(1)->created_at->toDateTimeString());
    }

    public function test_keeps_only_the_first_of_duplicate_codes(): void
    {
        $this->voucher(998, 'TIMO-TEST-VOUC-1234');
        $this->voucher(16471, 'TIMO-TEST-VOUC-1234');
        $this->voucher(5, 'KURZ-123-ABCD-EFGH');

        $this->artisan('legacy:import-vouchers')
            ->expectsTable(['', 'Anzahl'], [
                ['ICP-OES', 2],
                ['ICP-Basic (kostenlos)', 0],
                ['ICP-MS', 0],
                ['Übersprungen (doppelter oder leerer Code)', 1],
                ['Übersprungen (unbekannter Typ)', 0],
            ])
            ->assertSuccessful();

        $this->assertSame([5, 998], Voucher::orderBy('legacy_id')->pluck('legacy_id')->all());
    }

    public function test_is_repeatable(): void
    {
        $this->voucher(1, 'AAAA-BBBB-CCCC-DDDD');
        $this->artisan('legacy:import-vouchers')->assertSuccessful();
        $id = $this->imported(1)->id;

        DB::connection('legacy')->table('analysis_vouchers')->where('id', 1)->update(['analysis_type' => 2]);
        $this->artisan('legacy:import-vouchers')->assertSuccessful();

        $this->assertSame(1, Voucher::count());
        $this->assertSame($id, $this->imported(1)->id);
        $this->assertSame('icp-ms', $this->imported(1)->package->key);
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->voucher(1, 'AAAA-BBBB-CCCC-DDDD');

        $this->artisan('legacy:import-vouchers', ['--dry-run' => true])->expectsOutputToContain('Probelauf')->assertSuccessful();

        $this->assertSame(0, Voucher::count());
    }
}
