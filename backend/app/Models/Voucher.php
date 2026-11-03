<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Voucher extends Model
{
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_free' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<AnalysisPackage, $this>
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(AnalysisPackage::class);
    }

    /**
     * Die Analyse, mit der der Barcode eingelöst wurde.
     *
     * @return HasOne<Analysis, $this>
     */
    public function analysis(): HasOne
    {
        return $this->hasOne(Analysis::class);
    }
}
