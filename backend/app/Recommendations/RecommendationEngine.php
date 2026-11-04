<?php

namespace App\Recommendations;

use App\Enums\AnalysisStatus;
use App\Models\Analysis;
use App\Models\AnalysisRecommendation;
use App\Models\RecommendationCalculation;
use App\Models\RecommendationRule;
use App\Models\RecommendationRuleBlock;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Wertet die Empfehlungsregeln für eine Analyse aus und speichert den Snapshot
 * (analysis_recommendations). Siehe docs/schema-recommendations.md.
 */
class RecommendationEngine
{
    /** Höchstzahl der Karten je Analyse, wie bisher im Frontend. */
    public const MAX_CARDS = 6;

    public const DEFAULT_ELEMENT_CONDITION = 'band != null and band != 5';

    public const DEFAULT_CONDITION = 'affected_count > 0';

    /** Pflichtsprache; fehlende Übersetzungen fallen auf en und dann auf de zurück. */
    public const REQUIRED_LANGUAGE = 'de';

    /** Werte des betroffenen Elements, die als einfache Variable verfügbar sind. */
    public const ELEMENT_FIELDS = ['value', 'band', 'unit', 'target', 'min', 'max', 'critLow', 'tooLow', 'low', 'increased', 'high', 'tooHigh', 'key', 'label'];

    public const CONTEXT_VARIABLES = ['volume', 'supplyParts', 'hasOsmosis', 'resinFilter', 'waterType', 'affected', 'affected_count', 'severity', 'osmosis'];

    /**
     * Erzeugt den Snapshot neu. Vom Labor bearbeitete Einträge bleiben stehen und ihre Regel
     * wird nicht erneut angelegt.
     */
    public function generate(Analysis $analysis): int
    {
        $context = AnalysisContext::for($analysis);
        $drafts = $this->evaluate($context);

        return DB::transaction(function () use ($analysis, $context, $drafts) {
            $edited = $analysis->recommendations()->where('is_edited', true)->pluck('rule_id')->filter()->all();
            $analysis->recommendations()->where('is_edited', false)->delete();

            $count = 0;
            foreach ($drafts as $index => $draft) {
                if (in_array($draft['rule']->id, $edited, true)) {
                    continue;
                }
                AnalysisRecommendation::create([
                    'analysis_id' => $analysis->id,
                    'rule_id' => $draft['rule']->id,
                    'rule_key' => $draft['rule']->key,
                    'rule_version' => $draft['rule']->updated_at,
                    'content' => $draft['content'],
                    'elements' => $draft['elements'],
                    'tone' => $draft['tone'],
                    'priority' => $draft['priority'],
                    'recheck_days' => $draft['rule']->recheck_days,
                    'inputs' => $context->inputs,
                    'sort_order' => ($index + 1) * 10,
                ]);
                $count++;
            }
            $analysis->unsetRelation('recommendations');

            return $count;
        });
    }

    /**
     * Für Modell-Events: erzeugt den Snapshot, sobald eine Analyse abgeschlossen ist. Für eine
     * Probe (Osmose, Meersalz) wird die Hauptanalyse neu ausgewertet. Fehler brechen das
     * Speichern der Analyse nicht ab.
     */
    public function generateWhenCompleted(Analysis $analysis): void
    {
        $target = $analysis->parent_id ? $analysis->parent : $analysis;
        if (! $target || $target->status !== AnalysisStatus::Completed) {
            return;
        }
        try {
            $this->generate($target);
        } catch (Throwable $e) {
            report($e);
        }
    }

    /**
     * Wertet alle passenden Regeln aus, sortiert nach Schwere und begrenzt auf MAX_CARDS.
     *
     * @param  Collection<int, RecommendationRule>|null  $rules  Vorgabe für Vorschau/Tests
     * @return list<array<string, mixed>>
     */
    public function evaluate(AnalysisContext $context, ?Collection $rules = null): array
    {
        $rules ??= RecommendationRule::with(['blocks.product', 'calculations'])->get();
        $globals = RecommendationCalculation::whereNull('rule_id')->get();

        $drafts = [];
        foreach ($this->applicable($rules, $context) as $rule) {
            try {
                $draft = $this->evaluateRule($rule, $context, $globals);
            } catch (FormulaException $e) {
                Log::warning('Empfehlungsregel lässt sich nicht auswerten', ['rule' => $rule->key, 'error' => $e->getMessage()]);

                continue;
            }
            if ($draft) {
                $drafts[] = $draft;
            }
        }

        usort($drafts, fn (array $a, array $b) => [$b['severity'], $a['rule']->sort_order, $a['rule']->key]
            <=> [$a['severity'], $b['rule']->sort_order, $b['rule']->key]);

        return array_slice($drafts, 0, self::MAX_CARDS);
    }

