<?php

namespace App\Recommendations;

/**
 * Formelsprache der Empfehlungen (siehe docs/formula-language.md).
 *
 * Bewusst ohne eval und ohne fremde Expression-Engine: Ein fehlender Wert (null) zieht
 * sich durch jede Rechnung, statt als 0 weiterzurechnen. Erlaubt sind nur Zahlen, Texte,
 * Listen, Variablen (auch mit Punkt: salinity.value), Operatoren und die Funktionen aus
 * FUNCTIONS.
 *
 * AST-Knoten sind Arrays: ['num', v] ['str', v] ['lit', v] ['var', [segmente]] ['list', [knoten]]
 * ['call', name, [knoten]] ['un', op, knoten] ['bin', op, links, rechts] ['tern', bedingung, ja, nein]
 */
class Formula
{
    /** Funktionsname => [min. Argumente, max. Argumente (null = beliebig)] */
    public const FUNCTIONS = [
        'round' => [1, 2],
        'floor' => [1, 1],
        'ceil' => [1, 1],
        'abs' => [1, 1],
        'min' => [1, null],
        'max' => [1, null],
        'clamp' => [3, 3],
        'plural' => [3, 3],
        'coalesce' => [1, null],
    ];

    private const KEYWORDS = ['and', 'or', 'not', 'in', 'true', 'false', 'null'];

    /** Schreibweisen, die beim Tippen oder Einfügen aus Word entstehen (nur außerhalb von Texten). */
    private const NORMALIZE = ['−' => '-', '×' => '*', '÷' => '/', '≤' => '<=', '≥' => '>=', '≠' => '!='];

    /** @var list<array{0: string, 1: mixed, 2: int}> */
    private array $tokens = [];

    private int $pos = 0;

    private function __construct(private readonly string $source) {}

    /**
     * @return array<int, mixed>
     *
     * @throws FormulaException
     */
    public static function parse(string $source): array
    {
        // Texte in Anführungszeichen bleiben, wie sie sind.
        $parts = preg_split('/(\'[^\']*\'|"[^"]*")/', $source, -1, PREG_SPLIT_DELIM_CAPTURE) ?: [$source];
        $normalized = implode('', array_map(fn (string $part, int $i) => $i % 2 ? $part : strtr($part, self::NORMALIZE), $parts, array_keys($parts)));
        $parser = new self($normalized);
        $parser->tokenize();
        if ($parser->peek()[0] === 'end') {
            throw new FormulaException('Die Formel ist leer.');
        }
        $ast = $parser->expression();
        $token = $parser->peek();
        if ($token[0] !== 'end') {
            throw new FormulaException(sprintf('Unerwartetes „%s“ an Stelle %d.', $token[1], $token[2] + 1));
        }

        return $ast;
    }

    /**
     * Wertet einen AST aus. $resolve bekommt die Segmente einer Variablen (['salinity', 'value'])
     * und liefert den Wert oder null.
     *
     * @param  array<int, mixed>  $node
     * @param  callable(list<string>): mixed  $resolve
     */
    public static function evaluate(array $node, callable $resolve): mixed
    {
        return match ($node[0]) {
            'num', 'str', 'lit' => $node[1],
            'var' => $resolve($node[1]),
            'list' => array_map(fn (array $item) => self::evaluate($item, $resolve), $node[1]),
            'call' => self::call($node[1], $node[2], $resolve),
            'un' => self::unary($node[1], self::evaluate($node[2], $resolve)),
            'tern' => self::truthy(self::evaluate($node[1], $resolve)) ? self::evaluate($node[2], $resolve) : self::evaluate($node[3], $resolve),
            'bin' => self::binary($node[1], $node[2], $node[3], $resolve),
        };
    }

    /**
     * Alle Variablen eines AST als Segmentlisten, z. B. [['value'], ['salinity', 'target']].
     *
     * @param  array<int, mixed>  $node
     * @return list<list<string>>
     */
    public static function variables(array $node): array
    {
        return match ($node[0]) {
            'var' => [$node[1]],
            'list', 'call' => array_merge([], ...array_map(self::variables(...), $node[0] === 'list' ? $node[1] : $node[2])),
            'un' => self::variables($node[2]),
            'bin' => [...self::variables($node[2]), ...self::variables($node[3])],
            'tern' => [...self::variables($node[1]), ...self::variables($node[2]), ...self::variables($node[3])],
            default => [],
        };
    }

