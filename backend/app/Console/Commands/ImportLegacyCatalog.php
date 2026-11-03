<?php

namespace App\Console\Commands;

use App\Models\EvaluationScale;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Übernimmt Produkte und Grenzwerte aus der alten Datenbank (Verbindung "legacy").
 *
 *  · supplements → products (Key legacy-<id>, Namen in allen Sprachen)
 *  · elements.ref_value* → Grenzwerte der Skala ati-standard, elements.ref_value*_nyos → nyos,
 *    jeweils für Meerwasser (die alte Datenbank kennt keine anderen Wasserarten)
 *
 * Alte Stufen −2/−1/0/+1/+2 entsprechen den neuen Stufen 2/4/5/6/8, deshalb:
 * low_2 → too_low und low, low_1 → min, high_1 → max, high_2 → increased und high.
 * Negative Untergrenzen bedeuten „keine Untergrenze“ und werden zu null – außer bei
 * berechneten Kennzahlen, deren Grenzen prozentuale Abweichungen sind.
 *
 * Voraussetzung: AnalysisCatalogSeeder (Elemente). Wiederholbar.
 */
class ImportLegacyCatalog extends Command
{
    protected $signature = 'legacy:import-catalog
                            {--dry-run : Nur prüfen und zählen, nichts schreiben}';

    protected $description = 'Übernimmt Produkte und Grenzwerte aus der alten ATI-Datenbank';

    private const LANGUAGES = ['de', 'en', 'fr', 'it', 'es', 'cn'];

    private const WATER_TYPE = 'Meerwasser';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $elements = DB::table('elements')->whereNotNull('legacy_id')->get(['id', 'legacy_id', 'is_calculated'])->keyBy('legacy_id');
        if ($elements->isEmpty()) {
            $this->error('Keine Elemente vorhanden – bitte zuerst php artisan db:seed --class=AnalysisCatalogSeeder ausführen.');

            return self::FAILURE;
        }

        $products = $this->products();
        [$thresholds, $unknown] = $this->thresholds($elements);

        if (! $dryRun) {
            DB::transaction(function () use ($products, $thresholds) {
                DB::table('products')->upsert($products, ['legacy_id'], ['key', 'name', 'unit', 'max_dose_per_day', 'updated_at']);
                DB::table('evaluation_scale_thresholds')->upsert($thresholds, ['scale_id', 'water_type', 'element_id'], [
                    'target', 'crit_low', 'too_low', 'low', 'min', 'max', 'increased', 'high', 'too_high', 'updated_at',
                ]);
            });
        }

        $perScale = collect($thresholds)->countBy('scale_id');
        $this->table(['', 'Anzahl'], [
            ['Produkte', count($products)],
            ['Grenzwerte ati-standard', $perScale[EvaluationScale::DEFAULT] ?? 0],
            ['Grenzwerte nyos', $perScale['nyos'] ?? 0],
            ['Elemente ohne Zuordnung (alte IDs)', $unknown ? implode(', ', $unknown) : 0],
        ]);

        if ($dryRun) {
            $this->info('Probelauf – es wurde nichts geschrieben.');
        }

        return self::SUCCESS;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function products(): array
    {
        $now = now();

        return DB::connection('legacy')->table('supplements')
            ->leftJoin('units', 'units.id', '=', 'supplements.units_id')
            ->orderBy('supplements.id')
            ->get(['supplements.*', 'units.symbol as unit'])
            ->map(fn (object $row) => [
                'legacy_id' => (int) $row->id,
                'key' => "legacy-{$row->id}",
                'name' => json_encode(collect(self::LANGUAGES)
                    ->mapWithKeys(fn (string $lang) => [$lang => trim((string) ($row->{"sup_name_{$lang}"} ?? ''))])
                    ->filter()->all(), JSON_UNESCAPED_UNICODE),
                'unit' => $row->unit,
                'max_dose_per_day' => $row->max_dose_per_day,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all();
    }

    /**
     * @return array{list<array<string, mixed>>, list<int>}
     */
    private function thresholds(Collection $elements): array
    {
        $now = now();
        $rows = [];
        $unknown = [];

        foreach (DB::connection('legacy')->table('elements')->orderBy('id')->get() as $legacy) {
            $element = $elements[(int) $legacy->id] ?? null;
            if (! $element) {
                $unknown[] = (int) $legacy->id;

                continue;
            }
            $lower = fn ($value) => $value === null || ($value < 0 && ! $element->is_calculated) ? null : (float) $value;
            $base = ['water_type' => self::WATER_TYPE, 'element_id' => $element->id, 'crit_low' => null, 'too_high' => null, 'created_at' => $now, 'updated_at' => $now];

            $rows[] = $base + [
                'scale_id' => EvaluationScale::DEFAULT,
                'target' => $legacy->ref_value,
                'too_low' => $lower($legacy->ref_value_low_2),
                'low' => $lower($legacy->ref_value_low_2),
                'min' => $lower($legacy->ref_value_low_1),
                'max' => $legacy->ref_value_high_1,
                'increased' => $legacy->ref_value_high_2,
                'high' => $legacy->ref_value_high_2,
            ];

            // NYOS kennt nur Idealwert und idealen Bereich.
            if ($legacy->ref_value_nyos !== null) {
                $rows[] = $base + [
                    'scale_id' => 'nyos',
                    'target' => $legacy->ref_value_nyos,
                    'too_low' => null,
                    'low' => null,
                    'min' => $lower($legacy->ref_value_low_nyos),
                    'max' => $legacy->ref_value_high_nyos,
                    'increased' => null,
                    'high' => null,
                ];
            }
        }

        return [$rows, $unknown];
    }
}
