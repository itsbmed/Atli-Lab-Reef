<?php

namespace App\Console\Commands;

use App\Enums\AnalysisStatus;
use App\Models\EvaluationScale;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Übernimmt die Analysen bereits übernommener Becken aus der alten Datenbank (Verbindung "legacy")
 * samt Messwerten, Dosierungen und Gruppen-Scores, siehe docs/schema-analyses.md.
 *
 *  · Besitzer und Becken über aquariums.legacy_id (legacy:import-aquariums zuerst ausführen)
 *  · eingelöster Barcode und Paket über vouchers.legacy_id (legacy:import-vouchers zuerst ausführen);
 *    Osmose-/Meersalz-Proben ohne eigenen Barcode erben das Paket der Hauptanalyse
 *  · analysis.type → Methode, status/date_arrived → Status, Bewertung als Snapshot nach ati-standard
 *  · Dosierungen brauchen die Produkte aus legacy:import-catalog
 *  · Konten mit Analysen bekommen das Bestandskunden-Dashboard (users.kind = full)
 *
 * Wiederholbar: bereits übernommene Analysen (legacy_id) behalten ihre ID, Messwerte,
 * Dosierungen und Gruppen-Scores werden neu geschrieben.
 */
class ImportLegacyAnalyses extends Command
{
    protected $signature = 'legacy:import-analyses
                            {--dry-run : Nur prüfen und zählen, nichts schreiben}
                            {--chunk=500 : Analysen pro Durchlauf}';

    protected $description = 'Übernimmt Analysen und Messwerte der übernommenen Becken aus der alten ATI-Datenbank';

    /** analysis.reason => App\Enums\AnalysisReason */
    private const REASONS = [1 => 'routine', 2 => 'algen', 3 => 'cyanos', 4 => 'rtn', 5 => 'stn'];

    /** analysis_results.result_status => Stufe 1–9 */
    private const BANDS = [-2 => 2, -1 => 4, 0 => 5, 1 => 6, 2 => 8];

    private const INSERT_CHUNK = 500;

    /** Bis zu so vielen übernommenen Becken filtert die Abfrage direkt nach tanks_id (Testdaten). */
    private const FILTER_TANKS_IN_QUERY = 5000;

    /** @var array<int, object{id: string, user_id: string, name: string}> tanks.id => Becken */
    private array $aquariums = [];

    /** @var array<int, string> analysis.id => analyses.id bereits übernommener Analysen */
    private array $analyses = [];

    /** @var array<int, int> analysis.type => analysis_methods.id */
    private array $methods = [];

    /** @var array<int, object{id: int, is_calculated: bool}> elements.id (alt) => Element */
    private array $elements = [];

    /** @var array<int, int> elements_groups.id => element_groups.id */
    private array $groups = [];

    /** @var array<int, int> supplements.id => products.id */
    private array $products = [];

    /** @var array<int, int> analysis.id (Kind) => analysis.id (Hauptanalyse) */
    private array $parents = [];

    /** @var array<string, int> */
    private array $counts = [];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $this->counts = [];
        $this->parents = [];

        if (! $this->loadMaps()) {
            return self::FAILURE;
        }

        DB::connection('legacy')->table('analysis')
            ->select([
                'id', 'parent_id', 'tanks_id', 'type', 'status', 'reason', 'lang', 'comment', 'advice',
                'super_quality_index', 'hash', 'date_arrived', 'date_analysed', 'created_at', 'updated_at',
            ])
            ->when(count($this->aquariums) <= self::FILTER_TANKS_IN_QUERY, fn ($q) => $q->whereIn('tanks_id', array_keys($this->aquariums)))
            ->orderBy('id')
            ->chunkById((int) $this->option('chunk'), function (Collection $rows) use ($dryRun) {
                $rows = $rows->filter(function (object $row) {
                    if (isset($this->aquariums[(int) $row->tanks_id])) {
                        return true;
                    }
                    $this->count('skipped_tank');

                    return false;
                });
                if ($rows->isNotEmpty()) {
                    $this->importChunk($rows->values(), $dryRun);
                }
            });

