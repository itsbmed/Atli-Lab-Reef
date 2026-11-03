<?php

namespace Tests\Feature;

use App\Models\Analysis;
use App\Models\AnalysisMethod;
use App\Models\AnalysisPackage;
use App\Models\Aquarium;
use App\Models\Element;
use App\Models\ElementGroup;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use Database\Seeders\AnalysisCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AnalysisTest extends TestCase
{
    use RefreshDatabase;

    private const ANALYSIS_SHAPE = [
        'id', 'ownerId', 'parentId', 'aquariumId', 'aquariumName', 'reportNumber', 'barcode', 'package', 'packageName',
        'isFree', 'method', 'methodName', 'waterType', 'reason', 'addons', 'status', 'evaluationScaleId', 'language',
        'comment', 'labAdvice', 'score', 'issueCount', 'createdAt', 'receivedAt', 'completedAt', 'updatedAt',
    ];

    private User $user;

    private Aquarium $reef;

    private Aquarium $osmosis;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnalysisCatalogSeeder::class);
        $this->user = User::factory()->create(['language' => 'en']);
        $this->reef = Aquarium::factory()->for($this->user)->create(['name' => 'Wohnzimmer Reef', 'evaluation_scale_id' => 'nyos']);
        $this->osmosis = Aquarium::factory()->osmosis()->for($this->user)->create(['name' => 'Osmose']);
    }

    private function actingWithToken(User $user): static
    {
        return $this->withToken($user->createToken('web')->plainTextToken);
    }

    private function voucher(string $code = 'ABCD-EFGH-JKLM-NPQR', string $package = 'icp-oes', bool $free = false): Voucher
    {
        return Voucher::create(['code' => $code, 'package_id' => AnalysisPackage::firstWhere('key', $package)->id, 'is_free' => $free]);
    }

    private function analysis(array $attributes = []): Analysis
    {
        return Analysis::forceCreate($attributes + [
            'user_id' => $this->user->id, 'aquarium_id' => $this->reef->id, 'aquarium_name' => 'Wohnzimmer Reef',
            'method_id' => AnalysisMethod::firstWhere('key', 'meerwasser')->id,
        ]);
    }

    private function measurement(Analysis $analysis, string $element, ?float $value, ?int $band): void
    {
        DB::table('analysis_results')->insert([
            'analysis_id' => $analysis->id, 'element_id' => Element::firstWhere('key', $element)->id,
            'value' => $value, 'band' => $band, 'target' => 420, 'min' => 395, 'max' => 465,
        ]);
    }

    private function activate(array $payload): TestResponse
    {
        return $this->actingWithToken($this->user)->postJson('/api/analyses', $payload + ['aquarium_id' => $this->reef->id]);
    }

    public function test_index_lists_own_main_analyses_newest_first_with_issue_count(): void
    {
        $old = $this->analysis(['created_at' => now()->subMonth(), 'status' => 'completed', 'quality_index' => 84]);
        $this->measurement($old, 'calcium', 318.7, 2);
        $this->measurement($old, 'copper', 0.4, 5);
        $this->measurement($old, 'rubidium', 9.9, 8);   // gehört nicht zur Methode Meerwasser
        $voucher = $this->voucher();
        $new = $this->analysis(['voucher_id' => $voucher->id, 'package_id' => $voucher->package_id]);
        $this->analysis(['parent_id' => $new->id, 'aquarium_id' => $this->osmosis->id]);
        Analysis::forceCreate(['user_id' => User::factory()->create()->id, 'aquarium_name' => 'Fremd']);

        $this->actingWithToken($this->user)->getJson('/api/analyses')
            ->assertOk()
            ->assertJsonCount(2, 'analyses')
            ->assertJsonStructure(['analyses' => ['*' => self::ANALYSIS_SHAPE]])
            ->assertJsonMissingPath('analyses.0.parameters')
            ->assertJsonPath('analyses.0.id', $new->id)
            ->assertJsonPath('analyses.0.barcode', 'ABCD-EFGH-JKLM-NPQR')
            ->assertJsonPath('analyses.0.package', 'icp-oes')
            ->assertJsonPath('analyses.0.status', 'registered')
            ->assertJsonPath('analyses.1.id', $old->id)
            ->assertJsonPath('analyses.1.score', 84)
            ->assertJsonPath('analyses.1.issueCount', 1)
            ->assertJsonPath('analyses.1.method', 'meerwasser')
            ->assertJsonPath('analyses.1.waterType', 'Meerwasser');
    }

    public function test_index_includes_details_on_request(): void
    {
        $analysis = $this->analysis(['status' => 'completed']);
        $this->measurement($analysis, 'calcium', 318.7, 2);
        $sample = $this->analysis(['parent_id' => $analysis->id, 'aquarium_id' => $this->osmosis->id, 'method_id' => AnalysisMethod::firstWhere('key', 'osmose')->id]);
        $this->measurement($sample, 'copper', 5.42, 8);

        $this->actingWithToken($this->user)->getJson('/api/analyses?include=details')
            ->assertOk()
            ->assertJsonCount(1, 'analyses')
            ->assertJsonPath('analyses.0.issueCount', 1)
            ->assertJsonPath('analyses.0.parameters.0.key', 'calcium')
            ->assertJsonPath('analyses.0.osmoseAquariumId', $this->osmosis->id)
            ->assertJsonPath('analyses.0.samples.0.parameters.0.key', 'copper');
    }

    public function test_show_returns_parameters_dosings_group_scores_and_samples(): void
    {
        $analysis = $this->analysis(['status' => 'completed', 'legacy_id' => 394463, 'lab_advice' => 'KH stabilisieren.']);
        $this->measurement($analysis, 'copper', null, null);
        $this->measurement($analysis, 'calcium', 318.7, 2);
        $this->measurement($analysis, 'rubidium', 9.9, 8);
        $product = Product::create(['key' => 'legacy-2', 'name' => ['de' => 'Calcium (Ca)'], 'unit' => 'ml/L']);
        DB::table('analysis_dosings')->insert([
            'analysis_id' => $analysis->id, 'element_id' => Element::firstWhere('key', 'calcium')->id,
            'product_id' => $product->id, 'amount_per_day' => 0.08, 'days' => 6, 'position' => 1,
        ]);
        DB::table('analysis_group_scores')->insert(['analysis_id' => $analysis->id, 'element_group_id' => ElementGroup::firstWhere('key', 'quantity')->id, 'score' => 75]);
        $sample = $this->analysis(['parent_id' => $analysis->id, 'aquarium_id' => $this->osmosis->id, 'method_id' => AnalysisMethod::firstWhere('key', 'osmose')->id]);
        $this->measurement($sample, 'copper', 5.42, 8);
        $this->measurement($sample, 'calcium', 1.0, 5); // bei Osmose ausgeblendet

        $this->actingWithToken($this->user)->getJson("/api/analyses/{$analysis->id}")
            ->assertOk()
            ->assertJsonPath('analysis.reportNumber', '394463')
            ->assertJsonPath('analysis.labAdvice', 'KH stabilisieren.')
            ->assertJsonPath('analysis.issueCount', 1)
            ->assertJsonPath('analysis.osmoseAquariumId', $this->osmosis->id)
            ->assertJsonPath('analysis.groupScores', ['quantity' => 75])
            ->assertJsonCount(2, 'analysis.parameters')
            ->assertJsonPath('analysis.parameters.0.key', 'calcium')
            ->assertJsonPath('analysis.parameters.0.band', 2)
            ->assertJsonPath('analysis.parameters.0.unit', 'mg/l')
            ->assertJsonPath('analysis.parameters.0.dosings.0', [
                'product' => 'legacy-2', 'productName' => ['de' => 'Calcium (Ca)'], 'unit' => 'ml/L', 'amountPerDay' => 0.08, 'days' => 6,
            ])
            ->assertJsonPath('analysis.parameters.1.key', 'copper')
            ->assertJsonPath('analysis.parameters.1.value', null)
            ->assertJsonCount(1, 'analysis.samples')
            ->assertJsonPath('analysis.samples.0.method', 'osmose')
            ->assertJsonPath('analysis.samples.0.waterType', 'Osmosewasser')
            ->assertJsonCount(1, 'analysis.samples.0.parameters')
            ->assertJsonPath('analysis.samples.0.parameters.0.key', 'copper');
    }

    public function test_show_marks_elements_that_are_not_evaluated_and_ms_precision(): void
    {
        $analysis = $this->analysis(['method_id' => AnalysisMethod::firstWhere('key', 'meerwasser-basis')->id]);
        $this->measurement($analysis, 'kh', 9.5, 6);
        $ms = $this->analysis(['method_id' => AnalysisMethod::firstWhere('key', 'meerwasser-icp-ms')->id]);
        $this->measurement($ms, 'copper', 0.412, 5);

        $this->actingWithToken($this->user)->getJson("/api/analyses/{$analysis->id}")
            ->assertJsonPath('analysis.parameters.0.isEvaluated', false)
            ->assertJsonPath('analysis.issueCount', 0);
        $this->actingWithToken($this->user)->getJson("/api/analyses/{$ms->id}")
            ->assertJsonPath('analysis.parameters.0.precision', 3);
    }

    public function test_foreign_analyses_are_not_found(): void
    {
        $foreign = Analysis::forceCreate(['user_id' => User::factory()->create()->id, 'aquarium_name' => 'Fremd']);

        $this->actingWithToken($this->user)->getJson("/api/analyses/{$foreign->id}")->assertNotFound();
    }

    public function test_store_activates_a_barcode(): void
    {
        $voucher = $this->voucher('ABCD-EFGH-JKLM-NPQR', 'icp-ms');

        $response = $this->activate([
            'barcode' => ' abcd-efgh-jklm-npqr ', 'reason' => 'algen', 'addons' => ['sak254', 'rush'],
            'comment' => 'Grüne Fadenalgen', 'osmosis_aquarium_id' => $this->osmosis->id,
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['analysis' => self::ANALYSIS_SHAPE])
            ->assertJsonPath('analysis.ownerId', $this->user->id)
            ->assertJsonPath('analysis.aquariumName', 'Wohnzimmer Reef')
            ->assertJsonPath('analysis.barcode', 'ABCD-EFGH-JKLM-NPQR')
            ->assertJsonPath('analysis.package', 'icp-ms')
            ->assertJsonPath('analysis.method', 'meerwasser-icp-ms')
            ->assertJsonPath('analysis.status', 'registered')
            ->assertJsonPath('analysis.reason', 'algen')
            ->assertJsonPath('analysis.addons', ['rush', 'sak254'])
            ->assertJsonPath('analysis.comment', 'Grüne Fadenalgen')
            ->assertJsonPath('analysis.evaluationScaleId', 'nyos')
            ->assertJsonPath('analysis.language', 'en')
            ->assertJsonPath('analysis.osmoseAquariumId', $this->osmosis->id)
            ->assertJsonPath('analysis.samples.0.method', 'osmose')
            ->assertJsonPath('analysis.samples.0.package', 'icp-ms')
            ->assertJsonPath('analysis.samples.0.barcode', null);

        $this->assertSame($voucher->id, Analysis::find($response->json('analysis.id'))->voucher_id);
        $this->assertSame(2, Analysis::count());
    }

    public function test_store_derives_the_method_from_package_and_water_type(): void
    {
        $this->activate(['barcode' => $this->voucher('BASI-CBAS-ICBA-SIC1', 'icp-basic', true)->code])
            ->assertCreated()
            ->assertJsonPath('analysis.method', 'meerwasser-basis')
            ->assertJsonPath('analysis.isFree', true);

        $this->activate(['barcode' => $this->voucher('OSMO-SEOS-MOSE-OSMO')->code, 'aquarium_id' => $this->osmosis->id])
            ->assertCreated()
            ->assertJsonPath('analysis.method', 'osmose');
    }

    public function test_store_rejects_unknown_and_used_barcodes(): void
    {
        $this->activate(['barcode' => 'XXXX-XXXX-XXXX-XXXX'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['barcode' => 'Dieser Barcode ist ungültig.']);

        $voucher = $this->voucher();
        $this->activate(['barcode' => $voucher->code])->assertCreated();
        $this->activate(['barcode' => $voucher->code])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['barcode' => 'Dieser Barcode wurde bereits verwendet.']);
    }

    public function test_store_checks_that_package_and_aquarium_fit(): void
    {
        $basic = $this->voucher('BASI-CBAS-ICBA-SIC1', 'icp-basic');
        $aquaculture = Aquarium::factory()->for($this->user)->create(['water_type' => 'Aquakultur']);

        $this->activate(['barcode' => $basic->code, 'aquarium_id' => $this->osmosis->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['aquarium_id' => 'Das Paket ICP-Basic passt nicht zu einem Becken mit Osmosewasser.']);
        $this->activate(['barcode' => $basic->code, 'osmosis_aquarium_id' => $this->osmosis->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['osmosis_aquarium_id' => 'Das Paket ICP-Basic enthält keine Osmose-Auswertung.']);
        $this->activate(['barcode' => $this->voucher()->code, 'aquarium_id' => $aquaculture->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('aquarium_id');

        $this->assertSame(0, Analysis::count());
    }

    public function test_store_only_accepts_own_aquariums_and_known_options(): void
    {
        $foreign = Aquarium::factory()->create();

        $this->activate(['barcode' => $this->voucher()->code, 'aquarium_id' => $foreign->id, 'reason' => 'langeweile', 'addons' => ['gratis'], 'osmosis_aquarium_id' => $this->reef->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['aquarium_id', 'reason', 'addons.0', 'osmosis_aquarium_id']);
    }

    public function test_voucher_lookup_shows_package_and_usage(): void
    {
        $voucher = $this->voucher('FREE-ICPF-REEI-CP01', 'icp-basic', true);

        $this->actingWithToken($this->user)->getJson('/api/vouchers/free-icpf-reei-cp01')
            ->assertOk()
            ->assertExactJson(['voucher' => [
                'code' => 'FREE-ICPF-REEI-CP01', 'package' => 'icp-basic', 'packageName' => ['de' => 'ICP-Basic', 'en' => 'ICP-Basic'],
                'includesOsmosis' => false, 'isFree' => true, 'isUsed' => false,
            ]]);

        $this->analysis(['voucher_id' => $voucher->id]);
        $this->actingWithToken($this->user)->getJson("/api/vouchers/{$voucher->code}")->assertJsonPath('voucher.isUsed', true);
        $this->actingWithToken($this->user)->getJson('/api/vouchers/GIBT-ESNI-CHT0-0000')->assertNotFound();
    }

    public function test_analysis_endpoints_require_a_token(): void
    {
        $this->getJson('/api/analyses')->assertUnauthorized();
        $this->postJson('/api/analyses')->assertUnauthorized();
        $this->getJson('/api/vouchers/ABCD')->assertUnauthorized();
    }
}