    public static function truthy(mixed $value): bool
    {
        return ! ($value === null || $value === false || $value === 0 || $value === 0.0 || $value === '' || $value === []);
    }

    // --- Auswertung ---------------------------------------------------------------------

    /**
     * @param  array<int, mixed>  $left
     * @param  array<int, mixed>  $right
     */
    private static function binary(string $op, array $left, array $right, callable $resolve): mixed
    {
        // Kurzschluss: rechts wird nur bei Bedarf ausgewertet.
        if ($op === 'and') {
            return self::truthy(self::evaluate($left, $resolve)) && self::truthy(self::evaluate($right, $resolve));
        }
        if ($op === 'or') {
            return self::truthy(self::evaluate($left, $resolve)) || self::truthy(self::evaluate($right, $resolve));
        }
        if ($op === '??') {
            return self::evaluate($left, $resolve) ?? self::evaluate($right, $resolve);
        }

        $a = self::evaluate($left, $resolve);
        $b = self::evaluate($right, $resolve);

        return match ($op) {
            '==' => self::equals($a, $b),
            '!=' => ! self::equals($a, $b),
            '<', '>', '<=', '>=' => self::compare($op, $a, $b),
            'in' => self::contains($b, $a),
            'not in' => ! self::contains($b, $a),
            default => self::arithmetic($op, $a, $b),
        };
    }

    private static function arithmetic(string $op, mixed $a, mixed $b): mixed
    {
        if ($a === null || $b === null) {
            return null;
        }
        if ($op === '+' && (is_string($a) || is_string($b))) {
            return self::text($a).self::text($b);
        }
        $a = self::number($a);
        $b = self::number($b);
        if ($a === null || $b === null) {
            return null;
        }

        return match ($op) {
            '+' => $a + $b,
            '-' => $a - $b,
            '*' => $a * $b,
            '/' => $b == 0 ? null : $a / $b,
            '%' => $b == 0 ? null : fmod($a, $b),
            '**' => is_nan($r = $a ** $b) || is_infinite($r) ? null : $r,
        };
    }

    private static function unary(string $op, mixed $value): mixed
    {
        if ($op === 'not') {
            return ! self::truthy($value);
        }
        $number = self::number($value);

        return $number === null ? null : -$number;
    }

    private static function equals(mixed $a, mixed $b): bool
    {
        if ($a === null || $b === null) {
            return $a === $b;
        }
        if (is_numeric($a) && is_numeric($b)) {
            return abs((float) $a - (float) $b) < 1e-9;
        }

        return $a === $b;
    }

    private static function contains(mixed $list, mixed $needle): bool
    {
        if (! is_array($list) || $needle === null) {
            return false;
        }
        foreach ($list as $item) {
            if (self::equals($needle, $item)) {
                return true;
            }
        }

        return false;
    }

    /** Vergleiche mit einem fehlenden Wert sind immer falsch. */
    private static function compare(string $op, mixed $a, mixed $b): bool
    {
        $a = self::number($a);
        $b = self::number($b);
        if ($a === null || $b === null) {
            return false;
        }

        return match ($op) {
            '<' => $a < $b,
            '>' => $a > $b,
            '<=' => $a <= $b,
            '>=' => $a >= $b,
        };
    }

    /**
     * @param  list<array<int, mixed>>  $args
     */
    private static function call(string $name, array $args, callable $resolve): mixed
    {
        $values = array_map(fn (array $arg) => self::evaluate($arg, $resolve), $args);

        if ($name === 'coalesce') {
            foreach ($values as $value) {
                if ($value !== null) {
                    return $value;
                }
            }

            return null;
        }
        if ($name === 'plural') {
            return self::number($values[0]) === 1.0 ? $values[1] : $values[2];
        }

        $numbers = array_map(self::number(...), $values);
        if (in_array(null, $numbers, true)) {
            return null;
        }

        return match ($name) {
            'round' => round($numbers[0], (int) ($numbers[1] ?? 0)),
            'floor' => floor($numbers[0]),
            'ceil' => ceil($numbers[0]),
            'abs' => abs($numbers[0]),
            'min' => min($numbers),
            'max' => max($numbers),
            'clamp' => max($numbers[1], min($numbers[2], $numbers[0])),
        };
    }