        $this->linkSamples($dryRun);
        if (! $dryRun) {
            // Konten mit Analysen sehen das Bestandskunden-Dashboard statt der Einrichtung.
            DB::table('users')->whereIn('id', DB::table('analyses')->whereNotNull('legacy_id')->select('user_id'))
                ->where('kind', '!=', 'full')->update(['kind' => 'full']);
        }

        $this->table(['', 'Anzahl'], collect([
            'Analysen neu angelegt' => 'created',
            'Analysen aktualisiert' => 'updated',
            'Analysen übersprungen (Becken nicht übernommen)' => 'skipped_tank',
            'davon fertig' => 'status:completed',
            'davon in Analyse' => 'status:in_analysis',
            'davon eingegangen' => 'status:received',
            'davon registriert' => 'status:registered',
            'mit Barcode' => 'voucher',
            'Proben mit Hauptanalyse verknüpft' => 'linked',
            'Messwerte' => 'results',
            'Messwerte übersprungen (Element unbekannt)' => 'unknown_element',
            'Dosierungen' => 'dosings',
            'Dosierungen übersprungen (Produkt fehlt)' => 'missing_product',
            'Gruppen-Scores' => 'group_scores',
        ])->map(fn (string $key, string $label) => [$label, $this->counts[$key] ?? 0])->values()->all());

        if ($dryRun) {
            $this->info('Probelauf – es wurde nichts geschrieben.');
        }

