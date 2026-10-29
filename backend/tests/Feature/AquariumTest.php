<?php

namespace Tests\Feature;

use App\Models\Aquarium;
use App\Models\AquariumLink;
use App\Models\User;
use Database\Seeders\DemoAquariumSeeder;
use Database\Seeders\DemoUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AquariumTest extends TestCase
{
    use RefreshDatabase;

    private const AQUARIUM_SHAPE = [
        'id', 'ownerId', 'name', 'water_type', 'net_volume', 'aquarium_type', 'dimensions', 'target_mode',
        'stocking_density', 'lighting_type', 'supply_system', 'supply_mode', 'supply_line', 'supply_bottles',
        'supply_product', 'sump', 'refugium', 'skimmer', 'skimmer_model', 'notes', 'image_theme', 'image',
        'water_details', 'links', 'evaluation_scale_id', 'createdAt', 'updatedAt',
    ];

    private function actingWithToken(User $user): static
    {
        return $this->withToken($user->createToken('web')->plainTextToken);
    }

    public function test_index_lists_only_own_aquariums_oldest_first(): void
    {
        $user = User::factory()->create();
        $first = Aquarium::factory()->for($user)->create(['created_at' => now()->subDay()]);
        $second = Aquarium::factory()->for($user)->create();
        Aquarium::factory()->create();

        $this->actingWithToken($user)->getJson('/api/aquariums')
            ->assertOk()
            ->assertJsonCount(2, 'aquariums')
            ->assertJsonStructure(['aquariums' => ['*' => self::AQUARIUM_SHAPE]])
            ->assertJsonPath('aquariums.0.id', $first->id)
            ->assertJsonPath('aquariums.1.id', $second->id);
    }

    public function test_store_creates_an_aquarium_in_the_frontend_shape(): void
    {
        $user = User::factory()->create();

        $response = $this->actingWithToken($user)->postJson('/api/aquariums', [
            'name' => 'Wohnzimmer Reef',
            'water_type' => 'Meerwasser',
            'net_volume' => 420,
            'aquarium_type' => 'SPS',
            'dimensions' => '',
            'target_mode' => '',
            'skimmer' => true,
            'supply_bottles' => 4,
            'image_theme' => 'reef-sps',
            'image' => 'data:image/jpeg;base64,AAAA',
            'water_details' => ['po4_adsorber' => true, 'flow_total_lh' => 12000],
            'ownerId' => 'fremd',
            'id' => 'manipuliert',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['aquarium' => self::AQUARIUM_SHAPE])
            ->assertJsonPath('aquarium.ownerId', $user->id)
            ->assertJsonPath('aquarium.name', 'Wohnzimmer Reef')
            ->assertJsonPath('aquarium.net_volume', 420)
            ->assertJsonPath('aquarium.dimensions', '')
            ->assertJsonPath('aquarium.target_mode', 'ati')
            ->assertJsonPath('aquarium.evaluation_scale_id', 'ati-standard')
            ->assertJsonPath('aquarium.skimmer', true)
            ->assertJsonPath('aquarium.sump', false)
            ->assertJsonPath('aquarium.supply_bottles', 4)
            ->assertJsonPath('aquarium.water_details.flow_total_lh', 12000)
            ->assertJsonPath('aquarium.image', 'data:image/jpeg;base64,AAAA');

        $this->assertNotSame('manipuliert', $response->json('aquarium.id'));
    }

    public function test_empty_water_details_and_links_are_returned_as_objects(): void
    {
        $user = User::factory()->create();

        $content = $this->actingWithToken($user)->postJson('/api/aquariums', ['name' => 'Becken', 'water_type' => 'Meerwasser', 'water_details' => []])
            ->assertCreated()
            ->getContent();

        $this->assertStringContainsString('"water_details":{}', $content);
        $this->assertStringContainsString('"links":{}', $content);
    }

    public function test_store_validates_with_german_messages(): void
    {
        $user = User::factory()->create();

        $this->actingWithToken($user)->postJson('/api/aquariums', ['water_type' => 'Meerwasser'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Bitte geben Sie einen Namen für das Aquarium an.');

        $this->actingWithToken($user)->postJson('/api/aquariums', ['name' => 'Becken', 'water_type' => 'Brackwasser'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Diese Wasserart wird nicht unterstützt.');

        $this->actingWithToken($user)->postJson('/api/aquariums', ['name' => 'Becken', 'water_type' => 'Meerwasser', 'image' => 'https://example.com/a.jpg'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Ungültiges Bild.');
    }

    public function test_osmosis_source_must_be_an_own_osmosis_profile(): void
    {
        $user = User::factory()->create();
        $ownSource = Aquarium::factory()->osmosis()->for($user)->create();
        $ownTank = Aquarium::factory()->for($user)->create();
        $foreignSource = Aquarium::factory()->osmosis()->create();

        $this->actingWithToken($user)->postJson('/api/aquariums', ['name' => 'Becken', 'water_type' => 'Meerwasser', 'links' => ['osmosis_source' => $ownSource->id]])
            ->assertCreated()
            ->assertJsonPath('aquarium.links.osmosis_source', $ownSource->id);

        foreach ([$foreignSource->id, $ownTank->id, 'gibt-es-nicht'] as $invalid) {
            $this->actingWithToken($user)->postJson('/api/aquariums', ['name' => 'Becken', 'water_type' => 'Meerwasser', 'links' => ['osmosis_source' => $invalid]])
                ->assertUnprocessable()
                ->assertJsonPath('error', 'Diese Osmosequelle wurde nicht gefunden.');
        }
    }

    public function test_unknown_link_types_are_rejected(): void
    {
        $user = User::factory()->create();
        $tank = Aquarium::factory()->for($user)->create();

        $this->actingWithToken($user)->postJson('/api/aquariums', ['name' => 'Becken', 'water_type' => 'Meerwasser', 'links' => ['frag_tank' => $tank->id]])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Diese Verknüpfung wird nicht unterstützt.');
    }

    public function test_links_can_be_changed_removed_or_left_untouched(): void
    {
        $user = User::factory()->create();
        $first = Aquarium::factory()->osmosis()->for($user)->create();
        $second = Aquarium::factory()->osmosis()->for($user)->create();
        $tank = Aquarium::factory()->for($user)->create();
        $tank->syncLinks(['osmosis_source' => $first->id]);
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)->patchJson("/api/aquariums/{$tank->id}", ['name' => 'Ohne links-Feld'])
            ->assertJsonPath('aquarium.links.osmosis_source', $first->id);

        $this->withToken($token)->patchJson("/api/aquariums/{$tank->id}", ['links' => ['osmosis_source' => $second->id]])
            ->assertJsonPath('aquarium.links.osmosis_source', $second->id);
        $this->assertSame(1, $tank->links()->count());

        $this->withToken($token)->patchJson("/api/aquariums/{$tank->id}", ['links' => ['osmosis_source' => null]])
            ->assertJsonPath('aquarium.links', []);
        $this->assertSame(0, $tank->links()->count());
    }

    public function test_update_changes_only_sent_fields(): void
    {
        $user = User::factory()->create();
        $aquarium = Aquarium::factory()->for($user)->create(['name' => 'Alt', 'net_volume' => 300, 'notes' => 'Notiz']);

        $this->actingWithToken($user)->patchJson("/api/aquariums/{$aquarium->id}", ['name' => 'Neu', 'notes' => ''])
            ->assertOk()
            ->assertJsonPath('aquarium.name', 'Neu')
            ->assertJsonPath('aquarium.net_volume', 300)
            ->assertJsonPath('aquarium.notes', '');
    }

    public function test_an_aquarium_cannot_be_linked_to_itself(): void
    {
        $user = User::factory()->create();
        $source = Aquarium::factory()->osmosis()->for($user)->create();

        $this->actingWithToken($user)->patchJson("/api/aquariums/{$source->id}", ['links' => ['osmosis_source' => $source->id]])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Ein Aquarium kann nicht mit sich selbst verknüpft werden.');
    }

    public function test_foreign_aquariums_are_not_found(): void
    {
        $user = User::factory()->create();
        $foreign = Aquarium::factory()->create();

        $this->actingWithToken($user)->getJson("/api/aquariums/{$foreign->id}")
            ->assertNotFound()
            ->assertJsonPath('error', 'Aquarium nicht gefunden.');
        $this->actingWithToken($user)->patchJson("/api/aquariums/{$foreign->id}", ['name' => 'Gekapert'])->assertNotFound();
        $this->actingWithToken($user)->deleteJson("/api/aquariums/{$foreign->id}")->assertNotFound();

        $this->assertNotSame('Gekapert', $foreign->fresh()->name);
    }

    public function test_destroy_deletes_and_removes_links_in_both_directions(): void
    {
        $user = User::factory()->create();
        $source = Aquarium::factory()->osmosis()->for($user)->create();
        $tank = Aquarium::factory()->for($user)->create();
        $tank->syncLinks(['osmosis_source' => $source->id]);

        $this->actingWithToken($user)->deleteJson("/api/aquariums/{$source->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Aquarium gelöscht.');

        $this->assertModelMissing($source);
        $this->assertModelExists($tank);
        $this->assertSame(0, AquariumLink::count());

        $other = Aquarium::factory()->osmosis()->for($user)->create();
        $tank->syncLinks(['osmosis_source' => $other->id]);
        $this->actingWithToken($user)->deleteJson("/api/aquariums/{$tank->id}")->assertOk();
        $this->assertModelExists($other);
        $this->assertSame(0, AquariumLink::count());
    }

    public function test_aquarium_endpoints_require_a_token(): void
    {
        $this->getJson('/api/aquariums')->assertUnauthorized();
        $this->postJson('/api/aquariums', ['name' => 'x'])->assertUnauthorized();
    }

    public function test_demo_seeder_gives_the_existing_customer_the_frontend_demo_tanks(): void
    {
        $this->seed(DemoUserSeeder::class);
        $this->seed(DemoAquariumSeeder::class);
        $this->seed(DemoAquariumSeeder::class);

        $kunde = User::firstWhere('username', 'kunde');
        $this->assertSame(14, $kunde->aquariums()->count());
        $this->assertSame(0, User::firstWhere('username', 'demo')->aquariums()->count());

        $this->actingWithToken($kunde)->getJson('/api/aquariums/demo-aquarium-neu')
            ->assertOk()
            ->assertJsonPath('aquarium.net_volume', 1400)
            ->assertJsonPath('aquarium.links.osmosis_source', 'demo-aquarium-neu-osmose');
        $this->assertSame(5, AquariumLink::count());

        $this->actingWithToken($kunde)->getJson('/api/aquariums')
            ->assertJsonPath('aquariums.0.id', 'demo-aquarium-neu-osmose')
            ->assertJsonPath('aquariums.13.id', 'demo-nyos-opus-g2-440');
    }
}
