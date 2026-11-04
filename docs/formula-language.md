# Formelsprache der Empfehlungen

Mit der Formelsprache schreibt man Bedingungen, Berechnungen und Texte der Empfehlungsregeln. Wo die Regeln gespeichert sind und wann sie ausgewertet werden, steht in [schema-recommendations.md](schema-recommendations.md).

| Teil | Datei | Aufgabe |
|---|---|---|
| Formeln | `backend/app/Recommendations/Formula.php` | Liest einen Ausdruck (Lexer, Parser mit rekursivem Abstieg) und wertet ihn aus |
| Textvorlagen | `backend/app/Recommendations/Template.php` | Platzhalter `{{ … }}` und Blöcke `{{#if}}` in Texten, Zahlenformat je Sprache |
| Prüfung | `backend/app/Recommendations/RuleValidator.php` | Prüft eine Regel vor dem Speichern |
| Tests | `backend/tests/Unit/Recommendations/FormulaTest.php` | |

## Grundsätze

- **Kein `eval`, keine fremde Engine.** Erlaubt sind nur Zahlen, Texte, Listen, Variablen, Operatoren und neun freigegebene Funktionen. Eine Formel kann weder PHP-Code ausführen noch auf Datenbank oder Dateien zugreifen.
- **Fehlende Werte bleiben leer.** Fehlt ein Wert (`null`), etwa weil ein Element nicht gemessen wurde, ist auch das Ergebnis leer. Es wird nicht mit 0 weitergerechnet. Ein Messwert unter der Nachweisgrenze ist ebenfalls leer.
- **Fehler beim Speichern statt beim Kunden.** Syntaxfehler, unbekannte Variablen und Zirkelbezüge meldet der Validator mit deutscher Fehlermeldung und Position.

## Wo Formeln vorkommen

| Feld | Art | Standard |
|---|---|---|
| `recommendation_rules.element_condition` | Formel, je Element im Scope ausgewertet | `band != null and band != 5` |
| `recommendation_rules.condition` | Formel, einmal je Regel ausgewertet | `affected_count > 0` |
| `recommendation_calculations.expression` | Formel mit Namen, im Text und in anderen Formeln nutzbar | |
| `recommendation_rule_blocks.condition` | Formel; der Block erscheint nur, wenn sie zutrifft | immer sichtbar |
| `kicker`, `title`, `summary`, Block-`label` und -`text` | Textvorlage mit `{{ … }}` | |

Eine Bedingung gilt als erfüllt, wenn ihr Ergebnis „wahr“ ist. Falsch sind `false`, leer (`null`), `0`, ein leerer Text `''` und eine leere Liste `[]`. Alles andere ist wahr.

## Formeln

### Werte

