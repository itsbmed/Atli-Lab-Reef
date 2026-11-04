<?php

namespace App\Console\Commands;

use App\Enums\AnalysisStatus;
use App\Models\Analysis;
use App\Recommendations\RecommendationEngine;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Throwable;

/**
 * Erzeugt die Empfehlungen (analysis_recommendations) für abgeschlossene Hauptanalysen neu.
 * Nötig nach Importen, die keine Modell-Events auslösen (legacy:import-analyses), und nach
 * Änderungen an Regeln, wenn bestehende Berichte nachziehen sollen. Vom Labor bearbeitete
 * Einträge bleiben erhalten. Wiederholbar.
 */
class GenerateRecommendations extends Command
{
    protected $signature = 'recommendations:generate
                            {--analysis=* : Nur diese Analyse-IDs}
                            {--missing : Nur Analysen ohne Empfehlungen}
                            {--chunk=200 : Analysen pro Durchlauf}';

    protected $description = 'Erzeugt die Empfehlungen abgeschlossener Analysen neu';

    public function handle(RecommendationEngine $engine): int
    {
        $query = Analysis::query()
            ->whereNull('parent_id')
            ->where('status', AnalysisStatus::Completed->value)
            ->when($this->option('analysis'), fn ($q, $ids) => $q->whereIn('id', $ids))
            ->when($this->option('missing'), fn ($q) => $q->whereDoesntHave('recommendations'));

        $total = $query->count();
        if ($total === 0) {
            $this->info('Keine passenden Analysen.');

            return self::SUCCESS;
        }

        $analyses = 0;
        $cards = 0;
        $failed = 0;
        $bar = $this->output->createProgressBar($total);
        $query->chunkById((int) $this->option('chunk'), function (Collection $chunk) use ($engine, $bar, &$analyses, &$cards, &$failed) {
            foreach ($chunk as $analysis) {
                try {
                    $cards += $engine->generate($analysis);
                    $analyses++;
                } catch (Throwable $e) {
                    $failed++;
                    report($e);
                }
                $bar->advance();
            }
        });
        $bar->finish();
        $this->newLine(2);

        $this->table(['', 'Anzahl'], [['Analysen', $analyses], ['Empfehlungen', $cards], ['Fehler', $failed]]);

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
