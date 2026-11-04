<?php

namespace App\Recommendations;

use App\Models\Element;
use App\Models\RecommendationCalculation;
use App\Models\RecommendationRule;

/**
 * Prüft eine Regel samt Blöcken und Berechnungen: Syntax, bekannte Variablen und Elemente,
 * Namen und Zirkelbezüge der Berechnungen, Pflichtsprache. Für den Adminbereich und Tests.
 */
class RuleValidator
{
    /** @var array<string, true>|null */
    private ?array $elementKeys = null;

    /**
     * @return list<string> Fehlermeldungen, leer = in Ordnung
     */
    public function validate(RecommendationRule $rule): array
    {
        $errors = [];
        $rule->loadMissing(['blocks', 'calculations']);
        $globals = RecommendationCalculation::whereNull('rule_id')->pluck('expression', 'name')->all();
        $own = $rule->calculations->pluck('expression', 'name')->all();
        $calculations = [...$globals, ...$own];

        foreach (['title', 'summary'] as $field) {
            if (blank($rule->{$field}[RecommendationEngine::REQUIRED_LANGUAGE] ?? null)) {
                $errors[] = sprintf('%s: Der deutsche Text fehlt.', $field);
            }
        }

        // Berechnungen: Name, Syntax, Bezüge
        $asts = [];
        foreach ($calculations as $name => $expression) {
            if (! preg_match('/^[a-z][a-z0-9_]{0,39}$/', $name)) {
                $errors[] = sprintf('Berechnung „%s“: Name nur aus Kleinbuchstaben, Ziffern und _.', $name);
            }
            if (in_array($name, [...RecommendationEngine::ELEMENT_FIELDS, ...RecommendationEngine::CONTEXT_VARIABLES], true) || isset($this->elementKeys()[$name])) {
                $errors[] = sprintf('Berechnung „%s“: Der Name ist bereits vergeben.', $name);
            }
            $asts[$name] = $this->check("Berechnung „{$name}“", fn () => Formula::parse($expression), $calculations, $errors);
        }
        foreach ($this->cycles($asts) as $cycle) {
            $errors[] = sprintf('Zirkelbezug in den Berechnungen: %s.', implode(' → ', $cycle));
        }

        foreach (['element_condition' => 'Bedingung je Element', 'condition' => 'Bedingung'] as $field => $label) {
            if (filled($rule->{$field})) {
                $this->check($label, fn () => Formula::parse($rule->{$field}), $calculations, $errors);
            }
        }
        foreach ([...RecommendationRule::TRANSLATED] as $field) {
            foreach ($rule->{$field} ?? [] as $language => $text) {
                $this->check("{$field} ({$language})", fn () => Template::parse((string) $text), $calculations, $errors, template: true);
            }
        }
        foreach ($rule->blocks as $index => $block) {
            $name = sprintf('Block %d (%s)', $index + 1, $block->type);
            if (! in_array($block->type, ['option', 'detail', 'tip'], true)) {
                $errors[] = "{$name}: unbekannter Typ.";
            }
            if (filled($block->condition)) {
                $this->check("{$name}, Bedingung", fn () => Formula::parse($block->condition), $calculations, $errors);
            }
            foreach (['label', 'text'] as $field) {
                foreach ($block->{$field} ?? [] as $language => $text) {
                    $this->check("{$name}, {$field} ({$language})", fn () => Template::parse((string) $text), $calculations, $errors, template: true);
                }
            }
        }
        foreach ($rule->scope_elements ?? [] as $key) {
            if (! isset($this->elementKeys()[RecommendationEngine::variableKey($key)])) {
                $errors[] = sprintf('Unbekanntes Element „%s“ im Scope.', $key);
            }
        }

        return $errors;
    }

    /**
     * @param  callable(): array<int, mixed>  $parse
     * @param  array<string, string>  $calculations
     * @param  list<string>  $errors
     * @return array<int, mixed>|null
     */
    private function check(string $label, callable $parse, array $calculations, array &$errors, bool $template = false): ?array
    {
        try {
            $parsed = $parse();
        } catch (FormulaException $e) {
            $errors[] = "{$label}: {$e->getMessage()}";

            return null;
        }
        $paths = $template ? Template::variables($parsed) : Formula::variables($parsed);
        foreach ($paths as $path) {
            if (! $this->known($path, $calculations)) {
                $errors[] = sprintf('%s: unbekannte Variable „%s“.', $label, implode('.', $path));
            }
        }

        return $parsed;
    }

    /**
     * @param  list<string>  $path
     * @param  array<string, string>  $calculations
     */
    private function known(array $path, array $calculations): bool
    {
        $elements = $this->elementKeys();
        [$head, $second, $third] = $path + [null, null, null];
        $field = fn (?string $name) => $name === null || in_array($name, RecommendationEngine::ELEMENT_FIELDS, true);

        if (count($path) === 1) {
            return array_key_exists($head, $calculations) || isset($elements[$head])
                || in_array($head, [...RecommendationEngine::ELEMENT_FIELDS, ...RecommendationEngine::CONTEXT_VARIABLES], true);
        }
        if ($head === 'osmosis') {
            return isset($elements[$second]) && count($path) <= 3 && $field($third);
        }

        return isset($elements[$head]) && count($path) === 2 && $field($second);
    }

    /**
     * @param  array<string, array<int, mixed>|null>  $asts
     * @return list<list<string>>
     */
    private function cycles(array $asts): array
    {
        $edges = [];
        foreach ($asts as $name => $ast) {
            $edges[$name] = $ast ? array_values(array_unique(array_filter(
                array_map(fn (array $path) => $path[0], Formula::variables($ast)),
                fn (string $head) => array_key_exists($head, $asts),
            ))) : [];
        }

        $found = [];
        $visit = function (string $name, array $stack) use (&$visit, &$found, $edges): void {
            if (in_array($name, $stack, true)) {
                $found[] = [...array_slice($stack, array_search($name, $stack, true)), $name];

                return;
            }
            foreach ($edges[$name] as $next) {
                $visit($next, [...$stack, $name]);
            }
        };
        foreach (array_keys($edges) as $name) {
            $visit($name, []);
        }

        // Jeder Zyklus nur einmal, unabhängig vom Startpunkt.
        $unique = [];
        foreach ($found as $cycle) {
            $members = array_slice($cycle, 0, -1);
            sort($members);
            $unique[implode(',', $members)] ??= $cycle;
        }

        return array_values($unique);
    }

    /** @return array<string, true> */
    private function elementKeys(): array
    {
        return $this->elementKeys ??= array_fill_keys(
            Element::pluck('key')->map(RecommendationEngine::variableKey(...))->all(), true,
        );
    }
}