| Schreibweise | Beispiel | Hinweis |
|---|---|---|
| Zahl | `42`, `1.71` | Dezimalpunkt, kein Komma. `.5` und `1e3` gibt es nicht |
| Text | `'unverändert'`, `"+10 %"` | Einfache oder doppelte Anführungszeichen. Es gibt keine Escape-Zeichen, also kann ein Text das eigene Anführungszeichen nicht enthalten |
| Liste | `[2, 3]`, `['a', 'b']` | Für `in` und für Aufzählungen im Text |
| Konstanten | `true`, `false`, `null` | `null` steht für leer |
| Variable | `value`, `salinity.target`, `osmosis.silicon.value` | Siehe [Variablen](#variablen) |
| Klammern | `(target - value) * volume` | |

### Operatoren

Von der schwächsten zur stärksten Bindung:

| Stufe | Operatoren | Bedeutung |
|---|---|---|
| 1 | `a ? b : c` | Ist `a` wahr, dann `b`, sonst `c` |
| 2 | `??` | Linker Wert, wenn er nicht leer ist, sonst rechter |
| 3 | `or`, `\|\|` | Oder, mit Kurzschluss |
| 4 | `and`, `&&` | Und, mit Kurzschluss |
| 5 | `== != < > <= >=`, `in`, `not in` | Vergleiche, nicht verkettbar |
| 6 | `+ -` | Plus und Minus; `+` mit einem Text hängt an |
| 7 | `* / %` | Mal, geteilt, Rest |
| 8 | `not`, `!`, Vorzeichen `-` | Einstellig |
| 9 | `**` | Potenz, rechtsassoziativ: `2 ** 3 ** 2` = 512 |

**Regeln für leere Werte:**
- Rechnen mit einem leeren Wert ergibt leer: `null + 1` → leer.
- Division und Rest durch 0 ergeben leer, nicht einen Fehler.
- `<`, `>`, `<=`, `>=` mit einem leeren Wert sind immer falsch. Daher ist `band < 5` für ein nicht bewertetes Element falsch, und `not (band < 5)` ist wahr.
- `==` und `!=` vergleichen Zahlen mit einer Toleranz von 10⁻⁹. `x == null` prüft, ob `x` leer ist.
- `null in [1, 2]` ist falsch, `null not in [1, 2]` ist wahr.

**Eingabehilfe:** `−`, `×`, `÷`, `≤`, `≥` und `≠` werden außerhalb von Texten automatisch in `-`, `*`, `/`, `<=`, `>=` und `!=` umgewandelt. Formeln aus Word oder einer Mail lassen sich so direkt einfügen.

### Funktionen

| Funktion | Ergebnis | Beispiel |
|---|---|---|
| `round(x, stellen = 0)` | Kaufmännisch gerundet | `round(1.23456, 2)` → 1.23, `round(2.5)` → 3 |
| `floor(x)`, `ceil(x)` | Ab- bzw. aufgerundet | `ceil(4.1)` → 5 |
| `abs(x)` | Betrag | `abs(band - 5)` |
| `min(a, b, …)`, `max(a, b, …)` | Kleinster bzw. größter Wert | `max(0, target - value)` |
| `clamp(x, von, bis)` | `x` begrenzt auf den Bereich | `clamp(1200, 0, 1000)` → 1000 |
| `plural(n, einzahl, mehrzahl)` | `einzahl` bei genau 1, sonst `mehrzahl` | `plural(affected_count, 'Wert', 'Werte')` |
| `coalesce(a, b, …)` | Erster nicht leere Wert | `coalesce(phosphorus.band, phosphate.band)` |

Die Rechenfunktionen (alle außer `plural` und `coalesce`) ergeben leer, sobald ein Argument leer ist: `min(3, null)` → leer. Andere Funktionen gibt es nicht. Ein Tippfehler wie `rund(1)` wird beim Speichern gemeldet.

## Textvorlagen

| Schreibweise | Bedeutung |
|---|---|
| `{{ formel }}` | Ergebnis der Formel einsetzen |
| `{{#if formel}} … {{/if}}` | Text nur, wenn die Formel wahr ist |
| `{{#if a}} … {{#elseif b}} … {{else}} … {{/if}}` | Erster zutreffender Zweig, sonst `{{else}}`. Blöcke lassen sich verschachteln |
| `**text**` | Fett |

**So wird ein Ergebnis eingesetzt:**
- **Zahlen** im Format der Sprache: Deutsch, Französisch, Italienisch und Spanisch `1.234,5`, Englisch und Chinesisch `1,234.5`. Es erscheinen höchstens 4 Nachkommastellen, Nullen am Ende entfallen. Wie viele Stellen man möchte, legt man mit `round()` fest.
- **Texte** unverändert.
- **Listen** als fette Aufzählung mit dem Bindewort der Sprache: „**Calcium**, **Magnesium** und **Zink**“.
- **Wahr/falsch** als leerer Text.
- **Leer** als „–“. Zusätzlich entsteht eine Warnung („Leerer Wert: salinity.target“). Wer das vermeiden will, schützt den Platzhalter mit `{{#if}}` oder gibt mit `??` einen Ersatz an.

Innerhalb von `{{ … }}` darf kein `}}` stehen, auch nicht in einem Text.

## Variablen

| Variable | Bedeutung |
|---|---|
| `value`, `band`, `unit`, `key`, `label` | Messwert, Stufe (1–9, 5 = ideal), Einheit, Element-Key und übersetzter Name. In `element_condition` das gerade geprüfte Element, sonst das erste betroffene |
| `target`, `min`, `max` | Idealwert und Idealbereich aus dem Ergebnis, sonst aus der Skala |
| `critLow`, `tooLow`, `low`, `increased`, `high`, `tooHigh` | Grenzen der Bewertungsskala der Analyse |
| `<key>.<feld>` | Jedes Element der Analyse mit denselben Feldern, z. B. `salinity.value`, `magnesium.target`. Bindestriche im Key werden zu `_`: `ratio_mg_ca.band` |
| `osmosis.<key>.<feld>` | Wert aus der Osmoseprobe; ohne Probe leer |
| `volume` | Nettovolumen des Beckens in Litern |
| `supplyParts` | Versorgungssystem: 0 keines, 1 All-in-one, 2 zwei Teile, 3 drei Teile; leer = unbekannt |
| `hasOsmosis`, `resinFilter` | Osmoseanlage bzw. Harzfilter vorhanden |
| `waterType` | Wasserart der Methode, z. B. `'Meerwasser'` |
| `affected` | Liste der übersetzten Namen aller betroffenen Elemente |
| `affected_count` | Anzahl der betroffenen Elemente |
| `severity` | Größte Abweichung von Stufe 5 unter den betroffenen Elementen |
| Name einer Berechnung | z. B. `goal`, `salt_ml` |

Elemente, die die Methode nicht bewertet, haben `band` leer.

## Berechnungen

Eine Berechnung ist eine Formel mit Namen. Sie gehört zu einer Regel, oder sie ist global (ohne Regel) und gilt dann für alle Regeln. Eine Berechnung der Regel ersetzt eine globale mit gleichem Namen.

- **Name:** Kleinbuchstaben, Ziffern und `_`, mit einem Buchstaben am Anfang, höchstens 40 Zeichen. Namen von Variablen und Element-Keys sind vergeben.
- **Bezüge:** Eine Berechnung darf andere Berechnungen nutzen. Ausgewertet wird erst, wenn der Wert gebraucht wird, und je Empfehlung nur einmal.
- **Zirkelbezüge** (`a` nutzt `b`, `b` nutzt `a`) meldet der Validator, z. B. „Zirkelbezug in den Berechnungen: a → b → a.“
- **Sprachen:** Berechnungen sind sprachunabhängig. Alle Übersetzungen eines Textes nutzen dieselben Namen.

Global angelegt ist bisher `goal = coalesce(target, (min + max) / 2)`: der Idealwert oder, wenn er fehlt, die Mitte des Idealbereichs.

## Beispiele

Die Ergebnisse gelten für ein Becken mit 450 l, Salinität 33,2 bei Idealwert 35 und Calcium sowie Magnesium als betroffenen Elementen.

### Bedingungen

```text
band != null and band != 5          Element ist bewertet und nicht ideal (Standard)
band >= 8                           stark erhöht
band in [3, 4]                      leicht erniedrigt
nitrate.band > 5 and coalesce(phosphorus.band, phosphate.band) < 5
                                    Nitrat erhöht, Phosphat erniedrigt
supplyParts in [2, 3] and kh.band != null
                                    Mehrteiliges Versorgungssystem und KH gemessen
osmosis.silicon.value > 25          Silikat im Osmosewasser; ohne Osmoseprobe falsch
waterType == 'Meerwasser'
```

### Berechnungen

```text
salt_ml   = clamp((goal - value) * 1.71 * volume, 0, 1000000)
            Salzmenge in ml, nie negativ

ca_dose   = volume > 0 ? round((calcium.target - calcium.value) * volume / 1000, 1) : null
            leer, wenn das Volumen fehlt

kh_change = kh.band == 5 ? 'unverändert' : (kh.band < 5 ? '+10–20 %' : '−10–20 %')
            Text je nach Stufe

p_band    = coalesce(phosphorus.band, phosphate.band)
            ICP-Phosphor, sonst Phosphat
```

### Texte

| Vorlage | Ergebnis |
|---|---|
| `Salz: {{ round((salinity.target - salinity.value) * 1.71 * volume) }} ml` | Salz: 1.385 ml |
| `Erhöht sind {{ affected }}.` | Erhöht sind **Calcium** und **Magnesium**. |
| `{{ plural(affected_count, 'Ein Wert ist', 'Mehrere Werte sind') }} auffällig.` | Mehrere Werte sind auffällig. |
| `{{#if volume > 0}}{{ round(volume / 100, 1) }} ml täglich{{else}}0,5 ml je 100 l täglich{{/if}}` | 4,5 ml täglich |
| `{{#if band <= 2}}Stark{{#elseif band <= 4}}Leicht{{else}}Nicht{{/if}} erniedrigt` | Leicht erniedrigt (bei Stufe 3) |
| `Idealwert {{ target ?? 'nicht festgelegt' }}` | Idealwert 420 bzw. „nicht festgelegt“ |
| `Silikat im Osmosewasser: {{ osmosis.silicon.value }} µg/l` | ohne Probe: Silikat im Osmosewasser: – µg/l, mit Warnung |

### Eine vollständige Regel

Die Regel `salinity-low` aus dem `RecommendationRuleSeeder`, leicht gekürzt:

```text
scope_elements:    ["salinity"]
element_condition: band != null and band < 5

Berechnungen
  salt_ml = clamp((goal - value) * 1.71 * volume, 0, 1000000)
  salt_g  = clamp((goal - value) * 1.06 * volume, 0, 1000000)

title DE:   Salinität kontrolliert anheben
summary DE: Die **{{ label }}** liegt bei {{ round(value, 1) }} {{ unit ?? 'PSU' }} und damit unter
            dem Zielwert{{#if goal}} von {{ round(goal, 1) }} PSU{{/if}}.
            {{#if volume > 0 and goal}}Ergänzen Sie … oder {{ round(salt_g) }} g Nyos pure Salz …
            {{else}}Ergänzen Sie Absolute Ocean 1 und 2 jeweils in der berechneten Menge …{{/if}}

Block detail, Bedingung volume > 0 and goal
  label: Absolute Ocean 1        text: {{ round(salt_ml) }} ml
Block detail, Bedingung volume > 0 and goal
  label: oder Nyos pure Salz     text: {{ round(salt_g) }} g
Block detail, Bedingung not (volume > 0)
  label: Absolute Ocean 1 und 2  text: je 1,71 ml pro PSU und Liter
```

Ergebnis für 450 l bei 33,2 PSU und Ziel 35: „Die **Salinität** liegt bei 33,2 PSU und damit unter dem Zielwert von 35 PSU. …“, dazu die Details „Absolute Ocean 1: 1.385 ml“ und „oder Nyos pure Salz: 859 g“. Ohne Volumen erscheinen stattdessen die Mengen je PSU und Liter.

## Stolperfallen

| Schreibweise | Problem | Richtig |
|---|---|---|
| `not band > 5` | `not` bindet stärker als `>`: Gerechnet wird `(not band) > 5`, und das ist immer falsch | `not (band > 5)` |
| `1 < band < 5` | Vergleiche lassen sich nicht verketten (Fehler beim Speichern) | `band > 1 and band < 5` |
| `1,5` | Komma trennt Argumente; als Formel ein Fehler | `1.5` |
| `'Menge: ' + dose` | `+` mit Text formatiert die Zahl nicht nach Sprache: „Menge: 5.5“ | `Menge: {{ dose }}` im Text |
| `{{ target }} mg/l` | Ohne Idealwert steht „– mg/l“ im Bericht | `{{#if target != null}}{{ target }} mg/l{{/if}}` |
| `value * 2` bei leerem `value` | Ergebnis leer, nicht 0 | Bei Bedarf `(value ?? 0) * 2` |
| `a ?? b > 3` | `??` bindet schwächer als `>`: gerechnet wird `a ?? (b > 3)` | `(a ?? b) > 3` |

## Fehlermeldungen

Der Validator setzt vor jede Meldung das Feld, in dem der Fehler steckt, z. B. „summary (de): …“ oder „Block 2 (detail), Bedingung: …“.

| Meldung | Ursache |
|---|---|
| Unerwartetes „<“ an Stelle 7. | Verketteter Vergleich oder überzähliges Zeichen |
| „)“ fehlt am Ende. | Klammer nicht geschlossen |
| Die Formel endet unerwartet. | z. B. `1 +` |
| Unbekannte Funktion „rund“. Erlaubt: round, floor, … | Tippfehler oder nicht freigegebene Funktion |
| round() erwartet 1–2 Argument(e), bekommen 0. | Falsche Zahl von Argumenten |
| Text ab Stelle 5 wird nicht geschlossen. | Anführungszeichen fehlt |
| Unbekanntes Zeichen „#“ an Stelle 3. | Zeichen, das die Sprache nicht kennt |
| unbekannte Variable „salinty.value“. | Tippfehler im Namen oder Element-Key |
| {{#if}} wird nicht mit {{/if}} geschlossen. | `{{/if}}` fehlt |
| {{/if}} ohne vorheriges {{#if}}. | `{{/if}}`, `{{else}}` oder `{{#elseif}}` ohne Block |
| Nicht geschlossener Platzhalter: „{{“ und „}}“ müssen paarweise stehen. | `{{` oder `}}` fehlt |
| Zirkelbezug in den Berechnungen: a → b → a. | Berechnungen nutzen sich gegenseitig |

## Für Entwickler

```php
use App\Recommendations\Formula;
use App\Recommendations\Template;

$ast = Formula::parse('round((target - value) * volume / 1000, 1)');   // wirft FormulaException
$resolve = fn (array $path) => data_get($values, implode('.', $path)); // ['salinity', 'value'] → Wert oder null
$result = Formula::evaluate($ast, $resolve);
$paths = Formula::variables($ast);   // [['target'], ['value'], ['volume']]

$tree = Template::parse('Salz: {{ round(salt_ml) }} ml');
[$text, $warnings] = Template::render($tree, $resolve, 'de');
```

- **AST:** Arrays der Form `['num', v]`, `['str', v]`, `['lit', v]`, `['var', [segmente]]`, `['list', [knoten]]`, `['call', name, [knoten]]`, `['un', op, knoten]`, `['bin', op, links, rechts]` und `['tern', bedingung, ja, nein]`. Er lässt sich speichern oder zwischenspeichern, wenn das Parsen einmal zu teuer wird.
- **Neue Funktion:** in `Formula::FUNCTIONS` mit der Zahl der Argumente eintragen und in `Formula::call()` umsetzen. Danach diese Doku und `FormulaTest` ergänzen.
- **Neue Variable:** im Resolver von `RecommendationEngine` setzen und in `ELEMENT_FIELDS` oder `CONTEXT_VARIABLES` eintragen, damit der Validator sie kennt.
