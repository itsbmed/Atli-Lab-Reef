<?php

namespace App\Recommendations;

/**
 * Textvorlage mit Platzhaltern {{ formel }} und Blöcken {{#if …}} {{#elseif …}} {{else}} {{/if}}.
 *
 * Baum-Knoten: ['text', string] ['expr', ast] ['if', [[ast, kinder], …], kinder|null]
 */
class Template
{
    /** Verbindungswort für Aufzählungen ({{ affected }}) je Sprache. */
    private const AND = ['de' => 'und', 'en' => 'and', 'fr' => 'et', 'it' => 'e', 'es' => 'y', 'cn' => '和'];

    /** Sprachen mit Dezimalpunkt; alle übrigen schreiben 1.234,5. */
    private const DECIMAL_POINT = ['en', 'cn'];

    /**
     * @return list<array<int, mixed>>
     *
     * @throws FormulaException
     */
    public static function parse(string $source): array
    {
        if (preg_match_all('/\{\{\s*(?:(#if|#elseif|else|\/if)\b)?\s*(.*?)\s*\}\}/s', $source, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE) === false) {
            throw new FormulaException('Die Vorlage lässt sich nicht lesen.');
        }

        // Flache Liste aus Text und Tags, danach rekursiv zu einem Baum.
        $tokens = [];
        $offset = 0;
        foreach ($matches as $match) {
            [$whole, $at] = $match[0];
            if ($at > $offset) {
                $tokens[] = ['text', substr($source, $offset, $at - $offset), ''];
            }
            $offset = $at + strlen($whole);
            $tokens[] = [$match[1][0] ?? '' ?: 'expr', trim($match[2][0] ?? ''), $whole];
        }
        if ($offset < strlen($source)) {
            $tokens[] = ['text', substr($source, $offset), ''];
        }
        foreach ($tokens as $token) {
            if ($token[0] === 'text' && preg_match('/\{\{|\}\}/', $token[1])) {
                throw new FormulaException('Nicht geschlossener Platzhalter: „{{“ und „}}“ müssen paarweise stehen.');
            }
        }

        $i = 0;
        $tree = self::nodes($tokens, $i);
        if ($i < count($tokens)) {
            throw new FormulaException(sprintf('%s ohne vorheriges {{#if}}.', $tokens[$i][2]));
        }

        return $tree;
    }

    /**
     * Liest Knoten bis zum Ende oder bis zu einem Tag, der den umgebenden Block fortsetzt
     * ({{#elseif}}, {{else}}, {{/if}}); dieser bleibt für den Aufrufer stehen.
     *
     * @param  list<array{0: string, 1: string, 2: string}>  $tokens
     * @return list<array<int, mixed>>
     */
    private static function nodes(array $tokens, int &$i): array
    {
        $nodes = [];
        while ($i < count($tokens)) {
            [$type, $body, $whole] = $tokens[$i];
            if (in_array($type, ['#elseif', 'else', '/if'], true)) {
                return $nodes;
            }
            $i++;
            if ($type === 'text') {
                $nodes[] = ['text', $body];

                continue;
            }
            if ($type === 'expr') {
                $nodes[] = ['expr', self::formula($body, $whole, 'Leerer Platzhalter {{ }}.')];

                continue;
            }

            // {{#if}}
            $branches = [[self::formula($body, $whole, '{{#if}} braucht eine Bedingung.'), self::nodes($tokens, $i)]];
            $else = null;
            while (true) {
                if ($i >= count($tokens)) {
                    throw new FormulaException('{{#if}} wird nicht mit {{/if}} geschlossen.');
                }
                [$next, $nextBody, $nextWhole] = $tokens[$i];
                $i++;
                if ($next === '/if') {
                    break;
                }
                if ($else !== null) {
                    throw new FormulaException($next === 'else' ? 'Ein {{#if}} hat höchstens ein {{else}}.' : '{{#elseif}} nach {{else}} ist nicht erlaubt.');
                }
                if ($next === '#elseif') {
                    $branches[] = [self::formula($nextBody, $nextWhole, '{{#elseif}} braucht eine Bedingung.'), self::nodes($tokens, $i)];
                } else {
                    $else = self::nodes($tokens, $i);
                }
            }
            $nodes[] = ['if', $branches, $else];
        }

        return $nodes;
    }

