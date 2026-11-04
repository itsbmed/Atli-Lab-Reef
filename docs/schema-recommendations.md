# DB-Schema: Empfehlungen

Empfehlungen zu einer Analyse erzeugt das Backend, sobald eine Analyse abgeschlossen ist. Die Regeln dafür werden im Adminbereich gepflegt.
Grundlage sind die Analysen-Tabellen aus [schema-analyses.md](schema-analyses.md), vor allem `analysis_results` (Stufe 1–9) und `evaluation_scales`.

Umgesetzt in `backend/database/migrations/2026_11_04_100000_create_recommendation_tables.php`, Logik in `backend/app/Recommendations/`, Regeln der Auswertung V2.2 in `backend/database/seeders/RecommendationRuleSeeder.php`.

Noch offen:
- Admin-API für Regeln, Blöcke und Berechnungen
- Umstellung des Frontends: Es berechnet die Karten noch selbst in `client/src/services/directRecommendations.js` und liest `recommendations` aus der API noch nicht.
- Die Dosierplan-Karte und die Produktkarten (Packungswahl Absolute Ocean, Essentials-Linie) bleiben vorerst im Frontend.

## Überblick

```
recommendation_rules ─1:n─ recommendation_rule_blocks ─n:1─ products (optional)
  │   └─n:1─ evaluation_scales (null = gilt für alle Skalen)
  └─1:n─ recommendation_calculations   (rule_id null = globale Berechnung)

analyses ─1:n─ analysis_recommendations ─n:1─ recommendation_rules (nullOnDelete)
```

- **Regel**: wann eine Empfehlung erscheint (Bedingung), welche Elemente sie betrifft, Titel und Kurztext.
- **Blöcke**: Optionen (blauer Kasten), Detailzeilen (z. B. Versorgungskanäle, berechnete Korrektur) und Tipps. Jeder Block kann eine eigene Bedingung haben.
- **Berechnungen**: benannte Formeln. Sie werden einmal je Regel definiert und in allen Sprachen über ihren Namen verwendet.
- **Analyse-Empfehlung**: fertig ausgewerteter Snapshot zu einer Analyse.

Bedingungen, Berechnungen und Texte nutzen dieselbe [Formelsprache](formula-language.md).

## Stammdaten (Adminbereich)

### `recommendation_rules`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | bigint PK | |
| `key` | string(50) | z. B. `water-change`, `salinity-low`, `nutrients-high-low`, `legacy-kh-low1`; unique zusammen mit `evaluation_scale_id` |
| `evaluation_scale_id` | string(50) FK → evaluation_scales, null, cascade | null = gilt für alle Skalen; gesetzt = ersetzt die globale Regel mit gleichem `key` für diese Skala. Ist diese Regel inaktiv, entfällt die Empfehlung für die Skala. |
| `name` | string(120) | Name im Adminbereich |
| `water_types` | json, null | z. B. `["Meerwasser"]`; null = alle Wasserarten |
| `scope_sample` | string(20), null | null = Hauptanalyse; `osmose` = mitgeschickte Osmoseprobe (bei eigenständigen Osmoseanalysen die Analyse selbst) |
| `scope_elements` | json, null | Element-Keys, die die Regel prüft, z. B. `["calcium","magnesium","zinc"]` |
| `scope_group_id` | FK → element_groups, null | Zusätzlich alle Elemente einer Gruppe |
| `element_condition` | string(500), null | Wird je Element im Scope ausgewertet, z. B. `band >= 8`. Die Treffer ergeben `affected`. Default: `band != null and band != 5` |
| `condition` | string(500), null | Gesamtbedingung, z. B. `nitrate.band > 5 and p_band < 5`. Default: `affected_count > 0` |
| `kicker`, `title`, `summary` | json | Übersetzungen `{de, en, …}`, `title` und `summary` mit Formeln; `de` ist Pflicht |
| `action` | json, null | Verweis im Frontend: `{tool: "waterchange"}`, `{tab: "values", secondary: {tool, label: {de}}}` |
| `action_label`, `detail_label` | json, null | Übersetzungen |
| `priority` | string(10), null | `high`, `medium`; null = aus der Abweichung (ab 3 Stufen = high) |
| `recheck_days` | smallint, null | |
| `is_active` | bool | |
| `sort_order` | smallint | Reihenfolge bei gleicher Schwere |
| `timestamps` | | `updated_at` dient im Snapshot als Regelversion |

