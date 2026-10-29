<?php

namespace App\Console\Commands;

use App\Http\Requests\AquariumRequest;
use App\Models\Aquarium;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Übernimmt die Becken aus der alten Datenbank (Verbindung "legacy", Tabelle tanks).
 *
 *  · nur Becken bereits übernommener Konten (legacy:import-users zuerst ausführen)
 *  · die Wasserart ergibt sich aus der neuesten Analyse des Beckens (analysis.type),
 *    Becken ohne Analyse gelten als Meerwasser – außer der Name deutet auf Osmose hin
 *  · Merkmale aus tank_properties landen in den passenden Feldern bzw. in water_details
 *  · Osmosequellen: Eine Osmose-Analyse verweist per parent_id auf die Analyse des Beckens,
 *    zu dem sie gehört; die neueste solche Analyse bestimmt die Verknüpfung
 *  · Bilder: nur die Pfade auf dem alten Server, die Dateien folgen mit dem Datei-Upload
 *  · video und public werden nicht übernommen
 *
 * Wiederholbar: bereits übernommene Becken, Verknüpfungen und Bilder (legacy_id) werden
 * aktualisiert. Im neuen System gemachte Änderungen an diesen Feldern werden dabei überschrieben.
 */
class ImportLegacyAquariums extends Command
{
    protected $signature = 'legacy:import-aquariums
                            {--dry-run : Nur prüfen und zählen, nichts schreiben}
                            {--chunk=1000 : Datensätze pro Durchlauf}';

    protected $description = 'Übernimmt die Becken der übernommenen Konten aus der alten ATI-Datenbank';

    /** analysis.type => Wasserart; alle übrigen Typen (0, 1, 5, 6) sind Meerwasser-Analysen. */
    private const WATER_TYPES = [
        3 => 'Osmosewasser',
        2 => 'Süßwasser',
        4 => 'Meersalz',
    ];

    private const DEFAULT_WATER_TYPE = 'Meerwasser';

    private const IMAGE_THEMES = [
        'Osmosewasser' => 'osmosis',
        'Süßwasser' => 'freshwater',
        'Meersalz' => 'reef-sps',
    ];

    /** Osmose-Analysen (analysis.type), deren parent_id auf das versorgte Becken zeigt. */
    private const OSMOSIS_ANALYSIS_TYPE = 3;

    /** identifier_properties.id der alten Merkmale */
    private const PROPERTY_DIMENSIONS = 61;

    private const PROPERTY_LIGHTING = 62;

    private const PROPERTY_SKIMMER = 63;

    private const PROPERTY_PUMPS = 64;

    private const PROPERTY_SUPPLY = 65;

    private const PROPERTY_FILTERS = 66;

    private const PROPERTY_COMMENT = 67;

    /** pictures.type => aquarium_images.type */
    private const IMAGE_TYPES = ['profile' => 'profile', 'header' => 'header', 'images' => 'gallery'];

    /** Antworten wie „keiner“, „none“ oder „kein Abschäumer“ heißen: kein Abschäumer vorhanden. */
    private const NO_SKIMMER = '/^(kein(e[nr]?)?|nein|none|no|ohne|x|-+|n\/a)(\s+(abschäumer|abschäumung|skimmer|yet)\b.*)?[.!]*$/iu';

    /** „Osmose“, „Umkehrosmose“, „RODI“ in beliebiger Schreibweise, „RO“ nur großgeschrieben. */
    private const OSMOSIS_NAME = '/osmo|umkehr|rodi|(?-i:\bRO\b)/iu';

    private const MAX_VOLUME = 100_000;

    /** @var array<int, string> users.legacy_id => users.id */
    private array $users = [];

    /** @var array<int, string> tanks.id => aquariums.id bereits übernommener Becken */
    private array $aquariums = [];

    /** @var array<int, string> tanks.id => Wasserart aller in diesem Lauf übernommenen Becken */
    private array $waterTypes = [];