    /**
     * Je key gilt die Regel der Skala der Analyse, sonst die globale. Eine inaktive
     * Skalen-Regel schaltet die globale für diese Skala ab.
     *
     * @param  Collection<int, RecommendationRule>  $rules
     * @return Collection<int, RecommendationRule>
     */
    private function applicable(Collection $rules, AnalysisContext $context): Collection
    {
        return $rules->groupBy('key')
            ->map(fn (Collection $variants) => $variants->firstWhere('evaluation_scale_id', $context->inputs['scale'])
                ?? $variants->firstWhere('evaluation_scale_id', null))
            ->filter(fn (?RecommendationRule $rule) => $rule && $rule->is_active
                && (empty($rule->water_types) || in_array($context->inputs['waterType'], $rule->water_types, true)))
            ->values();
    }

    /**
     * @param  Collection<int, RecommendationCalculation>  $globals
     * @return array<string, mixed>|null
     */
    private function evaluateRule(RecommendationRule $rule, AnalysisContext $context, Collection $globals): ?array
    {
        $sample = $rule->scope_sample === AnalysisContext::OSMOSIS_METHOD ? $context->osmosis : $context->sample;
        if ($sample === null) {
            return null;
        }

        $calculations = [];
        foreach ([...$globals, ...$rule->calculations] as $calculation) {
            $calculations[$calculation->name] = Formula::parse($calculation->expression);
        }

        // Betroffene Elemente: Scope der Regel, gefiltert nach der Bedingung je Element.
        $elementCondition = Formula::parse($rule->element_condition ?: self::DEFAULT_ELEMENT_CONDITION);
        $affected = [];
        foreach ($this->scopeKeys($rule, $sample) as $key) {
            $entry = $sample[$key] ?? null;
            if (! $entry || ($entry['value'] === null && $entry['band'] === null)) {
                continue;
            }
            $resolve = $this->resolver($context, $entry, [], $calculations, self::REQUIRED_LANGUAGE);
            if (Formula::truthy(Formula::evaluate($elementCondition, $resolve))) {
                $affected[] = $entry;
            }
        }

        $deviations = array_map(fn (array $entry) => abs($entry['band'] - 5), array_filter($affected, fn ($entry) => $entry['band'] !== null));
        // Ohne Stufe (z. B. Funde in der Osmoseprobe) zählt ein Fund wie „erhöht“.
        $severity = $deviations ? max($deviations) : 2;

        $base = $this->resolver($context, $affected[0] ?? null, $affected, $calculations, self::REQUIRED_LANGUAGE, $severity);
        if (! Formula::truthy(Formula::evaluate(Formula::parse($rule->condition ?: self::DEFAULT_CONDITION), $base))) {
            return null;
        }

        // Blockbedingungen hängen nicht von der Sprache ab.
        $blocks = $rule->blocks->filter(fn (RecommendationRuleBlock $block) => ! $block->condition
            || Formula::truthy(Formula::evaluate(Formula::parse($block->condition), $base)));

        $content = [];
        $warnings = [];
        foreach ($this->languages($rule) as $language) {
            $resolve = $this->resolver($context, $affected[0] ?? null, $affected, $calculations, $language, $severity);
            $text = function (?array $translations) use ($language, $resolve, &$warnings): string {
                $source = self::translate($translations, $language);
                if ($source === '') {
                    return '';
                }
                [$rendered, $found] = Template::render(Template::parse($source), $resolve, $language);
                array_push($warnings, ...$found);

                return trim($rendered);
            };
            $content[$language] = [
                'kicker' => $text($rule->kicker),
                'title' => $text($rule->title),
                'summary' => $text($rule->summary),
                'actionLabel' => $text($rule->action_label),
                'detailLabel' => $text($rule->detail_label),
                'action' => $rule->action,
                'options' => $blocks->where('type', 'option')->map(fn ($block) => [
                    'label' => $text($block->label),
                    'text' => $text($block->text),
                    'action' => $block->action,
                ])->values()->all(),
                'details' => $blocks->where('type', 'detail')->map(fn ($block) => [
                    'label' => $text($block->label),
                    'value' => $text($block->text),
                    'action' => $block->action,
                    'product' => $block->product ? [
                        'key' => $block->product->key,
                        'name' => self::translate($block->product->name, $language),
                        'url' => self::translate($block->product->url, $language) ?: null,
                        'image' => $block->product->image,
                    ] : null,
                ])->values()->all(),
                'tips' => $blocks->where('type', 'tip')->map(fn ($block) => $text($block->text))->filter()->values()->all(),
            ];
        }

        return [
            'rule' => $rule,
            'elements' => array_column($affected, 'key'),
            'severity' => $severity,
            'tone' => $severity >= 3 ? 'critical' : 'watch',
            'priority' => $rule->priority ?? ($severity >= 3 ? 'high' : 'medium'),
            'content' => $content,
            'warnings' => array_values(array_unique($warnings)),
        ];
    }

