<?php

namespace Tests\Unit\Recommendations;

use App\Recommendations\Formula;
use App\Recommendations\FormulaException;
use App\Recommendations\Template;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class FormulaTest extends TestCase
{
    private const VARIABLES = [
        'value' => 30.0, 'target' => 35.0, 'volume' => 500, 'missing' => null, 'supplyParts' => 2,
        'salinity' => ['value' => 30.0, 'label' => 'Salinität'], 'affected' => ['Calcium', 'Magnesium', 'Zink'],
    ];

    private function resolve(): callable
    {
        return function (array $path) {
            $value = self::VARIABLES;
            foreach ($path as $segment) {
                if (! is_array($value) || ! array_key_exists($segment, $value)) {
                    return null;
                }
                $value = $value[$segment];
            }

            return $value;
        };
    }

    private function calculate(string $formula): mixed
    {
        return Formula::evaluate(Formula::parse($formula), $this->resolve());
    }

    private function render(string $template, string $language = 'de'): string
    {
        return Template::render(Template::parse($template), $this->resolve(), $language)[0];
    }

    /**
     * @return array<string, array{0: string, 1: mixed}>
     */
    public static function formulas(): array
    {
        return [
            'Arbeitsmappe V2.2: Absolute Ocean' => ['round((target - value) * 1.71 * volume)', 4275.0],
            'Punkt vor Strich, Klammern' => ['2 + 3 * (4 - 1)', 11.0],
            'Potenz bindet stärker als Minus' => ['-2 ** 2', -4.0],
            'Variable mit Punkt' => ['salinity.value', 30.0],
            'unbekannte Variable ist leer' => ['salinity.nothing', null],
            'leer zieht sich durch die Rechnung' => ['missing * 3 + 1', null],
            'Division durch 0 ist leer' => ['1 / 0', null],
            'Vergleich mit leer ist falsch' => ['missing > 3', false],
            'leer ist gleich null' => ['missing == null', true],
            'in' => ['supplyParts in [2, 3]', true],
            'not in' => ['supplyParts not in [1, 2]', false],
            'leer ist nie in einer Liste' => ['missing in [null]', false],
            'Kurzschluss' => ['missing != null and missing > 0', false],
            'Ternär' => ["value < target ? 'zu niedrig' : 'ok'", 'zu niedrig'],
            '??' => ['missing ?? 7', 7.0],
            'coalesce' => ['coalesce(missing, salinity.value)', 30.0],
            'clamp' => ['clamp(-4, 0, 10)', 0.0],
            'round mit Stellen' => ['round(2 / 3, 2)', 0.67],
            'min/max' => ['max(1, value, 3) - min(4, 2)', 28.0],
            'plural' => ["plural(1, 'Wert', 'Werte') + plural(2, ' Wert', ' Werte')", 'Wert Werte'],
            'Funktion mit leerem Argument' => ['round(missing)', null],
            'Unicode-Operatoren' => ['10 − 2 × 3 ÷ 2', 7.0],
            'Unicode in Texten bleibt' => ["'−10–20 %'", '−10–20 %'],
            'Wahrheitswerte' => ['not false and true', true],
        ];
    }

    #[DataProvider('formulas')]
    public function test_evaluates_formulas(string $formula, mixed $expected): void
    {
        $this->assertSame($expected, $this->calculate($formula));
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function invalidFormulas(): array
    {
        return [
            'leer' => ['  ', 'leer'],
            'offene Klammer' => ['round(1', '„)“ fehlt'],
            'unbekannte Funktion' => ['eval(1)', 'Unbekannte Funktion „eval“'],
            'falsche Argumentzahl' => ['clamp(1, 2)', 'clamp() erwartet 3'],
            'Operator am Ende' => ['1 +', 'endet unerwartet'],
            'offener Text' => ["'abc", 'nicht geschlossen'],
            'unbekanntes Zeichen' => ['1 # 2', 'Unbekanntes Zeichen „#“'],
            'verketteter Vergleich' => ['1 < 2 < 3', 'Unerwartetes „<“'],
            'Punkt ohne Namen' => ['salinity.', 'Nach „.“ wird ein Name erwartet'],
        ];
    }

    #[DataProvider('invalidFormulas')]
    public function test_rejects_invalid_formulas(string $formula, string $message): void
    {
        $this->expectException(FormulaException::class);
        $this->expectExceptionMessage($message);

        Formula::parse($formula);
    }

    public function test_lists_the_variables_of_a_formula(): void
    {
        $this->assertSame(
            [['value'], ['salinity', 'target'], ['volume']],
            Formula::variables(Formula::parse('round(value - salinity.target, 2) * (volume ?? 1)')),
        );
    }

    public function test_renders_placeholders_with_localized_numbers(): void
    {
        $this->assertSame('Je 4.275 ml Absolute Ocean.', $this->render('Je {{ round((target - value) * 1.71 * volume) }} ml Absolute Ocean.'));
        $this->assertSame('4,275.5 ml', $this->render('{{ 4275.5 }} ml', 'en'));
        $this->assertSame('0,1235 · 3', $this->render('{{ 0.12345 }} · {{ 3.0 }}'));
    }

    public function test_renders_lists_as_bold_enumeration(): void
    {
        $this->assertSame('bei **Calcium**, **Magnesium** und **Zink**', $this->render('bei {{ affected }}'));
        $this->assertSame('**Calcium**, **Magnesium** and **Zink**', $this->render('{{ affected }}', 'en'));
    }

    public function test_renders_if_blocks(): void
    {
        $template = '{{#if volume > 1000}}groß{{#elseif volume > 0}}{{ volume }} l{{else}}ohne Volumen{{/if}}';
        $this->assertSame('500 l', $this->render($template));
        $this->assertSame('ohne Volumen', $this->render(str_replace('volume', 'missing', $template)));
        $this->assertSame('innen außen', $this->render('{{#if missing}}x{{else}}{{#if volume}}innen{{/if}} außen{{/if}}'));
    }

    public function test_reports_empty_placeholders(): void
    {
        [$text, $warnings] = Template::render(Template::parse('Menge: {{ missing * volume }} ml'), $this->resolve());

        $this->assertSame('Menge: – ml', $text);
        $this->assertSame(['Leerer Wert: missing, volume'], $warnings);
    }

    public function test_lists_variables_of_a_template(): void
    {
        $tree = Template::parse('{{#if volume}}{{ salt_ml }}{{else}}{{ target }}{{/if}}');

        $this->assertSame([['volume'], ['salt_ml'], ['target']], Template::variables($tree));
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function invalidTemplates(): array
    {
        return [
            'if ohne Ende' => ['{{#if volume}}x', 'nicht mit {{/if}} geschlossen'],
            'else ohne if' => ['x {{else}} y', '{{else}} ohne vorheriges {{#if}}'],
            'zwei else' => ['{{#if a}}1{{else}}2{{else}}3{{/if}}', 'höchstens ein {{else}}'],
            'elseif nach else' => ['{{#if a}}1{{else}}2{{#elseif b}}3{{/if}}', '{{#elseif}} nach {{else}}'],
            'if ohne Bedingung' => ['{{#if }}x{{/if}}', 'braucht eine Bedingung'],
            'leerer Platzhalter' => ['{{ }}', 'Leerer Platzhalter'],
            'offener Platzhalter' => ['Wert {{ value', 'paarweise'],
            'Formelfehler mit Stelle' => ['{{ round( }}', '(in „{{ round( }}“)'],
        ];
    }

    #[DataProvider('invalidTemplates')]
    public function test_rejects_invalid_templates(string $template, string $message): void
    {
        $this->expectException(FormulaException::class);
        $this->expectExceptionMessage($message);

        Template::parse($template);
    }
}
