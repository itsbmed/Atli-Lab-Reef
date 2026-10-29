<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo-Konten aus client/src/services/localStore.js (Passwort jeweils demo123).
 *  · kunde    → Bestandskunde (volles Dashboard)
 *  · demo     → Neukunde (leeres Einrichtungs-Dashboard)
 */
class DemoUserSeeder extends Seeder
{
    private const USERS = [
        ['username' => 'kunde', 'email' => 'kunde@reefpilot.de', 'name' => 'Mohamed', 'role' => UserRole::Endnutzer, 'kind' => 'full'],
        ['username' => 'demo', 'email' => 'demo@reefpilot.de', 'name' => 'Neuer Kunde', 'role' => UserRole::Endnutzer, 'kind' => 'new'],
        ['username' => 'neukunde', 'email' => 'neu@reefpilot.de', 'name' => 'Neuer Kunde', 'role' => UserRole::Endnutzer, 'kind' => 'new'],
        ['username' => 'admin', 'email' => 'admin@reefpilot.de', 'name' => 'ATI Admin', 'role' => UserRole::Admin, 'kind' => 'full'],
        ['username' => 'subadmin', 'email' => 'sub@reefpilot.de', 'name' => 'ATI Redaktion', 'role' => UserRole::Subadmin, 'kind' => 'full'],
    ];

    public function run(): void
    {
        foreach (self::USERS as $demo) {
            $user = User::firstOrNew(['username' => $demo['username']]);
            $user->fill(['email' => $demo['email'], 'name' => $demo['name'], 'password' => 'demo123', 'country' => 'DE']);
            $user->forceFill(['role' => $demo['role'], 'kind' => $demo['kind']])->save();
        }
    }
}
