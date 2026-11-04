<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Benannte Formel. rule_id null = global, in allen Regeln verfügbar.
 */
class RecommendationCalculation extends Model
{
    protected $guarded = [];

    /**
     * @return BelongsTo<RecommendationRule, $this>
     */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(RecommendationRule::class, 'rule_id');
    }
}
