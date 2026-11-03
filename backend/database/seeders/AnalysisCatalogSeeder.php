<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Stammdaten der Analysen: Elementgruppen, Elemente, Pakete, Methoden und deren Zuordnungen.
 *
 * Keys, Einheiten und Nachkommastellen wie in client/src/services/analysisCatalog.js,
 * alte IDs und Elementumfang je Methode aus der alten Datenbank bzw.
 * LAB-web/public/js/services/analysisresults.js (ignoreElements, notEvaluatedElements, icpMsElements).
 *
 * Wiederholbar: vorhandene Einträge werden über ihren Key aktualisiert.
 */
class AnalysisCatalogSeeder extends Seeder
{
    /** key => [legacy_id, de, en, in_quality_index] */
    private const GROUPS = [
        'basis' => [5, 'Basiswerte', 'Base values', true],
        'quantity' => [1, 'Mengenelemente', 'Major elements', true],
        'nutrients' => [4, 'Nährstoffe', 'Nutrients', false],
        'trace' => [2, 'Spurenelemente', 'Minor elements', true],
        'pollutants' => [3, 'Unerwünschte Elemente', 'Pollutants', true],
        'balance-index' => [6, 'Balance-Index', 'Balance index', true],
        'growth-index' => [7, 'Wachstums-Index', 'Growth index', true],
    ];

