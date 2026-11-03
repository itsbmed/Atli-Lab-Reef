<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Anonymisiert übernommene Konten (legacy_id gesetzt) und ihre Becken für Test- und
 * Entwicklungsdatenbanken.
 *
 *  · Konto: Name, Benutzername und E-Mail aus der alten ID (testkunde-<id>), einheitliches
 *    Kennwort, keine Mails (Newsletter, Erinnerung aus), Tokens und Händler-Freigabe entfernt
 *  · Becken: Name aus Wasserart und laufender Nummer, Notizen und Foto entfernt,
 *    Bildpfade des alten Servers gelöscht; technische Angaben bleiben
 *  · Analysen: Beckenname wie das Becken, Kommentar und Laborempfehlung durch Platzhalter
 *    ersetzt (können Namen enthalten), Freigabe-Links entfernt; Messwerte bleiben
 *
 * legacy_id bleibt erhalten, damit spätere Importe (Analysen) die Daten zuordnen können.
 * Ein erneuter legacy:import-* überschreibt die Daten wieder – danach erneut ausführen.
 */
class AnonymizeLegacyData extends Command
{
    protected $signature = 'legacy:anonymize
                            {--password=password : Kennwort aller anonymisierten Konten}
                            {--force : Ohne Rückfrage ausführen}';

    protected $description = 'Anonymisiert übernommene Konten, ihre Becken und Analysen (nicht in Produktion)';

    /** Beckenname von Analysen, deren Becken gelöscht wurde */
    private const DELETED_AQUARIUM = 'Gelöschtes Becken';

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('In Produktion nicht erlaubt.');

            return self::FAILURE;
        }

        $users = DB::table('users')->whereNotNull('legacy_id');
        $count = $users->count();
        if ($count === 0) {
            $this->info('Keine übernommenen Konten vorhanden.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm("{$count} übernommene Konten mit ihren Becken und Analysen unwiderruflich anonymisieren?")) {
            return self::FAILURE;
        }

        $password = Hash::make((string) $this->option('password'));
        $aquariums = 0;
        $analyses = 0;

        DB::transaction(function () use ($users, $password, &$aquariums, &$analyses) {
            $users->select(['id', 'legacy_id'])->orderBy('id')->chunkById(500, function (Collection $chunk) use ($password, &$aquariums, &$analyses) {
                foreach ($chunk as $user) {
                    $this->anonymizeUser($user, $password);
                }
                $ids = $chunk->pluck('id')->all();
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', (new User)->getMorphClass())
                    ->whereIn('tokenable_id', $ids)
                    ->delete();
                $aquariums += $this->anonymizeAquariums($ids);
                $analyses += $this->anonymizeAnalyses($ids);
            });
        });

        $this->table(['', 'Anzahl'], [
            ['Konten anonymisiert', $count],
            ['Becken anonymisiert', $aquariums],
            ['Analysen anonymisiert', $analyses],
        ]);
        $this->info('Anmeldung mit testkunde-<alte ID> und dem gewählten Kennwort.');

        return self::SUCCESS;
    }

    private function anonymizeUser(object $user, string $password): void
    {
        $handle = "testkunde-{$user->legacy_id}";

        DB::table('users')->where('id', $user->id)->update([
            'username' => $handle,
            'name' => "Testkunde {$user->legacy_id}",
            'email' => "{$handle}@example.test",
            'password' => $password,
            'remember_token' => null,
            'newsletter' => false,
            'analysis_reminder' => false,
            'advisor_id' => null,
        ]);
    }

    /**
     * @param  list<string>  $userIds
     */
    private function anonymizeAquariums(array $userIds): int
    {
        $aquariums = DB::table('aquariums')
            ->whereIn('user_id', $userIds)
            ->orderBy('user_id')->orderBy('created_at')->orderBy('id')
            ->get(['id', 'user_id', 'water_type']);

        // Laufende Nummer je Konto und Wasserart: „Meerwasser 1“, „Osmosewasser 1“, …
        $numbers = [];
        foreach ($aquariums as $aquarium) {
            $number = $numbers[$aquarium->user_id][$aquarium->water_type] = ($numbers[$aquarium->user_id][$aquarium->water_type] ?? 0) + 1;

            DB::table('aquariums')->where('id', $aquarium->id)->update([
                'name' => "{$aquarium->water_type} {$number}",
                'notes' => null,
                'image' => null,
            ]);
        }

        DB::table('aquarium_images')->whereIn('aquarium_id', $aquariums->pluck('id'))->delete();

        return $aquariums->count();
    }

    /**
     * Nach anonymizeAquariums(), damit die Berichte die neuen Beckennamen übernehmen.
     *
     * @param  list<string>  $userIds
     */
    private function anonymizeAnalyses(array $userIds): int
    {
        $analyses = DB::table('analyses')->whereIn('user_id', $userIds);
        $count = (clone $analyses)->count();
        if ($count === 0) {
            return 0;
        }

        (clone $analyses)->update(['share_token' => null]);
        (clone $analyses)->whereNotNull('customer_comment')->update(['customer_comment' => 'Kommentar des Kunden (anonymisiert).']);
        (clone $analyses)->whereNotNull('lab_advice')->update(['lab_advice' => 'Empfehlung des Labors (anonymisiert).']);
        (clone $analyses)->whereNull('aquarium_id')->update(['aquarium_name' => self::DELETED_AQUARIUM]);

        $names = DB::table('aquariums')->whereIn('user_id', $userIds)->pluck('name', 'id');
        foreach ($names as $aquariumId => $name) {
            DB::table('analyses')->where('aquarium_id', $aquariumId)->update(['aquarium_name' => $name]);
        }

        return $count;
    }
}