    private static function number(mixed $value): ?float
    {
        if (is_bool($value)) {
            return $value ? 1.0 : 0.0;
        }

        return is_int($value) || is_float($value) || (is_string($value) && is_numeric($value)) ? (float) $value : null;
    }

    private static function text(mixed $value): string
    {
        return is_float($value) ? rtrim(rtrim(number_format($value, 6, '.', ''), '0'), '.') : (string) $value;
    }

    // --- Lexer -------------------------------------------------------------------------

    private function tokenize(): void
    {
        $operators = ['**', '==', '!=', '<=', '>=', '&&', '||', '??', '<', '>', '+', '-', '*', '/', '%', '(', ')', '[', ']', ',', '.', '?', ':', '!'];
        $length = strlen($this->source);
        $i = 0;
        while ($i < $length) {
            $char = $this->source[$i];
            if (ctype_space($char)) {
                $i++;

                continue;
            }
            if (preg_match('/\G\d+(?:\.\d+)?/', $this->source, $m, 0, $i)) {
                $this->tokens[] = ['num', (float) $m[0], $i];
                $i += strlen($m[0]);

                continue;
            }
            if (preg_match('/\G[A-Za-z_][A-Za-z0-9_]*/', $this->source, $m, 0, $i)) {
                $word = $m[0];
                $this->tokens[] = in_array($word, self::KEYWORDS, true) ? ['kw', $word, $i] : ['id', $word, $i];
                $i += strlen($word);

                continue;
            }
            if ($char === "'" || $char === '"') {
                $end = strpos($this->source, $char, $i + 1);
                if ($end === false) {
                    throw new FormulaException(sprintf('Text ab Stelle %d wird nicht geschlossen.', $i + 1));
                }
                $this->tokens[] = ['str', substr($this->source, $i + 1, $end - $i - 1), $i];
                $i = $end + 1;

                continue;
            }
            foreach ($operators as $op) {
                if (substr_compare($this->source, $op, $i, strlen($op)) === 0) {
                    $this->tokens[] = ['op', ['&&' => 'and', '||' => 'or', '!' => 'not'][$op] ?? $op, $i];
                    $i += strlen($op);

                    continue 2;
                }
            }
            throw new FormulaException(sprintf('Unbekanntes Zeichen „%s“ an Stelle %d.', mb_substr(substr($this->source, $i), 0, 1), $i + 1));
        }
        $this->tokens[] = ['end', '', $length];
    }

    // --- Parser (rekursiver Abstieg) ---------------------------------------------------

    /** @return array{0: string, 1: mixed, 2: int} */
    private function peek(): array
    {
        return $this->tokens[$this->pos];
    }

    private function is(string ...$values): bool
    {
        [$type, $value] = $this->peek();

        return in_array($type, ['op', 'kw'], true) && in_array($value, $values, true);
    }

    private function expect(string $value): void
    {
        if (! $this->is($value)) {
            $token = $this->peek();
            throw new FormulaException($token[0] === 'end'
                ? sprintf('„%s“ fehlt am Ende.', $value)
                : sprintf('„%s“ erwartet an Stelle %d, gefunden „%s“.', $value, $token[2] + 1, $token[1]));
        }
        $this->pos++;
    }

    /** @return array<int, mixed> */
    private function expression(): array
    {
        $condition = $this->binaryLevel(0);
        if ($this->is('?')) {
            $this->pos++;
            $then = $this->expression();
            $this->expect(':');

            return ['tern', $condition, $then, $this->expression()];
        }

        return $condition;
    }

