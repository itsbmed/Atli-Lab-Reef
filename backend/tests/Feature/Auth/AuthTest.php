<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\DemoUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private const USER_SHAPE = [
        'id', 'username', 'email', 'name', 'role', 'kind', 'country', 'language', 'newsletter',
        'analysis_reminder', 'reminder_interval_days', 'advisor_id', 'password_updated_at',
        'createdAt', 'lastLoginAt', 'permissionsUpdatedAt',
    ];

    public function test_register_creates_an_end_user_and_returns_a_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'username' => 'Riffkeeper',
            'email' => 'Riff@Example.com',
            'password' => 'geheim123',
            'country' => 'AT',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['user' => self::USER_SHAPE, 'token', 'expiresAt'])
            ->assertJsonPath('user.username', 'Riffkeeper')
            ->assertJsonPath('user.email', 'riff@example.com')
            ->assertJsonPath('user.name', 'Riffkeeper')
            ->assertJsonPath('user.role', 'endnutzer')
            ->assertJsonPath('user.kind', 'new')
            ->assertJsonPath('user.country', 'AT')
            ->assertJsonPath('user.analysis_reminder', true)
            ->assertJsonPath('user.reminder_interval_days', 90)
            ->assertJsonMissingPath('user.password');

        $this->assertNotSame('geheim123', User::first()->password);
    }

    public function test_register_rejects_taken_username_or_email_case_insensitively(): void
    {
        User::factory()->create(['username' => 'kunde', 'email' => 'kunde@reefpilot.de']);

        $this->postJson('/api/auth/register', ['username' => 'KUNDE', 'email' => 'neu@example.com', 'password' => 'geheim123'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Benutzername oder E-Mail ist bereits vergeben.');

        $this->postJson('/api/auth/register', ['username' => 'neu', 'email' => 'KUNDE@reefpilot.de', 'password' => 'geheim123'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Benutzername oder E-Mail ist bereits vergeben.');
    }

    public function test_register_validates_input_with_german_messages(): void
    {
        $this->postJson('/api/auth/register', ['username' => 'neu', 'email' => 'neu@example.com', 'password' => 'kurz'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Das Passwort muss mindestens 8 Zeichen lang sein.')
            ->assertJsonValidationErrors('password');
    }

    public function test_register_ignores_privileged_fields(): void
    {
        $this->postJson('/api/auth/register', [
            'username' => 'neu', 'email' => 'neu@example.com', 'password' => 'geheim123', 'role' => 'admin', 'kind' => 'full',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'endnutzer')
            ->assertJsonPath('user.kind', 'new');
    }

    public function test_login_accepts_username_or_email_case_insensitively(): void
    {
        User::factory()->create(['username' => 'kunde', 'email' => 'kunde@reefpilot.de', 'password' => 'demo123']);

        foreach (['kunde', 'KUNDE', 'Kunde@ReefPilot.de'] as $login) {
            $this->postJson('/api/auth/login', ['login' => $login, 'password' => 'demo123'])
                ->assertOk()
                ->assertJsonStructure(['user' => self::USER_SHAPE, 'token', 'expiresAt'])
                ->assertJsonPath('user.username', 'kunde');
        }

        $this->assertNotNull(User::first()->last_login_at);
    }

    public function test_login_rejects_wrong_credentials(): void
    {
        User::factory()->create(['username' => 'kunde', 'password' => 'demo123']);

        $this->postJson('/api/auth/login', ['login' => 'kunde', 'password' => 'falsch'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Benutzername/E-Mail oder Passwort ist falsch.');

        $this->postJson('/api/auth/login', ['login' => 'unbekannt', 'password' => 'demo123'])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Benutzername/E-Mail oder Passwort ist falsch.');
    }

    public function test_login_rehashes_passwords_with_outdated_cost(): void
    {
        $user = User::factory()->create(['username' => 'altkunde']);
        $legacyHash = Hash::make('demo123', ['rounds' => 5]);
        DB::table('users')->where('id', $user->id)->update(['password' => $legacyHash]);

        $this->postJson('/api/auth/login', ['login' => 'altkunde', 'password' => 'demo123'])->assertOk();

        $newHash = $user->fresh()->password;
        $this->assertNotSame($legacyHash, $newHash);
        $this->assertFalse(Hash::needsRehash($newHash));
        $this->assertTrue(Hash::check('demo123', $newHash));
        $this->assertNull($user->fresh()->password_updated_at);
    }

    public function test_remember_me_extends_the_token_lifetime(): void
    {
        User::factory()->create(['username' => 'kunde', 'password' => 'demo123']);

        $short = $this->postJson('/api/auth/login', ['login' => 'kunde', 'password' => 'demo123'])->json('expiresAt');
        $long = $this->postJson('/api/auth/login', ['login' => 'kunde', 'password' => 'demo123', 'remember' => true])->json('expiresAt');

        $this->assertEqualsWithDelta(now()->addDay()->timestamp, strtotime($short), 5);
        $this->assertEqualsWithDelta(now()->addDays(30)->timestamp, strtotime($long), 5);
    }

    public function test_me_returns_the_current_user(): void
    {
        $token = $this->postJson('/api/auth/register', ['username' => 'neu', 'email' => 'neu@example.com', 'password' => 'geheim123'])
            ->json('token');

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonStructure(['user' => self::USER_SHAPE])
            ->assertJsonPath('user.username', 'neu');
    }

    public function test_me_requires_a_token(): void
    {
        $this->getJson('/api/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error', 'Nicht angemeldet.');
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Abgemeldet.');

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_demo_seeder_creates_the_frontend_demo_accounts(): void
    {
        $this->seed(DemoUserSeeder::class);
        $this->seed(DemoUserSeeder::class);

        $this->assertSame(5, User::count());
        $this->assertSame(UserRole::Admin, User::firstWhere('username', 'admin')->role);
        $this->assertSame('full', User::firstWhere('username', 'kunde')->kind);

        $this->postJson('/api/auth/login', ['login' => 'subadmin', 'password' => 'demo123'])
            ->assertOk()
            ->assertJsonPath('user.role', 'subadmin');
    }
}