    /** key => [legacy_id, group, symbol, unit, precision, de, en] */
    private const ELEMENTS = [
        'salinity' => [64, 'basis', 'PSU', 'PSU', 1, 'Salinität', 'Salinity'],
        'nacl' => [55, 'basis', 'NaCl', 'PSU', 1, 'Salinität (NaCl)', 'Salinity (NaCl)'],
        'kh' => [56, 'basis', 'KH', 'dKH', 2, 'Karbonathärte', 'Carbonate hardness'],

        'boron' => [15, 'quantity', 'B', 'mg/l', 2, 'Bor', 'Boron'],
        'bromine' => [14, 'quantity', 'Br', 'mg/l', 1, 'Brom', 'Bromine'],
        'calcium' => [46, 'quantity', 'Ca', 'mg/l', 1, 'Calcium', 'Calcium'],
        'chloride' => [50, 'quantity', 'Cl', 'mg/l', 0, 'Chlorid', 'Chloride'],
        'potassium' => [13, 'quantity', 'K', 'mg/l', 1, 'Kalium', 'Potassium'],
        'magnesium' => [12, 'quantity', 'Mg', 'mg/l', 1, 'Magnesium', 'Magnesium'],
        'sodium' => [11, 'quantity', 'Na', 'mg/l', 0, 'Natrium', 'Sodium'],
        'sulfur' => [17, 'quantity', 'S', 'mg/l', 1, 'Schwefel', 'Sulfur'],
        'strontium' => [16, 'quantity', 'Sr', 'mg/l', 2, 'Strontium', 'Strontium'],
        'fluoride' => [61, 'quantity', 'F', 'mg/l', 3, 'Fluorid', 'Fluoride'],

        'nitrate' => [60, 'nutrients', 'NO₃', 'mg/l', 2, 'Nitrat', 'Nitrate'],
        'phosphate' => [31, 'nutrients', 'PO₄', 'mg/l', 3, 'Phosphat', 'Phosphate'],
        'phosphorus' => [30, 'nutrients', 'P', 'µg/l', 1, 'Phosphor', 'Phosphorus'],

        'silicon' => [29, 'trace', 'Si', 'µg/l', 1, 'Silizium', 'Silicon'],
        'cobalt' => [26, 'trace', 'Co', 'µg/l', 2, 'Cobalt', 'Cobalt'],
        'chromium' => [25, 'trace', 'Cr', 'µg/l', 2, 'Chrom', 'Chromium'],
        'copper' => [10, 'trace', 'Cu', 'µg/l', 2, 'Kupfer', 'Copper'],
        'iron' => [27, 'trace', 'Fe', 'µg/l', 2, 'Eisen', 'Iron'],
        'iodine' => [24, 'trace', 'I', 'µg/l', 1, 'Iod', 'Iodine'],
        'lithium' => [18, 'trace', 'Li', 'µg/l', 1, 'Lithium', 'Lithium'],
        'manganese' => [23, 'trace', 'Mn', 'µg/l', 2, 'Mangan', 'Manganese'],
        'molybdenum' => [20, 'trace', 'Mo', 'µg/l', 2, 'Molybdän', 'Molybdenum'],
        'nickel' => [19, 'trace', 'Ni', 'µg/l', 2, 'Nickel', 'Nickel'],
        'selenium' => [2, 'trace', 'Se', 'µg/l', 2, 'Selen', 'Selenium'],
        'vanadium' => [21, 'trace', 'V', 'µg/l', 2, 'Vanadium', 'Vanadium'],
        'zinc' => [22, 'trace', 'Zn', 'µg/l', 2, 'Zink', 'Zinc'],
        'barium' => [28, 'trace', 'Ba', 'µg/l', 2, 'Barium', 'Barium'],
        'arsenic' => [6, 'trace', 'As', 'µg/l', 2, 'Arsen', 'Arsenic'],
        'beryllium' => [48, 'trace', 'Be', 'µg/l', 2, 'Beryllium', 'Beryllium'],
        'silver' => [49, 'trace', 'Ag', 'µg/l', 2, 'Silber', 'Silver'],
        'tin' => [4, 'trace', 'Sn', 'µg/l', 2, 'Zinn', 'Tin'],
        'rubidium' => [74, 'trace', 'Rb', 'µg/l', 2, 'Rubidium', 'Rubidium'],

        'aluminium' => [7, 'pollutants', 'Al', 'µg/l', 1, 'Aluminium', 'Aluminium'],
        'bismuth' => [54, 'pollutants', 'Bi', 'µg/l', 2, 'Bismut', 'Bismuth'],
        'cadmium' => [3, 'pollutants', 'Cd', 'µg/l', 2, 'Cadmium', 'Cadmium'],
        'mercury' => [1, 'pollutants', 'Hg', 'µg/l', 2, 'Quecksilber', 'Mercury'],
        'lanthanum' => [63, 'pollutants', 'La', 'µg/l', 2, 'Lanthan', 'Lanthanum'],
        'lead' => [8, 'pollutants', 'Pb', 'µg/l', 2, 'Blei', 'Lead'],
        'antimony' => [5, 'pollutants', 'Sb', 'µg/l', 2, 'Antimon', 'Antimony'],
        'titanium' => [9, 'pollutants', 'Ti', 'µg/l', 2, 'Titan', 'Titanium'],
        'thallium' => [53, 'pollutants', 'Tl', 'µg/l', 2, 'Thallium', 'Thallium'],
        'tungsten' => [62, 'pollutants', 'W', 'µg/l', 2, 'Wolfram', 'Tungsten'],
        'gallium' => [79, 'pollutants', 'Ga', 'µg/l', 2, 'Gallium', 'Gallium'],
        'neodymium' => [76, 'pollutants', 'Nd', 'µg/l', 2, 'Neodym', 'Neodymium'],
        'zirconium' => [77, 'pollutants', 'Zr', 'µg/l', 2, 'Zirkonium', 'Zirconium'],
        'germanium' => [78, 'pollutants', 'Ge', 'µg/l', 2, 'Germanium', 'Germanium'],
        'niobium' => [75, 'pollutants', 'Nb', 'µg/l', 2, 'Niob', 'Niobium'],
        'tellurium' => [80, 'pollutants', 'Te', 'µg/l', 2, 'Tellur', 'Tellurium'],

        'ratio-na-cl' => [65, 'balance-index', 'Na / Cl', null, 2, 'Natrium zu Chlorid', 'Sodium to chloride'],
        'ratio-mg-s' => [66, 'balance-index', 'Mg / S', null, 2, 'Magnesium zu Schwefel', 'Magnesium to sulfur'],
        'ratio-mg-ca' => [67, 'balance-index', 'Mg / Ca', null, 2, 'Magnesium zu Calcium', 'Magnesium to calcium'],
        'ratio-ca-sr' => [68, 'balance-index', 'Ca / Sr', null, 2, 'Calcium zu Strontium', 'Calcium to strontium'],
        'ratio-ca-k' => [73, 'balance-index', 'Ca / K', null, 2, 'Calcium zu Kalium', 'Calcium to potassium'],
        'ratio-psu-nacl' => [72, 'balance-index', 'PSU NaCl / PSU else', null, 2, 'Salinität NaCl zu übriger Salinität', 'Salinity NaCl to other salinity'],
        'ratio-kh-ca' => [69, 'growth-index', 'KH / Ca', null, 2, 'KH zu Calcium', 'KH to calcium'],
        'ratio-kh-p' => [70, 'growth-index', 'KH / P', null, 2, 'KH zu Phosphor', 'KH to phosphorus'],
    ];

