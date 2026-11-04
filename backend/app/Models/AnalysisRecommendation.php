<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ausgewertete Empfehlung einer Analyse (Snapshot). content enthält die fertigen Texte je Sprache.
 */
class AnalysisRecommendation extends Model
{
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'content' => 'array',
            'elements' => 'array',
            'inputs' => 'array',
            'is_edited' => 'boolean',
            'rule_version' => 'datetime',
            'completed_at' => 'datetime',
            'recheck_days' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Analysis, $this>
     */
    public function analysis(): BelongsTo
    {
        return $this->belongsTo(Analysis::class);
    }

    /**
     * @return BelongsTo<RecommendationRule, $this>
     */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(RecommendationRule::class, 'rule_id');
    }
}
