<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AnalysisMethod extends Model
{
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
        ];
    }

    /**
     * Elemente, die zu dieser Methode gehören (Positivliste).
     *
     * @return BelongsToMany<Element, $this>
     */
    public function elements(): BelongsToMany
    {
        return $this->belongsToMany(Element::class, 'analysis_method_elements', 'method_id', 'element_id')
            ->withPivot(['is_evaluated', 'precision']);
    }

    /**
     * @return BelongsToMany<AnalysisPackage, $this>
     */
    public function packages(): BelongsToMany
    {
        return $this->belongsToMany(AnalysisPackage::class, 'analysis_package_methods', 'method_id', 'package_id');
    }
}
