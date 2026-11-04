<?php

namespace App\Models;

use App\Enums\AnalysisReason;
use App\Enums\AnalysisStatus;
use App\Recommendations\RecommendationEngine;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['aquarium_id', 'aquarium_name', 'reason', 'language', 'customer_comment'])]
#[Hidden(['legacy_id'])]
class Analysis extends Model
{
    use HasUuids;

    protected $table = 'analyses';

    /**
     * Gleiche Standardwerte wie in der Migration, damit neue Modelle sie ohne Reload kennen.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'registered',
    ];

    /**
     * Wechselt eine Analyse (oder ihre Probe) auf „abgeschlossen“, entstehen die Empfehlungen.
     * Massen-Importe über den Query Builder lösen das nicht aus: dafür recommendations:generate.
     */
    protected static function booted(): void
    {
        static::saved(function (Analysis $analysis) {
            if ($analysis->status === AnalysisStatus::Completed && ($analysis->wasRecentlyCreated || $analysis->wasChanged('status'))) {
                app(RecommendationEngine::class)->generateWhenCompleted($analysis);
            }
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => AnalysisStatus::class,
            'reason' => AnalysisReason::class,
            'quality_index' => 'float',
            'received_at' => 'datetime',
            'analysed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Aquarium, $this>
     */
    public function aquarium(): BelongsTo
    {
        return $this->belongsTo(Aquarium::class);
    }

    /**
     * @return BelongsTo<Voucher, $this>
     */
    public function voucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class);
    }

    /**
     * Hauptanalyse einer Osmose-/Meersalz-Probe.
     *
     * @return BelongsTo<Analysis, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Mitgeschickte Proben (Osmose, Meersalz).
     *
     * @return HasMany<Analysis, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * @return BelongsTo<AnalysisPackage, $this>
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(AnalysisPackage::class);
    }

    /**
     * @return BelongsTo<AnalysisMethod, $this>
     */
    public function method(): BelongsTo
    {
        return $this->belongsTo(AnalysisMethod::class);
    }

    /**
     * @return BelongsTo<EvaluationScale, $this>
     */
    public function evaluationScale(): BelongsTo
    {
        return $this->belongsTo(EvaluationScale::class);
    }

    /**
     * @return HasMany<AnalysisResult, $this>
     */
    public function results(): HasMany
    {
        return $this->hasMany(AnalysisResult::class);
    }

    /**
     * @return HasMany<AnalysisDosing, $this>
     */
    public function dosings(): HasMany
    {
        return $this->hasMany(AnalysisDosing::class)->orderBy('position');
    }

    /**
     * @return HasMany<AnalysisGroupScore, $this>
     */
    public function groupScores(): HasMany
    {
        return $this->hasMany(AnalysisGroupScore::class);
    }

    /**
     * @return HasMany<AnalysisAddon, $this>
     */
    public function addons(): HasMany
    {
        return $this->hasMany(AnalysisAddon::class);
    }

    /**
     * @return HasMany<AnalysisRecommendation, $this>
     */
    public function recommendations(): HasMany
    {
        return $this->hasMany(AnalysisRecommendation::class)->orderBy('sort_order');
    }

    /**
     * Zählt Auffälligkeiten: bewertete Messwerte außerhalb des idealen Bereichs (Stufe ≠ 5).
     * Ohne Methode zählen alle Messwerte.
     */
    public function scopeWithIssueCount(Builder $query): void
    {
        $query->withCount(['results as issue_count' => fn (Builder $q) => $q
            ->whereNotNull('band')->where('band', '<>', 5)
            ->where(fn (Builder $q) => $q->whereNull('analyses.method_id')->orWhereExists(fn ($e) => $e
                ->from('analysis_method_elements')
                ->whereColumn('analysis_method_elements.method_id', 'analyses.method_id')
                ->whereColumn('analysis_method_elements.element_id', 'analysis_results.element_id')
                ->where('analysis_method_elements.is_evaluated', true)))]);
    }
}
