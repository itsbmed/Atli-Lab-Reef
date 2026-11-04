<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Option, Detailzeile oder Tipp einer Empfehlung, optional mit eigener Bedingung.
 */
class RecommendationRuleBlock extends Model
{
    public const TYPES = ['option', 'detail', 'tip'];

    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'label' => 'array',
            'text' => 'array',
            'action' => 'array',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<RecommendationRule, $this>
     */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(RecommendationRule::class, 'rule_id');
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
