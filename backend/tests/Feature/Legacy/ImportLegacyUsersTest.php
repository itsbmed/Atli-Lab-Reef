<?php

namespace Tests\Feature\Legacy;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportLegacyUsersTest extends TestCase
{
    use RefreshDatabase;

    private string $hash;

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
        DB::purge('legacy');

        // Struktur wie users in ati-2025-07-24 (gekürzt auf die gelesenen Spalten).
        Schema::connection('legacy')->create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password', 60)->nullable();
            $table->tinyInteger('status')->default(1);
            $table->boolean('confirmed')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        $this->hash = Hash::make('altes-kennwort', ['rounds' => 5]);
    }

    private function legacyUser(array $attributes): void
    {
        DB::connection('legacy')->table('users')->insert($attributes + [
            'name' => 'Max Müller',
            'password' => $this->hash,
            'status' => 1,
            'confirmed' => 1,
            'created_at' => '2019-04-01 10:00:00',
            'updated_at' => '2024-01-01 10:00:00',
        ]);
    }

    public function test_imports_active_users_with_their_password_hash(): void
    {
        $this->legacyUser(['id' => 7, 'email' => 'Max.Mueller@Example.com']);

        $this->artisan('legacy:import-users')->assertSuccessful();

        $user = User::firstWhere('legacy_id', 7);
        $this->assertSame('max.mueller', $user->username);
        $this->assertSame('max.mueller@example.com', $user->email);
        $this->assertSame('Max Müller', $user->name);
        $this->assertSame($this->hash, $user->password);
        $this->assertSame('endnutzer', $user->role->value);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('2019-04-01', $user->created_at->toDateString());

        $this->postJson('/api/auth/login', ['login' => 'MAX.MUELLER@example.com', 'password' => 'altes-kennwort'])
            ->assertOk()
            ->assertJsonPath('user.username', 'max.mueller');
        $this->assertNotSame($this->hash, $user->fresh()->password);
    }

    public function test_replaces_zero_dates_from_the_old_system(): void
    {
        $this->legacyUser(['id' => 9, 'email' => 'alt@example.com', 'created_at' => '0000-00-00 00:00:00', 'updated_at' => '2022-11-16 11:27:48']);

        $this->artisan('legacy:import-users')->assertSuccessful();

        $user = User::firstWhere('legacy_id', 9);
        $this->assertSame('2022-11-16 11:27:48', $user->created_at->toDateTimeString());
        $this->assertSame('2022-11-16 11:27:48', $user->email_verified_at->toDateTimeString());
    }

    public function test_skips_deleted_and_blocked_accounts(): void
    {
        $this->legacyUser(['id' => 1, 'email' => 'aktiv@example.com']);
        $this->legacyUser(['id' => 2, 'email' => 'geloescht@example.com', 'deleted_at' => now()]);
        $this->legacyUser(['id' => 3, 'email' => 'gesperrt@example.com', 'status' => 0]);
        $this->legacyUser(['id' => 4, 'email' => 'status2@example.com', 'status' => 2]);

        $this->artisan('legacy:import-users')->assertSuccessful();

        $this->assertSame([1], User::pluck('legacy_id')->all());
    }

    public function test_generates_unique_usernames_from_the_email(): void
    {
        User::factory()->create(['username' => 'kunde']);
        $this->legacyUser(['id' => 1, 'email' => 'kunde@shop-a.de']);
        $this->legacyUser(['id' => 2, 'email' => 'KUNDE@shop-b.de']);
        $this->legacyUser(['id' => 3, 'email' => 'jürgen+riff@example.com']);
        $this->legacyUser(['id' => 4, 'email' => 'ab@example.com']);
        $this->legacyUser(['id' => 5, 'email' => '._@example.com']);

        $this->artisan('legacy:import-users')->assertSuccessful();

        $this->assertSame(
            [1 => 'kunde2', 2 => 'kunde3', 3 => 'jurgenriff', 4 => 'ab-user', 5 => 'nutzer'],
            User::whereNotNull('legacy_id')->orderBy('legacy_id')->pluck('username', 'legacy_id')->all(),
        );
    }

    public function test_skips_emails_already_used_in_the_new_system(): void
    {
        User::factory()->create(['email' => 'belegt@example.com', 'username' => 'neu']);
        $this->legacyUser(['id' => 1, 'email' => 'Belegt@example.com']);
        $this->legacyUser(['id' => 2, 'email' => 'ohnehash@example.com', 'password' => null]);

        $this->artisan('legacy:import-users')
            ->expectsOutputToContain('E-Mail bereits von anderem Konto belegt: 1 (alte IDs: 1)')
            ->expectsOutputToContain('Kein bcrypt-Kennwort: 1 (alte IDs: 2)')
            ->assertSuccessful();

        $this->assertSame(1, User::count());
        $this->assertSame('neu', User::first()->username);
    }

    public function test_rerun_updates_existing_users_and_keeps_the_username(): void
    {
        $this->legacyUser(['id' => 1, 'email' => 'riff@example.com']);
        $this->artisan('legacy:import-users')->assertSuccessful();
        $id = User::firstWhere('legacy_id', 1)->id;

        $newHash = Hash::make('neues-kennwort', ['rounds' => 5]);
        DB::connection('legacy')->table('users')->where('id', 1)->update([
            'email' => 'riff.neu@example.com', 'name' => 'Riff Neu', 'password' => $newHash,
        ]);
        $this->artisan('legacy:import-users')->assertSuccessful();

        $user = User::firstWhere('legacy_id', 1);
        $this->assertSame(1, User::count());
        $this->assertSame($id, $user->id);
        $this->assertSame('riff', $user->username);
        $this->assertSame('riff.neu@example.com', $user->email);
        $this->assertSame('Riff Neu', $user->name);
        $this->assertSame($newHash, $user->password);
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->legacyUser(['id' => 1, 'email' => 'riff@example.com']);

        $this->artisan('legacy:import-users --dry-run')
            ->expectsOutputToContain('Probelauf')
            ->assertSuccessful();

        $this->assertSame(0, User::count());
    }
}