    /** key => [legacy_type, de, includes_osmosis] */
    private const PACKAGES = [
        'icp-oes' => [0, 'ICP-OES', true],
        'icp-basic' => [1, 'ICP-Basic', false],
        'icp-ms' => [2, 'ICP-MS', true],
    ];

    /** key => [legacy_type, water_type, de, en] */
    private const METHODS = [
        'meerwasser' => [1, 'Meerwasser', 'Meerwasser', 'Seawater'],
        'meerwasser-basis' => [5, 'Meerwasser', 'Meerwasser Basis', 'Basic seawater'],
        'meerwasser-icp-ms' => [6, 'Meerwasser', 'Meerwasser ICP-MS', 'Seawater ICP-MS'],
        'suesswasser' => [2, 'Süßwasser', 'Süßwasser', 'Freshwater'],
        'suesswasser-icp-ms' => [7, 'Süßwasser', 'Süßwasser ICP-MS', 'Freshwater ICP-MS'],
        'osmose' => [3, 'Osmosewasser', 'Osmosewasser', 'Osmosis water'],
        'meersalz' => [4, 'Meersalz', 'Meersalz', 'Sea salt'],
    ];

    /** Paket => passende Methoden */
    private const PACKAGE_METHODS = [
        'icp-oes' => ['meerwasser', 'suesswasser', 'osmose', 'meersalz'],
        'icp-basic' => ['meerwasser-basis', 'suesswasser'],
        'icp-ms' => ['meerwasser-icp-ms', 'suesswasser-icp-ms', 'osmose', 'meersalz'],
    ];

    /** Nur per ICP-MS messbar (alt bei allen übrigen Methoden ausgeblendet). */
    private const MS_ONLY = ['rubidium', 'niobium', 'neodymium', 'zirconium', 'germanium', 'gallium', 'tellurium'];

    /** Bei ICP-MS mit 3 Nachkommastellen angezeigt (alt: icpMsElements). */
    private const MS_PRECISION = [
        'rubidium', 'manganese', 'arsenic', 'beryllium', 'chromium', 'cobalt', 'iron', 'copper', 'selenium', 'silver',
        'vanadium', 'zinc', 'tin', 'aluminium', 'antimony', 'bismuth', 'lead', 'cadmium', 'lanthanum', 'thallium',
        'titanium', 'tungsten', 'mercury', 'niobium', 'neodymium', 'zirconium', 'germanium', 'gallium', 'nickel',
        'tellurium', 'barium', 'molybdenum',
    ];

    /** Methode => [ausgeblendete Elemente, nicht bewertete Elemente, Elemente mit 3 Nachkommastellen] */
    private function methodElements(): array
    {
        return [
            'meerwasser' => [self::MS_ONLY, [], []],
            'meerwasser-basis' => [self::MS_ONLY, ['kh', 'fluoride', 'nitrate'], []],
            'meerwasser-icp-ms' => [[], [], self::MS_PRECISION],
            'suesswasser' => [['salinity', 'iodine', ...self::MS_ONLY], [], []],
            'suesswasser-icp-ms' => [['salinity', 'iodine'], [], self::MS_PRECISION],
            'osmose' => [[
                'salinity', 'kh', 'chloride', 'sodium', 'magnesium', 'sulfur', 'calcium', 'potassium', 'bromine',
                'strontium', 'boron', 'fluoride', 'iodine', 'nitrate', ...self::MS_ONLY,
            ], [], []],
            'meersalz' => [['kh', 'fluoride', 'nitrate', ...self::MS_ONLY], [], []],
        ];
    }