Betroffene Elemente erscheinen in der Reihenfolge der Messwerte. Elemente ohne Wert und ohne Stufe zählen nicht.

Die Schwere ist die größte Abweichung der betroffenen Elemente (`|band − 5|`). Ohne Stufe, z. B. bei Funden in der Osmoseprobe, gilt 2. Sortiert wird nach Schwere, dann `sort_order`. Höchstens 6 Karten je Analyse (`RecommendationEngine::MAX_CARDS`).

Der Unique-Index greift bei `evaluation_scale_id = null` nicht. Dass globale Keys eindeutig sind, stellen Seeder und Import sicher.

### `recommendation_rule_blocks`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | bigint PK | |
| `rule_id` | FK → recommendation_rules, cascade | |
| `type` | string(10) | `option`, `detail`, `tip` |
| `condition` | string(500), null | Block erscheint nur, wenn wahr, z. B. `supplyParts in [2, 3]` |
| `label` | json, null | z. B. „Option A: Standard Empfehlung“, „KH“, `{{ kh.label }}` |
| `text` | json | Text oder Wert mit Formeln, z. B. `{{ round(salt_ml) }} ml` |
| `action` | json, null | Link oder Tool, z. B. `{tool: "waterchange", label: {de: …}}` |
| `product_id` | FK → products, null, nullOnDelete | Produktkarte (Name, Bild, Shop-Link) |
| `sort_order` | smallint | |

### `recommendation_calculations`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | bigint PK | |
| `rule_id` | FK → recommendation_rules, null, cascade | null = global, in allen Regeln verfügbar |
| `name` | string(40) | `salt_ml`; Kleinbuchstaben, Ziffern und `_`, darf keine Variable und kein Element verdecken |
| `expression` | string(500) | `clamp((goal - value) * 1.71 * volume, 0, 1000000)` |
| `description` | string(255), null | Für den Adminbereich |

Berechnungen dürfen andere Berechnungen derselben Regel und globale Berechnungen verwenden. Sie werden erst ausgewertet, wenn sie gebraucht werden. Globale Berechnung aus dem Seeder: `goal = coalesce(target, (min + max) / 2)`.

`products` hat zusätzlich `image`, `url` (json je Sprache) und `pack_sizes` (json).

## Bewegungsdaten

### `analysis_recommendations`
Snapshot der ausgewerteten Empfehlungen. Spätere Änderungen an Regeln, Formeln oder Skalen ändern bestehende Berichte nicht, solange die Empfehlungen nicht neu erzeugt werden.

| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | bigint PK | |
| `analysis_id` | string(64) FK → analyses, cascade | Nur Hauptanalysen |
| `rule_id` | FK → recommendation_rules, null, nullOnDelete | null = vom Labor frei angelegt oder Regel gelöscht |
| `rule_key` | string(50), null | Bleibt erhalten, auch wenn die Regel gelöscht wird |
| `rule_version` | timestamp, null | `updated_at` der Regel beim Auswerten |
| `content` | json | Fertig ausgewertet je Sprache: `{de: {kicker, title, summary, actionLabel, detailLabel, action, options[], details[], tips[]}, …}` |
| `elements` | json | Betroffene Element-Keys |
| `tone` | string(10) | `watch`, `critical` (ab 3 Stufen Abweichung) |
| `priority` | string(10) | `high`, `medium` |
| `recheck_days` | smallint, null | |
| `inputs` | json | Verwendete Werte: `volume`, `supplyParts`, `hasOsmosis`, `resinFilter`, `waterType`, `scale` |
| `is_edited` | bool | Vom Labor nachbearbeitet; beim Neuerzeugen bleibt der Eintrag stehen, seine Regel wird nicht erneut angelegt |
| `completed_at` | timestamp, null | Kunde hat die Maßnahme erledigt (ersetzt später den localStorage-Fortschritt) |
| `sort_order` | smallint | |
| `timestamps` | | |

**Wann der Snapshot entsteht:**
- **Automatisch**, sobald eine Analyse über das Modell auf `completed` wechselt (`Analysis::booted`).
- **Bei einer Probe** (Osmose, Meersalz) wird die Hauptanalyse neu ausgewertet, wenn diese schon abgeschlossen ist.
- **Bei Importen über den Query Builder** gibt es keine Modell-Events. Dafür ist `php artisan recommendations:generate` da: `--missing` für Analysen ohne Empfehlungen, `--analysis=<id>` für einzelne.
- **Fehler** beim Erzeugen brechen das Speichern der Analyse nicht ab. Sie werden mit `report()` gemeldet.

