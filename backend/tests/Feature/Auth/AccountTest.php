<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    private function loginAs(User $user): string
    {
        return $user->createToken('web')->plainTextToken;
    }

    public function test_profile_update_saves_the_account_form(): void
    {
        $user = User::factory()->create(['username' => 'kunde', 'email' => 'kunde@reefpilot.de']);

        $this->withToken($this->loginAs($user))->patchJson('/api/auth/me', [
            'name' => ' Mohamed ',
            'username' => 'riffkunde',
            'email' => 'Neu@ReefPilot.de',
            'country' => 'CH',
            'language' => 'en',
            'newsletter' => true,
            'analysis_reminder' => false,
            'reminder_interval_days' => 180,
            'advisor_id' => 'korallenstudio',
        ])->assertOk()
            ->assertJsonPath('user.name', 'Mohamed')
            ->assertJsonPath('user.username', 'riffkunde')
            ->assertJsonPath('user.email', 'neu@reefpilot.de')
            ->assertJsonPath('user.country', 'CH')
            ->assertJsonPath('user.language', 'en')
            ->assertJsonPath('user.newsletter', true)
            ->assertJsonPath('user.analysis_reminder', false)
            ->assertJsonPath('user.reminder_interval_days', 180)
            ->assertJsonPath('user.advisor_id', 'korallenstudio');
    }

    public function test_profile_update_falls_back_to_the_username_for_an_empty_name(): void
    {
        $user = User::factory()->create(['username' => 'kunde']);

        $this->withToken($this->loginAs($user))->patchJson('/api/auth/me', ['name' => ''])
            ->assertOk()
            ->assertJsonPath('user.name', 'kunde');
    }

    public function test_profile_update_keeps_own_username_and_rejects_taken_ones(): void
    {
        $user = User::factory()->create(['username' => 'kunde', 'email' => 'kunde@reefpilot.de']);
        User::factory()->create(['username' => 'admin', 'email' => 'admin@reefpilot.de']);
        $token = $this->loginAs($user);

        $this->withToken($token)->patchJson('/api/auth/me', ['username' => 'KUNDE', 'email' => 'kunde@reefpilot.de'])
            ->assertOk();

        $this->withToken($token)->patchJson('/api/auth/me', ['username' => 'Admin'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Benutzername oder E-Mail ist bereits vergeben.');

        $this->withToken($token)->patchJson('/api/auth/me', ['email' => 'ADMIN@reefpilot.de'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Benutzername oder E-Mail ist bereits vergeben.');
    }

    public function test_profile_update_ignores_privileged_fields(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->loginAs($user))->patchJson('/api/auth/me', ['role' => 'admin', 'kind' => 'full'])
            ->assertOk()
            ->assertJsonPath('user.role', 'endnutzer')
            ->assertJsonPath('user.kind', 'new');
    }

    public function test_profile_update_validates_choices(): void
    {
        $user = User::factory()->create();
        $token = $this->loginAs($user);

        $this->withToken($token)->patchJson('/api/auth/me', ['reminder_interval_days' => 45])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Dieses Erinnerungsintervall wird nicht unterstützt.');

        $this->withToken($token)->patchJson('/api/auth/me', ['language' => 'fr'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Diese Sprache wird nicht unterstützt.');
    }

    public function test_password_change_updates_the_hash_and_revokes_other_sessions(): void
    {
        $user = User::factory()->create(['password' => 'demo123']);
        $otherDevice = $this->loginAs($user);
        $token = $this->loginAs($user);

        $this->withToken($token)->putJson('/api/auth/password', [
            'current_password' => 'demo123',
            'new_password' => 'neuesPasswort1',
            'confirm_password' => 'neuesPasswort1',
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $user->refresh();
        $this->assertTrue(Hash::check('neuesPasswort1', $user->password));
        $this->assertNotNull($user->password_updated_at);
        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame(explode('|', $token)[0], (string) $user->tokens()->first()->id);
        $this->assertNotSame(explode('|', $otherDevice)[0], (string) $user->tokens()->first()->id);
    }

    public function test_password_change_rejects_a_wrong_current_password(): void
    {
        $user = User::factory()->create(['password' => 'demo123']);

        $this->withToken($this->loginAs($user))->putJson('/api/auth/password', [
            'current_password' => 'falsch',
            'new_password' => 'neuesPasswort1',
            'confirm_password' => 'neuesPasswort1',
        ])->assertUnprocessable()
            ->assertJsonPath('error', 'Aktuelles Passwort ist falsch.');

        $this->assertTrue(Hash::check('demo123', $user->fresh()->password));
    }

    public function test_password_change_validates_length_and_confirmation(): void
    {
        $user = User::factory()->create(['password' => 'demo123']);
        $token = $this->loginAs($user);

        $this->withToken($token)->putJson('/api/auth/password', [
            'current_password' => 'demo123', 'new_password' => 'kurz', 'confirm_password' => 'kurz',
        ])->assertUnprocessable()
            ->assertJsonPath('error', 'Das neue Passwort muss mindestens 8 Zeichen lang sein.');

        $this->withToken($token)->putJson('/api/auth/password', [
            'current_password' => 'demo123', 'new_password' => 'neuesPasswort1', 'confirm_password' => 'anderes123',
        ])->assertUnprocessable()
            ->assertJsonPath('error', 'Die neuen Passwörter stimmen nicht überein.');
    }

    public function test_account_endpoints_require_a_token(): void
    {
        $this->patchJson('/api/auth/me', ['name' => 'x'])->assertUnauthorized();
        $this->putJson('/api/auth/password', [])->assertUnauthorized();
    }
}