    public function run(): void
    {
        $now = now();
        $json = fn (array $value) => json_encode($value, JSON_UNESCAPED_UNICODE);

        $sort = 0;
        DB::table('element_groups')->upsert(collect(self::GROUPS)->map(fn (array $g, string $key) => [
            'key' => $key, 'legacy_id' => $g[0], 'name' => $json(['de' => $g[1], 'en' => $g[2]]),
            'in_quality_index' => $g[3], 'sort_order' => $sort += 10, 'created_at' => $now, 'updated_at' => $now,
        ])->values()->all(), ['key'], ['legacy_id', 'name', 'in_quality_index', 'sort_order', 'updated_at']);
        $groups = DB::table('element_groups')->pluck('id', 'key');

        $sort = 0;
        DB::table('elements')->upsert(collect(self::ELEMENTS)->map(fn (array $e, string $key) => [
            'key' => $key, 'legacy_id' => $e[0], 'element_group_id' => $groups[$e[1]], 'symbol' => $e[2],
            'unit' => $e[3], 'precision' => $e[4], 'name' => $json(['de' => $e[5], 'en' => $e[6]]),
            'is_calculated' => str_starts_with($key, 'ratio-'), 'sort_order' => $sort += 10,
            'created_at' => $now, 'updated_at' => $now,
        ])->values()->all(), ['key'], ['legacy_id', 'element_group_id', 'symbol', 'unit', 'precision', 'name', 'is_calculated', 'sort_order', 'updated_at']);
        $elements = DB::table('elements')->pluck('id', 'key');

        $sort = 0;
        DB::table('analysis_packages')->upsert(collect(self::PACKAGES)->map(fn (array $p, string $key) => [
            'key' => $key, 'legacy_type' => $p[0], 'name' => $json(['de' => $p[1], 'en' => $p[1]]),
            'includes_osmosis' => $p[2], 'sort_order' => $sort += 10, 'created_at' => $now, 'updated_at' => $now,
        ])->values()->all(), ['key'], ['legacy_type', 'name', 'includes_osmosis', 'sort_order', 'updated_at']);
        $packages = DB::table('analysis_packages')->pluck('id', 'key');

        $sort = 0;
        DB::table('analysis_methods')->upsert(collect(self::METHODS)->map(fn (array $m, string $key) => [
            'key' => $key, 'legacy_type' => $m[0], 'water_type' => $m[1], 'name' => $json(['de' => $m[2], 'en' => $m[3]]),
            'sort_order' => $sort += 10, 'created_at' => $now, 'updated_at' => $now,
        ])->values()->all(), ['key'], ['legacy_type', 'water_type', 'name', 'sort_order', 'updated_at']);
        $methods = DB::table('analysis_methods')->pluck('id', 'key');

        $packageMethods = [];
        foreach (self::PACKAGE_METHODS as $package => $keys) {
            foreach ($keys as $method) {
                $packageMethods[] = ['package_id' => $packages[$package], 'method_id' => $methods[$method]];
            }
        }
        DB::table('analysis_package_methods')->insertOrIgnore($packageMethods);

        $methodElements = [];
        foreach ($this->methodElements() as $method => [$hidden, $notEvaluated, $msPrecision]) {
            foreach (array_diff(array_keys(self::ELEMENTS), $hidden) as $element) {
                $methodElements[] = [
                    'method_id' => $methods[$method],
                    'element_id' => $elements[$element],
                    'is_evaluated' => ! in_array($element, $notEvaluated, true),
                    'precision' => in_array($element, $msPrecision, true) ? 3 : null,
                ];
            }
        }
        DB::table('analysis_method_elements')->upsert($methodElements, ['method_id', 'element_id'], ['is_evaluated', 'precision']);
    }
}
