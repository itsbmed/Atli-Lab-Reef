<?php

namespace Tests\Feature\Legacy;

use App\Models\Analysis;
use App\Models\Aquarium;
use App\Models\AquariumImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AnonymizeLegacyDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_anonymizes_imported_accounts(): void
    {
        $user = User::factory()->create([
            'legacy_id' => 4711, 'username' => 'max.mueller', 'name' => 'Max Müller', 'email' => 'max@example.com',
            'newsletter' => true, 'advisor_id' => 'haendler-1',
        ]);
        $user->createToken('alt');

        $this->artisan('legacy:anonymize', ['--force' => true, '--password' => 'geheim123'])->assertSuccessful();

        $user->refresh();
        $this->assertSame(4711, $user->legacy_id);
        $this->assertSame('testkunde-4711', $user->username);
        $this->assertSame('Testkunde 4711', $user->name);
        $this->assertSame('testkunde-4711@example.test', $user->email);
        $this->assertTrue(Hash::check('geheim123', $user->password));
        $this->assertFalse($user->newsletter);
        $this->assertFalse($user->analysis_reminder);
        $this->assertNull($user->advisor_id);
        $this->assertSame(0, $user->tokens()->count());

        $this->postJson('/api/auth/login', ['login' => 'testkunde-4711', 'password' => 'geheim123'])->assertOk();
    }

    public function test_anonymizes_the_aquariums_of_imported_accounts(): void
    {
        $user = User::factory()->create(['legacy_id' => 1]);
        $reef = Aquarium::factory()->for($user)->create([
            'name' => 'Riff von Max', 'notes' => 'Max Müller, Hauptstraße 1', 'image' => 'data:image/jpeg;base64,AAAA',
            'skimmer' => true, 'skimmer_model' => 'Bubble King', 'created_at' => '2020-01-01',
        ]);
        $second = Aquarium::factory()->for($user)->create(['name' => 'Nano', 'created_at' => '2021-01-01']);
        $osmosis = Aquarium::factory()->osmosis()->for($user)->create(['name' => 'Osmose Keller']);
        $reef->images()->create(['type' => 'profile', 'path' => 'usercontent/tanks/1/max.jpg']);

        $this->artisan('legacy:anonymize', ['--force' => true])->assertSuccessful();

        $reef->refresh();
        $this->assertSame('Meerwasser 1', $reef->name);
        $this->assertNull($reef->notes);
        $this->assertNull($reef->image);
        $this->assertSame('Bubble King', $reef->skimmer_model);
        $this->assertSame('Meerwasser 2', $second->fresh()->name);
        $this->assertSame('Osmosewasser 1', $osmosis->fresh()->name);
        $this->assertSame(0, AquariumImage::count());
    }

    public function test_anonymizes_the_analyses_of_imported_accounts(): void
    {
        $user = User::factory()->create(['legacy_id' => 1]);
        $reef = Aquarium::factory()->for($user)->create(['name' => 'Riff von Max']);
        $report = Analysis::forceCreate([
            'user_id' => $user->id, 'aquarium_id' => $reef->id, 'aquarium_name' => 'Riff von Max',
            'customer_comment' => 'Gruß, Max', 'lab_advice' => 'Hallo Herr Müller, …', 'share_token' => 'abc123',
        ]);
        $orphan = Analysis::forceCreate(['user_id' => $user->id, 'aquarium_name' => 'Altes Becken von Max']);

        $this->artisan('legacy:anonymize', ['--force' => true])->assertSuccessful();

        $report->refresh();
        $this->assertSame('Meerwasser 1', $report->aquarium_name);
        $this->assertSame('Kommentar des Kunden (anonymisiert).', $report->customer_comment);
        $this->assertSame('Empfehlung des Labors (anonymisiert).', $report->lab_advice);
        $this->assertNull($report->share_token);
        $this->assertSame('Gelöschtes Becken', $orphan->fresh()->aquarium_name);
        $this->assertNull($orphan->fresh()->customer_comment);
    }

    public function test_leaves_accounts_created_in_the_new_system_alone(): void
    {
        $user = User::factory()->create(['username' => 'neu', 'email' => 'neu@example.com']);
        $aquarium = Aquarium::factory()->for($user)->create(['name' => 'Mein Becken']);
        User::factory()->create(['legacy_id' => 2]);

        $this->artisan('legacy:anonymize', ['--force' => true])->assertSuccessful();

        $this->assertSame('neu', $user->fresh()->username);
        $this->assertSame('neu@example.com', $user->fresh()->email);
        $this->assertSame('Mein Becken', $aquarium->fresh()->name);
    }

    public function test_asks_for_confirmation(): void
    {
        User::factory()->create(['legacy_id' => 3, 'username' => 'echt']);

        $this->artisan('legacy:anonymize')
            ->expectsConfirmation('1 übernommene Konten mit ihren Becken und Analysen unwiderruflich anonymisieren?', 'no')
            ->assertFailed();

        $this->assertSame('echt', User::sole()->username);
    }

    public function test_refuses_to_run_in_production(): void
    {
        User::factory()->create(['legacy_id' => 3, 'username' => 'echt']);
        $this->app['env'] = 'production';

        $this->artisan('legacy:anonymize', ['--force' => true])
            ->expectsOutputToContain('In Produktion nicht erlaubt.')
            ->assertFailed();

        $this->assertSame('echt', User::sole()->username);
    }
}
