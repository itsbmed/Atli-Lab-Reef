<?php

namespace App\Console\Commands;

use App\Models\RecommendationRule;
use App\Recommendations\FormulaException;
use App\Recommendations\RuleValidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Übernimmt die alten Empfehlungstexte (elements_action) als inaktive Regeln, nur auf Deutsch.
 *
 *  · je Verknüpfung elements.elements_action_id_high2|high1|low1|low2 eine Regel mit einem Element,
 *    Key legacy-<element>-<stufe>; Stufe high2 → band >= 8, high1 → 6–7, low1 → 3–4, low2 → <= 2
 *  · Formeln ==…== werden zu Berechnungen calc_1, calc_2 … und im Text zu {{ calc_n }}
 *  · <br> wird Zeilenumbruch, <b>/<strong> wird **fett**, übrige Tags entfallen
 *  · neue Regeln sind inaktiv; im Adminbereich einzeln freischalten. Ein erneuter Lauf
 *    überschreibt Texte und Berechnungen, lässt aber is_active unverändert.
 *
 * Voraussetzung: AnalysisCatalogSeeder (Elemente). Wiederholbar.
 */
class ImportLegacyRecommendations extends Command
{
    protected $signature = 'legacy:import-recommendations
                            {--dry-run : Nur prüfen und zählen, nichts schreiben}';

    protected $description = 'Übernimmt die alten Empfehlungstexte als inaktive Regeln';

    /** Spalte in elements => [Bedingung, Bezeichnung] */
    public const LEVELS = [
        'high2' => ['band != null and band >= 8', 'deutlich erhöht'],
        'high1' => ['band in [6, 7]', 'erhöht'],
        'low1' => ['band in [3, 4]', 'niedrig'],
        'low2' => ['band != null and band <= 2', 'deutlich zu niedrig'],
    ];

    /** Variablen der alten Formeln (fparser) => neue Namen; Grenzen wie in legacy:import-catalog. */
    private const VARIABLES = [
        'eValue' => 'value',
        'eRefValue' => 'target',
        'eRefNormValue' => 'target',
        'eRefValueHigh1' => 'max',
        'eRefNormValueHigh1' => 'max',
        'eRefValueHigh2' => 'high',
        'eRefNormValueHigh2' => 'high',
        'eRefValueLow1' => 'min',
        'eRefNormValueLow1' => 'min',
        'eRefValueLow2' => 'low',
        'eRefNormValueLow2' => 'low',
        'tankVolume' => 'volume',
    ];

    /** Alte Vergleichsfunktionen => Operator */
    private const COMPARISONS = ['eq' => '==', 'ne' => '!=', 'gt' => '>', 'lt' => '<', 'ge' => '>=', 'le' => '<='];

    public function handle(RuleValidator $validator): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $legacy = DB::connection('legacy');
        $elements = DB::table('elements')->whereNotNull('legacy_id')->get(['id', 'legacy_id', 'key', 'name'])->keyBy('legacy_id');
        if ($elements->isEmpty()) {
            $this->error('Keine Elemente vorhanden – bitte zuerst php artisan db:seed --class=AnalysisCatalogSeeder ausführen.');

            return self::FAILURE;
        }

        $columns = array_map(fn (string $level) => "elements_action_id_{$level}", array_keys(self::LEVELS));
        $links = $legacy->table('elements')->get(['id', ...$columns]);
        $actions = $legacy->table('elements_action')->get(['id', 'name_de'])->keyBy('id');

        $counts = ['rules' => 0, 'with_formula' => 0, 'unknown_element' => 0, 'missing_text' => 0, 'invalid' => 0];
        $problems = [];

        DB::beginTransaction();
        try {
            foreach ($links as $link) {
                foreach (self::LEVELS as $level => [$condition, $label]) {
                    $actionId = (int) $link->{"elements_action_id_{$level}"};
                    if ($actionId <= 0) {
                        continue;
                    }
                    $element = $elements->get($link->id);
                    if (! $element) {
                        $counts['unknown_element']++;

                        continue;
                    }
                    $source = trim((string) ($actions->get($actionId)?->name_de ?? ''));
                    if ($source === '') {
                        $counts['missing_text']++;

                        continue;
                    }

                    try {
                        [$text, $calculations] = self::convertText($source);
                    } catch (FormulaException $e) {
                        $counts['invalid']++;
                        $problems[] = "elements_action #{$actionId}: {$e->getMessage()}";

                        continue;
                    }
                    $counts['rules']++;
                    if ($calculations) {
                        $counts['with_formula']++;
                    }
                    if ($dryRun) {
                        continue;
                    }

                    $name = json_decode($element->name, true)['de'] ?? $element->key;
                    $rule = RecommendationRule::firstOrNew(['key' => "legacy-{$element->key}-{$level}", 'evaluation_scale_id' => null]);
                    $rule->fill([
                        'name' => "Alttext: {$name} · {$label}",
                        'water_types' => ['Meerwasser'],
                        'scope_elements' => [$element->key],
                        'element_condition' => $condition,
                        'kicker' => ['de' => 'Laborempfehlung'],
                        'title' => ['de' => "{$name} {$label}"],
                        'summary' => ['de' => $text],
                        'sort_order' => 500,
                    ]);
                    if (! $rule->exists) {
                        $rule->is_active = false;
                    }
                    $rule->save();
                    $rule->calculations()->delete();
                    foreach ($calculations as $calcName => $expression) {
                        $rule->calculations()->create(['name' => $calcName, 'expression' => $expression, 'description' => "Aus elements_action #{$actionId}"]);
                    }
                    $rule->unsetRelation('calculations');
                    foreach ($validator->validate($rule) as $error) {
                        $problems[] = "{$rule->key}: {$error}";
                    }
                }
            }
            $dryRun ? DB::rollBack() : DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        $this->table(['', 'Anzahl'], collect($counts)->map(fn ($n, $k) => [$k, $n])->values()->all());
        foreach ($problems as $problem) {
            $this->warn($problem);
        }
        $this->info($dryRun ? 'Probelauf – nichts geschrieben.' : 'Übernommen; die Regeln sind inaktiv, bis sie im Adminbereich freigeschaltet werden.');

        return self::SUCCESS;
    }