        return self::SUCCESS;
    }

    private function loadMaps(): bool
    {
        $this->aquariums = DB::table('aquariums')->whereNotNull('legacy_id')
            ->get(['id', 'legacy_id', 'user_id', 'name'])->keyBy('legacy_id')->all();
        if (! $this->aquariums) {
            $this->warn('Es sind noch keine Becken übernommen – bitte zuerst legacy:import-aquariums ausführen.');
        }

        $this->elements = DB::table('elements')->whereNotNull('legacy_id')
            ->get(['id', 'legacy_id', 'is_calculated'])->keyBy('legacy_id')->all();
        if (! $this->elements) {
            $this->error('Keine Elemente vorhanden – bitte zuerst php artisan db:seed --class=AnalysisCatalogSeeder ausführen.');

            return false;
        }

        $this->analyses = DB::table('analyses')->whereNotNull('legacy_id')->pluck('id', 'legacy_id')->all();
        $this->methods = DB::table('analysis_methods')->whereNotNull('legacy_type')->pluck('id', 'legacy_type')->all();
        $this->groups = DB::table('element_groups')->whereNotNull('legacy_id')->pluck('id', 'legacy_id')->all();
        $this->products = DB::table('products')->whereNotNull('legacy_id')->pluck('id', 'legacy_id')->all();

        if (! $this->products) {
            $this->warn('Es sind keine Produkte vorhanden – Dosierungen werden übersprungen (legacy:import-catalog).');
        }
        if (! DB::table('vouchers')->whereNotNull('legacy_id')->exists()) {
            $this->warn('Es sind keine Barcodes übernommen – Analysen bleiben ohne Barcode und Paket (legacy:import-vouchers).');
        }

        return true;
    }

    private function importChunk(Collection $rows, bool $dryRun): void
    {
        $legacyIds = $rows->pluck('id')->map(fn ($id) => (int) $id)->all();

        // Eingelöste Barcodes: analysis.id => [vouchers.id, package_id]
        $voucherIds = DB::connection('legacy')->table('analysis_vouchers')
            ->whereIn('analysis_id', $legacyIds)->pluck('id', 'analysis_id');
        $vouchers = DB::table('vouchers')->whereIn('legacy_id', $voucherIds->values())
            ->get(['id', 'legacy_id', 'package_id'])->keyBy('legacy_id');

        $ids = [];
        $batch = $rows->map(function (object $row) use ($voucherIds, $vouchers, &$ids) {
            $legacyId = (int) $row->id;
            $voucher = $vouchers[$voucherIds[$legacyId] ?? 0] ?? null;
            $ids[$legacyId] = $this->analyses[$legacyId] ?? (string) Str::uuid7();
            if ($row->parent_id) {
                $this->parents[$legacyId] = (int) $row->parent_id;
            }

            $this->count(isset($this->analyses[$legacyId]) ? 'updated' : 'created');
            $status = $this->status($row);
            $this->count("status:{$status->value}");
            if ($voucher) {
                $this->count('voucher');
            }

            $aquarium = $this->aquariums[(int) $row->tanks_id];
            $createdAt = $this->validDate($row->created_at) ?? now()->toDateTimeString();

            return [
                'id' => $ids[$legacyId],
                'legacy_id' => $legacyId,
                'user_id' => $aquarium->user_id,
                'aquarium_id' => $aquarium->id,
                'aquarium_name' => $aquarium->name,
                'voucher_id' => $voucher?->id,
                'package_id' => $voucher?->package_id,
                'method_id' => $this->methods[(int) $row->type] ?? null,
                'evaluation_scale_id' => EvaluationScale::DEFAULT,
                'reason' => self::REASONS[(int) $row->reason] ?? null,
                'status' => $status->value,
                'language' => $this->text($row->lang, 5),
                'customer_comment' => $this->text($row->comment),
                'lab_advice' => $this->text($row->advice),
                'quality_index' => $row->super_quality_index === null ? null : round((float) $row->super_quality_index, 1),
                'share_token' => $this->text($row->hash, 40),
                'received_at' => $this->validDate($row->date_arrived),
                'analysed_at' => $this->validDate($row->date_analysed),
                'created_at' => $createdAt,
                'updated_at' => $this->validDate($row->updated_at) ?? $createdAt,
            ];
        })->all();

        [$results, $dosings] = $this->results($legacyIds, $ids);
        $scores = $this->groupScores($legacyIds, $ids);
        // Auch im Probelauf, damit linkSamples() die Proben zählen kann.
        $this->analyses += $ids;

        if ($dryRun) {
            return;
        }

        DB::transaction(function () use ($batch, $ids, $results, $dosings, $scores) {
            DB::table('analyses')->upsert($batch, ['legacy_id'], [
                'user_id', 'aquarium_id', 'aquarium_name', 'voucher_id', 'package_id', 'method_id', 'evaluation_scale_id',
                'reason', 'status', 'language', 'customer_comment', 'lab_advice', 'quality_index', 'share_token',
                'received_at', 'analysed_at', 'created_at', 'updated_at',
            ]);

            // Dosierungen hängen an den Messwerten und werden mit ihnen gelöscht.
            DB::table('analysis_results')->whereIn('analysis_id', $ids)->delete();
            DB::table('analysis_group_scores')->whereIn('analysis_id', $ids)->delete();
            foreach ([['analysis_results', $results], ['analysis_dosings', $dosings], ['analysis_group_scores', $scores]] as [$table, $rows]) {
                foreach (array_chunk($rows, self::INSERT_CHUNK) as $chunk) {
                    DB::table($table)->insert($chunk);
                }
            }
        });
    }

    /**
     * @param  list<int>  $legacyIds
     * @param  array<int, string>  $ids  analysis.id => analyses.id
     * @return array{list<array<string, mixed>>, list<array<string, mixed>>}
     */
    private function results(array $legacyIds, array $ids): array
    {
        $results = [];
        $dosings = [];

        $rows = DB::connection('legacy')->table('analysis_results')->whereIn('analysis_id', $legacyIds)->get();
        foreach ($rows as $row) {
            $element = $this->elements[(int) $row->elements_id] ?? null;
            if (! $element) {
                $this->count('unknown_element');

                continue;
            }

            $analysisId = $ids[(int) $row->analysis_id];
            $value = $row->elements_value === null ? null : (float) $row->elements_value;
            $results[] = [
                'analysis_id' => $analysisId,
                'element_id' => $element->id,
                'value' => $value,
                'band' => $value === null ? null : (self::BANDS[(int) $row->result_status] ?? null),
                'target' => $row->ref_norm_value,
                'min' => $this->lowerBound($row->ref_norm_value_low_1, (bool) $element->is_calculated),
                'max' => $row->ref_norm_value_high_1,
            ];
            $this->count('results');

            foreach ([1 => '', 2 => '2'] as $position => $suffix) {
                $supplement = $row->{"supplements_id{$suffix}"};
                $amount = (float) $row->{"supplements_value_per_day{$suffix}"};
                if (! $supplement || $amount <= 0) {
                    continue;
                }
                if (! isset($this->products[(int) $supplement])) {
                    $this->count('missing_product');

                    continue;
                }
                $dosings[] = [
                    'analysis_id' => $analysisId,
                    'element_id' => $element->id,
                    'product_id' => $this->products[(int) $supplement],
                    'amount_per_day' => $amount,
                    'days' => max(0, (int) $row->{"supplements_days{$suffix}"}),
                    'position' => $position,
                ];
                $this->count('dosings');
            }
        }

        return [$results, $dosings];
    }

    /**
     * @param  list<int>  $legacyIds
     * @param  array<int, string>  $ids
     * @return list<array<string, mixed>>
     */
    private function groupScores(array $legacyIds, array $ids): array
    {
        $scores = [];
        // Die alte Tabelle hat keinen Schlüssel; je Analyse und Gruppe gilt der letzte Eintrag.
        foreach (DB::connection('legacy')->table('analysis2elements_groups')->whereIn('analysis_id', $legacyIds)->get() as $row) {
            $group = $this->groups[(int) $row->elements_groups_id] ?? null;
            if (! $group || $row->percentage_value === null) {
                continue;
            }
            $analysisId = $ids[(int) $row->analysis_id];
            $scores["{$analysisId}|{$group}"] = [
                'analysis_id' => $analysisId,
                'element_group_id' => $group,
                'score' => max(0, min(100, (int) round((float) $row->percentage_value))),
            ];
        }
        $this->counts['group_scores'] = ($this->counts['group_scores'] ?? 0) + count($scores);

        return array_values($scores);
    }

    /**
     * Osmose-/Meersalz-Proben mit ihrer Hauptanalyse verknüpfen; ohne eigenen Barcode erben sie deren Paket.
     */
    private function linkSamples(bool $dryRun): void
    {
        $links = [];
        foreach ($this->parents as $child => $parent) {
            if (isset($this->analyses[$child], $this->analyses[$parent]) && $child !== $parent) {
                $links[$this->analyses[$child]] = $this->analyses[$parent];
            }
        }
        $this->counts['linked'] = count($links);
        if ($dryRun || ! $links) {
            return;
        }

        $packages = DB::table('analyses')->whereIn('id', array_unique($links))->pluck('package_id', 'id');
        DB::transaction(function () use ($links, $packages) {
            foreach ($links as $child => $parent) {
                DB::table('analyses')->where('id', $child)->update(['parent_id' => $parent]);
                DB::table('analyses')->where('id', $child)->whereNull('voucher_id')->update(['package_id' => $packages[$parent]]);
            }
        });
    }

    private function status(object $row): AnalysisStatus
    {
        return match ((int) $row->status) {
            2 => AnalysisStatus::Completed,
            1 => AnalysisStatus::InAnalysis,
            default => $this->validDate($row->date_arrived) ? AnalysisStatus::Received : AnalysisStatus::Registered,
        };
    }

    /** Negative Untergrenzen heißen „keine Untergrenze“ – außer bei Kennzahlen (prozentuale Abweichung). */
    private function lowerBound(mixed $value, bool $calculated): ?float
    {
        return $value === null || ($value < 0 && ! $calculated) ? null : (float) $value;
    }

    private function text(mixed $value, ?int $length = null): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        return $length ? mb_substr($value, 0, $length) : $value;
    }

    /** Das Altsystem enthält Nulldaten (0000-00-00), die MySQL im Strict-Modus ablehnt. */
    private function validDate(mixed $value): ?string
    {
        $value = (string) $value;

        return $value === '' || str_starts_with($value, '0000') ? null : $value;
    }

    private function count(string $key): void
    {
        $this->counts[$key] = ($this->counts[$key] ?? 0) + 1;
    }
}
