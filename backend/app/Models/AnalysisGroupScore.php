<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Qualität einer Elementgruppe (0–100). Zusammengesetzter Schlüssel (analysis_id, element_group_id).
 */
class AnalysisGroupScore extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = null;

    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'score' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ElementGroup, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(ElementGroup::class, 'element_group_id');
    }
}
