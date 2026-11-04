<?php

namespace App\Recommendations;

use App\Models\Analysis;
use App\Models\Aquarium;
use App\Models\EvaluationScale;
use Illuminate\Support\Facades\DB;

/**
 * Alles, was Regeln über eine Analyse wissen dürfen: Messwerte der Hauptanalyse und der
 * Osmoseprobe mit Stufe, Sollwert und Grenzen der Skala sowie die Beckenwerte.
 *
 * Ein Element-Eintrag: key, name (json), group_id, value, band, unit, target, min, max,
 * critLow, tooLow, low, increased, high, tooHigh.
 */
class AnalysisContext
{
    public const OSMOSIS_METHOD = 'osmose';

    /**
     * @param  array<string, array<string, mixed>>  $sample  Element-Key => Eintrag (Hauptanalyse)
     * @param  array<string, array<string, mixed>>|null  $osmosis  Osmoseprobe, null = keine
     * @param  array<string, mixed>  $inputs  volume, supplyParts, hasOsmosis, resinFilter, waterType, scale
     */
    public function __construct(
        public readonly array $sample,
        public readonly ?array $osmosis,
        public readonly array $inputs,
    ) {}

    public static function for(Analysis $analysis): self
    {
        $analysis->loadMissing(['method', 'aquarium.links.linkedAquarium', 'children.method']);
        $aquarium = $analysis->aquarium;
        $scale = $analysis->evaluation_scale_id ?? $aquarium?->evaluation_scale_id ?? EvaluationScale::DEFAULT;
        $waterType = $analysis->method?->water_type ?? $aquarium?->water_type ?? 'Meerwasser';

        $sample = self::sample($analysis, $scale, $waterType);
        // Eine eigenständige Osmoseanalyse ist ihre eigene Osmoseprobe.
        $child = $analysis->children->first(fn (Analysis $child) => $child->method?->key === self::OSMOSIS_METHOD);
        $osmosis = $child
            ? self::sample($child, $scale, $child->method->water_type)
            : ($analysis->method?->key === self::OSMOSIS_METHOD ? $sample : null);

        $source = $aquarium?->links->firstWhere('type', 'osmosis_source')?->linkedAquarium;

        return new self($sample, $osmosis, [
            'volume' => $aquarium?->net_volume !== null ? (float) $aquarium->net_volume : null,
            'supplyParts' => $aquarium ? self::supplyParts($aquarium) : null,
            // Wer eine Osmoseprobe einschickt, hat eine Osmoseanlage – auch ohne verknüpftes Profil.
            'hasOsmosis' => $source !== null || $osmosis !== null,
            'resinFilter' => (bool) ($source?->water_details['resin_filter'] ?? false),
            'waterType' => $waterType,
            'scale' => $scale,
        ]);
    }

    /**
     * Teile des Versorgungssystems wie in client/src/services/supplySystem.js:
     * 0 = keines, 1 = All-in-one, 2 = KH und Ca/Mg getrennt, 3 = KH, Ca und Mg getrennt, null = unbekannt.
     */
    public static function supplyParts(Aquarium $aquarium): ?int
    {
        return match ($aquarium->supply_mode) {
            'none' => 0,
            'ati', 'nyos' => 2,
            'other' => in_array((int) $aquarium->supply_bottles, [1, 2, 3], true) ? (int) $aquarium->supply_bottles : null,
            default => null,
        };
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private static function sample(Analysis $analysis, string $scale, string $waterType): array
    {
        $rows = DB::table('analysis_results')
            ->join('elements', 'elements.id', '=', 'analysis_results.element_id')
            ->where('analysis_results.analysis_id', $analysis->id)
            ->orderBy('elements.sort_order')
            ->get(['elements.id', 'elements.key', 'elements.name', 'elements.unit', 'elements.element_group_id',
                'analysis_results.value', 'analysis_results.band', 'analysis_results.target', 'analysis_results.min', 'analysis_results.max']);

        // Positivliste der Methode; ohne Methode zählen alle Messwerte.
        $methodElements = $analysis->method_id
            ? DB::table('analysis_method_elements')->where('method_id', $analysis->method_id)->pluck('is_evaluated', 'element_id')
            : null;

        // Fehlt in der Skala ein Element, gilt ati-standard.
        $thresholds = DB::table('evaluation_scale_thresholds')
            ->whereIn('scale_id', array_unique([$scale, EvaluationScale::DEFAULT]))
            ->where('water_type', $waterType)
            ->whereIn('element_id', $rows->pluck('id'))
            ->get()
            ->sortBy(fn ($row) => $row->scale_id === $scale ? 0 : 1)
            ->unique('element_id')
            ->keyBy('element_id');

        $sample = [];
        foreach ($rows as $row) {
            if ($methodElements !== null && ! $methodElements->has($row->id)) {
                continue;
            }
            $limits = $thresholds->get($row->id);
            $number = fn ($value) => $value === null ? null : (float) $value;
            $sample[$row->key] = [
                'key' => $row->key,
                'name' => json_decode($row->name, true) ?: [],
                'group_id' => (int) $row->element_group_id,
                'value' => $number($row->value),
                'band' => $row->band !== null && ($methodElements === null || $methodElements->get($row->id)) ? (int) $row->band : null,
                'unit' => $row->unit,
                'target' => $number($row->target ?? $limits?->target),
                'min' => $number($row->min ?? $limits?->min),
                'max' => $number($row->max ?? $limits?->max),
                'critLow' => $number($limits?->crit_low),
                'tooLow' => $number($limits?->too_low),
                'low' => $number($limits?->low),
                'increased' => $number($limits?->increased),
                'high' => $number($limits?->high),
                'tooHigh' => $number($limits?->too_high),
            ];
        }

        return $sample;
    }
}
