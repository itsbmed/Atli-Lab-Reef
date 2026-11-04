<?php

namespace App\Http\Resources;

use App\Models\Analysis;
use App\Models\AnalysisRecommendation;
use App\Models\AnalysisResult;
use App\Recommendations\RecommendationEngine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Analyse in der Form des Frontend-Speichers (client/src/services/analysisStore.js, camelCase).
 *
 * Messwerte (parameters), Gruppen-Scores und mitgeschickte Proben (samples) nur, wenn sie
 * geladen sind (Detailansicht). Angezeigt werden nur Elemente der Methode; ohne Methode alle.
 *
 * @mixin Analysis
 */
class AnalysisResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ownerId' => $this->user_id,
            'parentId' => $this->parent_id,
            'aquariumId' => $this->aquarium_id,
            'aquariumName' => $this->aquarium_name,
            // Nummer des alten Laborberichts; ohne sie zeigt das Frontend den Barcode.
            'reportNumber' => $this->legacy_id ? (string) $this->legacy_id : null,
            'barcode' => $this->voucher?->code,
            'package' => $this->package?->key,
            'packageName' => $this->package?->name,
            'isFree' => (bool) $this->voucher?->is_free,
            'method' => $this->method?->key,
            'methodName' => $this->method?->name,
            'waterType' => $this->method?->water_type ?? $this->aquarium?->water_type,
            'reason' => $this->reason?->value,
            'addons' => $this->addons->map(fn ($addon) => $addon->addon->value)->values(),
            'status' => $this->status->value,
            'evaluationScaleId' => $this->evaluation_scale_id,
            'language' => $this->language,
            'comment' => $this->customer_comment ?? '',
            'labAdvice' => $this->lab_advice ?? '',
            'score' => $this->quality_index,
            'issueCount' => $this->whenCounted('issue', fn () => $this->issue_count, fn () => $this->issueCount()),
            'osmoseAquariumId' => $this->whenLoaded('children', fn () => $this->children->firstWhere('method.key', 'osmose')?->aquarium_id ?? ''),
            'groupScores' => $this->whenLoaded('groupScores', fn () => (object) $this->groupScores->mapWithKeys(fn ($score) => [$score->group->key => $score->score])->all()),
            'parameters' => $this->whenLoaded('results', fn () => $this->parameters()),
            // Ausgewertete Empfehlungen in der Sprache des Nutzers (Fallback en, dann de)
            'recommendations' => $this->whenLoaded('recommendations', fn () => $this->recommendations->map(fn (AnalysisRecommendation $card) => [
                'id' => $card->id,
                'key' => $card->rule_key,
                'tone' => $card->tone,
                'priority' => $card->priority,
                'recheckDays' => $card->recheck_days,
                'elements' => $card->elements,
                ...self::localized($card->content, $request->user()?->language),
                'inputs' => $card->inputs,
                'isEdited' => $card->is_edited,
                'completedAt' => $card->completed_at?->toJSON(),
            ])->values()),
            // Mitgeschickte Osmose-/Meersalz-Proben mit eigenen Messwerten
            'samples' => self::collection($this->whenLoaded('children')),
            'createdAt' => $this->created_at?->toJSON(),
            'receivedAt' => $this->received_at?->toJSON(),
            'completedAt' => $this->analysed_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }

    /**
     * Messwerte in der Reihenfolge des Katalogs, beschränkt auf die Elemente der Methode.
     *
     * @return list<array<string, mixed>>
     */
    /**
     * @param  array<string, array<string, mixed>>  $content
     * @return array<string, mixed>
     */
    private static function localized(array $content, ?string $language): array
    {
        foreach ([$language, 'en', RecommendationEngine::REQUIRED_LANGUAGE] as $candidate) {
            if ($candidate && isset($content[$candidate])) {
                return $content[$candidate];
            }
        }

        return reset($content) ?: [];
    }

    private function parameters(): array
    {
        $methodElements = $this->method?->elements->keyBy('id');
        $dosings = $this->relationLoaded('dosings') ? $this->dosings->groupBy('element_id') : collect();

        return $this->results
            ->filter(fn (AnalysisResult $result) => ! $methodElements || $methodElements->has($result->element_id))
            ->sortBy(fn (AnalysisResult $result) => [$result->element->group->sort_order, $result->element->sort_order])
            ->map(function (AnalysisResult $result) use ($methodElements, $dosings) {
                $element = $result->element;
                $pivot = $methodElements?->get($result->element_id)?->pivot;

                return [
                    'key' => $element->key,
                    'symbol' => $element->symbol,
                    'name' => $element->name,
                    'groupKey' => $element->group->key,
                    'unit' => $element->unit,
                    'precision' => $pivot?->precision ?? $element->precision,
                    'isCalculated' => $element->is_calculated,
                    'isEvaluated' => $pivot ? (bool) $pivot->is_evaluated : true,
                    // null = unter Nachweisgrenze bzw. nicht messbar
                    'value' => $result->value,
                    'band' => $result->band,
                    'target' => $result->target,
                    'min' => $result->min,
                    'max' => $result->max,
                    'dosings' => $dosings->get($result->element_id, collect())->map(fn ($dosing) => [
                        'product' => $dosing->product->key,
                        'productName' => $dosing->product->name,
                        'unit' => $dosing->product->unit,
                        'amountPerDay' => $dosing->amount_per_day,
                        'days' => $dosing->days,
                    ])->values(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Wie Analysis::scopeWithIssueCount(), für bereits geladene Messwerte.
     */
    private function issueCount(): ?int
    {
        if (! $this->relationLoaded('results')) {
            return null;
        }
        $evaluated = $this->method?->elements->filter(fn ($element) => $element->pivot->is_evaluated)->keyBy('id');

        return $this->results
            ->filter(fn (AnalysisResult $result) => $result->band !== null && $result->band !== 5)
            ->filter(fn (AnalysisResult $result) => ! $evaluated || $evaluated->has($result->element_id))
            ->count();
    }
}
