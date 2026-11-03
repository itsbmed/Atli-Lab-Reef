<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ElementGroup extends Model
{
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
            'in_quality_index' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Element, $this>
     */
    public function elements(): HasMany
    {
        return $this->hasMany(Element::class)->orderBy('sort_order');
    }
}
