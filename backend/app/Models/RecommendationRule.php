<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Regel einer Empfehlung: Bedingung, betroffene Elemente und Texte je Sprache.
 * Eine Regel mit evaluation_scale_id ersetzt für diese Skala die globale Regel mit gleichem key.
 * Der Unique-Index (key, evaluation_scale_id) greift bei null nicht; Eindeutigkeit globaler
 * Keys stellt die Anwendung sicher.
 */
class RecommendationRule extends Model
{
    /** Sprachfelder (json {de, en, …}). */
    public const TRANSLATED = ['kicker', 'title', 'summary', 'action_label', 'detail_label'];

    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'water_types' => 'array',
            'scope_elements' => 'array',
            'kicker' => 'array',
            'title' => 'array',
            'summary' => 'array',
            'action' => 'array',
            'action_label' => 'array',
            'detail_label' => 'array',
            'is_active' => 'boolean',
            'recheck_days' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<EvaluationScale, $this>
     */
    public function evaluationScale(): BelongsTo
    {
        return $this->belongsTo(EvaluationScale::class);
    }

    /**
     * @return BelongsTo<ElementGroup, $this>
     */
    public function scopeGroup(): BelongsTo
    {
        return $this->belongsTo(ElementGroup::class, 'scope_group_id');
    }

    /**
     * @return HasMany<RecommendationRuleBlock, $this>
     */
    public function blocks(): HasMany
    {
        return $this->hasMany(RecommendationRuleBlock::class, 'rule_id')->orderBy('sort_order')->orderBy('id');
    }

    /**
     * @return HasMany<RecommendationCalculation, $this>
     */
    public function calculations(): HasMany
    {
        return $this->hasMany(RecommendationCalculation::class, 'rule_id');
    }
}