    /**
     * @param  array<string, array<string, mixed>>  $sample
     * @return list<string>
     */
    private function scopeKeys(RecommendationRule $rule, array $sample): array
    {
        // Reihenfolge wie in den Messwerten (Sortierung der Elemente).
        $listed = array_flip($rule->scope_elements ?? []);
        $group = $rule->scope_group_id ? (int) $rule->scope_group_id : null;

        return array_keys(array_filter($sample, fn (array $entry, string $key) => isset($listed[$key]) || $entry['group_id'] === $group, ARRAY_FILTER_USE_BOTH));
    }

    /**
     * Variablen für Formeln und Texte. Berechnungen werden bei Bedarf ausgewertet und gemerkt.
     *
     * @param  array<string, mixed>|null  $primary
     * @param  list<array<string, mixed>>  $affected
     * @param  array<string, array<int, mixed>>  $calculations
     * @return callable(list<string>): mixed
     */
    private function resolver(AnalysisContext $context, ?array $primary, array $affected, array $calculations, string $language, int $severity = 0): callable
    {
        $element = fn (array $entry) => [...$entry, 'label' => self::translate($entry['name'], $language)];
        $sampleMap = fn (?array $sample) => $sample === null ? null : collect($sample)
            ->mapWithKeys(fn (array $entry, string $key) => [self::variableKey($key) => $element($entry)])->all();

        $root = [
            ...($sampleMap($context->sample) ?? []),
            ...array_fill_keys(self::ELEMENT_FIELDS, null),
            ...($primary ? array_intersect_key($element($primary), array_flip(self::ELEMENT_FIELDS)) : []),
            'volume' => $context->inputs['volume'],
            'supplyParts' => $context->inputs['supplyParts'],
            'hasOsmosis' => $context->inputs['hasOsmosis'],
            'resinFilter' => $context->inputs['resinFilter'],
            'waterType' => $context->inputs['waterType'],
            'osmosis' => $sampleMap($context->osmosis),
            'affected' => array_map(fn (array $entry) => self::translate($entry['name'], $language), $affected),
            'affected_count' => count($affected),
            'severity' => $severity,
        ];

        $memo = [];
        $running = [];
        $resolve = null;
        $resolve = function (array $path) use (&$resolve, &$memo, &$running, $root, $calculations) {
            $head = array_shift($path);
            if (array_key_exists($head, $calculations)) {
                if (! array_key_exists($head, $memo)) {
                    // Zirkelbezug: lehnt die Prüfung beim Speichern ab, hier nur absichern.
                    if (isset($running[$head])) {
                        return null;
                    }
                    $running[$head] = true;
                    $memo[$head] = Formula::evaluate($calculations[$head], $resolve);
                    unset($running[$head]);
                }
                $value = $memo[$head];
            } else {
                $value = $root[$head] ?? null;
            }
            foreach ($path as $segment) {
                if (! is_array($value) || ! array_key_exists($segment, $value)) {
                    return null;
                }
                $value = $value[$segment];
            }

            return $value;
        };

        return $resolve;
    }

    /**
     * Sprachen, in denen die Regel Texte hat; de immer.
     *
     * @return list<string>
     */
    private function languages(RecommendationRule $rule): array
    {
        $languages = [self::REQUIRED_LANGUAGE];
        foreach (RecommendationRule::TRANSLATED as $field) {
            array_push($languages, ...array_keys($rule->{$field} ?? []));
        }
        foreach ($rule->blocks as $block) {
            array_push($languages, ...array_keys($block->label ?? []), ...array_keys($block->text ?? []));
        }

        return array_values(array_unique(array_filter($languages, fn ($language) => is_string($language) && preg_match('/^[a-z]{2}$/', $language))));
    }

    /**
     * @param  array<string, string>|null  $translations
     */
    public static function translate(?array $translations, string $language): string
    {
        if (! $translations) {
            return '';
        }
        foreach ([$language, 'en', self::REQUIRED_LANGUAGE] as $candidate) {
            if (filled($translations[$candidate] ?? null)) {
                return (string) $translations[$candidate];
            }
        }

        return '';
    }

    /** Element-Keys mit Bindestrich (ratio-mg-ca) heißen in Formeln ratio_mg_ca. */
    public static function variableKey(string $elementKey): string
    {
        return str_replace('-', '_', $elementKey);
    }
}
