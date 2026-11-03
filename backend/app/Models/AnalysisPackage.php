<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AnalysisPackage extends Model
{
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
            'includes_osmosis' => 'boolean',
        ];
    }

    /**
     * Methoden, die zu diesem Paket passen.
     *
     * @return BelongsToMany<AnalysisMethod, $this>
     */
    public function methods(): BelongsToMany
    {
        return $this->belongsToMany(AnalysisMethod::class, 'analysis_package_methods', 'package_id', 'method_id');
    }

    /**
     * Vorläufige Methode aus der Wasserart des Beckens, bis das Labor sie festlegt.
     */
    public function methodFor(string $waterType): ?AnalysisMethod
    {
        return $this->methods()->where('water_type', $waterType)->first();
    }
}