    /** @var array<string, int> */
    private array $counts = [];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $chunk = (int) $this->option('chunk');
        // Artisan::call() verwendet dieselbe Instanz erneut.
        $this->waterTypes = [];
        $this->counts = [];

        $this->users =DB::table('users')->whereNotNull('legacy_id')->pluck('id', 'legacy_id')->all();
        if (! $this->users) {
            $this->warn('Es sind noch keine Konten übernommen – bitte zuerst legacy:import-users ausführen.');
        }
        $this->loadAquariumMap();

        $this->importTanks($dryRun, $chunk);
        if (! $dryRun) {
            $this->loadAquariumMap();
        }
        $this->importOsmosisLinks($dryRun, $chunk);
        $this->importImages($dryRun, $chunk);

        $this->table(['', 'Anzahl'], collect([
            'Becken neu angelegt' => 'created',
            'Becken aktualisiert' => 'updated',
            'Becken übersprungen (Konto nicht übernommen)' => 'skipped_user',
            'davon Meerwasser' => 'type:Meerwasser',
            'davon Osmosewasser' => 'type:Osmosewasser',
            'davon Süßwasser' => 'type:Süßwasser',
            'davon Meersalz' => 'type:Meersalz',
            'Wasserart nur aus dem Namen abgeleitet (keine Analyse)' => 'type_from_name',
            'Texte gekürzt (zu lang für das Zielfeld)' => 'truncated',
            'Osmose-Verknüpfungen' => 'links',
            'Osmose-Kandidaten verworfen (Quelle laut neuester Analyse kein Osmosewasser)' => 'links_rejected',
            'Bildpfade' => 'images',
        ])->map(fn (string $key, string $label) => [$label, $this->counts[$key] ?? 0])->values()->all());

        if ($dryRun) {
            $this->info('Probelauf – es wurde nichts geschrieben.');
        }

