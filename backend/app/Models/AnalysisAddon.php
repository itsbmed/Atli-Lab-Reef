<?php

namespace App\Models;

use App\Enums\AnalysisAddon as Addon;
use Illuminate\Database\Eloquent\Model;

/**
 * Gebuchtes Add-on einer Analyse. Zusammengesetzter Schlüssel (analysis_id, addon).
 */
class AnalysisAddon extends Model
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
            'addon' => Addon::class,
        ];
    }
}
