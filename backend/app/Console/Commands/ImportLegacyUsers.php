<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Übernimmt die Konten aus der alten Datenbank (Verbindung "legacy").
 *
 *  · nur aktive Konten: status = 1 und nicht gelöscht
 *  · Kennwörter bleiben als bcrypt-Hash erhalten und werden beim Login neu gehasht
 *  · der Benutzername entsteht aus dem Teil der E-Mail vor dem @
 *  · Rollen werden nicht übernommen, alle Konten sind Endnutzer
 *
 * Wiederholbar: bereits übernommene Konten (legacy_id) werden aktualisiert und
 * behalten ihren Benutzernamen.
 */
class ImportLegacyUsers extends Command
{
    protected $signature = 'legacy:import-users
                            {--dry-run : Nur prüfen und zählen, nichts schreiben}
                            {--chunk=1000 : Datensätze pro Durchlauf}';

    protected $description = 'Übernimmt aktive Konten aus der alten ATI-Datenbank';

    /** @var array<string, true> vergebene Benutzernamen (kleingeschrieben) */
    private array $usernames = [];

    /** @var array<string, int|null> E-Mail => legacy_id des Kontos, das sie belegt */
    private array $emails = [];

    /** @var array<int, string> legacy_id => Benutzername bereits übernommener Konten */
    private array $legacyUsernames = [];

    /** @var array<string, list<int>> Grund => alte IDs */
    private array $skipped = [];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $this->loadExistingUsers();

        $legacy = DB::connection('legacy')->table('users');
        $excluded = (clone $legacy)->where(fn ($q) => $q->whereNotNull('deleted_at')->orWhere('status', '!=', 1))->count();

        $created = 0;
        $updated = 0;
        $activeIds = [];

        $legacy->whereNull('deleted_at')->where('status', 1)
            ->select(['id', 'name', 'email', 'password', 'confirmed', 'created_at', 'updated_at'])
            ->orderBy('id')
            ->chunkById((int) $this->option('chunk'), function (Collection $rows) use ($dryRun, &$created, &$updated, &$activeIds) {
                $batch = [];

                foreach ($rows as $row) {
                    $activeIds[$row->id] = true;
                    $record = $this->mapRow($row);
                    if (! $record) {
                        continue;
                    }

                    isset($this->legacyUsernames[$row->id]) ? $updated++ : $created++;
                    $batch[] = $record;
                }

                if (! $dryRun && $batch) {
                    DB::table('users')->upsert($batch, ['legacy_id'], ['name', 'email', 'password', 'email_verified_at', 'updated_at']);
                }
            });

        $orphaned = count(array_diff_key($this->legacyUsernames, $activeIds));

        $this->table(['', 'Anzahl'], [
            ['Neu angelegt', $created],
            ['Aktualisiert', $updated],
            ['Übersprungen', array_sum(array_map('count', $this->skipped))],
            ['Nicht übernommen (gelöscht/gesperrt)', $excluded],
            ['Bereits übernommen, inzwischen gelöscht/gesperrt', $orphaned],
        ]);

        foreach ($this->skipped as $reason => $ids) {
            $this->warn(sprintf('%s: %d (alte IDs: %s)', $reason, count($ids), implode(', ', array_slice($ids, 0, 20)).(count($ids) > 20 ? ', …' : '')));
        }

        if ($dryRun) {
            $this->info('Probelauf – es wurde nichts geschrieben.');
        }

        return self::SUCCESS;
    }

    private function loadExistingUsers(): void
    {
        foreach (DB::table('users')->select(['username', 'email', 'legacy_id'])->cursor() as $user) {
            $this->usernames[mb_strtolower($user->username)] = true;
            $this->emails[$user->email] = $user->legacy_id === null ? null : (int) $user->legacy_id;
            if ($user->legacy_id) {
                $this->legacyUsernames[(int) $user->legacy_id] = $user->username;
            }
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function mapRow(object $row): ?array
    {
        $row->id = (int) $row->id;
        $email = mb_strtolower(trim((string) $row->email));

        // Bewusst großzügig: Das alte System hat auch Umlaute u. Ä. angenommen, und damit melden sich Kunden an.
        if (! preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/u', $email)) {
            return $this->skip('Ungültige E-Mail', $row->id);
        }
        if (! preg_match('/^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/', (string) $row->password)) {
            return $this->skip('Kein bcrypt-Kennwort', $row->id);
        }
        if (array_key_exists($email, $this->emails) && $this->emails[$email] !== $row->id) {
            return $this->skip('E-Mail bereits von anderem Konto belegt', $row->id);
        }

        $this->emails[$email] = $row->id;
        $username = $this->legacyUsernames[$row->id] ?? $this->usernameFromEmail($email);

        // Das Altsystem enthält Nulldaten (0000-00-00), die MySQL im Strict-Modus ablehnt.
        $createdAt = $this->validDate($row->created_at) ?? $this->validDate($row->updated_at);
        $updatedAt = $this->validDate($row->updated_at) ?? $createdAt;

        return [
            'id' => (string) Str::uuid7(),
            'legacy_id' => $row->id,
            'username' => $username,
            'name' => trim((string) $row->name) ?: $username,
            'email' => $email,
            'password' => $row->password,
            'email_verified_at' => $row->confirmed ? ($createdAt ?? now()->toDateTimeString()) : null,
            'created_at' => $createdAt,
            'updated_at' => $updatedAt,
        ];
    }

    private function validDate(mixed $value): ?string
    {
        $value = (string) $value;

        return $value === '' || str_starts_with($value, '0000') ? null : $value;
    }

    private function usernameFromEmail(string $email): string
    {
        $base = Str::of(Str::before($email, '@'))->ascii()->lower()
            ->replaceMatches('/[^a-z0-9._-]+/', '')
            ->limit(45, '')
            ->trim('._-')
            ->toString();

        if ($base === '') {
            $base = 'nutzer';
        } elseif (strlen($base) < 3) {
            $base .= '-user';
        }

        $candidate = $base;
        for ($n = 2; isset($this->usernames[$candidate]); $n++) {
            $candidate = $base.$n;
        }

        $this->usernames[$candidate] = true;

        return $candidate;
    }

    private function skip(string $reason, int $legacyId): null
    {
        $this->skipped[$reason][] = $legacyId;

        return null;
    }
}
