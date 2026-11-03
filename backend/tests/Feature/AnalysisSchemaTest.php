<?php

namespace Tests\Feature;

use App\Models\Analysis;
use App\Models\AnalysisMethod;
use App\Models\AnalysisPackage;
use App\Models\Aquarium;
use App\Models\Element;
use App\Models\EvaluationScale;
use App\Models\User;
use App\Models\Voucher;
use Database\Seeders\AnalysisCatalogSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AnalysisSchemaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnalysisCatalogSeeder::class);
    }

    private function package(string $key): AnalysisPackage
    {
        return AnalysisPackage::firstWhere('key', $key);
    }

    /**
     * @return array<string, array{is_evaluated: bool, precision: int|null}>
     */
    private function methodElements(string $method): array
    {
        return AnalysisMethod::firstWhere('key', $method)->elements
            ->mapWithKeys(fn (Element $e) => [$e->key => ['is_evaluated' => (bool) $e->pivot->is_evaluated, 'precision' => $e->pivot->precision]])
            ->all();
    }

    private function analysis(User $user, array $attributes = []): Analysis
    {
        return Analysis::forceCreate($attributes + ['user_id' => $user->id, 'aquarium_name' => 'Riff']);
    }

    public function test_seeder_is_repeatable(): void
    {
        $counts = fn () => collect(['element_groups', 'elements', 'analysis_packages', 'analysis_methods', 'analysis_package_methods', 'analysis_method_elements'])
            ->mapWithKeys(fn (string $table) => [$table => DB::table($table)->count()])->all();
        $before = $counts();

        $this->seed(AnalysisCatalogSeeder::class);

        $this->assertSame($before, $counts());
        $this->assertSame(['element_groups' => 7, 'elements' => 59, 'analysis_packages' => 3, 'analysis_methods' => 7], array_slice($before, 0, 4));
    }

    public function test_elements_keep_their_legacy_ids_and_groups(): void
    {
        $calcium = Element::firstWhere('key', 'calcium');

        $this->assertSame(46, $calcium->legacy_id);
        $this->assertSame('quantity', $calcium->group->key);
        $this->assertSame(['de' => 'Calcium', 'en' => 'Calcium'], $calcium->name);
        $this->assertTrue(Element::firstWhere('key', 'ratio-mg-ca')->is_calculated);
        $this->assertFalse(Element::firstWhere('key', 'nitrate')->group->in_quality_index);
    }

    public function test_methods_list_their_elements(): void
    {
        $seawater = $this->methodElements('meerwasser');
        $this->assertArrayHasKey('calcium', $seawater);
        $this->assertArrayNotHasKey('rubidium', $seawater);

        $basic = $this->methodElements('meerwasser-basis');
        $this->assertFalse($basic['kh']['is_evaluated']);
        $this->assertTrue($basic['calcium']['is_evaluated']);

        $ms = $this->methodElements('meerwasser-icp-ms');
        $this->assertSame(3, $ms['copper']['precision']);
        $this->assertNull($ms['calcium']['precision']);
        $this->assertArrayHasKey('rubidium', $ms);

        $osmosis = $this->methodElements('osmose');
        $this->assertArrayNotHasKey('calcium', $osmosis);
        $this->assertArrayHasKey('copper', $osmosis);

        $this->assertArrayNotHasKey('iodine', $this->methodElements('suesswasser-icp-ms'));
        $this->assertArrayNotHasKey('kh', $this->methodElements('meersalz'));
    }

    public function test_package_and_water_type_determine_the_method(): void
    {
        $this->assertSame('meerwasser', $this->package('icp-oes')->methodFor('Meerwasser')->key);
        $this->assertSame('meerwasser-basis', $this->package('icp-basic')->methodFor('Meerwasser')->key);
        $this->assertSame('meerwasser-icp-ms', $this->package('icp-ms')->methodFor('Meerwasser')->key);
        $this->assertSame('osmose', $this->package('icp-ms')->methodFor('Osmosewasser')->key);
        $this->assertNull($this->package('icp-basic')->methodFor('Osmosewasser'));
        $this->assertNull($this->package('icp-oes')->methodFor('Aquakultur'));
        $this->assertFalse($this->package('icp-basic')->includes_osmosis);
    }

    public function test_built_in_evaluation_scales_exist(): void
    {
        $this->assertSame(['ati-standard', 'nyos', 'fauna-marin'], EvaluationScale::orderBy('sort_order')->pluck('id')->all());
        $this->assertSame(EvaluationScale::DEFAULT, Aquarium::factory()->create()->fresh()->evaluation_scale_id);
    }

    public function test_a_voucher_can_only_be_redeemed_once(): void
    {
        $user = User::factory()->create();
        $voucher = Voucher::create(['code' => 'ABCD-EFGH-JKLM-NPQR', 'package_id' => $this->package('icp-oes')->id]);
        $this->analysis($user, ['voucher_id' => $voucher->id]);

        $this->expectException(QueryException::class);
        $this->analysis($user, ['voucher_id' => $voucher->id]);
    }

    public function test_reports_survive_deleting_the_aquarium(): void
    {
        $aquarium = Aquarium::factory()->create();
        $analysis = $this->analysis($aquarium->user, ['aquarium_id' => $aquarium->id]);

        $aquarium->delete();

        $this->assertNull($analysis->fresh()->aquarium_id);
        $this->assertSame('Riff', $analysis->fresh()->aquarium_name);
    }

    public function test_deleting_an_analysis_removes_its_samples_and_results(): void
    {
        $user = User::factory()->create();
        $parent = $this->analysis($user);
        $child = $this->analysis($user, ['parent_id' => $parent->id]);
        DB::table('analysis_results')->insert(['analysis_id' => $child->id, 'element_id' => Element::firstWhere('key', 'copper')->id, 'value' => 0.4, 'band' => 5]);

        $parent->delete();

        $this->assertSame(0, Analysis::count());
        $this->assertSame(0, DB::table('analysis_results')->count());
    }

    public function test_deleting_a_user_removes_analyses_and_own_scales(): void
    {
        $user = User::factory()->create();
        $this->analysis($user);
        EvaluationScale::create(['id' => 'eigen-1', 'user_id' => $user->id, 'name' => ['de' => 'Meine Werte']]);

        $user->delete();

        $this->assertSame(0, Analysis::count());
        $this->assertNull(EvaluationScale::find('eigen-1'));
        $this->assertNotNull(EvaluationScale::find(EvaluationScale::DEFAULT));
    }
}
