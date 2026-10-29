<?php

namespace App\Models;

use Database\Factories\AquariumFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'water_type', 'net_volume', 'aquarium_type', 'dimensions', 'target_mode',
    'stocking_density', 'lighting_type', 'supply_system', 'supply_mode', 'supply_line',
    'supply_bottles', 'supply_product', 'sump', 'refugium', 'skimmer', 'skimmer_model',
    'notes', 'image_theme', 'image', 'water_details', 'evaluation_scale_id',
])]
#[Hidden(['legacy_id'])]
class Aquarium extends Model
{
    /** @use HasFactory<AquariumFactory> */
    use HasFactory, HasUuids;

    public const WATER_TYPES = ['Meerwasser', 'Süßwasser', 'Osmosewasser', 'Meersalz', 'Aquakultur'];

    public const OSMOSIS = 'Osmosewasser';

    /**
     * Erlaubte Verknüpfungen: Typ => Wasserart, die das verknüpfte Profil haben muss.
     *
     * @var array<string, string>
     */
    public const LINK_TYPES = [
        'osmosis_source' => self::OSMOSIS,
    ];

    protected $table = 'aquariums';

    /**
     * Gleiche Standardwerte wie in der Migration, damit neue Modelle sie ohne Reload kennen.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'water_type' => 'Meerwasser',
        'target_mode' => 'ati',
        'sump' => false,
        'refugium' => false,
        'skimmer' => false,
        'image_theme' => 'reef-mixed',
        'evaluation_scale_id' => 'ati-standard',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'net_volume' => 'float',
            'supply_bottles' => 'integer',
            'sump' => 'boolean',
            'refugium' => 'boolean',
            'skimmer' => 'boolean',
            'water_details' => 'array',
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
     * @return HasMany<AquariumImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(AquariumImage::class);
    }

    /**
     * @return HasMany<AquariumLink, $this>
     */
    public function links(): HasMany
    {
        return $this->hasMany(AquariumLink::class);
    }

    /**
     * Verknüpfungen setzen: Typ => ID des verknüpften Profils, null/leer entfernt die Verknüpfung.
     * Nicht genannte Typen bleiben unverändert.
     *
     * @param  array<string, string|null>  $links
     */
    public function syncLinks(array $links): void
    {
        foreach ($links as $type => $linkedId) {
            if (blank($linkedId)) {
                $this->links()->where('type', $type)->delete();
            } else {
                $this->links()->updateOrCreate(['type' => $type], ['linked_aquarium_id' => $linkedId]);
            }
        }

        $this->unsetRelation('links');
    }
}