        return self::SUCCESS;
    }

    private function loadAquariumMap(): void
    {
        $this->aquariums = DB::table('aquariums')->whereNotNull('legacy_id')->pluck('id', 'legacy_id')->all();
    }

    private function importTanks(bool $dryRun, int $chunk): void
    {
        DB::connection('legacy')->table('tanks')
            ->select(['id', 'users_id', 'tankname', 'netto_size_liter', 'description', 'created_at', 'updated_at'])
            ->orderBy('id')
            ->chunkById($chunk, function (Collection $tanks) use ($dryRun) {
                $tanks = $tanks->filter(function (object $tank) {
                    if (isset($this->users[(int) $tank->users_id])) {
                        return true;
                    }
                    $this->count('skipped_user');

                    return false;
                });
                if ($tanks->isEmpty()) {
                    return;
                }

                $ids = $tanks->pluck('id')->map(fn ($id) => (int) $id)->all();
                $analysisTypes = $this->latestAnalysisTypes($ids);
                $properties = $this->properties($ids);

                $batch = $tanks->map(fn (object $tank) => $this->mapTank($tank, $analysisTypes, $properties[(int) $tank->id] ?? []))->values()->all();

                if (! $dryRun) {
                    DB::table('aquariums')->upsert($batch, ['legacy_id'], [
                        'user_id', 'name', 'water_type', 'net_volume', 'dimensions', 'supply_system', 'skimmer',
                        'skimmer_model', 'notes', 'image_theme', 'water_details', 'created_at', 'updated_at',
                    ]);
                }
            });
    }

    /**
     * @param  list<int>  $tankIds
     * @return array<int, int> tanks.id => analysis.type der neuesten Analyse
     */
    private function latestAnalysisTypes(array $tankIds): array
    {
        $latest = DB::connection('legacy')->table('analysis')
            ->selectRaw('MAX(id) AS id')
            ->whereIn('tanks_id', $tankIds)
            ->groupBy('tanks_id');

        return DB::connection('legacy')->table('analysis')
            ->joinSub($latest, 'latest', 'latest.id', '=', 'analysis.id')
            ->pluck('analysis.type', 'analysis.tanks_id')
            ->map(fn ($type) => (int) $type)
            ->all();
    }

    /**
     * @param  list<int>  $tankIds
     * @return array<int, array<int, list<string>>> tanks.id => property_id => Werte
     */
    private function properties(array $tankIds): array
    {
        $result = [];
        $rows = DB::connection('legacy')->table('tank_properties')
            ->whereIn('tank_id', $tankIds)
            ->orderBy('id')
            ->get(['tank_id', 'property_id', 'value']);

        foreach ($rows as $row) {
            $value = trim((string) $row->value);
            if ($value !== '') {
                $result[(int) $row->tank_id][(int) $row->property_id][] = $value;
            }
        }

        return $result;
    }

    /**
     * @param  array<int, int>  $analysisTypes
     * @param  array<int, list<string>>  $properties
     * @return array<string, mixed>
     */
    private function mapTank(object $tank, array $analysisTypes, array $properties): array
    {
        $legacyId = (int) $tank->id;
        $name = trim((string) $tank->tankname) ?: "Aquarium {$legacyId}";

        if (isset($analysisTypes[$legacyId])) {
            $waterType = self::WATER_TYPES[$analysisTypes[$legacyId]] ?? self::DEFAULT_WATER_TYPE;
        } elseif (preg_match(self::OSMOSIS_NAME, $name)) {
            $waterType = 'Osmosewasser';
            $this->count('type_from_name');
        } else {
            $waterType = self::DEFAULT_WATER_TYPE;
        }
        $this->waterTypes[$legacyId] = $waterType;
        $this->count("type:{$waterType}");
        $this->count(isset($this->aquariums[$legacyId]) ? 'updated' : 'created');

        $volume = (int) $tank->netto_size_liter;
        $hasVolume = $waterType !== 'Osmosewasser' && $volume > 1 && $volume <= self::MAX_VOLUME;

        $join = fn (int $property, string $glue = '; ') => implode($glue, $properties[$property] ?? []);
        $skimmer = $join(self::PROPERTY_SKIMMER);
        $hasSkimmer = $skimmer !== '' && ! preg_match(self::NO_SKIMMER, $skimmer);

        $notes = implode("\n\n", array_filter([trim((string) $tank->description), $join(self::PROPERTY_COMMENT, "\n")]));

        $details = array_filter([
            'light_product' => $join(self::PROPERTY_LIGHTING),
            'flow_products' => $join(self::PROPERTY_PUMPS),
            'other_media' => $join(self::PROPERTY_FILTERS),
        ], fn (string $value) => $value !== '');

        $createdAt = $this->validDate($tank->created_at) ?? now()->toDateTimeString();

        return [
            'id' => $this->aquariums[$legacyId] ?? (string) Str::uuid7(),
            'legacy_id' => $legacyId,
            'user_id' => $this->users[(int) $tank->users_id],
            'name' => $this->limit($name, 120),
            'water_type' => $waterType,
            'net_volume' => $hasVolume ? $volume : null,
            'dimensions' => $this->limit($join(self::PROPERTY_DIMENSIONS), 100),
            'supply_system' => $this->limit($join(self::PROPERTY_SUPPLY), 255),
            'skimmer' => $hasSkimmer,
            'skimmer_model' => $hasSkimmer ? $this->limit($skimmer, 255) : null,
            'notes' => $this->limit($notes, AquariumRequest::NOTES_MAX_LENGTH),
            'image_theme' => self::IMAGE_THEMES[$waterType] ?? 'reef-mixed',
            'water_details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
            'created_at' => $createdAt,
            'updated_at' => $this->validDate($tank->updated_at) ?? $createdAt,
        ];
    }

    private function importOsmosisLinks(bool $dryRun, int $chunk): void
    {
        // Je versorgtem Becken die Osmosequelle aus der neuesten Osmose-Analyse.
        $pairs = DB::connection('legacy')->table('analysis as child')
            ->join('analysis as parent', 'parent.id', '=', 'child.parent_id')
            ->join('tanks as child_tank', 'child_tank.id', '=', 'child.tanks_id')
            ->join('tanks as parent_tank', 'parent_tank.id', '=', 'parent.tanks_id')
            ->where('child.type', self::OSMOSIS_ANALYSIS_TYPE)
            ->whereColumn('child.tanks_id', '!=', 'parent.tanks_id')
            ->whereColumn('child_tank.users_id', 'parent_tank.users_id')
            ->groupBy('parent.tanks_id', 'child.tanks_id')
            ->orderByDesc(DB::raw('MAX(child.id)'))
            ->get([DB::raw('parent.tanks_id AS tank_id'), DB::raw('child.tanks_id AS source_id')]);

        // Neueste zuerst: Ist die Quelle laut ihrer neuesten Analyse kein Osmosewasser mehr
        // (Becken umgewidmet), kommt der nächstältere Kandidat zum Zug.
        $links = [];
        foreach ($pairs as $pair) {
            $tankId = (int) $pair->tank_id;
            $sourceId = (int) $pair->source_id;
            if (isset($links[$tankId]) || ! isset($this->waterTypes[$tankId], $this->waterTypes[$sourceId])) {
                continue;
            }
            if ($this->waterTypes[$sourceId] !== Aquarium::LINK_TYPES['osmosis_source']) {
                $this->count('links_rejected');

                continue;
            }
            $links[$tankId] = $sourceId;
            $this->count('links');
        }

        if ($dryRun) {
            return;
        }

        $now = now()->toDateTimeString();
        $rows = collect($links)->map(fn (int $sourceId, int $tankId) => [
            'aquarium_id' => $this->aquariums[$tankId],
            'linked_aquarium_id' => $this->aquariums[$sourceId],
            'type' => 'osmosis_source',
            'created_at' => $now,
            'updated_at' => $now,
        ])->values();

        foreach ($rows->chunk($chunk) as $batch) {
            DB::table('aquarium_links')->upsert($batch->all(), ['aquarium_id', 'type'], ['linked_aquarium_id', 'updated_at']);
        }
    }

    private function importImages(bool $dryRun, int $chunk): void
    {
        DB::connection('legacy')->table('pictures')
            ->select(['id', 'tanks_id', 'type', 'path', 'thumbnailpath', 'created_at', 'updated_at'])
            ->whereNotNull('path')
            ->orderBy('id')
            ->chunkById($chunk, function (Collection $pictures) use ($dryRun) {
                $batch = [];
                foreach ($pictures as $picture) {
                    $tankId = (int) $picture->tanks_id;
                    $type = self::IMAGE_TYPES[$picture->type] ?? null;
                    if (! $type || ! isset($this->waterTypes[$tankId])) {
                        continue;
                    }

                    $createdAt = $this->validDate($picture->created_at) ?? now()->toDateTimeString();
                    $batch[] = [
                        'legacy_id' => (int) $picture->id,
                        'aquarium_id' => $this->aquariums[$tankId] ?? null,
                        'type' => $type,
                        'path' => $picture->path,
                        'thumbnail_path' => $picture->thumbnailpath ?: null,
                        'created_at' => $createdAt,
                        'updated_at' => $this->validDate($picture->updated_at) ?? $createdAt,
                    ];
                    $this->count('images');
                }

                if (! $dryRun && $batch) {
                    DB::table('aquarium_images')->upsert($batch, ['legacy_id'], ['aquarium_id', 'type', 'path', 'thumbnail_path', 'updated_at']);
                }
            });
    }

    /** Das Altsystem enthält Nulldaten (0000-00-00), die MySQL im Strict-Modus ablehnt. */
    private function validDate(mixed $value): ?string
    {
        $value = (string) $value;

        return $value === '' || str_starts_with($value, '0000') ? null : $value;
    }

    private function limit(string $value, int $length): ?string
    {
        if ($value === '') {
            return null;
        }
        if (mb_strlen($value) <= $length) {
            return $value;
        }
        $this->count('truncated');

        return mb_substr($value, 0, $length - 1).'…';
    }

    private function count(string $key): void
    {
        $this->counts[$key] = ($this->counts[$key] ?? 0) + 1;
    }
}
