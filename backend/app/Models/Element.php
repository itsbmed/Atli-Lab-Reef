<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Element extends Model
{
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
            'precision' => 'integer',
            'is_calculated' => 'boolean',
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