    /**
     * Wandelt einen alten HTML-Text mit ==formel== in Text mit {{ calc_n }} und Berechnungen.
     *
     * @return array{0: string, 1: array<string, string>}
     */
    public static function convertText(string $html): array
    {
        $calculations = [];
        $placeholders = [];
        $withMarkers = preg_replace_callback('/==(.*?)==/s', function (array $m) use (&$calculations, &$placeholders) {
            $expression = self::convertFormula(html_entity_decode(strip_tags($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            // Dieselbe Formel mehrfach im Text = eine Berechnung.
            $name = array_search($expression, $calculations, true) ?: 'calc_'.(count($calculations) + 1);
            $calculations[$name] = $expression;
            $marker = "\u{E000}".count($placeholders)."\u{E001}";
            $placeholders[$marker] = "{{ {$name} }}";

            return $marker;
        }, $html);

        $text = preg_replace('#<br\s*/?>#i', "\n", $withMarkers);
        $text = preg_replace('#<(b|strong)\b[^>]*>(.*?)</\1>#is', '**$2**', $text);
        $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/[ \t\x{00A0}]+/u', ' ', $text);
        $text = trim(preg_replace('/ *\n */', "\n", $text));

        return [strtr($text, $placeholders), $calculations];
    }

    /**
     * fparser-Syntax → neue Formelsprache: [eValue] → value, round2(x) → round(x, 2),
     * if(c, a, b) → (c ? a : b), gt(a, b) → (a > b).
     */
    public static function convertFormula(string $formula): string
    {
        $converted = preg_replace_callback('/\[(\w+)\]/', function (array $m) {
            if (! isset(self::VARIABLES[$m[1]])) {
                throw new FormulaException("Unbekannte alte Variable [{$m[1]}].");
            }

            return self::VARIABLES[$m[1]];
        }, trim($formula));

        return self::rewriteCalls($converted);
    }

    private static function rewriteCalls(string $formula): string
    {
        if (! preg_match('/\b(round1|round2|if|eq|ne|gt|lt|ge|le)\s*\(/', $formula, $m, PREG_OFFSET_CAPTURE)) {
            return $formula;
        }
        $name = $m[1][0];
        $start = $m[0][1];
        $open = $start + strlen($m[0][0]) - 1;

        // Argumente bis zur passenden Klammer, Kommas nur auf oberster Ebene.
        $depth = 0;
        $args = [];
        $current = '';
        for ($i = $open + 1; $i < strlen($formula); $i++) {
            $char = $formula[$i];
            if ($char === '(') {
                $depth++;
            } elseif ($char === ')') {
                if ($depth === 0) {
                    break;
                }
                $depth--;
            } elseif ($char === ',' && $depth === 0) {
                $args[] = trim($current);
                $current = '';

                continue;
            }
            $current .= $char;
        }
        if ($i >= strlen($formula)) {
            throw new FormulaException("Klammer nach {$name}( wird nicht geschlossen.");
        }
        $args[] = trim($current);
        $args = array_map(self::rewriteCalls(...), $args);

        $replacement = match (true) {
            $name === 'round1' || $name === 'round2' => sprintf('round(%s, %d)', $args[0], $name === 'round1' ? 1 : 2),
            $name === 'if' && count($args) === 3 => sprintf('(%s ? %s : %s)', ...$args),
            isset(self::COMPARISONS[$name]) && count($args) === 2 => sprintf('(%s %s %s)', $args[0], self::COMPARISONS[$name], $args[1]),
            default => throw new FormulaException("{$name}() mit unerwarteter Anzahl Argumente."),
        };

        return self::rewriteCalls(substr($formula, 0, $start).$replacement.substr($formula, $i + 1));
    }
}