**Sprachen:** `content` enthält jede Sprache, in der die Regel Texte hat, Deutsch immer. Fehlt ein Text, gilt Englisch, dann Deutsch. Die API liefert die Sprache des Nutzers (`users.language`) mit demselben Fallback.

Ändert der Kunde nach dem Bericht Volumen oder Versorgungssystem, kann das Frontend den Unterschied zu `inputs` erkennen und eine Neuberechnung anbieten. Das ist noch nicht umgesetzt.

## Formelsprache

Bedingungen, Berechnungen und Texte nutzen eine eigene Formelsprache (`backend/app/Recommendations/Formula.php` und `Template.php`, ohne `eval`). Ein fehlender Wert ergibt leer, nicht 0. Texte setzen Ergebnisse mit `{{ … }}` ein und blenden Teile mit `{{#if}} … {{else}} … {{/if}}` ein oder aus.

Syntax, Variablen, Funktionen, Beispiele und Fehlermeldungen: [formula-language.md](formula-language.md).

## Übernahme

### Aus dem neuen Frontend (Seeder)
`RecommendationRuleSeeder` legt die Regeln der Auswertung V2.2 als globale Regeln an, nur auf Deutsch: Wasserwechsel, Salinität niedrig und hoch, Elementversorgung, Nährstoffe in vier Kombinationen, Schadstoffquellen und Osmosewasser.
- Bestehende Regeln mit gleichem `key` bleiben unverändert, damit Änderungen aus dem Adminbereich nicht verloren gehen.
- Bis auf Schadstoffe und Osmosewasser gelten alle Regeln nur für Meerwasser.
- `tests/Feature/Recommendations/RecommendationEngineTest.php` prüft die Fälle aus `client/src/services/directRecommendations.test.js`.

### Aus der alten Datenbank
`php artisan legacy:import-recommendations` übernimmt `elements_action`, nur die deutschen Texte. Die Texte hängen über `elements.elements_action_id_high2|high1|low1|low2` an den Elementen; in `ati-2025-07-24` sind das 79 Verknüpfungen zu 57 Texten.
- **Regeln:** Je Verknüpfung entsteht eine **inaktive** Regel `legacy-<element>-<stufe>` mit einem Element. Sie wird im Adminbereich einzeln freigeschaltet.
- **Erneuter Lauf:** Texte und Berechnungen werden überschrieben, `is_active` bleibt unverändert.

| Alt | `element_condition` |
|---|---|
| `high2` | `band != null and band >= 8` |
| `high1` | `band in [6, 7]` |
| `low1` | `band in [3, 4]` |
| `low2` | `band != null and band <= 2` |

10 der Regeln enthalten Formeln. Umsetzung:

| Alt | Neu |
|---|---|
| `==…==` | Berechnung `calc_1`, `calc_2` … (gleiche Formel = eine Berechnung), im Text `{{ calc_1 }}` |
| `[eValue]` | `value` |
| `[eRefValue]`, `[eRefNormValue]` | `target` |
| `[eRefValueLow1]`, `[eRefValueHigh1]` (auch `eRefNormValue…`) | `min`, `max` |
| `[eRefValueLow2]`, `[eRefValueHigh2]` | `low`, `high` (wie bei `legacy:import-catalog`) |
| `[tankVolume]` | `volume` |
| `round2(x)`, `round1(x)` | `round(x, 2)`, `round(x, 1)` |
| `if(c, a, b)`, `gt(a, b)` … | `(c ? a : b)`, `(a > b)` … |
| `<br>`, `<b>`/`<strong>` | Zeilenumbruch, `**…**`; übrige Tags entfallen, HTML-Entities werden aufgelöst |

## Offene Punkte

- **Admin-API** zum Pflegen der Regeln, mit Prüfung über `RuleValidator` und einer Vorschau anhand einer echten Analyse
- **Frontend:** Karten aus `analysis.recommendations` anzeigen und „erledigt“ über `completed_at` speichern
- **Laborfreigabe:** Status bzw. `released_at` an `analyses`, kommt mit dem Labor-Endpoint
- **Dosierplan-Karte** und Packungswahl der Produktkarten ins Backend