    /** Operatoren nach Bindungsstärke, schwächste zuerst. */
    private const LEVELS = [['??'], ['or'], ['and'], ['==', '!=', '<', '>', '<=', '>=', 'in'], ['+', '-'], ['*', '/', '%']];

    /** @return array<int, mixed> */
    private function binaryLevel(int $level): array
    {
        if ($level === count(self::LEVELS)) {
            return $this->unaryExpression();
        }
        $left = $this->binaryLevel($level + 1);
        while (true) {
            // „not in“ ist ein Operator aus zwei Wörtern.
            if ($level === 3 && $this->is('not') && ($this->tokens[$this->pos + 1][1] ?? null) === 'in') {
                $this->pos += 2;
                $left = ['bin', 'not in', $left, $this->binaryLevel($level + 1)];

                continue;
            }
            if (! $this->is(...self::LEVELS[$level])) {
                return $left;
            }
            $op = $this->peek()[1];
            $this->pos++;
            $left = ['bin', $op, $left, $this->binaryLevel($level + 1)];
            // Vergleiche lassen sich nicht verketten (a < b < c).
            if ($level === 3) {
                return $left;
            }
        }
    }

    /** @return array<int, mixed> */
    private function unaryExpression(): array
    {
        if ($this->is('not')) {
            $this->pos++;

            return ['un', 'not', $this->unaryExpression()];
        }
        if ($this->is('-')) {
            $this->pos++;

            return ['un', '-', $this->unaryExpression()];
        }
        if ($this->is('+')) {
            $this->pos++;

            return $this->unaryExpression();
        }
        $base = $this->primary();
        if ($this->is('**')) {
            $this->pos++;

            return ['bin', '**', $base, $this->unaryExpression()];
        }

        return $base;
    }

    /** @return array<int, mixed> */
    private function primary(): array
    {
        [$type, $value, $at] = $this->peek();
        $this->pos++;

        if ($type === 'num' || $type === 'str') {
            return [$type, $value];
        }
        if ($type === 'kw' && in_array($value, ['true', 'false', 'null'], true)) {
            return ['lit', ['true' => true, 'false' => false, 'null' => null][$value]];
        }
        if ($type === 'op' && $value === '(') {
            $inner = $this->expression();
            $this->expect(')');

            return $inner;
        }
        if ($type === 'op' && $value === '[') {
            $items = $this->arguments(']');

            return ['list', $items];
        }
        if ($type === 'id') {
            if ($this->is('(')) {
                $this->pos++;
                if (! array_key_exists($value, self::FUNCTIONS)) {
                    throw new FormulaException(sprintf('Unbekannte Funktion „%s“. Erlaubt: %s.', $value, implode(', ', array_keys(self::FUNCTIONS))));
                }
                $args = $this->arguments(')');
                [$min, $max] = self::FUNCTIONS[$value];
                if (count($args) < $min || ($max !== null && count($args) > $max)) {
                    throw new FormulaException(sprintf('%s() erwartet %s Argument(e), bekommen %d.', $value, $max === $min ? $min : ($max === null ? "mindestens {$min}" : "{$min}–{$max}"), count($args)));
                }

                return ['call', $value, $args];
            }
            $path = [$value];
            while ($this->is('.')) {
                $this->pos++;
                [$nextType, $segment, $nextAt] = $this->peek();
                if ($nextType !== 'id') {
                    throw new FormulaException(sprintf('Nach „.“ wird ein Name erwartet (Stelle %d).', $nextAt + 1));
                }
                $this->pos++;
                $path[] = $segment;
            }

            return ['var', $path];
        }

        throw new FormulaException($type === 'end'
            ? 'Die Formel endet unerwartet.'
            : sprintf('Unerwartetes „%s“ an Stelle %d.', $value, $at + 1));
    }

    /** @return list<array<int, mixed>> */
    private function arguments(string $close): array
    {
        $items = [];
        if ($this->is($close)) {
            $this->pos++;

            return $items;
        }
        do {
            $items[] = $this->expression();
            $more = $this->is(',');
            if ($more) {
                $this->pos++;
            }
        } while ($more);
        $this->expect($close);

        return $items;
    }
}