    /** @return array<int, mixed> */
    private static function formula(string $body, string $whole, string $emptyMessage): array
    {
        if ($body === '') {
            throw new FormulaException($emptyMessage);
        }
        try {
            return Formula::parse($body);
        } catch (FormulaException $e) {
            throw new FormulaException(sprintf('%s (in „%s“)', $e->getMessage(), $whole), previous: $e);
        }
    }

    /**
     * Rendert den Baum. Liefert den Text und Hinweise auf leere Platzhalter.
     *
     * @param  list<array<int, mixed>>  $tree
     * @param  callable(list<string>): mixed  $resolve
     * @return array{0: string, 1: list<string>}
     */
    public static function render(array $tree, callable $resolve, string $language = 'de'): array
    {
        $warnings = [];
        $text = self::renderNodes($tree, $resolve, $language, $warnings);

        return [$text, $warnings];
    }

    /**
     * @param  list<array<int, mixed>>  $tree
     * @return list<list<string>>
     */
    public static function variables(array $tree): array
    {
        $paths = [];
        foreach ($tree as $node) {
            if ($node[0] === 'expr') {
                array_push($paths, ...Formula::variables($node[1]));
            } elseif ($node[0] === 'if') {
                foreach ($node[1] as [$condition, $children]) {
                    array_push($paths, ...Formula::variables($condition), ...self::variables($children));
                }
                array_push($paths, ...self::variables($node[2] ?? []));
            }
        }

        return $paths;
    }

    public static function formatNumber(float|int $value, string $language = 'de'): string
    {
        $point = in_array($language, self::DECIMAL_POINT, true);
        $rounded = round((float) $value, 4);
        $decimals = strlen(rtrim(substr(strrchr(number_format($rounded, 4, '.', ''), '.'), 1), '0'));
        if ($rounded == 0.0) {
            $rounded = 0.0;
        }

        return number_format($rounded, $decimals, $point ? '.' : ',', abs($rounded) >= 1000 ? ($point ? ',' : '.') : '');
    }

    /**
     * @param  list<array<int, mixed>>  $nodes
     * @param  list<string>  $warnings
     */
    private static function renderNodes(array $nodes, callable $resolve, string $language, array &$warnings): string
    {
        $out = '';
        foreach ($nodes as $node) {
            if ($node[0] === 'text') {
                $out .= $node[1];
            } elseif ($node[0] === 'expr') {
                $out .= self::display(Formula::evaluate($node[1], $resolve), $language, $warnings, $node[1]);
            } else {
                $chosen = $node[2] ?? [];
                foreach ($node[1] as [$condition, $children]) {
                    if (Formula::truthy(Formula::evaluate($condition, $resolve))) {
                        $chosen = $children;
                        break;
                    }
                }
                $out .= self::renderNodes($chosen, $resolve, $language, $warnings);
            }
        }

        return $out;
    }

    /**
     * @param  list<string>  $warnings
     * @param  array<int, mixed>  $ast
     */
    private static function display(mixed $value, string $language, array &$warnings, array $ast): string
    {
        if ($value === null) {
            $warnings[] = sprintf('Leerer Wert: %s', implode(', ', array_map(fn ($p) => implode('.', $p), Formula::variables($ast))) ?: 'Formel');

            return '–';
        }
        if (is_bool($value)) {
            return '';
        }
        if (is_int($value) || is_float($value)) {
            return self::formatNumber($value, $language);
        }
        if (is_array($value)) {
            $items = array_map(fn ($item) => '**'.(is_scalar($item) ? (string) $item : '').'**', array_values($value));
            if (count($items) < 2) {
                return $items[0] ?? '';
            }
            $last = array_pop($items);

            return implode(', ', $items).' '.(self::AND[$language] ?? self::AND['en']).' '.$last;
        }

        return (string) $value;
    }
}
