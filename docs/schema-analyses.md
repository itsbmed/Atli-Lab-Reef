# DB-Schema: Analysen

Zielschema für Analysen, Barcodes und Messwerte im Laravel-Backend sowie die Übernahme aus der alten Datenbank (`legacy`, `ati-2025-07-24`).
Umgesetzt in `backend/database/migrations/2026_11_03_1000*`, Stammdaten in `backend/database/seeders/AnalysisCatalogSeeder.php`, Übernahme in `backend/app/Console/Commands/ImportLegacy*.php` (siehe [Ablauf](#ablauf)).
Empfehlungen und Formeln: [schema-recommendations.md](schema-recommendations.md).

## Überblick

```
                    analysis_packages ─n:m─ analysis_methods ─n:m─ elements ─n:1─ element_groups
                      │   (analysis_package_methods)  │   (analysis_method_elements)
                      │                               │
vouchers ─────────────┤                               │
  │ 0..1              │                               │
users ─1:n─ analyses ─┴── package_id, method_id ──────┘
  │           │  └─ parent_id → analyses (Osmose-/Meersalz-Probe zur Hauptanalyse)
  │           ├─1:n─ analysis_addons
  │           ├─1:n─ analysis_results ─n:1─ elements
  │           │         └─1:n─ analysis_dosings ─n:1─ products
  │           ├─1:n─ analysis_group_scores ─n:1─ element_groups
  │           └─n:1─ evaluation_scales (Skala, nach der bewertet wurde)
  ├─1:n─ aquariums ─1:n─ analyses (aquarium_id, nullOnDelete)
  │        └─n:1─ evaluation_scales (gewählte Skala)
  └─1:n─ evaluation_scales (eigene Zielwerte) ─1:n─ evaluation_scale_thresholds ─n:1─ elements
```

## Katalog (Stammdaten, per Seeder)

### `element_groups`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | smallint PK | |
| `legacy_id` | uint, unique, null | `elements_groups.id` |
| `key` | string(30), unique | `basis`, `quantity`, `nutrients`, `trace`, `pollutants` (wie im Frontend), `balance-index`, `growth-index` |
| `name` | json | Übersetzungen `{de, en, fr, it, es, cn}` |
| `in_quality_index` | bool | Fließt in den Qualitätsindex ein |
| `sort_order` | smallint | |

### `elements`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | smallint PK | |
| `legacy_id` | uint, unique, null | `elements.id` |
| `element_group_id` | FK → element_groups | |
| `key` | string(30), unique | Parameter-Key im Frontend (`calcium`, `kh`, …); Kennzahlen als `ratio-mg-ca` usw. |
| `symbol` | string(30) | |
| `name` | json | Übersetzungen |
| `unit` | string(10) | `mg/l`, `µg/l`, `PSU`, `°dKH` (ersetzt die Tabelle `units`) |
| `precision` | tinyint | Nachkommastellen |
| `is_calculated` | bool | Kennzahlen wie Na/Cl, Mg/Ca, KH/P |
| `sort_order` | smallint | |

Referenzwerte und Texte gehören nicht hierher, sie kommen mit den Admin-Bereichen „Elemente“ und „Bewertungsgrundlagen“.

### `products`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | smallint PK | |
| `legacy_id` | uint, unique, null | `supplements.id` |
| `key` | string(50), unique | |
| `name` | json | |
| `unit` | string(10), null | |
| `max_dose_per_day` | double, null | |

### `analysis_packages`
Das Paket legt der Barcode fest.

| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | smallint PK | |
| `key` | string(20), unique | `icp-oes`, `icp-basic`, `icp-ms` |
| `name` | json | |
| `includes_osmosis` | bool | `icp-basic`: false, keine Kind-Analyse möglich |
| `legacy_type` | tinyint, unique, null | `analysis_vouchers.analysis_type` |
| `sort_order` | smallint | |

### `analysis_methods`
Die Methode bestimmt das Labor. Bei der Aktivierung setzt das Backend sie vorläufig aus Paket und Wasserart des Beckens.

| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | smallint PK | |
| `key` | string(30), unique | siehe Tabelle unten |
| `name` | json | |
| `water_type` | string(30) | Werte wie `aquariums.water_type` |
| `legacy_type` | tinyint, unique, null | `analysis.type` |
| `sort_order` | smallint | |

### `analysis_package_methods`
Welche Methoden zu welchem Paket passen. PK `(package_id, method_id)`, beide FK cascade.

| Paket | Meerwasser | Süßwasser | Osmosewasser | Meersalz |
|---|---|---|---|---|
| `icp-oes` | `meerwasser` | `suesswasser` | `osmose` | `meersalz` |
| `icp-basic` | `meerwasser-basis` | `suesswasser` | – | – |
| `icp-ms` | `meerwasser-icp-ms` | `suesswasser-icp-ms` | `osmose` | `meersalz` |

Aquakultur ist vorerst nicht berücksichtigt.

### `analysis_method_elements`
Positivliste: welche Elemente zu einer Methode gehören, also angezeigt und ausgewertet werden. PK `(method_id, element_id)`, beide FK cascade.

| Spalte | Typ | Hinweis |
|---|---|---|
| `is_evaluated` | bool, default true | false = nur anzeigen, nicht bewerten |
| `precision` | tinyint, null | Abweichende Nachkommastellen, z. B. 3 bei ICP-MS-Spurenelementen |

Die Daten für den Seeder stammen aus den alten Listen `ignoreElements`, `notEvaluatedElements` und `icpMsElements` (`LAB-web/public/js/services/analysisresults.js`):

| Methode | Ohne diese Elemente | Nicht bewertet | 3 Nachkommastellen |
|---|---|---|---|
| `meerwasser` | Rb, Nb, Nd, Zr, Ge, Ga, Te | | |
| `meerwasser-basis` | Rb, Nb, Nd, Zr, Ge, Ga, Te | KH, F, NO3 | |
| `meerwasser-icp-ms` | – | | die 32 ICP-MS-Elemente |
| `suesswasser` | Sal. total, I, Rb, Nb, Nd, Zr, Ge, Ga, Te | | |
| `suesswasser-icp-ms` | Sal. total, I | | die 32 ICP-MS-Elemente |
| `osmose` | Sal. total, KH, Cl, Na, Mg, S, Ca, K, Br, Sr, B, F, I, NO3, Rb, Nb, Nd, Zr, Ge, Ga, Te | | |
| `meersalz` | KH, F, NO3, Rb, Nb, Nd, Zr, Ge, Ga, Te | | |

Änderungen an der Zuordnung gelten auch für alte Berichte, wie in der alten Lösung. Eine Versionierung ist nicht vorgesehen.

### `evaluation_scales`
Bewertungsskalen: Idealwerte und Grenzen, nach denen Ergebnisse bewertet werden. Neben den globalen Skalen (ATI, NYOS, Fauna Marin, weitere im Admin-Bereich) gibt es eigene Zielwerte pro Kunde.

| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | string(50) PK | `ati-standard`, `nyos`, `fauna-marin`; eigene Skalen bekommen eine generierte ID |
| `user_id` | uuid FK → users, null, cascade | null = globale Skala; gesetzt = eigene Zielwerte dieses Kunden |
| `name` | json | |
| `description` | json, null | |
| `is_built_in` | bool | Nicht löschbar |
| `sort_order` | smallint | |
| `timestamps` | | |

Ein Becken darf nur globale Skalen oder Skalen seines Besitzers verwenden. Das prüft die Anwendung, nicht die Datenbank.

### `evaluation_scale_thresholds`
Grenzwerte einer Skala pro Wasserart und Element. PK `(scale_id, water_type, element_id)`, `scale_id` FK cascade, `element_id` FK cascade.

| Spalte | Typ | Hinweis |
|---|---|---|
| `water_type` | string(30) | Die Grenzen hängen von der Wasserart ab, nicht von der Methode; `meerwasser`, `-basis` und `-icp-ms` teilen sich die Werte |
| `target` | double, null | Idealwert, auf den der Dosierplan hinkorrigiert |
| `min`, `max` | double, null | Idealer Bereich (Stufe 5) |
| `crit_low`, `too_low`, `low` | double, null | „Kritisch niedrig unter“, „Zu niedrig unter“, „Niedrig unter“ (Stufen 1–3); `min` begrenzt Stufe 4 |
| `increased`, `high`, `too_high` | double, null | „Erhöht bis“, „Hoch bis“, „Zu hoch bis“ (Stufen 6–8); darüber Stufe 9 |

null bedeutet „keine Grenze“, die Stufe entfällt dann. Fehlt für ein Element eine Zeile, gilt `ati-standard`; eine Skala enthält also nur abweichende Elemente. Alle Werte gelten für 35 PSU. Die Korrektur auf die Salinität der Probe passiert bei der Auswertung.

## Bewegungsdaten

### `vouchers`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | bigint PK | |
| `legacy_id` | uint, unique, null | `analysis_vouchers.id` |
| `code` | string(19), unique | `XXXX-XXXX-XXXX-XXXX`, Großbuchstaben |
| `package_id` | FK → analysis_packages | |
| `is_free` | bool | Free ICP = `icp-basic` + kostenlos |
| `legacy_sub_type` | int, null | Bedeutung unbekannt, nur zur Nachverfolgung |
| `timestamps` | | |

Ob ein Barcode eingelöst ist, ergibt sich aus `analyses.voucher_id`. Der Unique-Index dort verhindert, dass ein Barcode doppelt eingelöst wird.

### `analyses`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | string(64) PK | Wie `aquariums.id`, Demo-IDs bleiben möglich |
| `legacy_id` | uint, unique, null | `analysis.id` |
| `user_id` | uuid FK → users, cascade | Direkter Besitzer |
| `aquarium_id` | string(64) FK → aquariums, null, **nullOnDelete** | Berichte bleiben erhalten, wenn das Becken gelöscht wird |
| `aquarium_name` | string(120) | Name zum Zeitpunkt der Aktivierung |
| `voucher_id` | FK → vouchers, **unique**, null | Null bei Kind-Analysen und alten Analysen, die das Labor ohne Barcode angelegt hat |
| `parent_id` | string(64) FK → analyses, null, cascade | Osmose-/Meersalz-Probe → Hauptanalyse |
| `package_id` | FK → analysis_packages, null | Vom Voucher; Kind-Analysen erben es; null = unbekannt |
| `method_id` | FK → analysis_methods, null | null = unbekannt, dann gilt die Wasserart des Beckens |
| `evaluation_scale_id` | string(50) FK → evaluation_scales, null, nullOnDelete | Skala, nach der bewertet wurde; vom Becken übernommen |
| `reason` | string(20), null | `routine`, `algen`, `cyanos`, `rtn`, `stn` |
| `status` | string(20) | `registered`, `received`, `in_analysis`, `completed` |
| `language` | string(5), null | |
| `customer_comment` | text, null | |
| `lab_advice` | text, null | |
| `quality_index` | decimal(5,1), null | |
| `share_token` | string(40), unique, null | Link zum Teilen |
| `received_at` | timestamp, null | |
| `analysed_at` | timestamp, null | |
| `timestamps` | | `created_at` = Aktivierung |

Indizes: `(user_id, created_at)`, `(aquarium_id, analysed_at)`, `parent_id`.

Wählt der Kunde bei der Aktivierung ein Osmose-Becken, legt das Backend die Kind-Analyse sofort mit an (nur bei Paketen mit `includes_osmosis`).

### `analysis_addons`
PK `(analysis_id, addon)`, `analysis_id` FK cascade. `addon`: `sak254`, `rush`, `advisor` (PHP-Enum).

### `analysis_results`
Alle gemessenen Werte, auch solche, die die Methode ausblendet (z. B. KH bei Meersalz).

| Spalte | Typ | Hinweis |
|---|---|---|
| `analysis_id` | FK → analyses, cascade | PK zusammen mit `element_id` |
| `element_id` | FK → elements | |
| `value` | double, null | null = unter Nachweisgrenze bzw. nicht messbar |
| `band` | tinyint, null | Bewertung als Stufe 1–9 (5 = optimal) |
| `target`, `min`, `max` | float, null | Idealwert und idealer Bereich zum Zeitpunkt der Bewertung, auf die Salinität normiert |

`band`, `target`, `min` und `max` sind ein Snapshot nach `analyses.evaluation_scale_id`. Alte Berichte bleiben dadurch unverändert, auch wenn jemand eine Skala ändert. Index `(element_id, analysis_id)` für Zeitreihen. Ohne `timestamps`.

### `analysis_dosings`
| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | bigint PK | |
| `analysis_id`, `element_id` | FK → analysis_results, cascade | |
| `product_id` | FK → products | |
| `amount_per_day` | double | |
| `days` | smallint | |
| `position` | tinyint | 1 oder 2 |

### `analysis_group_scores`
PK `(analysis_id, element_group_id)`, `score` tinyint (0–100). `analysis_id` FK cascade.

## Änderung an bestehenden Tabellen

`aquariums.evaluation_scale_id` (heute string(50), Default `ati-standard`, ohne Bezug) wird FK → `evaluation_scales`, restrictOnDelete. Bevor eine eigene Skala gelöscht wird, setzt die Anwendung betroffene Becken zurück auf `ati-standard`.

## Übernahme aus der alten Datenbank

Übernommen werden die Analysen aller Becken, die bereits übernommen sind (`aquariums.legacy_id`), samt Messwerten, Dosierungen und Gruppen-Scores. Die Voucher werden vollständig übernommen, auch die ungenutzten.

### Ablauf

Alle Schritte sind wiederholbar; die `legacy:*`-Befehle haben `--dry-run`. Die Reihenfolge ist wichtig, weil jeder Schritt die Zuordnungen des vorherigen braucht.

```sh
php artisan db:seed --class=AnalysisCatalogSeeder   # Gruppen, Elemente, Pakete, Methoden (läuft auch mit migrate --seed)
php artisan db:seed --class=RecommendationRuleSeeder # Empfehlungsregeln V2.2 (läuft auch mit migrate --seed)
php artisan legacy:import-catalog                   # Produkte, Grenzwerte ati-standard und nyos
php artisan legacy:import-users                     # Konten; für Testdaten z. B. --sample=20, --id=…, --email=…
php artisan legacy:import-aquariums                 # Becken der übernommenen Konten
php artisan legacy:import-vouchers                  # alle Barcodes (~300k)
php artisan legacy:import-analyses                  # Analysen, Messwerte, Dosierungen, Gruppen-Scores der übernommenen Becken
php artisan legacy:import-recommendations           # alte Empfehlungstexte als inaktive Regeln (nur Deutsch)
php artisan recommendations:generate                # Empfehlungen der abgeschlossenen Analysen erzeugen (Import löst keine Modell-Events aus)
php artisan legacy:anonymize                        # nur Test-/Entwicklungsdaten; nach jedem erneuten Import wiederholen
```

Ein erneuter `legacy:import-*` schreibt die echten Namen und Texte zurück. In Testdatenbanken danach immer `legacy:anonymize` ausführen.

Ältere Osmose-Analysen haben im Altsystem keine `parent_id` (das Labor hat die Proben erst später verknüpft). Sie werden als eigenständige Analysen ohne Paket übernommen.

| Alt | Neu |
|---|---|
| `elements_groups` | `element_groups` |
| `elements` (+ `units.symbol`) | `elements` |
| `supplements` | `products` |
| `analysis_vouchers` | `vouchers` (`analysis_id` → `analyses.voucher_id`) |
| `analysis` | `analyses` (`user_id` über `tanks.users_id`) |
| `elements.ref_value*` | `evaluation_scale_thresholds` der Skala `ati-standard`, Wasserart Meerwasser |
| `elements.ref_value*_nyos` | `evaluation_scale_thresholds` der Skala `nyos`, Wasserart Meerwasser |
| `analysis_results` | `analysis_results` + `analysis_dosings` (`supplements_id`, `supplements_id2`) |
| `analysis2elements_groups` | `analysis_group_scores` |

Zuordnung der Werte:

| Alt | Neu |
|---|---|
| Voucher `analysis_type` 0 / 1 / 2 | `icp-oes` / `icp-basic` + `is_free` / `icp-ms` |
| `analysis.type` 1 / 2 / 3 / 4 / 5 / 6 / 7 | `meerwasser` / `suesswasser` / `osmose` / `meersalz` / `meerwasser-basis` / `meerwasser-icp-ms` / `suesswasser-icp-ms`; 0 → null |
| `status` 2 | `completed` |
| `status` 1 | `in_analysis` |
| `status` -1 | `received`, wenn `date_arrived` gültig ist, sonst `registered` |
| `reason` 1 / 2 / 3 / 4 / 5 | `routine` / `algen` / `cyanos` / `rtn` / `stn` |
| `comment` / `advice` / `lang` | `customer_comment` / `lab_advice` / `language` |
| `super_quality_index` | `quality_index` |
| `hash` | `share_token` |
| `date_arrived` / `date_analysed` | `received_at` / `analysed_at` (`0000-00-00` → null) |
| `parent_id` | `parent_id` (zeigt auf die Hauptanalyse, nicht auf ein Becken) |
| `package_id` bei Analysen ohne Voucher | vom Voucher der Hauptanalyse, sonst null |
| `evaluation_scale_id` | `ati-standard` |
| `result_status` −2 / −1 / 0 / +1 / +2 | `band` 2 / 4 / 5 / 6 / 8 |
| `ref_norm_value` / `_low_1` / `_high_1` | `target` / `min` / `max` (`ref_norm_value_low_2` und `_high_2` entfallen, die Stufe steht in `band`) |

Grenzwerte der Skala `ati-standard` aus `elements`, passend zur Abbildung der Stufen:

| `elements` | `evaluation_scale_thresholds` |
|---|---|
| `ref_value` | `target` |
| `ref_value_low_1` / `ref_value_high_1` | `min` / `max` |
| `ref_value_low_2` | `too_low` und `low` (Stufe 3 bleibt leer) |
| `ref_value_high_2` | `increased` und `high` (Stufe 7 bleibt leer) |
| – | `crit_low`, `too_high` = null (Stufen 1 und 9 gab es nicht) |

Negative Untergrenzen (z. B. −40 bei Schadstoffen) bedeuten „keine Untergrenze“ und werden zu null. Die NYOS-Werte (`ref_value_nyos`, `ref_value_low_nyos`, `ref_value_high_nyos`) werden zu `target`, `min`, `max`. Die alte Datenbank kennt nur Grenzwerte für Meerwasser; die übrigen Wasserarten kommen aus dem Seeder.

`elements_action` übernimmt `legacy:import-recommendations`, siehe [schema-recommendations.md](schema-recommendations.md#aus-der-alten-datenbank).

Nicht übernommen: `kh_value`, `nitrate_value`, `fluorite_value` (Kopien der Messwerte), `ip`, `subadmin_userid`, `units`, `elements_prios`. Die Tabellen `analysis_charts` und `comments` kommen mit Chronik und Timeline in einem späteren Schritt.

Mengen (alte DB, alle Konten): 334k Analysen, 14,7 Mio. Messwerte, 1,3 Mio. Gruppen-Scores, 302k Voucher.
