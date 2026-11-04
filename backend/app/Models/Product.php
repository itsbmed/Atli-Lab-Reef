<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
            'max_dose_per_day' => 'float',
            'url' => 'array',
            'pack_sizes' => 'array',
        ];
    }
}
