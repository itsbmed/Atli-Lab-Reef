<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Übernimmt alle Barcodes aus der alten Datenbank (Verbindung "legacy", Tabelle analysis_vouchers),
 * auch ungenutzte – sie lassen sich im neuen System weiter aktivieren.
 *
 *  · analysis_type 0 / 1 / 2 → Paket icp-oes / icp-basic (kostenlos) / icp-ms
 *  · Codes bleiben unverändert (ältere Barcodes weichen teils vom Format XXXX-XXXX-XXXX-XXXX ab)
 *  · doppelte Codes: nur der erste Eintrag wird übernommen
 *
 * Welche Analyse einen Barcode eingelöst hat, setzt legacy:import-analyses.
 * Voraussetzung: AnalysisCatalogSeeder (Pakete). Wiederholbar.
 */
class ImportLegacyVouchers extends Command
{
    protected $signature = 'legacy:import-vouchers
                            {--dry-run : Nur prüfen und zählen, nichts schreiben}
                            {--chunk=5000 : Datensätze pro Durchlauf}';

    protected $description = 'Übernimmt die Barcodes aus der alten ATI-Datenbank';

    /** analysis_type der kostenlosen Barcodes (Free ICP) */
    private const FREE_TYPE = 1;

    /** @var array<string, true> */
    private array $codes = [];

    /** @var array<string, int> */
    private array $counts = [];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $packages = DB::table('analysis_packages')->whereNotNull('legacy_type')->pluck('id', 'legacy_type');
        if ($packages->isEmpty()) {
            $this->error('Keine Pakete vorhanden – bitte zuerst php artisan db:seed --class=AnalysisCatalogSeeder ausführen.');

            return self::FAILURE;
        }

        // Codes von Barcodes, die nicht aus dem Altsystem stammen, sind belegt.
        $this->codes = DB::table('vouchers')->whereNull('legacy_id')->pluck('code')->flip()->map(fn () => true)->all();

        DB::connection('legacy')->table('analysis_vouchers')
            ->select(['id', 'voucher', 'analysis_type', 'analysis_sub_type', 'created_at', 'updated_at'])
            ->orderBy('id')
            ->chunkById((int) $this->option('chunk'), function (Collection $rows) use ($dryRun, $packages) {
                $batch = [];
                foreach ($rows as $row) {
                    $code = strtoupper(trim((string) $row->voucher));
                    $type = (int) $row->analysis_type;
                    if ($code === '' || isset($this->codes[$code])) {
                        $this->count('duplicate');

                        continue;
                    }
                    if (! isset($packages[$type])) {
                        $this->count('unknown_type');

                        continue;
                    }
                    $this->codes[$code] = true;
                    $this->count("package:{$type}");

                    $createdAt = $this->validDate($row->created_at) ?? now()->toDateTimeString();
                    $batch[] = [
                        'legacy_id' => (int) $row->id,
                        'code' => $code,
                        'package_id' => $packages[$type],
                        'is_free' => $type === self::FREE_TYPE,
                        'legacy_sub_type' => $row->analysis_sub_type,
                        'created_at' => $createdAt,
                        'updated_at' => $this->validDate($row->updated_at) ?? $createdAt,
                    ];
                }

                if (! $dryRun && $batch) {
                    DB::table('vouchers')->upsert($batch, ['legacy_id'], ['code', 'package_id', 'is_free', 'legacy_sub_type', 'updated_at']);
                }
            });

        $this->table(['', 'Anzahl'], [
            ['ICP-OES', $this->counts['package:0'] ?? 0],
            ['ICP-Basic (kostenlos)', $this->counts['package:1'] ?? 0],
            ['ICP-MS', $this->counts['package:2'] ?? 0],
            ['Übersprungen (doppelter oder leerer Code)', $this->counts['duplicate'] ?? 0],
            ['Übersprungen (unbekannter Typ)', $this->counts['unknown_type'] ?? 0],
        ]);

        if ($dryRun) {
            $this->info('Probelauf – es wurde nichts geschrieben.');
        }

        return self::SUCCESS;
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
